import { db } from "./db";
import bcrypt from "bcryptjs";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedBasicUsers() {
  try {
    console.log("🌱 Criando usuários básicos...");

    const hashedPassword = await bcrypt.hash("123456", 10);
    const now = new Date().toISOString();
    
    const basicUsers = [
      {
        id: "admin_001",
        email: "admin@escola.com",
        password: hashedPassword,
        firstName: "Administrador",
        lastName: "Sistema",
        role: "admin" as const,
        status: "active" as const,
        phone: "(11) 99999-9999",
        address: "Rua das Flores, 123",
        registrationNumber: "ADM001",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "prof_001",
        email: "prof@escola.com",
        password: hashedPassword,
        firstName: "João",
        lastName: "Professor",
        role: "teacher" as const,
        status: "active" as const,
        phone: "(11) 77777-7777",
        address: "Rua dos Professores, 789",
        registrationNumber: "PROF001",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "aluno_001",
        email: "aluno@escola.com",
        password: hashedPassword,
        firstName: "Maria",
        lastName: "Estudante",
        role: "student" as const,
        status: "active" as const,
        phone: "(11) 55555-5555",
        address: "Av. dos Estudantes, 654",
        registrationNumber: "ALU001",
        createdAt: now,
        updatedAt: now,
      }
    ];

    for (const user of basicUsers) {
      // Verificar se o usuário já existe
      const existingUser = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
      
      if (existingUser.length === 0) {
        await db.insert(users).values(user);
        console.log(`✅ Usuário criado: ${user.email}`);
      } else {
        console.log(`⚠️ Usuário já existe: ${user.email}`);
      }
    }
    
    console.log("🎉 Seed básico concluído!");
    console.log("\n🔑 Credenciais de teste:");
    console.log("Admin: admin@escola.com / 123456");
    console.log("Professor: prof@escola.com / 123456");
    console.log("Aluno: aluno@escola.com / 123456");
    
  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

seedBasicUsers()
  .then(() => {
    console.log("🎉 Seed concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha no seed:", error);
    process.exit(1);
  });