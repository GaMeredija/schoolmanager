import { db } from "./db";
import bcrypt from "bcryptjs";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seedUsersOnly() {
  try {
    console.log("🌱 Starting simple user seeding...");

    // Disable foreign key constraints temporarily
    await db.run(sql`PRAGMA foreign_keys = OFF`);
    
    // Clear existing users
    console.log("🗑️ Clearing existing users...");
    await db.run(sql`DELETE FROM users`);
    console.log("✅ Users cleared");

    // Create users
    console.log("👥 Creating users...");
    const hashedPassword = await bcrypt.hash("123", 10);
    
    const demoUsers = [
      {
        id: "admin_001",
        email: "admin@escola.com",
        password: hashedPassword,
        firstName: "Administrador",
        lastName: "Sistema",
        role: "admin" as const,
        status: "active" as const,
        lastSeen: new Date().toISOString(),
        phone: "(11) 99999-9999",
        address: "Rua das Flores, 123",
        registrationNumber: "ADM001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prof_001",
        email: "prof@escola.com",
        password: hashedPassword,
        firstName: "Professor",
        lastName: "Matemática",
        role: "teacher" as const,
        status: "active" as const,
        lastSeen: new Date().toISOString(),
        phone: "(11) 77777-7777",
        address: "Rua dos Professores, 789",
        registrationNumber: "PROF001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "aluno_001",
        email: "aluno@escola.com",
        password: hashedPassword,
        firstName: "João",
        lastName: "Silva",
        role: "student" as const,
        status: "active" as const,
        lastSeen: new Date().toISOString(),
        phone: "(11) 88888-8888",
        address: "Rua dos Estudantes, 456",
        registrationNumber: "ALU001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "aluno_002",
        email: "maria@escola.com",
        password: hashedPassword,
        firstName: "Maria",
        lastName: "Santos",
        role: "student" as const,
        status: "active" as const,
        lastSeen: new Date().toISOString(),
        phone: "(11) 66666-6666",
        address: "Rua das Alunas, 321",
        registrationNumber: "ALU002",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    await db.insert(users).values(demoUsers);
    console.log(`✅ Created ${demoUsers.length} users successfully`);

    // Re-enable foreign key constraints
    await db.run(sql`PRAGMA foreign_keys = ON`);
    
    console.log("🎉 User seeding completed successfully!");
    console.log("\n📋 Created users:");
    demoUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
    });
    
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedUsersOnly();