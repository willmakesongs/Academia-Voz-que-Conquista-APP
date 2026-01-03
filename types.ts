
export enum Screen {
  LOGIN = 'LOGIN',
  STUDENT_DASHBOARD = 'STUDENT_DASHBOARD',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  LIBRARY = 'LIBRARY',
  PLAYER = 'PLAYER',
  TWISTERS = 'TWISTERS',
  BREATHING = 'BREATHING',
  CHAT = 'CHAT', // Nova tela da IA
  ROUTINE = 'ROUTINE',
  PROFILE = 'PROFILE',
  CALENDAR = 'CALENDAR'
}

export interface Vocalize {
  id: string;
  moduleId: string;
  title: string;
  category: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  duration: string;
  bpm: number;
  key: string;
  description: string;
  audioUrl?: string; // URL padrão (Geralmente agudo/feminino)
  audioUrlMale?: string; // URL opcional para vozes graves/masculinas
  exampleUrl?: string; // URL para exemplo/demonstração
}

export interface TwisterExercise {
  id: string;
  module: string; // 'A', 'B', 'C', 'D'
  moduleTitle: string;
  focus: string;
  title: string;
  text: string;
  difficulty: 'Nível 1' | 'Nível 2' | 'Desafio';
  instructions: string;
  targetBpm?: number; // Novo campo
}

export interface Module {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  topics: {
    id: string;
    title: string;
    description: string;
    content?: string; // Conteúdo HTML da aula teórica
  }[];
}

export interface User {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  avatarUrl: string;
}

export interface StudentSummary {
  id: string;
  name: string;
  avatarUrl: string;
  level: string;
  lastPractice: string;
  progress: number;
  status: 'active' | 'inactive';
  // Novos campos para detalhes
  notes?: string;
  phone?: string;
  age?: string;
  paymentDay?: string;
  modality?: 'Online' | 'Presencial';
  // Agendamento
  scheduleDay?: string;
  scheduleTime?: string;
}

export interface Appointment {
  id: string;
  studentId: string;
  studentName: string;
  avatarUrl: string;
  time: string;
  type: string;
  status: 'confirmed' | 'pending' | 'finished';
}

export interface Task {
  id: string | number;
  time: string;
  title: string;
  duration: string;
  status: 'pending' | 'completed' | 'locked';
  category: string;
  date: string; // Dia do mês (ex: '14') para linkar com o calendário
}
