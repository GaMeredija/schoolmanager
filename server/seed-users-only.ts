import { db } from "./db";
import bcrypt from "bcryptjs";
import { users } from "@shared/schema";

async function seedUsers() {
  try {
    console.log("🌱 Creating test users...");

    // Clear existing users
    await db.delete(users);
    console.log("✅ Users cleared");

    const hashedPassword = await bcrypt.hash("123", 10);
    const now = new Date().toISOString();
    
    const testUsers = [
      {
        id: "admin_001",
        email: "admin@escola.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "Sistema",
        role: "admin" as const,
        status: "active" as const,
        phone: "(11) 99999-9999",
        address: "Rua das Flores, 123",
        registrationNumber: "ADM001",
        createdAt: now,
        updatedAt: now
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
        updatedAt: now
      },
      {
        id: "aluno_001",
        email: "aluno@escola.com",
        password: hashedPassword,
        firstName: "Pedro",
        lastName: "Aluno",
        role: "student" as const,
        status: "active" as const,
        phone: "(11) 55555-5555",
        address: "Rua dos Estudantes, 654",
        registrationNumber: "ALU001",
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const user of testUsers) {
      await db.insert(users).values(user);
    }
    
    console.log("✅ Test users created successfully!");
    console.log("📧 Login credentials:");
    console.log("   Admin: admin@escola.com / 123");
    console.log("   Professor: prof@escola.com / 123");
    console.log("   Aluno: aluno@escola.com / 123");
    
  } catch (error) {
    console.error("❌ Error creating users:", error);
    throw error;
  }
}

seedUsers()
  .then(() => {
    console.log("🎉 Seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });