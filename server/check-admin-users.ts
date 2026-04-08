import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkAdminUsers() {
  try {
    console.log('🔍 Verificando usuários Admin...');
    
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    
    console.log(`👥 Usuários Admin encontrados: ${adminUsers.length}`);
    
    if (adminUsers.length > 0) {
      adminUsers.forEach(user => {
        console.log(`📧 Admin: ${user.email} - ID: ${user.id} - Nome: ${user.firstName} ${user.lastName}`);
      });
    } else {
      console.log('❌ Nenhum usuário Admin encontrado');
    }
    
    // Verificar todos os usuários para debug
    const allUsers = await db.select().from(users);
    console.log(`\n📊 Total de usuários no sistema: ${allUsers.length}`);
    
    const usersByRole = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📈 Usuários por role:', usersByRole);
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
  }
}

checkAdminUsers();