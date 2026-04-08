-- Criar tabela de períodos acadêmicos
CREATE TABLE IF NOT EXISTS academicPeriods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  period INTEGER NOT NULL,
  academicYear TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  isCurrent INTEGER NOT NULL DEFAULT 0,
  totalDays INTEGER,
  remainingDays INTEGER,
  createdBy TEXT REFERENCES users(id),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
