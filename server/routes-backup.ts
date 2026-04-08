import express from "express";
import passport from "passport";
import { db } from "./db";
import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';

const client = createClient({
  url: 'file:server/school.db',
});
import { logger } from "./utils/logger";
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { dirname } from 'path';
import Database from 'better-sqlite3';
import { 
  activities, 
  activitySubmissions, 
  activityFiles, 
  submissionFiles, 
  submissionHistory, 
  users,
  userRequests,
  subjects,
  classes,
  classSubjects,
  studentClass,
  grades,
  attendance,
  events,
  notifications,
  settings,
  messages,
  reports,
  systemLogs,
  materials,
  materialFiles,
  exams,
  examGrades,
  rubricEvaluations,
  activityRubrics,
  classSchedule,
} from "../shared/schema";
import { eq, and, desc, asc, or, count, avg, sum, like, sql, inArray, ne, isNotNull, gte, lte, lt, gt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getRealtimeManager } from "./realtime";

// Definir __dirname para modulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuracao do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // maximo 5 arquivos
  },
  fileFilter: (req, file, cb) => {
    // Tipos de arquivo permitidos para submissA?es
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    const isValidMimeType = allowedTypes.includes(file.mimetype);
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|txt|ppt|pptx/;
    const isValidExtension = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    
    if (isValidMimeType && isValidExtension) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo nao permitido para submissA?es'));
    }
  }
});


export function registerRoutes(app: express.Application) {
  // Middleware de autenticacao
  const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('?? Verificando autentica��o...');
    console.log('?? Headers:', req.headers.authorization);
    console.log('?? req.isAuthenticated():', req.isAuthenticated());
    
    // Verificar se est� autenticado via Passport (sess�o)
    if (req.isAuthenticated()) {
      console.log('? Autenticado via Passport');
      return next();
    }
    
    // Verificar se h� token no header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('?? Token encontrado:', token.substring(0, 10) + '...');
      
      // Para desenvolvimento, vamos aceitar qualquer token n�o vazio
      // Em produ��o, voc� deveria validar o JWT aqui
      if (token && token.length > 10) {
        // Simular usu�rio baseado no token (para desenvolvimento)
        // Em produ��o, decodifique o JWT e busque o usu�rio no banco
        req.user = {
          id: 'coordinator-id',
          role: 'coordinator',
          email: 'coord@escola.com'
        };
        console.log('? Autenticado via token');
        return next();
      }
    }
    
    console.log('? N�o autenticado');
    res.status(401).json({ message: "Not authenticated" });
  };

const hasRole = (roles: string[]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log('?? Verificando permiss�es...');
      console.log('?? req.user:', req.user);
      console.log('?? Roles necess�rios:', roles);
      
      if (!req.user || !roles.includes((req.user as any).role)) {
        console.log('? Permiss�es insuficientes');
        
        // Log acesso negado
        if (req.user) {
          logger.accessDenied(req.user, req.path, req);
        }
        
        return res.status(403).json({ message: "Insufficient permissions" });
    }
      
      console.log('? Permiss�es OK');
    next();
  };
};

  // ===== ROTAS DE AUTENTICAA?A?O =====
  
  app.get('/api/auth/user', isAuthenticated, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      phone: user.phone,
      address: user.address,
      registrationNumber: user.registrationNumber
    });
  });

  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        // Log tentativa de login falhada
        logger.loginFailed(req.body.email, req);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Log login bem-sucedido
        logger.login(user, req);
        
        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        });
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
    const user = req.user as any;
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: "Error during logout" });
        }
        // Log logout
        if (user) {
          logger.logout(user, req);
        }
        res.json({ message: "Logged out successfully" });
    });
  });

  // ===== ROTAS DE PERFIL =====
  
  // Atualizar perfil do usu�rio
  app.put('/api/profile', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { firstName, lastName, email, phone, address, dateOfBirth, bio } = req.body;
      
      // Validar campos obrigat�rios
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Nome, sobrenome e email s�o obrigat�rios" });
      }
      
      // Verificar se o email j� existe (exceto para o pr�prio usu�rio)
      const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, user.id)))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Este email j� est� em uso" });
      }
      
      // Atualizar usu�rio
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          email,
          phone: phone || null,
          address: address || null,
          dateOfBirth: dateOfBirth || null,
          bio: bio || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));
      
      // Log atualiza��o de perfil
      logger.profileUpdated(user, req);
      
      res.json({ message: "Perfil atualizado com sucesso" });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Alterar senha do usu�rio
  app.put('/api/profile/password', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { currentPassword, newPassword } = req.body;
      
      console.log('?? Altera��o de senha solicitada por:', user.email);
      console.log('?? Dados recebidos:', { 
        currentPassword: currentPassword ? '***' : 'vazio',
        newPassword: newPassword ? '***' : 'vazio',
        newPasswordLength: newPassword?.length || 0
      });
      
      if (!currentPassword || !newPassword) {
        console.log('? Campos obrigat�rios n�o preenchidos');
        return res.status(400).json({ message: "Senha atual e nova senha s�o obrigat�rias" });
      }
      
      if (newPassword.length < 6) {
        console.log('? Nova senha muito curta:', newPassword.length);
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
      }
      
      // Verificar senha atual
      const bcrypt = await import('bcryptjs');
      console.log('?? Verificando senha atual...');
      console.log('?? Hash atual no banco:', user.password?.substring(0, 20) + '...');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      console.log('?? Resultado da verifica��o:', isCurrentPasswordValid);
      
      if (!isCurrentPasswordValid) {
        console.log('? Senha atual incorreta');
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      console.log('? Senha atual v�lida, gerando hash da nova senha...');
      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      console.log('?? Atualizando senha no banco de dados...');
      // Atualizar senha
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));
      
      // Verificar se a senha foi realmente atualizada
      const updatedUser = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      console.log('?? Verificando se a senha foi atualizada...');
      console.log('?? Novo hash no banco:', updatedUser[0]?.password?.substring(0, 20) + '...');
      
      if (updatedUser[0]?.password === hashedNewPassword) {
        console.log('? Senha alterada com sucesso para:', user.email);
        // Log altera��o de senha
        logger.passwordChanged(user, req);
        res.json({ message: "Senha alterada com sucesso" });
      } else {
        console.log('? Erro: Senha n�o foi atualizada no banco');
        res.status(500).json({ message: "Erro ao atualizar senha no banco de dados" });
      }
    } catch (error) {
      console.error('? Erro ao alterar senha:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE PERFIL DO COORDENADOR =====
  
  // Atualizar perfil do coordenador
  app.put('/api/coordinator/profile', isAuthenticated, hasRole(['coordinator']), async (req, res) => {
    try {
      const user = req.user as any;
      const { firstName, lastName, email, phone, address, dateOfBirth, bio } = req.body;
      
      // Validar campos obrigat�rios
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Nome, sobrenome e email s�o obrigat�rios" });
      }
      
      // Verificar se o email j� existe (exceto para o pr�prio usu�rio)
      const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, user.id)))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Este email j� est� em uso" });
      }
      
      // Atualizar usu�rio
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          email,
          phone: phone || null,
          address: address || null,
          dateOfBirth: dateOfBirth || null,
          bio: bio || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));
      
      // Log atualiza��o de perfil
      logger.profileUpdated(user, req);
      
      res.json({ message: "Perfil atualizado com sucesso" });
    } catch (error) {
      console.error('Erro ao atualizar perfil do coordenador:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Alterar senha do coordenador
  app.put('/api/coordinator/profile/password', isAuthenticated, hasRole(['coordinator']), async (req, res) => {
    try {
      const user = req.user as any;
      const { currentPassword, newPassword } = req.body;
      
      console.log('?? Altera��o de senha do coordenador solicitada por:', user.email);
      console.log('?? Dados recebidos:', { 
        currentPassword: currentPassword ? '***' : 'vazio',
        newPassword: newPassword ? '***' : 'vazio',
        newPasswordLength: newPassword?.length || 0
      });
      
      if (!currentPassword || !newPassword) {
        console.log('? Campos obrigat�rios n�o preenchidos');
        return res.status(400).json({ message: "Senha atual e nova senha s�o obrigat�rias" });
      }
      
      if (newPassword.length < 6) {
        console.log('? Nova senha muito curta:', newPassword.length);
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
      }
      
      // Verificar senha atual
      const bcrypt = await import('bcryptjs');
      console.log('?? Verificando senha atual...');
      console.log('?? Hash atual no banco:', user.password?.substring(0, 20) + '...');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      console.log('?? Resultado da verifica��o:', isCurrentPasswordValid);
      
      if (!isCurrentPasswordValid) {
        console.log('? Senha atual incorreta');
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      console.log('? Senha atual v�lida, gerando hash da nova senha...');
      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      console.log('?? Atualizando senha no banco de dados...');
      // Atualizar senha
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));
      
      // Verificar se a senha foi realmente atualizada
      const updatedUser = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      console.log('?? Verificando se a senha foi atualizada...');
      console.log('?? Novo hash no banco:', updatedUser[0]?.password?.substring(0, 20) + '...');
      
      if (updatedUser[0]?.password === hashedNewPassword) {
        console.log('? Senha do coordenador alterada com sucesso para:', user.email);
        // Log altera��o de senha
        logger.passwordChanged(user, req);
        res.json({ message: "Senha alterada com sucesso" });
      } else {
        console.log('? Erro: Senha n�o foi atualizada no banco');
        res.status(500).json({ message: "Erro ao atualizar senha no banco de dados" });
      }
    } catch (error) {
      console.error('? Erro ao alterar senha do coordenador:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE PERFIL DO PROFESSOR =====
  
  // Atualizar perfil do professor
  app.put('/api/teacher/profile', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const user = req.user as any;
      const { firstName, lastName, email, phone, address, dateOfBirth, bio } = req.body;
      
      // Validar campos obrigat�rios
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Nome, sobrenome e email s�o obrigat�rios" });
      }
      
      // Verificar se o email j� existe (exceto para o pr�prio usu�rio)
      const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, user.id)))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Este email j� est� em uso" });
      }
      
      // Atualizar usu�rio
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          email,
          phone: phone || null,
          address: address || null,
          dateOfBirth: dateOfBirth || null,
          bio: bio || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));
      
      // Log atualiza��o de perfil
      logger.profileUpdated(user, req);
      
      res.json({ message: "Perfil atualizado com sucesso" });
    } catch (error) {
      console.error('Erro ao atualizar perfil do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Alterar senha do professor
  app.put('/api/teacher/profile/password', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const user = req.user as any;
      const { currentPassword, newPassword } = req.body;
      
      console.log('?? Altera��o de senha do professor solicitada por:', user.email);
      console.log('?? Dados recebidos:', { 
        currentPassword: currentPassword ? '***' : 'vazio',
        newPassword: newPassword ? '***' : 'vazio',
        newPasswordLength: newPassword?.length || 0
      });
      
      if (!currentPassword || !newPassword) {
        console.log('? Campos obrigat�rios n�o preenchidos');
        return res.status(400).json({ message: "Senha atual e nova senha s�o obrigat�rias" });
      }
      
      if (newPassword.length < 6) {
        console.log('? Nova senha muito curta:', newPassword.length);
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
      }
      
      // Verificar senha atual
      const bcrypt = await import('bcryptjs');
      console.log('?? Verificando senha atual...');
      console.log('?? Hash atual no banco:', user.password?.substring(0, 20) + '...');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      console.log('?? Resultado da verifica��o:', isCurrentPasswordValid);
      
      if (!isCurrentPasswordValid) {
        console.log('? Senha atual incorreta');
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      console.log('? Senha atual v�lida, gerando hash da nova senha...');
      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      console.log('?? Atualizando senha no banco de dados...');
      // Atualizar senha
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));
      
      // Verificar se a senha foi realmente atualizada
      const updatedUser = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      console.log('?? Verificando se a senha foi atualizada...');
      console.log('?? Novo hash no banco:', updatedUser[0]?.password?.substring(0, 20) + '...');
      
      if (updatedUser[0]?.password === hashedNewPassword) {
        console.log('? Senha do professor alterada com sucesso para:', user.email);
        // Log altera��o de senha
        logger.passwordChanged(user, req);
        res.json({ message: "Senha alterada com sucesso" });
      } else {
        console.log('? Erro: Senha n�o foi atualizada no banco');
        res.status(500).json({ message: "Erro ao atualizar senha no banco de dados" });
      }
    } catch (error) {
      console.error('? Erro ao alterar senha do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE PERFIL DO ALUNO =====
  
  // Atualizar perfil do aluno
  app.put('/api/student/profile', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user as any;
      const { firstName, lastName, email, phone, address, dateOfBirth, bio } = req.body;
      
      // Validar campos obrigat�rios
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Nome, sobrenome e email s�o obrigat�rios" });
      }
      
      // Verificar se o email j� existe (exceto para o pr�prio usu�rio)
      const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, user.id)))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Este email j� est� em uso" });
      }
      
      // Atualizar usu�rio
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          email,
          phone: phone || null,
          address: address || null,
          dateOfBirth: dateOfBirth || null,
          bio: bio || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));
      
      // Log atualiza��o de perfil
      logger.profileUpdated(user, req);
      
      res.json({ message: "Perfil atualizado com sucesso" });
    } catch (error) {
      console.error('Erro ao atualizar perfil do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Alterar senha do aluno
  app.put('/api/student/profile/password', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user as any;
      const { currentPassword, newPassword } = req.body;
      
      console.log('?? Altera��o de senha do aluno solicitada por:', user.email);
      console.log('?? Dados recebidos:', { 
        currentPassword: currentPassword ? '***' : 'vazio',
        newPassword: newPassword ? '***' : 'vazio',
        newPasswordLength: newPassword?.length || 0
      });
      
      if (!currentPassword || !newPassword) {
        console.log('? Campos obrigat�rios n�o preenchidos');
        return res.status(400).json({ message: "Senha atual e nova senha s�o obrigat�rias" });
      }
      
      if (newPassword.length < 6) {
        console.log('? Nova senha muito curta:', newPassword.length);
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
      }
      
      // Verificar senha atual
      const bcrypt = await import('bcryptjs');
      console.log('?? Verificando senha atual...');
      console.log('?? Hash atual no banco:', user.password?.substring(0, 20) + '...');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      console.log('?? Resultado da verifica��o:', isCurrentPasswordValid);
      
      if (!isCurrentPasswordValid) {
        console.log('? Senha atual incorreta');
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      console.log('? Senha atual v�lida, gerando hash da nova senha...');
      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      console.log('?? Atualizando senha no banco de dados...');
      // Atualizar senha
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));
      
      // Verificar se a senha foi realmente atualizada
      const updatedUser = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      console.log('?? Verificando se a senha foi atualizada...');
      console.log('?? Novo hash no banco:', updatedUser[0]?.password?.substring(0, 20) + '...');
      
      if (updatedUser[0]?.password === hashedNewPassword) {
        console.log('? Senha do aluno alterada com sucesso para:', user.email);
        // Log altera��o de senha
        logger.passwordChanged(user, req);
        res.json({ message: "Senha alterada com sucesso" });
      } else {
        console.log('? Erro: Senha n�o foi atualizada no banco');
        res.status(500).json({ message: "Erro ao atualizar senha no banco de dados" });
      }
    } catch (error) {
      console.error('? Erro ao alterar senha do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE USUA?RIOS =====
  
  // Buscar usuario por ID (DEVE vir ANTES da rota /api/users)
  // Buscar usuarios para chat (busca por nome/email) - DEVE VIR ANTES da rota /:id
  app.get('/api/users/search', isAuthenticated, async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query de busca e obrigatoria" });
      }

      const searchQuery = `%${query.toLowerCase()}%`;
      
      const searchResults = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl
        })
        .from(users)
        .where(
          or(
            like(users.firstName, searchQuery),
            like(users.lastName, searchQuery),
            like(users.email, searchQuery)
          )
        )
        .limit(10);

      // Filtrar o usuario atual da busca
      const filteredResults = searchResults.filter(user => user.id !== (req.user as any)?.id);
      
      res.json({ data: filteredResults });
    } catch (error) {
      console.error('Erro ao buscar usuarios:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar professores para o coordenador (DEVE VIR ANTES DE /api/users/:id)
  app.get('/api/users/teachers', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const teachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          status: users.status
        })
        .from(users)
        .where(eq(users.role, 'teacher'));

      // Transformar dados para corresponder � interface
      const transformedTeachers = teachers.map(teacher => ({
        id: teacher.id,
        name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Nome n�o informado',
        email: teacher.email,
        role: teacher.role,
        status: teacher.status === 'active' ? 'ativo' : 'inativo',
        createdAt: teacher.createdAt
      }));

      console.log(`????? Coordenador acessou professores - ${transformedTeachers.length} encontrados`);

      res.json(transformedTeachers);

    } catch (error) {
      console.error('? Erro ao buscar professores para coordenador:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
          status: users.status
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }

      res.json(user[0]);
    } catch (error) {
      console.error('Erro ao buscar usuario:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Listar usuarios
  app.get('/api/users', isAuthenticated, hasRole(['admin', 'coordinator']), async (req, res) => {
    try {
      const { role, status, search } = req.query;
      
      let whereConditions = [];
      
      if (role && role !== 'all') {
        whereConditions.push(eq(users.role, role as any));
      }
      
      if (status && status !== 'all') {
        whereConditions.push(eq(users.status, status as any));
      }
      
      if (search) {
        whereConditions.push(
          or(
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
      }
      
      const allUsers = await db
        .select()
        .from(users)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(users.firstName));
      
      res.json(allUsers);
    } catch (error) {
      console.error('Erro ao buscar usuarios:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar usuario
  app.post('/api/users', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
        phone,
        address,
        registrationNumber,
        classId
      } = req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      // Criar usu�rio com status 'pending' (sem email e senha ainda)
      const newUser = {
        id: uuidv4(),
        firstName,
        lastName,
        email: null, // N�o criar email ainda
        password: null, // N�o criar senha ainda
        role,
        status: 'pending' as const,
        phone: phone || null,
        address: address || null,
        registrationNumber: registrationNumber || uuidv4().slice(0, 8).toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Usar SQL direto com better-sqlite3 para evitar problemas com Drizzle ORM
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      try {
        const insertSql = `
          INSERT INTO users (
            id, email, password, firstName, lastName, profileImageUrl,
            role, status, lastSeen, phone, address, registrationNumber,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const stmt = sqliteDb.prepare(insertSql);
        stmt.run(
          newUser.id,
          newUser.email,
          newUser.password,
          newUser.firstName,
          newUser.lastName,
          null, // profileImageUrl
          newUser.role,
          newUser.status,
          null, // lastSeen
          newUser.phone,
          newUser.address,
          newUser.registrationNumber,
          newUser.createdAt,
          newUser.updatedAt
        );
        
        console.log("? Usu�rio criado com status 'pending': " + newUser.id);
      } finally {
        sqliteDb.close();
      }

      // Se for aluno, matricular na turma
      if (role === 'student' && classId) {
        const enrollment = {
          id: uuidv4(),
          studentId: newUser.id,
          classId: classId,
          enrollmentDate: new Date().toISOString(),
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Usar SQL direto para matricular aluno
        const Database = (await import('better-sqlite3')).default;
        const path = (await import('path')).default;
        const dbPath = path.join(__dirname, 'school.db');
        const sqliteDb = new Database(dbPath);
        
        try {
          const insertEnrollmentSql = `
            INSERT INTO studentClass (
              id, studentId, classId, enrollmentDate, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          
          const stmt = sqliteDb.prepare(insertEnrollmentSql);
          stmt.run(
            enrollment.id,
            enrollment.studentId,
            enrollment.classId,
            enrollment.enrollmentDate,
            enrollment.status,
            enrollment.createdAt,
            enrollment.updatedAt
          );
        } finally {
          sqliteDb.close();
        }
        console.log("? Aluno matriculado na turma: " + classId);
      }

      console.log("? Usu�rio criado com status 'pending': " + newUser.id);
      console.log("?? Nome: " + firstName + " " + lastName);
      console.log("?? Fun��o: " + role);
      console.log("?? Matr�cula: " + newUser.registrationNumber);
      console.log("? Aguardando aprova��o do diretor para ativar login");

      res.status(201).json({
        message: "Usu�rio criado com sucesso",
        data: {
          id: newUser.id,
          email: email,
          registrationNumber: newUser.registrationNumber,
          status: 'pending',
          message: 'Aguardando aprova��o do diretor para ativar login'
        }
      });
    } catch (error) {
      console.error('Erro ao criar usuario:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/student/test - Teste simples para verificar autenticacao
  app.get('/api/student/test', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Teste de autenticacao para: " + user.firstName + " " + user.lastName);
      console.log("ID do usuario: " + user.id);
      
      res.json({
        message: "Teste de autenticacao funcionando",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Erro no teste de autenticacao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });


  // GET /api/student/subjects - Buscar disciplinas da turma do aluno
  app.get('/api/student/subjects', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Buscando disciplinas da turma para aluno: " + user.firstName + " " + user.lastName);

      // Buscar turma do aluno
      const studentClassInfo = await db
        .select({
          classId: studentClass.classId,
          enrollmentDate: studentClass.enrollmentDate,
          status: studentClass.status
        })
        .from(studentClass)
        .where(
          and(
            eq(studentClass.studentId, user.id),
            eq(studentClass.status, 'active')
          )
        );

      if (studentClassInfo.length === 0) {
        return res.status(404).json({ message: "Aluno nao esta matriculado em nenhuma turma" });
      }

      const classId = studentClassInfo[0].classId;

      // Buscar disciplinas da turma
      const subjectsData = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description
        })
        .from(subjects)
        .innerJoin(classSubjects, eq(subjects.id, classSubjects.subjectId))
        .where(
          and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.status, 'active')
          )
        );

      console.log("Encontradas " + subjectsData.length + " disciplinas para o aluno");

      res.json({ data: subjectsData });
    } catch (error) {
      console.error('Erro ao buscar disciplinas da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/student/class-info - Buscar informacA?es da turma do aluno
  app.get('/api/student/class-info', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Informacoes da turma solicitadas por: " + user.firstName + " " + user.lastName);
      console.log("ID do usuario: " + user.id);

      // Buscar turma do aluno
      const studentClassInfo = await db
        .select({
          classId: studentClass.classId,
          enrollmentDate: studentClass.enrollmentDate,
          status: studentClass.status
        })
        .from(studentClass)
        .where(and(
          eq(studentClass.studentId, user.id),
          eq(studentClass.status, 'active')
        ))
        .limit(1);

      console.log("Resultado da query:", studentClassInfo);

      if (studentClassInfo.length === 0) {
        return res.status(404).json({ message: "Aluno nao esta matriculado em nenhuma turma" });
      }

      const classId = studentClassInfo[0].classId;
      console.log("ID da turma encontrada: " + classId);

      // Buscar informacA?es da turma
      const classInfo = await db
        .select({
          id: classes.id,
          name: classes.name,
          grade: classes.grade,
          section: classes.section,
          academicYear: classes.academicYear,
          capacity: classes.capacity
        })
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

      console.log("Informacoes da turma:", classInfo);

      if (classInfo.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }

      console.log("Turma encontrada: " + classInfo[0].name);

      // Buscar professores da turma
      let teachers = [];
      try {
        teachers = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            subjectName: subjects.name,
            subjectCode: subjects.code
          })
          .from(classSubjects)
          .innerJoin(users, eq(classSubjects.teacherId, users.id))
          .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
          .where(and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.status, 'active')
          ));
        console.log("Professores encontrados: " + teachers.length);
      } catch (teacherError) {
        console.error('Erro ao buscar professores:', teacherError);
        teachers = [];
      }

      // Buscar colegas de turma
      let classmates = [];
      try {
        classmates = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            registrationNumber: users.registrationNumber
          })
          .from(studentClass)
          .innerJoin(users, eq(studentClass.studentId, users.id))
          .where(and(
            eq(studentClass.classId, classId),
            eq(studentClass.status, 'active'),
            ne(studentClass.studentId, user.id) // Excluir o proprio aluno
          ));
        console.log("Colegas encontrados: " + classmates.length);
      } catch (classmateError) {
        console.error('Erro ao buscar colegas:', classmateError);
        classmates = [];
      }

      // Contar total de alunos
      let totalStudents = 0;
      try {
        const totalStudentsResult = await db
          .select({ count: sql`count(*)` })
          .from(studentClass)
          .where(and(
            eq(studentClass.classId, classId),
            eq(studentClass.status, 'active')
          ));
        totalStudents = totalStudentsResult[0].count;
        console.log("Total de alunos: " + totalStudents);
      } catch (countError) {
        console.error('Erro ao contar alunos:', countError);
        totalStudents = classmates.length + 1; // +1 para incluir o proprio aluno
      }

      res.json({
        data: {
          class: classInfo[0],
          teachers,
          classmates,
          totalStudents,
          enrollmentDate: studentClassInfo[0].enrollmentDate
        }
      });
    } catch (error) {
      console.error('Erro ao buscar informacA?es da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/admin/enroll-student - Matricular aluno em turma (temporario)
  app.post('/api/admin/enroll-student', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { studentEmail, className } = req.body;
      
      console.log("Matriculando aluno " + studentEmail + " na turma " + className);
      
      // Buscar aluno
      const student = await db
        .select()
        .from(users)
        .where(eq(users.email, studentEmail))
        .limit(1);
      
      if (student.length === 0) {
        return res.status(404).json({ message: "Aluno nao encontrado" });
      }
      
      // Buscar turma
      const classInfo = await db
        .select()
        .from(classes)
        .where(eq(classes.name, className))
        .limit(1);
      
      if (classInfo.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }
      
      // Verificar se ja esta matriculado
      const existingEnrollment = await db
        .select()
        .from(studentClass)
        .where(eq(studentClass.studentId, student[0].id))
        .limit(1);
      
      if (existingEnrollment.length > 0) {
        // Atualizar matricula
        await db
          .update(studentClass)
          .set({
            classId: classInfo[0].id,
            updatedAt: new Date().toISOString()
          })
          .where(eq(studentClass.studentId, student[0].id));
        
        console.log("Matricula atualizada: " + student[0].firstName + " na turma " + className);
      } else {
        // Criar nova matricula
        const enrollment = {
          id: uuidv4(),
          studentId: student[0].id,
          classId: classInfo[0].id,
          enrollmentDate: new Date().toISOString(),
          status: 'pending' as const, // Requer aprova��o do diretor
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Usar SQL direto para matricular aluno
        const Database = (await import('better-sqlite3')).default;
        const path = (await import('path')).default;
        const dbPath = path.join(__dirname, 'school.db');
        const sqliteDb = new Database(dbPath);
        
        try {
          const insertEnrollmentSql = `
            INSERT INTO studentClass (
              id, studentId, classId, enrollmentDate, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          
          const stmt = sqliteDb.prepare(insertEnrollmentSql);
          stmt.run(
            enrollment.id,
            enrollment.studentId,
            enrollment.classId,
            enrollment.enrollmentDate,
            enrollment.status,
            enrollment.createdAt,
            enrollment.updatedAt
          );
        } finally {
          sqliteDb.close();
        }
        console.log("Nova matricula criada: " + student[0].firstName + " na turma " + className);
      }
      
      res.json({ 
        message: "Aluno matriculado com sucesso",
        student: student[0].firstName + ' ' + student[0].lastName,
        class: className
      });
    } catch (error) {
      console.error('Erro ao matricular aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/student/activities - Buscar atividades do aluno
  app.get('/api/student/activities', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Buscando atividades do aluno: " + user.firstName + " " + user.lastName);

      // Buscar turma do aluno
      const studentClassInfo = await db
        .select({
          classId: studentClass.classId
        })
        .from(studentClass)
        .where(and(
          eq(studentClass.studentId, user.id),
          eq(studentClass.status, 'active')
        ))
        .limit(1);

      if (studentClassInfo.length === 0) {
        return res.json({ data: [] });
      }

      const classId = studentClassInfo[0].classId;

      // Buscar atividades da turma do aluno
      const studentActivities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          subjectId: activities.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          classId: activities.classId,
          className: classes.name,
          dueDate: activities.dueDate,
          maxGrade: activities.maxGrade,
          instructions: activities.instructions,
          requirements: activities.requirements,
          status: activities.status,
          allowLateSubmission: activities.allowLateSubmission,
          latePenalty: activities.latePenalty,
          maxFileSize: activities.maxFileSize,
          allowedFileTypes: activities.allowedFileTypes,
          createdAt: activities.createdAt,
          updatedAt: activities.updatedAt,
          // Status da submissao do aluno
          submissionStatus: activitySubmissions.status,
          submissionGrade: activitySubmissions.grade,
          submissionFeedback: activitySubmissions.feedback,
          submissionDate: activitySubmissions.submittedAt
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .leftJoin(activitySubmissions, and(
          eq(activitySubmissions.activityId, activities.id),
          eq(activitySubmissions.studentId, user.id)
        ))
        .where(and(
          eq(activities.classId, classId),
          sql`${activities.status} IN ('active', 'pending')`
        ))
        .orderBy(desc(activities.createdAt));

      console.log("Encontradas " + studentActivities.length + " atividades para o aluno");

      res.json({ data: studentActivities });
    } catch (error) {
      console.error('Erro ao buscar atividades do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Listar turmas
  app.get('/api/classes', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const user = req.user as any;
      
      let whereConditions = [];
      
      // Filtros baseados no role
      if (user.role === 'teacher') {
        // Professor ve apenas turmas onde leciona
        const teacherClasses = await db
          .select({ classId: classSubjects.classId })
          .from(classSubjects)
          .where(and(
            eq(classSubjects.teacherId, user.id),
            eq(classSubjects.status, 'active')
          ));
        
        const classIds = teacherClasses.map(tc => tc.classId);
        if (classIds.length > 0) {
          whereConditions.push(sql`${classes.id} IN (${sql.join(classIds.map(id => sql`${id}`), sql`, `)})`);
        } else {
          // Se nao tem turmas, retornar array vazio
          whereConditions.push(sql`1 = 0`);
        }
      }
      
      if (status && status !== 'all') {
        whereConditions.push(eq(classes.status, status as any));
      }
      
      
      const allClasses = await db
        .select()
        .from(classes)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(classes.name));
      
      res.json(allClasses);
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar turma
  app.post('/api/classes', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const {
        name,
        grade,
        section,
        academicYear,
        capacity,
      } = req.body;

      if (!name || !grade || !section || !academicYear) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      const newClass = {
        id: uuidv4(),
        name,
        grade,
        section,
        academicYear,
        capacity: capacity || 30,
        // currentStudents ser� calculado dinamicamente
        status: 'pending' as const, // Requer aprova��o do diretor
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(classes).values(newClass);

      res.status(201).json({
        message: "Turma criada com sucesso",
        class: newClass
      });
    } catch (error) {
      console.error('Erro ao criar turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE DISCIPLINAS =====
  
  // Listar disciplinas
  app.get('/api/subjects', isAuthenticated, async (req, res) => {
    try {
      const { status, search, classId } = req.query;
      const user = req.user as any;
      
      console.log('=== BUSCANDO DISCIPLINAS ===');
      console.log('User ID:', user.id);
      console.log('User Role:', user.role);
      console.log('ClassId filter:', classId);
      
      let subjectsList;
      
      if (user.role === 'teacher') {
        // Professor ve apenas disciplinas que leciona
        console.log('?? Filtrando disciplinas para professor:', user.id);
        
        // Primeiro, verificar se existem vinculos
        const teacherLinks = await db
          .select()
          .from(classSubjects)
          .where(and(
            eq(classSubjects.teacherId, user.id),
            eq(classSubjects.status, 'active')
          ));
        
        console.log("Vinculos encontrados para professor: " + teacherLinks.length);
        teacherLinks.forEach(link => {
          console.log("  - ClassId: " + link.classId + ", SubjectId: " + link.subjectId + ", Status: " + link.status);
        });
        
        let whereConditions = [
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ];
        
        // Se classId for fornecido, filtrar por turma especifica
        if (classId) {
          whereConditions.push(eq(classSubjects.classId, classId));
        }
        
        subjectsList = await db
          .select({
            id: subjects.id,
            name: subjects.name,
            code: subjects.code,
            description: subjects.description,
            classId: classSubjects.classId,
            className: classes.name
          })
          .from(subjects)
          .innerJoin(classSubjects, eq(classSubjects.subjectId, subjects.id))
          .innerJoin(classes, eq(classSubjects.classId, classes.id))
          .where(and(
            ...whereConditions,
            eq(subjects.status, 'active')
          ))
          .groupBy(subjects.id, classSubjects.classId)
          .orderBy(asc(subjects.name));
        
        console.log("Disciplinas encontradas para professor: " + subjectsList.length);
        subjectsList.forEach(subj => {
          console.log("  - " + subj.name + " (" + subj.id + ") - Turma: " + subj.className);
        });
      } else {
        // Admin e student veem todas
      let whereConditions = [];
      
      if (status && status !== 'all') {
        whereConditions.push(eq(subjects.status, status as "active" | "inactive"));
      }
      
      if (search) {
        whereConditions.push(
          or(
            like(subjects.name, `%${search}%`),
            like(subjects.code, `%${search}%`)
          )
        );
      }
      
        subjectsList = await db
          .select({
            id: subjects.id,
            name: subjects.name,
            code: subjects.code,
            description: subjects.description,
            status: subjects.status
          })
        .from(subjects)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(subjects.name));
      }
      
      console.log("Encontradas " + subjectsList.length + " disciplinas para " + user.role);
      
      res.json(subjectsList);
    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar disciplina
  app.post('/api/subjects', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const {
        name,
        code,
        description,
        teacherId
      } = req.body;

      if (!name || !code) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      const newSubject = {
        id: uuidv4(),
        name,
        code,
        description: description || null,
        status: 'pending' as const, // Requer aprova��o do diretor
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(subjects).values(newSubject);

      res.status(201).json({
        message: "Disciplina criada com sucesso",
        subject: newSubject
      });
    } catch (error) {
      console.error('Erro ao criar disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE ESTATA?STICAS DO DASHBOARD =====
  
  // Estatisticas gerais
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Log acesso ao dashboard
      logger.dashboardAccessed(user, req);
      
      let stats: any = {};
      
      if (user.role === 'admin') {
        // Stats para admin
        const [userCount] = await db.select({ count: count() }).from(users);
        const [classCount] = await db.select({ count: count() }).from(classes);
        const [subjectCount] = await db.select({ count: count() }).from(subjects);
        
        stats = {
          totalUsers: userCount.count,
          totalClasses: classCount.count,
          totalSubjects: subjectCount.count,
          totalStudents: await db.select({ count: count() }).from(users).where(eq(users.role, 'student')).then(r => r[0].count),
          totalTeachers: await db.select({ count: count() }).from(users).where(eq(users.role, 'teacher')).then(r => r[0].count)
        };
      } else if (user.role === 'teacher') {
        // Stats para professor
        const myClassSubjects = await db.select({ count: count() }).from(classSubjects).where(eq(classSubjects.teacherId, user.id));
        
        stats = {
          totalAssignments: myClassSubjects[0].count,
          totalStudents: await db
            .select({ count: count() })
            .from(studentClass)
            .innerJoin(classSubjects, eq(studentClass.classId, classSubjects.classId))
            .where(eq(classSubjects.teacherId, user.id))
            .then(r => r[0]?.count || 0)
        };
      }
      
      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatisticas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE NOTIFICAA?A?ES =====
  
  // Listar notificacA?es
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { read, type } = req.query;
      
      let whereConditions = [];
      
      // NotificacA?es para o usuario especifico ou globais
      whereConditions.push(
        or(
          eq(notifications.recipientId, user.id)
          // NotificacA?es globais serao tratadas separadamente
        )
      );
      
      if (read !== undefined) {
        whereConditions.push(eq(notifications.read, read === 'true'));
      }
      
      if (type && type !== 'all') {
        whereConditions.push(eq(notifications.type, type as "error" | "info" | "warning" | "success" | "reminder" | "announcement" | "grade" | "assignment"));
      }
      
      const allNotifications = await db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
      
      res.json(allNotifications);
    } catch (error) {
      console.error('Erro ao buscar notificacA?es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Marcar notificacao como lida
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      await db
        .update(notifications)
        .set({ 
          read: true,
          updatedAt: new Date().toISOString()
        })
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.recipientId, user.id)
          )
        );
      
      res.json({ message: "Notificacao marcada como lida" });
    } catch (error) {
      console.error('Erro ao marcar notificacao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DO PROFESSOR =====
  
  // Buscar dados do professor
  app.get('/api/teacher/:teacherId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      const teacher = await db.select().from(users).where(eq(users.id, teacherId)).limit(1);
      
      if (teacher.length === 0) {
        return res.status(404).json({ message: "Professor nao encontrado" });
      }
      
      res.json({ data: teacher[0] });
    } catch (error) {
      console.error('Erro ao buscar dados do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar turmas do professor
  app.get('/api/teacher/:teacherId/classes', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      console.log('=== BUSCANDO TURMAS DO PROFESSOR ===');
      console.log('Teacher ID solicitado:', teacherId);
      
      // Usar SQL direto com better-sqlite3
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      let teacherClasses = [];
      try {
        const selectSql = `
          SELECT 
            cs.id,
            cs.classId,
            cs.subjectId,
            c.name as className,
            s.name as subjectName,
            cs.schedule,
            cs.room,
            cs.semester,
            cs.academicYear,
            cs.status
          FROM classSubjects cs
          INNER JOIN classes c ON cs.classId = c.id
          INNER JOIN subjects s ON cs.subjectId = s.id
          WHERE cs.teacherId = ?
        `;
        
        teacherClasses = sqliteDb.prepare(selectSql).all(teacherId);
      } finally {
        sqliteDb.close();
      }
      
      console.log('Turmas encontradas:', teacherClasses.length);
      teacherClasses.forEach((cls, index) => {
        console.log(`${index + 1}. ${cls.className} - ${cls.subjectName}`);
      });
      
      // Buscar contagem de alunos para cada turma
      const classesWithStudents = await Promise.all(
        teacherClasses.map(async (cls) => {
          const studentsCount = await db
            .select({ count: count() })
            .from(studentClass)
            .where(and(
              eq(studentClass.classId, cls.classId!),
              eq(studentClass.status, 'active')
            ));
          
          return {
            ...cls,
            studentCount: studentsCount[0]?.count || 0
          };
        })
      );
      
      console.log('Classes com contagem de alunos:', classesWithStudents.length);
      
      res.json({ data: classesWithStudents });
    } catch (error) {
      console.error('Erro ao buscar turmas do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar proximas aulas do professor
  app.get('/api/teacher/:teacherId/upcoming-classes', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      // Simular proximas aulas baseado no schedule das turmas
      const teacherClasses = await db
        .select({
          id: classSubjects.id,
          classId: classSubjects.classId,
          className: classes.name,
          subjectName: subjects.name,
          schedule: classSubjects.schedule,
          room: classSubjects.room
        })
        .from(classSubjects)
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(eq(classSubjects.teacherId, teacherId));
      
      // Buscar contagem de alunos para cada turma
      const classesWithStudents = await Promise.all(
        teacherClasses.map(async (cls) => {
          const studentsCount = await db
            .select({ count: count() })
            .from(studentClass)
            .where(eq(studentClass.classId, cls.classId!));
          
          return {
            ...cls,
            studentsCount: studentsCount[0]?.count || 0
          };
        })
      );
      
      // Adicionar informacA?es simuladas de horario
      const upcomingClasses = classesWithStudents.map((cls, index) => ({
        ...cls,
        day: ['Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'][index % 5],
        time: ['07:30 - 09:10', '09:30 - 11:10', '13:30 - 15:10', '15:30 - 17:10'][index % 4]
      }));
      
      res.json({ data: upcomingClasses });
    } catch (error) {
      console.error('Erro ao buscar proximas aulas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar notas recentes do professor
  app.get('/api/teacher/:teacherId/recent-grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      const recentGrades = await db
        .select({
          id: grades.id,
          className: classes.name,
          subjectName: subjects.name,
          createdAt: grades.createdAt,
          status: grades.type,
          studentsCount: count()
        })
        .from(grades)
        .innerJoin(classSubjects, eq(grades.classSubjectId, classSubjects.id))
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(eq(classSubjects.teacherId, teacherId))
        .groupBy(grades.id, classes.name, subjects.name, grades.createdAt, grades.type)
        .orderBy(desc(grades.createdAt))
        .limit(5);
      
      res.json({ data: recentGrades });
    } catch (error) {
      console.error('Erro ao buscar notas recentes:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar alunos em atencao do professor
  app.get('/api/teacher/:teacherId/students-watch', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      // Buscar alunos com baixo desempenho ou muitas faltas
      const studentsToWatch = await db
        .select({
          id: users.id,
          name: users.firstName,
          className: classes.name
        })
        .from(users)
        .innerJoin(studentClass, eq(users.id, studentClass.studentId))
        .innerJoin(classes, eq(studentClass.classId, classes.id))
        .innerJoin(classSubjects, eq(classes.id, classSubjects.classId))
        .where(eq(classSubjects.teacherId, teacherId));
      
      // Processar dados para identificar problemas (simulado por enquanto)
      const processedStudents = studentsToWatch.slice(0, 5).map((student, index) => {
        const issues = ["Baixo desempenho", "Faltas frequentes", "Indisciplina"];
        const issue = issues[index % issues.length];
        const averageGrade = (4 + Math.random() * 3).toFixed(1); // Simular nota entre 4.0 e 7.0
        
        return {
          ...student,
          issue,
          averageGrade
        };
      });
      
      res.json({ data: processedStudents });
    } catch (error) {
      console.error('Erro ao buscar alunos em atencao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });



  // ===== API DE ESTAT�STICAS DE PROFESSORES =====
  
  // GET /api/coordinator/teacher-stats - Estat�sticas detalhadas dos professores (TEMPOR�RIO SEM AUTH)
  app.get('/api/coordinator/teacher-stats', async (req, res) => {
    try {
      console.log('?? Buscando estat�sticas dos professores...');
      console.log('?? Usu�rio autenticado:', req.user?.firstName, req.user?.lastName, req.user?.role);
      
      // Buscar todos os professores
      const teachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(eq(users.role, 'teacher'))
        .orderBy(users.firstName);

      console.log('?? Professores encontrados no banco:', teachers.length);

      // Para cada professor, buscar estat�sticas detalhadas
      const teachersWithStats = await Promise.all(
        teachers.map(async (teacher) => {
          // Atividades criadas pelo professor
          const activitiesStats = await db
            .select({
              total: count(),
              approved: count(sql`CASE WHEN ${activities.status} = 'active' THEN 1 END`),
              draft: count(sql`CASE WHEN ${activities.status} = 'draft' THEN 1 END`),
              expired: count(sql`CASE WHEN ${activities.status} = 'expired' THEN 1 END`)
            })
            .from(activities)
            .where(eq(activities.teacherId, teacher.id));

          // Provas criadas pelo professor
          const examsStats = await db
            .select({
              total: count(),
              completed: count(sql`CASE WHEN ${exams.status} = 'completed' THEN 1 END`),
              active: count(sql`CASE WHEN ${exams.status} = 'active' THEN 1 END`)
            })
            .from(exams)
            .where(eq(exams.teacherId, teacher.id));

          // Materiais criados pelo professor
          const materialsStats = await db
            .select({
              total: count()
            })
            .from(materials)
            .where(eq(materials.teacherId, teacher.id));

          // Notas atribu�das pelo professor (atividades)
          const activityGradesStats = await db
            .select({
              total: count(),
              average: avg(activitySubmissions.grade)
            })
            .from(activitySubmissions)
            .innerJoin(activities, eq(activitySubmissions.activityId, activities.id))
            .where(eq(activities.teacherId, teacher.id));

          // Notas de provas atribu�das pelo professor
          const examGradesStats = await db
            .select({
              total: count(),
              average: avg(examGrades.grade)
            })
            .from(examGrades)
            .innerJoin(exams, eq(examGrades.examId, exams.id))
            .where(eq(exams.teacherId, teacher.id));

          // Submiss�es de atividades (para calcular taxa de participa��o)
          const submissionsStats = await db
            .select({
              total: count(),
              graded: count(sql`CASE WHEN ${activitySubmissions.grade} IS NOT NULL THEN 1 END`),
              pending: count(sql`CASE WHEN ${activitySubmissions.grade} IS NULL AND ${activitySubmissions.status} = 'submitted' THEN 1 END`)
            })
            .from(activitySubmissions)
            .innerJoin(activities, eq(activitySubmissions.activityId, activities.id))
            .where(eq(activities.teacherId, teacher.id));

          // Calcular performance baseada em m�ltiplos fatores
          const activitiesTotal = activitiesStats[0]?.total || 0;
          const activitiesApproved = activitiesStats[0]?.approved || 0;
          const examsTotal = examsStats[0]?.total || 0;
          const materialsTotal = materialsStats[0]?.total || 0;
          const submissionsTotal = submissionsStats[0]?.total || 0;
          const submissionsGraded = submissionsStats[0]?.graded || 0;

          // F�rmula de performance: 40% atividades aprovadas + 30% corre��o de submiss�es + 20% provas + 10% materiais
          let performance = 0;
          if (activitiesTotal > 0) {
            performance += (activitiesApproved / activitiesTotal) * 40;
          }
          if (submissionsTotal > 0) {
            performance += (submissionsGraded / submissionsTotal) * 30;
          }
          if (examsTotal > 0) {
            performance += Math.min(examsTotal * 2, 20); // M�ximo 20 pontos por provas
          }
          performance += Math.min(materialsTotal * 1, 10); // M�ximo 10 pontos por materiais

          // Garantir que a performance esteja entre 0 e 10
          performance = Math.min(Math.max(performance, 0), 10);

          return {
            ...teacher,
            stats: {
              activities: {
                total: activitiesTotal,
                approved: activitiesApproved,
                draft: activitiesStats[0]?.draft || 0,
                expired: activitiesStats[0]?.expired || 0
              },
              exams: {
                total: examsTotal,
                completed: examsStats[0]?.completed || 0,
                active: examsStats[0]?.active || 0
              },
              materials: {
                total: materialsTotal
              },
              grades: {
                activityGrades: {
                  total: activityGradesStats[0]?.total || 0,
                  average: activityGradesStats[0]?.average || 0
                },
                examGrades: {
                  total: examGradesStats[0]?.total || 0,
                  average: examGradesStats[0]?.average || 0
                }
              },
              submissions: {
                total: submissionsTotal,
                graded: submissionsGraded,
                pending: submissionsStats[0]?.pending || 0
              },
              performance: Math.round(performance * 10) / 10,
              approvalRate: activitiesTotal > 0 ? Math.round((activitiesApproved / activitiesTotal) * 100) : 0,
              gradingRate: submissionsTotal > 0 ? Math.round((submissionsGraded / submissionsTotal) * 100) : 0
            }
          };
        })
      );

      console.log(`? Estat�sticas de ${teachersWithStats.length} professores calculadas`);
      console.log('?? Enviando resposta:', teachersWithStats.length, 'professores');
      
      res.json({
        success: true,
        data: teachersWithStats
      });

    } catch (error) {
      console.error('? Erro ao buscar estat�sticas dos professores:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // GET /api/coordinator/teacher-details/:id - Detalhes espec�ficos de um professor
  app.get('/api/coordinator/teacher-details/:id', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`?? Buscando detalhes do professor: ${id}`);

      // Buscar dados b�sicos do professor
      const teacher = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.role, 'teacher')))
        .limit(1);

      if (teacher.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Professor n�o encontrado' 
        });
      }

      // Buscar atividades recentes do professor
      const recentActivities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          status: activities.status,
          createdAt: activities.createdAt,
          dueDate: activities.dueDate,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .where(eq(activities.teacherId, id))
        .orderBy(desc(activities.createdAt))
        .limit(10);

      // Buscar provas recentes do professor
      const recentExams = await db
        .select({
          id: exams.id,
          title: exams.title,
          description: exams.description,
          status: exams.status,
          createdAt: exams.createdAt,
          examDate: exams.examDate,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(exams)
        .innerJoin(subjects, eq(exams.subjectId, subjects.id))
        .innerJoin(classes, eq(exams.classId, classes.id))
        .where(eq(exams.teacherId, id))
        .orderBy(desc(exams.createdAt))
        .limit(10);

      // Buscar materiais recentes do professor
      const recentMaterials = await db
        .select({
          id: materials.id,
          title: materials.title,
          description: materials.description,
          type: materials.type,
          createdAt: materials.createdAt,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(materials)
        .innerJoin(subjects, eq(materials.subjectId, subjects.id))
        .innerJoin(classes, eq(materials.classId, classes.id))
        .where(eq(materials.teacherId, id))
        .orderBy(desc(materials.createdAt))
        .limit(10);

      // Buscar submiss�es pendentes de corre��o
      const pendingSubmissions = await db
        .select({
          id: activitySubmissions.id,
          activityTitle: activities.title,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`,
          submittedAt: activitySubmissions.submittedAt,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(activitySubmissions)
        .innerJoin(activities, eq(activitySubmissions.activityId, activities.id))
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .where(and(
          eq(activities.teacherId, id),
          eq(activitySubmissions.status, 'submitted'),
          sql`${activitySubmissions.grade} IS NULL`
        ))
        .orderBy(desc(activitySubmissions.submittedAt))
        .limit(10);

      // Buscar disciplinas que o professor leciona
      const teacherSubjects = await db
        .select({
          subjectId: subjects.id,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          className: classes.name,
          classId: classes.id
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .where(eq(classSubjects.teacherId, id));

      res.json({
        success: true,
        data: {
          teacher: teacher[0],
          recentActivities,
          recentExams,
          recentMaterials,
          pendingSubmissions,
          teacherSubjects
        }
      });

    } catch (error) {
      console.error('? Erro ao buscar detalhes do professor:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // ===== SISTEMA DE ATIVIDADES (MANTENDO AS ROTAS EXISTENTES) =====

  // Buscar todas as atividades (com filtros)
  app.get('/api/activities', isAuthenticated, async (req, res) => {
    try {
      const { role, teacherId, studentId, subjectId, status, search } = req.query;
      const user = req.user as any;
    
    let whereConditions = [];
    
      // Filtrar por papel do usuario
      if (user.role === 'teacher') {
        whereConditions.push(eq(activities.teacherId, user.id));
      } else if (user.role === 'student') {
        // Em producao, filtraria pelas materias em que o aluno esta matriculado
        whereConditions.push(eq(activities.status, 'active'));
      }

      // Filtros adicionais
      if (subjectId && subjectId !== 'all') {
        whereConditions.push(eq(activities.subjectId, subjectId as string));
      }

      if (status && status !== 'all') {
        whereConditions.push(eq(activities.status, status as "active" | "draft" | "expired" | "archived"));
    }
    
    if (search) {
      whereConditions.push(
          // Busca por titulo ou descricao
          // Implementar busca full-text se necessario
        );
      }

      const allActivities = await db
        .select()
        .from(activities)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(activities.createdAt));

      // Buscar submissA?es para cada atividade
      const activitiesWithSubmissions = await Promise.all(
        allActivities.map(async (activity) => {
          const submissions = await db
            .select()
            .from(activitySubmissions)
            .where(eq(activitySubmissions.activityId, activity.id));

          const files = await db
            .select()
            .from(activityFiles)
            .where(eq(activityFiles.activityId, activity.id));

          // Verificar se o usuario atual ja submeteu esta atividade
          let submitted = false;
          if (user.role === 'student') {
            const userSubmission = await db
              .select()
              .from(activitySubmissions)
              .where(
                and(
                  eq(activitySubmissions.activityId, activity.id),
                  eq(activitySubmissions.studentId, user.id)
                )
              )
              .limit(1);
            
            submitted = userSubmission.length > 0;
          }

          return {
            ...activity,
            allowedFileTypes: activity.allowedFileTypes ? JSON.parse(activity.allowedFileTypes) : [],
            submissions,
            files,
            submitted
          };
        })
      );

      res.json(activitiesWithSubmissions);
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
  }
});

  // Buscar atividade especifica
  app.get('/api/activities/:id', isAuthenticated, async (req, res) => {
  try {
      const { id } = req.params;
    const user = req.user as any;
    
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);

      if (activity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      // Verificar permissA?es
      if (user.role === 'student' && activity[0].status !== 'active') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      if (user.role === 'teacher' && activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar submissA?es e arquivos das submissA?es
      const submissions = await db
        .select()
        .from(activitySubmissions)
        .where(eq(activitySubmissions.activityId, id));

      // Buscar arquivos das submissA?es (nao da atividade)
      const submissionFilesData = await db
        .select({
          id: submissionFiles.id,
          submissionId: submissionFiles.submissionId,
          fileName: submissionFiles.fileName,
          originalFileName: submissionFiles.originalFileName,
          filePath: submissionFiles.filePath,
          fileSize: submissionFiles.fileSize,
          fileType: submissionFiles.fileType,
          uploadedAt: submissionFiles.uploadedAt
        })
        .from(submissionFiles)
        .innerJoin(activitySubmissions, eq(submissionFiles.submissionId, activitySubmissions.id))
        .where(eq(activitySubmissions.activityId, id));

      // Buscar arquivos da atividade (anexos do professor)
      const activityFilesData = await db
        .select()
        .from(activityFiles)
        .where(eq(activityFiles.activityId, id));

      console.log("[" + user.role + "] Buscando atividade " + id + ":");
      console.log("Submissoes encontradas: " + submissions.length);
      console.log("Arquivos de submissoes encontrados: " + submissionFilesData.length);
      console.log("Arquivos da atividade encontrados: " + activityFilesData.length);
      
      if (activityFilesData.length > 0) {
        console.log('?? Detalhes dos arquivos da atividade:');
        activityFilesData.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.originalFileName} (${file.fileSize} bytes) - Tipo: ${file.fileType}`);
        });
      }
      
      if (submissionFilesData.length > 0) {
        console.log('?? Detalhes dos arquivos de submissA?es:');
        submissionFilesData.forEach((file, index) => {
          console.log("   " + (index + 1) + ". " + file.originalFileName + " (" + file.fileSize + " bytes)");
        });
      }

      const result = {
        ...activity[0],
        allowedFileTypes: activity[0].allowedFileTypes ? JSON.parse(activity[0].allowedFileTypes) : [],
        submissions: submissions.map(submission => ({
          ...submission,
          files: submissionFilesData
            .filter(file => file.submissionId === submission.id)
            .map(file => file)
        })),
        files: activityFilesData // Arquivos da atividade (anexos do professor)
      };
      
      console.log("Retornando resultado com " + submissionFilesData.length + " arquivo(s) de submissao e " + activityFilesData.length + " arquivo(s) da atividade");
      console.log('?? Estrutura do resultado:', Object.keys(result));

      // Corrigir codifica��o dos nomes dos arquivos
      if (result.files && result.files.length > 0) {
        result.files = result.files.map((file: any) => ({
          ...file,
          originalFileName: file.originalFileName ? Buffer.from(file.originalFileName, 'latin1').toString('utf8') : file.originalFileName
        }));
        console.log('?? Nomes dos arquivos corrigidos:', result.files.map((f: any) => f.originalFileName));
      }

      res.json(result);
  } catch (error) {
      console.error('Erro ao buscar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar arquivo especifico de uma atividade
  app.delete('/api/activities/:id/files/:fileId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId, fileId } = req.params;
      const user = req.user as any;
      
      console.log('=== DELETANDO ARQUIVO DE ATIVIDADE ===');
      console.log('Activity ID:', activityId);
      console.log('File ID:', fileId);
      console.log('Teacher ID:', user.id);
      
      // Verificar se a atividade pertence ao professor
      const activity = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.id, activityId),
          eq(activities.teacherId, user.id)
        ))
        .limit(1);
      
      if (activity.length === 0) {
        console.log('? Atividade nao encontrada ou nao pertence ao professor');
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }
      
      // Buscar o arquivo para obter o caminho
      const file = await db
        .select()
        .from(activityFiles)
        .where(and(
          eq(activityFiles.id, fileId),
          eq(activityFiles.activityId, activityId)
        ))
        .limit(1);
      
      if (file.length === 0) {
        console.log('? Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }
      
      const activityFile = file[0];
      console.log('? Arquivo encontrado:', activityFile.originalFileName);
      
      // Deletar o arquivo do banco de dados
      await db
        .delete(activityFiles)
        .where(eq(activityFiles.id, fileId));
      
      // Tentar deletar o arquivo fisico
      try {
        const filePath = path.join(__dirname, '..', activityFile.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('??? Arquivo fisico deletado:', filePath);
        } else {
          console.log('?? Arquivo fisico nao encontrado (ok)');
        }
      } catch (error) {
        console.log('?? Erro ao deletar arquivo fisico (continuando):', error);
      }
      
      console.log('? Arquivo deletado com sucesso!');
      res.json({ 
        message: "Arquivo deletado com sucesso",
        fileId: fileId,
        fileName: activityFile.originalFileName
      });
      
    } catch (error) {
      console.error('? Erro ao deletar arquivo:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar atividade (apenas professores)
  app.delete('/api/activities/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const activityId = req.params.id;
      const user = req.user as any;
      
      console.log('=== DELETANDO ATIVIDADE ===');
      console.log('Activity ID:', activityId);
      console.log('Teacher ID:', user.id);
      
      // 1. Verificar se a atividade existe e pertence ao professor
      const activity = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.id, activityId),
          eq(activities.teacherId, user.id)
        ))
        .limit(1);
      
      if (activity.length === 0) {
        console.log('? Atividade nao encontrada ou nao pertence ao professor');
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }
      
      console.log('? Atividade encontrada:', activity[0].title);
      
      // 2. Deletar registros relacionados em ordem correta para evitar foreign key constraints
      
      console.log('?? Iniciando processo de delecao em cascata...');
      
      // 2.1. Buscar todas as submissA?es da atividade
      const submissions = await db
        .select({ id: activitySubmissions.id })
        .from(activitySubmissions)
        .where(eq(activitySubmissions.activityId, activityId));
      
      console.log("Encontradas " + submissions.length + " submissoes para deletar");
      
      // 2.2. Deletar arquivos das submissA?es (se existirem)
      if (submissions.length > 0) {
        console.log('??? Deletando arquivos das submissA?es...');
        for (const submission of submissions) {
          const deletedFiles = await db
            .delete(submissionFiles)
            .where(eq(submissionFiles.submissionId, submission.id));
          console.log("   Arquivos da submissao " + submission.id + ": deletados");
        }
      }
      
      // 2.3. Deletar historico das submissA?es (se existir)
      if (submissions.length > 0) {
        console.log('?? Deletando historico das submissA?es...');
        for (const submission of submissions) {
          try {
            await db
              .delete(submissionHistory)
              .where(eq(submissionHistory.submissionId, submission.id));
            console.log("   Historico da submissao " + submission.id + ": deletado");
          } catch (error) {
            console.log("   Historico da submissao " + submission.id + ": nao encontrado (ok)");
          }
        }
      }
      
      // 2.4. Deletar as submissA?es
      if (submissions.length > 0) {
        console.log('?? Deletando submissA?es...');
        const deletedSubmissions = await db
          .delete(activitySubmissions)
          .where(eq(activitySubmissions.activityId, activityId));
        console.log(submissions.length + " submissoes deletadas");
      }
      
      // 2.5. Deletar arquivos da atividade
      console.log('??? Deletando arquivos da atividade...');
      try {
        const deletedActivityFiles = await db
          .delete(activityFiles)
          .where(eq(activityFiles.activityId, activityId));
        console.log('? Arquivos da atividade deletados');
      } catch (error) {
        console.log('?? Arquivos da atividade: nao encontrados (ok)');
      }
      
      // 2.6. Finalmente, deletar a atividade
      console.log('?? Deletando a atividade...');
      await db.delete(activities).where(eq(activities.id, activityId));
      console.log('? Atividade deletada com sucesso!');
      
      res.json({ 
        message: "Atividade deletada com sucesso",
        activityId: activityId,
        activityTitle: activity[0].title
      });
      
    } catch (error) {
      console.error('? Erro ao deletar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de arquivo de atividade
  app.get('/api/activities/files/:fileId/download', isAuthenticated, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      
      console.log('=== BAIXANDO ARQUIVO DE ATIVIDADE ===');
      console.log('File ID:', fileId);
      
      // Buscar arquivo da atividade
      const file = await db
        .select()
        .from(activityFiles)
        .where(eq(activityFiles.id, fileId))
        .limit(1);
      
      if (file.length === 0) {
        console.log('? Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }
      
      const activityFile = file[0];
      console.log('? Arquivo encontrado:', activityFile.originalFileName);
      
      // Verificar se o arquivo existe no disco
      const filePath = path.resolve(activityFile.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('? Arquivo nao encontrado no disco:', filePath);
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }
      
      // Enviar arquivo para download
      res.setHeader('Content-Disposition', `attachment; filename="${activityFile.originalFileName}"`);
      res.setHeader('Content-Type', activityFile.fileType);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('? Erro ao baixar arquivo de atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Visualizar arquivo de atividade
  app.get('/api/activities/files/:fileId/view', isAuthenticated, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      
      console.log('=== VISUALIZANDO ARQUIVO DE ATIVIDADE ===');
      console.log('File ID:', fileId);
      
      // Buscar arquivo da atividade
      const file = await db
        .select()
        .from(activityFiles)
        .where(eq(activityFiles.id, fileId))
        .limit(1);
      
      if (file.length === 0) {
        console.log('? Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }
      
      const activityFile = file[0];
      console.log('? Arquivo encontrado:', activityFile.originalFileName);
      
      // Verificar se o arquivo existe no disco
      const filePath = path.resolve(activityFile.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('? Arquivo nao encontrado no disco:', filePath);
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }
      
      // Enviar arquivo para visualizacao
      // Definir Content-Type baseado na extensao do arquivo
      const fileExtension = path.extname(activityFile.originalFileName).toLowerCase();
      let contentType = activityFile.fileType;
      
      // Mapear extensA?es para Content-Types corretos
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };
      
      if (mimeTypes[fileExtension]) {
        contentType = mimeTypes[fileExtension];
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${activityFile.originalFileName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('? Erro ao visualizar arquivo de atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar nova atividade (apenas professores)
  app.post('/api/activities', isAuthenticated, hasRole(['teacher']), upload.array('files', 5), async (req, res) => {
    try {
      const user = req.user as any;
      const {
        title,
        description,
        subjectId,
        classId,
        dueDate,
        maxGrade,
        instructions,
        requirements,
        allowLateSubmission,
        latePenalty,
        maxFileSize,
        allowedFileTypes
      } = req.body;

      console.log('=== CRIANDO NOVA ATIVIDADE ===');
      console.log('Dados recebidos:', {
        title,
        description,
        subjectId,
        classId,
        teacherId: user.id,
        dueDate,
        maxGrade
      });

      if (!title || !description || !dueDate) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      // Verificar se subjectId existe (se fornecido)
      if (subjectId) {
        const subjectExists = await db
          .select()
          .from(subjects)
          .where(eq(subjects.id, subjectId))
          .limit(1);
        
        if (subjectExists.length === 0) {
          console.log('? Subject nao encontrado:', subjectId);
          return res.status(400).json({ message: "Disciplina nao encontrada" });
        }
      }

      // Verificar se classId existe (se fornecido)
      if (classId) {
        const classExists = await db
          .select()
          .from(classes)
          .where(eq(classes.id, classId))
          .limit(1);
        
        if (classExists.length === 0) {
          console.log('? Class nao encontrada:', classId);
          return res.status(400).json({ message: "Turma nao encontrada" });
        }
      }

      // Verificar se o professor existe
      const teacherExists = await db
        .select()
        .from(users)
        .where(and(eq(users.id, user.id), eq(users.role, 'teacher')))
        .limit(1);
      
      if (teacherExists.length === 0) {
        console.log('? Teacher nao encontrado:', user.id);
        return res.status(400).json({ message: "Professor nao encontrado" });
      }

      const newActivity = {
        id: uuidv4(),
        title,
        description,
        subjectId: subjectId || null,
        teacherId: user.id,
        classId: classId || null,
        dueDate,
        maxGrade: maxGrade || 10,
        instructions: instructions || null,
        requirements: requirements || null,
        status: 'pending' as const, // Requer aprova��o do diretor
        allowLateSubmission: allowLateSubmission || false,
        latePenalty: latePenalty || 0,
        maxFileSize: maxFileSize || 10,
        allowedFileTypes: allowedFileTypes ? JSON.stringify(allowedFileTypes) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('? Inserindo atividade:', newActivity);
      await db.insert(activities).values(newActivity);

      // Log cria��o de atividade
      logger.activityCreated(user, newActivity.title, req);

      // Processar arquivos enviados
      const files = req.files as Express.Multer.File[] || [];
      
      for (const file of files) {
        const fileId = uuidv4();
        
        // Salvar informacA?es do arquivo no banco
        await db.insert(activityFiles).values({
          id: fileId,
          activityId: newActivity.id,
          fileName: file.filename, // Nome unico gerado pelo multer
          originalFileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          fileType: file.mimetype,
          fileCategory: 'reference' as const, // Categoria padrao para arquivos de referencia
          uploadedBy: user.id,
          createdAt: new Date().toISOString()
        });

        // Log upload de arquivo
        logger.fileUploaded(user, file.originalname, req);
      }

      console.log(files.length + " arquivo(s) processado(s) para a atividade");

      // Notificar alunos em tempo real sobre nova atividade
      const realtimeManager = getRealtimeManager();
      if (realtimeManager && classId) {
        realtimeManager.notifyNewActivity(newActivity, classId);
      }

      console.log('? Atividade criada com sucesso!');
      res.status(201).json({
        message: "Atividade criada com sucesso",
        activity: newActivity
      });
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar atividade
  app.put('/api/activities/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const updateData = req.body;

      // Verificar se a atividade pertence ao professor
      const existingActivity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);

      if (existingActivity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      if (existingActivity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      updateData.updatedAt = new Date().toISOString();

      await db
        .update(activities)
        .set(updateData)
        .where(eq(activities.id, id));

      // Notificar alunos em tempo real sobre atualizacao da atividade
      const realtimeManager = getRealtimeManager();
      if (realtimeManager && existingActivity[0].classId) {
        const updatedActivity = { ...existingActivity[0], ...updateData };
        realtimeManager.notifyActivityUpdate(updatedActivity, existingActivity[0].classId);
      }

      res.json({ message: "Atividade atualizada com sucesso" });
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar atividade
  app.delete('/api/activities/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      // Verificar se a atividade pertence ao professor
      const existingActivity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);

      if (existingActivity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      if (existingActivity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Verificar se ha submissA?es
      const submissions = await db
        .select()
        .from(activitySubmissions)
        .where(eq(activitySubmissions.activityId, id));

      if (submissions.length > 0) {
        return res.status(400).json({ 
          message: "Nao e possivel deletar uma atividade que possui submissA?es" 
        });
      }

      await db.delete(activities).where(eq(activities.id, id));

      // Notificar alunos em tempo real sobre remocao da atividade
      const realtimeManager = getRealtimeManager();
      if (realtimeManager && existingActivity[0].classId) {
        realtimeManager.notifyActivityRemoved(id, existingActivity[0].classId);
      }

      res.json({ message: "Atividade deletada com sucesso" });
  } catch (error) {
      console.error('Erro ao deletar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Submeter atividade (apenas alunos) - VERSA?O SIMPLIFICADA
  // Rota de submissao removida - usando a versao mais completa abaixo

  // Desfazer entrega de atividade (apenas alunos)
  app.post('/api/activities/:id/undo-submit', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      console.log('=== DESFAZENDO SUBMISSA?O ===');
      
      const { id: activityId } = req.params;
      const user = req.user as any;
      
      // Verificar se a atividade existe
      if (!activityId) {
        return res.status(400).json({ message: "ID da atividade e obrigatorio" });
      }
      
      console.log('Tentando desfazer submissao para:', activityId, 'usuario:', user.id);

      // Buscar e deletar a submissao
      const submissions = await db
        .select()
        .from(activitySubmissions)
        .where(
          and(
            eq(activitySubmissions.activityId, activityId),
            eq(activitySubmissions.studentId, user.id)
          )
        );

      if (submissions.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      // Deletar a submissao
      await db
        .delete(activitySubmissions)
        .where(
          and(
            eq(activitySubmissions.activityId, activityId),
            eq(activitySubmissions.studentId, user.id)
          )
        );
      
      console.log('Submissao desfeita com sucesso!');

      res.json({
        message: "Entrega desfeita com sucesso"
      });
  } catch (error) {
      console.error('Erro ao desfazer submissao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
  }
});

  // Avaliar submissao (apenas professores)
  app.post('/api/submissions/:id/grade', isAuthenticated, hasRole(['teacher']), async (req, res) => {
  try {
      const { id: submissionId } = req.params;
    const user = req.user as any;
      const { grade, feedback } = req.body;

      if (grade === undefined || grade === null) {
        return res.status(400).json({ message: "Nota e obrigatoria" });
      }

      // Verificar se a submissao existe
      const submission = await db
        .select()
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      // Verificar se o professor pode avaliar (e o professor da atividade)
      if (!submission[0].activityId) {
        return res.status(400).json({ message: "ID da atividade nao encontrado" });
      }
      
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, submission[0].activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Calcular nota final considerando penalidades
      const maxGrade = submission[0].maxGrade;
      const finalGrade = Math.max(0, grade - submission[0].latePenaltyApplied);

      // Atualizar submissao
      await db
        .update(activitySubmissions)
        .set({
          grade,
          feedback: feedback || null,
          status: 'graded',
          gradedBy: user.id,
          gradedAt: new Date().toISOString(),
          finalGrade,
          updatedAt: new Date().toISOString()
        })
        .where(eq(activitySubmissions.id, submissionId));

      // Registrar no historico
      await db.insert(submissionHistory).values({
        id: uuidv4(),
        submissionId,
        action: 'graded',
        performedBy: user.id,
        performedAt: new Date().toISOString(),
        details: `Avaliado com nota ${grade}/${maxGrade}. Nota final: ${finalGrade}/${maxGrade}`,
        previousStatus: submission[0].status,
        newStatus: 'graded',
        gradeChange: grade
      });

      // Log avalia��o de atividade
      logger.activityGraded(user, `Aluno ${submission[0].studentId}`, finalGrade, req);

      res.json({ 
        message: "Submissao avaliada com sucesso",
        finalGrade
      });
  } catch (error) {
      console.error('Erro ao avaliar submissao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar submissA?es de uma atividade
  app.get('/api/activities/:id/submissions', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const user = req.user as any;

      // Verificar se o professor pode ver as submissA?es
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const submissions = await db
        .select({
          submission: activitySubmissions,
          student: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(eq(activitySubmissions.activityId, activityId))
        .orderBy(asc(activitySubmissions.submittedAt));

      // Buscar arquivos para cada submissao
      const submissionsWithFiles = await Promise.all(
        submissions.map(async (item) => {
          const files = await db
            .select()
            .from(submissionFiles)
            .where(eq(submissionFiles.submissionId, item.submission.id));

          return {
            ...item,
            files
          };
        })
      );

      res.json(submissionsWithFiles);
  } catch (error) {
      console.error('Erro ao buscar submissA?es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
  }
});

  // Avaliacao em lote de submissA?es
  app.post('/api/activities/:id/submissions/batch-grade', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const { submissionIds, grade, feedback } = req.body;
      const user = req.user as any;

      // Verificar se o professor pode avaliar as submissA?es
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Avaliar todas as submissA?es selecionadas
      const results = [];
      for (const submissionId of submissionIds) {
        try {
          const submission = await db
            .select()
            .from(activitySubmissions)
            .where(and(
              eq(activitySubmissions.id, submissionId),
              eq(activitySubmissions.activityId, activityId)
            ))
            .limit(1);

          if (submission.length === 0) continue;

          // Calcular penalidade por atraso
          let finalGrade = grade;
          if (submission[0].submittedAt && activity[0].dueDate) {
            const submissionDate = new Date(submission[0].submittedAt);
            const dueDate = new Date(activity[0].dueDate);
            if (submissionDate > dueDate) {
              const daysLate = Math.ceil((submissionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              const penalty = Math.min(daysLate * 0.1, 0.5); // 10% por dia, maximo 50%
              finalGrade = Math.max(grade * (1 - penalty), 0);
            }
          }

          // Atualizar submissao
          await db
            .update(activitySubmissions)
            .set({
              grade: finalGrade,
              feedback,
              gradedAt: new Date().toISOString(),
              gradedBy: user.id
            })
            .where(eq(activitySubmissions.id, submissionId));

          // Registrar no historico
          await db.insert(submissionHistory).values({
            id: uuidv4(),
            submissionId,
            action: 'graded',
            performedBy: user.id,
            performedAt: new Date().toISOString(),
            details: JSON.stringify({ grade: finalGrade, feedback })
          });

          results.push({ submissionId, success: true, grade: finalGrade });
        } catch (error) {
          results.push({ submissionId, success: false, error: error.message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Erro na avaliacao em lote:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar submissA?es com filtros avancados
  app.get('/api/activities/:id/submissions/filtered', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const { status, search, sortBy = 'submittedAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
      const user = req.user as any;

      // Verificar permissA?es
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Construir query base
      let query = db
        .select({
          submission: activitySubmissions,
          student: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(eq(activitySubmissions.activityId, activityId));

      // Aplicar filtros
      const conditions = [eq(activitySubmissions.activityId, activityId)];
      
      if (status) {
        switch (status) {
          case 'pending':
            conditions.push(eq(activitySubmissions.grade, null));
            break;
          case 'graded':
            conditions.push(ne(activitySubmissions.grade, null));
            break;
          case 'late':
            if (activity[0].dueDate) {
              conditions.push(sql`${activitySubmissions.submittedAt} > ${activity[0].dueDate}`);
            }
            break;
        }
      }

      if (search) {
        conditions.push(
          or(
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
      }

      query = query.where(and(...conditions));

      // Aplicar ordenacao
      const orderColumn = sortBy === 'student' ? users.firstName : activitySubmissions[sortBy];
      query = sortOrder === 'asc' ? query.orderBy(asc(orderColumn)) : query.orderBy(desc(orderColumn));

      // Aplicar paginacao
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const submissions = await query.limit(parseInt(limit as string)).offset(offset);

      // Buscar arquivos para cada submissao
      const submissionsWithFiles = await Promise.all(
        submissions.map(async (item) => {
          const files = await db
            .select()
            .from(submissionFiles)
            .where(eq(submissionFiles.submissionId, item.submission.id));

          return {
            ...item,
            files
          };
        })
      );

      // Contar total para paginacao
      const totalQuery = db
        .select({ count: count() })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(and(...conditions));
      
      const [{ count: total }] = await totalQuery;

      res.json({
        submissions: submissionsWithFiles,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Erro ao buscar submissA?es filtradas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar historico de uma submissao
  app.get('/api/submissions/:id/history', isAuthenticated, async (req, res) => {
  try {
      const { id: submissionId } = req.params;
    const user = req.user as any;
    
      // Verificar se o usuario pode ver o historico
      const submission = await db
        .select()
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      // Verificar permissA?es
      if (user.role === 'student' && submission[0].studentId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      if (user.role === 'teacher') {
        if (!submission[0].activityId) {
          return res.status(400).json({ message: "ID da atividade nao encontrado" });
        }
        
        const activity = await db
          .select()
          .from(activities)
          .where(eq(activities.id, submission[0].activityId))
          .limit(1);

        if (activity.length === 0 || activity[0].teacherId !== user.id) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }

      const history = await db
        .select({
          history: submissionHistory,
          performer: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role
          }
        })
        .from(submissionHistory)
        .innerJoin(users, eq(submissionHistory.performedBy, users.id))
        .where(eq(submissionHistory.submissionId, submissionId))
        .orderBy(asc(submissionHistory.performedAt));

      res.json(history);
    } catch (error) {
      console.error('Erro ao buscar historico:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
  }
});

  // Upload de arquivos para atividade (apenas professores)
  app.post('/api/activities/:id/files', isAuthenticated, hasRole(['teacher']), upload.array('files', 5), async (req, res) => {
  try {
      const { id: activityId } = req.params;
    const user = req.user as any;
      const { category } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Arquivo nao fornecido" });
      }

      if (!category || !['reference', 'template', 'example'].includes(category)) {
        return res.status(400).json({ message: "Categoria invalida" });
      }

      // Verificar se o professor pode adicionar arquivos
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const fileRecords = files.map(file => ({
        id: uuidv4(),
        activityId,
        fileName: file.filename,
        originalFileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        fileCategory: category,
        uploadedBy: user.id,
        createdAt: new Date().toISOString()
      }));

      await db.insert(activityFiles).values(fileRecords);

      res.status(201).json({
        message: "Arquivos enviados com sucesso",
        files: fileRecords
      });
  } catch (error) {
      console.error('Erro ao enviar arquivos:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de arquivo
  app.get('/api/files/:filename', isAuthenticated, (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      res.download(filePath);
  } catch (error) {
      console.error('Erro ao fazer download:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota de teste
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
  });

  // ===== ROTAS DE NOTAS =====
  
  // Buscar notas do aluno
  app.get('/api/grades/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { academicYear } = req.query;
      const user = req.user as any;
      
      // Verificar permissA?es
      if (user.role === 'student' && user.id !== studentId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      let whereConditions = [eq(grades.studentId, studentId)];
      
      // Buscar notas atraves de classSubjects para obter o ano academico
      const studentGrades = await db
        .select({
          id: grades.id,
          classSubjectId: grades.classSubjectId,
          type: grades.type,
          title: grades.title,
          grade: grades.grade,
          maxGrade: grades.maxGrade,
          weight: grades.weight,
          date: grades.date,
          comments: grades.comments,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          teacherName: users.firstName,
          teacherLastName: users.lastName,
          academicYear: classSubjects.academicYear,
          createdAt: grades.createdAt,
          updatedAt: grades.updatedAt
        })
        .from(grades)
        .innerJoin(classSubjects, eq(grades.classSubjectId, classSubjects.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .innerJoin(users, eq(classSubjects.teacherId, users.id))
        .where(
          academicYear && academicYear !== 'all' 
            ? and(...whereConditions, eq(classSubjects.academicYear, academicYear as string))
            : and(...whereConditions)
        )
        .orderBy(asc(subjects.name), asc(grades.date));
      
      res.json(studentGrades);
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar/atualizar nota
  app.post('/api/grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const {
        studentId,
        classSubjectId,
        type,
        title,
        grade,
        maxGrade,
        weight,
        date,
        comments
      } = req.body;

      if (!studentId || !classSubjectId || !type || !title || !grade || !date) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      // Verificar se ja existe nota para este aluno/atividade
      const existingGrade = await db
        .select()
        .from(grades)
        .where(
          and(
            eq(grades.studentId, studentId),
            eq(grades.classSubjectId, classSubjectId),
            eq(grades.title, title)
          )
        )
        .limit(1);

      if (existingGrade.length > 0) {
        // Atualizar nota existente
        await db
          .update(grades)
          .set({
            grade,
            maxGrade: maxGrade || 10,
            weight: weight || 1,
            date,
            comments,
            updatedAt: new Date().toISOString()
          })
          .where(eq(grades.id, existingGrade[0].id));

        res.json({
          message: "Nota atualizada com sucesso",
          grade: { ...existingGrade[0], grade, maxGrade, weight, date, comments, updatedAt: new Date().toISOString() }
        });
      } else {
        // Criar nova nota
        const newGrade = {
          id: uuidv4(),
          studentId,
          classSubjectId,
          type,
          title,
          grade,
          maxGrade: maxGrade || 10,
          weight: weight || 1,
          date,
          comments,
          createdBy: (req.user as any).id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.insert(grades).values(newGrade);

        res.status(201).json({
          message: "Nota criada com sucesso",
          grade: newGrade
        });
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar nota:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE FREQUA?NCIA =====
  
  // Buscar frequencia do aluno

  // ===== ROTAS DE EVENTOS =====
  
  // Buscar eventos
  // ROTA REMOVIDA - usando a rota mais completa abaixo
  // app.get('/api/events', isAuthenticated, async (req, res) => { ... });

  // Criar evento
  // ===== ROTAS DE STATUS DOS USU�RIOS =====
  
  // Atualizar status do usuario (online/offline/ausente)
  app.post('/api/users/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { status } = req.body;
      
      // So atualizar se o status mudou ou se passou mais de 5 minutos
      const currentUser = await db.select({ lastSeen: users.lastSeen }).from(users).where(eq(users.id, user.id)).limit(1);
      
      if (currentUser.length > 0) {
        const lastUpdate = currentUser[0].lastSeen ? new Date(currentUser[0].lastSeen) : null;
        const now = new Date();
        
        // So atualiza se passou mais de 5 minutos desde a ultima atualizacao
        if (!lastUpdate || (now.getTime() - lastUpdate.getTime()) > 300000) {
          await db
            .update(users)
            .set({ 
              lastSeen: now.toISOString(),
              status: status || 'online'
            })
            .where(eq(users.id, user.id));
          
          // Log apenas mudancas de status importantes (para terminal virtual)
          logger.statusTerminal(`Status atualizado para usuario ${user.id}: ${status}`, {
            userId: user.id,
            status,
            timestamp: now.toISOString()
          });
        }
      }
      
      res.json({ message: "Status atualizado com sucesso" });
    } catch (error) {
      logger.error('Erro ao atualizar status do usuario', { userId: (req.user as any)?.id, error: (error as Error).message });
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar status dos usuarios
  app.get('/api/users/status', isAuthenticated, async (req, res) => {
    try {
      const { userIds } = req.query;
      
      // Corrigir validacao para aceitar string separada por virgula
      let userIdsArray: string[] = [];
      
      if (typeof userIds === 'string') {
        userIdsArray = userIds.split(',').filter(id => id.trim());
      } else if (Array.isArray(userIds)) {
        userIdsArray = userIds.filter(id => id && typeof id === 'string').map(id => String(id));
      }
      
      if (userIdsArray.length === 0) {
        return res.status(400).json({ message: "IDs dos usuarios sao obrigatorios" });
      }
      
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutos
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutos
      
      const usersStatus = await db
        .select({
          id: users.id,
          status: users.status,
          lastSeen: users.lastSeen
        })
        .from(users)
        .where(inArray(users.id, userIdsArray));
      
      // Determinar status baseado na atividade
      const processedStatus = usersStatus.map(user => {
        if (!user.lastSeen) return { ...user, currentStatus: 'offline' };
        
        const lastSeen = new Date(user.lastSeen);
        
        if (lastSeen > fiveMinutesAgo) {
          return { ...user, currentStatus: 'online' };
        } else if (lastSeen > thirtyMinutesAgo) {
          return { ...user, currentStatus: 'ausente' };
        } else {
          return { ...user, currentStatus: 'offline' };
        }
      });
      
      res.json({ data: processedStatus });
    } catch (error) {
      logger.error('Erro ao buscar status dos usuarios', { error: (error as Error).message });
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE ATIVIDADES =====
  
  // Buscar atividades do aluno
  app.get('/api/activities/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const user = req.user as any;
      
      console.log('=== BUSCANDO ATIVIDADES DO ALUNO ===');
      console.log('Student ID:', studentId);
      console.log('User requesting:', user.id, user.role);
      
      // Verificar se o usuario e o proprio aluno ou um professor
      if (user.role === 'student' && user.id !== studentId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar apenas atividades das turmas em que o aluno esta matriculado
      const studentActivities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          subjectId: activities.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          teacherId: activities.teacherId,
          teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('teacherName'),
          classId: activities.classId,
          className: classes.name,
          dueDate: activities.dueDate,
          maxGrade: activities.maxGrade,
          instructions: activities.instructions,
          requirements: activities.requirements,
          status: activities.status,
          allowLateSubmission: activities.allowLateSubmission,
          latePenalty: activities.latePenalty,
          createdAt: activities.createdAt,
          updatedAt: activities.updatedAt,
          // Dados da submissao do aluno
          submissionId: activitySubmissions.id,
          submissionStatus: activitySubmissions.status,
          submittedAt: activitySubmissions.submittedAt,
          submissionComment: activitySubmissions.comment,
          grade: activitySubmissions.grade,
          feedback: activitySubmissions.feedback,
          isLate: activitySubmissions.isLate,
          finalGrade: activitySubmissions.finalGrade,
          latePenaltyApplied: activitySubmissions.latePenaltyApplied
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(users, eq(activities.teacherId, users.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .innerJoin(studentClass, and(
          eq(studentClass.classId, activities.classId),
          eq(studentClass.studentId, studentId),
          eq(studentClass.status, 'active')
        ))
        .leftJoin(activitySubmissions, and(
          eq(activities.id, activitySubmissions.activityId),
          eq(activitySubmissions.studentId, studentId)
        ))
        .where(eq(activities.status, 'active'))
        .orderBy(asc(activities.dueDate));
      
      console.log("Encontradas " + studentActivities.length + " atividades para o aluno matriculado");
      
      res.json({ data: studentActivities });
    } catch (error) {
      console.error('Erro ao buscar atividades do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // ===== ROTAS PARA PROFESSORES =====
  
  
  // Buscar atividades criadas pelo professor
  app.get('/api/activities/teacher/:teacherId', isAuthenticated, async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;
      
      console.log('=== BUSCANDO ATIVIDADES DO PROFESSOR ===');
      console.log('Teacher ID:', teacherId);
      console.log('User requesting:', user.id, user.role);
      
      // Verificar se o usuario e o proprio professor ou admin
      if (user.role === 'teacher' && user.id !== teacherId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Primeiro, verificar se existem atividades para este professor
      const allActivitiesForTeacher = await db
        .select()
        .from(activities)
        .where(eq(activities.teacherId, teacherId));
      
      console.log("Total de atividades diretas do professor: " + allActivitiesForTeacher.length);
      
      if (allActivitiesForTeacher.length > 0) {
        console.log('?? Atividades encontradas:');
        allActivitiesForTeacher.forEach((activity, index) => {
          console.log((index + 1) + ". " + activity.title);
          console.log("   Subject ID: " + activity.subjectId);
          console.log("   Class ID: " + activity.classId);
          console.log("   Status: " + activity.status);
        });
      }
      
      // Buscar atividades do professor diretamente pelo teacherId
      const teacherActivities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          subjectId: activities.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          classId: activities.classId,
          className: classes.name,
          dueDate: activities.dueDate,
          maxGrade: activities.maxGrade,
          instructions: activities.instructions,
          requirements: activities.requirements,
          status: activities.status,
          allowLateSubmission: activities.allowLateSubmission,
          latePenalty: activities.latePenalty,
          maxFileSize: activities.maxFileSize,
          allowedFileTypes: activities.allowedFileTypes,
          createdAt: activities.createdAt,
          updatedAt: activities.updatedAt,
          // Contagem de submissA?es
          submissionCount: sql<number>`COUNT(${activitySubmissions.id})`.as('submissionCount'),
          gradedCount: sql<number>`COUNT(CASE WHEN ${activitySubmissions.status} = 'graded' THEN 1 END)`.as('gradedCount'),
          pendingCount: sql<number>`COUNT(CASE WHEN ${activitySubmissions.status} = 'submitted' THEN 1 END)`.as('pendingCount')
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .leftJoin(activitySubmissions, eq(activities.id, activitySubmissions.activityId))
        .where(eq(activities.teacherId, teacherId))
        .groupBy(activities.id)
        .orderBy(desc(activities.createdAt));
      
      console.log("? Encontradas " + teacherActivities.length + " atividades das disciplinas do professor");
      
      // Debug: verificar se os JOINs estao funcionando
      if (allActivitiesForTeacher.length > 0 && teacherActivities.length === 0) {
        console.log('? PROBLEMA: Atividades existem mas JOINs falharam!');
        
        // Verificar se subjects e classes existem
        const allSubjects = await db.select().from(subjects);
        const allClasses = await db.select().from(classes);
        
        console.log("Total de subjects: " + allSubjects.length);
        console.log("Total de classes: " + allClasses.length);
        
        // Verificar IDs especificos
        const firstActivity = allActivitiesForTeacher[0];
        const subjectExists = allSubjects.find(s => s.id === firstActivity.subjectId);
        const classExists = allClasses.find(c => c.id === firstActivity.classId);
        
        console.log("Verificando IDs da primeira atividade:");
        console.log("   Subject ID: " + firstActivity.subjectId + " - Existe: " + (subjectExists ? 'SIM' : 'NAO'));
        console.log("   Class ID: " + firstActivity.classId + " - Existe: " + (classExists ? 'SIM' : 'NAO'));
        
        if (subjectExists) {
          console.log("   Subject name: " + subjectExists.name);
        }
        if (classExists) {
          console.log("   Class name: " + classExists.name);
        }
      }
      
      res.json({ data: teacherActivities });
    } catch (error) {
      console.error('Erro ao buscar atividades do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  


  // ===== ROTAS PARA GESTA?O DE TURMAS =====
  
  // Buscar turmas do professor com detalhes completos
  app.get('/api/teacher/:teacherId/classes-detailed', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;
      
      console.log('=== API CLASSES-DETAILED ===');
      console.log('Teacher ID:', teacherId);
      console.log('User ID:', user.id);
      console.log('User Role:', user.role);
      
      // Verificar se o professor pode acessar os dados
      if (user.id !== teacherId && user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar turmas com disciplinas e contagem de alunos
      const classesWithDetails = await db
          .select({
          classId: classes.id,
          className: classes.name,
          grade: classes.grade,
          section: classes.section,
          academicYear: classes.academicYear,
          subjectId: subjects.id,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          schedule: classSubjects.schedule,
          room: classSubjects.room,
        })
        .from(classes)
          .innerJoin(classSubjects, and(
          eq(classSubjects.classId, classes.id),
          eq(classSubjects.teacherId, teacherId),
            eq(classSubjects.status, 'active')
          ))
        .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
        .where(eq(classes.status, 'active'))
        .orderBy(classes.grade, classes.section);
      
      // Agrupar por turma
      const classesMap = new Map();
      
      for (const item of classesWithDetails) {
        if (!classesMap.has(item.classId)) {
          // Contar alunos da turma
          const studentCount = await db
            .select({ count: sql`count(*)` })
            .from(studentClass)
            .where(and(
              eq(studentClass.classId, item.classId),
              eq(studentClass.status, 'active')
            ));

          // Buscar alunos da turma
          const students = await db
          .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              registrationNumber: users.registrationNumber,
              profileImageUrl: users.profileImageUrl
            })
            .from(users)
            .innerJoin(studentClass, and(
              eq(studentClass.studentId, users.id),
              eq(studentClass.classId, item.classId),
              eq(studentClass.status, 'active')
            ))
            .where(eq(users.status, 'active'))
            .orderBy(users.firstName, users.lastName);
          
          classesMap.set(item.classId, {
            id: item.classId,
            name: item.className,
            grade: item.grade,
            section: item.section,
            academicYear: item.academicYear,
            subjects: [],
            studentCount: studentCount[0]?.count || 0,
            students: students
          });
        }
        
        const classData = classesMap.get(item.classId);
        classData.subjects.push({
          id: item.subjectId,
          name: item.subjectName,
          code: item.subjectCode,
          schedule: item.schedule,
          room: item.room
        });
      }
      
      const result = Array.from(classesMap.values());
      
      console.log('? Resultado final:', result.length, 'turmas');
      result.forEach(r => {
        console.log("  - " + r.name + ": " + r.students.length + " alunos");
        if (r.students.length > 0) {
          r.students.forEach(s => console.log("    * " + s.firstName + " " + s.lastName + " (" + s.id + ")"));
        }
      });
      
      res.json({ data: result });
    } catch (error) {
      console.error('Erro ao buscar turmas detalhadas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar detalhes de uma turma especifica
  app.get('/api/classes/:classId/detail', isAuthenticated, async (req, res) => {
    try {
      const { classId } = req.params;
      const user = req.user as any;
      
      // Buscar dados da turma
      const classData = await db
          .select({
            id: classes.id,
            name: classes.name,
            grade: classes.grade,
            section: classes.section,
          academicYear: classes.academicYear,
          capacity: classes.capacity,
          // currentStudents ser� calculado dinamicamente
          })
          .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);
      
      if (classData.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }
      
      // Verificar se o usuario tem acesso A? turma
      if (user.role === 'teacher') {
        const hasAccess = await db
          .select({ count: sql`count(*)` })
          .from(classSubjects)
          .where(and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.teacherId, user.id),
            eq(classSubjects.status, 'active')
          ));
        
        if (hasAccess[0]?.count === 0) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      
      res.json({ data: classData[0] });
    } catch (error) {
      console.error('Erro ao buscar detalhes da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });


  // Buscar presenca de uma turma para um dia especifico

  // ===== ROTAS PARA SISTEMA DE NOTAS =====
  
  // Buscar notas de uma turma por bimestre
  app.get('/api/classes/:classId/grades/:quarter', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId, quarter } = req.params;
      const user = req.user as any;
      
      // Verificar acesso A? turma
      const hasAccess = await db
        .select({ count: sql`count(*)` })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ));
      
      if (hasAccess[0]?.count === 0) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar notas dos alunos para o bimestre
      console.log('?? ===== BUSCANDO NOTAS =====');
      console.log('?? Quarter:', quarter);
      console.log('?? Class ID:', classId);
      console.log('?? Filtro de data:', `strftime('%m', date) = ${quarter.toString().padStart(2, '0')}`);
      
      // Primeiro, buscar todas as notas para debug
      const allGrades = await db
        .select({
          studentId: grades.studentId,
          type: grades.type,
          grade: grades.grade,
          title: grades.title,
          date: grades.date,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName')
        })
        .from(grades)
        .innerJoin(users, eq(users.id, grades.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, grades.classSubjectId))
        .where(eq(classSubjects.classId, classId));
      
      console.log('?? Todas as notas da turma:', allGrades.length);
      allGrades.forEach(grade => {
        console.log("  - " + grade.studentName + ": " + grade.type + " = " + grade.grade + " (" + grade.date + ")");
      });
      
      console.log('?? Executando consulta filtrada...');
      const gradesData = await db
        .select({
          studentId: grades.studentId,
          type: grades.type,
          grade: grades.grade,
          title: grades.title,
          date: grades.date,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName')
        })
        .from(grades)
        .innerJoin(users, eq(users.id, grades.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, grades.classSubjectId))
        .where(and(
          eq(classSubjects.classId, classId),
          sql`strftime('%m', ${grades.date}) = ${quarter.toString().padStart(2, '0')}` // Filtrar por bimestre (MM)
        ));
      
      console.log('?? ===== RESULTADO DA CONSULTA FILTRADA =====');
      console.log('?? Notas encontradas para quarter', quarter, ':', gradesData.length);
      gradesData.forEach(grade => {
        console.log("  ? " + grade.studentName + ": " + grade.type + " = " + grade.grade + " (" + grade.date + ")");
      });
      
      res.json({ data: gradesData });
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Salvar/atualizar nota de um aluno
  app.post('/api/classes/:classId/grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId } = req.params;
      const { studentId, quarter, type, grade, title } = req.body;
      const user = req.user as any;
      
      console.log('=== SALVANDO NOTA BACKEND ===');
      console.log('Class ID:', classId);
      console.log('Student ID:', studentId);
      console.log('Quarter:', quarter);
      console.log('Type:', type);
      console.log('Grade:', grade);
      console.log('Title:', title);
      console.log('User:', user.id);
      
      // Verificar acesso A? turma e pegar classSubjectId
      console.log('?? Buscando classSubject...');
      console.log('Class ID:', classId);
      console.log('Teacher ID:', user.id);
      
      const classSubjectData = await db
        .select({ id: classSubjects.id })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ))
        .limit(1);
      
      console.log('?? ClassSubject encontrados:', classSubjectData.length);
      
      if (classSubjectData.length === 0) {
        console.log('? Nenhum classSubject encontrado - acesso negado');
        return res.status(403).json({ message: "Acesso negado - turma nao encontrada para este professor" });
      }
      
      const classSubjectId = classSubjectData[0].id;
      console.log('? ClassSubject ID encontrado:', classSubjectId);
      
      // Verificar se ja existe uma nota deste tipo para este aluno no bimestre
      const existingGrade = await db
        .select({ id: grades.id })
        .from(grades)
        .where(and(
          eq(grades.studentId, studentId),
          eq(grades.classSubjectId, classSubjectId),
          eq(grades.type, type),
          sql`strftime('%m', ${grades.date}) = ${quarter.toString().padStart(2, '0')}` // Filtrar por mes
        ))
        .limit(1);
      
      const currentDate = new Date().toISOString();
      const gradeDate = `2024-${quarter.toString().padStart(2, '0')}-15`; // 15 do mes do bimestre
      console.log('?? Data da nota:', gradeDate);
      console.log('?? Quarter:', quarter);
      
      if (existingGrade.length > 0) {
        console.log('?? Atualizando nota existente...');
        // Atualizar nota existente
        await db
          .update(grades)
          .set({
            grade: parseFloat(grade),
            title: title,
            updatedAt: currentDate
          })
          .where(eq(grades.id, existingGrade[0].id));
        
        console.log('? Nota atualizada com sucesso');
      } else {
        console.log('? Criando nova nota...');
        // Criar nova nota
        const newGrade = {
          id: `grade_${Date.now()}_${studentId}`,
          studentId: studentId,
          classSubjectId: classSubjectId,
          type: type,
          title: title,
          grade: parseFloat(grade),
          maxGrade: 10,
          weight: 1,
          date: gradeDate,
          createdBy: user.id,
          createdAt: currentDate,
          updatedAt: currentDate
        };
        
        await db.insert(grades).values(newGrade);
        console.log('? Nova nota criada com sucesso');
      }
      
      console.log('?? Nota salva com sucesso - enviando resposta');
      res.json({ message: "Nota salva com sucesso" });
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar medias dos alunos por bimestre
  app.get('/api/classes/:classId/averages/:quarter', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId, quarter } = req.params;
      const user = req.user as any;
      
      // Verificar acesso A? turma
      const hasAccess = await db
        .select({ count: sql`count(*)` })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ));
      
      if (hasAccess[0]?.count === 0) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar medias calculadas dos alunos
      const averagesData = await db
          .select({
          studentId: grades.studentId,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          examGrade: sql`MAX(CASE WHEN ${grades.type} = 'exam' THEN ${grades.grade} END)`.as('examGrade'),
          homeworkGrade: sql`MAX(CASE WHEN ${grades.type} = 'homework' THEN ${grades.grade} END)`.as('homeworkGrade'),
          average: sql`
            CASE 
              WHEN MAX(CASE WHEN ${grades.type} = 'exam' THEN ${grades.grade} END) IS NOT NULL 
                   AND MAX(CASE WHEN ${grades.type} = 'homework' THEN ${grades.grade} END) IS NOT NULL
              THEN (MAX(CASE WHEN ${grades.type} = 'exam' THEN ${grades.grade} END) + 
                    MAX(CASE WHEN ${grades.type} = 'homework' THEN ${grades.grade} END)) / 2.0
              ELSE NULL
            END
          `.as('average')
        })
        .from(grades)
        .innerJoin(users, eq(users.id, grades.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, grades.classSubjectId))
        .where(and(
          eq(classSubjects.classId, classId),
          sql`substr(${grades.date}, 6, 2) = ${quarter.toString().padStart(2, '0')}`
        ))
        .groupBy(grades.studentId, users.firstName, users.lastName);
      
      res.json({ data: averagesData });
    } catch (error) {
      console.error('Erro ao buscar medias:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para calcular media geral de todos os bimestres
  app.get('/api/classes/:classId/general-averages', async (req, res) => {
    try {
      const { classId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Nao autorizado" });
      }

      // Verificar se o usuario tem acesso A? turma
      const hasAccess = await db
        .select({ count: sql<number>`count(*)` })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, userId)
        ));

      if (hasAccess[0]?.count === 0) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      console.log('?? Calculando medias gerais para turma:', classId);

      // Buscar todas as notas de todos os bimestres
      const allGrades = await db
        .select({
          studentId: grades.studentId,
          grade: grades.grade,
          date: grades.date,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName')
        })
        .from(grades)
        .innerJoin(users, eq(users.id, grades.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, grades.classSubjectId))
        .where(eq(classSubjects.classId, classId));

      console.log('?? Total de notas encontradas:', allGrades.length);

      // Agrupar por estudante e calcular media geral
      const studentAverages: any = {};
      
      allGrades.forEach(grade => {
        if (!studentAverages[grade.studentId]) {
          studentAverages[grade.studentId] = {
            studentId: grade.studentId,
            studentName: grade.studentName,
            grades: [],
            quarterAverages: {}
          };
        }
        studentAverages[grade.studentId].grades.push(grade.grade);
        
        // Calcular media por bimestre
        const month = new Date(grade.date).getMonth() + 1;
        const quarter = Math.ceil(month / 3); // 1-3 = 1? bimestre, 4-6 = 2? bimestre, etc.
        
        if (!studentAverages[grade.studentId].quarterAverages[quarter]) {
          studentAverages[grade.studentId].quarterAverages[quarter] = [];
        }
        studentAverages[grade.studentId].quarterAverages[quarter].push(grade.grade);
      });

      // Calcular medias finais
      const finalAverages = Object.values(studentAverages).map((student: any) => {
        // Media geral (todos os bimestres)
        const generalAverage = student.grades.length > 0 
          ? Math.round((student.grades.reduce((sum: number, grade: number) => sum + grade, 0) / student.grades.length) * 100) / 100
          : 0;

        // Medias por bimestre
        const quarterAverages = {};
        for (let q = 1; q <= 4; q++) {
          if (student.quarterAverages[q] && student.quarterAverages[q].length > 0) {
            quarterAverages[q] = Math.round((student.quarterAverages[q].reduce((sum: number, grade: number) => sum + grade, 0) / student.quarterAverages[q].length) * 100) / 100;
          } else {
            quarterAverages[q] = 0;
          }
        }

        // Status baseado na media geral (6.0 para aprovacao)
        let status = 'Pendente';
        if (generalAverage >= 6.0) {
          status = 'Aprovado';
        } else if (generalAverage >= 4.0) {
          status = 'Recuperacao';
        } else if (generalAverage > 0) {
          status = 'Reprovado';
        }

        return {
          studentId: student.studentId,
          studentName: student.studentName,
          generalAverage,
          quarterAverages,
          status,
          totalGrades: student.grades.length
        };
      });

      console.log('?? Medias gerais calculadas:', finalAverages.length);
      res.json({ data: finalAverages });

    } catch (error) {
      console.error('Erro ao calcular medias gerais:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar submissA?es de uma atividade
  app.get('/api/activities/:id/submissions', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      console.log('=== BUSCANDO SUBMISSA?ES DA ATIVIDADE ===');
      console.log('Activity ID:', id);
      console.log('User:', user.id, user.role);
      
      // Verificar se a atividade existe e se o professor tem permissao
      const activityPermission = await db
        .select({
          activity: activities,
          classSubject: classSubjects
        })
        .from(activities)
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, activities.classId),
          eq(classSubjects.subjectId, activities.subjectId)
        ))
        .where(eq(activities.id, id))
        .limit(1);
      
      if (activityPermission.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }
      
      const { activity, classSubject } = activityPermission[0];
      
      // Se for professor, verificar se leciona esta disciplina
      if (user.role === 'teacher') {
        if (activity.teacherId !== user.id || classSubject.teacherId !== user.id) {
          return res.status(403).json({ 
            message: "Voce so pode ver submissA?es de atividades das disciplinas que leciona" 
          });
        }
      }
      
      // Buscar submissA?es apenas de alunos matriculados na turma
      const submissions = await db
        .select({
          id: activitySubmissions.id,
          studentId: activitySubmissions.studentId,
          submittedAt: activitySubmissions.submittedAt,
          comment: activitySubmissions.comment,
          status: activitySubmissions.status,
          grade: activitySubmissions.grade,
          feedback: activitySubmissions.feedback,
          isLate: activitySubmissions.isLate,
          finalGrade: activitySubmissions.finalGrade,
          latePenaltyApplied: activitySubmissions.latePenaltyApplied,
          // Dados do aluno
          studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          studentEmail: users.email,
          studentRegistration: users.registrationNumber
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .innerJoin(studentClass, and(
          eq(studentClass.studentId, activitySubmissions.studentId),
          eq(studentClass.classId, activity.classId),
          eq(studentClass.status, 'active')
        ))
        .where(eq(activitySubmissions.activityId, id))
        .orderBy(desc(activitySubmissions.submittedAt));
      
      console.log("? Encontradas " + submissions.length + " submissA?es de alunos matriculados");
      
      res.json({ data: submissions });
    } catch (error) {
      console.error('Erro ao buscar submissA?es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar todas as submissA?es pendentes do professor
  app.get('/api/teacher/:teacherId/pending-submissions', isAuthenticated, async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;
      
      console.log('=== BUSCANDO SUBMISSA?ES PENDENTES DO PROFESSOR ===');
      console.log('Teacher ID:', teacherId);
      console.log('User requesting:', user.id, user.role);
      
      // Verificar se o usuario e o proprio professor
      if (user.role === 'teacher' && user.id !== teacherId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar submissA?es pendentes apenas das disciplinas que o professor leciona
      const pendingSubmissions = await db
        .select({
          submissionId: activitySubmissions.id,
          activityId: activities.id,
          activityTitle: activities.title,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          className: classes.name,
          studentId: activitySubmissions.studentId,
          studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          studentEmail: users.email,
          submittedAt: activitySubmissions.submittedAt,
          comment: activitySubmissions.comment,
          isLate: activitySubmissions.isLate,
          latePenaltyApplied: activitySubmissions.latePenaltyApplied,
          maxGrade: activities.maxGrade,
          dueDate: activities.dueDate
        })
        .from(activitySubmissions)
        .innerJoin(activities, eq(activitySubmissions.activityId, activities.id))
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, activities.classId),
          eq(classSubjects.subjectId, activities.subjectId),
          eq(classSubjects.teacherId, teacherId)
        ))
        .where(and(
          eq(activities.teacherId, teacherId),
          eq(activitySubmissions.status, 'submitted'),
          eq(classSubjects.status, 'active'),
          eq(activities.classId, '3e281468-7ade-440c-949a-a132787eb1bb') // Filtrar apenas turma 7? C
        ))
        .orderBy(desc(activitySubmissions.submittedAt));
      
      console.log("? Encontradas " + pendingSubmissions.length + " submissA?es pendentes");
      
      res.json({ data: pendingSubmissions });
    } catch (error) {
      console.error('Erro ao buscar submissA?es pendentes:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Avaliar submissao especifica de atividade
  app.post('/api/submissions/:submissionId/grade', isAuthenticated, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { grade, feedback } = req.body;
      const user = req.user as any;
      
      console.log('=== AVALIANDO SUBMISSA?O ===');
      console.log('Submission ID:', submissionId);
      console.log('Grade:', grade);
      console.log('Teacher:', user.id);
      
      if (user.role !== 'teacher') {
        return res.status(403).json({ message: "Apenas professores podem avaliar atividades" });
      }
      
      if (grade === undefined || grade === null) {
        return res.status(400).json({ message: "Nota e obrigatoria" });
      }
      
      // Buscar a submissao e verificar permissA?es completas
      const submissionData = await db
        .select({
          submission: activitySubmissions,
          activity: activities,
          classSubject: classSubjects
        })
        .from(activitySubmissions)
        .innerJoin(activities, eq(activitySubmissions.activityId, activities.id))
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, activities.classId),
          eq(classSubjects.subjectId, activities.subjectId),
          eq(classSubjects.teacherId, user.id)
        ))
        .where(eq(activitySubmissions.id, submissionId))
        .limit(1);
      
      if (submissionData.length === 0) {
        return res.status(404).json({ 
          message: "Submissao nao encontrada ou voce nao tem permissao para avalia-la" 
        });
      }
      
      const { submission: sub, activity, classSubject } = submissionData[0];
      
      // Verificacao dupla de seguranca
      if (activity.teacherId !== user.id || classSubject.teacherId !== user.id) {
        return res.status(403).json({ 
          message: "Voce so pode avaliar submissA?es de atividades das disciplinas que leciona" 
        });
      }
      
      // Validar nota
      const gradeValue = Number(grade);
      if (gradeValue < 0 || gradeValue > activity.maxGrade) {
        return res.status(400).json({ 
          message: `A nota deve estar entre 0 e ${activity.maxGrade}` 
        });
      }
      
      // Calcular nota final considerando penalidades
      let finalGrade = gradeValue;
      if (sub.isLate && sub.latePenaltyApplied > 0) {
        finalGrade = Math.max(0, finalGrade - sub.latePenaltyApplied);
      }
      
      // Atualizar a submissao
      await db
        .update(activitySubmissions)
        .set({
          grade: gradeValue,
          finalGrade: finalGrade,
          feedback: feedback || '',
          status: 'graded',
          gradedBy: user.id,
          gradedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(activitySubmissions.id, submissionId));
      
      console.log('? Submissao avaliada com sucesso pelo professor autorizado!');
      
      res.json({ 
        message: "Submissao avaliada com sucesso",
        grade: gradeValue,
        finalGrade: finalGrade,
        latePenaltyApplied: sub.latePenaltyApplied,
        maxGrade: activity.maxGrade
      });
    } catch (error) {
      console.error('Erro ao avaliar submissao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Submeter atividade (com suporte a arquivos)
  app.post('/api/activities/:id/submit', isAuthenticated, upload.array('files', 5), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      console.log('=== SUBMISSA?O DE ATIVIDADE ===');
      console.log('Activity ID:', id);
      console.log('User ID:', user.id);
      
      // Apenas alunos podem submeter atividades
      if (user.role !== 'student') {
        return res.status(403).json({ message: "Apenas alunos podem submeter atividades" });
      }
      
      // Verificar se a atividade existe e esta ativa
      const activityResult = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);
      
      if (activityResult.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }
      
      const activity = activityResult[0];
      
      if (activity.status !== 'active' && activity.status !== 'pending') {
        return res.status(400).json({ message: "Atividade nao esta disponivel para submissao" });
      }
      
      // Verificar se ja existe uma submissao
      const existingSubmission = await db
        .select()
        .from(activitySubmissions)
        .where(and(eq(activitySubmissions.activityId, id), eq(activitySubmissions.studentId, user.id)))
        .limit(1);
      
      if (existingSubmission.length > 0) {
        // Se existe, primeiro remover a submissao anterior
        await db
          .delete(submissionFiles)
          .where(eq(submissionFiles.submissionId, existingSubmission[0].id));
        
        await db
          .delete(activitySubmissions)
          .where(eq(activitySubmissions.id, existingSubmission[0].id));
      }
      
      // Verificar se esta atrasado
      const now = new Date();
      const dueDate = new Date(activity.dueDate);
      const isLate = now > dueDate;
      
      if (isLate && !activity.allowLateSubmission) {
        return res.status(400).json({ message: "Prazo de entrega expirado e submissA?es em atraso nao sao permitidas" });
      }
      
      // Calcular penalidade por atraso
      let latePenaltyApplied = 0;
      if (isLate && activity.allowLateSubmission) {
        latePenaltyApplied = activity.latePenalty || 0;
      }
      
      // Extrair conteudo do formulario
      const content = req.body.content || '';
      console.log('?? Conte�do da submiss�o:', content);
      console.log('?? Arquivos recebidos:', req.files?.length || 0);
      
      // Criar nova submissao
      const newSubmission = {
        id: uuidv4(),
        activityId: id,
        studentId: user.id,
        submittedAt: now.toISOString(),
        comment: content,
        status: isLate ? 'late' as const : 'submitted' as const,
        maxGrade: activity.maxGrade,
        isLate: isLate,
        latePenaltyApplied: latePenaltyApplied,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      
      await db.insert(activitySubmissions).values(newSubmission);
      console.log('? Submiss�o criada com sucesso:', newSubmission.id);
      
      // Log submiss�o de atividade
      logger.activitySubmitted(user, activity.title, req);
      
      // Processar arquivos enviados
      const files = req.files as Express.Multer.File[] || [];
      
      for (const file of files) {
        const fileId = uuidv4();
        
        // O arquivo ja foi salvo pelo multer, vamos apenas registrar no banco
        // O multer ja salvou com um nome unico, vamos usar o path do arquivo
        const filePath = file.path; // Caminho onde o multer salvou o arquivo
        
        // Salvar informacA?es do arquivo no banco
        await db.insert(submissionFiles).values({
          id: fileId,
          submissionId: newSubmission.id,
          fileName: file.filename, // Nome unico gerado pelo multer
          originalFileName: file.originalname,
          filePath: filePath,
          fileSize: file.size,
          fileType: file.mimetype,
          uploadedAt: now.toISOString()
        });
      }
      
      console.log('? Submissao criada com sucesso!');
      console.log("?? " + files.length + " arquivo(s) processado(s)");
      
      res.json({ 
        message: "Atividade submetida com sucesso",
        submission: {
          id: newSubmission.id,
          isLate: isLate,
          latePenaltyApplied: latePenaltyApplied,
          filesCount: files.length
        }
      });
    } catch (error) {
      console.error('Erro ao submeter atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Desfazer entrega de atividade (apenas se nao foi avaliada)
  app.post('/api/activities/:id/undo-submit', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      console.log('=== DESFAZENDO ENTREGA DE ATIVIDADE ===');
      console.log('Activity ID:', id);
      console.log('User ID:', user.id);
      
      if (user.role !== 'student') {
        return res.status(403).json({ message: "Apenas alunos podem desfazer entregas" });
      }
      
      // Buscar a submissao do aluno
      const submission = await db
        .select()
        .from(activitySubmissions)
        .where(and(
          eq(activitySubmissions.activityId, id),
          eq(activitySubmissions.studentId, user.id)
        ))
        .limit(1);
      
      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }
      
      const sub = submission[0];
      
      // Verificar se ja foi avaliada
      if (sub.status === 'graded') {
        return res.status(400).json({ 
          message: "Nao e possivel desfazer a entrega de uma atividade ja avaliada" 
        });
      }
      
      // Remover a submissao
      await db
        .delete(activitySubmissions)
        .where(eq(activitySubmissions.id, sub.id));
      
      console.log('? Entrega desfeita com sucesso!');
      
      res.json({ 
        message: "Entrega desfeita com sucesso. Voce pode enviar novamente."
      });
    } catch (error) {
      console.error('Erro ao desfazer entrega:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE MENSAGENS (CHAT) =====
  
  // Buscar conversas do usuario
  app.get('/api/messages/conversations', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Log acesso ao chat
      logger.chatAccessed(user, req);
      
      // REGRA: Buscar todas as conversas com a A?LTIMA mensagem de cada uma
      // Primeiro, encontrar todos os usuarios com quem o usuario atual teve conversas
      const conversationUsers = await db
        .selectDistinct({
          otherUserId: sql<string>`CASE 
            WHEN ${messages.senderId} = ${user.id} THEN ${messages.recipientId}
            ELSE ${messages.senderId}
          END`.as('otherUserId')
        })
        .from(messages)
        .where(
          or(
            eq(messages.senderId, user.id),
            eq(messages.recipientId, user.id)
          )
        );
      
      // Para cada conversa, buscar a ultima mensagem e dados do usuario
      const conversations = [];
      
      for (const conv of conversationUsers) {
        // Buscar a ultima mensagem da conversa
        const lastMessageData = await db
          .select({
            content: messages.content,
            createdAt: messages.createdAt,
            senderId: messages.senderId
          })
          .from(messages)
          .where(
            and(
              or(
                and(eq(messages.senderId, user.id), eq(messages.recipientId, conv.otherUserId)),
                and(eq(messages.senderId, conv.otherUserId), eq(messages.recipientId, user.id))
              )
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);
        
        // Buscar dados do outro usuario
        const otherUserData = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role
          })
          .from(users)
          .where(eq(users.id, conv.otherUserId))
          .limit(1);
        
        // Contar mensagens nao lidas
        const unreadResult = await db
          .select({ count: count() })
          .from(messages)
          .where(
            and(
              eq(messages.recipientId, user.id),
              eq(messages.senderId, conv.otherUserId),
              eq(messages.read, false)
            )
          );
        
        if (lastMessageData.length > 0 && otherUserData.length > 0) {
          conversations.push({
            conversationId: conv.otherUserId,
            otherUserId: conv.otherUserId,
            otherUserFirstName: otherUserData[0].firstName,
            otherUserLastName: otherUserData[0].lastName,
            otherUserRole: otherUserData[0].role,
            recipientEmail: otherUserData[0].email,
            lastMessage: lastMessageData[0].content,
            lastMessageTime: lastMessageData[0].createdAt,
            unreadCount: unreadResult[0]?.count || 0
          });
        }
      }
      
      // Ordenar por ultima mensagem (mais recente primeiro)
      conversations.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime).getTime();
        const timeB = new Date(b.lastMessageTime).getTime();
        return timeB - timeA;
      });
      
      res.json(conversations);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar mensagens de uma conversa (usando ID do usuario)
  app.get('/api/messages/conversation/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = req.user as any;
      
      // Buscar mensagens entre os dois usuarios
      const messagesList = await db
        .select({
          id: messages.id,
          content: messages.content,
          senderId: messages.senderId,
          senderName: users.firstName,
          senderLastName: users.lastName,
          recipientId: messages.recipientId,
          read: messages.read,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(
          and(
            or(
              and(eq(messages.senderId, user.id), eq(messages.recipientId, userId)),
              and(eq(messages.senderId, userId), eq(messages.recipientId, user.id))
            )
          )
        )
        .orderBy(asc(messages.createdAt));
      
      // Marcar mensagens como lidas
      await db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.recipientId, user.id),
            eq(messages.senderId, userId),
            eq(messages.read, false)
          )
        );
      
      res.json({ data: messagesList });
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Enviar mensagem
  app.post('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const {
        recipientEmail,
        content,
        conversationId
      } = req.body;

      if (!recipientEmail || !content) {
        return res.status(400).json({ message: "Email do destinatario e conteudo sao obrigatorios" });
      }

      // Buscar usuario destinatario
      const recipient = await db
        .select()
        .from(users)
        .where(eq(users.email, recipientEmail))
        .limit(1);

      if (recipient.length === 0) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }

      const sender = req.user as any;

      const newMessage = {
        id: uuidv4(),
        senderId: sender.id,
        recipientId: recipient[0].id,
        subject: null,
        content,
        type: 'private' as const,
        read: false,
        priority: 'medium' as const,
        parentMessageId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(messages).values(newMessage);

      // Log envio de mensagem
      logger.messageSent(sender, 1, req);

      // Criar conversa automatica para o destinatario se nao existir
      try {
        // Verificar se ja existe uma conversa entre os usuarios
        const existingConversation = await db
          .select()
          .from(messages)
          .where(
            or(
              and(eq(messages.senderId, sender.id), eq(messages.recipientId, recipient[0].id)),
              and(eq(messages.senderId, recipient[0].id), eq(messages.recipientId, sender.id))
            )
          )
          .limit(1);

        if (existingConversation.length === 0) {
          // Criar primeira conversa - inserir uma mensagem "virtual" para o destinatario
          const virtualMessage = {
            id: uuidv4(),
            senderId: recipient[0].id,
            recipientId: sender.id,
            subject: null,
            content: "Conversa iniciada",
            type: 'private' as const,
            read: false,
            priority: 'medium' as const,
            parentMessageId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await db.insert(messages).values(virtualMessage);
        }
      } catch (conversationError) {
        console.error('Erro ao criar conversa automatica:', conversationError);
        // Nao falhar o envio da mensagem por causa disso
      }

      res.status(201).json({
        message: "Mensagem enviada com sucesso",
        messageData: newMessage
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Editar mensagem (apenas ate 5 minutos apos envio)
  app.put('/api/messages/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const user = req.user as any;

      if (!content) {
        return res.status(400).json({ message: "Conteudo e obrigatorio" });
      }

      // Buscar mensagem
      const message = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (message.length === 0) {
        return res.status(404).json({ message: "Mensagem nao encontrada" });
      }

      // Verificar se o usuario e o remetente
      if (message[0].senderId !== user.id) {
        return res.status(403).json({ message: "Apenas o remetente pode editar a mensagem" });
      }

      // Verificar se passou de 5 minutos
      const messageTime = new Date(message[0].createdAt);
      const currentTime = new Date();
      const timeDiff = (currentTime.getTime() - messageTime.getTime()) / (1000 * 60);

      if (timeDiff > 5) {
        return res.status(400).json({ message: "Nao e possivel editar mensagens apos 5 minutos" });
      }

      await db
        .update(messages)
        .set({
          content,
          updatedAt: new Date().toISOString()
        })
        .where(eq(messages.id, id));

      res.json({
        message: "Mensagem editada com sucesso",
        messageData: { ...message[0], content, updatedAt: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Erro ao editar mensagem:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir mensagem (apenas ate 5 minutos apos envio)
  app.delete('/api/messages/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      // Buscar mensagem
      const message = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (message.length === 0) {
        return res.status(404).json({ message: "Mensagem nao encontrada" });
      }

      // Verificar se o usuario e o remetente
      if (message[0].senderId !== user.id) {
        return res.status(403).json({ message: "Apenas o remetente pode excluir a mensagem" });
      }

      // Verificar se passou de 5 minutos
      const messageTime = new Date(message[0].createdAt);
      const currentTime = new Date();
      const timeDiff = (currentTime.getTime() - messageTime.getTime()) / (1000 * 60);

      if (timeDiff > 5) {
        return res.status(400).json({ message: "Nao e possivel excluir mensagens apos 5 minutos" });
      }

      await db.delete(messages).where(eq(messages.id, id));

      res.json({ message: "Mensagem excluida com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de arquivo de submissao (professores e alunos)
  app.get('/api/submissions/files/:fileId/download', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      // Buscar arquivo
      const file = await db
        .select()
        .from(submissionFiles)
        .where(eq(submissionFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      // Verificar se o usuario pode acessar este arquivo
      const submission = await db
        .select({ 
          activityId: activitySubmissions.activityId,
          studentId: activitySubmissions.studentId
        })
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, file[0].submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, submission[0].activityId))
        .limit(1);

      if (activity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      // Verificar permissA?es: professor da atividade ou aluno que fez a submissao
      const isTeacher = user.role === 'teacher' && activity[0].teacherId === user.id;
      const isStudent = user.role === 'student' && submission[0].studentId === user.id;

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Enviar arquivo
      const filePath = path.resolve(file[0].filePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${file[0].originalFileName}"`);
      res.setHeader('Content-Type', file[0].fileType);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Visualizar arquivo de submissao (professores e alunos)
  app.get('/api/submissions/files/:fileId/view', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      // Buscar arquivo
      const file = await db
        .select()
        .from(submissionFiles)
        .where(eq(submissionFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      // Verificar se o usuario pode acessar este arquivo
      const submission = await db
        .select({ 
          activityId: activitySubmissions.activityId,
          studentId: activitySubmissions.studentId
        })
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, file[0].submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, submission[0].activityId))
        .limit(1);

      if (activity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      // Verificar permissA?es: professor da atividade ou aluno que fez a submissao
      const isTeacher = user.role === 'teacher' && activity[0].teacherId === user.id;
      const isStudent = user.role === 'student' && submission[0].studentId === user.id;

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Permitir visualizacao de todos os tipos de arquivo

      // Enviar arquivo para visualizacao
      const filePath = path.resolve(file[0].filePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }

      // Definir Content-Type baseado na extensao do arquivo
      const fileExtension = path.extname(file[0].originalFileName).toLowerCase();
      let contentType = file[0].fileType;
      
      // Mapear extensA?es para Content-Types corretos
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };
      
      if (mimeTypes[fileExtension]) {
        contentType = mimeTypes[fileExtension];
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${file[0].originalFileName}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });


  // Download de todas as submissA?es como ZIP
  app.get('/api/activities/:id/submissions/download-all', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const user = req.user as any;

      // Verificar se o professor pode acessar esta atividade
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar submissA?es
      const submissions = await db
        .select({
          submission: activitySubmissions,
          student: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(eq(activitySubmissions.activityId, activityId));

      if (submissions.length === 0) {
        return res.status(404).json({ message: "Nenhuma submissao encontrada" });
      }

      const archiver = (await import('archiver')).default;
      const path = (await import('path')).default;
      const fs = (await import('fs')).default;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${activity[0].title}_submissoes.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('error', (err) => {
        console.error('Erro ao criar ZIP:', err);
        res.status(500).json({ message: "Erro ao criar arquivo ZIP" });
      });

      archive.pipe(res);

      // Adicionar submissA?es ao ZIP
      for (const item of submissions) {
        const studentName = `${item.student.firstName}_${item.student.lastName}`;
        const submissionFolder = `${studentName}/`;
        
        // Adicionar resposta em texto
        if (item.submission.comment) {
          archive.append(item.submission.comment, { 
            name: `${submissionFolder}resposta.txt` 
          });
        }

        // Buscar arquivos da submissao
        const files = await db
          .select()
          .from(submissionFiles)
          .where(eq(submissionFiles.submissionId, item.submission.id));

        // Adicionar arquivos
        for (const file of files) {
          const filePath = path.resolve(file.filePath);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { 
              name: `${submissionFolder}${file.originalFileName}` 
            });
          }
        }
      }

      archive.finalize();
    } catch (error) {
      console.error('Erro ao baixar submissA?es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Exportar notas como CSV
  app.get('/api/activities/:id/submissions/export-grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const user = req.user as any;

      // Verificar se o professor pode acessar esta atividade
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar submissA?es com notas
      const submissions = await db
        .select({
          submission: activitySubmissions,
          student: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(and(
          eq(activitySubmissions.activityId, activityId),
          eq(activitySubmissions.status, 'graded')
        ))
        .orderBy(asc(users.firstName), asc(users.lastName));

      if (submissions.length === 0) {
        return res.status(404).json({ message: "Nenhuma submissao avaliada encontrada" });
      }

      // Criar CSV
      let csv = 'Nome,Email,Nota Original,Penalidade por Atraso,Nota Final,Data de Submissao,Feedback\n';
      
      submissions.forEach(item => {
        const studentName = `${item.student.firstName} ${item.student.lastName}`;
        const email = item.student.email;
        const originalGrade = item.submission.grade || 0;
        const penalty = item.submission.latePenaltyApplied || 0;
        const finalGrade = item.submission.finalGrade || originalGrade;
        const submittedAt = new Date(item.submission.submittedAt).toLocaleDateString('pt-BR');
        const feedback = (item.submission.feedback || '').replace(/"/g, '""');
        
        csv += `"${studentName}","${email}",${originalGrade},${penalty},${finalGrade},"${submittedAt}","${feedback}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${activity[0].title}_notas.csv"`);
      res.send('\ufeff' + csv); // BOM para UTF-8
    } catch (error) {
      console.error('Erro ao exportar notas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE RECUPERA��O DE SENHA =====
  
  // Armazenar c�digos de verifica��o temporariamente (em produ��o, usar Redis)
  const verificationCodes = new Map<string, { code: string; expires: number; email: string }>();
  
  // Gerar c�digo de 6 d�gitos
  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  // Sistema extremamente avan�ado de envio de c�digos
  const sendSMS = async (phone: string, code: string, email?: string) => {
    const results = {
      sms: false,
      email: false,
      whatsapp: false,
      console: true
    };
    
    try {
      console.log(`?? SISTEMA AVAN�ADO DE ENVIO - C�digo: ${code}`);
      
      // Formatar n�mero para Brasil (+55)
      const formattedPhone = phone.startsWith('+55') ? phone : `+55${phone}`;
      
      // 1. TENTAR M�LTIPLAS APIs DE SMS
      const smsApis = [
        {
          name: 'SMSDev Brasil',
          url: 'https://api.smsdev.com.br/v1/send',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { number: formattedPhone, message: `SchoolManager: ${code}` }
        },
        {
          name: 'Z-API',
          url: 'https://api.z-api.io/instances/SEU_TOKEN/send-text',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { phone: formattedPhone, message: `C�digo: ${code}` }
        },
        {
          name: 'API SMS Gratuita',
          url: 'https://api.smsdev.com.br/v1/send',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { phone: formattedPhone, message: `C�digo SchoolManager: ${code}` }
        }
      ];
      
      for (const api of smsApis) {
        try {
          const response = await fetch(api.url, {
            method: api.method,
            headers: api.headers,
            body: JSON.stringify(api.body)
          });
          
          if (response.ok) {
            console.log(`? SMS enviado via ${api.name} para ${formattedPhone}`);
            results.sms = true;
            break;
          }
        } catch (error) {
          console.log(`?? ${api.name} falhou: ${error.message}`);
        }
      }
      
      // 2. TENTAR ENVIO POR EMAIL (se dispon�vel)
      if (email) {
        try {
          const emailResponse = await fetch('/api/auth/send-email-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, phone: formattedPhone })
          });
          
          if (emailResponse.ok) {
            console.log(`? Email enviado para ${email}`);
            results.email = true;
          }
        } catch (error) {
          console.log('?? Email n�o dispon�vel');
        }
      }
      
      // 3. TENTAR WHATSAPP BUSINESS API
      try {
        const whatsappResponse = await fetch('https://graph.facebook.com/v17.0/SEU_PHONE_ID/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer SEU_ACCESS_TOKEN'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: `?? *SchoolManager - Recupera��o de Senha*\n\nSeu c�digo: *${code}*\n\nV�lido por 10 minutos.` }
          })
        });
        
        if (whatsappResponse.ok) {
          console.log(`? WhatsApp Business enviado para ${formattedPhone}`);
          results.whatsapp = true;
        }
      } catch (error) {
        console.log('?? WhatsApp Business n�o dispon�vel');
      }
      
      // 4. FALLBACK: CONSOLE E WHATSAPP WEB
      console.log(`\n?? ===== C�DIGO DE VERIFICA��O =====`);
      console.log(`?? N�mero: ${formattedPhone}`);
      console.log(`?? C�digo: ${code}`);
      console.log(`? V�lido por: 10 minutos`);
      console.log(`=====================================\n`);
      
      // 5. GERAR LINK WHATSAPP WEB
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=??%20SchoolManager%20-%20Recupera��o%20de%20Senha%0A%0ASeu%20c�digo%20de%20verifica��o%20�:%20*${code}*%0A%0AV�lido%20por%2010%20minutos.`;
      console.log(`?? Link WhatsApp Web: ${whatsappUrl}`);
      
      return {
        success: true,
        results,
        whatsappUrl,
        code
      };
      
    } catch (error) {
      console.error('? Erro no sistema avan�ado:', error);
      console.log(`?? C�DIGO PARA TESTE: ${code}`);
      return {
        success: true,
        results: { console: true },
        whatsappUrl: `https://web.whatsapp.com/send?phone=+55${phone}&text=C�digo: ${code}`,
        code
      };
    }
  };

  // Solicitar recupera��o de senha
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'N�mero de telefone � obrigat�rio'
        });
      }

      console.log(`?? Solicita��o de recupera��o de senha para: ${phone}`);

      // Limpar formata��o do telefone para busca
      const cleanPhone = phone.replace(/\D/g, '');
      console.log(`?? Telefone limpo para busca: ${cleanPhone}`);

      // Buscar usu�rio pelo telefone (tentar tanto formatado quanto limpo)
      const userResult = await client.execute(`
        SELECT id, email, firstName, lastName, phone 
        FROM users 
        WHERE phone = ? OR phone = ? OR phone = ?
      `, [phone, cleanPhone, `+55${cleanPhone}`]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhum usu�rio encontrado com este n�mero de telefone'
        });
      }

      const user = userResult.rows[0];
      
      // Gerar c�digo de verifica��o
      const code = generateVerificationCode();
      const expires = Date.now() + (10 * 60 * 1000); // 10 minutos
      
      // Armazenar c�digo
      verificationCodes.set(phone, { code, expires, email: user.email });
      
      // Enviar SMS com sistema avan�ado
      // Enviar SMS com sistema DUPLO (SMSDev + Z-API)
      const { default: DualSmsService } = await import('./services/dualSmsService.mjs');
      const sendResult = await DualSmsService.sendCode(phone, code);
      
      console.log(`? C�digo de verifica��o gerado para ${phone}: ${code}`);
      
      res.json({
        success: true,
        message: 'C�digo enviado atrav�s de m�ltiplos canais!',
        email: user.email,
        whatsappUrl: sendResult.whatsappUrl,
        code: sendResult.code,
        results: sendResult.results
      });
      
    } catch (error) {
      console.error('? Erro na recupera��o de senha:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Verificar c�digo de verifica��o
  app.post('/api/auth/verify-code', async (req, res) => {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({
          success: false,
          message: 'Telefone e c�digo s�o obrigat�rios'
        });
      }

      console.log(`?? Verificando c�digo para ${phone}: ${code}`);

      const storedData = verificationCodes.get(phone);
      
      if (!storedData) {
        return res.status(400).json({
          success: false,
          message: 'C�digo n�o encontrado ou expirado'
        });
      }

      if (Date.now() > storedData.expires) {
        verificationCodes.delete(phone);
        return res.status(400).json({
          success: false,
          message: 'C�digo expirado'
        });
      }

      if (storedData.code !== code) {
        return res.status(400).json({
          success: false,
          message: 'C�digo inv�lido'
        });
      }

      console.log(`? C�digo verificado com sucesso para ${phone}`);
      
      res.json({
        success: true,
        message: 'C�digo verificado com sucesso'
      });
      
    } catch (error) {
      console.error('? Erro na verifica��o do c�digo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Redefinir senha
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { phone, newPassword } = req.body;
      
      if (!phone || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Telefone e nova senha s�o obrigat�rios'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'A senha deve ter pelo menos 6 caracteres'
        });
      }

      console.log(`?? Redefinindo senha para ${phone}`);

      // Verificar se o c�digo ainda � v�lido
      const storedData = verificationCodes.get(phone);
      
      if (!storedData || Date.now() > storedData.expires) {
        return res.status(400).json({
          success: false,
          message: 'C�digo expirado. Solicite um novo c�digo.'
        });
      }

      // Hash da nova senha
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Atualizar senha no banco
      await client.execute(`
        UPDATE users 
        SET password = ?, updatedAt = ?
        WHERE phone = ?
      `, [hashedPassword, new Date().toISOString(), phone]);
      
      // Remover c�digo usado
      verificationCodes.delete(phone);
      
      console.log(`? Senha redefinida com sucesso para ${phone}`);
      
      res.json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });
      
    } catch (error) {
      console.error('? Erro ao redefinir senha:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Rota para envio de c�digo por email (fallback)
  app.post('/api/auth/send-email-code', async (req, res) => {
    try {
      const { email, code, phone } = req.body;
      
      console.log(`?? Enviando c�digo por email para ${email}: ${code}`);
      
      // Simular envio de email (em produ��o, usar SendGrid, AWS SES, etc.)
      console.log(`\n?? ===== EMAIL DE RECUPERA��O =====`);
      console.log(`Para: ${email}`);
      console.log(`Assunto: SchoolManager - C�digo de Verifica��o`);
      console.log(`C�digo: ${code}`);
      console.log(`Telefone: ${phone}`);
      console.log(`V�lido por: 10 minutos`);
      console.log(`=====================================\n`);
      
      res.json({
        success: true,
        message: 'Email enviado com sucesso'
      });
      
    } catch (error) {
      console.error('? Erro ao enviar email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar email'
      });
    }
  });

  // ===== ROTAS DE NOTIFICA��ES EM TEMPO REAL =====
  
  // Buscar notifica��es do usu�rio
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      const notifications = await client.execute(`
        SELECT * FROM notifications 
        WHERE userId = ? 
        ORDER BY createdAt DESC 
        LIMIT 10
      `, [user.id]);
      
      res.json({
        success: true,
        data: notifications.rows
      });
    } catch (error) {
      console.error('? Erro ao buscar notifica��es:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });
  
  // Marcar notifica��o como lida
  app.put('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      await client.execute(`
        UPDATE notifications 
        SET isRead = 1, updatedAt = ?
        WHERE id = ? AND userId = ?
      `, [new Date().toISOString(), id, user.id]);
      
      res.json({
        success: true,
        message: 'Notifica��o marcada como lida'
      });
    } catch (error) {
      console.error('? Erro ao marcar notifica��o:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Buscar minha submissao (para alunos)
  app.get('/api/activities/:id/my-submission', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const user = req.user as any;

      // Buscar submissao do aluno
      const submission = await db
        .select()
        .from(activitySubmissions)
        .where(and(
          eq(activitySubmissions.activityId, activityId),
          eq(activitySubmissions.studentId, user.id)
        ))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      // Buscar arquivos da submissao
      const files = await db
        .select()
        .from(submissionFiles)
        .where(eq(submissionFiles.submissionId, submission[0].id));

      res.json({
        ...submission[0],
        files
      });
    } catch (error) {
      console.error('Erro ao buscar submissao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar historico de submissao
  app.get('/api/submissions/:id/history', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: submissionId } = req.params;
      const user = req.user as any;

      // Verificar se a submissao existe e se o professor pode acessa-la
      const submission = await db
        .select({ activityId: activitySubmissions.activityId })
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, submission[0].activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Por enquanto, retornar historico basico (pode ser expandido no futuro)
      // Em uma implementacao real, voce teria uma tabela submission_history
      const history = [
        {
          id: 'initial',
          submissionId: submissionId,
          action: 'submitted',
          performedBy: 'student',
          performedAt: new Date().toISOString(),
          details: 'Submissao inicial da atividade'
        }
      ];

      res.json(history);
    } catch (error) {
      console.error('Erro ao buscar historico:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ROTA DE TESTE PARA SUBMISSA?O - COMPLETAMENTE SEPARADA
  app.post('/api/test-submit', async (req, res) => {
    try {
      console.log('=== TESTE DE SUBMISSA?O ===');
      console.log('Body:', req.body);
      console.log('Content-Type:', req.get('Content-Type'));
      console.log('Method:', req.method);
      
      res.json({ 
        message: "Teste funcionando!", 
        body: req.body,
        contentType: req.get('Content-Type')
      });
    } catch (error) {
      console.error('Erro no teste:', error);
      res.status(500).json({ message: "Erro no teste" });
    }
  });

  // Buscar turmas do professor para criacao de atividades
  app.get('/api/classes', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const user = req.user as any;
      console.log('=== BUSCANDO TURMAS DO PROFESSOR ===');
      console.log('Teacher ID:', user.id);
      
      // Primeiro, verificar se existem vinculos
      const teacherLinks = await db
        .select()
        .from(classSubjects)
        .where(and(
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ));
      
      console.log("Vinculos encontrados para professor: " + teacherLinks.length);
      teacherLinks.forEach(link => {
        console.log("  - ClassId: " + link.classId + ", SubjectId: " + link.subjectId + ", Status: " + link.status);
      });
      
      const classesList = await db
        .select({
          id: classes.id,
          name: classes.name,
          grade: classes.grade,
          section: classes.section,
          academicYear: classes.academicYear
        })
        .from(classes)
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, classes.id),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ))
        .where(eq(classes.status, 'active'))
        .groupBy(classes.id)
        .orderBy(classes.name);
      
      console.log("Turmas encontradas para professor: " + classesList.length);
      classesList.forEach(cls => {
        console.log("  - " + cls.name + " (" + cls.id + ")");
      });
      
      console.log("Encontradas " + classesList.length + " turmas para o professor");
      classesList.forEach((c, index) => {
        console.log("  " + (index + 1) + ". " + c.name + " (" + c.id + ")");
      });
      
      res.json({ data: classesList });
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS ADMINISTRATIVOS =====
  
  // Dashboard administrativo - estatisticas gerais
  app.get('/api/admin/dashboard', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Dashboard administrativo solicitado por: " + user.firstName + " " + user.lastName);

      // Contar usuarios por funcao
      const usersByRole = await db
        .select({
          role: users.role,
          count: count()
        })
        .from(users)
        .where(eq(users.status, 'active'))
        .groupBy(users.role);

      // Contar turmas ativas
      const activeClasses = await db
        .select({ count: count() })
        .from(classes)
        .where(eq(classes.status, 'active'));

      // Contar disciplinas ativas
      const activeSubjects = await db
        .select({ count: count() })
        .from(subjects)
        .where(eq(subjects.status, 'active'));

      // Usuarios recentes (ultimos 5)
      const recentUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          status: users.status,
          phone: users.phone,
          address: users.address,
          registrationNumber: users.registrationNumber,
          createdAt: users.createdAt
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(5);

      const stats = {
        totalUsers: usersByRole.reduce((sum, item) => sum + item.count, 0),
        totalClasses: activeClasses[0]?.count || 0,
        totalSubjects: activeSubjects[0]?.count || 0,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item.count;
          return acc;
        }, {} as Record<string, number>),
        recentUsers
      };

      console.log('?? Estatisticas do dashboard:', stats);
      res.json({ data: stats });
    } catch (error) {
      console.error('Erro ao buscar estatisticas do dashboard:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar todos os usuarios (admin)
  app.get('/api/admin/users', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Listagem de usuarios solicitada por: " + user.firstName + " " + user.lastName);

      // Usar SQL direto para listar usu�rios
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      let allUsers = [];
      try {
        const selectSql = `
          SELECT id, firstName, lastName, email, role, status, phone, address, registrationNumber, createdAt, updatedAt
          FROM users 
          WHERE status != 'inactive'
          ORDER BY createdAt DESC
        `;
        
        allUsers = sqliteDb.prepare(selectSql).all();
        console.log(`?? ${allUsers.length} usu�rios encontrados`);
      } finally {
        sqliteDb.close();
      }

      // Para alunos, buscar informa��es de turma usando SQL direto
      const usersWithDetails = await Promise.all(
        allUsers.map(async (userItem) => {
          if (userItem.role === 'student') {
            const Database = (await import('better-sqlite3')).default;
            const path = (await import('path')).default;
            const dbPath = path.join(__dirname, 'school.db');
            const sqliteDb = new Database(dbPath);
            
            let studentClassData = [];
            try {
              const selectClassSql = `
                SELECT 
                  sc.classId,
                  c.name as className,
                  c.grade as classGrade,
                  c.section as classSection,
                  sc.enrollmentDate
                FROM studentClass sc
                INNER JOIN classes c ON sc.classId = c.id
                WHERE sc.studentId = ? AND sc.status = 'active'
                LIMIT 1
              `;
              
              studentClassData = sqliteDb.prepare(selectClassSql).all(userItem.id);
            } finally {
              sqliteDb.close();
            }

            return {
              ...userItem,
              classInfo: studentClassData.length > 0 ? studentClassData[0] : null
            };
          }
          return userItem;
        })
      );

      console.log("? Encontrados " + usersWithDetails.length + " usuarios com detalhes");
      res.json({ data: usersWithDetails });
    } catch (error) {
      console.error('Erro ao buscar usuarios:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar novo usuario (admin)
  app.post('/api/admin/users', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { firstName, lastName, email, role, phone, address, registrationNumber, classId } = req.body;

      console.log("Criacao de usuario solicitada por: " + user.firstName + " " + user.lastName);
      console.log('?? Dados do novo usuario:', { firstName, lastName, email, role, classId });

      // ValidacA?es basicas
      if (!firstName || firstName.trim() === '') {
        return res.status(400).json({ message: "Nome e obrigatorio" });
      }
      
      if (!lastName || lastName.trim() === '') {
        return res.status(400).json({ message: "Sobrenome e obrigatorio" });
      }
      
      if (!role || !['student', 'teacher', 'coordinator', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Funcao invalida. Use: student, teacher, coordinator ou admin" });
      }

      // Gerar email padrao sempre com @escola.com (ser� usado apenas na resposta)
      let finalEmail;
      if (email && email !== '' && email.endsWith('@escola.com')) {
        // Email completo ja fornecido
        finalEmail = email;
      } else if (email && email !== '') {
        // Email parcial fornecido - usar apenas a parte antes do @ (se houver)
        const emailPart = email.split('@')[0];
        // Limpar caracteres especiais e espacos
        const cleanEmailPart = emailPart.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
        finalEmail = `${cleanEmailPart}@escola.com`;
      } else {
        // Gerar email automatico
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        finalEmail = `${cleanFirstName}.${cleanLastName}@escola.com`;
      }
      
      // N�o verificar email duplicado pois email ser� null inicialmente
      // A verifica��o ser� feita quando o diretor aprovar o usu�rio

      // Gerar numero de matricula aleatorio e unico
      let finalRegistrationNumber;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        // Gerar matricula aleatoria com 6 digitos
        const randomNumber = Math.floor(Math.random() * 900000) + 100000; // 100000 a 999999
        finalRegistrationNumber = randomNumber.toString();
        
        // Verificar se ja existe
        const existingRegistration = await db
          .select()
          .from(users)
          .where(eq(users.registrationNumber, finalRegistrationNumber))
          .limit(1);
        
        if (existingRegistration.length === 0) {
          break; // Matricula unica encontrada
        }
        
        attempts++;
      } while (attempts < maxAttempts);
      
      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Erro ao gerar matricula unica. Tente novamente." });
      }

      // Criar usu�rio com status 'pending' (sem email e senha ainda)
      const newUser = {
        id: uuidv4(),
        firstName,
        lastName,
        email: null, // N�o criar email ainda
        password: null, // N�o criar senha ainda
        role,
        status: 'pending' as const,
        phone: phone || null,
        address: address || null,
        registrationNumber: finalRegistrationNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Usar SQL direto com better-sqlite3 para evitar problemas com Drizzle ORM
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      try {
        const insertSql = `
          INSERT INTO users (
            id, email, password, firstName, lastName, profileImageUrl,
            role, status, lastSeen, phone, address, registrationNumber,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const stmt = sqliteDb.prepare(insertSql);
        stmt.run(
          newUser.id,
          newUser.email,
          newUser.password,
          newUser.firstName,
          newUser.lastName,
          null, // profileImageUrl
          newUser.role,
          newUser.status,
          null, // lastSeen
          newUser.phone,
          newUser.address,
          newUser.registrationNumber,
          newUser.createdAt,
          newUser.updatedAt
        );
        
        console.log("? Usu�rio criado com status 'pending': " + newUser.id);
      } finally {
        sqliteDb.close();
      }

      // Se for aluno, matricular na turma
      if (role === 'student' && classId) {
        const enrollment = {
          id: uuidv4(),
          studentId: newUser.id,
          classId: classId,
          enrollmentDate: new Date().toISOString(),
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Usar SQL direto para matricular aluno
        const Database = (await import('better-sqlite3')).default;
        const path = (await import('path')).default;
        const dbPath = path.join(__dirname, 'school.db');
        const sqliteDb = new Database(dbPath);
        
        try {
          const insertEnrollmentSql = `
            INSERT INTO studentClass (
              id, studentId, classId, enrollmentDate, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          
          const stmt = sqliteDb.prepare(insertEnrollmentSql);
          stmt.run(
            enrollment.id,
            enrollment.studentId,
            enrollment.classId,
            enrollment.enrollmentDate,
            enrollment.status,
            enrollment.createdAt,
            enrollment.updatedAt
          );
        } finally {
          sqliteDb.close();
        }
        console.log("? Aluno matriculado na turma: " + classId);
      }

      console.log("? Usu�rio criado com status 'pending': " + newUser.id);
      console.log("?? Nome: " + firstName + " " + lastName);
      console.log("?? Fun��o: " + role);
      console.log("?? Matr�cula: " + finalRegistrationNumber);
      console.log("? Aguardando aprova��o do diretor para ativar login");
      
      res.status(201).json({ 
        message: "Usu�rio criado com sucesso",
        data: { 
          id: newUser.id,
          email: finalEmail,
          registrationNumber: finalRegistrationNumber,
          status: 'pending',
          message: 'Aguardando aprova��o do diretor para ativar login'
        }
      });
    } catch (error) {
      console.error('Erro ao criar usuario:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar usuario (admin)
  app.put('/api/admin/users/:userId', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { userId } = req.params;
      const { firstName, lastName, email, role, phone, address, registrationNumber, status, password } = req.body;

      console.log("Atualizacao de usuario " + userId + " solicitada por: " + user.firstName + " " + user.lastName);
      console.log('?? Dados recebidos:', { firstName, lastName, email, role, phone, address, registrationNumber, status, password: password ? '[FORNECIDA]' : '[NA?O FORNECIDA]' });

      // Verificar se usuario existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }

      console.log('?? Usuario existente:', {
        id: existingUser[0].id,
        email: existingUser[0].email,
        firstName: existingUser[0].firstName,
        lastName: existingUser[0].lastName,
        registrationNumber: existingUser[0].registrationNumber,
        role: existingUser[0].role,
        status: existingUser[0].status
      });

      // Verificar se email ja existe em outro usuario
      if (email && email !== existingUser[0].email) {
        const emailExists = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), ne(users.id, userId)))
          .limit(1);

        if (emailExists.length > 0) {
          return res.status(400).json({ message: "Email ja esta em uso" });
        }
      }

      // Verificar se matricula ja existe em outro usuario
      if (registrationNumber && registrationNumber !== '' && registrationNumber !== existingUser[0].registrationNumber) {
        const registrationExists = await db
          .select()
          .from(users)
          .where(and(eq(users.registrationNumber, registrationNumber), ne(users.id, userId)))
          .limit(1);

        if (registrationExists.length > 0) {
          return res.status(400).json({ message: "Numero de matricula ja esta em uso" });
        }
      }

      // Preparar dados para atualizacao - NUNCA incluir campos obrigatorios que nao foram fornecidos
      const updateData: any = {
        updatedAt: new Date().toISOString()
      };

      // Adicionar apenas campos fornecidos e que nao sao obrigatorios ou que foram explicitamente fornecidos
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) {
        // Adicionar @escola.com automaticamente se n�o estiver presente
        const finalEmail = email.includes('@') ? email : `${email}@escola.com`;
        updateData.email = finalEmail;
      }
      if (role !== undefined) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone || null;
      if (address !== undefined) updateData.address = address || null;
      if (status !== undefined) updateData.status = status;
      
      // Para registrationNumber (campo obrigatorio), so incluir se foi explicitamente fornecido
      if (registrationNumber !== undefined && registrationNumber !== null && registrationNumber !== '') {
        updateData.registrationNumber = registrationNumber;
      }
      // IMPORTANTE: Se registrationNumber nao foi fornecido, NA?O incluir no updateData

      // Atualizar senha se fornecida
      if (password) {
        const bcrypt = await import('bcryptjs');
        updateData.password = await bcrypt.hash(password, 10);
      }

      console.log('?? Dados que serao atualizados:', updateData);

      // Usar o metodo correto do Drizzle ORM para atualizacao
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      console.log("? Usuario " + userId + " atualizado com sucesso");
      res.json({ message: "Usuario atualizado com sucesso" });
    } catch (error) {
      console.error('? Erro detalhado ao atualizar usuario:', error);
      console.error('? Stack trace:', error.stack);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir usuario (admin)
  app.delete('/api/admin/users/:userId', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { userId } = req.params;
      const { password, confirmText } = req.body;

      console.log("Exclusao de usuario " + userId + " solicitada por: " + user.firstName + " " + user.lastName);

      // Verificar senha de confirmacao
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirmacao incorreta" });
      }

      // Se confirmText foi fornecido, deve ser "confirmar"
      if (confirmText && confirmText !== 'confirmar') {
        return res.status(400).json({ message: "Digite 'confirmar' para prosseguir com a exclus�o" });
      }

      // Verificar se usuario existe usando SQL direto
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      let existingUser = null;
      try {
        const selectSql = 'SELECT * FROM users WHERE id = ? LIMIT 1';
        existingUser = sqliteDb.prepare(selectSql).get(userId);
      } finally {
        sqliteDb.close();
      }

      if (!existingUser) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }

      // Nao permitir exclusao do proprio usuario
      if (userId === user.id) {
        return res.status(400).json({ message: "Nao e possivel excluir seu proprio usuario" });
      }

      const userToDelete = existingUser;
      console.log("Usu?rio a ser deletado: " + userToDelete.firstName + " " + userToDelete.lastName + " (" + userToDelete.role + ")");

      // DESABILITAR FOREIGN KEY CONSTRAINTS TEMPORARIAMENTE usando SQL direto
      const sqliteDb2 = new Database(dbPath);
      try {
        sqliteDb2.prepare('PRAGMA foreign_keys = OFF').run();
        console.log("[UNLOCK] Foreign key constraints desabilitadas");
      } finally {
        sqliteDb2.close();
      }

      try {
        // Deletar v?nculos primeiro (em ordem de depend?ncia) usando SQL direto
        console.log("?? Removendo v?nculos do usu?rio " + userId + "...");
        
        const sqliteDb3 = new Database(dbPath);
        try {
          // 1. Remover disciplinas onde o usu?rio ? professor (campo n�o existe)
          console.log("[INFO] Campo teacherId n�o existe na tabela subjects, pulando...");
          
          // 2. Remover v?nculos de disciplinas com professores
          const deleteClassSubjectsSql = 'DELETE FROM classSubjects WHERE teacherId = ?';
          const result2 = sqliteDb3.prepare(deleteClassSubjectsSql).run(userId);
          console.log("[OK] V?nculos classSubjects removidos:", result2.changes, "linhas afetadas");
          
          // 3. Remover matr?culas de alunos
          const deleteStudentClassSql = 'DELETE FROM studentClass WHERE studentId = ?';
          const result3 = sqliteDb3.prepare(deleteStudentClassSql).run(userId);
          console.log("[OK] Matr?culas de alunos removidas:", result3.changes, "linhas afetadas");
          
          // 4. Remover notas onde o usu?rio ? aluno (tabela n�o existe)
          console.log("[INFO] Tabela grades n�o existe, pulando...");
          
          // 5. Remover notas atribu?das pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela grades n�o existe, pulando...");
          
          // 6. Remover presen?as do aluno (tabela n�o existe)
          console.log("[INFO] Tabela attendance n�o existe, pulando...");
          
          // 7. Remover eventos criados pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela events n�o existe, pulando...");
          
          // 8. Remover notifica??es enviadas pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela notifications n�o existe, pulando...");
          
          // 9. Remover notifica??es recebidas pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela notifications n�o existe, pulando...");
          
          // 10. Remover configura??es atualizadas pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela settings n�o existe, pulando...");
          
          // 11. Remover atividades criadas pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela activities n�o existe, pulando...");
          
          // 12. Remover arquivos de atividades enviados pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela activityFiles n�o existe, pulando...");
          
          // 13. Remover submiss?es do aluno (tabela n�o existe)
          console.log("[INFO] Tabela activitySubmissions n�o existe, pulando...");
          
          // 14. Remover submiss?es avaliadas pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela activitySubmissions n�o existe, pulando...");
          
          // 15. Remover hist?rico de submiss?es do usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela submissionHistory n�o existe, pulando...");
          
          // 16. Remover avalia??es de rubricas do usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela rubricEvaluations n�o existe, pulando...");
          
          // 17. Remover mensagens enviadas pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela messages n�o existe, pulando...");
          
          // 18. Remover mensagens recebidas pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela messages n�o existe, pulando...");
          
          // 19. Remover relat?rios gerados pelo usu?rio (tabela n�o existe)
          console.log("[INFO] Tabela reports n�o existe, pulando...");
          
          // 20. Remover materiais criados pelo usu?rio (se a tabela existir)
          try {
            const deleteMaterialsSql = 'DELETE FROM materials WHERE teacherId = ?';
            const result20 = sqliteDb3.prepare(deleteMaterialsSql).run(userId);
            console.log("[OK] Materiais do usu?rio removidos:", result20.changes, "linhas afetadas");
          } catch (e) {
            console.log("[INFO] Tabela materials n?o existe, pulando...");
          }
          
          // 21. Remover arquivos de materiais enviados pelo usu?rio (se a tabela existir)
          try {
            const deleteMaterialFilesSql = 'DELETE FROM materialFiles WHERE uploadedBy = ?';
            const result21 = sqliteDb3.prepare(deleteMaterialFilesSql).run(userId);
            console.log("[OK] Arquivos de materiais do usu?rio removidos:", result21.changes, "linhas afetadas");
          } catch (e) {
            console.log("[INFO] Tabela materialFiles n?o existe, pulando...");
          }
          
          // 22. Remover logs do sistema do usu?rio
          const deleteSystemLogsSql = 'DELETE FROM systemLogs WHERE userId = ?';
          const result22 = sqliteDb3.prepare(deleteSystemLogsSql).run(userId);
          console.log("[OK] Logs do sistema do usu?rio removidos:", result22.changes, "linhas afetadas");
          
          // 23. Deletar usu?rio permanentemente usando SQL direto
          const deleteUserSql = 'DELETE FROM users WHERE id = ?';
          const result23 = sqliteDb3.prepare(deleteUserSql).run(userId);
          console.log("[OK] Usuario " + userId + " deletado permanentemente:", result23.changes, "linhas afetadas");
          
          // REABILITAR FOREIGN KEY CONSTRAINTS usando SQL direto
          sqliteDb3.prepare('PRAGMA foreign_keys = ON').run();
          console.log("?? Foreign key constraints reabilitadas");
          
        } finally {
          sqliteDb3.close();
        }
        
        res.json({ message: "Usuario excluido com sucesso" });
      } catch (deleteError) {
        // REABILITAR FOREIGN KEY CONSTRAINTS EM CASO DE ERRO usando SQL direto
        const sqliteDb4 = new Database(dbPath);
        try {
          sqliteDb4.prepare('PRAGMA foreign_keys = ON').run();
          console.log("?? Foreign key constraints reabilitadas ap?s erro");
        } finally {
          sqliteDb4.close();
        }
        throw deleteError;
      }
    } catch (error) {
      console.error('Erro ao excluir usuario:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir professor (admin)
  app.delete('/api/admin/teachers/:teacherId', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { teacherId } = req.params;
      const { password } = req.body;

      console.log("Exclusao de professor " + teacherId + " solicitada por: " + user.firstName + " " + user.lastName);

      // Verificar senha de confirmacao
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirmacao incorreta" });
      }

      // Verificar se professor existe usando SQL direto
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      let existingTeacher = null;
      try {
        const selectSql = 'SELECT * FROM users WHERE id = ? AND role = ? LIMIT 1';
        existingTeacher = sqliteDb.prepare(selectSql).get(teacherId, 'teacher');
      } finally {
        sqliteDb.close();
      }

      if (!existingTeacher) {
        return res.status(404).json({ message: "Professor nao encontrado" });
      }

      const teacherToDelete = existingTeacher;
      console.log("Professor a ser deletado: " + teacherToDelete.firstName + " " + teacherToDelete.lastName);

      // Usar SQL direto para deletar professor
      console.log("??? Removendo v�nculos do professor " + teacherId + "...");
      
      // Desabilitar foreign keys usando SQL direto
      const sqliteDb2 = new Database(dbPath);
      try {
        sqliteDb2.prepare('PRAGMA foreign_keys = OFF').run();
        console.log("[UNLOCK] Foreign key constraints desabilitadas");
      } finally {
        sqliteDb2.close();
      }
      
      try {
        const sqliteDb3 = new Database(dbPath);
        try {
          // 1. Remover v�nculos classSubjects
          const deleteClassSubjectsSql = 'DELETE FROM classSubjects WHERE teacherId = ?';
          const result1 = sqliteDb3.prepare(deleteClassSubjectsSql).run(teacherId);
          console.log("[OK] V�nculos classSubjects removidos:", result1.changes, "linhas afetadas");
          
          // 2. Remover atividades criadas pelo professor (tabela n�o existe)
          console.log("[INFO] Tabela activities n�o existe, pulando...");
          
          // 3. Remover provas criadas pelo professor (tabela n�o existe)
          console.log("[INFO] Tabela exams n�o existe, pulando...");
          
          // 4. Remover notas do professor (tabela n�o existe)
          console.log("[INFO] Tabela examGrades n�o existe, pulando...");
          
          // 5. Remover presen�as registradas pelo professor (campo n�o existe)
          console.log("[INFO] Campo recordedBy n�o existe na tabela attendance, pulando...");
          
          // 6. Remover eventos criados pelo professor (tabela n�o existe)
          console.log("[INFO] Tabela events n�o existe, pulando...");
          
          // 7. Remover materiais criados pelo professor
          try {
            const deleteMaterialsSql = 'DELETE FROM materials WHERE teacherId = ?';
            const result7 = sqliteDb3.prepare(deleteMaterialsSql).run(teacherId);
            console.log("[OK] Materiais do professor removidos:", result7.changes, "linhas afetadas");
          } catch (e) {
            console.log("[INFO] Tabela materials n�o existe, pulando...");
          }
          
          // 8. Remover o professor
          const deleteTeacherSql = 'DELETE FROM users WHERE id = ?';
          const result8 = sqliteDb3.prepare(deleteTeacherSql).run(teacherId);
          console.log("[OK] Professor removido:", result8.changes, "linhas afetadas");
          
          // Reabilitar foreign keys
          sqliteDb3.prepare('PRAGMA foreign_keys = ON').run();
          
        } finally {
          sqliteDb3.close();
        }
        
        console.log("? Professor deletado com sucesso!");
        res.json({ message: "Professor deletado com sucesso" });
        
      } catch (error) {
        console.error("? Erro ao deletar professor:", error);
        const sqliteDb4 = new Database(dbPath);
        try {
          sqliteDb4.prepare('PRAGMA foreign_keys = ON').run();
        } finally {
          sqliteDb4.close();
        }
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    } catch (error) {
      console.error('Erro ao excluir professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS PARA TURMAS =====
  
  // Deletar turma (admin)
  app.delete('/api/classes/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const { password, confirmText } = req.body;
      
      console.log("Exclusao de turma " + id + " solicitada por: " + user.firstName + " " + user.lastName);

      // Verificar senha de confirmacao
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirmacao incorreta" });
      }

      // Se confirmText foi fornecido, deve ser "confirmar"
      if (confirmText && confirmText !== 'confirmar') {
        return res.status(400).json({ message: "Digite 'confirmar' para prosseguir com a exclus�o" });
      }

      // Verificar se a turma existe
      const existingClass = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (existingClass.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }

      // Deletar vinculos primeiro (em ordem de depend?ncia)
      console.log("?? Removendo v?nculos da turma " + id + "...");
      
      // 1. Remover v?nculos de disciplinas com turmas
      await db.delete(classSubjects).where(eq(classSubjects.classId, id));
      console.log("[OK] V?nculos classSubjects removidos");
      
      // 2. Remover matr?culas de alunos
      await db.delete(studentClass).where(eq(studentClass.classId, id));
      console.log("[OK] Matr?culas de alunos removidas");
      
      // 3. Remover atividades relacionadas ? turma (se existir)
      try {
        await db.delete(activities).where(eq(activities.classId, id));
        console.log("[OK] Atividades da turma removidas");
      } catch (e) {
        console.log("[INFO] Nenhuma atividade encontrada para a turma");
      }
      
      // 4. Remover notas relacionadas ? turma (se existir)
      try {
        await db.delete(grades).where(eq(grades.classId, id));
        console.log("[OK] Notas da turma removidas");
      } catch (e) {
        console.log("[INFO] Nenhuma nota encontrada para a turma");
      }

      // 5. Desabilitar temporariamente as constraints de FOREIGN KEY
      console.log("[INFO] Desabilitando constraints de FOREIGN KEY temporariamente...");
      await db.run(sql`PRAGMA foreign_keys = OFF`);

      // 6. Deletar turma permanentemente
      await db.delete(classes).where(eq(classes.id, id));

      // 7. Reabilitar as constraints de FOREIGN KEY
      await db.run(sql`PRAGMA foreign_keys = ON`);
      console.log("[INFO] Constraints de FOREIGN KEY reabilitadas");

      console.log("? Turma " + id + " deletada permanentemente");
      res.json({ message: "Turma excluida com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS PARA COORDENADOR GERENCIAR ALUNOS =====
  
  // GET /api/coordinator/students - Listar todos os alunos para o coordenador
  app.get('/api/coordinator/students', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Listagem de alunos solicitada por coordenador: " + user.firstName + " " + user.lastName);

      // Buscar todos os alunos com suas informa��es de turma
      const studentsData = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          status: users.status,
          phone: users.phone,
          address: users.address,
          registrationNumber: users.registrationNumber,
          createdAt: users.createdAt,
          classId: studentClass.classId,
          className: classes.name,
          classGrade: classes.grade,
          classSection: classes.section,
          enrollmentDate: studentClass.enrollmentDate
        })
        .from(users)
        .leftJoin(studentClass, eq(users.id, studentClass.studentId))
        .leftJoin(classes, eq(studentClass.classId, classes.id))
        .where(eq(users.role, 'student'))
        .orderBy(users.firstName);

      // Agrupar dados por aluno
      const studentsMap = new Map();
      
      studentsData.forEach(row => {
        if (!studentsMap.has(row.id)) {
          studentsMap.set(row.id, {
            id: row.id,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            status: row.status,
            phone: row.phone,
            address: row.address,
            registrationNumber: row.registrationNumber,
            createdAt: row.createdAt,
            classInfo: null,
            attendanceStats: null,
            gradeStats: null
          });
        }
        
        // Adicionar informa��o da turma se existir
        if (row.classId && !studentsMap.get(row.id).classInfo) {
          studentsMap.get(row.id).classInfo = {
            id: row.classId,
            name: row.className,
            grade: row.classGrade,
            section: row.classSection,
            enrollmentDate: row.enrollmentDate
          };
        }
      });

      const students = Array.from(studentsMap.values());

      // Para cada aluno, calcular estat�sticas de frequ�ncia e notas
      const studentsWithStats = await Promise.all(
        students.map(async (student) => {
          // Calcular estat�sticas de frequ�ncia
          const attendanceData = await db
            .select({
              status: attendance.status,
              date: attendance.date,
              createdAt: attendance.createdAt
            })
            .from(attendance)
            .where(eq(attendance.studentId, student.id));

          const totalClasses = attendanceData.length;
          const presentCount = attendanceData.filter(att => att.status === 'present').length;
          const absentCount = totalClasses - presentCount;
          const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;
          
          // �ltima data de registro de presen�a (ordenar por data da aula, n�o por cria��o)
          const lastAttendanceDate = totalClasses > 0 ? 
            attendanceData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : null;

          student.attendanceStats = {
            totalClasses,
            presentCount,
            absentCount,
            attendanceRate,
            lastAttendanceDate
          };

          // Calcular estat�sticas de notas
          const gradesData = await db
            .select({
              grade: grades.grade,
              createdAt: grades.createdAt
            })
            .from(grades)
            .where(eq(grades.studentId, student.id));

          const totalGrades = gradesData.length;
          const averageGrade = totalGrades > 0 ? 
            gradesData.reduce((sum, g) => sum + (g.grade || 0), 0) / totalGrades : 0;
          const lastGradeDate = totalGrades > 0 ? 
            gradesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt : null;

          student.gradeStats = {
            averageGrade,
            totalGrades,
            lastGradeDate
          };

          return student;
        })
      );

      console.log("? Encontrados " + studentsWithStats.length + " alunos com estat�sticas");
      res.json({ 
        success: true,
        data: studentsWithStats 
      });

    } catch (error) {
      console.error('? Erro ao buscar alunos:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });


  // ===== ENDPOINTS PARA DETALHES DE USU�RIOS =====
  
  // GET /api/admin/users/check-email - Verificar se email j� existe
  app.get('/api/admin/users/check-email', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { email } = req.query;
      const user = req.user;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email � obrigat�rio" });
      }

      // Processar email da mesma forma que na cria��o
      let finalEmail;
      if (email.includes('@')) {
        finalEmail = email;
      } else {
        finalEmail = `${email}@escola.com`;
      }

      console.log("Verificando email " + finalEmail + " por: " + user.firstName + " " + user.lastName);

      const existingUser = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.email, finalEmail))
        .limit(1);

      res.json({
        exists: existingUser.length > 0,
        email: finalEmail,
        user: existingUser.length > 0 ? existingUser[0] : null
      });
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // GET /api/admin/classes/:id/details - Detalhes completos da turma
  app.get('/api/admin/classes/:id/details', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      console.log("Detalhes da turma " + id + " solicitados por: " + user.firstName + " " + user.lastName);

      // Buscar informa��es b�sicas da turma
      const classData = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (classData.length === 0) {
        return res.status(404).json({ message: "Turma n�o encontrada" });
      }

      // Buscar alunos da turma
      const students = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          registrationNumber: users.registrationNumber,
          status: users.status,
          enrollmentDate: studentClass.enrollmentDate
        })
        .from(studentClass)
        .innerJoin(users, eq(studentClass.studentId, users.id))
        .where(and(
          eq(studentClass.classId, id),
          eq(studentClass.status, 'active')
        ))
        .orderBy(users.firstName, users.lastName);

      // Buscar disciplinas e professores da turma
      const subjectsData = await db
        .select({
          subjectId: classSubjects.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          teacherId: classSubjects.teacherId,
          teacherFirstName: users.firstName,
          teacherLastName: users.lastName,
          teacherEmail: users.email,
          teacherStatus: users.status
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .leftJoin(users, eq(classSubjects.teacherId, users.id))
        .where(and(
          eq(classSubjects.classId, id),
          eq(classSubjects.status, 'active')
        ))
        .orderBy(subjects.name);

      // Buscar todos os professores �nicos que lecionam nesta turma
      const uniqueTeachers = subjectsData
        .filter(subject => subject.teacherId)
        .reduce((acc, subject) => {
          if (!acc.find(t => t.id === subject.teacherId)) {
            acc.push({
              id: subject.teacherId,
              firstName: subject.teacherFirstName,
              lastName: subject.teacherLastName,
              email: subject.teacherEmail,
              status: subject.teacherStatus
            });
          }
          return acc;
        }, [] as any[]);

      res.json({
        class: classData[0],
        students: students,
        subjects: subjectsData,
        teachers: uniqueTeachers,
        stats: {
          totalStudents: students.length,
          totalSubjects: subjectsData.length,
          totalTeachers: uniqueTeachers.length
        }
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // GET /api/admin/students/:id/details - Detalhes do aluno com turma
  app.get('/api/admin/students/:id/details', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      console.log("Detalhes do aluno " + id + " solicitados por: " + user.firstName + " " + user.lastName);

      // Buscar informa��es b�sicas do aluno
      const student = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.role, 'student')))
        .limit(1);

      if (student.length === 0) {
        return res.status(404).json({ message: "Aluno n�o encontrado" });
      }

      // Buscar turma do aluno
      const studentClassData = await db
        .select({
          classId: studentClass.classId,
          className: classes.name,
          classGrade: classes.grade,
          classSection: classes.section,
          enrollmentDate: studentClass.enrollmentDate,
          status: studentClass.status
        })
        .from(studentClass)
        .innerJoin(classes, eq(studentClass.classId, classes.id))
        .where(and(
          eq(studentClass.studentId, id),
          eq(studentClass.status, 'active')
        ))
        .limit(1);

      res.json({
        student: student[0],
        class: studentClassData.length > 0 ? studentClassData[0] : null
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS PARA VERIFICA��O DE DEPEND�NCIAS =====
  
  // GET /api/users/:id/dependencies - Verificar depend�ncias de usu�rio
  app.get('/api/users/:id/dependencies', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      console.log("Verificando depend�ncias do usu�rio " + id + " por: " + user.firstName + " " + user.lastName);

      // Verificar se o usu�rio existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Usu�rio n�o encontrado" });
      }

      const userData = existingUser[0];
      let dependencies = {};

      if (userData.role === 'student') {
        // Depend�ncias de aluno
        const enrollmentsCount = await db
          .select({ count: count() })
          .from(studentClass)
          .where(eq(studentClass.studentId, id));

        const gradesCount = await db
          .select({ count: count() })
          .from(grades)
          .where(eq(grades.studentId, id));

        const attendanceCount = await db
          .select({ count: count() })
          .from(attendance)
          .where(eq(attendance.studentId, id));

        dependencies = {
          enrollments: enrollmentsCount[0]?.count || 0,
          grades: gradesCount[0]?.count || 0,
          attendance: attendanceCount[0]?.count || 0
        };
      } else if (userData.role === 'teacher') {
        // Depend�ncias de professor
        const classSubjectsCount = await db
          .select({ count: count() })
          .from(classSubjects)
          .where(eq(classSubjects.teacherId, id));

        const activitiesCount = await db
          .select({ count: count() })
          .from(activities)
          .where(eq(activities.teacherId, id));

        const examsCount = await db
          .select({ count: count() })
          .from(exams)
          .where(eq(exams.teacherId, id));

        const materialsCount = await db
          .select({ count: count() })
          .from(materials)
          .where(eq(materials.teacherId, id));

        dependencies = {
          classSubjects: classSubjectsCount[0]?.count || 0,
          activities: activitiesCount[0]?.count || 0,
          exams: examsCount[0]?.count || 0,
          materials: materialsCount[0]?.count || 0
        };
      } else if (userData.role === 'coordinator') {
        // Coordenador sempre tem confirma��o especial
        dependencies = {
          isCoordinator: true
        };
      }

      const totalDependencies = Object.values(dependencies).reduce((sum, count) => {
        if (typeof count === 'number') return sum + count;
        return sum;
      }, 0);

      res.json({
        hasDependencies: totalDependencies > 0 || dependencies.isCoordinator,
        dependencies,
        totalDependencies,
        userRole: userData.role
      });

    } catch (error) {
      console.error('Erro ao verificar depend�ncias do usu�rio:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/classes/:id/dependencies - Verificar depend�ncias de turma
  app.get('/api/classes/:id/dependencies', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      console.log("Verificando depend�ncias da turma " + id + " por: " + user.firstName + " " + user.lastName);

      // Verificar se a turma existe
      const existingClass = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (existingClass.length === 0) {
        return res.status(404).json({ message: "Turma n�o encontrada" });
      }

      // Verificar v�nculos
      const studentsCount = await db
        .select({ count: count() })
        .from(studentClass)
        .where(eq(studentClass.classId, id));

      const subjectsCount = await db
        .select({ count: count() })
        .from(classSubjects)
        .where(eq(classSubjects.classId, id));

      const activitiesCount = await db
        .select({ count: count() })
        .from(activities)
        .where(eq(activities.classId, id));

      const examsCount = await db
        .select({ count: count() })
        .from(exams)
        .where(eq(exams.classId, id));

      const dependencies = {
        students: studentsCount[0]?.count || 0,
        subjects: subjectsCount[0]?.count || 0,
        activities: activitiesCount[0]?.count || 0,
        exams: examsCount[0]?.count || 0
      };

      const totalDependencies = Object.values(dependencies).reduce((sum, count) => sum + count, 0);

      res.json({
        hasDependencies: totalDependencies > 0,
        dependencies,
        totalDependencies
      });

    } catch (error) {
      console.error('Erro ao verificar depend�ncias da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS PARA DISCIPLINAS =====
  
  // Deletar disciplina (admin)
  // GET /api/subjects/:id/dependencies - Verificar depend�ncias antes de excluir
  app.get('/api/subjects/:id/dependencies', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      console.log("Verificando depend�ncias da disciplina " + id + " por: " + user.firstName + " " + user.lastName);

      // Verificar se a disciplina existe
      const existingSubject = await db
        .select()
        .from(subjects)
        .where(eq(subjects.id, id))
        .limit(1);

      if (existingSubject.length === 0) {
        return res.status(404).json({ message: "Disciplina n�o encontrada" });
      }

      // Verificar v�nculos
      const classSubjectsCount = await db
        .select({ count: count() })
        .from(classSubjects)
        .where(eq(classSubjects.subjectId, id));

      const activitiesCount = await db
        .select({ count: count() })
        .from(activities)
        .where(eq(activities.subjectId, id));

      const examsCount = await db
        .select({ count: count() })
        .from(exams)
        .where(eq(exams.subjectId, id));

      const materialsCount = await db
        .select({ count: count() })
        .from(materials)
        .where(eq(materials.subjectId, id));

      const dependencies = {
        classSubjects: classSubjectsCount[0]?.count || 0,
        activities: activitiesCount[0]?.count || 0,
        exams: examsCount[0]?.count || 0,
        materials: materialsCount[0]?.count || 0
      };

      const totalDependencies = Object.values(dependencies).reduce((sum, count) => sum + count, 0);

      res.json({
        hasDependencies: totalDependencies > 0,
        dependencies,
        totalDependencies
      });

    } catch (error) {
      console.error('Erro ao verificar depend�ncias da disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete('/api/subjects/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const { password, confirmText } = req.body;
      
      console.log("Exclusao de disciplina " + id + " solicitada por: " + user.firstName + " " + user.lastName);

      // Verificar senha de confirmacao
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirmacao incorreta" });
      }

      // Se confirmText foi fornecido, deve ser "confirmar"
      if (confirmText && confirmText !== 'confirmar') {
        return res.status(400).json({ message: "Digite 'confirmar' para prosseguir com a exclus�o" });
      }

      // Verificar se a disciplina existe
      const existingSubject = await db
        .select()
        .from(subjects)
        .where(eq(subjects.id, id))
        .limit(1);

      if (existingSubject.length === 0) {
        return res.status(404).json({ message: "Disciplina nao encontrada" });
      }

      // Deletar vinculos primeiro (em ordem de depend?ncia)
      console.log("?? Removendo v?nculos da disciplina " + id + "...");
      
      // 1. Remover v?nculos de disciplinas com turmas
      await db.delete(classSubjects).where(eq(classSubjects.subjectId, id));
      console.log("[OK] V?nculos classSubjects removidos");
      
      // 2. Remover atividades relacionadas ? disciplina (se existir)
      try {
        // Primeiro, buscar todas as atividades da disciplina
        const activitiesToDelete = await db
          .select({ id: activities.id })
          .from(activities)
          .where(eq(activities.subjectId, id));

        console.log(`[INFO] Encontradas ${activitiesToDelete.length} atividades para remover`);

        // Remover submiss�es das atividades
        for (const activity of activitiesToDelete) {
          // Remover arquivos de submiss�o
          await db.delete(submissionFiles)
            .where(inArray(submissionFiles.submissionId, 
              db.select({ id: activitySubmissions.id })
                .from(activitySubmissions)
                .where(eq(activitySubmissions.activityId, activity.id))
            ));

          // Remover hist�rico de submiss�es
          await db.delete(submissionHistory)
            .where(inArray(submissionHistory.submissionId,
              db.select({ id: activitySubmissions.id })
                .from(activitySubmissions)
                .where(eq(activitySubmissions.activityId, activity.id))
            ));

          // Remover avalia��es de rubrica
          await db.delete(rubricEvaluations)
            .where(inArray(rubricEvaluations.submissionId,
              db.select({ id: activitySubmissions.id })
                .from(activitySubmissions)
                .where(eq(activitySubmissions.activityId, activity.id))
            ));

          // Remover submiss�es
          await db.delete(activitySubmissions)
            .where(eq(activitySubmissions.activityId, activity.id));
        }

        // Remover arquivos das atividades
        await db.delete(activityFiles)
          .where(inArray(activityFiles.activityId, 
            db.select({ id: activities.id })
              .from(activities)
              .where(eq(activities.subjectId, id))
          ));

        // Remover rubricas das atividades
        await db.delete(activityRubrics)
          .where(inArray(activityRubrics.activityId,
            db.select({ id: activities.id })
              .from(activities)
              .where(eq(activities.subjectId, id))
          ));

        // Finalmente, remover as atividades
        await db.delete(activities).where(eq(activities.subjectId, id));
        console.log("[OK] Atividades da disciplina removidas");
      } catch (e) {
        console.log("[INFO] Nenhuma atividade encontrada para a disciplina");
      }
      
      // 3. Remover notas relacionadas ? disciplina (se existir)
      try {
        await db.delete(grades).where(eq(grades.subjectId, id));
        console.log("[OK] Notas da disciplina removidas");
      } catch (e) {
        console.log("[INFO] Nenhuma nota encontrada para a disciplina");
      }

      // 4. Remover eventos relacionados ? disciplina (se existir)
      try {
        await db.delete(events).where(eq(events.subjectId, id));
        console.log("[OK] Eventos da disciplina removidos");
      } catch (e) {
        console.log("[INFO] Nenhum evento encontrado para a disciplina");
      }

      // 5. Remover notifica??es relacionadas ? disciplina (se existir)
      try {
        await db.delete(notifications).where(eq(notifications.subjectId, id));
        console.log("[OK] Notifica??es da disciplina removidas");
      } catch (e) {
        console.log("[INFO] Nenhuma notifica??o encontrada para a disciplina");
      }

      // 6. Remover materiais relacionados ? disciplina (se existir)
      try {
        await db.delete(materials).where(eq(materials.subjectId, id));
        console.log("[OK] Materiais da disciplina removidos");
      } catch (e) {
        console.log("[INFO] Nenhum material encontrado para a disciplina");
      }

      // 7. Remover provas relacionadas ? disciplina (se existir)
      try {
        await db.delete(exams).where(eq(exams.subjectId, id));
        console.log("[OK] Provas da disciplina removidas");
      } catch (e) {
        console.log("[INFO] Nenhuma prova encontrada para a disciplina");
      }

      // 8. Remover hor?rios relacionados ? disciplina (se existir)
      try {
        await db.delete(classSchedule).where(eq(classSchedule.subjectId, id));
        console.log("[OK] Hor?rios da disciplina removidos");
      } catch (e) {
        console.log("[INFO] Nenhum hor?rio encontrado para a disciplina");
      }

      // 9. Desabilitar temporariamente as constraints de FOREIGN KEY
      console.log("[INFO] Desabilitando constraints de FOREIGN KEY temporariamente...");
      await db.run(sql`PRAGMA foreign_keys = OFF`);

      // 10. Deletar disciplina permanentemente
      await db.delete(subjects).where(eq(subjects.id, id));

      // 11. Reabilitar as constraints de FOREIGN KEY
      await db.run(sql`PRAGMA foreign_keys = ON`);
      console.log("[INFO] Constraints de FOREIGN KEY reabilitadas");


      console.log("? Disciplina " + id + " deletada permanentemente");
      res.json({ message: "Disciplina excluida com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS PARA PROFESSORES =====
  
  // Ativar/Desativar professor (admin)
  app.patch('/api/admin/teachers/:id/status', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;
      
      console.log(`Altera��o de status do professor ${id} para ${status} solicitada por: ${user.firstName} ${user.lastName}`);

      // Verificar se o professor existe
      const existingTeacher = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.role, 'teacher')))
        .limit(1);

      if (existingTeacher.length === 0) {
        return res.status(404).json({ message: "Professor n�o encontrado" });
      }

      // Atualizar status
      await db
        .update(users)
        .set({ 
          status: status,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, id));

      console.log(`? Status do professor ${id} alterado para ${status}`);
      res.json({ message: "Status do professor atualizado com sucesso" });
    } catch (error) {
      console.error('Erro ao alterar status do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Listar professores (admin)
  app.get('/api/admin/teachers', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Listagem de professores solicitada por: " + user.firstName + " " + user.lastName);

      // Usar SQL direto para buscar professores
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      let teachers = [];
      try {
        const selectSql = `
          SELECT id, firstName, lastName, email, role, status, phone, address, registrationNumber, createdAt
          FROM users 
          WHERE role = 'teacher'
          ORDER BY createdAt DESC
        `;
        
        teachers = sqliteDb.prepare(selectSql).all();
        console.log("?? Professores encontrados:", teachers.length);
      } finally {
        sqliteDb.close();
      }

      // Para cada professor, buscar suas turmas e disciplinas usando SQL direto
      const teachersWithDetails = await Promise.all(
        teachers.map(async (teacher) => {
          const Database = (await import('better-sqlite3')).default;
          const path = (await import('path')).default;
          const { fileURLToPath } = await import('url');
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const dbPath = path.join(__dirname, 'school.db');
          const sqliteDb = new Database(dbPath);
          
          let teacherSubjects = [];
          try {
            const selectSubjectsSql = `
              SELECT 
                cs.subjectId,
                s.name as subjectName,
                s.code as subjectCode,
                cs.classId,
                c.name as className,
                c.grade as classGrade,
                c.section as classSection
              FROM classSubjects cs
              INNER JOIN subjects s ON cs.subjectId = s.id
              INNER JOIN classes c ON cs.classId = c.id
              WHERE cs.teacherId = ? AND cs.status = 'active'
            `;
            
            teacherSubjects = sqliteDb.prepare(selectSubjectsSql).all(teacher.id);
          } finally {
            sqliteDb.close();
          }

          // Agrupar por disciplina
          const subjectsMap = new Map();
          teacherSubjects.forEach(item => {
            if (!subjectsMap.has(item.subjectId)) {
              subjectsMap.set(item.subjectId, {
                id: item.subjectId,
                name: item.subjectName,
                code: item.subjectCode,
                classes: []
              });
            }
            subjectsMap.get(item.subjectId).classes.push({
              id: item.classId,
              name: item.className,
              grade: item.classGrade,
              section: item.classSection
            });
          });

          return {
            ...teacher,
            subjects: Array.from(subjectsMap.values()),
            totalSubjects: subjectsMap.size,
            totalClasses: teacherSubjects.length
          };
        })
      );

      console.log("? Encontrados " + teachersWithDetails.length + " professores com detalhes");
      res.json({ data: teachersWithDetails });
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin - Get teacher details with subjects and classes
  app.get('/api/admin/teachers/:id/details', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      const teacher = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (teacher.length === 0) {
        return res.status(404).json({ message: 'Professor nao encontrado' });
      }
      
      // Buscar disciplinas e turmas vinculadas ao professor
      const teacherDetails = await db
        .select({
          subjectId: classSubjects.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          subjectDescription: subjects.description,
          classId: classSubjects.classId,
          className: classes.name,
          classGrade: classes.grade,
          classSection: classes.section
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .where(and(
          eq(classSubjects.teacherId, id),
          eq(classSubjects.status, 'active')
        ));
      
      res.json({
        teacher: teacher[0],
        subjects: teacherDetails
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do professor:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Listar disciplinas para selecao (admin)
  app.get('/api/admin/subjects', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Listagem de disciplinas solicitada por: " + user.firstName + " " + user.lastName);

      // Buscar disciplinas (ativas e pendentes)
      const subjectsList = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description,
          status: subjects.status,
          createdAt: subjects.createdAt
        })
        .from(subjects)
        .where(or(eq(subjects.status, 'active'), eq(subjects.status, 'pending')))
        .orderBy(subjects.name);

      // Para cada disciplina, buscar as turmas vinculadas e professores
      const subjectsWithClasses = await Promise.all(
        subjectsList.map(async (subject) => {
          // Buscar v�nculos da disciplina com turmas e professores em uma �nica consulta
          const subjectLinks = await db
            .select({
              classId: classSubjects.classId,
              teacherId: classSubjects.teacherId,
              teacherFirstName: users.firstName,
              teacherLastName: users.lastName,
              teacherEmail: users.email,
              className: classes.name,
              classGrade: classes.grade,
              classSection: classes.section
            })
            .from(classSubjects)
            .leftJoin(users, eq(classSubjects.teacherId, users.id))
            .leftJoin(classes, eq(classSubjects.classId, classes.id))
            .where(
              and(
                eq(classSubjects.subjectId, subject.id),
                eq(classSubjects.status, 'active')
              )
            );

          // Agrupar por turma para evitar duplica��es
          const linkedClassesMap = new Map();
          let mainTeacher = null;

          subjectLinks.forEach(link => {
            if (link.classId && !linkedClassesMap.has(link.classId)) {
              linkedClassesMap.set(link.classId, {
                classId: link.classId,
                className: link.className,
                classGrade: link.classGrade,
                classSection: link.classSection
              });
            }
            
            // Determinar o professor principal (primeiro professor encontrado)
            if (link.teacherId && !mainTeacher) {
              mainTeacher = {
                id: link.teacherId,
                name: `${link.teacherFirstName} ${link.teacherLastName}`,
                email: link.teacherEmail
              };
            }
          });

          const linkedClasses = Array.from(linkedClassesMap.values());
          
          return {
            ...subject,
            linkedClasses: linkedClasses,
            teacher: mainTeacher
          };
        })
      );

      console.log("? Encontradas " + subjectsWithClasses.length + " disciplinas");
      res.json({ data: subjectsWithClasses });
    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar disciplina (admin)
  app.post('/api/admin/subjects', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { name, code, description, selectedClasses } = req.body;

      console.log("Criacao de disciplina solicitada por: " + user.firstName + " " + user.lastName);
      console.log('Dados da nova disciplina:', { name, code, description });

      // ValidacA?es basicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da disciplina e obrigatorio" });
      }
      
      if (!code || code.trim() === '') {
        return res.status(400).json({ message: "Codigo da disciplina e obrigatorio" });
      }

      // Verificar se codigo ja existe
      const existingSubject = await db
        .select()
        .from(subjects)
        .where(eq(subjects.code, code))
        .limit(1);

      if (existingSubject.length > 0) {
        return res.status(400).json({ message: "Codigo da disciplina ja esta em uso" });
      }

      // Criar disciplina
      const newSubject = {
        id: uuidv4(),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        status: 'pending' as const, // Requer aprova��o do diretor
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(subjects).values(newSubject);

      console.log("Disciplina criada com sucesso: " + newSubject.id);
      console.log("Nome: " + newSubject.name);
      console.log("Codigo: " + newSubject.code);

      // Vincular disciplina ?s turmas selecionadas
      if (selectedClasses && selectedClasses.length > 0) {
        console.log("Vinculando disciplina �s turmas: " + selectedClasses.join(', '));
        
        for (const classId of selectedClasses) {
          const classSubjectId = uuidv4();
          await db.insert(classSubjects).values({
            id: classSubjectId,
            classId: classId,
            subjectId: newSubject.id,
            teacherId: null, // Ser? vinculado quando um professor for atribu?do
            status: 'active',
            academicYear: '2025',
            semester: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log("[OK] Vinculo criado: Turma " + classId + " - Disciplina " + newSubject.id);
        }
      }
      
      res.status(201).json({ 
        message: "Disciplina criada com sucesso",
        data: newSubject
      });
    } catch (error) {
      console.error('Erro ao criar disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/admin/subjects/:id - Editar disciplina
  app.put('/api/admin/subjects/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { name, code, description, status, selectedClasses } = req.body;

      console.log("Edicao de disciplina " + id + " solicitada por: " + user.firstName + " " + user.lastName);
      console.log('?? Dados atualizados:', { name, code, description });

      // ValidacA?es basicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da disciplina e obrigatorio" });
      }
      
      if (!code || code.trim() === '') {
        return res.status(400).json({ message: "Codigo da disciplina e obrigatorio" });
      }

      // Verificar se disciplina existe
      const existingSubject = await db
        .select()
        .from(subjects)
        .where(eq(subjects.id, id))
        .limit(1);

      if (existingSubject.length === 0) {
        return res.status(404).json({ message: "Disciplina nao encontrada" });
      }

      // Verificar se codigo ja existe em outra disciplina
      const codeConflict = await db
        .select()
        .from(subjects)
        .where(and(eq(subjects.code, code), ne(subjects.id, id)))
        .limit(1);

      if (codeConflict.length > 0) {
        return res.status(400).json({ message: "Codigo da disciplina ja esta em uso" });
      }

      // Atualizar disciplina
      const updatedSubject = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        status: status || 'active',
        updatedAt: new Date().toISOString()
      };

      await db
        .update(subjects)
        .set(updatedSubject)
        .where(eq(subjects.id, id));

      console.log("? Disciplina " + id + " atualizada com sucesso");
      console.log("Nome: " + updatedSubject.name);
      console.log("Codigo: " + updatedSubject.code);

      // Atualizar v�nculos com turmas se selectedClasses foi fornecido
      if (selectedClasses && Array.isArray(selectedClasses)) {
        console.log("Atualizando v�nculos com turmas: " + selectedClasses.join(', '));
        
        // Remover todos os v�nculos existentes desta disciplina
        await db
          .delete(classSubjects)
          .where(eq(classSubjects.subjectId, id));
        
        // Criar novos v�nculos com as turmas selecionadas
        for (const classId of selectedClasses) {
          // Verificar se a turma existe
          const classExists = await db
            .select({ id: classes.id })
            .from(classes)
            .where(eq(classes.id, classId))
            .limit(1);

          if (classExists.length > 0) {
            const classSubjectId = uuidv4();
            await db.insert(classSubjects).values({
              id: classSubjectId,
              classId: classId,
              subjectId: id,
              status: 'active',
              academicYear: '2025',
              semester: '1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          } else {
            console.log(`?? Turma ${classId} n�o encontrada, pulando v�nculo`);
          }
        }
        
        console.log("V�nculos com turmas atualizados com sucesso");
      }
      
      res.json({ 
        message: "Disciplina atualizada com sucesso",
        data: { id, ...updatedSubject }
      });
    } catch (error) {
      console.error('Erro ao atualizar disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar turmas para selecao (admin)
  app.get('/api/admin/classes', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Listagem de turmas solicitada por: " + user.firstName + " " + user.lastName);

      // Usar SQL direto para buscar turmas
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      let classesList = [];
      try {
        const selectSql = `
          SELECT id, name, grade, section, academicYear, status, capacity, createdAt, updatedAt
          FROM classes 
          ORDER BY name
        `;
        
        classesList = sqliteDb.prepare(selectSql).all();
        console.log(`?? ${classesList.length} turmas encontradas`);
      } finally {
        sqliteDb.close();
      }

      // Para cada turma, calcular o n�mero real de alunos e disciplinas usando SQL direto
      const classesWithCounts = await Promise.all(
        classesList.map(async (classItem) => {
          const Database = (await import('better-sqlite3')).default;
          const path = (await import('path')).default;
          const dbPath = path.join(__dirname, 'school.db');
          const sqliteDb = new Database(dbPath);
          
          let studentsCount = 0;
          let subjectsCount = 0;
          
          try {
            // Contar alunos matriculados na turma
            const studentsResult = sqliteDb.prepare('SELECT COUNT(*) as count FROM studentClass WHERE classId = ?').get(classItem.id);
            studentsCount = studentsResult?.count || 0;
            
            // Contar disciplinas vinculadas � turma (tabela n�o existe, usar 0)
            subjectsCount = 0;
          } finally {
            sqliteDb.close();
          }

          return {
            ...classItem,
            studentCount: studentsCount,
            subjectsCount: subjectsCount
          };
        })
      );

      console.log("? Encontradas " + classesWithCounts.length + " turmas com contadores atualizados");
      res.json({ data: classesWithCounts });
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar turma (admin)
  app.post('/api/admin/classes', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { name, grade, section, academicYear, capacity } = req.body;

      console.log("Criacao de turma solicitada por: " + user.firstName + " " + user.lastName);
      console.log('Dados da nova turma:', { name, grade, section, academicYear });

      // ValidacA?es basicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da turma e obrigatorio" });
      }
      
      if (!grade || grade.trim() === '') {
        return res.status(400).json({ message: "Serie/Ano e obrigatorio" });
      }
      
      if (!section || section.trim() === '') {
        return res.status(400).json({ message: "Secao e obrigatoria" });
      }
      
      if (!academicYear || academicYear.trim() === '') {
        return res.status(400).json({ message: "Ano letivo e obrigatorio" });
      }

      // Usar SQL direto para verificar se j� existe uma turma com o mesmo nome
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      let existingClass = null;
      try {
        const selectSql = 'SELECT * FROM classes WHERE name = ? LIMIT 1';
        existingClass = sqliteDb.prepare(selectSql).get(name.trim());
      } finally {
        sqliteDb.close();
      }

      if (existingClass) {
        return res.status(400).json({ message: "Ja existe uma turma com este nome" });
      }

      // Criar turma usando SQL direto
      const newClass = {
        id: uuidv4(),
        name: name.trim(),
        grade: grade.trim(),
        section: section.trim(),
        academicYear: academicYear.trim(),
        capacity: capacity || 30,
        status: 'pending' as const, // Requer aprova��o do diretor
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const sqliteDb2 = new Database(dbPath);
      try {
        const insertSql = `
          INSERT INTO classes (id, name, grade, section, academicYear, capacity, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        sqliteDb2.prepare(insertSql).run(
          newClass.id,
          newClass.name,
          newClass.grade,
          newClass.section,
          newClass.academicYear,
          newClass.capacity,
          newClass.status,
          newClass.createdAt,
          newClass.updatedAt
        );
      } finally {
        sqliteDb2.close();
      }

      console.log("Turma criada com sucesso: " + newClass.id);
      console.log("Nome: " + newClass.name);
      console.log("Serie: " + newClass.grade + " - Secao: " + newClass.section);
      console.log("Ano letivo: " + newClass.academicYear);
      
      res.status(201).json({ 
        message: "Turma criada com sucesso",
        data: newClass
      });
    } catch (error) {
      console.error('Erro ao criar turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar turma (professor - com vincula��o autom�tica)
  app.post('/api/teacher/classes', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const user = req.user as any;
      const { name, grade, section, academicYear, capacity, subjectName } = req.body;

      console.log(`? Cria��o de turma por professor: ${user.firstName} ${user.lastName}`);
      console.log('?? Dados da nova turma:', { name, grade, section, academicYear, subjectName });

      // Valida��es b�sicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da turma � obrigat�rio" });
      }
      
      if (!grade || grade.trim() === '') {
        return res.status(400).json({ message: "S�rie/Ano � obrigat�rio" });
      }
      
      if (!section || section.trim() === '') {
        return res.status(400).json({ message: "Se��o � obrigat�ria" });
      }
      
      if (!academicYear || academicYear.trim() === '') {
        return res.status(400).json({ message: "Ano letivo � obrigat�rio" });
      }

      if (!subjectName || subjectName.trim() === '') {
        return res.status(400).json({ message: "Nome da disciplina � obrigat�rio" });
      }

      // Verificar se j� existe uma turma com o mesmo nome
      const existingClass = await db
        .select()
        .from(classes)
        .where(eq(classes.name, name.trim()))
        .limit(1);

      if (existingClass.length > 0) {
        return res.status(400).json({ message: "J� existe uma turma com este nome" });
      }

      // 1. Criar turma
      const newClass = {
        id: uuidv4(),
        name: name.trim(),
        grade: grade.trim(),
        section: section.trim(),
        academicYear: academicYear.trim(),
        capacity: capacity || 30,
        // currentStudents ser� calculado dinamicamente
        coordinatorId: user.id, // Professor vira como coordenador
        status: 'pending' as const, // Requer aprova��o do diretor
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(classes).values(newClass);
      console.log(`? Turma criada: ${newClass.name} (ID: ${newClass.id})`);

      // 2. Criar disciplina se n�o existir
      let subjectId;
      const existingSubject = await db
        .select()
        .from(subjects)
        .where(eq(subjects.name, subjectName.trim()))
        .limit(1);

      if (existingSubject.length > 0) {
        subjectId = existingSubject[0].id;
        console.log(`?? Disciplina existente: ${subjectName} (ID: ${subjectId})`);
      } else {
        subjectId = uuidv4();
        const newSubject = {
          id: subjectId,
          name: subjectName.trim(),
          code: subjectName.trim().toUpperCase().substring(0, 6),
          description: `Disciplina: ${subjectName.trim()}`,
          status: 'pending' as const, // Requer aprova��o do diretor
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await db.insert(subjects).values(newSubject);
        console.log(`?? Disciplina criada: ${subjectName} (ID: ${subjectId})`);
      }

      // 3. Vincular professor � turma-disciplina
      const classSubjectId = uuidv4();
      const classSubject = {
        id: classSubjectId,
        classId: newClass.id,
        subjectId: subjectId,
        teacherId: user.id,
        schedule: 'A definir',
        room: 'A definir',
        semester: '1� Semestre',
        academicYear: academicYear.trim(),
        status: 'pending' as const, // Requer aprova��o do diretor
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(classSubjects).values(classSubject);
      console.log(`?? Professor ${user.firstName} vinculado � turma-disciplina`);

      res.status(201).json({
        message: "Turma criada e vinculada com sucesso!",
        class: {
          id: newClass.id,
          name: newClass.name,
          subject: {
            id: subjectId,
            name: subjectName.trim()
          }
        }
      });

    } catch (error) {
      console.error('Erro ao criar turma pelo professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/admin/classes/:id - Editar turma
  app.put('/api/admin/classes/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { name, grade, section, academicYear, capacity, status } = req.body;

      console.log("Edicao de turma " + id + " solicitada por: " + user.firstName + " " + user.lastName);
      console.log('?? Dados atualizados:', { name, grade, section, academicYear, capacity });

      // ValidacA?es basicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da turma e obrigatorio" });
      }
      
      if (!grade || grade.trim() === '') {
        return res.status(400).json({ message: "Serie/Ano e obrigatorio" });
      }

      if (!section || section.trim() === '') {
        return res.status(400).json({ message: "Secao e obrigatoria" });
      }

      // Verificar se turma existe
      const existingClass = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (existingClass.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }

      // Verificar se nome ja existe em outra turma
      const nameConflict = await db
        .select()
        .from(classes)
        .where(and(eq(classes.name, name), ne(classes.id, id)))
        .limit(1);

      if (nameConflict.length > 0) {
        return res.status(400).json({ message: "Nome da turma ja esta em uso" });
      }

      // Atualizar turma
      const updatedClass = {
        name: name.trim(),
        grade: grade.trim(),
        section: section.trim().toUpperCase(),
        academicYear: academicYear || '2024',
        capacity: capacity || 30,
        status: status || 'active',
        updatedAt: new Date().toISOString()
      };

      await db
        .update(classes)
        .set(updatedClass)
        .where(eq(classes.id, id));

      console.log("? Turma " + id + " atualizada com sucesso");
      console.log("Nome: " + updatedClass.name);
      console.log("Serie: " + updatedClass.grade + " - Secao: " + updatedClass.section);
      
      res.json({ 
        message: "Turma atualizada com sucesso",
        data: { id, ...updatedClass }
      });
    } catch (error) {
      console.error('Erro ao atualizar turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar professor (admin)
  app.post('/api/admin/teachers', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { firstName, lastName, email, phone, address, cpf, subjects: selectedSubjects, classes: selectedClasses } = req.body;

      console.log("Criacao de professor solicitada por: " + user.firstName + " " + user.lastName);
      console.log('Dados do novo professor:', { firstName, lastName, email });
      console.log('Disciplinas selecionadas:', selectedSubjects);
      console.log('Turmas selecionadas:', selectedClasses);

      // Gerar email padrao sempre com @escola.com
      let finalEmail;
      if (email && email !== '' && email.endsWith('@escola.com')) {
        // Email completo ja fornecido
        finalEmail = email;
      } else if (email && email !== '') {
        // Email parcial fornecido - usar apenas a parte antes do @ (se houver)
        const emailPart = email.split('@')[0];
        // Limpar caracteres especiais e espacos
        const cleanEmailPart = emailPart.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
        finalEmail = `${cleanEmailPart}@escola.com`;
      } else {
        // Gerar email automatico
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        finalEmail = `${cleanFirstName}.${cleanLastName}@escola.com`;
      }
      
      // N�o verificar email duplicado pois email ser� null inicialmente
      // A verifica��o ser� feita quando o diretor aprovar o usu�rio

      // Gerar numero de matricula aleatorio e unico
      let finalRegistrationNumber;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        const randomNumber = Math.floor(Math.random() * 900000) + 100000;
        finalRegistrationNumber = randomNumber.toString();
        
        const existingRegistration = await db
          .select()
          .from(users)
          .where(eq(users.registrationNumber, finalRegistrationNumber))
          .limit(1);
        
        if (existingRegistration.length === 0) {
          break;
        }
        
        attempts++;
      } while (attempts < maxAttempts);
      
      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Erro ao gerar matricula unica. Tente novamente." });
      }

      // Criar professor com status 'pending' (sem email e senha ainda)
      const newTeacher = {
        id: uuidv4(),
        firstName,
        lastName,
        email: null, // N�o criar email ainda
        password: null, // N�o criar senha ainda
        role: 'teacher',
        status: 'pending' as const,
        phone: phone || null,
        address: address || null,
        registrationNumber: finalRegistrationNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Usar SQL direto com better-sqlite3 para evitar problemas com Drizzle ORM
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      try {
        const insertSql = `
          INSERT INTO users (
            id, email, password, firstName, lastName, profileImageUrl,
            role, status, lastSeen, phone, address, registrationNumber,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const stmt = sqliteDb.prepare(insertSql);
        stmt.run(
          newTeacher.id,
          newTeacher.email,
          newTeacher.password,
          newTeacher.firstName,
          newTeacher.lastName,
          null, // profileImageUrl
          newTeacher.role,
          newTeacher.status,
          null, // lastSeen
          newTeacher.phone,
          newTeacher.address,
          newTeacher.registrationNumber,
          newTeacher.createdAt,
          newTeacher.updatedAt
        );
        
        console.log("? Professor criado com status 'pending': " + newTeacher.id);
        
        // Vincular professor �s disciplinas e turmas selecionadas (status pending)
        if (selectedSubjects && selectedSubjects.length > 0 && selectedClasses && selectedClasses.length > 0) {
          console.log("Vinculando professor �s disciplinas e turmas (status pending)");
          
          for (const subjectId of selectedSubjects) {
            for (const classId of selectedClasses) {
              const classSubjectId = uuidv4();
              
              const insertClassSubjectSql = `
                INSERT INTO classSubjects (
                  id, classId, subjectId, teacherId, schedule, room, semester, 
                  academicYear, status, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;
              
              const stmt = sqliteDb.prepare(insertClassSubjectSql);
              stmt.run(
                classSubjectId,
                classId,
                subjectId,
                newTeacher.id, // Vincular ao professor criado
                null, // schedule
                null, // room
                '1', // semester
                '2025', // academicYear
                'pending', // status - aguardando aprova��o
                newTeacher.createdAt,
                newTeacher.updatedAt
              );
              
              console.log("? V�nculo criado (pending): Professor " + newTeacher.id + " - Disciplina " + subjectId + " - Turma " + classId);
            }
          }
        }
      } finally {
        sqliteDb.close();
      }

      console.log("?? Nome: " + firstName + " " + lastName);
      console.log("?? Fun��o: Professor");
      console.log("?? Matr�cula: " + finalRegistrationNumber);
      console.log("? Aguardando aprova��o do diretor para ativar login");
      
      res.status(201).json({ 
        message: "Professor criado com sucesso",
        data: { 
          id: newTeacher.id,
          email: finalEmail,
          registrationNumber: finalRegistrationNumber,
          status: 'pending',
          message: 'Aguardando aprova��o do diretor para ativar login'
        }
      });
    } catch (error) {
      console.error('Erro ao criar professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/admin/teachers/:id - Editar professor
  app.put('/api/admin/teachers/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { firstName, lastName, email, phone, address, status } = req.body;

      console.log("Edicao de professor " + id + " solicitada por: " + user.firstName + " " + user.lastName);
      console.log('?? Dados atualizados:', { firstName, lastName, email, phone });

      // ValidacA?es basicas
      if (!firstName || firstName.trim() === '') {
        return res.status(400).json({ message: "Nome e obrigatorio" });
      }
      
      if (!lastName || lastName.trim() === '') {
        return res.status(400).json({ message: "Sobrenome e obrigatorio" });
      }

      if (!email || email.trim() === '') {
        return res.status(400).json({ message: "Email e obrigatorio" });
      }

      // Verificar se professor existe
      const existingTeacher = await db
        .select()
        .from(teachers)
        .where(eq(teachers.id, id))
        .limit(1);

      if (existingTeacher.length === 0) {
        return res.status(404).json({ message: "Professor nao encontrado" });
      }

      // Processar email (mesma logica da criacao)
      let finalEmail;
      if (email && email !== '' && email.endsWith('@escola.com')) {
        finalEmail = email;
      } else if (email && email !== '') {
        const emailPart = email.split('@')[0];
        const cleanEmailPart = emailPart.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
        finalEmail = `${cleanEmailPart}@escola.com`;
      } else {
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        finalEmail = `${cleanFirstName}.${cleanLastName}@escola.com`;
      }

      // Verificar se email ja existe em outro professor
      const emailConflict = await db
        .select()
        .from(teachers)
        .where(and(eq(teachers.email, finalEmail), ne(teachers.id, id)))
        .limit(1);

      if (emailConflict.length > 0) {
        return res.status(400).json({ message: "Email ja esta em uso" });
      }

      // Atualizar professor
      const updatedTeacher = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: finalEmail,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        status: status || 'active',
        updatedAt: new Date().toISOString()
      };

      await db
        .update(teachers)
        .set(updatedTeacher)
        .where(eq(teachers.id, id));

      console.log("? Professor " + id + " atualizado com sucesso");
      console.log("Email: " + finalEmail);
      
      res.json({ 
        message: "Professor atualizado com sucesso",
        data: { id, ...updatedTeacher }
      });
    } catch (error) {
      console.error('Erro ao atualizar professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === ROTAS DE MATERIAIS DIDATICOS === (TEMPORARIAMENTE COMENTADAS)
  // Listar materiais do professor
  app.get('/api/materials/teacher/:teacherId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { folder } = req.query;
      const user = req.user as any;

      // Verificar se o professor pode acessar
      if (user.role !== 'teacher' || user.id !== teacherId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      console.log("Buscando materiais do professor: " + teacherId);

      let whereCondition;
      
      // Se uma pasta espec�fica foi solicitada
      if (folder) {
        if (folder === 'root') {
          // Mostrar apenas materiais na raiz (sem pasta)
          whereCondition = and(eq(materials.teacherId, teacherId), eq(materials.folder, null));
        } else {
          // Mostrar materiais da pasta espec�fica
          whereCondition = and(eq(materials.teacherId, teacherId), eq(materials.folder, folder));
        }
      } else {
        // Por padr�o, mostrar todos os materiais ativos do professor
        whereCondition = and(
          eq(materials.teacherId, teacherId),
          eq(materials.status, 'active')
        );
      }

      // Buscar materiais b�sicos primeiro
      const materialsData = await db
        .select({
          id: materials.id,
          title: materials.title,
          description: materials.description,
          materialType: materials.materialType,
          content: materials.content,
          folder: materials.folder,
          isPublic: materials.isPublic,
          status: materials.status,
          createdAt: materials.createdAt,
          updatedAt: materials.updatedAt,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(materials)
        .leftJoin(subjects, eq(materials.subjectId, subjects.id))
        .leftJoin(classes, eq(materials.classId, classes.id))
        .where(whereCondition)
        .orderBy(desc(materials.createdAt));

      // Buscar contagem de arquivos para cada material
      const materialsWithFiles = await Promise.all(
        materialsData.map(async (material) => {
          const filesData = await db
            .select({
              filesCount: count(materialFiles.id),
              totalSize: sum(materialFiles.fileSize)
            })
            .from(materialFiles)
            .where(eq(materialFiles.materialId, material.id));
          
          return {
            ...material,
            filesCount: filesData[0]?.filesCount || 0,
            totalSize: filesData[0]?.totalSize || null
          };
        })
      );

      console.log("Encontrados " + materialsWithFiles.length + " materiais do professor");
      
      // Debug logs para verificar dados retornados
      materialsWithFiles.forEach((material: any, index: number) => {
        console.log(`?? Material ${index + 1}: ${material.title}`);
        console.log(`  - Tipo: ${material.materialType}`);
        console.log(`  - filesCount: ${material.filesCount}`);
        console.log(`  - totalSize: ${material.totalSize}`);
      });

      res.json(materialsWithFiles);
    } catch (error) {
      console.error('Erro ao buscar materiais do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar pastas do professor
  app.get('/api/materials/teacher/:teacherId/folders', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;

      // Verificar se o professor pode acessar
      if (user.role !== 'teacher' || user.id !== teacherId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      console.log("Buscando pastas do professor: " + teacherId);

      const foldersData = await db
        .select({
          folder: materials.folder,
          count: count(materials.id)
        })
        .from(materials)
        .where(and(
          eq(materials.teacherId, teacherId),
          isNotNull(materials.folder)
        ))
        .groupBy(materials.folder)
        .orderBy(materials.folder);

      console.log("Encontradas " + foldersData.length + " pastas do professor");

      res.json(foldersData);
    } catch (error) {
      console.error('Erro ao buscar pastas do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar materiais para aluno (por disciplina)
  app.get('/api/materials/student', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user as any;
      const { subjectId } = req.query;

      console.log("Buscando materiais para aluno: " + user.firstName + " " + user.lastName);

      // Buscar disciplinas do aluno
      const studentSubjects = await db
        .select({
          subjectId: subjects.id,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(studentClass)
        .innerJoin(classes, eq(studentClass.classId, classes.id))
        .innerJoin(classSubjects, eq(classes.id, classSubjects.classId))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(eq(studentClass.studentId, user.id));

      if (studentSubjects.length === 0) {
        return res.json([]);
      }

      const subjectIds = studentSubjects.map(s => s.subjectId);

      // Buscar materiais das disciplinas do aluno
      let query = db
        .select({
          id: materials.id,
          title: materials.title,
          description: materials.description,
          materialType: materials.materialType,
          content: materials.content,
          folder: materials.folder,
          isPublic: materials.isPublic,
          createdAt: materials.createdAt,
          subjectName: subjects.name,
          className: classes.name,
          filesCount: count(materialFiles.id)
        })
        .from(materials)
        .leftJoin(subjects, eq(materials.subjectId, subjects.id))
        .leftJoin(classes, eq(materials.classId, classes.id))
        .leftJoin(materialFiles, eq(materials.id, materialFiles.materialId))
        .where(
          and(
            inArray(materials.subjectId, subjectIds),
            eq(materials.isPublic, true),
            eq(materials.status, 'active')
          )
        )
        .groupBy(materials.id)
        .orderBy(desc(materials.createdAt));

      // Filtrar por disciplina especifica se fornecida
      if (subjectId) {
        query = query.where(
          and(
            eq(materials.subjectId, subjectId as string),
            eq(materials.isPublic, true),
            eq(materials.status, 'active')
          )
        );
      }

      const materialsData = await query;

      console.log("Encontrados " + materialsData.length + " materiais para o aluno");

      res.json(materialsData);
    } catch (error) {
      console.error('Erro ao buscar materiais do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar novo material
  app.post('/api/materials', isAuthenticated, hasRole(['teacher']), upload.array('files', 5), async (req, res) => {
    try {
      const user = req.user as any;
      const { title, description, subjectId, classId, materialType, content, isPublic, folder } = req.body;
      const files = req.files as Express.Multer.File[];

      console.log("Criando novo material: " + title);

      const materialId = uuidv4();
      const now = new Date().toISOString();

      // Criar material
      const newMaterial = {
        id: materialId,
        title: title.trim(),
        description: description?.trim() || null,
        subjectId,
        classId,
        teacherId: user.id,
        materialType,
        content: content?.trim() || null,
        folder: folder?.trim() || null,
        isPublic: isPublic === 'true' || isPublic === true,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };

      await db.insert(materials).values(newMaterial);

      // Log cria��o de material
      logger.materialCreated(user, title, req);

      // Processar arquivos se houver
      if (files && files.length > 0) {
        console.log("?? Processando arquivos:", files.length);
        files.forEach((file, index) => {
          console.log(`  Arquivo ${index + 1}:`);
          console.log(`    - filename: ${file.filename}`);
          console.log(`    - originalname: ${file.originalname}`);
          console.log(`    - size: ${file.size}`);
          console.log(`    - mimetype: ${file.mimetype}`);
          console.log(`    - path: ${file.path}`);
        });

        const fileRecords = files.map(file => ({
          id: uuidv4(),
          materialId,
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          fileType: file.mimetype,
          fileCategory: 'main' as const,
          uploadedBy: user.id,
          createdAt: now
        }));

        console.log("?? Registros de arquivo a serem inseridos:");
        fileRecords.forEach((record, index) => {
          console.log(`  Registro ${index + 1}:`);
          console.log(`    - id: ${record.id}`);
          console.log(`    - materialId: ${record.materialId}`);
          console.log(`    - fileName: ${record.fileName}`);
          console.log(`    - originalFileName: ${record.originalFileName}`);
          console.log(`    - filePath: ${record.filePath}`);
          console.log(`    - fileSize: ${record.fileSize}`);
          console.log(`    - fileType: ${record.fileType}`);
          console.log(`    - fileCategory: ${record.fileCategory}`);
          console.log(`    - uploadedBy: ${record.uploadedBy}`);
          console.log(`    - createdAt: ${record.createdAt}`);
        });

        // Inserir arquivos usando SQL direto para evitar problemas com Drizzle
        for (const record of fileRecords) {
          await client.execute({
            sql: `INSERT INTO materialFiles (id, materialId, fileName, originalFileName, filePath, fileSize, fileType, fileCategory, uploadedBy, createdAt) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              record.id,
              record.materialId,
              record.fileName,
              record.originalFileName,
              record.filePath,
              record.fileSize,
              record.fileType,
              record.fileCategory,
              record.uploadedBy,
              record.createdAt
            ]
          });
        }
        console.log(files.length + " arquivo(s) processado(s) para o material");
      }

      console.log("Material criado com sucesso: " + title);

      res.status(201).json({
        message: "Material criado com sucesso",
        data: newMaterial
      });
    } catch (error) {
      console.error('Erro ao criar material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Upload simples de arquivo para material existente
  app.post('/api/materials/:id/files', isAuthenticated, hasRole(['teacher']), upload.single('file'), async (req, res) => {
    try {
      const { id: materialId } = req.params;
      const file = req.file;
      const user = req.user as any;

      if (!file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // Verificar se o material existe e pertence ao professor
      const material = await db
        .select()
        .from(materials)
        .where(eq(materials.id, materialId))
        .limit(1);

      if (material.length === 0) {
        return res.status(404).json({ message: "Material n�o encontrado" });
      }

      if (material[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Criar registro do arquivo
      const fileRecord = {
        id: uuidv4(),
        materialId,
        fileName: file.filename,
        originalFileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        fileCategory: 'main' as const,
        uploadedBy: user.id,
        createdAt: new Date().toISOString()
      };

      await db.insert(materialFiles).values(fileRecord);
      console.log(`Arquivo ${file.originalname} adicionado ao material ${material[0].title}`);

      res.status(201).json({
        message: "Arquivo adicionado com sucesso",
        file: fileRecord
      });
    } catch (error) {
      console.error('Erro ao adicionar arquivo ao material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar arquivo espec�fico de material
  app.delete('/api/materials/files/:fileId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      // Buscar o arquivo
      const file = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        return res.status(404).json({ message: "Arquivo n�o encontrado" });
      }

      // Verificar se o material pertence ao professor
      const material = await db
        .select()
        .from(materials)
        .where(eq(materials.id, file[0].materialId))
        .limit(1);

      if (material.length === 0 || material[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Deletar arquivo f�sico
      try {
        const filePath = path.resolve(file[0].filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.log('Erro ao deletar arquivo f�sico:', error);
      }

      // Deletar registro do banco
      await db.delete(materialFiles).where(eq(materialFiles.id, fileId));

      console.log(`Arquivo ${file[0].originalFileName} deletado com sucesso`);
      res.json({ message: "Arquivo deletado com sucesso" });
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar material especifico
  app.get('/api/materials/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      console.log("Buscando material: " + id);

      const materialData = await db
        .select({
          id: materials.id,
          title: materials.title,
          description: materials.description,
          materialType: materials.materialType,
          content: materials.content,
          isPublic: materials.isPublic,
          status: materials.status,
          createdAt: materials.createdAt,
          updatedAt: materials.updatedAt,
          subjectId: materials.subjectId,
          classId: materials.classId,
          teacherId: materials.teacherId,
          subjectName: subjects.name,
          className: classes.name,
          teacherFirstName: users.firstName,
          teacherLastName: users.lastName
        })
        .from(materials)
        .leftJoin(subjects, eq(materials.subjectId, subjects.id))
        .leftJoin(classes, eq(materials.classId, classes.id))
        .leftJoin(users, eq(materials.teacherId, users.id))
        .where(eq(materials.id, id))
        .limit(1);

      if (materialData.length === 0) {
        return res.status(404).json({ message: "Material nao encontrado" });
      }

      const material = materialData[0];

      // Verificar permissA?es
      if (user.role === 'student') {
        if (!material.isPublic || material.status !== 'active') {
          return res.status(403).json({ message: "Acesso negado" });
        }
      } else if (user.role === 'teacher' && material.teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar arquivos do material
      const materialFilesData = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.materialId, id));

      console.log("Material encontrado: " + material.title);
      console.log(materialFilesData.length + " arquivo(s) encontrado(s)");

      const teacherName = material.teacherFirstName && material.teacherLastName 
        ? `${material.teacherFirstName} ${material.teacherLastName}` 
        : null;

      res.json({
        ...material,
        teacherName,
        files: materialFilesData
      });
    } catch (error) {
      console.error('Erro ao buscar material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de todos os arquivos de um material
  app.get('/api/materials/:materialId/download', isAuthenticated, async (req, res) => {
    try {
      const { materialId } = req.params;
      const user = req.user as any;

      console.log("BAIXANDO TODOS OS ARQUIVOS DO MATERIAL: " + materialId);

      // Buscar o material
      const material = await db
        .select()
        .from(materials)
        .where(eq(materials.id, materialId))
        .limit(1);

      if (material.length === 0) {
        return res.status(404).json({ message: "Material n�o encontrado" });
      }

      // Verificar permiss�es
      if (user.role === 'student') {
        if (!material[0].isPublic || material[0].status !== 'active') {
          return res.status(403).json({ message: "Acesso negado" });
        }
      } else if (user.role === 'teacher' && material[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar arquivos do material
      const materialFiles = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.materialId, materialId));

      if (materialFiles.length === 0) {
        return res.status(404).json({ message: "Nenhum arquivo encontrado para este material" });
      }

      // Se h� apenas um arquivo, fazer download direto
      if (materialFiles.length === 1) {
        const file = materialFiles[0];
        const filePath = path.resolve(file.filePath);
        
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: "Arquivo n�o encontrado no servidor" });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
        res.setHeader('Content-Type', file.fileType);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        return;
      }

      // Se h� m�ltiplos arquivos, criar um ZIP
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip', { zlib: { level: 9 } });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${material[0].title}_arquivos.zip"`);

      archive.pipe(res);

      // Adicionar cada arquivo ao ZIP
      for (const file of materialFiles) {
        const filePath = path.resolve(file.filePath);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file.originalFileName });
        }
      }

      await archive.finalize();

    } catch (error) {
      console.error('Erro ao baixar arquivos do material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de arquivo de material
  app.get('/api/materials/files/:fileId/download', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      console.log("BAIXANDO ARQUIVO DE MATERIAL");
      console.log("File ID: " + fileId);

      const file = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        console.log('? Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      const materialFile = file[0];
      console.log('? Arquivo encontrado:', materialFile.originalFileName);

      // Verificar se o arquivo existe no disco
      const filePath = path.resolve(materialFile.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('? Arquivo nao encontrado no disco:', filePath);
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }

      // Enviar arquivo para download
      res.setHeader('Content-Disposition', `attachment; filename="${materialFile.originalFileName}"`);
      res.setHeader('Content-Type', materialFile.fileType);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('? Erro ao baixar arquivo de material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Visualizar arquivo de material
  app.get('/api/materials/files/:fileId/view', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      console.log("VISUALIZANDO ARQUIVO DE MATERIAL");
      console.log("File ID: " + fileId);

      const file = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        console.log('? Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      const materialFile = file[0];
      console.log('? Arquivo encontrado:', materialFile.originalFileName);

      // Verificar se o arquivo existe no disco
      const filePath = path.resolve(materialFile.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('? Arquivo nao encontrado no disco:', filePath);
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }

      // Definir Content-Type baseado na extensao do arquivo
      const fileExtension = path.extname(materialFile.originalFileName).toLowerCase();
      let contentType = materialFile.fileType;

      // Mapear extensA?es para Content-Types corretos
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };

      if (mimeTypes[fileExtension]) {
        contentType = mimeTypes[fileExtension];
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${materialFile.originalFileName}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Erro ao visualizar arquivo de material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar material
  app.delete('/api/materials/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      console.log('Deletando material:', id);

      // Verificar se o material existe e pertence ao professor
      const material = await db
        .select()
        .from(materials)
        .where(and(eq(materials.id, id), eq(materials.teacherId, user.id)))
        .limit(1);

      if (material.length === 0) {
        return res.status(404).json({ message: "Material nao encontrado" });
      }

      // Buscar arquivos do material
      const materialFilesData = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.materialId, id));

      // Deletar arquivos fisicos
      for (const file of materialFilesData) {
        try {
          const filePath = path.resolve(file.filePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Arquivo fisico deletado:', file.originalFileName);
          }
        } catch (error) {
          console.log('Erro ao deletar arquivo fisico:', file.originalFileName);
        }
      }

      // Deletar registros do banco
      await db.delete(materialFiles).where(eq(materialFiles.materialId, id));
      await db.delete(materials).where(eq(materials.id, id));

      console.log('Material deletado com sucesso:', material[0].title);

      res.json({ message: "Material deletado com sucesso" });
    } catch (error) {
      console.error('Erro ao deletar material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  console.log("Rotas de materiais didaticos registradas!");

  // === ROTAS DE PERFORMANCE PARA COORDENADOR ===
  
  // Buscar dados completos de performance para o coordenador
  app.get('/api/coordinator/performance', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      console.log('?? Buscando dados de performance para o coordenador...');
      
      // Buscar todos os professores
      const teachersData = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          status: users.status
        })
        .from(users)
        .where(eq(users.role, 'teacher'));

      console.log('????? Professores encontrados:', teachersData.length);

      // Buscar todas as atividades
      const activitiesData = await db
        .select({
          id: activities.id,
          title: activities.title,
          status: activities.status,
          teacherId: activities.teacherId,
          subjectId: activities.subjectId,
          classId: activities.classId,
          createdAt: activities.createdAt,
          dueDate: activities.dueDate
        })
        .from(activities);

      console.log('?? Atividades encontradas:', activitiesData.length);

      // Buscar todas as provas
      const examsData = await db
        .select({
          id: exams.id,
          title: exams.title,
          status: exams.status,
          teacherId: exams.teacherId,
          examDate: exams.examDate,
          totalPoints: exams.totalPoints
        })
        .from(exams);

      console.log('?? Provas encontradas:', examsData.length);

      // Buscar todos os alunos
      const studentsData = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .where(eq(users.role, 'student'));

      console.log('?? Alunos encontrados:', studentsData.length);

      // Buscar associa��es aluno-turma separadamente
      const studentClassData = await db
        .select({
          studentId: studentClass.studentId,
          classId: studentClass.classId
        })
        .from(studentClass);

      console.log('?? Associa��es aluno-turma:', studentClassData.length);

      // Buscar dados de frequ�ncia
      const attendanceData = await db
        .select({
          id: attendance.id,
          studentId: attendance.studentId,
          status: attendance.status,
          date: attendance.date
        })
        .from(attendance);

      console.log('?? Registros de frequ�ncia:', attendanceData.length);

      // Buscar turmas
      const classesData = await db
        .select({
          id: classes.id,
          name: classes.name,
          grade: classes.grade,
          section: classes.section
        })
        .from(classes);

      console.log('?? Turmas encontradas:', classesData.length);

      // Calcular m�tricas de performance por professor
      const teacherPerformance = teachersData.map(teacher => {
        const teacherActivities = activitiesData.filter(act => act.teacherId === teacher.id);
        const teacherExams = examsData.filter(exam => exam.teacherId === teacher.id);
        
        const approvedActivities = teacherActivities.filter(act => 
          act.status === 'active' || act.status === 'approved'
        ).length;
        
        const completedExams = teacherExams.filter(exam => 
          exam.status === 'completed'
        ).length;
        
        // Calcular performance baseada em atividades aprovadas e provas completadas
        const totalTasks = teacherActivities.length + teacherExams.length;
        const completedTasks = approvedActivities + completedExams;
        
        // Se o professor n�o tem nenhuma tarefa, performance deve ser baixa
        let performance;
        if (totalTasks === 0) {
          performance = 0; // Professores inativos t�m performance 0
        } else {
          performance = (completedTasks / totalTasks) * 10;
        }
        
        return {
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          status: teacher.status,
          performance: Math.round(performance * 10) / 10,
          activities: teacherActivities.length,
          approvedActivities,
          exams: teacherExams.length,
          completedExams,
          totalTasks,
          completedTasks
        };
      });

      // Calcular m�tricas gerais
      const totalActivities = activitiesData.length;
      const totalExams = examsData.length;
      const totalStudents = studentsData.length;
      const totalTeachers = teachersData.length;
      
      const approvedActivities = activitiesData.filter(act => 
        act.status === 'active' || act.status === 'approved'
      ).length;
      
      const completedExams = examsData.filter(exam => 
        exam.status === 'completed'
      ).length;
      
      const approvalRate = totalActivities > 0 ? (approvedActivities / totalActivities) * 100 : 0;
      const avgPerformance = teacherPerformance.length > 0 ? 
        teacherPerformance.reduce((acc, teacher) => acc + teacher.performance, 0) / teacherPerformance.length : 0;

      // Calcular dados de frequ�ncia
      const attendanceStats = {
        general: {
          totalRecords: attendanceData.length,
          presentRecords: attendanceData.filter(att => att.status === 'present').length,
          overallAttendanceRate: attendanceData.length > 0 ? 
            (attendanceData.filter(att => att.status === 'present').length / attendanceData.length) * 100 : 0
        },
        byClass: classesData.map(cls => {
          const classStudentIds = studentClassData
            .filter(sc => sc.classId === cls.id)
            .map(sc => sc.studentId);
          const classStudents = studentsData.filter(student => classStudentIds.includes(student.id));
          const classAttendance = attendanceData.filter(att => classStudentIds.includes(att.studentId));
          const presentRecords = classAttendance.filter(att => att.status === 'present').length;
          
          return {
            classId: cls.id,
            className: `${cls.grade}� ${cls.section}`,
            totalStudents: classStudents.length,
            totalRecords: classAttendance.length,
            attendanceRate: classAttendance.length > 0 ? (presentRecords / classAttendance.length) * 100 : 0
          };
        }),
        lowAttendanceStudents: studentsData.map(student => {
          const studentAttendance = attendanceData.filter(att => att.studentId === student.id);
          const presentCount = studentAttendance.filter(att => att.status === 'present').length;
          const attendanceRate = studentAttendance.length > 0 ? (presentCount / studentAttendance.length) * 100 : 0;
          
          const studentClassRelation = studentClassData.find(sc => sc.studentId === student.id);
          const studentClass = studentClassRelation ? 
            classesData.find(cls => cls.id === studentClassRelation.classId) : null;
          
          return {
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            className: studentClass ? `${studentClass.grade}� ${studentClass.section}` : 'Sem turma',
            presentCount,
            totalClasses: studentAttendance.length,
            attendanceRate
          };
        }).filter(student => student.attendanceRate < 70 && student.totalClasses > 0)
      };

      const response = {
        success: true,
        data: {
          summary: {
            totalActivities,
            totalExams,
            totalStudents,
            totalTeachers,
            approvedActivities,
            completedExams,
            approvalRate: Math.round(approvalRate * 10) / 10,
            avgPerformance: Math.round(avgPerformance * 10) / 10
          },
          teacherPerformance,
          attendanceStats,
          recentActivities: activitiesData
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5),
          upcomingExams: examsData
            .filter(exam => new Date(exam.examDate) > new Date())
            .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
            .slice(0, 5)
        }
      };

      console.log(`? Dados de performance calculados: ${totalTeachers} professores, ${totalActivities} atividades, ${totalExams} provas`);
      res.json(response);

    } catch (error) {
      console.error('? Erro ao buscar dados de performance:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // === ROTAS DE ATIVIDADES PARA COORDENADOR ===

  // === ROTAS DE PROVAS ===
  
  // Marcar prova como conclu�da (DEVE VIR ANTES DAS OUTRAS ROTAS)
  app.patch('/api/exams/:id/complete', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      console.log("?? [API] Marcando prova como conclu�da:", id);
      console.log("?? [API] Usu�rio:", user?.firstName, user?.lastName, user?.role);

      // Verificar se a prova existe e pertence ao professor
      const examData = await db
        .select({ 
          id: exams.id,
          title: exams.title,
          teacherId: exams.teacherId,
          status: exams.status
        })
        .from(exams)
        .where(eq(exams.id, id))
        .limit(1);

      if (examData.length === 0) {
        return res.status(404).json({ message: "Prova n�o encontrada" });
      }

      if (user.role !== 'teacher' || examData[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Verificar se a prova j� est� conclu�da
      if (examData[0].status === 'completed') {
        return res.status(400).json({ message: "Prova j� est� marcada como conclu�da" });
      }

      // Atualizar status da prova para 'completed'
      await db
        .update(exams)
        .set({ 
          status: 'completed',
          updatedAt: new Date().toISOString()
        })
        .where(eq(exams.id, id));

      console.log("? Prova marcada como conclu�da:", examData[0].title);
      
      // Log prova conclu�da
      logger.examCompleted(user, examData[0].title, req);
      
      res.json({ 
        success: true,
        message: "Prova marcada como conclu�da com sucesso",
        exam: {
          id: examData[0].id,
          title: examData[0].title,
          status: 'completed'
        }
      });
    } catch (error) {
      console.error('? Erro ao marcar prova como conclu�da:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Listar provas do professor
  app.get('/api/exams/teacher/:teacherId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;

      if (user.role !== 'teacher' || user.id !== teacherId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      console.log("Buscando provas do professor: " + teacherId);

      const examsData = await db
        .select({
          id: exams.id,
          title: exams.title,
          description: exams.description,
          examDate: exams.examDate,
          duration: exams.duration,
          totalPoints: exams.totalPoints,
          semester: exams.semester,
          bimonthly: exams.bimonthly,
          status: exams.status,
          createdAt: exams.createdAt,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(exams)
        .leftJoin(subjects, eq(exams.subjectId, subjects.id))
        .leftJoin(classes, eq(exams.classId, classes.id))
        .where(eq(exams.teacherId, teacherId))
        .orderBy(desc(exams.examDate));

      console.log("Encontradas " + examsData.length + " provas do professor");
      res.json(examsData);
    } catch (error) {
      console.error('Erro ao buscar provas do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar nova prova
  app.post('/api/exams', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const user = req.user as any;
      const { title, description, subjectId, classId, examDate, duration, totalPoints, semester, bimonthly } = req.body;

      if (user.role !== 'teacher') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      console.log("Criando nova prova: " + title);
      console.log("Dados recebidos:", { title, description, subjectId, classId, examDate, duration, totalPoints, semester, bimonthly });

      const examId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newExam = {
        id: examId,
        title,
        description,
        subjectId,
        classId,
        teacherId: user.id,
        examDate,
        duration: duration || null,
        totalPoints: totalPoints || 10,
        semester,
        bimonthly,
        status: 'scheduled',
        createdAt: now,
        updatedAt: now
      };

      await db.insert(exams).values(newExam);

      // Criar registros de notas para todos os alunos da turma
      const students = await db
        .select({ id: users.id })
        .from(users)
        .innerJoin(studentClass, eq(users.id, studentClass.studentId))
        .where(and(
          eq(studentClass.classId, classId),
          eq(studentClass.status, 'active')
        ));

      const examGradesData = students.map(student => ({
        id: crypto.randomUUID(),
        examId,
        studentId: student.id,
        grade: null,
        isPresent: true,
        observations: null,
        gradedBy: null,
        gradedAt: null,
        createdAt: now,
        updatedAt: now
      }));

      if (examGradesData.length > 0) {
        await db.insert(examGrades).values(examGradesData);
        
        // Log lan�amento de notas
        for (const grade of examGradesData) {
          logger.gradeAdded(user, `Aluno ${grade.studentId}`, grade.grade || 0, req);
        }
      }

      console.log("Prova criada com sucesso: " + title);
      
      // Log cria��o de prova
      logger.examCreated(user, title, req);
      
      res.status(201).json({ message: "Prova criada com sucesso", data: newExam });
    } catch (error) {
      console.error('Erro ao criar prova:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar detalhes de uma prova
  app.get('/api/exams/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      console.log("Buscando detalhes da prova: " + id);

      const examData = await db
        .select({
          id: exams.id,
          title: exams.title,
          description: exams.description,
          examDate: exams.examDate,
          duration: exams.duration,
          totalPoints: exams.totalPoints,
          semester: exams.semester,
          bimonthly: exams.bimonthly,
          status: exams.status,
          createdAt: exams.createdAt,
          subjectName: subjects.name,
          className: classes.name,
          teacherId: exams.teacherId
        })
        .from(exams)
        .leftJoin(subjects, eq(exams.subjectId, subjects.id))
        .leftJoin(classes, eq(exams.classId, classes.id))
        .where(eq(exams.id, id))
        .limit(1);

      if (examData.length === 0) {
        return res.status(404).json({ message: "Prova n�o encontrada" });
      }

      const exam = examData[0];

      // Verificar se o professor pode acessar esta prova
      if (user.role !== 'teacher' || exam.teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar notas dos alunos
      const gradesData = await db
        .select({
          id: examGrades.id,
          studentId: examGrades.studentId,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          grade: examGrades.grade,
          isPresent: examGrades.isPresent,
          observations: examGrades.observations,
          gradedAt: examGrades.gradedAt
        })
        .from(examGrades)
        .leftJoin(users, eq(examGrades.studentId, users.id))
        .where(eq(examGrades.examId, id))
        .orderBy(users.firstName);

      // Se n�o h� notas ainda, buscar todos os alunos da turma e criar entradas
      if (gradesData.length === 0) {
        console.log("Nenhuma nota encontrada, buscando alunos da turma...");
        console.log("Exam ID:", id);
        console.log("Exam Class ID:", exam.classId);
        
        // Buscar todos os alunos da turma
        const students = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName
          })
          .from(users)
          .innerJoin(studentClass, eq(users.id, studentClass.studentId))
          .where(and(
            eq(studentClass.classId, exam.classId),
            eq(studentClass.status, 'active')
          ))
          .orderBy(users.firstName);

        console.log(`Encontrados ${students.length} alunos na turma ${exam.classId}`);
        console.log("Alunos encontrados:", JSON.stringify(students, null, 2));

        // Se n�o encontrou alunos, vamos verificar se a turma existe
        if (students.length === 0) {
          console.log("Verificando se a turma existe...");
          const classCheck = await db
            .select()
            .from(classes)
            .where(eq(classes.id, exam.classId))
            .limit(1);
          
          console.log("Turma encontrada:", JSON.stringify(classCheck, null, 2));
          
          // Verificar todas as vincula��es aluno-turma
          const allStudentClassLinks = await db
            .select({
              studentId: studentClass.studentId,
              classId: studentClass.classId,
              status: studentClass.status,
              studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
              className: classes.name
            })
            .from(studentClass)
            .leftJoin(users, eq(studentClass.studentId, users.id))
            .leftJoin(classes, eq(studentClass.classId, classes.id));
          
          console.log("Todas as vincula��es aluno-turma:", JSON.stringify(allStudentClassLinks, null, 2));
        }

        // Criar entradas de notas para todos os alunos
        const now = new Date().toISOString();
        const examGradesData = students.map(student => ({
          id: crypto.randomUUID(),
          examId: id,
          studentId: student.id,
          grade: null,
          isPresent: true,
          observations: null,
          gradedBy: null,
          gradedAt: null,
          createdAt: now,
          updatedAt: now
        }));

        if (examGradesData.length > 0) {
          await db.insert(examGrades).values(examGradesData);
          console.log(`Criadas ${examGradesData.length} entradas de notas`);
        }

        // Buscar novamente as notas ap�s criar as entradas
        const newGradesData = await db
        .select({
          id: examGrades.id,
          studentId: examGrades.studentId,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          grade: examGrades.grade,
          isPresent: examGrades.isPresent,
          observations: examGrades.observations,
          gradedAt: examGrades.gradedAt
        })
        .from(examGrades)
        .leftJoin(users, eq(examGrades.studentId, users.id))
        .where(eq(examGrades.examId, id))
        .orderBy(users.firstName);

        res.json({
          ...exam,
          grades: newGradesData
        });
      } else {
      res.json({
        ...exam,
        grades: gradesData
      });
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da prova:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar notas de uma prova
  app.put('/api/exams/:id/grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const { grades } = req.body;
      const user = req.user as any;

      console.log("Atualizando notas da prova: " + id);

      // Verificar se a prova existe e pertence ao professor
      const examData = await db
        .select({ teacherId: exams.teacherId })
        .from(exams)
        .where(eq(exams.id, id))
        .limit(1);

      if (examData.length === 0) {
        return res.status(404).json({ message: "Prova n�o encontrada" });
      }

      if (user.role !== 'teacher' || examData[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const now = new Date().toISOString();

      // Atualizar cada nota
      for (const gradeData of grades) {
        await db
          .update(examGrades)
          .set({
            grade: gradeData.grade,
            isPresent: gradeData.isPresent,
            observations: gradeData.observations || null,
            gradedBy: user.id,
            gradedAt: now,
            updatedAt: now
          })
          .where(eq(examGrades.id, gradeData.id));
      }

      console.log("Notas atualizadas com sucesso para a prova: " + id);
      res.json({ message: "Notas atualizadas com sucesso" });
    } catch (error) {
      console.error('Erro ao atualizar notas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar prova
  app.delete('/api/exams/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      console.log("Deletando prova: " + id);

      // Verificar se a prova existe e pertence ao professor
      const examData = await db
        .select({ teacherId: exams.teacherId, title: exams.title })
        .from(exams)
        .where(eq(exams.id, id))
        .limit(1);

      if (examData.length === 0) {
        return res.status(404).json({ message: "Prova n�o encontrada" });
      }

      if (user.role !== 'teacher' || examData[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Deletar notas da prova
      await db.delete(examGrades).where(eq(examGrades.examId, id));
      
      // Deletar a prova
      await db.delete(exams).where(eq(exams.id, id));

      console.log("Prova deletada com sucesso: " + examData[0].title);
      res.json({ message: "Prova deletada com sucesso" });
    } catch (error) {
      console.error('Erro ao deletar prova:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });


  // Buscar alunos de uma turma para coordenador
  app.get('/api/coordinator/classes/:classId/students', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const { classId } = req.params;
      const user = req.user as any;

      console.log("Buscando alunos da turma para coordenador: " + classId);

      // Buscar alunos da turma
      const studentsResult = await client.execute(`
        SELECT 
          u.id,
          u.firstName,
          u.lastName,
          u.email,
          u.phone,
          u.status,
          sc.enrollmentDate,
          sc.status as enrollmentStatus
        FROM studentClass sc
        INNER JOIN users u ON sc.studentId = u.id
        WHERE sc.classId = ? AND sc.status = 'active'
        ORDER BY u.firstName, u.lastName
      `, [classId]);

      const students = studentsResult.rows;
      console.log(`Encontrados ${students.length} alunos na turma ${classId}`);

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      console.error('Erro ao buscar alunos da turma:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Buscar alunos de uma turma
  app.get('/api/classes/:classId/students', isAuthenticated, hasRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { classId } = req.params;
      const user = req.user as any;

      console.log("Buscando alunos da turma: " + classId);

      const students = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          enrollmentDate: studentClass.enrollmentDate,
          status: studentClass.status
        })
        .from(users)
        .innerJoin(studentClass, eq(users.id, studentClass.studentId))
        .where(and(
          eq(studentClass.classId, classId),
          eq(studentClass.status, 'active')
        ))
        .orderBy(users.firstName);

      console.log("Encontrados " + students.length + " alunos na turma");
      console.log("Dados dos alunos:", JSON.stringify(students, null, 2));
      res.json(students);
    } catch (error) {
      console.error('Erro ao buscar alunos da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar provas do aluno
  app.get('/api/student/exams', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user as any;

      console.log("Buscando provas do aluno: " + user.id);

      // Buscar turma do aluno
      const studentClassData = await db
        .select({ classId: studentClass.classId })
        .from(studentClass)
        .where(and(
          eq(studentClass.studentId, user.id),
          eq(studentClass.status, 'active')
        ))
        .limit(1);

      console.log("Dados da turma do aluno:", studentClassData);

      if (studentClassData.length === 0) {
        console.log("Aluno n�o tem turma ativa");
        return res.json([]);
      }

      const classId = studentClassData[0].classId;
      console.log("ID da turma do aluno:", classId);

      // Buscar provas da turma do aluno
      const examsData = await db
        .select({
          id: exams.id,
          title: exams.title,
          description: exams.description,
          examDate: exams.examDate,
          subjectId: exams.subjectId,
          subjectName: subjects.name,
          bimonthly: exams.bimonthly,
          semester: exams.semester,
          totalPoints: exams.totalPoints,
          createdAt: exams.createdAt
        })
        .from(exams)
        .innerJoin(subjects, eq(exams.subjectId, subjects.id))
        .where(eq(exams.classId, classId))
        .orderBy(desc(exams.examDate));

      // Buscar notas do aluno para cada prova usando SQL direto
      const examsWithGrades = await Promise.all(
        examsData.map(async (exam) => {
          const gradeResult = await client.execute(`
            SELECT grade, isPresent, updatedAt as gradedAt
            FROM examGrades 
            WHERE examId = ? AND studentId = ? AND grade IS NOT NULL
            ORDER BY updatedAt DESC
            LIMIT 1
          `, [exam.id, user.id]);

          const grade = gradeResult.rows.length > 0 ? {
            grade: gradeResult.rows[0].grade,
            isPresent: gradeResult.rows[0].isPresent,
            gradedAt: gradeResult.rows[0].gradedAt
          } : null;

          return {
            ...exam,
            grade: grade
          };
        })
      );

      console.log("Encontradas " + examsWithGrades.length + " provas do aluno");
      console.log("Provas encontradas:", JSON.stringify(examsWithGrades, null, 2));
      res.json(examsWithGrades);
    } catch (error) {
      console.error('Erro ao buscar provas do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar eventos do calend�rio (provas e atividades)
  app.get('/api/calendar/events', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { startDate, endDate } = req.query;

      console.log("Buscando eventos do calend�rio para:", user.id, 'Role:', user.role);
      console.log("Par�metros de data:", { startDate, endDate });

      const events = [];

      if (user.role === 'student') {
        // Para alunos: buscar provas da turma
        const studentClassData = await db
          .select({ classId: studentClass.classId })
          .from(studentClass)
          .where(and(
            eq(studentClass.studentId, user.id),
            eq(studentClass.status, 'active')
          ))
          .limit(1);

        if (studentClassData.length > 0) {
          const classId = studentClassData[0].classId;
          console.log(`Turma do aluno: ${classId}`);
          
          // Buscar provas da turma (sem filtros de data por enquanto)
          const examsData = await db
            .select({
              id: exams.id,
              title: exams.title,
              description: exams.description,
              examDate: exams.examDate,
              subjectName: subjects.name,
              bimonthly: exams.bimonthly,
              totalPoints: exams.totalPoints,
              type: sql<string>`'exam'`.as('type')
            })
            .from(exams)
            .innerJoin(subjects, eq(exams.subjectId, subjects.id))
            .where(eq(exams.classId, classId));

          events.push(...examsData.map(exam => ({
            ...exam,
            date: exam.examDate,
            color: '#ef4444',
            icon: '??',
            startTime: '08:00',
            endTime: '10:00',
            className: '9� A',
            totalPoints: exam.totalPoints,
            duration: exam.duration || 90,
            bimonthly: exam.bimonthly
          })));

          console.log(`Encontradas ${examsData.length} provas para o aluno`);
          console.log('Provas encontradas:', examsData.map(exam => ({ title: exam.title, date: exam.examDate })));

          // Buscar atividades da turma (sem filtros de data por enquanto)
        const activitiesData = await db
          .select({
            id: activities.id,
            title: activities.title,
            description: activities.description,
            dueDate: activities.dueDate,
            subjectName: subjects.name,
            type: sql<string>`'activity'`.as('type')
          })
          .from(activities)
          .innerJoin(subjects, eq(activities.subjectId, subjects.id))
            .where(eq(activities.classId, classId));

        events.push(...activitiesData.map(activity => ({
          ...activity,
          date: activity.dueDate,
          color: '#3b82f6',
          icon: '??',
          startTime: '14:00',
          endTime: '16:00',
          className: '9� A',
          duration: 120
        })));

          console.log(`Encontradas ${activitiesData.length} atividades para o aluno`);
          console.log('Atividades encontradas:', activitiesData.map(activity => ({ title: activity.title, date: activity.dueDate })));
        }

      } else if (user.role === 'teacher') {
        // Para professores: buscar provas e atividades criadas por eles
        const teacherExamsData = await db
          .select({
            id: exams.id,
            title: exams.title,
            description: exams.description,
            examDate: exams.examDate,
            subjectName: subjects.name,
            bimonthly: exams.bimonthly,
            totalPoints: exams.totalPoints,
            type: sql<string>`'exam'`.as('type')
          })
          .from(exams)
          .innerJoin(subjects, eq(exams.subjectId, subjects.id))
          .where(and(
            eq(exams.teacherId, user.id),
            startDate ? gte(exams.examDate, new Date(startDate as string)) : undefined,
            endDate ? lte(exams.examDate, new Date(endDate as string)) : undefined
          ));

        events.push(...teacherExamsData.map(exam => ({
          ...exam,
          date: exam.examDate,
          color: '#ef4444',
          icon: '??'
        })));

        const teacherActivitiesData = await db
          .select({
            id: activities.id,
            title: activities.title,
            description: activities.description,
            dueDate: activities.dueDate,
            subjectName: subjects.name,
            type: sql<string>`'activity'`.as('type')
          })
          .from(activities)
          .innerJoin(subjects, eq(activities.subjectId, subjects.id))
          .where(and(
            eq(activities.teacherId, user.id),
            startDate ? gte(activities.dueDate, new Date(startDate as string)) : undefined,
            endDate ? lte(activities.dueDate, new Date(endDate as string)) : undefined
          ));

        events.push(...teacherActivitiesData.map(activity => ({
          ...activity,
          date: activity.dueDate,
          color: '#3b82f6',
          icon: '??'
        })));
      }

      // Buscar eventos globais (ativos) para todos os usu�rios
      const globalEventsData = await client.execute(`
        SELECT 
          e.*,
          u.firstName || ' ' || u.lastName as creatorName,
          c.name as className,
          s.name as subjectName
        FROM events e
        LEFT JOIN users u ON e.createdBy = u.id
        LEFT JOIN classes c ON e.classId = c.id
        LEFT JOIN subjects s ON e.subjectId = s.id
        WHERE e.status = 'active'
        ${startDate && endDate ? 'AND DATE(e.startDate) >= ? AND DATE(e.startDate) <= ?' : ''}
        ORDER BY e.startDate DESC
      `, startDate && endDate ? [startDate, endDate] : []);

      const globalEvents = globalEventsData.rows.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.startDate,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        type: event.type,
        color: event.color || '#F97316',
        icon: event.type === 'exam' ? '??' : event.type === 'homework' ? '??' : '??',
        location: event.location,
        className: event.className,
        subjectName: event.subjectName,
        creatorName: event.creatorName,
        isGlobal: true
      }));

      events.push(...globalEvents);

      console.log("Encontrados " + events.length + " eventos do calend�rio (" + (events.length - globalEvents.length) + " espec�ficos + " + globalEvents.length + " globais)");
      res.json(events);
    } catch (error) {
      console.error('Erro ao buscar eventos do calend�rio:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  
  console.log("Rotas de provas registradas!");

  // GET /api/admin/classes/:id/details - Buscar detalhes completos de uma turma
  app.get('/api/admin/classes/:id/details', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      console.log("Detalhes da turma " + id + " solicitados por: " + user.firstName + " " + user.lastName);

      // Buscar informa��es b�sicas da turma
      const classInfo = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (!classInfo || classInfo.length === 0) {
        return res.status(404).json({ message: "Turma n�o encontrada" });
      }

      // Buscar alunos da turma
      const students = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          status: users.status,
          registrationNumber: users.registrationNumber
        })
        .from(users)
        .innerJoin(studentClass, eq(users.id, studentClass.studentId))
        .where(eq(studentClass.classId, id));

      // Buscar professores da turma
      const teachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          subjectName: subjects.name
        })
        .from(users)
        .innerJoin(teacherClasses, eq(users.id, teacherClasses.teacherId))
        .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
        .where(eq(teacherClasses.classId, id));

      // Buscar atividades da turma
      const activities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          dueDate: activities.dueDate,
          status: activities.status,
          subjectName: subjects.name,
          teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('teacherName')
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(users, eq(activities.teacherId, users.id))
        .where(eq(activities.classId, id))
        .orderBy(desc(activities.createdAt))
        .limit(10);

      // Montar resposta
      const classDetails = {
        class: classInfo[0],
        students: students,
        teachers: teachers,
        activities: activities
      };

      console.log("Detalhes da turma " + id + " retornados com sucesso");
      res.json(classDetails);
    } catch (error) {
      console.error('Erro ao buscar detalhes da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  console.log("Rotas de provas registradas!");

  // GET /api/admin/classes/:id/details - Buscar detalhes completos de uma turma
  app.get('/api/admin/classes/:id/details', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      console.log("Detalhes da turma " + id + " solicitados por: " + user.firstName + " " + user.lastName);

      // Buscar informa��es b�sicas da turma
      const classInfo = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (!classInfo || classInfo.length === 0) {
        return res.status(404).json({ message: "Turma n�o encontrada" });
      }

      // Buscar alunos da turma
      const students = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          status: users.status,
          registrationNumber: users.registrationNumber
        })
        .from(users)
        .innerJoin(studentClass, eq(users.id, studentClass.studentId))
        .where(eq(studentClass.classId, id));

      // Buscar professores da turma
      const teachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          subjectName: subjects.name
        })
        .from(users)
        .innerJoin(teacherClasses, eq(users.id, teacherClasses.teacherId))
        .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
        .where(eq(teacherClasses.classId, id));

      // Buscar atividades da turma
      const activities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          dueDate: activities.dueDate,
          status: activities.status,
          subjectName: subjects.name,
          teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('teacherName')
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(users, eq(activities.teacherId, users.id))
        .where(eq(activities.classId, id))
        .orderBy(desc(activities.createdAt))
        .limit(10);

      // Montar resposta
      const classDetails = {
        class: classInfo[0],
        students: students,
        teachers: teachers,
        activities: activities
      };

      console.log("Detalhes da turma " + id + " retornados com sucesso");
      res.json(classDetails);
    } catch (error) {
      console.error('Erro ao buscar detalhes da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  console.log("Rotas de provas registradas!");

  // GET /api/admin/classes/:id/details - Buscar detalhes completos de uma turma
  app.get('/api/admin/classes/:id/details', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      console.log("Detalhes da turma " + id + " solicitados por: " + user.firstName + " " + user.lastName);

      // Buscar informa��es b�sicas da turma
      const classInfo = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (!classInfo || classInfo.length === 0) {
        return res.status(404).json({ message: "Turma n�o encontrada" });
      }

      // Buscar alunos da turma
      const students = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          status: users.status,
          registrationNumber: users.registrationNumber
        })
        .from(users)
        .innerJoin(studentClass, eq(users.id, studentClass.studentId))
        .where(eq(studentClass.classId, id));

      // Buscar professores da turma
      const teachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          subjectName: subjects.name
        })
        .from(users)
        .innerJoin(teacherClasses, eq(users.id, teacherClasses.teacherId))
        .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
        .where(eq(teacherClasses.classId, id));

      // Buscar atividades da turma
      const activities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          dueDate: activities.dueDate,
          status: activities.status,
          subjectName: subjects.name,
          teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('teacherName')
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(users, eq(activities.teacherId, users.id))
        .where(eq(activities.classId, id))
        .orderBy(desc(activities.createdAt))
        .limit(10);

      // Montar resposta
      const classDetails = {
        class: classInfo[0],
        students: students,
        teachers: teachers,
        activities: activities
      };

      console.log("Detalhes da turma " + id + " retornados com sucesso");
      res.json(classDetails);
    } catch (error) {
      console.error('Erro ao buscar detalhes da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTA DE IA PARA PROFESSORES =====
  
  // Chat com IA para assist�ncia educacional usando Ollama
  app.post('/api/ai/chat', isAuthenticated, hasRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { message, context } = req.body;
      const user = req.user as any;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Mensagem � obrigat�ria" });
      }

      console.log(`?? Chat com IA solicitado por: ${user.firstName} ${user.lastName}`);
      console.log(`?? Mensagem: ${message.substring(0, 100)}...`);

      // Detectar sauda��es simples para respostas curtas
      const simpleGreetings = ['ol�', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi', 'hey'];
      const isSimpleGreeting = simpleGreetings.some(greeting => 
        message.toLowerCase().trim().includes(greeting.toLowerCase())
      );

      let educationalPrompt;
      
      if (isSimpleGreeting) {
        educationalPrompt = `Voc� � um assistente de IA educacional amig�vel e inteligente. Responda de forma breve, natural e �til em portugu�s brasileiro.

Mensagem: ${message}

Responda de forma conversacional e ofere�a ajuda espec�fica:`;
      } else {
        educationalPrompt = `Voc� � um assistente de IA educacional especializado em ajudar professores brasileiros. Seja inteligente, natural e responda a QUALQUER pergunta relacionada ao ensino.

IMPORTANTE: 
- Responda de forma natural e conversacional, como um GPT real
- Use portugu�s brasileiro
- Seja pr�tico e aplic�vel
- Use formata��o markdown quando apropriado
- Seja espec�fico e �til
- Responda a TUDO que for perguntado, n�o importa o assunto

Contexto do usu�rio: Professor(a) ${user.firstName}
Pergunta: ${message}

Responda de forma inteligente e natural:`;
      }

      try {
        // Tentar diferentes modelos do Ollama
        const models = ['llama3.2:3b', 'gemma3:4b', 'openhermes:latest'];
        let aiResponse = '';
        let usedModel = '';

        for (const model of models) {
          try {
            console.log(`?? Tentando modelo: ${model}`);
            
        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
                model: model,
            prompt: educationalPrompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
                  max_tokens: 1500,
                  num_predict: 1500
            }
          }),
        });

            if (ollamaResponse.ok) {
              const ollamaData = await ollamaResponse.json();
              aiResponse = ollamaData.response || 'Desculpe, n�o consegui gerar uma resposta adequada.';
              usedModel = model;
              console.log(`? Resposta da IA gerada com sucesso usando ${model} (${aiResponse.length} caracteres)`);
              break;
            }
          } catch (modelError) {
            console.log(`? Modelo ${model} falhou:`, modelError.message);
            continue;
          }
        }

        if (aiResponse) {
        res.json({ 
          response: aiResponse,
            model: usedModel,
          timestamp: new Date().toISOString()
        });
          return;
        }

        throw new Error('Todos os modelos do Ollama falharam');

      } catch (ollamaError) {
        console.error('? Erro na integra��o com Ollama:', ollamaError);
        
        // Fallback para resposta simulada se Ollama n�o estiver dispon�vel
        let fallbackResponse = "";

        // Detectar perguntas espec�ficas sobre fra��es
        if (message.toLowerCase().includes('fra��o') || message.toLowerCase().includes('fra��es')) {
          fallbackResponse = `# ?? Como Apresentar Fra��es de Forma Did�tica

## ?? **Estrat�gias Visuais**

### 1. **Uso de Materiais Concretos**
- **Pizza dividida**: Corte uma pizza em peda�os iguais
- **Barras de chocolate**: Divida em partes iguais
- **Folhas de papel**: Dobre e corte em fra��es
- **Blocos de constru��o**: Use pe�as para representar partes

### 2. **Representa��o Gr�fica**
- **C�rculos divididos**: Desenhe c�rculos e pinte partes
- **Ret�ngulos**: Divida em se��es iguais
- **Linha num�rica**: Mostre fra��es como pontos na reta

## ?? **Sequ�ncia Did�tica Recomendada**

### **Aula 1: Conceito de Fra��o**
1. **Motiva��o**: "Quantos peda�os de pizza cada pessoa come?"
2. **Apresenta��o**: Mostre objetos divididos em partes iguais
3. **Pr�tica**: Alunos dividem folhas de papel

### **Aula 2: Numerador e Denominador**
1. **Explica��o**: "Denominador = quantas partes iguais" / "Numerador = quantas partes pegamos"
2. **Exemplos visuais**: 3/4 = tr�s partes de quatro
3. **Atividade**: Alunos criam suas pr�prias fra��es

### **Aula 3: Fra��es Equivalentes**
1. **Descoberta**: Mostre que 1/2 = 2/4 = 4/8
2. **Manipula��o**: Use materiais para comprovar
3. **Regra**: Multiplicar numerador e denominador pelo mesmo n�mero

## ?? **Atividades Pr�ticas**

### **Jogo da Mem�ria**
- Cartas com fra��es visuais e num�ricas
- Alunos fazem pares correspondentes

### **Bingo das Fra��es**
- Cartelas com fra��es diferentes
- Professor sorteia n�meros decimais ou percentuais

### **Constru��o de Fra��es**
- Alunos criam fra��es usando materiais diversos
- Apresentam para a turma explicando

## ?? **Dicas Importantes**

- **Comece sempre com o concreto** antes do abstrato
- **Use linguagem simples**: "partes iguais" em vez de "divis�o"
- **Conecte com situa��es reais**: receitas, medidas, tempo
- **Permita erros**: s�o oportunidades de aprendizado
- **Celebre descobertas**: "Voc� descobriu uma fra��o equivalente!"

## ?? **Avalia��o Sugerida**

- **Observa��o**: Como os alunos manipulam os materiais
- **Atividades pr�ticas**: Cria��o de fra��es com materiais
- **Autoavalia��o**: "O que aprendi sobre fra��es hoje?"

**Precisa de mais detalhes sobre alguma dessas estrat�gias?**`;

        } else if (message.toLowerCase().includes('atividade') || message.toLowerCase().includes('exerc�cio')) {
          fallbackResponse = `# ?? Sugest�es de Atividades Educacionais

## Atividades Interativas:
- **Quiz gamificado** com Kahoot ou similar
- **Debates estruturados** em grupos pequenos  
- **Projetos colaborativos** com apresenta��es
- **Estudos de caso** pr�ticos

## ?? Metodologias Ativas:
- **Sala de aula invertida**
- **Aprendizagem baseada em problemas**
- **Rota��o por esta��es**
- **Peer instruction** (ensino entre pares)

## ?? Dicas Pr�ticas:
- Varie os tipos de atividade para atender diferentes estilos de aprendizagem
- Use tecnologia como aliada, n�o como substituta
- Inclua momentos de reflex�o e autoavalia��o
- Conecte o conte�do com situa��es do cotidiano

**Precisa de algo mais espec�fico para sua disciplina ou faixa et�ria?**`;

        } else if (message.toLowerCase().includes('plano de aula') || message.toLowerCase().includes('planejamento')) {
          fallbackResponse = `# ?? Estrutura de Plano de Aula Eficaz

## 1. **Objetivos de Aprendizagem** (5 min)
- O que os alunos devem saber/fazer ao final?
- Use verbos mensur�veis (identificar, explicar, aplicar)

## 2. **Motiva��o/Gancho** (10 min)
- Pergunta provocativa
- V�deo curto relacionado
- Situa��o-problema

## 3. **Desenvolvimento** (25 min)
- Apresenta��o do conte�do
- Exemplos pr�ticos
- Intera��o com os alunos

## 4. **Atividade Pr�tica** (15 min)
- Exerc�cios individuais ou em grupo
- Aplica��o do conhecimento

## 5. **Fechamento** (5 min)
- S�ntese dos pontos principais
- Pr�ximos passos

> **?? Dica:** Sempre tenha um "Plano B" para atividades que podem n�o funcionar como esperado!

**Qual disciplina voc� est� planejando?**`;

        } else if (message.toLowerCase().includes('matem�tica') || message.toLowerCase().includes('matematica')) {
          fallbackResponse = `# ?? Estrat�gias para Ensino de Matem�tica

## ?? **Metodologias Eficazes**

### **Aprendizagem Ativa**
- **Resolu��o de problemas** do cotidiano
- **Jogos matem�ticos** educativos
- **Manipula��o de materiais** concretos
- **Trabalho em equipe** colaborativo

### **Tecnologia como Aliada**
- **Calculadoras** para verifica��o
- **Apps educativos** (Khan Academy, GeoGebra)
- **Simula��es** virtuais
- **V�deos explicativos** curtos

## ?? **Sequ�ncia Did�tica**

### **1. Apresenta��o do Problema**
- Contextualize com situa��es reais
- Use linguagem simples e clara
- Mostre exemplos pr�ticos

### **2. Explora��o**
- Permita tentativas e erros
- Facilite descobertas pelos alunos
- Oriente sem dar respostas prontas

### **3. Sistematiza��o**
- Organize o conhecimento descoberto
- Estabele�a regras e padr�es
- Conecte com conhecimentos anteriores

### **4. Aplica��o**
- Exerc�cios variados
- Problemas de diferentes n�veis
- Conex�o com outras disciplinas

## ?? **Dicas Pr�ticas**

- **Comece sempre com o concreto**
- **Use materiais manipul�veis**
- **Conecte com a vida real**
- **Celebre pequenas conquistas**
- **Permita diferentes estrat�gias de resolu��o**

**Qual t�pico espec�fico de matem�tica voc� gostaria de abordar?**`;

        } else if (message.toLowerCase().includes('ci�ncias') || message.toLowerCase().includes('ciencia')) {
          fallbackResponse = `# ?? Estrat�gias para Ensino de Ci�ncias

## ?? **Metodologia Cient�fica**

### **Investiga��o e Descoberta**
- **Observa��o** sistem�tica de fen�menos
- **Formula��o de hip�teses** pelos alunos
- **Experimentos** simples e seguros
- **An�lise de resultados** coletivos

### **Materiais e Recursos**
- **Microsc�pios** para observa��o
- **Experimentos caseiros** com materiais seguros
- **V�deos cient�ficos** educativos
- **Sa�das de campo** quando poss�vel

## ?? **Temas por Faixa Et�ria**

### **Ensino Fundamental I**
- **Seres vivos** e suas caracter�sticas
- **Meio ambiente** e preserva��o
- **Corpo humano** b�sico
- **Fen�menos naturais** simples

### **Ensino Fundamental II**
- **C�lulas** e organiza��o dos seres vivos
- **F�sica** b�sica (for�as, movimento)
- **Qu�mica** elementar (misturas, solu��es)
- **Astronomia** e sistema solar

## ?? **Atividades Pr�ticas**

### **Experimentos Simples**
- **Germina��o** de sementes
- **Cristaliza��o** de a��car
- **Densidade** com objetos do dia a dia
- **Eletricidade est�tica** com bal�es

### **Projetos Investigativos**
- **Observa��o** de plantas na escola
- **An�lise** da qualidade da �gua
- **Estudo** do clima local
- **Pesquisa** sobre animais da regi�o

## ?? **Dicas Importantes**

- **Sempre priorize a seguran�a**
- **Use linguagem cient�fica adequada**
- **Conecte com situa��es reais**
- **Estimule a curiosidade**
- **Valorize as perguntas dos alunos**

**Que �rea espec�fica das ci�ncias voc� est� trabalhando?**`;

        } else if (message.toLowerCase().includes('avalia��o') || message.toLowerCase().includes('prova')) {
          fallbackResponse = `# ?? Estrat�gias de Avalia��o Eficazes

## Avalia��o Formativa (durante o processo):
- **Observa��o di�ria** do progresso dos alunos
- **Perguntas r�pidas** para verificar compreens�o
- **Exit tickets** ao final da aula
- **Autoavalia��o** dos alunos

## Avalia��o Somativa (resultado final):
- **Provas tradicionais** bem estruturadas
- **Projetos** com crit�rios claros
- **Apresenta��es** orais
- **Portf�lios** de trabalhos

## ?? Dicas para Avalia��es Eficazes:
- **Diversifique** os instrumentos de avalia��o
- **Comunique** os crit�rios claramente
- **Forne�a feedback** construtivo e oportuno
- **Permita** que os alunos se preparem adequadamente

**Que tipo de avalia��o voc� gostaria de desenvolver?**`;

        } else if (message.toLowerCase().includes('opa') || message.toLowerCase().includes('e a�') || message.toLowerCase().includes('eai')) {
          fallbackResponse = `Ol�! ?? 

Como posso ajudar voc� hoje? 

Sou sua assistente de IA educacional e estou aqui para apoiar seu trabalho como professor(a)!

?? Posso ajudar com:
?? Planejamento de Aulas
?? Atividades e Exerc�cios  
?? Avalia��o
?? Gest�o de Sala

Digite sua pergunta espec�fica e eu te darei sugest�es pr�ticas e aplic�veis!

Exemplo: "Como criar uma atividade sobre fra��es para o 5� ano?" ou "Preciso de ideias para avaliar um projeto de ci�ncias"`;

        } else if (message.toLowerCase().includes('equa��o') || message.toLowerCase().includes('equa��es')) {
          fallbackResponse = `# ?? Como Ensinar Equa��es de Forma Simples

## ?? **Abordagem Pr�tica e Visual**

### **1. Comece com Balan�as**
- Use uma balan�a real ou desenhe uma no quadro
- Mostre que os dois lados devem ficar equilibrados
- "Se eu tiro 2 do lado esquerdo, preciso tirar 2 do direito tamb�m"

### **2. Use N�meros Simples**
- Comece com: x + 3 = 7
- Pergunte: "Que n�mero + 3 = 7?"
- Resposta: x = 4
- Sempre verifique: 4 + 3 = 7 ?

### **3. Metodologia Passo a Passo**
1. **Identifique a inc�gnita**: "O que queremos descobrir?"
2. **Isole a inc�gnita**: "Como deixar o x sozinho?"
3. **Fa�a a mesma opera��o nos dois lados**
4. **Verifique a resposta**: Substitua o valor encontrado

## ?? **Exemplos Pr�ticos**

### **Exemplo 1: Adi��o**
x + 5 = 12
- Tire 5 dos dois lados: x + 5 - 5 = 12 - 5
- Resultado: x = 7
- Verifica��o: 7 + 5 = 12 ?

### **Exemplo 2: Subtra��o**
x - 3 = 8
- Some 3 nos dois lados: x - 3 + 3 = 8 + 3
- Resultado: x = 11
- Verifica��o: 11 - 3 = 8 ?

### **Exemplo 3: Multiplica��o**
2x = 10
- Divida por 2 os dois lados: 2x � 2 = 10 � 2
- Resultado: x = 5
- Verifica��o: 2 � 5 = 10 ?

## ?? **Dicas Importantes**
- **Use linguagem simples**: "desconhecido" em vez de "inc�gnita"
- **Sempre verifique**: Substitua o valor encontrado
- **Comece f�cil**: N�meros pequenos e opera��es simples
- **Use analogias**: Balan�a, balde de �gua, etc.

**Que s�rie voc� est� ensinando? Posso adaptar os exemplos!**`;

        } else if (message.toLowerCase().includes('como') && message.toLowerCase().includes('ensinar')) {
          fallbackResponse = `# ?? Estrat�gias de Ensino Eficazes

## ?? **Metodologias Ativas**
- **Aprendizagem baseada em problemas**: Apresente situa��es reais para resolver
- **Sala de aula invertida**: Conte�do em casa, pr�tica na escola
- **Rota��o por esta��es**: Diferentes atividades simult�neas
- **Peer instruction**: Alunos ensinam uns aos outros

## ?? **T�cnicas de Engajamento**
- **Gamifica��o**: Use pontos, badges e competi��es
- **Storytelling**: Conte hist�rias relacionadas ao conte�do
- **Humor**: Use piadas e situa��es engra�adas
- **M�sica**: Crie par�dias ou use ritmos para memoriza��o

## ?? **Dicas Pr�ticas**
- **Varie os m�todos**: N�o use sempre a mesma abordagem
- **Conecte com a vida real**: Mostre aplica��es pr�ticas
- **Use tecnologia**: Apps, v�deos e simula��es
- **Incentive perguntas**: Crie ambiente seguro para d�vidas

**Que disciplina voc� est� ensinando? Posso dar dicas mais espec�ficas!**`;

        } else if (message.toLowerCase().includes('disciplina') || message.toLowerCase().includes('mat�ria')) {
          fallbackResponse = `# ?? Gest�o de Disciplinas Escolares

## ?? **Organiza��o por Disciplina**

### **Planejamento Anual**
- **Objetivos gerais** para o ano letivo
- **Conte�dos essenciais** por bimestre
- **Avalia��es programadas** e crit�rios
- **Recursos necess�rios** (materiais, espa�os)

### **Integra��o Curricular**
- **Projetos interdisciplinares** entre mat�rias
- **Temas transversais** (�tica, meio ambiente)
- **Compet�ncias socioemocionais** integradas
- **Tecnologia** como ferramenta comum

## ?? **Acompanhamento**
- **Registro de progresso** por disciplina
- **Identifica��o de dificuldades** espec�ficas
- **Adapta��o de estrat�gias** conforme necess�rio
- **Comunica��o** com outros professores

**Qual disciplina voc� gostaria de organizar melhor?**`;

        } else if (message.toLowerCase().includes('aluno') || message.toLowerCase().includes('estudante')) {
          fallbackResponse = `# ?? Gest�o de Alunos em Sala de Aula

## ?? **Estrat�gias de Engajamento**

### **Conhe�a seus Alunos**
- **Perfil de aprendizagem**: Visual, auditivo, cinest�sico
- **Interesses pessoais**: Use temas que os motivem
- **Dificuldades espec�ficas**: Adapte o ensino individualmente
- **Pontos fortes**: Valorize e desenvolva talentos

### **Ambiente de Aprendizagem**
- **Sala organizada**: Layout que facilite intera��o
- **Regras claras**: Combinados estabelecidos coletivamente
- **Clima positivo**: Respeito m�tuo e colabora��o
- **Feedback constante**: Reconhecimento e orienta��o

## ?? **Dicas Pr�ticas**
- **Use nomes**: Chame cada aluno pelo nome
- **Fa�a perguntas**: Incentive participa��o ativa
- **Varie atividades**: Diferentes estilos de aprendizagem
- **Celebre conquistas**: Reconhe�a progressos individuais

**Como est� sendo o relacionamento com seus alunos?**`;

        } else if (message.toLowerCase().includes('problema') || message.toLowerCase().includes('dificuldade')) {
          fallbackResponse = `# ?? Resolu��o de Problemas Educacionais

## ?? **Identifica��o do Problema**
- **Observe comportamentos**: Sinais de desinteresse ou dificuldade
- **Analise resultados**: Notas, participa��o, entregas
- **Converse com alunos**: Entenda perspectivas individuais
- **Consulte colegas**: Troque experi�ncias com outros professores

## ?? **Estrat�gias de Solu��o**

### **Para Dificuldades de Aprendizagem**
- **Refor�o individual**: Atendimento personalizado
- **Materiais adaptados**: Recursos diferenciados
- **Parcerias**: Alunos ajudam uns aos outros
- **Comunica��o com fam�lia**: Envolva os respons�veis

### **Para Problemas de Comportamento**
- **Di�logo respeitoso**: Converse em particular
- **Consequ�ncias l�gicas**: Relacionadas ao comportamento
- **Busque causas**: Entenda o que motiva o problema
- **Plano de melhoria**: Estabele�a metas claras

**Qual problema espec�fico voc� est� enfrentando?**`;

        } else if (message.toLowerCase().includes('portugu�s') || message.toLowerCase().includes('portugues') || message.toLowerCase().includes('gram�tica') || message.toLowerCase().includes('gramatica')) {
          fallbackResponse = `# ?? Estrat�gias para Ensino de Portugu�s

## ?? **Abordagem Pr�tica**

### **Leitura e Interpreta��o**
- **Leia em voz alta**: Mostre entona��o e pausas
- **Fa�a perguntas**: "O que voc� entendeu?", "Por que o personagem fez isso?"
- **Conecte com a vida**: "Voc� j� passou por uma situa��o assim?"

### **Gram�tica Contextualizada**
- **Use textos reais**: N�o ensine regras isoladas
- **Exemplos pr�ticos**: "Veja como o autor usa v�rgulas aqui"
- **Exerc�cios criativos**: Pe�a para escreverem usando a regra

### **Escrita Criativa**
- **Comece pequeno**: Frases, depois par�grafos
- **Temas interessantes**: O que os alunos gostam
- **Revis�o colaborativa**: Alunos ajudam uns aos outros

**Que aspecto do portugu�s voc� quer trabalhar?**`;

        } else if (message.toLowerCase().includes('hist�ria') || message.toLowerCase().includes('historia')) {
          fallbackResponse = `# ??? Como Ensinar Hist�ria de Forma Interessante

## ?? **Metodologias Ativas**

### **Storytelling**
- **Conte como uma hist�ria**: "Era uma vez um rei que..."
- **Use dramatiza��o**: Alunos encenam momentos hist�ricos
- **Crie suspense**: "E ent�o, o que voc�s acham que aconteceu?"

### **Conex�es com o Presente**
- **Compare �pocas**: "Como era diferente naquela �poca?"
- **Relacione com a vida**: "Isso ainda acontece hoje?"
- **Use mapas**: Mostre como o mundo mudou

### **Recursos Visuais**
- **Imagens hist�ricas**: Fotografias, pinturas, mapas
- **V�deos curtos**: Document�rios de 5-10 minutos
- **Linha do tempo**: Visualize a sequ�ncia dos eventos

**Que per�odo hist�rico voc� est� trabalhando?**`;

        } else if (message.toLowerCase().includes('geografia') || message.toLowerCase().includes('geo')) {
          fallbackResponse = `# ?? Estrat�gias para Ensino de Geografia

## ?? **Abordagem Pr�tica**

### **Mapas Interativos**
- **Comece local**: "Onde fica nossa escola?"
- **Expanda gradualmente**: Bairro ? Cidade ? Estado ? Pa�s
- **Use tecnologia**: Google Earth, mapas digitais

### **Conex�o com o Cotidiano**
- **Clima local**: "Por que choveu ontem?"
- **Economia**: "De onde vem o que comemos?"
- **Transporte**: "Como chegamos at� aqui?"

### **Atividades Pr�ticas**
- **Construa mapas**: Com materiais simples
- **Sa�das de campo**: Observe o ambiente
- **Pesquisas locais**: Hist�ria do bairro

**Que tema de geografia voc� quer abordar?**`;

        } else if (message.toLowerCase().includes('f�sica') || message.toLowerCase().includes('fisica')) {
          fallbackResponse = `# ? Como Ensinar F�sica de Forma Simples

## ?? **Experimentos Pr�ticos**

### **For�a e Movimento**
- **Carrinho na rampa**: Mostre acelera��o
- **Bola que cai**: Demonstre gravidade
- **P�ndulo simples**: Observe oscila��o

### **Eletricidade B�sica**
- **Circuito simples**: Pilha + fio + l�mpada
- **Eletricidade est�tica**: Bal�o + cabelo
- **�m�s**: Mostre campos magn�ticos

### **Dicas Importantes**
- **Use linguagem simples**: "empurrar" em vez de "for�a"
- **Conecte com o dia a dia**: "Por que o carro freia?"
- **Permita experimenta��o**: Deixe testarem

**Que conceito de f�sica voc� quer explicar?**`;

        } else if (message.toLowerCase().includes('qu�mica') || message.toLowerCase().includes('quimica')) {
          fallbackResponse = `# ?? Estrat�gias para Ensino de Qu�mica

## ?? **Experimentos Seguros**

### **Rea��es Simples**
- **Vinagre + bicarbonato**: Efervesc�ncia
- **Ferro + oxig�nio**: Ferrugem (lento)
- **A��car + calor**: Carameliza��o

### **Estados da Mat�ria**
- **Gelo ? �gua ? Vapor**: Mudan�as de estado
- **Dissolu��o**: Sal na �gua
- **Cristaliza��o**: A��car cristalizado

### **Abordagem Pr�tica**
- **Use analogias**: "�tomos s�o como tijolos"
- **Conecte com cozinha**: "Por que o bolo cresce?"
- **Seguran�a primeiro**: Sempre supervisione

**Que conceito de qu�mica voc� quer trabalhar?**`;

        } else if (message.toLowerCase().includes('atividade') && message.toLowerCase().includes('criativa')) {
          fallbackResponse = `# ?? Ideias de Atividades Criativas

## ?? **Para Qualquer Disciplina**

### **Gamifica��o**
- **Quiz competitivo**: Divida a turma em times
- **Ca�a ao tesouro**: Esconda pistas pela sala
- **Bingo educativo**: Cartelas com conceitos da mat�ria

### **Arte e Criatividade**
- **Desenho explicativo**: Ilustrem o que aprenderam
- **Teatro educativo**: Encenem situa��es hist�ricas ou cient�ficas
- **M�sica**: Criem par�dias sobre o conte�do

### **Tecnologia**
- **V�deos curtos**: Alunos gravam explica��es
- **Apresenta��es digitais**: Use PowerPoint ou Canva
- **Apps educativos**: Kahoot, Quizlet, etc.

### **Projetos Pr�ticos**
- **Constru��o de maquetes**: Representem conceitos
- **Experimentos caseiros**: Ci�ncias com materiais simples
- **Pesquisas locais**: Hist�ria do bairro, geografia local

**Que disciplina voc� quer tornar mais criativa?**`;

        } else if (message.toLowerCase().includes('aluno') && message.toLowerCase().includes('n�o') && (message.toLowerCase().includes('presta') || message.toLowerCase().includes('aten��o'))) {
          fallbackResponse = `# ?? Como Lidar com Aluno Desatento

## ?? **Estrat�gias Imediatas**

### **Durante a Aula**
- **Mude o tom de voz**: Chame aten��o sem gritar
- **Fa�a perguntas diretas**: "Jo�o, o que voc� acha sobre isso?"
- **Mova-se pela sala**: Fique pr�ximo do aluno
- **Varie a atividade**: Mude o ritmo da aula

### **Identifique as Causas**
- **Converse em particular**: "Est� tudo bem?"
- **Observe padr�es**: Em que momentos ele se distrai?
- **Verifique necessidades**: Sono, fome, problemas pessoais
- **Consulte outros professores**: � s� na sua aula?

### **Solu��es Pr�ticas**
- **Assento estrat�gico**: Coloque perto de voc�
- **Parcerias**: Colega que pode ajudar
- **Atividades manuais**: Para alunos mais ativos
- **Intervalos**: Pequenas pausas para se mexer

### **Comunica��o**
- **Fale com a fam�lia**: Informe sobre o comportamento
- **Seja positivo**: Reconhe�a quando ele participa
- **Estabele�a combinados**: Regras claras e justas

**O aluno tem alguma dificuldade espec�fica de aprendizagem?**`;

        } else if (message.toLowerCase().includes('gerundismo') || message.toLowerCase().includes('ger�ndio')) {
          fallbackResponse = `# ?? Plano de Aula: Gerundismo

## ?? **Objetivo**
Ao final da aula, os alunos identificar�o e corrigir�o casos de gerundismo em textos.

## ?? **Motiva��o (10 min)**
- **Pergunta provocativa**: "Voc�s j� ouviram algu�m falar 'vou estar fazendo' ou 'vou estar indo'?"
- **Mostre exemplos**: Escreva frases com gerundismo no quadro
- **Conecte com a vida**: "Isso acontece muito no dia a dia, n�?"

## ?? **Desenvolvimento (25 min)**

### **1. O que � Gerundismo?**
- **Defini��o simples**: Usar ger�ndio desnecessariamente
- **Exemplos pr�ticos**:
  - ? "Vou estar fazendo" ? ? "Vou fazer"
  - ? "Vou estar indo" ? ? "Vou ir"
  - ? "Vou estar estudando" ? ? "Vou estudar"

### **2. Por que acontece?**
- **Influ�ncia de outras l�nguas** (ingl�s)
- **H�bito de fala**
- **Tentativa de soar mais formal**

### **3. Como corrigir?**
- **Substitua por futuro simples**
- **Use verbos diretos**
- **Mantenha a simplicidade**

## ?? **Atividade Pr�tica (15 min)**
- **Corre��o coletiva**: Frases no quadro para corrigir juntos
- **Exerc�cio individual**: Lista de frases para corrigir
- **Cria��o**: Alunos criam frases corretas

## ? **Fechamento (5 min)**
- **S�ntese**: "O que aprendemos sobre gerundismo?"
- **Dica**: "Falem de forma simples e direta!"
- **Pr�xima aula**: Mais exerc�cios pr�ticos

**Precisa de mais exemplos ou atividades espec�ficas?**`;

        } else if (message.toLowerCase().includes('plano') && message.toLowerCase().includes('aula')) {
          fallbackResponse = `# ?? Como Fazer um Plano de Aula Eficaz

## ?? **Estrutura Simples**

### **1. Objetivo (5 min)**
- **O que os alunos v�o aprender?**
- **Use verbos claros**: identificar, explicar, aplicar
- **Exemplo**: "Ao final da aula, os alunos identificar�o fra��es equivalentes"

### **2. Motiva��o (10 min)**
- **Gancho inicial**: Pergunta provocativa, v�deo curto, situa��o-problema
- **Conecte com a vida**: "Quantos peda�os de pizza cada um come?"
- **Desperte curiosidade**: "Voc�s sabiam que..."

### **3. Desenvolvimento (25 min)**
- **Apresente o conte�do**: Explica��o clara e objetiva
- **Use exemplos**: Sempre com situa��es pr�ticas
- **Interaja**: Fa�a perguntas, pe�a exemplos dos alunos

### **4. Atividade Pr�tica (15 min)**
- **Exerc�cios**: Individuais ou em grupo
- **Aplica��o**: Use o conhecimento aprendido
- **Diferentes n�veis**: Para alunos com ritmos diferentes

### **5. Fechamento (5 min)**
- **S�ntese**: "O que aprendemos hoje?"
- **Pr�ximos passos**: "Na pr�xima aula vamos..."
- **D�vidas**: "Alguma pergunta?"

**Que disciplina voc� est� planejando?**`;

        } else if (message.toLowerCase().includes('avalia��o') || message.toLowerCase().includes('prova') || message.toLowerCase().includes('nota')) {
          fallbackResponse = `# ?? Estrat�gias de Avalia��o Eficazes

## ?? **Tipos de Avalia��o**

### **Avalia��o Formativa (Durante o Processo)**
- **Observa��o di�ria**: Como o aluno participa e se desenvolve
- **Perguntas r�pidas**: "Entenderam?", "Alguma d�vida?"
- **Autoavalia��o**: "Como voc� se sente com esse conte�do?"
- **Trabalhos pr�ticos**: Atividades que mostram o progresso

### **Avalia��o Somativa (Resultado Final)**
- **Provas bem estruturadas**: Quest�es claras e objetivas
- **Projetos**: Trabalhos que aplicam o conhecimento
- **Apresenta��es**: Alunos explicam o que aprenderam
- **Portf�lios**: Colet�nea de trabalhos ao longo do tempo

## ?? **Dicas Importantes**
- **Diversifique**: N�o use s� provas escritas
- **Comunique crit�rios**: Alunos devem saber como ser�o avaliados
- **D� feedback**: Explique o que est� bom e o que pode melhorar
- **Seja justo**: Considere diferentes formas de aprender

**Que tipo de avalia��o voc� quer implementar?**`;

        } else if (message.toLowerCase().includes('crase') || message.toLowerCase().includes('�')) {
          fallbackResponse = `# ?? Como Ensinar Crase de Forma Simples

## ?? **Regra B�sica**
**Crase = a + a** (preposi��o + artigo feminino)

## ?? **Exemplos Pr�ticos**
- ? "Vou � escola" (a + a escola)
- ? "Voltei � casa" (a + a casa)  
- ? "Vou a escola" (sem artigo)
- ? "Vou ao m�dico" (masculino = ao)

## ?? **Dica Simples**
**Teste**: Substitua por masculino
- "Vou � escola" ? "Vou ao col�gio" ?
- "Vou a escola" ? "Vou o col�gio" ?

## ?? **Atividade**
- **Frases para corrigir**: Lista com casos de crase
- **Jogo da mem�ria**: Pares de frases (com/sem crase)
- **Cria��o**: Alunos criam frases usando crase

**Precisa de mais exerc�cios pr�ticos?**`;

        } else if (message.toLowerCase().includes('v�rgula') || message.toLowerCase().includes('virgula')) {
          fallbackResponse = `# ?? Como Ensinar Uso da V�rgula

## ?? **Regras Principais**

### **1. Enumera��o**
- ? "Comprei ma��, banana e laranja"
- ? "Estudou, trabalhou e descansou"

### **2. Aposto**
- ? "Jo�o, meu amigo, chegou"
- ? "S�o Paulo, capital de SP, � grande"

### **3. Vocativo**
- ? "Maria, venha aqui!"
- ? "Professor, posso sair?"

### **4. Ora��o Subordinada**
- ? "Quando chegar, me avise"
- ? "Se chover, n�o sairemos"

## ?? **Dica Pr�tica**
**Pausa na fala = v�rgula na escrita**

## ?? **Atividades**
- **Leitura em voz alta**: Mostre as pausas
- **Corre��o coletiva**: Textos sem v�rgulas
- **Cria��o**: Alunos escrevem usando v�rgulas

**Que tipo de exerc�cio voc� quer fazer?**`;

        } else if (message.toLowerCase().includes('acento') || message.toLowerCase().includes('acentua��o')) {
          fallbackResponse = `# ?? Acentua��o Gr�fica Simplificada

## ?? **Regras B�sicas**

### **1. Ox�tonas (�ltima s�laba)**
- **Terminadas em a, e, o**: N�o acentuam
- **Outras termina��es**: Acentuam
- **Exemplos**: caf�, voc�, cora��o

### **2. Parox�tonas (pen�ltima s�laba)**
- **Terminadas em a, e, o**: N�o acentuam
- **Outras termina��es**: Acentuam
- **Exemplos**: mesa, livro, f�cil

### **3. Proparox�tonas (antepen�ltima s�laba)**
- **Sempre acentuam**
- **Exemplos**: m�dico, l�mpada, matem�tica

## ?? **Dica Pr�tica**
**Conte as s�labas de tr�s para frente!**

## ?? **Atividades**
- **Classifica��o**: Separe por tipo de palavra
- **Jogo da mem�ria**: Palavras com/sem acento
- **Ditado**: Foque na acentua��o

**Precisa de mais exemplos?**`;

        } else if (message.toLowerCase().includes('concord�ncia') || message.toLowerCase().includes('concordancia')) {
          fallbackResponse = `# ?? Concord�ncia Verbal e Nominal

## ?? **Concord�ncia Verbal**

### **Sujeito Simples**
- ? "O aluno estuda" (singular)
- ? "Os alunos estudam" (plural)

### **Sujeito Composto**
- ? "Jo�o e Maria estudam" (plural)
- ? "Jo�o ou Maria estuda" (singular)

## ?? **Concord�ncia Nominal**

### **Adjetivo com Substantivo**
- ? "Casa bonita" (feminino)
- ? "Carro bonito" (masculino)
- ? "Casas bonitas" (plural)

## ?? **Dicas Pr�ticas**
- **Sujeito e verbo**: Mesmo n�mero
- **Substantivo e adjetivo**: Mesmo g�nero e n�mero

## ?? **Atividades**
- **Corre��o**: Frases com erros de concord�ncia
- **Cria��o**: Alunos fazem frases corretas
- **Jogo**: Identifique o erro

**Que tipo de concord�ncia voc� quer trabalhar?**`;

        } else {
          // Resposta geral mais natural e menos estruturada
          fallbackResponse = `Ol�! ?? 

Sou sua assistente de IA educacional e estou aqui para ajudar voc� com qualquer quest�o relacionada ao ensino!

Posso ajudar com:
?? Explica��es did�ticas de qualquer mat�ria
?? Sugest�es de atividades criativas  
?? Estrat�gias de avalia��o
?? Gest�o de sala de aula
?? Resolu��o de problemas educacionais

Seja espec�fico na sua pergunta! Por exemplo:
- "Como ensinar equa��es para o 7� ano?"
- "Atividade sobre meio ambiente para crian�as"
- "Meu aluno n�o est� prestando aten��o, o que fazer?"
- "Plano de aula sobre fra��es"

Me conte exatamente o que voc� precisa e eu te darei uma resposta pr�tica e personalizada!`;
        }

        console.log(`?? Usando resposta fallback devido ao erro do Ollama`);
        
        res.json({ 
          response: fallbackResponse,
          model: 'fallback',
          timestamp: new Date().toISOString(),
          note: 'Resposta gerada pelo sistema de fallback (Ollama indispon�vel)'
        });
      }

    } catch (error) {
      console.error('? Erro geral na rota de IA:', error);
      res.status(500).json({ 
        message: "Erro interno do servidor ao processar solicita��o de IA",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Buscar disciplinas do professor
  app.get('/api/teacher/:teacherId/subjects', isAuthenticated, async (req, res) => {
    try {
      const { teacherId } = req.params;

      console.log(`?? Buscando disciplinas do professor ${teacherId}`);

      const teacherSubjects = await db
        .select({
          subjectId: subjects.id,
          subjectName: subjects.name,
          subjectDescription: subjects.description,
          classId: classes.id,
          className: classes.name,
          status: classSubjects.status
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .where(and(
          eq(classSubjects.teacherId, teacherId),
          eq(classSubjects.status, 'active'),
          eq(subjects.status, 'active')
        ));

      console.log(`? Encontradas ${teacherSubjects.length} disciplinas para o professor ${teacherId}`);

      res.json({
        success: true,
        data: teacherSubjects
      });

    } catch (error) {
      console.error('? Erro ao buscar disciplinas do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar eventos do professor (provas e atividades das suas turmas) - DESABILITADA (duplicada)
  // app.get('/api/teacher/:teacherId/events', isAuthenticated, async (req, res) => {
    // try {
    //   const { teacherId } = req.params;
    //   const { startDate, endDate } = req.query;

    //   console.log(`?? Buscando eventos do professor ${teacherId}`);
    //   console.log(`?? Par�metros de data: startDate=${startDate}, endDate=${endDate}`);

    //   const events = [];

      // PRIMEIRA API COMENTADA - C�DIGO REMOVIDO PARA EVITAR ERROS DE SINTAXE
      /*
      // Buscar provas das turmas do professor
      console.log(`?? Buscando provas do professor...`);
      const examsData = await db
        .select({
          id: exams.id,
          title: exams.title,
          description: exams.description,
          examDate: exams.examDate,
          classId: exams.classId,
          className: classes.name,
          subjectId: exams.subjectId,
          subjectName: subjects.name,
          bimonthly: exams.bimonthly,
          totalPoints: exams.totalPoints,
          duration: exams.duration,
          type: sql<string>`'exam'`.as('type')
        })
        .from(exams)
        .innerJoin(classes, eq(exams.classId, classes.id))
        .innerJoin(subjects, eq(exams.subjectId, subjects.id))
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, exams.classId),
          eq(classSubjects.subjectId, exams.subjectId)
        ))
        .where(and(
          eq(classSubjects.teacherId, teacherId),
          startDate ? gte(exams.examDate, new Date(startDate as string)) : undefined,
          endDate ? lte(exams.examDate, new Date(endDate as string)) : undefined
        ));

      console.log(`?? Provas encontradas: ${examsData.length}`);
      examsData.forEach(exam => {
        console.log(`  - ${exam.title} (${exam.subjectName} - ${exam.className}) - Data: ${exam.examDate}`);
      });

      events.push(...examsData.map(exam => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        date: exam.examDate,
        classId: exam.classId,
        className: exam.className,
        subjectName: exam.subjectName,
        type: exam.type,
        bimonthly: exam.bimonthly,
        totalPoints: exam.totalPoints,
        duration: exam.duration
      })));

      // Buscar atividades das turmas do professor
      const activitiesData = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          dueDate: activities.dueDate,
          classId: activities.classId,
          className: classes.name,
          subjectId: activities.subjectId,
          subjectName: subjects.name,
          maxGrade: activities.maxGrade,
          type: sql<string>`'activity'`.as('type')
        })
        .from(activities)
        .innerJoin(classes, eq(activities.classId, classes.id))
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, activities.classId),
          eq(classSubjects.subjectId, activities.subjectId)
        ))
        .where(and(
          eq(classSubjects.teacherId, teacherId),
          startDate ? gte(activities.dueDate, new Date(startDate as string)) : undefined,
          endDate ? lte(activities.dueDate, new Date(endDate as string)) : undefined
        ));

      console.log(`?? Atividades encontradas: ${activitiesData.length}`);
      activitiesData.forEach(activity => {
        console.log(`  - ${activity.title} (${activity.subjectName} - ${activity.className}) - Data: ${activity.dueDate}`);
      });

      events.push(...activitiesData.map(activity => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        date: activity.dueDate,
        classId: activity.classId,
        className: activity.className,
        subjectName: activity.subjectName,
        type: activity.type,
        totalPoints: activity.maxGrade
      })));

      // Buscar eventos globais do coordenador
      let globalEvents;
      if (startDate && endDate) {
        const result = await client.execute({
          sql: `SELECT e.* FROM events e
                 LEFT JOIN users u ON e.createdBy = u.id
                 WHERE u.role = 'coordinator' 
                 AND e.startDate >= ? 
                 AND e.startDate <= ?
                 AND e.status = 'active'`,
          args: [startDate, endDate]
        });
        globalEvents = result.rows;
      } else {
        const result = await client.execute({
          sql: `SELECT e.* FROM events e
                 LEFT JOIN users u ON e.createdBy = u.id
                 WHERE u.role = 'coordinator'
                 AND e.status = 'active'`,
          args: []
        });
        globalEvents = result.rows;
      }
      
      // Adicionar eventos globais com isGlobal: true
      const globalEventsWithFlag = globalEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.startDate,
        classId: event.classId,
        className: 'Evento Global',
        subjectName: 'Coordenador',
        type: event.type,
        isGlobal: true
      }));
      
      events.push(...globalEventsWithFlag);

      console.log(`? Encontrados ${events.length} eventos para o professor ${teacherId} (${events.length - globalEvents.length} espec�ficos + ${globalEvents.length} globais)`);
      console.log(`?? Eventos retornados:`, events.map(e => `${e.title} (${e.type}) - ${e.date}`));

      res.json({
        success: true,
        data: events
      });

    } catch (error) {
      console.error('? Erro ao buscar eventos do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
    */
  // });

  // Criar evento (prova, atividade, apresenta��o, reuni�o)
  app.post('/api/teacher/events', isAuthenticated, hasRole(['teacher', 'admin']), async (req, res) => {
    try {
      const { 
        title, 
        description, 
        type, 
        classId, 
        subjectId, 
        teacherId, 
        date, 
        duration, 
        totalPoints, 
        instructions,
        grade
      } = req.body;

      console.log('?? Criando evento:', { title, type, classId, date });

      if (!title || !type || !classId || !teacherId || !date) {
        return res.status(400).json({ 
          message: "Campos obrigat�rios: t�tulo, tipo, turma, professor e data" 
        });
      }

      // Corrigir timezone - garantir que a data seja salva no formato correto
      const formatDateForDB = (dateString: string) => {
        if (!dateString) return null;
        // Se a data j� est� no formato YYYY-MM-DD, adicionar hor�rio para evitar timezone issues
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return `${dateString}T12:00:00.000Z`; // Meio-dia UTC para evitar problemas de timezone
        }
        return dateString;
      };

      const formattedDate = formatDateForDB(date);
      console.log('?? Data formatada:', { original: date, formatted: formattedDate });

      const eventId = uuidv4();

      if (type === 'exam') {
        // Criar prova
        const examData = {
          id: eventId,
          title,
          description: description || '',
          classId,
          subjectId: subjectId || null,
          teacherId,
          examDate: formattedDate,
          duration: duration ? parseInt(duration) : null,
          totalPoints: totalPoints ? parseFloat(totalPoints) : 10,
          semester: '1',
          bimonthly: grade ? parseInt(grade) : 1,
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.insert(exams).values(examData);
        console.log(`? Prova criada: ${eventId}`);

      } else if (type === 'activity') {
        // Criar atividade
        const activityData = {
          id: eventId,
          title,
          description: description || '',
          classId,
          subjectId: subjectId || null,
          teacherId,
          dueDate: formattedDate,
          maxGrade: totalPoints ? parseFloat(totalPoints) : 10,
          instructions: instructions || '',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.insert(activities).values(activityData);
        console.log(`? Atividade criada: ${eventId}`);
      }

      res.status(201).json({
        success: true,
        message: "Evento criado com sucesso",
        data: { id: eventId, type }
      });

    } catch (error) {
      console.error('? Erro ao criar evento:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar arquivos de uma atividade espec�fica
  app.get('/api/activities/:activityId/files', isAuthenticated, hasRole(['coordinator', 'admin', 'teacher', 'student']), async (req, res) => {
    try {
      const { activityId } = req.params;
      
      const sqliteDb = new Database('./school.db');
      const files = sqliteDb.prepare(`
        SELECT af.*, af.fileName as originalName 
        FROM activityFiles af 
        WHERE af.activityId = ?
      `).all(activityId);
      sqliteDb.close();
      
      console.log(`?? Arquivos encontrados para atividade ${activityId}:`, files.length);
      res.json(files);
      
    } catch (error) {
      console.error('? Erro ao buscar arquivos da atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar atividade com prote��o por senha
  app.delete('/api/activities/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const user = req.user as any;

      // Verificar se a atividade existe e pertence ao professor
      const activity = await db
        .select()
        .from(activities)
        .where(and(eq(activities.id, id), eq(activities.teacherId, user.id)))
        .limit(1);

      if (activity.length === 0) {
        return res.status(404).json({ message: "Atividade n�o encontrada ou voc� n�o tem permiss�o para delet�-la" });
      }

      // Verificar senha do usu�rio
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (userData.length === 0) {
        return res.status(404).json({ message: "Usu�rio n�o encontrado" });
      }

      // Verificar senha (simplificado - em produ��o usar hash)
      if (password !== '123456') {
        return res.status(401).json({ message: "Senha incorreta" });
      }

      // Deletar arquivos da atividade primeiro
      const sqliteDb = new Database('./school.db');
      
      // Deletar arquivos das submiss�es
      sqliteDb.prepare(`
        DELETE FROM submissionFiles 
        WHERE submissionId IN (
          SELECT id FROM activitySubmissions WHERE activityId = ?
        )
      `).run(id);

      // Deletar arquivos da atividade
      sqliteDb.prepare(`
        DELETE FROM activityFiles WHERE activityId = ?
      `).run(id);

      // Deletar submiss�es
      sqliteDb.prepare(`
        DELETE FROM activitySubmissions WHERE activityId = ?
      `).run(id);

      // Deletar atividade
      sqliteDb.prepare(`
        DELETE FROM activities WHERE id = ?
      `).run(id);

      sqliteDb.close();

      console.log(`??? Atividade ${id} deletada pelo professor ${user.id}`);
      res.json({ message: "Atividade deletada com sucesso" });

    } catch (error) {
      console.error('? Erro ao deletar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DO COORDENADOR =====

// GET /api/coordinator/logs - Buscar logs do sistema
app.get('/api/coordinator/logs', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
  try {
    const { level, category, search, dateFrom, dateTo, limit = 100, offset = 0 } = req.query;

    // Mock data - em produ��o viria do banco de dados
    const mockLogs = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        level: 'success',
        category: 'academic',
        action: 'Atividade Criada',
        description: 'Professor Jo�o Silva criou uma nova atividade "Exerc�cios de Matem�tica" para a turma 9� Ano A',
        userId: 'user-1',
        userName: 'Jo�o Silva',
        userRole: 'teacher',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/120.0.0.0',
        metadata: { activityId: 'act-123', classId: 'class-456' }
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: 'warning',
        category: 'system',
        action: 'Tentativa de Login Falhada',
        description: 'Tentativa de login com credenciais inv�lidas para o email admin@escola.com',
        ipAddress: '192.168.1.50',
        userAgent: 'Firefox/119.0.0.0',
        metadata: { attemptCount: 3, blocked: true }
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        level: 'info',
        category: 'user',
        action: 'Perfil Atualizado',
        description: 'Coordenador Maria Santos atualizou suas informa��es pessoais',
        userId: 'user-2',
        userName: 'Maria Santos',
        userRole: 'coordinator',
        ipAddress: '192.168.1.75',
        userAgent: 'Chrome/120.0.0.0'
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        level: 'error',
        category: 'academic',
        action: 'Falha no Upload',
        description: 'Falha ao fazer upload do arquivo "prova_final.pdf" - arquivo corrompido',
        userId: 'user-3',
        userName: 'Carlos Oliveira',
        userRole: 'teacher',
        ipAddress: '192.168.1.120',
        userAgent: 'Chrome/120.0.0.0',
        metadata: { fileName: 'prova_final.pdf', fileSize: '2.5MB', error: 'corrupted_file' }
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        level: 'success',
        category: 'communication',
        action: 'Mensagem Enviada',
        description: 'Professor Ana Costa enviou mensagem para 25 alunos da turma 8� Ano B',
        userId: 'user-4',
        userName: 'Ana Costa',
        userRole: 'teacher',
        ipAddress: '192.168.1.90',
        userAgent: 'Chrome/120.0.0.0',
        metadata: { messageId: 'msg-789', recipientCount: 25, classId: 'class-789' }
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 18000000).toISOString(),
        level: 'info',
        category: 'system',
        action: 'Backup Realizado',
        description: 'Backup autom�tico do banco de dados conclu�do com sucesso',
        ipAddress: '192.168.1.1',
        userAgent: 'System/1.0.0',
        metadata: { backupSize: '1.2GB', duration: '15min' }
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        level: 'warning',
        category: 'security',
        action: 'Acesso Suspeito',
        description: 'M�ltiplas tentativas de acesso de IP externo detectadas',
        ipAddress: '203.0.113.45',
        userAgent: 'Chrome/120.0.0.0',
        metadata: { attemptCount: 8, blocked: true, country: 'BR' }
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - 25200000).toISOString(),
        level: 'success',
        category: 'academic',
        action: 'Nota Lan�ada',
        description: 'Professor Pedro Santos lan�ou nota 8.5 para o aluno Maria Silva na atividade "Prova de Hist�ria"',
        userId: 'user-5',
        userName: 'Pedro Santos',
        userRole: 'teacher',
        ipAddress: '192.168.1.110',
        userAgent: 'Chrome/120.0.0.0',
        metadata: { grade: 8.5, studentId: 'student-123', activityId: 'act-456' }
      }
    ];

    // Aplicar filtros
    let filteredLogs = mockLogs;

    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (category && category !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (search) {
      const searchLower = search.toString().toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(searchLower) ||
        log.description.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower)
      );
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom.toString());
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo.toString());
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= toDate);
    }

    // Ordenar por timestamp (mais recente primeiro)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Pagina��o
    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(Number(offset), Number(offset) + Number(limit));

    // Estat�sticas
    const stats = {
      total,
      byLevel: filteredLogs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCategory: filteredLogs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        stats,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/coordinator/logs/terminal - Logs para terminal em tempo real
app.get('/api/coordinator/logs/terminal', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
  try {
    // Buscar logs reais do banco de dados
    const logs = await db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(50);
    
    // Converter para o formato esperado pelo frontend
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      action: log.action,
      description: log.description,
      userId: log.userId,
      userName: log.userName,
      userRole: log.userRole,
      ipAddress: log.ipAddress, // J� mascarado no banco
      userAgent: log.userAgent,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      code: log.code
    }));

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        total: formattedLogs.length,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs do terminal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/coordinator/logs/stats - Estat�sticas dos logs
app.get('/api/coordinator/logs/stats', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Mock data - em produ��o viria do banco de dados
    const mockStats = {
      totalLogs: 1247,
      successRate: 94.2,
      errorRate: 1.7,
      warningRate: 4.1,
      topUsers: [
        { name: 'Jo�o Silva', actions: 85, role: 'teacher' },
        { name: 'Maria Santos', actions: 72, role: 'coordinator' },
        { name: 'Carlos Oliveira', actions: 68, role: 'teacher' },
        { name: 'Ana Costa', actions: 54, role: 'teacher' }
      ],
      topCategories: [
        { category: 'academic', count: 456, percentage: 36.6 },
        { category: 'user', count: 234, percentage: 18.8 },
        { category: 'system', count: 198, percentage: 15.9 },
        { category: 'communication', count: 187, percentage: 15.0 },
        { category: 'security', count: 172, percentage: 13.8 }
      ],
      recentAlerts: [
        {
          id: crypto.randomUUID(),
          type: 'critical',
          title: 'M�ltiplas Tentativas de Login',
          description: 'Detectadas 5 tentativas de login falhadas para o IP 192.168.1.50',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: crypto.randomUUID(),
          type: 'warning',
          title: 'Alto Volume de Uploads',
          description: 'Professor Carlos Oliveira fez 15 uploads nas �ltimas 2 horas',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ]
    };

    res.json({
      success: true,
      data: mockStats
    });
  } catch (error) {
    console.error('Erro ao buscar estat�sticas dos logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

  // Buscar todas as atividades da escola (coordenador)
  app.get('/api/coordinator/activities', isAuthenticated, hasRole(['coordinator', 'admin', 'teacher']), async (req, res) => {
    try {
      console.log('?? Buscando atividades reais...');
      
      // Buscar atividades reais com JOIN para obter informa��es completas
      const activitiesResult = await client.execute(`
        SELECT 
          a.id,
          a.title,
          a.description,
          a.dueDate,
          a.maxGrade,
          a.status,
          a.createdAt,
          a.classId,
          a.subjectId,
          a.teacherId,
          c.name as className,
          s.name as subjectName,
          u.firstName as teacherFirstName,
          u.lastName as teacherLastName
        FROM activities a
        LEFT JOIN classes c ON a.classId = c.id
        LEFT JOIN subjects s ON a.subjectId = s.id
        LEFT JOIN users u ON a.teacherId = u.id
        ORDER BY a.createdAt DESC
      `);
      
      const activities = activitiesResult.rows;
      console.log(`? Encontradas ${activities.length} atividades reais`);
      
      // Transformar dados para o formato esperado pelo frontend
      const formattedActivities = activities.map((activity: any) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        dueDate: activity.dueDate,
        maxGrade: activity.maxGrade,
        status: activity.status,
        createdAt: activity.createdAt,
        classId: activity.classId,
        className: activity.className,
        subjectId: activity.subjectId,
        subjectName: activity.subjectName,
        teacherId: activity.teacherId,
        teacherName: activity.teacherFirstName && activity.teacherLastName 
          ? `${activity.teacherFirstName} ${activity.teacherLastName}`
          : 'Professor n�o informado',
        isActive: activity.status === 'active',
        approvedByCoordinator: activity.approvedByCoordinator || 0
      }));
      
      res.json({
        success: true,
        data: formattedActivities
      });

    } catch (error) {
      console.error('? Erro ao buscar atividades do coordenador:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API simplificada de performance para coordenador
  app.get('/api/coordinator/performance-simple', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      console.log('?? Buscando dados simplificados de performance...');
      
      // Buscar dados b�sicos
      const studentsCount = await client.execute("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
      const teachersCount = await client.execute("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'");
      const classesCount = await client.execute("SELECT COUNT(*) as count FROM classes WHERE status = 'active'");
      
      // Calcular performance m�dia (simulada para demonstra��o)
      const avgPerformance = 7.2 + (Math.random() - 0.5) * 2; // Entre 6.2 e 8.2
      
      // Calcular frequ�ncia (simulada)
      const attendanceRate = 85 + (Math.random() - 0.5) * 20; // Entre 75% e 95%
      
      // Calcular taxa de conclus�o (simulada)
      const completionRate = 80 + (Math.random() - 0.5) * 30; // Entre 65% e 95%
      
      // Determinar turma destaque
      const topClass = await client.execute("SELECT name FROM classes WHERE status = 'active' LIMIT 1");
      const topPerformingClass = topClass.rows[0]?.name || 'N/A';
      
      // Calcular pontos de aten��o
      let needsAttention = 0;
      if (avgPerformance < 7) needsAttention++;
      if (attendanceRate < 85) needsAttention++;
      if (completionRate < 80) needsAttention++;
      
      // Determinar tend�ncia geral
      let overallTrend: 'up' | 'down' | 'stable' = 'stable';
      if (avgPerformance > 7.5 && attendanceRate > 90) overallTrend = 'up';
      else if (avgPerformance < 6.5 || attendanceRate < 80) overallTrend = 'down';
      
      const performanceData = {
        summary: {
          totalStudents: studentsCount.rows[0].count || 0,
          totalTeachers: teachersCount.rows[0].count || 0,
          avgPerformance: Math.max(0, Math.min(10, avgPerformance)),
          attendanceRate: Math.max(0, Math.min(100, attendanceRate)),
          completionRate: Math.max(0, Math.min(100, completionRate))
        },
        keyMetrics: {
          topPerformingClass,
          needsAttention,
          overallTrend
        }
      };
      
      console.log('? Dados de performance simplificados gerados');
      res.json({ 
        success: true,
        data: performanceData 
      });
      
    } catch (error) {
      console.error('? Erro ao buscar performance simplificada:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar dados completos das turmas para o coordenador
  app.get('/api/coordinator/classes', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      console.log('?? Buscando dados completos das turmas...');
      
      // Buscar todas as turmas com estat�sticas
      const classesResult = await client.execute(`
        SELECT 
          c.id,
          c.name,
          c.grade,
          c.section,
          c.status,
          c.createdAt,
          c.academicYear,
          c.capacity,
          COUNT(DISTINCT sc.studentId) as studentsCount,
          COUNT(DISTINCT a.id) as activitiesCount,
          COUNT(DISTINCT e.id) as examsCount,
          AVG(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) as activeActivitiesRate
        FROM classes c
        LEFT JOIN studentClass sc ON c.id = sc.classId AND sc.status = 'active'
        LEFT JOIN activities a ON c.id = a.classId
        LEFT JOIN exams e ON c.id = e.classId
        GROUP BY c.id, c.name, c.grade, c.section, c.status, c.createdAt, c.academicYear, c.capacity
        ORDER BY c.name
      `);
      
      const classes = classesResult.rows;
      console.log(`? Encontradas ${classes.length} turmas`);
      
      // Para cada turma, buscar informa��es adicionais
      const enrichedClasses = await Promise.all(
        classes.map(async (classItem: any) => {
          // Buscar professores da turma
          const teachersResult = await client.execute(`
            SELECT DISTINCT
              u.id,
              u.firstName,
              u.lastName,
              s.name as subjectName
            FROM classSubjects cs
            INNER JOIN users u ON cs.teacherId = u.id
            INNER JOIN subjects s ON cs.subjectId = s.id
            WHERE cs.classId = ?
          `, [classItem.id]);
          
          const teachers = teachersResult.rows.map((teacher: any) => ({
            id: teacher.id,
            name: `${teacher.firstName} ${teacher.lastName}`,
            subject: teacher.subjectName
          }));
          
          // Buscar �ltima atividade
          const lastActivityResult = await client.execute(`
            SELECT title, createdAt, status
            FROM activities
            WHERE classId = ?
            ORDER BY createdAt DESC
            LIMIT 1
          `, [classItem.id]);
          
          const lastActivity = lastActivityResult.rows[0] || null;
          
          // Calcular presen�a m�dia real
          const attendanceResult = await client.execute(`
            SELECT 
              COUNT(*) as totalRecords,
              SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentCount
            FROM attendance 
            WHERE classId = ?
          `, [classItem.id]);
          
          const attendanceData = attendanceResult.rows[0];
          const attendanceRate = attendanceData.totalRecords > 0 
            ? Math.round((attendanceData.presentCount / attendanceData.totalRecords) * 100)
            : 0; // 0 se n�o houver dados
          
          // Calcular nota m�dia real (apenas a nota mais recente de cada aluno)
          const gradesResult = await client.execute(`
            SELECT AVG(latest_grade) as avgGrade, COUNT(*) as totalGrades
            FROM (
              SELECT 
                eg.studentId,
                eg.grade as latest_grade,
                ROW_NUMBER() OVER (PARTITION BY eg.studentId ORDER BY eg.updatedAt DESC) as rn
              FROM examGrades eg
              INNER JOIN exams e ON eg.examId = e.id
              WHERE e.classId = ? AND eg.grade IS NOT NULL
            ) ranked_grades
            WHERE rn = 1
          `, [classItem.id]);
          
          const gradesData = gradesResult.rows[0];
          const avgGrade = gradesData.totalGrades > 0 && gradesData.avgGrade 
            ? parseFloat(gradesData.avgGrade).toFixed(1)
            : 0; // 0 se n�o houver notas
          
          return {
            id: classItem.id,
            name: classItem.name,
            grade: classItem.grade,
            section: classItem.section,
            status: classItem.status,
            createdAt: classItem.createdAt,
            academicYear: classItem.academicYear,
            capacity: classItem.capacity,
            studentsCount: classItem.studentsCount || 0,
            activitiesCount: classItem.activitiesCount || 0,
            examsCount: classItem.examsCount || 0,
            teachers: teachers,
            lastActivity: lastActivity,
            attendanceRate: attendanceRate,
            avgGrade: parseFloat(avgGrade),
            totalGrades: gradesData.totalGrades || 0,
            totalAttendanceRecords: attendanceData.totalRecords || 0
          };
        })
      );
      
      res.json({ 
        success: true,
        data: enrichedClasses 
      });
      
    } catch (error) {
      console.error('? Erro ao buscar turmas do coordenador:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Aprovar/desaprovar atividade (coordenador)
  app.patch('/api/coordinator/activities/:activityId/approve', isAuthenticated, hasRole(['coordinator', 'admin', 'teacher']), async (req, res) => {
    try {
      const { activityId } = req.params;
      const { approved } = req.body;

      await db
        .update(activities)
        .set({ 
          approvedByCoordinator: approved ? 1 : 0,
          coordinatorApprovalDate: approved ? new Date().toISOString() : null
        })
        .where(eq(activities.id, activityId));

      console.log(`? Atividade ${activityId} ${approved ? 'aprovada' : 'rejeitada'} pelo coordenador`);

      res.json({
        success: true,
        message: `Atividade ${approved ? 'aprovada' : 'rejeitada'} com sucesso`
      });

    } catch (error) {
      console.error('? Erro ao aprovar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar usu�rios para o coordenador
  app.get('/api/users', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const { role } = req.query;
      
      let query = db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt
      }).from(users);

      if (role) {
        query = query.where(eq(users.role, role as string));
      }

      const allUsers = await query;

      // Se for para buscar alunos, incluir informa��es das turmas
      if (role === 'student') {
        console.log('?? Buscando alunos com informa��es de turmas...');
        console.log('?? Total de usu�rios encontrados:', allUsers.length);
        
        const usersWithClasses = await Promise.all(
          allUsers.map(async (user) => {
            const classInfo = await db
              .select({
                classId: studentClass.classId,
                className: classes.name,
                classGrade: classes.grade,
                classSection: classes.section
              })
              .from(studentClass)
              .leftJoin(classes, eq(studentClass.classId, classes.id))
              .where(and(
                eq(studentClass.studentId, user.id),
                eq(studentClass.status, 'active')
              ));

            console.log(`?? Aluno ${user.firstName} ${user.lastName} (${user.id}):`, {
              classInfo: classInfo,
              classId: classInfo[0]?.classId || null
            });

            return {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              email: user.email,
              role: user.role,
              status: user.status,
              createdAt: user.createdAt,
              classId: classInfo[0]?.classId || null,
              className: classInfo[0]?.className || null,
              classGrade: classInfo[0]?.classGrade || null,
              classSection: classInfo[0]?.classSection || null
            };
          })
        );

        console.log(`?? Coordenador acessou alunos - ${usersWithClasses.length} encontrados`);
        console.log('?? Exemplo de aluno com turma:', usersWithClasses.find(u => u.classId));
        res.json(usersWithClasses);
        return;
      }

      // Transformar dados para corresponder � interface (para outros roles)
      const transformedUsers = allUsers.map(user => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }));

      console.log(`?? Coordenador acessou usu�rios${role ? ` (role: ${role})` : ''} - ${transformedUsers.length} encontrados`);

      res.json(transformedUsers);

    } catch (error) {
      console.error('? Erro ao buscar usu�rios para coordenador:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar submiss�es de atividades para o coordenador
  app.get('/api/coordinator/submissions', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      console.log('?? Buscando submiss�es para coordenador...');
      
      const submissions = await db.select({
        id: activitySubmissions.id,
        activityId: activitySubmissions.activityId,
        studentId: activitySubmissions.studentId,
        submittedAt: activitySubmissions.submittedAt,
        status: activitySubmissions.status,
        grade: activitySubmissions.grade,
        maxGrade: activitySubmissions.maxGrade,
        finalGrade: activitySubmissions.finalGrade,
        isLate: activitySubmissions.isLate,
        createdAt: activitySubmissions.createdAt,
        
        // Dados relacionados
        activityTitle: activities.title,
        activityClassId: activities.classId,
        studentName: sql`${users.firstName} || ' ' || ${users.lastName}`,
        className: classes.name
      })
      .from(activitySubmissions)
      .leftJoin(activities, eq(activitySubmissions.activityId, activities.id))
      .leftJoin(users, eq(activitySubmissions.studentId, users.id))
      .leftJoin(classes, eq(activities.classId, classes.id))
      .where(eq(activitySubmissions.status, 'submitted'));

      console.log(`? ${submissions.length} submiss�es encontradas`);
      
      res.json(submissions);
    } catch (error) {
      console.error('? Erro ao buscar submiss�es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar eventos para o calend�rio
  app.get('/api/events', isAuthenticated, async (req, res) => {
    try {
      const { classId, subjectId, startDate, endDate } = req.query;
      
      console.log('?? Buscando eventos...');
      console.log('?? Query params:', { classId, subjectId, startDate, endDate });
      
      let query = db.select({
        id: events.id,
        title: events.title,
        description: events.description,
        type: events.type,
        startDate: events.startDate,
        endDate: events.endDate,
        location: events.location,
        color: events.color,
        status: events.status,
        createdAt: events.createdAt,
        
        // Dados relacionados
        className: classes.name,
        classId: classes.id,
        subjectName: subjects.name,
        subjectId: subjects.id,
        creatorName: users.firstName,
       creatorLastName: users.lastName
      })
      .from(events)
      .leftJoin(classes, eq(events.classId, classes.id))
      .leftJoin(subjects, eq(events.subjectId, subjects.id))
      .leftJoin(users, eq(events.createdBy, users.id));

      if (classId) {
        query = query.where(eq(events.classId, classId as string));
      }

      if (subjectId) {
        query = query.where(eq(events.subjectId, subjectId as string));
      }

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(events.startDate, startDate as string),
            lte(events.startDate, endDate as string)
          )
        );
      }

      const eventsList = await query.where(eq(events.status, 'active'));

      console.log(`?? Encontrados ${eventsList.length} eventos no banco`);
      console.log('?? Eventos encontrados:', eventsList.map(e => ({ id: e.id, title: e.title, startDate: e.startDate })));

      // Transformar dados para o calend�rio
      const transformedEvents = eventsList.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        start: event.startDate,
        end: event.endDate || event.startDate,
        color: event.color,
        className: event.className,
        subjectName: event.subjectName,
        location: event.location,
        creator: `${event.creatorName || ''} ${event.creatorLastName || ''}`.trim()
      }));

      console.log(`?? Calend�rio acessado - ${transformedEvents.length} eventos encontrados`);

      res.json(transformedEvents);

    } catch (error) {
      console.error('? Erro ao buscar eventos:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar novo evento
  app.post('/api/events', isAuthenticated, hasRole(['coordinator', 'admin', 'teacher', 'director']), async (req, res) => {
    try {
      const { 
        title, 
        description, 
        type, 
        startDate, 
        endDate, 
        startTime,
        endTime,
        location, 
        color, 
        classId, 
        subjectId 
      } = req.body;

      const eventId = uuidv4();

      // Corrigir timezone - garantir que a data seja salva no formato correto
      const formatDateForDB = (dateString: string) => {
        if (!dateString) return null;
        // Se a data j� est� no formato YYYY-MM-DD, adicionar hor�rio para evitar timezone issues
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return `${dateString}T12:00:00`; // Sem .000Z para manter hor�rio local
        }
        return dateString;
      };

      const formattedStartDate = formatDateForDB(startDate);
      const formattedEndDate = endDate ? formatDateForDB(endDate) : formattedStartDate;

      // Determinar status baseado no papel do usu�rio
      const userRole = req.user?.role;
      const eventStatus = userRole === 'coordinator' ? 'pending' : 'active';

      // Normalizar hor�rios no servidor para garantir consist�ncia
      const normalizedStartTime = (typeof startTime === 'string' && startTime.trim() !== '') ? startTime.trim() : '08:00';
      const normalizedEndTime = (typeof endTime === 'string' && endTime.trim() !== '') ? endTime.trim() : normalizedStartTime;

      console.log('?? Criando evento com hor�rios:', {
        received: { startTime, endTime },
        saved: { startTime: normalizedStartTime, endTime: normalizedEndTime },
        by: req.user?.email,
        date: formattedStartDate
      });

      await db.insert(events).values({
        id: eventId,
        title,
        description: description || '',
        type,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        location: location || '',
        color: color || '#3B82F6',
        classId: classId || null,
        subjectId: subjectId || null,
        createdBy: req.user?.id,
        status: eventStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`?? Evento criado: ${title} (${normalizedStartTime} - ${normalizedEndTime})`);

      // Log cria��o de evento no calend�rio
      logger.calendarUpdated(req.user, type, req);

      res.status(201).json({
        success: true,
        message: 'Evento criado com sucesso',
        data: { id: eventId }
      });

    } catch (error) {
      console.error('? Erro ao criar evento:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar evento
  app.put('/api/events/:eventId', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const { eventId } = req.params;
      const updateData = req.body;

      await db.update(events)
        .set({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(events.id, eventId));

      console.log(`?? Evento ${eventId} atualizado`);

      res.json({
        success: true,
        message: 'Evento atualizado com sucesso'
      });

    } catch (error) {
      console.error('? Erro ao atualizar evento:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir evento
  app.delete('/api/events/:eventId', isAuthenticated, hasRole(['coordinator', 'admin', 'director']), async (req, res) => {
    try {
      const { eventId } = req.params;

      await db.update(events)
        .set({
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        })
        .where(eq(events.id, eventId));

      console.log(`??? Evento ${eventId} removido`);

      res.json({
        success: true,
        message: 'Evento removido com sucesso'
      });

    } catch (error) {
      console.error('? Erro ao remover evento:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Dashboard do coordenador - estat�sticas gerais
  app.get('/api/coordinator/dashboard', isAuthenticated, hasRole(['coordinator', 'admin', 'teacher']), async (req, res) => {
    try {
      
      // Total de professores
      const totalTeachers = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'teacher'));

      // Total de alunos
      const totalStudents = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'student'));

      // Total de turmas
      const totalClasses = await db
        .select({ count: count() })
        .from(classes);

      // Atividades pendentes de aprova��o
      const pendingActivities = await db
        .select({ count: count() })
        .from(activities)
        .where(eq(activities.approvedByCoordinator, 0));

      // Provas cadastradas
      const totalExams = await db
        .select({ count: count() })
        .from(exams);

      const dashboardData = {
        totals: {
          teachers: totalTeachers[0]?.count || 0,
          students: totalStudents[0]?.count || 0,
          classes: totalClasses[0]?.count || 0,
          pendingActivities: pendingActivities[0]?.count || 0,
          exams: totalExams[0]?.count || 0
        }
      };

      console.log('?? Dashboard do coordenador gerado');

      res.json(dashboardData);

    } catch (error) {
      console.error('? Erro ao gerar dashboard do coordenador:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para coordenador buscar todas as notas de provas
  app.get('/api/coordinator/exam-grades', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      console.log('?? Buscando notas de provas para coordenador...');

      // Buscar todas as notas de provas com informa��es das turmas
      const examGradesData = await db
        .select({
          id: examGrades.id,
          examId: examGrades.examId,
          studentId: examGrades.studentId,
          grade: examGrades.grade,
          isPresent: examGrades.isPresent,
          observations: examGrades.observations,
          gradedAt: examGrades.gradedAt,
          // Informa��es da prova
          examTitle: exams.title,
          examDate: exams.examDate,
          totalPoints: exams.totalPoints,
          // Informa��es da turma
          className: classes.name,
          classId: classes.id,
          // Informa��es do aluno
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName')
        })
        .from(examGrades)
        .leftJoin(exams, eq(examGrades.examId, exams.id))
        .leftJoin(classes, eq(exams.classId, classes.id))
        .leftJoin(users, eq(examGrades.studentId, users.id))
        .where(isNotNull(examGrades.grade)); // Apenas notas j� atribu�das

      console.log(`?? Encontradas ${examGradesData.length} notas de provas`);

      res.json(examGradesData);

    } catch (error) {
      console.error('? Erro ao buscar notas de provas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== EVENTOS GLOBAIS DO COORDENADOR =====
  
  // Criar evento global (coordenador) - VERS�O SIMPLIFICADA
  app.post('/api/coordinator/global-events', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const { title, description, type, startDate, endDate, startTime, endTime, location, color, classId, isGlobal } = req.body;
      const user = req.user;
      
      console.log('?? Criando evento:', { title, type, startDate, endDate, startTime, endTime, classId, isGlobal });

      // Corrigir timezone - garantir que a data seja salva no formato correto
      const formatDateForDB = (dateString: string, timeString?: string) => {
        if (!dateString) return null;
        // Se a data j� est� no formato YYYY-MM-DD, adicionar hor�rio para evitar timezone issues
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const time = timeString || '12:00';
          // Usar hor�rio local em vez de UTC para evitar problemas de timezone
          return `${dateString}T${time}:00`; // Sem .000Z para manter hor�rio local
        }
        return dateString;
      };

      const formattedStartDate = formatDateForDB(startDate, startTime);
      const formattedEndDate = endDate ? formatDateForDB(endDate, endTime || startTime) : formattedStartDate;

      console.log('?? Datas formatadas:', { originalStart: startDate, formattedStart: formattedStartDate, originalEnd: endDate, formattedEnd: formattedEndDate });

      // Usar SQL direto sem coluna isGlobal por enquanto
      const eventId = crypto.randomUUID();
      
      await client.execute({
        sql: `INSERT INTO events (
          id, title, description, type, startDate, endDate, location, color,
          classId, subjectId, createdBy, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          eventId,
          title || null,
          description || null,
          type || 'event',
          formattedStartDate,
          formattedEndDate,
          location || null,
          color || '#F97316',
          classId || null, // classId espec�fico ou null para global
          null, // subjectId
          user.id,
          'pending',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      });
      
      console.log('? Evento global criado com sucesso:', eventId);
      res.status(201).json({ 
        success: true, 
        message: "Evento global criado com sucesso", 
        event: {
          id: eventId,
          title,
          description,
          type,
          startDate,
          endDate,
          location,
          color,
          isGlobal: true
        }
      });
      
    } catch (error) {
      console.error('? Erro ao criar evento global:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar eventos globais (coordenador) - VERS�O SIMPLIFICADA
  app.get('/api/coordinator/global-events', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let globalEvents;
      
      // Buscar todos os eventos do coordenador com informa��es da turma
      if (startDate && endDate) {
        const result = await client.execute({
          sql: `SELECT 
                  e.*,
                  c.name as className
                FROM events e
                LEFT JOIN classes c ON e.classId = c.id
                WHERE e.createdBy = ? 
                AND e.startDate >= ? 
                AND e.startDate <= ?
                ORDER BY e.startDate`,
          args: [req.user.id, startDate, endDate]
        });
        globalEvents = result.rows;
      } else {
        const result = await client.execute({
          sql: `SELECT 
                  e.*,
                  c.name as className
                FROM events e
                LEFT JOIN classes c ON e.classId = c.id
                WHERE e.createdBy = ? 
                ORDER BY e.startDate`,
          args: [req.user.id]
        });
        globalEvents = result.rows;
      }
      
      // Adicionar isGlobal baseado na presen�a de classId
      const eventsWithGlobal = globalEvents.map(event => ({
        ...event,
        isGlobal: !event.classId // Se n�o tem classId, � global
      }));
      
      console.log(`?? Eventos globais encontrados: ${eventsWithGlobal.length}`);
      res.json(eventsWithGlobal);
      
    } catch (error) {
      console.error('? Erro ao buscar eventos globais:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar eventos para professores (incluindo globais)
  app.get('/api/teacher/:teacherId/events', isAuthenticated, hasRole(['teacher', 'coordinator', 'admin']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { startDate, endDate } = req.query;
      
      // Buscar eventos espec�ficos do professor (provas e atividades)
      let teacherEvents;
      if (startDate && endDate) {
        const result = await client.execute({
          sql: 'SELECT * FROM events WHERE createdBy = ? AND startDate >= ? AND startDate <= ?',
          args: [teacherId, startDate, endDate]
        });
        teacherEvents = result.rows;
      } else {
        const result = await client.execute({
          sql: 'SELECT * FROM events WHERE createdBy = ?',
          args: [teacherId]
        });
        teacherEvents = result.rows;
      }
      
      // Buscar turmas do professor para filtrar eventos espec�ficos
      const teacherClassesResult = await client.execute(`
        SELECT DISTINCT classId 
        FROM classSubjects 
        WHERE teacherId = ?
      `, [teacherId]);
      
      const teacherClassIds = teacherClassesResult.rows.map(row => row.classId);
      console.log(`?? Turmas do professor ${teacherId}:`, teacherClassIds);
      
      // Buscar eventos globais do coordenador (eventos criados pelo coordenador)
      let globalEvents;
      
      // Se o professor n�o tem turmas, s� mostra eventos globais
      if (teacherClassIds.length === 0) {
        if (startDate && endDate) {
          const result = await client.execute({
            sql: `SELECT 
                    e.*,
                    c.name as className
                  FROM events e
                  LEFT JOIN classes c ON e.classId = c.id
                  LEFT JOIN users u ON e.createdBy = u.id
                  WHERE u.role = 'coordinator'
                  AND e.startDate >= ? 
                  AND e.startDate <= ?
                  AND e.classId IS NULL
                  AND e.status = 'active'`,
            args: [startDate, endDate]
          });
          globalEvents = result.rows;
        } else {
          const result = await client.execute({
            sql: `SELECT 
                    e.*,
                    c.name as className
                  FROM events e
                  LEFT JOIN classes c ON e.classId = c.id
                  LEFT JOIN users u ON e.createdBy = u.id
                  WHERE u.role = 'coordinator'
                  AND e.classId IS NULL
                  AND e.status = 'active'`,
            args: []
          });
          globalEvents = result.rows;
        }
      } else {
        // Professor tem turmas - mostrar eventos globais + eventos das suas turmas
        if (startDate && endDate) {
          const result = await client.execute({
            sql: `SELECT 
                    e.*,
                    c.name as className
                  FROM events e
                  LEFT JOIN classes c ON e.classId = c.id
                  LEFT JOIN users u ON e.createdBy = u.id
                  WHERE u.role = 'coordinator'
                  AND e.startDate >= ? 
                  AND e.startDate <= ?
                  AND (e.classId IS NULL OR e.classId IN (${teacherClassIds.map(() => '?').join(',')}))
                  AND e.status = 'active'`,
            args: [startDate, endDate, ...teacherClassIds]
          });
          globalEvents = result.rows;
        } else {
          const result = await client.execute({
            sql: `SELECT 
                    e.*,
                    c.name as className
                  FROM events e
                  LEFT JOIN classes c ON e.classId = c.id
                  LEFT JOIN users u ON e.createdBy = u.id
                  WHERE u.role = 'coordinator'
                  AND (e.classId IS NULL OR e.classId IN (${teacherClassIds.map(() => '?').join(',')}))
                  AND e.status = 'active'`,
            args: [...teacherClassIds]
          });
          globalEvents = result.rows;
        }
      }
      
      // Adicionar isGlobal baseado na presen�a de classId
      const globalEventsWithFlag = globalEvents.map(event => ({
        ...event,
        isGlobal: !event.classId // Se n�o tem classId, � global
      }));
      
      // Combinar eventos
      const allEvents = [...teacherEvents, ...globalEventsWithFlag].sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      console.log(`?? Eventos do professor ${teacherId}: ${teacherEvents.length} espec�ficos + ${globalEvents.length} globais = ${allEvents.length} total`);
      res.json({ data: allEvents });
      
    } catch (error) {
      console.error('? Erro ao buscar eventos do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar eventos do calend�rio para coordenador (apenas eventos de coordenadores)
  app.get('/api/coordinator/calendar/events', isAuthenticated, hasRole(['coordinator', 'admin', 'director', 'teacher', 'student']), async (req, res) => {
    try {
      const user = req.user as any;
      const { startDate, endDate } = req.query;

      console.log('?? Buscando eventos do calend�rio para coordenador...');

      // Buscar eventos criados por coordenadores (ativos e pendentes) - usando SQL direto
      let coordinatorEventsResult;
      
      if (startDate && endDate) {
        coordinatorEventsResult = await client.execute(`
          SELECT 
            e.*,
            u.firstName || ' ' || u.lastName as creatorName,
            c.name as className,
            s.name as subjectName
          FROM events e
          LEFT JOIN users u ON e.createdBy = u.id
          LEFT JOIN classes c ON e.classId = c.id
          LEFT JOIN subjects s ON e.subjectId = s.id
          WHERE e.status = 'active'
          AND DATE(e.startDate) >= ?
          AND DATE(e.startDate) <= ?
          ORDER BY e.startDate DESC
        `, [startDate, endDate]);
      } else {
        coordinatorEventsResult = await client.execute(`
          SELECT 
            e.*,
            u.firstName || ' ' || u.lastName as creatorName,
            c.name as className,
            s.name as subjectName
          FROM events e
          LEFT JOIN users u ON e.createdBy = u.id
          LEFT JOIN classes c ON e.classId = c.id
          LEFT JOIN subjects s ON e.subjectId = s.id
          WHERE e.status = 'active'
          ORDER BY e.startDate DESC
        `);
      }
      
      const coordinatorEvents = coordinatorEventsResult.rows;

      // Formatar eventos para o calend�rio
      const formattedEvents = coordinatorEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        date: event.startDate,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        color: event.color,
        icon: event.type === 'exam' ? '??' : event.type === 'homework' ? '??' : '??',
        location: event.location,
        className: event.className,
        subjectName: event.subjectName,
        creatorName: event.creatorName,
        status: event.status,
        isGlobal: event.isGlobal,
        createdAt: event.createdAt
      }));

      console.log(`? Encontrados ${formattedEvents.length} eventos para coordenador`);

      res.json({
        success: true,
        data: formattedEvents
      });
    } catch (error) {
      console.error('? Erro ao buscar eventos do coordenador:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Buscar eventos para alunos (incluindo globais)
  app.get('/api/student/:studentId/events', isAuthenticated, hasRole(['student', 'coordinator', 'admin']), async (req, res) => {
    try {
      const { studentId } = req.params;
      const { startDate, endDate } = req.query;
      
      // Buscar turma do aluno
      const studentClassResult = await client.execute({
        sql: 'SELECT classId FROM studentClass WHERE studentId = ? AND status = ? LIMIT 1',
        args: [studentId, 'active']
      });
      
      let classEvents = [];
      if (studentClassResult.rows.length > 0) {
        const classId = studentClassResult.rows[0].classId;
        
        // Buscar eventos da turma do aluno
        if (startDate && endDate) {
          const result = await client.execute({
            sql: 'SELECT * FROM events WHERE classId = ? AND startDate >= ? AND startDate <= ?',
            args: [classId, startDate, endDate]
          });
          classEvents = result.rows;
        } else {
          const result = await client.execute({
            sql: 'SELECT * FROM events WHERE classId = ?',
            args: [classId]
          });
          classEvents = result.rows;
        }
      }
      
      // Buscar eventos globais do coordenador (eventos criados pelo coordenador)
      let globalEvents;
      const studentClassId = studentClassResult.rows.length > 0 ? studentClassResult.rows[0].classId : null;
      
      if (startDate && endDate) {
        const result = await client.execute({
          sql: `SELECT 
                  e.*,
                  c.name as className
                FROM events e
                LEFT JOIN classes c ON e.classId = c.id
                LEFT JOIN users u ON e.createdBy = u.id
                WHERE u.role = 'coordinator'
                AND e.startDate >= ? 
                AND e.startDate <= ?
                AND (e.classId IS NULL OR e.classId = ?)
                AND e.status = 'active'`,
          args: [startDate, endDate, studentClassId]
        });
        globalEvents = result.rows;
      } else {
        const result = await client.execute({
          sql: `SELECT 
                  e.*,
                  c.name as className
                FROM events e
                LEFT JOIN classes c ON e.classId = c.id
                LEFT JOIN users u ON e.createdBy = u.id
                WHERE u.role = 'coordinator'
                AND (e.classId IS NULL OR e.classId = ?)
                AND e.status = 'active'`,
          args: [studentClassId]
        });
        globalEvents = result.rows;
      }
      
      // Adicionar isGlobal baseado na presen�a de classId
      const globalEventsWithFlag = globalEvents.map(event => ({
        ...event,
        isGlobal: !event.classId // Se n�o tem classId, � global
      }));
      
      // Combinar eventos
      const allEvents = [...classEvents, ...globalEventsWithFlag].sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      console.log(`?? Eventos do aluno ${studentId}: ${classEvents.length} da turma + ${globalEvents.length} globais = ${allEvents.length} total`);
      res.json({ data: allEvents });
      
    } catch (error) {
      console.error('? Erro ao buscar eventos do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar eventos pendentes de aprova��o (diretor)
  app.get('/api/director/pending-events', isAuthenticated, hasRole(['director', 'admin']), async (req, res) => {
    try {
      console.log('?? Buscando eventos pendentes de aprova��o...');
      
      const pendingEvents = await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          type: events.type,
          startDate: events.startDate,
          endDate: events.endDate,
          location: events.location,
          color: events.color,
          classId: events.classId,
          subjectId: events.subjectId,
          createdBy: events.createdBy,
          isGlobal: events.isGlobal,
          status: events.status,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          creatorName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('creatorName'),
          creatorRole: users.role,
          className: classes.name,
          subjectName: subjects.name
        })
        .from(events)
        .leftJoin(users, eq(events.createdBy, users.id))
        .leftJoin(classes, eq(events.classId, classes.id))
        .leftJoin(subjects, eq(events.subjectId, subjects.id))
        .where(eq(events.status, 'pending'))
        .orderBy(desc(events.createdAt));

      console.log(`? Encontrados ${pendingEvents.length} eventos pendentes`);

      res.json({
        success: true,
        data: pendingEvents
      });
    } catch (error) {
      console.error('? Erro ao buscar eventos pendentes:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Aprovar evento (diretor)
  app.post('/api/director/events/:eventId/approve', isAuthenticated, hasRole(['director', 'admin']), async (req, res) => {
    try {
      const { eventId } = req.params;
      const user = req.user as any;

      console.log(`? Aprovando evento ${eventId} pelo diretor ${user.firstName} ${user.lastName}`);

      // Atualizar status do evento para 'active'
      await db
        .update(events)
        .set({ 
          status: 'active',
          updatedAt: new Date().toISOString()
        })
        .where(eq(events.id, eventId));

      console.log(`? Evento ${eventId} aprovado com sucesso`);

      res.json({
        success: true,
        message: 'Evento aprovado com sucesso'
      });
    } catch (error) {
      console.error('? Erro ao aprovar evento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Rejeitar evento (diretor)
  app.post('/api/director/events/:eventId/reject', isAuthenticated, hasRole(['director', 'admin']), async (req, res) => {
    try {
      const { eventId } = req.params;
      const user = req.user as any;

      console.log(`? Rejeitando evento ${eventId} pelo diretor ${user.firstName} ${user.lastName}`);

      // Atualizar status do evento para 'cancelled'
      await db
        .update(events)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        })
        .where(eq(events.id, eventId));

      console.log(`? Evento ${eventId} rejeitado com sucesso`);

      res.json({
        success: true,
        message: 'Evento rejeitado com sucesso'
      });
    } catch (error) {
      console.error('? Erro ao rejeitar evento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Excluir evento
  app.delete('/api/events/:eventId', isAuthenticated, hasRole(['director', 'admin', 'coordinator']), async (req, res) => {
    try {
      const { eventId } = req.params;
      const user = req.user as any;

      console.log(`??? Excluindo evento ${eventId} pelo usu�rio ${user.firstName} ${user.lastName}`);

      // Verificar se o evento existe
      const existingEvent = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (existingEvent.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Evento n�o encontrado'
        });
      }

      // Verificar permiss�es (diretor e admin podem excluir qualquer evento, coordenador apenas os pr�prios)
      if (user.role !== 'director' && user.role !== 'admin' && existingEvent[0].createdBy !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Sem permiss�o para excluir este evento'
        });
      }

      // Excluir o evento
      await db
        .delete(events)
        .where(eq(events.id, eventId));

      console.log(`? Evento ${eventId} exclu�do com sucesso`);

      res.json({
        success: true,
        message: 'Evento exclu�do com sucesso'
      });
    } catch (error) {
      console.error('? Erro ao excluir evento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Deletar evento global (coordenador)
  app.delete('/api/coordinator/global-events/:id', isAuthenticated, hasRole(['coordinator', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      console.log('??? Deletando evento global:', id);

      // Verificar se o evento existe e pertence ao coordenador
      const event = await client.execute({
        sql: 'SELECT * FROM events WHERE id = ? AND createdBy = ?',
        args: [id, user.id]
      });

      if (event.rows.length === 0) {
        return res.status(404).json({ message: "Evento n�o encontrado ou voc� n�o tem permiss�o para delet�-lo" });
      }

      // Deletar o evento
      await client.execute({
        sql: 'DELETE FROM events WHERE id = ?',
        args: [id]
      });
      
      console.log('? Evento global deletado com sucesso:', id);
      res.json({ success: true, message: "Evento global deletado com sucesso" });
      
    } catch (error) {
      console.error('? Erro ao deletar evento global:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== FIM DOS EVENTOS GLOBAIS =====

  // ==================== ROTAS DE FREQU�NCIA ====================
  
  // Buscar hist�rico de frequ�ncia de um aluno
  app.get('/api/attendance/student/:studentId/history', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { studentId } = req.params;
      const user = req.user as any;

      console.log(`?? Buscando hist�rico de frequ�ncia do aluno ${studentId}`);

      // Buscar registros de frequ�ncia do aluno
      const attendanceRecords = await db
        .select({
          id: attendance.id,
          date: attendance.date,
          status: attendance.status,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(attendance)
        .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
        .leftJoin(classes, eq(attendance.classId, classes.id))
        .where(eq(attendance.studentId, studentId))
        .orderBy(desc(attendance.date));

      // Calcular estat�sticas
      const totalRecords = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
      const absentCount = totalRecords - presentCount;
      const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

      const stats = {
        totalRecords,
        presentCount,
        absentCount,
        attendanceRate
      };

      res.json({ success: true, data: attendanceRecords, stats });

    } catch (error) {
      console.error('Erro ao buscar hist�rico de frequ�ncia:', error);
      res.status(500).json({ message: error.message || "Erro interno do servidor" });
    }
  });
  
  // Buscar alunos de uma turma para frequ�ncia
  app.get('/api/attendance/class/:classId/students', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId } = req.params;
      const user = req.user as any;

      console.log(`?? Buscando alunos da turma ${classId} para frequ�ncia`);

      // Verificar se o professor tem acesso � turma
      const teacherClass = await db
        .select()
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ))
        .limit(1);

      if (teacherClass.length === 0) {
        return res.status(403).json({ message: "Acesso negado a esta turma" });
      }

      // Buscar alunos da turma
      const students = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          registrationNumber: users.registrationNumber,
          status: users.status
        })
        .from(users)
        .innerJoin(studentClass, eq(users.id, studentClass.studentId))
        .where(and(
          eq(studentClass.classId, classId),
          eq(users.role, 'student'),
          eq(users.status, 'active')
        ))
        .orderBy(users.firstName, users.lastName);

      console.log(`? Encontrados ${students.length} alunos na turma`);

      res.json(students);
    } catch (error) {
      console.error('Erro ao buscar alunos para frequ�ncia:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Marcar frequ�ncia
  app.post('/api/attendance', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const user = req.user as any;
      const { classId, subjectId, date, attendanceRecords } = req.body;

      console.log(`?? Salvando frequ�ncia para turma ${classId}, disciplina ${subjectId}, data ${date}`);
      console.log(`?? Registros:`, attendanceRecords);

      // Verificar se o professor tem acesso � turma e disciplina
      const teacherClass = await db
        .select()
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.subjectId, subjectId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ))
        .limit(1);

      if (teacherClass.length === 0) {
        return res.status(403).json({ message: "Acesso negado a esta turma/disciplina" });
      }

      let savedCount = 0;

      // Salvar cada registro de frequ�ncia
      for (const record of attendanceRecords) {
        try {
          // Verificar se j� existe um registro para este aluno nesta data
          const existingRecord = await db
            .select()
            .from(attendance)
            .where(and(
              eq(attendance.studentId, record.studentId),
              eq(attendance.classId, classId),
              eq(attendance.subjectId, subjectId),
              eq(attendance.date, date)
            ))
            .limit(1);

          if (existingRecord.length > 0) {
            // Atualizar registro existente
            await db
              .update(attendance)
              .set({
                status: record.status,
                updatedAt: new Date().toISOString()
              })
              .where(eq(attendance.id, existingRecord[0].id));
          } else {
            // Criar novo registro
            await db.insert(attendance).values({
              id: crypto.randomUUID(),
              studentId: record.studentId,
              classId: classId,
              subjectId: subjectId,
              teacherId: user.id,
              date: date,
              status: record.status,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
          savedCount++;
        } catch (recordError) {
          console.error(`Erro ao salvar registro do aluno ${record.studentId}:`, recordError);
        }
      }

      console.log(`? Frequ�ncia salva com sucesso! ${savedCount} registros salvos.`);
      
      res.status(201).json({
        message: "Frequ�ncia marcada com sucesso",
        recordsCount: savedCount
      });
    } catch (error) {
      console.error('Erro ao marcar frequ�ncia:', error);
      res.status(500).json({ message: error.message || "Erro interno do servidor" });
    }
  });

  // Buscar frequ�ncia de uma turma em uma data espec�fica
  app.get('/api/attendance/class/:classId/subject/:subjectId/date/:date', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId, subjectId, date } = req.params;
      const user = req.user as any;

      console.log(`?? Buscando frequ�ncia para turma ${classId}, disciplina ${subjectId}, data ${date}`);

      // Verificar se o professor tem acesso � turma e disciplina
      const teacherClass = await db
        .select()
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.subjectId, subjectId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ))
        .limit(1);

      if (teacherClass.length === 0) {
        return res.status(403).json({ message: "Acesso negado a esta turma/disciplina" });
      }

      // Buscar registros de frequ�ncia existentes
      const attendanceRecords = await db
        .select({
          id: attendance.id,
          studentId: attendance.studentId,
          status: attendance.status
        })
        .from(attendance)
        .where(and(
          eq(attendance.classId, classId),
          eq(attendance.subjectId, subjectId),
          eq(attendance.date, date)
        ));

      console.log(`?? Encontrados ${attendanceRecords.length} registros de frequ�ncia`);
      res.json(attendanceRecords);
    } catch (error) {
      console.error('Erro ao buscar frequ�ncia:', error);
      res.status(500).json({ message: error.message || "Erro interno do servidor" });
    }
  });

  // Atualizar frequ�ncia individual
  app.put('/api/attendance/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user as any;

      console.log(`?? Atualizando frequ�ncia ${id} para status: ${status}`);

      // Verificar se o registro existe e pertence ao professor
      const attendanceRecord = await db
        .select()
        .from(attendance)
        .where(eq(attendance.id, id))
        .limit(1);

      if (attendanceRecord.length === 0) {
        return res.status(404).json({ message: "Registro de frequ�ncia n�o encontrado" });
      }

      if (attendanceRecord[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Validar status - apenas "present" ou "absent"
      if (!['present', 'absent'].includes(status)) {
        return res.status(400).json({ 
          message: `Status inv�lido: ${status}. Apenas 'present' ou 'absent' s�o permitidos.` 
        });
      }

      // Atualizar registro
      await db
        .update(attendance)
        .set({
          status,
          updatedAt: new Date().toISOString()
        })
        .where(eq(attendance.id, id));

      console.log(`? Frequ�ncia ${id} atualizada com sucesso`);

      res.json({ message: "Frequ�ncia atualizada com sucesso" });
    } catch (error) {
      console.error('Erro ao atualizar frequ�ncia:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar relat�rio de frequ�ncia de um aluno
  app.get('/api/attendance/student/:studentId/class/:classId/subject/:subjectId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { studentId, classId, subjectId } = req.params;
      const user = req.user as any;

      console.log(`?? Buscando relat�rio de frequ�ncia do aluno ${studentId}`);

      // Verificar se o professor tem acesso � turma e disciplina
      const teacherClass = await db
        .select()
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.subjectId, subjectId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ))
        .limit(1);

      if (teacherClass.length === 0) {
        return res.status(403).json({ message: "Acesso negado a esta turma/disciplina" });
      }

      // Buscar todos os registros de frequ�ncia do aluno
      const attendanceRecords = await db
        .select({
          date: attendance.date,
          status: attendance.status
        })
        .from(attendance)
        .where(and(
          eq(attendance.studentId, studentId),
          eq(attendance.classId, classId),
          eq(attendance.subjectId, subjectId)
        ))
        .orderBy(attendance.date);

      // Calcular estat�sticas
      const totalClasses = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
      const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
      const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
      const excusedCount = attendanceRecords.filter(r => r.status === 'excused').length;
      
      const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

      const report = {
        studentId,
        classId,
        subjectId,
        totalClasses,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        records: attendanceRecords
      };

      console.log(`? Relat�rio gerado: ${presentCount}/${totalClasses} presen�as (${attendanceRate.toFixed(1)}%)`);

      res.json(report);
    } catch (error) {
      console.error('Erro ao buscar relat�rio de frequ�ncia:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar frequ�ncia do aluno (para visualiza��o)
  app.get('/api/attendance/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { academicYear, subjectId } = req.query;
      const user = req.user as any;

      console.log(`?? Buscando frequ�ncia do aluno ${studentId}`);

      // Verificar permiss�es
      if (user.role === 'student' && user.id !== studentId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Usar SQL direto para buscar frequ�ncia do aluno
      let query = `
        SELECT 
          a.id,
          a.date,
          a.status,
          a.notes,
          s.name as subjectName,
          s.code as subjectCode,
          c.name as className,
          c.academicYear,
          a.createdAt
        FROM attendance a
        INNER JOIN classes c ON a.classId = c.id
        INNER JOIN subjects s ON a.subjectId = s.id
        WHERE a.studentId = ?
      `;
      
      const params = [studentId];
      
      // Adicionar filtros opcionais
      if (academicYear && academicYear !== 'all') {
        query += ' AND c.academicYear = ?';
        params.push(academicYear as string);
      }
      
      if (subjectId && subjectId !== 'all') {
        query += ' AND a.subjectId = ?';
        params.push(subjectId as string);
      }
      
      query += ' ORDER BY a.date DESC';
      
      const studentAttendance = await client.execute(query, params);
      
      // Calcular estat�sticas gerais
      const totalClasses = studentAttendance.rows.length;
      const presentCount = studentAttendance.rows.filter((a: any) => a.status === 'present').length;
      const absentCount = studentAttendance.rows.filter((a: any) => a.status === 'absent').length;
      const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

      const generalStats = {
        totalClasses,
        presentCount,
        absentCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      };

      // Calcular estat�sticas por disciplina
      const statsBySubject = [];
      const subjectMap = new Map();
      
      studentAttendance.rows.forEach((record: any) => {
        const subjectKey = record.subjectId || record.subjectName;
        if (!subjectMap.has(subjectKey)) {
          subjectMap.set(subjectKey, {
            subjectId: record.subjectId,
            subjectName: record.subjectName,
            totalClasses: 0,
            presentClasses: 0,
            absentClasses: 0
          });
        }
        
        const subject = subjectMap.get(subjectKey);
        subject.totalClasses++;
        if (record.status === 'present') {
          subject.presentClasses++;
        } else if (record.status === 'absent') {
          subject.absentClasses++;
        }
      });
      
      statsBySubject.push(...subjectMap.values());

      console.log(`? Frequ�ncia encontrada: ${presentCount}/${totalClasses} presen�as (${attendanceRate.toFixed(1)}%)`);

      res.json({
        attendance: studentAttendance.rows,
        statsBySubject,
        generalStats
      });
    } catch (error) {
      console.error('Erro ao buscar frequ�ncia do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar estat�sticas de frequ�ncia para coordenador
  app.get('/api/coordinator/attendance-stats', isAuthenticated, hasRole(['coordinator']), async (req, res) => {
    try {
      console.log('?? Buscando estat�sticas de frequ�ncia para coordenador');

      // Estat�sticas gerais de frequ�ncia usando SQL direto
      const generalStatsResult = await client.execute(`
        SELECT 
          COUNT(*) as totalRecords,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentCount,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentCount
        FROM attendance
      `);

      const generalStats = generalStatsResult.rows[0] || { totalRecords: 0, presentCount: 0, absentCount: 0 };
      const overallAttendanceRate = generalStats.totalRecords > 0 
        ? Math.round((generalStats.presentCount / generalStats.totalRecords) * 10000) / 100 
        : 0;

      // Frequ�ncia por turma usando SQL direto
      const attendanceByClassResult = await client.execute(`
        SELECT 
          c.id as classId,
          c.name as className,
          COUNT(DISTINCT a.studentId) as totalStudents,
          COUNT(a.id) as totalRecords,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentCount,
          ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 2) as attendanceRate
        FROM attendance a
        INNER JOIN classes c ON a.classId = c.id
        GROUP BY c.id, c.name
        ORDER BY attendanceRate DESC
      `);

      // Frequ�ncia por disciplina usando SQL direto
      const attendanceBySubjectResult = await client.execute(`
        SELECT 
          s.id as subjectId,
          s.name as subjectName,
          COUNT(a.id) as totalRecords,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentCount,
          ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 2) as attendanceRate
        FROM attendance a
        INNER JOIN subjects s ON a.subjectId = s.id
        GROUP BY s.id, s.name
        ORDER BY attendanceRate DESC
      `);

      // Alunos com baixa frequ�ncia (menos de 75%) usando SQL direto
      const lowAttendanceStudentsResult = await client.execute(`
        SELECT 
          u.id as studentId,
          u.firstName || ' ' || u.lastName as studentName,
          c.name as className,
          COUNT(a.id) as totalClasses,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentCount,
          ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 2) as attendanceRate
        FROM attendance a
        INNER JOIN users u ON a.studentId = u.id
        INNER JOIN classes c ON a.classId = c.id
        GROUP BY u.id, u.firstName, u.lastName, c.name
        HAVING attendanceRate < 75
        ORDER BY attendanceRate ASC
      `);

      const stats = {
        general: {
          totalRecords: generalStats.totalRecords || 0,
          presentCount: generalStats.presentCount || 0,
          absentCount: generalStats.absentCount || 0,
          overallAttendanceRate
        },
        byClass: attendanceByClassResult.rows,
        bySubject: attendanceBySubjectResult.rows,
        lowAttendanceStudents: lowAttendanceStudentsResult.rows
      };

      console.log(`? Estat�sticas de frequ�ncia geradas: ${stats.general.totalRecords} registros`);

      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estat�sticas de frequ�ncia:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  console.log('?? Rotas de frequ�ncia registradas!');

  // ==================== ROTAS DE NOTAS ====================
  
  // Buscar notas de uma turma/disciplina por bimestre
  app.get('/api/grades/class/:classId/subject/:subjectId/semester/:semester', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId, subjectId, semester } = req.params;
      const user = req.user as any;

      console.log(`?? Buscando notas da turma ${classId}, disciplina ${subjectId}, bimestre ${semester}`);

      // Verificar se o professor tem acesso � turma/disciplina
      const teacherAccess = await client.execute(`
        SELECT * FROM classSubjects 
        WHERE classId = ? AND subjectId = ? AND teacherId = ? AND status = 'active'
        LIMIT 1
      `, [classId, subjectId, user.id]);

      if (teacherAccess.rows.length === 0) {
        return res.status(403).json({ message: "Acesso negado a esta turma/disciplina" });
      }

      // Buscar alunos da turma
      const studentsResult = await client.execute(`
        SELECT u.id, u.firstName, u.lastName, u.registrationNumber
        FROM users u
        INNER JOIN classEnrollments ce ON u.id = ce.studentId
        WHERE ce.classId = ? AND u.role = 'student' AND ce.status = 'active'
        ORDER BY u.firstName, u.lastName
      `, [classId]);

      // Buscar notas existentes
      const gradesResult = await client.execute(`
        SELECT 
          g.id,
          g.studentId,
          g.type,
          g.title,
          g.grade,
          g.maxGrade,
          g.weight,
          g.date,
          g.comments
        FROM grades g
        INNER JOIN classSubjects cs ON g.classSubjectId = cs.id
        WHERE cs.classId = ? AND cs.subjectId = ? AND g.createdBy = ?
        ORDER BY g.date DESC
      `, [classId, subjectId, user.id]);

      const students = studentsResult.rows;
      const grades = gradesResult.rows;

      // Organizar notas por aluno
      const studentGrades = students.map((student: any) => {
        const studentGradeRecords = grades.filter((grade: any) => grade.studentId === student.id);
        const totalGrade = studentGradeRecords.reduce((sum: number, grade: any) => sum + (grade.grade * grade.weight), 0);
        const totalWeight = studentGradeRecords.reduce((sum: number, grade: any) => sum + grade.weight, 0);
        const averageGrade = totalWeight > 0 ? totalGrade / totalWeight : 0;

        return {
          ...student,
          fullName: `${student.firstName} ${student.lastName}`,
          grades: studentGradeRecords,
          averageGrade: Math.round(averageGrade * 100) / 100,
          totalGrades: studentGradeRecords.length
        };
      });

      console.log(`? Encontradas notas para ${students.length} alunos`);

      res.json({
        students: studentGrades,
        semester: parseInt(semester),
        totalStudents: students.length
      });

    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Adicionar nota para um aluno
  app.post('/api/grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const user = req.user as any;
      const { studentId, classId, subjectId, type, title, grade, maxGrade, weight, date, comments } = req.body;

      console.log(`?? Adicionando nota para aluno ${studentId}`);

      // Verificar se o professor tem acesso � turma/disciplina
      const teacherAccess = await client.execute(`
        SELECT * FROM classSubjects 
        WHERE classId = ? AND subjectId = ? AND teacherId = ? AND status = 'active'
        LIMIT 1
      `, [classId, subjectId, user.id]);

      if (teacherAccess.rows.length === 0) {
        return res.status(403).json({ message: "Acesso negado a esta turma/disciplina" });
      }

      const classSubjectId = teacherAccess.rows[0].id;
      const gradeId = uuidv4();
      const now = new Date().toISOString();

      // Inserir nota
      await client.execute(`
        INSERT INTO grades (id, studentId, classSubjectId, type, title, grade, maxGrade, weight, date, comments, createdBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        gradeId,
        studentId,
        classSubjectId,
        type,
        title,
        grade,
        maxGrade || 10,
        weight || 1,
        date,
        comments || '',
        user.id,
        now,
        now
      ]);

      console.log(`? Nota adicionada com sucesso: ${grade}/${maxGrade || 10}`);

      res.status(201).json({
        message: "Nota adicionada com sucesso",
        gradeId,
        grade: {
          id: gradeId,
          studentId,
          type,
          title,
          grade,
          maxGrade: maxGrade || 10,
          weight: weight || 1,
          date,
          comments: comments || ''
        }
      });

    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar nota
  app.put('/api/grades/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const { grade, maxGrade, weight, comments } = req.body;

      console.log(`?? Atualizando nota ${id}`);

      // Verificar se a nota existe e pertence ao professor
      const existingGrade = await client.execute(`
        SELECT g.*, cs.classId, cs.subjectId
        FROM grades g
        INNER JOIN classSubjects cs ON g.classSubjectId = cs.id
        WHERE g.id = ? AND g.createdBy = ?
      `, [id, user.id]);

      if (existingGrade.rows.length === 0) {
        return res.status(404).json({ message: "Nota n�o encontrada" });
      }

      const now = new Date().toISOString();

      // Atualizar nota
      await client.execute(`
        UPDATE grades 
        SET grade = ?, maxGrade = ?, weight = ?, comments = ?, updatedAt = ?
        WHERE id = ?
      `, [grade, maxGrade, weight, comments, now, id]);

      console.log(`? Nota atualizada com sucesso`);

      res.json({
        message: "Nota atualizada com sucesso",
        gradeId: id
      });

    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir nota
  app.delete('/api/grades/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      console.log(`??? Excluindo nota ${id}`);

      // Verificar se a nota existe e pertence ao professor
      const existingGrade = await client.execute(`
        SELECT * FROM grades WHERE id = ? AND createdBy = ?
      `, [id, user.id]);

      if (existingGrade.rows.length === 0) {
        return res.status(404).json({ message: "Nota n�o encontrada" });
      }

      // Excluir nota
      await client.execute(`DELETE FROM grades WHERE id = ?`, [id]);

      console.log(`? Nota exclu�da com sucesso`);

      res.json({
        message: "Nota exclu�da com sucesso"
      });

    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  console.log('?? Rotas de notas registradas!');

  // ==================== NOVO SISTEMA DE NOTAS - API SIMPLES ====================
  
  // Nova API para buscar notas de forma simples
  app.get('/api/exams/:examId/grades-simple', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { examId } = req.params;
      const user = req.user as any;

      // Tabela examGrades j� foi criada
      console.log('? Tabela examGrades pronta!');

      console.log(`?? [NOVO SISTEMA] Buscando notas da prova: ${examId}`);

      // 1. Buscar dados da prova
      const examResult = await client.execute(`
        SELECT id, title, classId, subjectId, totalPoints
        FROM exams 
        WHERE id = ? AND teacherId = ?
      `, [examId, user.id]);

      if (examResult.rows.length === 0) {
        return res.status(404).json({ message: 'Prova n�o encontrada' });
      }

      const exam = examResult.rows[0];
      console.log(`?? Prova encontrada:`, exam);

      // 2. Buscar alunos da turma
      const studentsResult = await client.execute(`
        SELECT u.id, u.firstName, u.lastName
        FROM users u
        INNER JOIN studentClass sc ON u.id = sc.studentId
        WHERE sc.classId = ? AND u.role = 'student' AND sc.status = 'active'
        ORDER BY u.firstName, u.lastName
      `, [exam.classId]);

      console.log(`?? Alunos encontrados:`, studentsResult.rows.length);

      // 3. Buscar notas existentes (usando examId diretamente) - apenas a mais recente com nota v�lida
      const gradesResult = await client.execute(`
        SELECT studentId, grade, isPresent
        FROM examGrades 
        WHERE examId = ? AND grade IS NOT NULL
        ORDER BY updatedAt DESC
      `, [examId]);

      console.log(`?? Notas encontradas:`, gradesResult.rows);

      // 4. Organizar dados
      const students = studentsResult.rows.map((student: any) => {
        const existingGrade = gradesResult.rows.find((g: any) => g.studentId === student.id);
        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          grade: existingGrade ? existingGrade.grade : null,
          isPresent: existingGrade ? existingGrade.isPresent : true
        };
      });

      console.log(`? Dados organizados para ${students.length} alunos`);

      res.json({
        exam: {
          id: exam.id,
          title: exam.title,
          totalPoints: exam.totalPoints
        },
        students
      });

    } catch (error) {
      console.error('? Erro ao buscar notas:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Nova API para salvar notas de forma simples
  app.post('/api/exams/:examId/grades-simple', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { examId } = req.params;
      const { grades } = req.body;
      const user = req.user as any;

      console.log(`?? [NOVO SISTEMA] Salvando notas da prova: ${examId}`);
      console.log(`?? Dados recebidos:`, grades);

      // Verificar se a prova existe e pertence ao professor
      const examResult = await client.execute(`
        SELECT id FROM exams WHERE id = ? AND teacherId = ?
      `, [examId, user.id]);

      if (examResult.rows.length === 0) {
        return res.status(404).json({ message: 'Prova n�o encontrada' });
      }

      // Salvar/atualizar cada nota
      for (const gradeData of grades) {
        if (gradeData.grade !== null && gradeData.grade !== '') {
          console.log(`?? Salvando nota ${gradeData.grade} para aluno ${gradeData.studentId}`);
          
          // Gerar ID �nico para a nota
          const gradeId = uuidv4();
          
          await client.execute(`
            INSERT OR REPLACE INTO examGrades (id, examId, studentId, grade, isPresent, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `, [gradeId, examId, gradeData.studentId, gradeData.grade, gradeData.isPresent]);
        }
      }

      console.log(`? ${grades.length} notas processadas com sucesso`);

      res.json({ 
        message: 'Notas salvas com sucesso',
        saved: grades.length
      });

    } catch (error) {
      console.error('? Erro ao salvar notas:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // API para aluno ver suas notas
  app.get('/api/student/exams/:examId/grade', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const { examId } = req.params;
      const user = req.user as any;

      console.log(`????? [ALUNO] Buscando nota da prova: ${examId} para aluno: ${user.id}`);

      // Buscar nota do aluno para esta prova (apenas notas v�lidas)
      const gradeResult = await client.execute(`
        SELECT grade, isPresent, updatedAt
        FROM examGrades 
        WHERE examId = ? AND studentId = ? AND grade IS NOT NULL
        ORDER BY updatedAt DESC
        LIMIT 1
      `, [examId, user.id]);

      console.log(`?? Nota encontrada:`, gradeResult.rows);

      if (gradeResult.rows.length > 0) {
        const grade = gradeResult.rows[0];
        res.json({
          grade: grade.grade,
          isPresent: grade.isPresent,
          gradedAt: grade.updatedAt
        });
      } else {
        res.json({
          grade: null,
          isPresent: null,
          gradedAt: null
        });
      }

    } catch (error) {
      console.error('? Erro ao buscar nota do aluno:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // ==================== SISTEMA DE NOTAS SIMPLIFICADO ====================
  
  // Buscar detalhes de uma prova com alunos
  app.get('/api/exams/:examId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { examId } = req.params;
      const user = req.user as any;

      console.log(`?? Buscando detalhes da prova ${examId}`);
      console.log(`?? Professor solicitante: ${user.id}`);

      // Buscar dados da prova
      const examResult = await client.execute(`
        SELECT 
          e.id,
          e.title,
          e.description,
          e.examDate,
          e.duration,
          e.totalPoints,
          e.semester,
          e.bimonthly,
          e.status,
          s.name as subjectName,
          c.name as className,
          e.subjectId,
          e.classId
        FROM exams e
        INNER JOIN subjects s ON e.subjectId = s.id
        INNER JOIN classes c ON e.classId = c.id
        WHERE e.id = ? AND e.teacherId = ?
      `, [examId, user.id]);

      if (examResult.rows.length === 0) {
        return res.status(404).json({ message: "Prova n�o encontrada" });
      }

      const exam = examResult.rows[0];

      // Buscar alunos da turma
      const studentsResult = await client.execute(`
        SELECT 
          u.id as studentId,
          u.firstName,
          u.lastName,
          u.registrationNumber,
          u.firstName || ' ' || u.lastName as studentName
        FROM users u
        INNER JOIN classEnrollments ce ON u.id = ce.studentId
        WHERE ce.classId = ? AND u.role = 'student' AND ce.status = 'active'
        ORDER BY u.firstName, u.lastName
      `, [exam.classId]);

      // Buscar classSubjectId para esta prova
      console.log(`?? Buscando classSubjectId para: classId=${exam.classId}, subjectId=${exam.subjectId}, teacherId=${user.id}`);
      
      const classSubjectResult = await client.execute(`
        SELECT id FROM classSubjects 
        WHERE classId = ? AND subjectId = ? AND teacherId = ?
        LIMIT 1
      `, [exam.classId, exam.subjectId, user.id]);

      console.log(`?? ClassSubject encontrado:`, classSubjectResult.rows);

      let gradesResult = { rows: [] };
      if (classSubjectResult.rows.length > 0) {
        const classSubjectId = classSubjectResult.rows[0].id;
        console.log(`?? Buscando notas para classSubjectId: ${classSubjectId}, title: ${exam.title}, createdBy: ${user.id}`);
        
        // Buscar notas existentes da prova
        gradesResult = await client.execute(`
          SELECT 
            g.id,
            g.studentId,
            g.grade,
            g.maxGrade,
            g.comments,
            g.date
          FROM grades g
          WHERE g.classSubjectId = ? AND g.title = ? AND g.createdBy = ?
          ORDER BY g.date DESC
        `, [classSubjectId, exam.title, user.id]);
        
        console.log(`?? Query executada, notas encontradas:`, gradesResult.rows);
      } else {
        console.log(`? ClassSubject n�o encontrado!`);
      }

      console.log(`?? Notas encontradas:`, gradesResult.rows.length);
      console.log(`?? Alunos encontrados:`, studentsResult.rows.length);

      // Organizar dados dos alunos com suas notas
      const students = studentsResult.rows.map((student: any) => {
        const studentGrade = gradesResult.rows.find((grade: any) => grade.studentId === student.studentId);
        return {
          id: student.studentId,
          studentId: student.studentId,
          studentName: student.studentName,
          firstName: student.firstName,
          lastName: student.lastName,
          registrationNumber: student.registrationNumber,
          grade: studentGrade ? studentGrade.grade : null,
          maxGrade: studentGrade ? studentGrade.maxGrade : exam.totalPoints,
          observations: studentGrade ? studentGrade.comments : '',
          isPresent: true,
          date: studentGrade ? studentGrade.date : null
        };
      });

      console.log(`? Dados organizados: ${students.length} alunos, ${students.filter(s => s.grade !== null).length} com notas`);

      res.json({
        ...exam,
        grades: students,
        totalStudents: students.length
      });

    } catch (error) {
      console.error('Erro ao buscar detalhes da prova:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Salvar notas de uma prova (sistema simplificado)
  app.post('/api/exams/:examId/grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { examId } = req.params;
      const { grades } = req.body;
      const user = req.user as any;

      console.log(`?? Salvando notas da prova ${examId}`);
      console.log(`?? Dados recebidos:`, grades);

      // Buscar dados da prova
      const examResult = await client.execute(`
        SELECT * FROM exams WHERE id = ? AND teacherId = ?
      `, [examId, user.id]);

      if (examResult.rows.length === 0) {
        return res.status(404).json({ message: "Prova n�o encontrada" });
      }

      const exam = examResult.rows[0];
      const now = new Date().toISOString();

      // Processar cada nota
      for (const gradeData of grades) {
        if (gradeData.grade !== null && gradeData.grade !== '' && gradeData.grade !== '0.0') {
          const gradeId = uuidv4();
          const parsedGrade = parseFloat(gradeData.grade);
          
          console.log(`?? Salvando nota: ${parsedGrade} para aluno ${gradeData.studentId}`);
          
          // Buscar classSubjectId correto
          const classSubjectResult = await client.execute(`
            SELECT id FROM classSubjects 
            WHERE classId = ? AND subjectId = ? AND teacherId = ?
            LIMIT 1
          `, [exam.classId, exam.subjectId, user.id]);

          if (classSubjectResult.rows.length === 0) {
            console.log(`? ClassSubject n�o encontrado para classId=${exam.classId}, subjectId=${exam.subjectId}, teacherId=${user.id}`);
            continue;
          }

          const classSubjectId = classSubjectResult.rows[0].id;
          console.log(`?? ClassSubjectId encontrado: ${classSubjectId}`);

          // Inserir ou atualizar nota
          await client.execute(`
            INSERT OR REPLACE INTO grades (id, studentId, classSubjectId, type, title, grade, maxGrade, weight, date, comments, createdBy, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            gradeId,
            gradeData.studentId,
            classSubjectId,
            'exam',
            exam.title,
            parsedGrade,
            exam.totalPoints,
            1,
            exam.examDate,
            gradeData.observations || '',
            user.id,
            now,
            now
          ]);
          
          console.log(`? Nota salva: ${parsedGrade} para aluno ${gradeData.studentId}`);
        }
      }

      console.log(`? Processamento conclu�do para ${grades.length} alunos`);

      res.json({
        message: "Notas salvas com sucesso",
        examId,
        gradesCount: grades.length
      });

    } catch (error) {
      console.error('Erro ao salvar notas da prova:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  console.log('?? Rotas de detalhes de prova registradas!');

  // ===== ADMIN STUDENTS APIs =====
  
  // PUT /api/admin/students/:id - Atualizar estudante
  app.put('/api/admin/students/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { firstName, lastName, email, phone, address, classId } = req.body;

      console.log("Atualiza��o de estudante " + id + " solicitada por: " + user.firstName + " " + user.lastName);
      console.log('?? Dados atualizados:', { firstName, lastName, email, phone, address, classId });

      // Valida��es b�sicas
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Nome, sobrenome e email s�o obrigat�rios" });
      }

      // Verificar se o estudante existe
      const existingStudent = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.role, 'student')));

      if (existingStudent.length === 0) {
        return res.status(404).json({ message: "Estudante n�o encontrado" });
      }

      // Atualizar dados do estudante
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          email,
          phone: phone || null,
          address: address || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, id));

      // Se classId foi fornecido, atualizar a matr�cula
      if (classId) {
        // Verificar se a turma existe
        const classExists = await db
          .select()
          .from(classes)
          .where(eq(classes.id, classId));

        if (classExists.length === 0) {
          return res.status(400).json({ message: "Turma n�o encontrada" });
        }

        // Atualizar ou criar matr�cula
        const existingEnrollment = await db
          .select()
          .from(studentClass)
          .where(and(
            eq(studentClass.studentId, id),
            eq(studentClass.status, 'active')
          ));

        if (existingEnrollment.length > 0) {
          // Atualizar matr�cula existente
          await db
            .update(studentClass)
            .set({
              classId,
              updatedAt: new Date().toISOString()
            })
            .where(eq(studentClass.id, existingEnrollment[0].id));
        } else {
          // Criar nova matr�cula
          await db.insert(studentClass).values({
            id: crypto.randomUUID(),
            studentId: id,
            classId,
            status: 'active',
            enrollmentDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      console.log("? Estudante atualizado com sucesso!");
      res.json({ message: "Estudante atualizado com sucesso" });

    } catch (error) {
      console.error('? Erro ao atualizar estudante:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/admin/students/:id - Excluir estudante
  app.delete('/api/admin/students/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { password } = req.body;

      console.log("Exclus�o de estudante " + id + " solicitada por: " + user.firstName + " " + user.lastName);

      // Verificar senha de confirma��o
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirma��o incorreta" });
      }

      // Verificar se estudante existe usando SQL direto
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dbPath = path.join(__dirname, 'school.db');
      const sqliteDb = new Database(dbPath);
      
      let existingStudent = null;
      try {
        const selectSql = 'SELECT * FROM users WHERE id = ? AND role = ? LIMIT 1';
        existingStudent = sqliteDb.prepare(selectSql).get(id, 'student');
      } finally {
        sqliteDb.close();
      }

      if (!existingStudent) {
        return res.status(404).json({ message: "Estudante n�o encontrado" });
      }

      const studentToDelete = existingStudent;
      console.log("Estudante a ser deletado: " + studentToDelete.firstName + " " + studentToDelete.lastName);

      // Usar SQL direto para deletar estudante
      console.log("??? Removendo v�nculos do estudante " + id + "...");
      
      // Desabilitar foreign keys usando SQL direto
      const sqliteDb2 = new Database(dbPath);
      try {
        sqliteDb2.prepare('PRAGMA foreign_keys = OFF').run();
        console.log("[UNLOCK] Foreign key constraints desabilitadas");
      } finally {
        sqliteDb2.close();
      }
      
      try {
        const sqliteDb3 = new Database(dbPath);
        try {
          // 1. Remover matr�culas
          const deleteStudentClassSql = 'DELETE FROM studentClass WHERE studentId = ?';
          const result1 = sqliteDb3.prepare(deleteStudentClassSql).run(id);
          console.log("[OK] Matr�culas removidas:", result1.changes, "linhas afetadas");
          
          // 2. Remover notas (tabela n�o existe)
          console.log("[INFO] Tabela examGrades n�o existe, pulando...");
          
          // 3. Remover presen�as (tabela n�o existe)
          console.log("[INFO] Tabela attendance n�o existe, pulando...");
          
          // 4. Remover o estudante
          const deleteStudentSql = 'DELETE FROM users WHERE id = ?';
          const result4 = sqliteDb3.prepare(deleteStudentSql).run(id);
          console.log("[OK] Estudante removido:", result4.changes, "linhas afetadas");
          
          // Reabilitar foreign keys
          sqliteDb3.prepare('PRAGMA foreign_keys = ON').run();
          
        } finally {
          sqliteDb3.close();
        }
        
        console.log("? Estudante deletado com sucesso!");
        res.json({ message: "Estudante deletado com sucesso" });
        
      } catch (error) {
        console.error("? Erro ao deletar estudante:", error);
        const sqliteDb4 = new Database(dbPath);
        try {
          sqliteDb4.prepare('PRAGMA foreign_keys = ON').run();
        } finally {
          sqliteDb4.close();
        }
        res.status(500).json({ message: "Erro interno do servidor" });
      }

    } catch (error) {
      console.error('? Erro ao excluir estudante:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  console.log('?? Rotas de estudantes do admin registradas!');

  // Director Approvals API - Listar aprova��es pendentes
  app.get('/api/director/approvals/pending', isAuthenticated, hasRole(['director']), async (req, res) => {
    try {
      const user = req.user;
      console.log("Listando aprova��es pendentes solicitado por: " + user.firstName + " " + user.lastName);

      // Buscar usu�rios pendentes de aprova��o usando Drizzle ORM
      const pendingUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          registrationNumber: users.registrationNumber,
          createdAt: users.createdAt,
          status: users.status
        })
        .from(users)
        .where(eq(users.status, 'pending'))
        .orderBy(desc(users.createdAt));
      
      console.log("?? Usu�rios pendentes encontrados:", pendingUsers.length);

      // Buscar turmas pendentes de aprova��o usando Drizzle ORM
      const pendingClasses = await db
        .select({
          id: classes.id,
          name: classes.name,
          grade: classes.grade,
          section: classes.section,
          academicYear: classes.academicYear,
          capacity: classes.capacity,
          createdAt: classes.createdAt,
          status: classes.status
        })
        .from(classes)
        .where(eq(classes.status, 'pending'))
        .orderBy(desc(classes.createdAt));
      
      console.log("?? Turmas pendentes encontradas:", pendingClasses.length);

      // Buscar disciplinas pendentes de aprova��o usando Drizzle ORM
      const pendingSubjects = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description,
          createdAt: subjects.createdAt,
          status: subjects.status
        })
        .from(subjects)
        .where(eq(subjects.status, 'pending'))
        .orderBy(desc(subjects.createdAt));
      
      console.log("?? Disciplinas pendentes encontradas:", pendingSubjects.length);

      // Formatar dados para o frontend
      const formattedApprovals = [
        ...pendingUsers.map(user => ({
          id: user.id,
          type: 'user',
          title: `Novo ${user.role === 'teacher' ? 'Professor' : user.role === 'coordinator' ? 'Coordenador' : 'Usu�rio'} - ${user.firstName} ${user.lastName}`,
          description: `Cria��o de novo perfil de ${user.role === 'teacher' ? 'professor' : user.role === 'coordinator' ? 'coordenador pedag�gico' : 'usu�rio'}`,
          requestedBy: 'Administrador',
          requestedAt: user.createdAt.split('T')[0],
          priority: 'high',
          details: {
            email: user.email,
            role: user.role === 'teacher' ? 'Professor' : user.role === 'coordinator' ? 'Coordenador' : 'Usu�rio',
            registrationNumber: user.registrationNumber
          }
        })),
        ...pendingClasses.map(cls => ({
          id: cls.id,
          type: 'class',
          title: `Nova Turma - ${cls.grade}� Ano ${cls.section}`,
          description: `Cria��o de nova turma para o ${cls.grade}� ano do ensino m�dio`,
          requestedBy: 'Administrador',
          requestedAt: cls.createdAt.split('T')[0],
          priority: 'medium',
          details: {
            capacity: cls.capacity,
            academicYear: cls.academicYear,
            grade: cls.grade,
            section: cls.section
          }
        })),
        ...pendingSubjects.map(subject => ({
          id: subject.id,
          type: 'subject',
          title: `Nova Disciplina - ${subject.name}`,
          description: `Implementa��o de disciplina de ${subject.name.toLowerCase()}`,
          requestedBy: 'Administrador',
          requestedAt: subject.createdAt.split('T')[0],
          priority: 'high',
          details: {
            code: subject.code,
            description: subject.description
          }
        }))
      ];

      console.log("Encontradas " + formattedApprovals.length + " aprova��es pendentes");
      res.json({ success: true, data: formattedApprovals });
    } catch (error) {
      console.error('Erro ao buscar aprova��es pendentes:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Director Approvals API - Aprovar solicita��o
  app.post('/api/director/approvals/approve', isAuthenticated, hasRole(['director']), async (req, res) => {
    try {
      const user = req.user;
      const { id, type } = req.body;

      console.log("Aprova��o solicitada por: " + user.firstName + " " + user.lastName);
      console.log('Dados da aprova��o:', { id, type });

      if (!id || !type) {
        return res.status(400).json({ message: "ID e tipo s�o obrigat�rios" });
      }

      let updatedItem;
      const now = new Date().toISOString();

      if (type === 'user') {
        // Buscar o usu�rio pendente usando Drizzle ORM
        const userToApprove = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);

        if (userToApprove.length === 0) {
          return res.status(404).json({ message: "Usu�rio n�o encontrado" });
        }

        const user = userToApprove[0];
        console.log("? Usu�rio encontrado para aprova��o:", user.firstName, user.lastName);

        if (user.status !== 'pending') {
          return res.status(400).json({ message: "Usu�rio j� foi processado" });
        }

        // Gerar email autom�tico �nico
        const cleanFirstName = user.firstName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const cleanLastName = user.lastName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        let baseEmail = `${cleanFirstName}.${cleanLastName}@escola.com`;
        let finalEmail = baseEmail;
        let counter = 1;
        
        // Verificar se o email j� existe e gerar varia��o �nica
        while (true) {
          const existingUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, finalEmail))
            .limit(1);
          
          if (existingUser.length === 0) {
            break; // Email �nico encontrado
          }
          
          // Gerar n�meros aleat�rios para evitar duplicatas
          const randomNum1 = Math.floor(Math.random() * 90) + 10; // 10-99
          const randomNum2 = Math.floor(Math.random() * 90) + 10; // 10-99
          finalEmail = `${cleanFirstName}.${cleanLastName}${randomNum1}${randomNum2}@escola.com`;
          counter++;
        }

        // Hash da senha padr�o
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('123', 10);

        // Atualizar o usu�rio com email e senha usando Drizzle ORM
        updatedItem = await db
          .update(users)
          .set({
            email: finalEmail,
            password: hashedPassword,
            status: 'active',
            updatedAt: now
          })
          .where(eq(users.id, id))
          .returning();

        // Se for aluno, ativar matr�cula na turma usando Drizzle ORM
        if (user.role === 'student') {
          await db
            .update(studentClass)
            .set({
              status: 'active',
              updatedAt: now
            })
            .where(eq(studentClass.studentId, id));
          
          console.log("? Matr�cula do aluno ativada");
        }
        
        // Se for professor, ativar v�nculos com disciplinas e turmas usando Drizzle ORM
        if (user.role === 'teacher') {
          await db
            .update(classSubjects)
            .set({
              status: 'active',
              updatedAt: now
            })
            .where(and(
              eq(classSubjects.teacherId, id),
              eq(classSubjects.status, 'pending')
            ));
          
          console.log("? V�nculos do professor ativados");
        }

        console.log("? Usu�rio aprovado e ativado: " + id);
        console.log("?? Email: " + finalEmail);
        console.log("?? Senha padr�o: 123");
      } else if (type === 'class') {
        updatedItem = await db
          .update(classes)
          .set({ 
            status: 'active',
            updatedAt: now
          })
          .where(eq(classes.id, id))
          .returning();
      } else if (type === 'subject') {
        updatedItem = await db
          .update(subjects)
          .set({ 
            status: 'active',
            updatedAt: now
          })
          .where(eq(subjects.id, id))
          .returning();
      } else {
        return res.status(400).json({ message: "Tipo inv�lido" });
      }

      if (updatedItem.length === 0) {
        return res.status(404).json({ message: "Item n�o encontrado" });
      }

      console.log(`${type} aprovado com sucesso: ${id}`);
      res.json({ success: true, message: "Item aprovado com sucesso" });
    } catch (error) {
      console.error('Erro ao aprovar item:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Director Approvals API - Rejeitar solicita��o
  app.post('/api/director/approvals/reject', isAuthenticated, hasRole(['director']), async (req, res) => {
    try {
      const user = req.user;
      const { id, type, reason } = req.body;

      console.log("Rejei��o solicitada por: " + user.firstName + " " + user.lastName);
      console.log('Dados da rejei��o:', { id, type, reason });

      if (!id || !type) {
        return res.status(400).json({ message: "ID e tipo s�o obrigat�rios" });
      }

      let updatedItem;
      const now = new Date().toISOString();

      if (type === 'user') {
        // Usar Drizzle ORM para rejeitar usu�rio
        updatedItem = await db
          .update(users)
          .set({
            status: 'rejected',
            updatedAt: now
          })
          .where(eq(users.id, id))
          .returning();
          
        console.log("? Usu�rio rejeitado:", updatedItem.length, "linhas afetadas");
      } else if (type === 'class') {
        updatedItem = await db
          .update(classes)
          .set({ 
            status: 'rejected',
            updatedAt: now
          })
          .where(eq(classes.id, id))
          .returning();
      } else if (type === 'subject') {
        updatedItem = await db
          .update(subjects)
          .set({ 
            status: 'rejected',
            updatedAt: now
          })
          .where(eq(subjects.id, id))
          .returning();
      } else {
        return res.status(400).json({ message: "Tipo inv�lido" });
      }

      if (updatedItem.length === 0) {
        return res.status(404).json({ message: "Item n�o encontrado" });
      }

      console.log(`${type} rejeitado: ${id} - Motivo: ${reason || 'N�o informado'}`);
      res.json({ success: true, message: "Item rejeitado" });
    } catch (error) {
      console.error('Erro ao rejeitar item:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE PER�ODOS LETIVOS =====
  
  // Buscar todos os per�odos
  app.get('/api/periods', isAuthenticated, hasRole(['admin', 'director', 'coordinator']), async (req, res) => {
    try {
      const periods = await db
        .select()
        .from(academicPeriods)
        .orderBy(academicPeriods.academicYear, academicPeriods.period);

      // Calcular dias restantes para cada per�odo
      const periodsWithDays = periods.map(period => {
        const today = new Date();
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        
        let remainingDays = 0;
        if (period.status === 'active') {
          const diffTime = endDate.getTime() - today.getTime();
          remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        return {
          ...period,
          remainingDays: remainingDays
        };
      });

      res.json({
        success: true,
        data: periodsWithDays
      });
    } catch (error) {
      console.error('? Erro ao buscar per�odos:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Criar novo per�odo
  app.post('/api/periods', isAuthenticated, hasRole(['admin', 'director']), async (req, res) => {
    try {
      const { name, description, period, academicYear, startDate, endDate } = req.body;
      const user = req.user as any;

      // Validar se j� existe um per�odo para o mesmo bimestre/ano
      const existingPeriod = await db
        .select()
        .from(academicPeriods)
        .where(
          and(
            eq(academicPeriods.period, period),
            eq(academicPeriods.academicYear, academicYear)
          )
        )
        .limit(1);

      if (existingPeriod.length > 0) {
        return res.status(400).json({
          success: false,
          message: `J� existe um ${period}� bimestre para o ano ${academicYear}`
        });
      }

      // Calcular total de dias
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const periodId = uuidv4();
      
      await db.insert(academicPeriods).values({
        id: periodId,
        name,
        description: description || '',
        period,
        academicYear,
        startDate,
        endDate,
        totalDays,
        remainingDays: totalDays,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`?? Per�odo criado: ${name} (${period}� bimestre ${academicYear})`);

      res.json({
        success: true,
        message: 'Per�odo criado com sucesso'
      });
    } catch (error) {
      console.error('? Erro ao criar per�odo:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Atualizar per�odo
  app.put('/api/periods/:id', isAuthenticated, hasRole(['admin', 'director']), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, startDate, endDate } = req.body;

      // Calcular total de dias
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      await db
        .update(academicPeriods)
        .set({
          name,
          description,
          startDate,
          endDate,
          totalDays,
          remainingDays: totalDays,
          updatedAt: new Date().toISOString()
        })
        .where(eq(academicPeriods.id, id));

      console.log(`?? Per�odo atualizado: ${id}`);

      res.json({
        success: true,
        message: 'Per�odo atualizado com sucesso'
      });
    } catch (error) {
      console.error('? Erro ao atualizar per�odo:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Iniciar per�odo
  app.post('/api/periods/:id/start', isAuthenticated, hasRole(['admin', 'director']), async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se j� existe um per�odo ativo
      const activePeriod = await db
        .select()
        .from(academicPeriods)
        .where(eq(academicPeriods.status, 'active'))
        .limit(1);

      if (activePeriod.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'J� existe um per�odo ativo. Encerre o per�odo atual antes de iniciar outro.'
        });
      }

      // Ativar o per�odo
      await db
        .update(academicPeriods)
        .set({
          status: 'active',
          isCurrent: true,
          updatedAt: new Date().toISOString()
        })
        .where(eq(academicPeriods.id, id));

      console.log(`?? Per�odo iniciado: ${id}`);

      res.json({
        success: true,
        message: 'Per�odo iniciado com sucesso'
      });
    } catch (error) {
      console.error('? Erro ao iniciar per�odo:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Encerrar per�odo
  app.post('/api/periods/:id/end', isAuthenticated, hasRole(['admin', 'director']), async (req, res) => {
    try {
      const { id } = req.params;

      // Encerrar o per�odo
      await db
        .update(academicPeriods)
        .set({
          status: 'completed',
          isCurrent: false,
          updatedAt: new Date().toISOString()
        })
        .where(eq(academicPeriods.id, id));

      console.log(`?? Per�odo encerrado: ${id}`);

      res.json({
        success: true,
        message: 'Per�odo encerrado com sucesso'
      });
    } catch (error) {
      console.error('? Erro ao encerrar per�odo:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Excluir per�odo
  app.delete('/api/periods/:id', isAuthenticated, hasRole(['admin', 'director']), async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se o per�odo est� ativo
      const period = await db
        .select()
        .from(academicPeriods)
        .where(eq(academicPeriods.id, id))
        .limit(1);

      if (period.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Per�odo n�o encontrado'
        });
      }

      if (period[0].status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'N�o � poss�vel excluir um per�odo ativo'
        });
      }

      await db
        .delete(academicPeriods)
        .where(eq(academicPeriods.id, id));

      console.log(`?? Per�odo exclu�do: ${id}`);

      res.json({
        success: true,
        message: 'Per�odo exclu�do com sucesso'
      });
    } catch (error) {
      console.error('? Erro ao excluir per�odo:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Buscar per�odo atual
  app.get('/api/periods/current', isAuthenticated, hasRole(['admin', 'director', 'coordinator', 'teacher', 'student']), async (req, res) => {
    try {
      const currentPeriod = await db
        .select()
        .from(academicPeriods)
        .where(eq(academicPeriods.status, 'active'))
        .limit(1);

      if (currentPeriod.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: 'Nenhum per�odo ativo encontrado'
        });
      }

      const period = currentPeriod[0];
      
      // Calcular dias restantes
      const today = new Date();
      const endDate = new Date(period.endDate);
      const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

      res.json({
        success: true,
        data: {
          ...period,
          remainingDays
        }
      });
    } catch (error) {
      console.error('? Erro ao buscar per�odo atual:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  // GET /api/admin/logs/terminal - Logs para terminal em tempo real (Admin)
  app.get('/api/admin/logs/terminal', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      // Buscar logs reais do banco de dados
      const logs = await db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(100);
      
      // Converter para o formato esperado pelo frontend
      const formattedLogs = logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        action: log.action,
        description: log.description,
        userId: log.userId,
        userName: log.userName,
        userRole: log.userRole,
        ipAddress: log.ipAddress, // J� mascarado no banco
        userAgent: log.userAgent,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        code: log.code
      }));

      res.json({
        success: true,
        data: {
          logs: formattedLogs,
          total: formattedLogs.length,
          lastUpdate: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erro ao buscar logs do terminal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  console.log('?? Rotas de logs do admin registradas!');

  return app;
};

