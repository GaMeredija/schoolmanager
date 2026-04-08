const { createClient } = require('@libsql/client');

async function fixAttendanceTable() {
  const client = createClient({
    url: 'file:school.db',
  });

  try {
    console.log('🔍 Verificando estrutura da tabela attendance...');
    
    // Verificar se a tabela existe
    const tableInfo = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'");
    
    if (tableInfo.rows.length === 0) {
      console.log('❌ Tabela attendance não existe. Criando...');
      
      // Criar a tabela attendance com a estrutura correta
      await client.execute(`
        CREATE TABLE attendance (
          id TEXT PRIMARY KEY,
          studentId TEXT NOT NULL,
          classId TEXT NOT NULL,
          subjectId TEXT NOT NULL,
          teacherId TEXT NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'present',
          notes TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (studentId) REFERENCES users(id),
          FOREIGN KEY (classId) REFERENCES classes(id),
          FOREIGN KEY (subjectId) REFERENCES subjects(id),
          FOREIGN KEY (teacherId) REFERENCES users(id)
        )
      `);
      
      console.log('✅ Tabela attendance criada com sucesso!');
    } else {
      console.log('✅ Tabela attendance já existe.');
      
      // Verificar se tem as colunas necessárias
      const columns = await client.execute("PRAGMA table_info(attendance)");
      const columnNames = columns.rows.map(col => col.name);
      
      console.log('📋 Colunas atuais:', columnNames);
      
      if (!columnNames.includes('classId') || !columnNames.includes('subjectId')) {
        console.log('❌ Tabela attendance não tem as colunas necessárias. Recriando...');
        
        // Dropar e recriar a tabela
        await client.execute('DROP TABLE IF EXISTS attendance');
        
        await client.execute(`
          CREATE TABLE attendance (
            id TEXT PRIMARY KEY,
            studentId TEXT NOT NULL,
            classId TEXT NOT NULL,
            subjectId TEXT NOT NULL,
            teacherId TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'present',
            notes TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            FOREIGN KEY (studentId) REFERENCES users(id),
            FOREIGN KEY (classId) REFERENCES classes(id),
            FOREIGN KEY (subjectId) REFERENCES subjects(id),
            FOREIGN KEY (teacherId) REFERENCES users(id)
          )
        `);
        
        console.log('✅ Tabela attendance recriada com sucesso!');
      } else {
        console.log('✅ Tabela attendance tem a estrutura correta.');
      }
    }
    
    // Verificar estrutura final
    const finalColumns = await client.execute("PRAGMA table_info(attendance)");
    console.log('📋 Estrutura final da tabela attendance:');
    finalColumns.rows.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar/criar tabela attendance:', error);
  } finally {
    await client.close();
  }
}

fixAttendanceTable();
