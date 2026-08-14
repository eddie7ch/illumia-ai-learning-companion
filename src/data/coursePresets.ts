import type { ActivityType } from '../types';

export interface CoursePresetActivity {
  title: string;
  type: ActivityType;
  topic: string;
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
      { title: 'Introduction to React Components', type: 'lesson', topic: 'Fundamentals' },
      { title: 'State and Props Deep Dive', type: 'lesson', topic: 'Fundamentals' },
      { title: 'Build a Todo Application', type: 'exercise', topic: 'State Management' },
      { title: 'React Fundamentals Quiz', type: 'quiz', topic: 'Fundamentals' },
      { title: 'Fetching and Displaying API Data', type: 'exercise', topic: 'Async & Effects' },
      { title: 'React Performance Optimization', type: 'lesson', topic: 'Performance' },
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
