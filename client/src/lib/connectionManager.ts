import { alternativeTunnelManager, type TunnelProvider } from "./alternativeTunnels";

export class ConnectionManager {
  private static instance: ConnectionManager;
  private currentBaseUrl: string = "";
  private isConnected: boolean = false;
  private connectionType: "global" | "local" | "dev" | "unknown" = "unknown";
  private lastConnectionCheck: number = 0;
  private connectionCheckInterval: number = 30000;
  private currentTunnelProvider: TunnelProvider | null = null;

  private readonly urls = [
    { url: "https://schoolmanager-demo.trycloudflare.com", type: "global" as const },
    { url: "https://schoolmanager-demo.pinggy.io", type: "global" as const },
    { url: "https://schoolmanager-demo.serveo.net", type: "global" as const },
    { url: "https://schoolmanager-demo.loca.lt", type: "global" as const },
    { url: "http://192.168.2.47:3001", type: "local" as const },
    { url: "http://localhost:3001", type: "dev" as const },
  ];

  private constructor() {
    this.startAutoConnectivityCheck();
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  private startAutoConnectivityCheck(): void {
    setInterval(async () => {
      const now = Date.now();
      if (now - this.lastConnectionCheck > this.connectionCheckInterval) {
        console.log("Verificacao automatica de conectividade...");
        await this.findBestConnection();
      }
    }, this.connectionCheckInterval);

    if (typeof window !== "undefined" && "navigator" in window && "onLine" in navigator) {
      window.addEventListener("online", async () => {
        console.log("Rede online detectada, verificando conectividade...");
        await this.findBestConnection();
      });

      window.addEventListener("offline", () => {
        console.log("Rede offline detectada");
        this.isConnected = false;
        this.connectionType = "unknown";
      });
    }
  }

  private async testConnection(url: string): Promise<boolean> {
    try {
      console.log(`Testando conexao com: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${url}/api/health`, {
        method: "GET",
        headers: {
          "bypass-tunnel-reminder": "true",
          "User-Agent": "SchoolManager-Web/1.0",
          "X-Bypass-Tunnel": "true",
          "X-App-Source": "web-client",
        },
        signal: controller.signal,
        credentials: "include",
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`Conexão bem-sucedida com: ${url}`);
        return true;
      }

      console.log(`Falha na conexão com: ${url} (Status: ${response.status})`);
      return false;
    } catch (error) {
      console.log(`Erro ao conectar com: ${url}`, error);
      return false;
    }
  }

  public async findBestConnection(): Promise<string> {
    console.log("Iniciando busca pela melhor conexao...");
    this.lastConnectionCheck = Date.now();

    const bestTunnelProvider = await alternativeTunnelManager.findBestProvider();
    if (bestTunnelProvider) {
      this.currentTunnelProvider = bestTunnelProvider;
      this.currentBaseUrl = bestTunnelProvider.url;
      this.connectionType = "global";
      this.isConnected = true;

      console.log(`Usando ${bestTunnelProvider.name}: ${bestTunnelProvider.url}`);
      return this.currentBaseUrl;
    }

    console.log("Testando conexoes locais como fallback...");
    for (const urlConfig of this.urls.filter((urlConfig) => urlConfig.type !== "global")) {
      const isAvailable = await this.testConnection(urlConfig.url);
      if (isAvailable) {
        this.currentBaseUrl = urlConfig.url;
        this.connectionType = urlConfig.type;
        this.isConnected = true;
        console.log(`Usando URL: ${urlConfig.url} (Tipo: ${urlConfig.type})`);
        return urlConfig.url;
      }
    }

    console.log("Nenhuma conexao disponivel, usando fallback");
    this.currentBaseUrl = this.urls[0].url;
    this.connectionType = "unknown";
    this.isConnected = false;
    this.currentTunnelProvider = null;
    return this.currentBaseUrl;
  }

  public getCurrentBaseUrl(): string {
    return this.currentBaseUrl;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getConnectionType(): "global" | "local" | "dev" | "unknown" {
    return this.connectionType;
  }

  public getConnectionInfo(): {
    isConnected: boolean;
    url: string;
    type: string;
    lastCheck: number;
    tunnelProvider?: string;
    hasWarningPage?: boolean;
  } {
    return {
      isConnected: this.isConnected,
      url: this.currentBaseUrl,
      type: this.connectionType,
      lastCheck: this.lastConnectionCheck,
      tunnelProvider: this.currentTunnelProvider?.name,
      hasWarningPage: this.currentTunnelProvider?.hasWarningPage || false,
    };
  }

  public async refreshConnection(): Promise<string> {
    console.log("Atualizando conexao...");
    return await this.findBestConnection();
  }

  public async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const maxRetries = this.urls.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (!this.currentBaseUrl || attempt > 0) {
          await this.findBestConnection();
        }

        const url = `${this.currentBaseUrl}${endpoint}`;
        console.log(`Fazendo requisicao para: ${url} (Tipo: ${this.connectionType})`);

        const headers = {
          "bypass-tunnel-reminder": "true",
          "User-Agent": "SchoolManager-Web/1.0",
          "X-Bypass-Tunnel": "true",
          "X-App-Source": "web-client",
          ...options.headers,
        };

        const response = await fetch(url, {
          ...options,
          headers,
          credentials: "include",
        });

        if (response.ok) {
          this.isConnected = true;
          return response;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        console.log(`Tentativa ${attempt + 1} falhou (${this.connectionType}):`, error);
        lastError = error as Error;

        if (attempt < maxRetries - 1) {
          this.isConnected = false;
          this.connectionType = "unknown";
          continue;
        }
      }
    }

    this.isConnected = false;
    this.connectionType = "unknown";
    throw lastError || new Error("Todas as tentativas de conexao falharam");
  }
}

export const connectionManager = ConnectionManager.getInstance();
