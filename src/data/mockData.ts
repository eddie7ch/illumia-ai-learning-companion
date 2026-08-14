import type { Activity, ChatMessage, LearnerProfile } from '../types';

export const learnerProfile: LearnerProfile = {
  name: 'Jordan Lee',
  track: 'React Development',
  overallProgress: 62,
  strengths: [
    'Clear component structure and composition',
    'Solid understanding of state management basics',
    'Consistent, readable code style',
  ],
  improvementAreas: [
    'Performance optimization (memoization, re-render control)',
    'Automated testing coverage',
    'Handling asynchronous edge cases and errors',
  ],
  recommendation: {
    activityTitle: 'React Performance Optimization',
    reason:
      'Your component architecture is strong. The next opportunity is improving rendering performance.',
  },
};

export const activities: Activity[] = [
  {
    id: 'lesson-1',
    title: 'Introduction to React Components',
    type: 'lesson',
    topic: 'Fundamentals',
    status: 'completed',
    completedOn: '2026-07-20',
  },
  {
    id: 'lesson-2',
    title: 'State and Props Deep Dive',
    type: 'lesson',
    topic: 'Fundamentals',
    status: 'completed',
    completedOn: '2026-07-22',
  },
  {
    id: 'exercise-1',
    title: 'Build a Todo Application',
    type: 'exercise',
    topic: 'State Management',
    status: 'completed',
    completedOn: '2026-07-28',
    feedback: {
      score: 85,
      strengths: [
        'Good component structure',
        'Clear state management',
      ],
      suggestions: [
        'Add unit tests',
        'Optimize unnecessary renders',
      ],
    },
  },
  {
    id: 'quiz-1',
    title: 'React Fundamentals Quiz',
    type: 'quiz',
    topic: 'Fundamentals',
    status: 'completed',
    completedOn: '2026-07-29',
    feedback: {
      score: 92,
      strengths: [
        'Strong grasp of component lifecycle',
        'Correctly identified prop drilling issues',
      ],
      suggestions: [
        'Review Context API use cases',
      ],
    },
  },
  {
    id: 'exercise-2',
    title: 'Fetching and Displaying API Data',
    type: 'exercise',
    topic: 'Async & Effects',
    status: 'completed',
    completedOn: '2026-08-05',
    feedback: {
      score: 74,
      strengths: [
        'Correct use of useEffect for data fetching',
        'Clean loading and empty states',
      ],
      suggestions: [
        'Handle fetch errors and edge cases',
        'Avoid duplicate requests on re-render',
      ],
    },
  },
  {
    id: 'lesson-3',
    title: 'React Performance Optimization',
    type: 'lesson',
    topic: 'Performance',
    status: 'in-progress',
  },
  {
    id: 'exercise-3',
    title: 'Memoization Challenge',
    type: 'exercise',
    topic: 'Performance',
    status: 'not-started',
  },
  {
    id: 'quiz-2',
    title: 'Testing Fundamentals Quiz',
    type: 'quiz',
    topic: 'Testing',
    status: 'not-started',
  },
];

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'ai',
    text:
      "Hi Jordan! I'm your AI learning companion. Ask me anything about your recent activities, or try a question like \"Why is my React component re-rendering?\"",
  },
];
