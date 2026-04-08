-- Criar professores
INSERT INTO users (firstName, lastName, email, password, role, createdAt, updatedAt) VALUES 
('Maria', 'Silva', 'maria.silva@escola.com', '$2b$10$examplehash1', 'teacher', datetime('now'), datetime('now')),
('João', 'Santos', 'joao.santos@escola.com', '$2b$10$examplehash2', 'teacher', datetime('now'), datetime('now')),
('Ana', 'Costa', 'ana.costa@escola.com', '$2b$10$examplehash3', 'teacher', datetime('now'), datetime('now')),
('Pedro', 'Oliveira', 'pedro.oliveira@escola.com', '$2b$10$examplehash4', 'teacher', datetime('now'), datetime('now'));

-- Criar disciplinas  
INSERT INTO subjects (name, description, createdAt, updatedAt) VALUES 
('Matemática', 'Disciplina de Matemática', datetime('now'), datetime('now')),
('Português', 'Disciplina de Português', datetime('now'), datetime('now')),
('História', 'Disciplina de História', datetime('now'), datetime('now')),
('Ciências', 'Disciplina de Ciências', datetime('now'), datetime('now'));

-- Criar turmas
INSERT INTO classes (name, grade, description, createdAt, updatedAt) VALUES 
('9º F', '9', 'Turma do 9º ano F', datetime('now'), datetime('now')),
('8º A', '8', 'Turma do 8º ano A', datetime('now'), datetime('now')),
('8º B', '8', 'Turma do 8º ano B', datetime('now'), datetime('now')),
('7º C', '7', 'Turma do 7º ano C', datetime('now'), datetime('now'));

-- Vincular professores às disciplinas
INSERT INTO classSubjects (classId, teacherId, subjectId, createdAt, updatedAt) VALUES 
(1, 1, 1, datetime('now'), datetime('now')), -- 9º F - Maria Silva - Matemática
(2, 2, 2, datetime('now'), datetime('now')), -- 8º A - João Santos - Português
(3, 3, 4, datetime('now'), datetime('now')), -- 8º B - Ana Costa - Ciências
(4, 4, 3, datetime('node'), datetime('now')); -- 7º C - Pedro Oliveira - História

-- Criar alunos
INSERT INTO users (firstName, lastName, email, password, role, createdAt, updatedAt) VALUES 
('Carlos', 'Rodrigues', 'carlos.r@escola.com', '$2b$10$examplehash5', 'student', datetime('now'), datetime('now')),
('Lucia', 'Ferreira', 'lucia.f@escola.com', '$2b$10$examplehash6', 'student', datetime('now'), datetime('now')),
('Rafael', 'Mendes', 'rafael.m@escola.com', '$2b$10$examplehash7', 'student', datetime('now'), datetime('now')),
('Isabella', 'Gomes', 'isabella.g@escola.com', '$2b$10$examplehash8', 'student', datetime('now'), datetime('now')),
('Diego', 'Alves', 'diego.a@escola.com', '$2b$10$examplehash9', 'student', datetime('now'), datetime('now')),
('Juliana', 'Pereira', 'juliana.p@escola.com', '$2b$10$examplehash10', 'student', datetime('now'), datetime('now')),
('Thiago', 'Nunes', 'thiago.n@escola.com', '$2b$10$examplehash11', 'student', datetime('now'), datetime('now')),
('Camila', 'Barbosa', 'camila.b@escola.com', '$2b$10$examplehash12', 'student', datetime('now'), datetime('now')),
('Guilherme', 'Castro', 'guilherme.c@escola.com', '$2b$10$examplehash13', 'student', datetime('now'), datetime('now')),
('Natália', 'Lima', 'natalia.l@escola.com', '$2b$10$examplehash14', 'student', datetime('now'), datetime('now'));

-- Vincular alunos às turmas
INSERT INTO studentClass (studentId, classId, status, enrolledAt) VALUES 
(5, 1, 'active', datetime('now')), -- Carlos -> 9º F
(6, 1, 'active', datetime('now')), -- Lucia -> 9º F  
(7, 1, 'active', datetime('now')), -- Rafael -> 9º F
(8, 2, 'active', datetime('now')), -- Isabella -> 8º A
(9, 2, 'active', datetime('now')), -- Diego -> 8º A
(10, 2, 'active', datetime('now')), -- Juliana -> 8º A
(11, 3, 'active', datetime('now')), -- Thiago -> 8º B
(12, 3, 'active', datetime('now')), -- Camila -> 8º B
(13, 3, 'active', datetime('now')), -- Guilherme -> 8º B
(14, 4, 'active', datetime('now')); -- Natália -> 7º C

