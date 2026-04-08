# Arquitetura do Sistema de Atividades Avançado

## Visão Geral

Este documento define a arquitetura para um sistema de atividades complexo e avançado que expande significativamente as capacidades do sistema atual.

## Análise do Sistema Atual

### Estrutura Existente
- **Tabelas**: activities, activity_submissions, activity_files, submission_files, submission_history
- **Tipos**: Atividades básicas com upload de arquivos
- **Funcionalidades**: Criação, submissão, avaliação manual
- **Limitações**: Apenas atividades tradicionais, sem interatividade, sem colaboração

## Nova Arquitetura Proposta

### 1. Tipos de Atividade Avançados

#### 1.1 Quiz Interativo
```typescript
interface QuizActivity {
  id: string;
  type: 'quiz';
  questions: QuizQuestion[];
  timeLimit?: number; // em minutos
  allowRetries: boolean;
  maxRetries?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  passingScore?: number;
}

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'drag_drop' | 'matching';
  question: string;
  points: number;
  options?: QuizOption[];
  correctAnswer?: string | string[];
  explanation?: string;
  media?: MediaContent;
}
```

#### 1.2 Projeto Colaborativo
```typescript
interface CollaborativeProject {
  id: string;
  type: 'collaborative_project';
  teamSize: { min: number; max: number };
  allowSelfSelection: boolean;
  phases: ProjectPhase[];
  deliverables: Deliverable[];
  peerReviewEnabled: boolean;
  realTimeCollaboration: boolean;
}

interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  requirements: string[];
  weight: number; // porcentagem da nota final
}
```

#### 1.3 Laboratório Virtual
```typescript
interface VirtualLab {
  id: string;
  type: 'virtual_lab';
  simulation: LabSimulation;
  experiments: Experiment[];
  safetyProtocols: string[];
  equipment: VirtualEquipment[];
  dataCollection: DataCollectionConfig;
}

interface LabSimulation {
  environment: '3d' | '2d' | 'text_based';
  physics: boolean;
  chemistry: boolean;
  biology: boolean;
  customScripts: string[];
}
```

#### 1.4 Apresentação Interativa
```typescript
interface InteractivePresentation {
  id: string;
  type: 'interactive_presentation';
  slides: PresentationSlide[];
  interactiveElements: InteractiveElement[];
  audienceParticipation: boolean;
  livePolling: boolean;
  recordingRequired: boolean;
}
```

#### 1.5 Portfólio Digital
```typescript
interface DigitalPortfolio {
  id: string;
  type: 'digital_portfolio';
  sections: PortfolioSection[];
  reflectionRequired: boolean;
  peerFeedback: boolean;
  publicView: boolean;
  templates: PortfolioTemplate[];
}
```

### 2. Sistema de Avaliação Avançado

#### 2.1 Rubricas Detalhadas
```typescript
interface AdvancedRubric {
  id: string;
  name: string;
  criteria: RubricCriterion[];
  weightedScoring: boolean;
  autoGrading: AutoGradingConfig;
}

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  levels: RubricLevel[];
  autoEvaluable: boolean;
}

interface RubricLevel {
  score: number;
  label: string;
  description: string;
  keywords?: string[]; // para auto-avaliação
}
```

#### 2.2 Avaliação Automática
```typescript
interface AutoGradingConfig {
  enabled: boolean;
  types: AutoGradingType[];
  aiAssisted: boolean;
  plagiarismCheck: boolean;
  codeExecution: boolean;
  languageProcessing: boolean;
}

type AutoGradingType = 
  | 'quiz_scoring'
  | 'code_compilation'
  | 'unit_tests'
  | 'style_check'
  | 'plagiarism_detection'
  | 'keyword_analysis'
  | 'sentiment_analysis';
```

### 3. Sistema de Colaboração

#### 3.1 Trabalho em Equipe
```typescript
interface TeamManagement {
  teamFormation: 'random' | 'teacher_assigned' | 'student_choice';
  teamRoles: TeamRole[];
  conflictResolution: ConflictResolutionConfig;
  progressTracking: TeamProgressConfig;
}

interface TeamRole {
  id: string;
  name: string;
  responsibilities: string[];
  permissions: Permission[];
}
```

#### 3.2 Peer Review
```typescript
interface PeerReviewConfig {
  enabled: boolean;
  anonymous: boolean;
  reciprocal: boolean;
  minimumReviews: number;
  reviewCriteria: ReviewCriterion[];
  reviewWeight: number; // porcentagem da nota final
}
```

### 4. Gamificação

#### 4.1 Sistema de Pontos e Badges
```typescript
interface GamificationSystem {
  pointsEnabled: boolean;
  badgesEnabled: boolean;
  leaderboards: boolean;
  achievements: Achievement[];
  progressPaths: LearningPath[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  criteria: AchievementCriterion[];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

#### 4.2 Progressão e Níveis
```typescript
interface LearningPath {
  id: string;
  name: string;
  description: string;
  levels: PathLevel[];
  prerequisites: string[];
  rewards: Reward[];
}
```

### 5. Analytics e Insights

#### 5.1 Dashboard do Professor
```typescript
interface TeacherAnalytics {
  engagementMetrics: EngagementMetric[];
  performanceAnalysis: PerformanceAnalysis;
  timeSpentAnalysis: TimeAnalysis;
  difficultyAnalysis: DifficultyAnalysis;
  collaborationInsights: CollaborationInsights;
}
```

#### 5.2 Dashboard do Aluno
```typescript
interface StudentAnalytics {
  personalProgress: ProgressMetrics;
  strengthsWeaknesses: SkillAnalysis;
  timeManagement: TimeManagementInsights;
  goalTracking: GoalProgress[];
  recommendations: LearningRecommendation[];
}
```

### 6. Estrutura de Banco de Dados Expandida

#### 6.1 Novas Tabelas
```sql
-- Tipos de atividade avançados
CREATE TABLE activity_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config_schema JSON,
    created_at TEXT NOT NULL
);

-- Configurações específicas por tipo
CREATE TABLE activity_configs (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    type_id TEXT NOT NULL,
    config_data JSON NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (type_id) REFERENCES activity_types(id)
);

-- Equipes e colaboração
CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);

CREATE TABLE team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT,
    joined_at TEXT NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sistema de rubricas
CREATE TABLE rubrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    criteria JSON NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE activity_rubrics (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    rubric_id TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (rubric_id) REFERENCES rubrics(id)
);

-- Avaliações detalhadas
CREATE TABLE detailed_evaluations (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    rubric_id TEXT NOT NULL,
    criterion_scores JSON NOT NULL,
    auto_generated BOOLEAN DEFAULT FALSE,
    evaluator_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES activity_submissions(id),
    FOREIGN KEY (rubric_id) REFERENCES rubrics(id)
);

-- Gamificação
CREATE TABLE user_achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at TEXT NOT NULL,
    activity_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_points (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    source TEXT NOT NULL,
    activity_id TEXT,
    earned_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Analytics
CREATE TABLE activity_analytics (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSON,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 7. APIs Expandidas

#### 7.1 Novos Endpoints
```typescript
// Tipos de atividade
GET /api/activity-types
POST /api/activity-types
GET /api/activity-types/:id
PUT /api/activity-types/:id
DELETE /api/activity-types/:id

// Configurações de atividade
GET /api/activities/:id/config
PUT /api/activities/:id/config

// Equipes
GET /api/activities/:id/teams
POST /api/activities/:id/teams
GET /api/teams/:id
PUT /api/teams/:id
DELETE /api/teams/:id
POST /api/teams/:id/members
DELETE /api/teams/:id/members/:userId

// Rubricas
GET /api/rubrics
POST /api/rubrics
GET /api/rubrics/:id
PUT /api/rubrics/:id
DELETE /api/rubrics/:id

// Avaliação avançada
POST /api/submissions/:id/detailed-evaluation
GET /api/submissions/:id/evaluations
POST /api/activities/:id/auto-grade

// Gamificação
GET /api/users/:id/achievements
GET /api/users/:id/points
GET /api/leaderboards/:type

// Analytics
GET /api/activities/:id/analytics
GET /api/users/:id/analytics
POST /api/activities/:id/track-event
```

### 8. Componentes Frontend

#### 8.1 Novos Componentes React
```typescript
// Criação de atividades avançadas
<AdvancedActivityCreator />
<QuizBuilder />
<CollaborativeProjectSetup />
<VirtualLabDesigner />
<RubricBuilder />

// Execução de atividades
<InteractiveQuiz />
<CollaborativeWorkspace />
<VirtualLabEnvironment />
<PeerReviewInterface />

// Avaliação e feedback
<DetailedGradingInterface />
<RubricEvaluator />
<AutoGradingDashboard />
<FeedbackComposer />

// Analytics e insights
<TeacherAnalyticsDashboard />
<StudentProgressDashboard />
<EngagementMetrics />
<PerformanceInsights />

// Gamificação
<AchievementDisplay />
<ProgressTracker />
<Leaderboard />
<BadgeCollection />
```

### 9. Implementação Faseada

#### Fase 1: Fundação (Semanas 1-2)
- Estrutura de banco expandida
- Sistema de tipos de atividade
- APIs básicas

#### Fase 2: Quiz Interativo (Semanas 3-4)
- Builder de quiz
- Engine de execução
- Auto-correção

#### Fase 3: Colaboração (Semanas 5-6)
- Sistema de equipes
- Workspace colaborativo
- Peer review

#### Fase 4: Avaliação Avançada (Semanas 7-8)
- Sistema de rubricas
- Avaliação automática
- Analytics básicos

#### Fase 5: Gamificação (Semanas 9-10)
- Sistema de pontos
- Badges e conquistas
- Leaderboards

#### Fase 6: Analytics e Insights (Semanas 11-12)
- Dashboard do professor
- Dashboard do aluno
- Relatórios avançados

### 10. Considerações Técnicas

#### 10.1 Performance
- Lazy loading para componentes complexos
- Caching inteligente
- Otimização de queries
- WebSockets para colaboração em tempo real

#### 10.2 Segurança
- Validação rigorosa de dados
- Sanitização de conteúdo
- Controle de acesso granular
- Auditoria de ações

#### 10.3 Escalabilidade
- Arquitetura modular
- Microserviços para funcionalidades específicas
- CDN para conteúdo estático
- Load balancing

#### 10.4 Acessibilidade
- WCAG 2.1 compliance
- Suporte a leitores de tela
- Navegação por teclado
- Alto contraste

Esta arquitetura fornece uma base sólida para um sistema de atividades verdadeiramente avançado e diferenciado, oferecendo experiências de aprendizagem ricas e interativas para professores e alunos.