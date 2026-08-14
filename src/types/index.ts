export type ActivityType = 'lesson' | 'exercise' | 'quiz';

export type ActivityStatus = 'completed' | 'in-progress' | 'not-started';

export interface AiFeedback {
  score: number;
  strengths: string[];
  suggestions: string[];
}

export interface Activity {
  id: string;
  title: string;
  type: ActivityType;
  topic: string;
  status: ActivityStatus;
  completedOn?: string;
  feedback?: AiFeedback;
}

export interface Recommendation {
  activityTitle: string;
  reason: string;
}

export interface LearnerProfile {
  name: string;
  track: string;
  overallProgress: number; // 0-100
  strengths: string[];
  improvementAreas: string[];
  recommendation: Recommendation;
}

export interface ChatMessage {
  id: string;
  role: 'learner' | 'ai';
  text: string;
}

export interface LearningPlanStep {
  id: string;
  title: string;
  description: string;
}
