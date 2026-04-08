const Database = require('better-sqlite3');
const { nanoid } = require('nanoid');

try {
  const db = new Database('./school.db');
  
  console.log('Populando tabela systemLogs com dados de teste...');
  
  // Preparar statement de inserção
  const insertLog = db.prepare(`
    INSERT INTO systemLogs (
      id, timestamp, level, action, description, 
      userId, userName, userRole, ipAddress, userAgent, metadata, code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Dados de exemplo
  const sampleLogs = [
    {
      level: 'SUCCESS',
      action: 'SYSTEM_START',
      description: 'Sistema iniciado com sucesso',
      userName: null,
      userRole: null,
      code: 'SYS-001',
      metadata: JSON.stringify({ nodeVersion: 'v18.17.0', startTime: new Date().toISOString() })
    },
    {
      level: 'INFO',
      action: 'USER_LOGIN',
      description: 'Usuário Admin Sistema fez login',
      userName: 'Admin Sistema',
      userRole: 'admin',
      ipAddress: '192.168.***.***',
      code: 'AUTH-001',
      metadata: JSON.stringify({ loginTime: new Date().toISOString() })
    },
    {
      level: 'INFO',
      action: 'API_ACCESS',
      description: 'GET /api/admin/logs/terminal',
      userName: 'Admin Sistema',
      userRole: 'admin',
      ipAddress: '192.168.***.***',
      metadata: JSON.stringify({ endpoint: '/api/admin/logs/terminal', method: 'GET' })
    },
    {
      level: 'INFO',
      action: 'USER_LOGIN',
      description: 'Usuário João Silva fez login',
      userName: 'João Silva',
      userRole: 'teacher',
      ipAddress: '192.168.***.***',
      code: 'AUTH-001',
      metadata: JSON.stringify({ loginTime: new Date().toISOString() })
    },
    {
      level: 'INFO',
      action: 'ATIVIDADE_CRIADA',
      description: 'Nova atividade criada: Exercícios de Matemática',
      userName: 'João Silva',
      userRole: 'teacher',
      ipAddress: '192.168.***.***',
      code: 'ACT-001',
      metadata: JSON.stringify({ activityTitle: 'Exercícios de Matemática', subject: 'Matemática' })
    },
    {
      level: 'INFO',
      action: 'USER_LOGIN',
      description: 'Usuário Maria Santos fez login',
      userName: 'Maria Santos',
      userRole: 'student',
      ipAddress: '192.168.***.***',
      code: 'AUTH-001',
      metadata: JSON.stringify({ loginTime: new Date().toISOString() })
    },
    {
      level: 'INFO',
      action: 'ATIVIDADE_SUBMETIDA',
      description: 'Atividade submetida: Exercícios de Matemática',
      userName: 'Maria Santos',
      userRole: 'student',
      ipAddress: '192.168.***.***',
      code: 'ACT-002',
      metadata: JSON.stringify({ activityTitle: 'Exercícios de Matemática', submissionTime: new Date().toISOString() })
    },
    {
      level: 'WARN',
      action: 'LOGIN_FAILED',
      description: 'Tentativa de login falhada para email: teste@escola.com',
      userName: null,
      userRole: null,
      ipAddress: '192.168.***.***',
      code: 'AUTH-003',
      metadata: JSON.stringify({ email: 'teste@escola.com', reason: 'Senha incorreta' })
    },
    {
      level: 'INFO',
      action: 'NOTA_LANCADA',
      description: 'Nota lançada para atividade: Exercícios de Matemática',
      userName: 'João Silva',
      userRole: 'teacher',
      ipAddress: '192.168.***.***',
      code: 'GRD-001',
      metadata: JSON.stringify({ studentName: 'Maria Santos', grade: 8.5, maxGrade: 10 })
    },
    {
      level: 'ERROR',
      action: 'DATABASE_ERROR',
      description: 'Erro ao conectar com o banco de dados',
      userName: null,
      userRole: null,
      code: 'DB-001',
      metadata: JSON.stringify({ error: 'Connection timeout', timestamp: new Date().toISOString() })
    }
  ];
  
  // Inserir logs com timestamps variados (últimas 24 horas)
  const now = new Date();
  
  sampleLogs.forEach((log, index) => {
    // Distribuir logs nas últimas 24 horas
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));
    
    insertLog.run(
      nanoid(),
      timestamp.toISOString(),
      log.level,
      log.action,
      log.description,
      null, // userId (não temos IDs reais)
      log.userName,
      log.userRole,
      log.ipAddress || null,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      log.metadata || null,
      log.code || null
    );
  });
  
  // Verificar quantos logs foram inseridos
  const count = db.prepare('SELECT COUNT(*) as total FROM systemLogs').get();
  console.log(`✅ ${sampleLogs.length} logs inseridos com sucesso!`);
  console.log(`📊 Total de logs na tabela: ${count.total}`);
  
  // Mostrar alguns logs inseridos
  const recentLogs = db.prepare('SELECT * FROM systemLogs ORDER BY timestamp DESC LIMIT 5').all();
  console.log('\n📋 Últimos 5 logs inseridos:');
  recentLogs.forEach(log => {
    console.log(`  ${log.timestamp} [${log.level}] ${log.action}: ${log.description}`);
  });
  
  db.close();
  
} catch (error) {
  console.error('❌ Erro:', error.message);
}