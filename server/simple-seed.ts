import { db } from "./db";
import { users } from "../shared/schema";

async function simpleSeed() {
  try {
    console.log("🌱 Iniciando seed simples...");
    
    // Testar conexão
    const testResult = await db.select().from(users).limit(1);
    console.log("✅ Conexão OK, tabela users existe");
    
    // Criar um usuário simples
    const testUser = {
      id: "test_001",
      email: "test@escola.com",
      password: "test123",
      firstName: "Teste",
      lastName: "Usuário",
      role: "student" as const,
      status: "active" as const,
      registrationNumber: "TEST001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log("👤 Criando usuário de teste...");
    await db.insert(users).values(testUser);
    console.log("✅ Usuário criado com sucesso!");
    
    console.log("🎉 Seed simples concluído!");

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "N/A");
  }
}

simpleSeed();


