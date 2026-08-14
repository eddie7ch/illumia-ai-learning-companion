import type { ActivityType, QuizQuestion } from '../types';

export interface CoursePresetActivity {
  title: string;
  type: ActivityType;
  topic: string;
  content?: string;
  questions?: QuizQuestion[];
}

export interface CoursePreset {
  id: string;
  title: string;
  description: string;
  activities: CoursePresetActivity[];
}

export const coursePresets: CoursePreset[] = [
  {
    id: 'react-development',
    title: 'React Development',
    description: 'Components, state, hooks, performance, and testing.',
    activities: [
      {
        title: 'Introduction to React Components',
        type: 'lesson',
        topic: 'Fundamentals',
        content:
          'A React component is just a function that returns JSX (HTML-like markup written in JavaScript). ' +
          'Components let you split the UI into independent, reusable pieces, each responsible for one part ' +
          'of the screen. Component names must start with a capital letter so React can tell them apart from ' +
          'regular HTML tags. A component can render other components, forming a tree — your whole app is ' +
          'usually one root component made of many smaller ones. Props (short for "properties") are how a ' +
          'parent passes data down to a child component, similar to function arguments.',
      },
      {
        title: 'State and Props Deep Dive',
        type: 'lesson',
        topic: 'Fundamentals',
        content:
          'Props are read-only data passed into a component from its parent — a component should never modify ' +
          'its own props. State is data a component owns and manages itself, created with the `useState` hook, ' +
          'and it can change over time in response to user actions (clicks, typing, etc.). Calling the state ' +
          'setter function schedules a re-render with the new value. A useful rule of thumb: if a value is ' +
          'passed in from outside, it is a prop; if a component needs to remember something and change it later, ' +
          'that is state.',
      },
      { title: 'Build a Todo Application', type: 'exercise', topic: 'State Management' },
      { title: 'React Fundamentals Quiz', type: 'quiz', topic: 'Fundamentals' },
      { title: 'Fetching and Displaying API Data', type: 'exercise', topic: 'Async & Effects' },
      {
        title: 'React Performance Optimization',
        type: 'lesson',
        topic: 'Performance',
        content:
          'React re-renders a component whenever its state or props change, and by default also re-renders ' +
          'its children. For most apps this is fast enough and needs no special attention. When a specific ' +
          'component is genuinely slow, `React.memo` can skip re-rendering it if its props haven\u2019t changed, ' +
          'and `useMemo`/`useCallback` can avoid recreating expensive values or functions on every render. ' +
          'Rule of thumb: measure first (e.g. with the React DevTools Profiler) before reaching for these — ' +
          'optimizing code that isn\u2019t actually slow adds complexity for no benefit.',
      },
      { title: 'Memoization Challenge', type: 'exercise', topic: 'Performance' },
      { title: 'Testing Fundamentals Quiz', type: 'quiz', topic: 'Testing' },
    ],
  },
  {
    id: 'python-fundamentals',
    title: 'Python Fundamentals',
    description: 'Syntax, data structures, functions, and file/error handling.',
    activities: [
      { title: 'Python Syntax and Variables', type: 'lesson', topic: 'Fundamentals' },
      { title: 'Lists, Dicts, and Sets', type: 'lesson', topic: 'Data Structures' },
      { title: 'Build a Command-Line To-Do List', type: 'exercise', topic: 'Data Structures' },
      { title: 'Python Basics Quiz', type: 'quiz', topic: 'Fundamentals' },
      { title: 'Functions and Error Handling', type: 'lesson', topic: 'Functions' },
      { title: 'Parse and Summarize a CSV File', type: 'exercise', topic: 'File Handling' },
      { title: 'Functions & Errors Quiz', type: 'quiz', topic: 'Functions' },
    ],
  },
  {
    id: 'javascript-essentials',
    title: 'JavaScript Essentials',
    description: 'Core language features, async JS, and the DOM.',
    activities: [
      { title: 'Variables, Types, and Scope', type: 'lesson', topic: 'Fundamentals' },
      { title: 'Array and Object Methods', type: 'lesson', topic: 'Fundamentals' },
      { title: 'Build a Dynamic To-Do List (DOM)', type: 'exercise', topic: 'DOM' },
      { title: 'JavaScript Basics Quiz', type: 'quiz', topic: 'Fundamentals' },
      { title: 'Promises and Async/Await', type: 'lesson', topic: 'Async JS' },
      { title: 'Fetch and Render Public API Data', type: 'exercise', topic: 'Async JS' },
      { title: 'Async JS Quiz', type: 'quiz', topic: 'Async JS' },
    ],
  },
  {
    id: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    description: 'Core structures, complexity analysis, and common patterns.',
    activities: [
      { title: 'Big-O and Complexity Analysis', type: 'lesson', topic: 'Fundamentals' },
      { title: 'Arrays, Stacks, and Queues', type: 'lesson', topic: 'Linear Structures' },
      { title: 'Implement a Stack and Queue', type: 'exercise', topic: 'Linear Structures' },
      { title: 'Linear Structures Quiz', type: 'quiz', topic: 'Linear Structures' },
      { title: 'Trees and Graphs', type: 'lesson', topic: 'Non-Linear Structures' },
      { title: 'Implement Breadth-First Search', type: 'exercise', topic: 'Non-Linear Structures' },
      { title: 'Sorting and Searching Quiz', type: 'quiz', topic: 'Algorithms' },
    ],
  },
];
