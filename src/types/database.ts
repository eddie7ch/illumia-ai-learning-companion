export interface ActivityFeedbackJson {
  score: number;
  strengths: string[];
  suggestions: string[];
}

export interface ActivityQuestionJson {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ActivityRow {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  type: 'lesson' | 'exercise' | 'quiz';
  topic: string;
  status: 'completed' | 'in-progress' | 'not-started';
  completed_on: string | null;
  time_spent_minutes: number | null;
  feedback: ActivityFeedbackJson | null;
  questions: ActivityQuestionJson[] | null;
  content: string | null;
  sort_order: number;
  created_at: string;
}

export interface CourseRow {
  id: string;
  user_id: string;
  title: string;
  is_custom: boolean;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  name: string;
  created_at: string;
}
