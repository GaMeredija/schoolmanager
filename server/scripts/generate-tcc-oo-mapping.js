// Gera um DOCX com a seção "Mapeamento OO-Relacional" para uso no TCC.
// Saída: SchoolManager/docs/TCC-OO-Relational-Mapping.docx

const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');
const fs = require('fs');
const path = require('path');

function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level });
}

function para(text) {
  return new Paragraph({ children: [new TextRun(text)] });
}

async function main() {
  const doc = new Document({
    sections: [
      {
        children: [
          heading('Mapeamento OO-Relacional do SchoolManager', HeadingLevel.TITLE),
          para('Este capítulo descreve como o modelo Orientado a Objetos (OO) do SchoolManager se mapeia para o modelo Relacional (SQLite via Drizzle ORM). Inclui entidades, chaves, cardinalidades, agregados e recomendações.'),

          heading('1. Visão Geral'),
          para('Banco: SQLite acessado via Drizzle ORM (libsql). Identidades com chaves primárias TEXT; índices únicos em campos naturais (email, registrationNumber, code). Integridade referencial por FK. Polimorfismo por campos enum (role, status).'),

          heading('2. Entidades e Tabelas'),
          para('Usuários (users) → User: dados pessoais, papel e estado; relaciona-se com turmas (coordenador), disciplinas ministradas e comunicação.'),
          para('Turmas (classes) → Class: identificação, ano, capacidade, coordenação; relaciona-se com ClassSubject, Events, Notifications e Activities.'),
          para('Disciplinas (subjects) → Subject: nome, código único; ligada a ClassSubject, Activities, Events e Notifications.'),
          para('Alocação Turma–Disciplina–Professor (classSubjects) → ClassSubject: associa uma turma, uma disciplina e um professor em um período/horário.'),
          para('Matrículas (studentClass) → StudentEnrollment: ligação N:M entre alunos e turmas, com status e datas.'),
          para('Períodos Acadêmicos (academicPeriods) → AcademicPeriod: estrutura de bimestres/semestres com controle de atual/pendente.'),
          para('Notas (grades) → Grade: avaliação por tipo, peso, autor e alvo (aluno).'),
          para('Presenças (attendance) → Attendance: presença/ausência por data, turma, disciplina e professor.'),
          para('Eventos (events) → Event: calendário acadêmico com datas, horários, turma/disciplinas e escopo global.'),
          para('Notificações (notifications) → Notification: avisos por tipo/prioridade entre usuários e turmas/disciplinas.'),
          para('Configurações (settings) → Setting: chave/valor por categoria com autor da atualização.'),

          heading('3. Agregado de Atividades'),
          para('Atividades (activities) → Activity: tarefa com turma/disciplina/professor, prazos, regras de submissão e aprovação do coordenador.'),
          para('Arquivos (activityFiles) → ActivityFile: anexos categorizados por referência/modelo/exemplo.'),
          para('Entregas (activitySubmissions) → ActivitySubmission: envio do aluno com notas, feedback, atrasos e versão final.'),
          para('Arquivos da Entrega (submissionFiles) → SubmissionFile: anexos da submissão.'),
          para('Histórico (submissionHistory) → SubmissionHistory: log de ações e mudanças de estado/nota.'),
          para('Rubricas (activityRubrics) → ActivityRubric e Avaliações (rubricEvaluations) → RubricEvaluation: critérios e pontuações por avaliador.'),

          heading('4. Comunicação e Relatórios'),
          para('Mensagens (messages) → Message: trocas privadas/avisos do sistema com prioridade e encadeamento.'),
          para('Relatórios (reports) → Report: geração parametrizada com arquivo e status.'),
          para('Logs de Sistema (systemLogs) → SystemLog: auditoria com infos de dispositivo/geo quando habilitado.'),

          heading('5. Materiais e Provas'),
          para('Materiais (materials) → Material e Arquivos (materialFiles) → MaterialFile: conteúdos didáticos e anexos.'),
          para('Provas (exams) → Exam e Notas (examGrades) → ExamGrade: avaliações por bimestre/semestre.'),
          para('Horário (classSchedule) → ClassSchedule: agenda semanal da turma por disciplina/professor.'),

          heading('6. Cardinalidades Resumidas'),
          para('User 1:N Class (coordenação) e 1:N ClassSubject (docência); Class 1:N ClassSubject; User N:M Class via StudentEnrollment; Activity 1:N ActivityFile | ActivitySubmission | ActivityRubric; ActivitySubmission 1:N SubmissionFile | SubmissionHistory | RubricEvaluation; Material 1:N MaterialFile; Exam 1:N ExamGrade.'),

          heading('7. Boas Práticas'),
          para('Deleção lógica em entidades sensíveis; índices em consultas frequentes (messages, notifications, attendance, grades); uso de transações por agregado; versionamento de rubricas quando necessário.'),

          heading('8. Diagrama ER (Resumo)'),
          para('O diagrama completo está em SchoolManager/docs/OO-Relational-Mapping.md (Mermaid). Pode ser renderizado e inserido como imagem no TCC.'),
        ],
      },
    ],
  });

  const outDir = path.join(__dirname, '../../docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'TCC-OO-Relational-Mapping.docx');

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log('✅ Gerado:', outPath);
}

main().catch((err) => {
  console.error('Erro ao gerar DOCX:', err);
  process.exit(1);
});