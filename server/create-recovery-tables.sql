-- Tabelas para sistema de recuperação de senha

-- Tabela para códigos de recuperação
CREATE TABLE IF NOT EXISTS password_recovery_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para tokens temporários
CREATE TABLE IF NOT EXISTS temp_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recovery_phone ON password_recovery_codes(phone);
CREATE INDEX IF NOT EXISTS idx_recovery_expires ON password_recovery_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_temp_phone ON temp_tokens(phone);
CREATE INDEX IF NOT EXISTS idx_temp_expires ON temp_tokens(expires_at);



