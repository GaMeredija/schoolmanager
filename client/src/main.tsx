import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import { installDemoApi } from "./lib/demoApi";
import "./index.css";
import "./lib/tunnelBypass";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

installDemoApi();

try {
  const root = createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
} catch (error) {
  console.error("Erro ao renderizar aplicacao:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h2>Erro ao carregar a aplicacao</h2>
      <p>Por favor, recarregue a pagina.</p>
    </div>
  `;
}
