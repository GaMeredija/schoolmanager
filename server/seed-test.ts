import { db } from "./db";
import bcrypt from "bcryptjs";
import { users } from "@shared/schema";

async function seedDatabase() {
  try {
    console.log("🌱 Starting test database seeding...");

    // Clear existing data
    console.log("🗑️ Clearing existing data...");
    await db.delete(users);
    console.log("✅ Database cleared");

    // Create users
    console.log("👥 Creating users...");
    const hashedPassword = await bcrypt.hash("123", 10);
    
    const now = new Date().toISOString();
    
    const demoUsers = [
      {
        id: "admin_001",
        email: "admin@escola.com",
        password: hashedPassword,
        firstName: "Administrador",
        lastName: "Sistema",
        role: "admin",
        status: "active",
        lastSeen: now,
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
        firstName: "Professor",
        lastName: "Matemática",
        role: "teacher",
        status: "active",
        lastSeen: now,
        phone: "(11) 77777-7777",
        address: "Rua dos Professores, 789",
        registrationNumber: "PROF001",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "aluno_001",
        email: "aluno1@escola.com",
        password: hashedPassword,
        firstName: "Pedro",
        lastName: "Oliveira",
        role: "student",
        status: "active",
        lastSeen: now,
        phone: "(11) 55555-5555",
        address: "Av. dos Estudantes, 654",
        registrationNumber: "ALU001",
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const user of demoUsers) {
      console.log(`Creating user: ${user.email}`);
      await db.insert(users).values(user);
    }
    console.log("✅ Users created successfully");

    console.log("🎉 Database seeded successfully!");
    console.log("\n🔑 Credenciais de teste:");
    console.log("Admin: admin@escola.com / 123");
    console.log("Professor: prof@escola.com / 123");
    console.log("Aluno: aluno1@escola.com / 123");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();


