export interface TunnelProvider {
  name: string;
  url: string;
  type: "cloudflare" | "pinggy" | "serveo" | "custom";
  priority: number;
  isActive: boolean;
  hasWarningPage: boolean;
}

export class AlternativeTunnelManager {
  private static instance: AlternativeTunnelManager;
  private providers: TunnelProvider[] = [];

  public static getInstance(): AlternativeTunnelManager {
    if (!AlternativeTunnelManager.instance) {
      AlternativeTunnelManager.instance = new AlternativeTunnelManager();
    }
    return AlternativeTunnelManager.instance;
  }

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.push({
      name: "Cloudflare Tunnel",
      url: "https://schoolmanager-demo.trycloudflare.com",
      type: "cloudflare",
      priority: 1,
      isActive: false,
      hasWarningPage: false,
    });

    this.providers.push({
      name: "Pinggy",
      url: "https://schoolmanager-demo.pinggy.io",
      type: "pinggy",
      priority: 2,
      isActive: false,
      hasWarningPage: false,
    });

    this.providers.push({
      name: "Serveo",
      url: "https://schoolmanager-demo.serveo.net",
      type: "serveo",
      priority: 3,
      isActive: false,
      hasWarningPage: false,
    });

    this.providers.push({
      name: "LocalTunnel",
      url: "https://schoolmanager-demo.loca.lt",
      type: "custom",
      priority: 4,
      isActive: true,
      hasWarningPage: true,
    });
  }

  public async testProvider(provider: TunnelProvider): Promise<boolean> {
    try {
      console.log(`Testando ${provider.name}: ${provider.url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${provider.url}/api/health`, {
        method: "GET",
        headers: {
          "User-Agent": "SchoolManager-Web/1.0",
          "X-App-Source": "web-client",
        },
        signal: controller.signal,
        credentials: "include",
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`${provider.name} esta funcionando`);
        return true;
      }

      console.log(`${provider.name} falhou (Status: ${response.status})`);
      return false;
    } catch (error) {
      console.log(`Erro ao testar ${provider.name}:`, error);
      return false;
    }
  }

  public async findBestProvider(): Promise<TunnelProvider | null> {
    console.log("Procurando melhor provedor de tunel...");

    const sortedProviders = [...this.providers].sort(
      (a, b) => a.priority - b.priority,
    );

    for (const provider of sortedProviders) {
      const isWorking = await this.testProvider(provider);
      if (isWorking) {
        provider.isActive = true;
        this.providers.forEach((currentProvider) => {
          if (currentProvider !== provider) {
            currentProvider.isActive = false;
          }
        });

        console.log(`Melhor provedor encontrado: ${provider.name}`);
        return provider;
      }
    }

    console.log("Nenhum provedor de tunel esta funcionando");
    return null;
  }

  public getActiveProvider(): TunnelProvider | null {
    return this.providers.find((provider) => provider.isActive) || null;
  }

  public getAllProviders(): TunnelProvider[] {
    return [...this.providers];
  }

  public updateProviderUrl(
    type: TunnelProvider["type"],
    newUrl: string,
  ): void {
    const provider = this.providers.find((currentProvider) => currentProvider.type === type);
    if (provider) {
      provider.url = newUrl;
      console.log(`URL do ${provider.name} atualizada para: ${newUrl}`);
    }
  }

  public addCustomProvider(
    name: string,
    url: string,
    hasWarningPage: boolean = false,
  ): void {
    const customProvider: TunnelProvider = {
      name,
      url,
      type: "custom",
      priority: this.providers.length + 1,
      isActive: false,
      hasWarningPage,
    };

    this.providers.push(customProvider);
    console.log(`Provedor customizado adicionado: ${name}`);
  }

  public generateSetupInstructions(): string {
    return `
# ALTERNATIVAS AO LOCALTUNNEL

## 1. Cloudflare Tunnel (RECOMENDADO)
- Gratuito e sem pagina de aviso
- Mais estavel que LocalTunnel
- HTTPS automatico

### Instalacao:
\`\`\`bash
npm install -g cloudflared
cloudflared tunnel --url http://localhost:3001
\`\`\`

## 2. Pinggy.io
- Gratuito (60min por sessao)
- Sem pagina de aviso
- Suporte UDP/TCP

### Uso:
\`\`\`bash
ssh -p 443 -R0:localhost:3001 a.pinggy.io
\`\`\`

## 3. Serveo
- Gratuito
- SSH-based
- Sem pagina de aviso

### Uso:
\`\`\`bash
ssh -R 80:localhost:3001 serveo.net
\`\`\`

## 4. Configuracao no sistema
Apos escolher uma alternativa, atualize as URLs usadas pelo frontend e pelo backend local, se necessario.
    `;
  }
}

export const alternativeTunnelManager =
  AlternativeTunnelManager.getInstance();
