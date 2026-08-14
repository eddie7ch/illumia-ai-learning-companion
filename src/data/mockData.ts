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
    timeSpentMinutes: 25,
    content:
      'A React component is just a function that returns JSX (HTML-like markup written in JavaScript). ' +
      'Components let you split the UI into independent, reusable pieces, each responsible for one part ' +
      'of the screen. Component names must start with a capital letter so React can tell them apart from ' +
      'regular HTML tags. A component can render other components, forming a tree — your whole app is ' +
      'usually one root component made of many smaller ones. Props (short for "properties") are how a ' +
      'parent passes data down to a child component, similar to function arguments.',
  },
  {
    id: 'lesson-2',
    title: 'State and Props Deep Dive',
    type: 'lesson',
    topic: 'Fundamentals',
    status: 'completed',
    completedOn: '2026-07-22',
    timeSpentMinutes: 35,
    content:
      'Props are read-only data passed into a component from its parent — a component should never modify ' +
      'its own props. State is data a component owns and manages itself, created with the `useState` hook, ' +
      'and it can change over time in response to user actions (clicks, typing, etc.). Calling the state ' +
      'setter function schedules a re-render with the new value. A useful rule of thumb: if a value is ' +
      'passed in from outside, it is a prop; if a component needs to remember something and change it later, ' +
      'that is state.',
  },
  {
    id: 'exercise-1',
    title: 'Build a Todo Application',
    type: 'exercise',
    topic: 'State Management',
    status: 'completed',
    completedOn: '2026-07-28',
    timeSpentMinutes: 60,
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
    timeSpentMinutes: 20,
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
    timeSpentMinutes: 75,
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
    timeSpentMinutes: 15,
    content:
      'React re-renders a component whenever its state or props change, and by default also re-renders ' +
      'its children. For most apps this is fast enough and needs no special attention. When a specific ' +
      'component is genuinely slow, `React.memo` can skip re-rendering it if its props haven’t changed, ' +
      'and `useMemo`/`useCallback` can avoid recreating expensive values or functions on every render. ' +
      'Rule of thumb: measure first (e.g. with the React DevTools Profiler) before reaching for these — ' +
      'optimizing code that isn’t actually slow adds complexity for no benefit.',
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
    questions: [
      {
        id: 'q1',
        prompt: 'Which Testing Library query should you prefer for an interactive button?',
        choices: ['getByTestId', 'getByRole', 'getByClassName', 'querySelector'],
        correctIndex: 1,
        explanation: 'getByRole reflects how assistive tech and users find elements, so prefer it over test IDs or class names.',
      },
      {
        id: 'q2',
        prompt: 'What does `userEvent.click()` simulate more accurately than `fireEvent.click()`?',
        choices: [
          'Nothing, they are identical',
          'The full sequence of real user interactions (hover, focus, click)',
          'Server-side rendering',
          'CSS animations',
        ],
        correctIndex: 1,
        explanation: '`userEvent` fires the full realistic event sequence a browser would dispatch, catching more bugs than a single synthetic event.',
      },
      {
        id: 'q3',
        prompt: 'In a React component test, why mock the network/service layer instead of letting real requests fire?',
        choices: [
          'It makes tests slower',
          'It keeps tests fast, deterministic, and independent of a live backend',
          'It is required by TypeScript',
          'It improves code coverage automatically',
        ],
        correctIndex: 1,
        explanation: 'Mocking the service layer removes network flakiness and lets you control exactly what data a test exercises.',
      },
    ],
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
