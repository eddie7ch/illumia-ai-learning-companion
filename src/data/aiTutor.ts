/**
 * Simulated AI tutor responses.
 * In a production system this would call an LLM; here we use simple keyword
 * matching over a small set of canned, topic-relevant answers so the chat
 * experience feels realistic without a real backend/API key.
 */
interface CannedResponse {
  keywords: string[];
  answer: string;
}

const cannedResponses: CannedResponse[] = [
  {
    keywords: ['re-render', 'rerender', 'rendering'],
    answer:
      'Your component may re-render when its parent state changes, when its props change, or when its own state updates. You can reduce unnecessary re-renders with React.memo, useMemo, and useCallback, and by keeping state as close as possible to where it is used.',
  },
  {
    keywords: ['test', 'testing', 'unit test'],
    answer:
      'A good next step is adding unit tests with a library like Vitest or Jest plus React Testing Library. Start by testing user-visible behavior (what renders, what happens on click) rather than internal implementation details.',
  },
  {
    keywords: ['performance', 'optimi', 'slow'],
    answer:
      'For performance issues, first profile with React DevTools to find components that re-render too often. Common fixes include memoizing expensive computations, splitting large components, and avoiding inline object/array literals passed as props.',
  },
  {
    keywords: ['async', 'fetch', 'api', 'error'],
    answer:
      'When fetching data, make sure to handle loading, error, and empty states explicitly. Wrap fetch calls in try/catch, and consider an AbortController to cancel stale requests if the component unmounts or inputs change quickly.',
  },
  {
    keywords: ['state', 'props'],
    answer:
      "State is data your component owns and can change over time; props are read-only data passed down from a parent. If multiple components need the same state, lift it up to their closest common ancestor.",
  },
  {
    keywords: ['next', 'what should i learn', 'recommend'],
    answer:
      'Based on your recent activity, your component architecture is strong, so I would focus next on rendering performance (memoization) and building out automated test coverage.',
  },
];

const fallbackAnswer =
  "That's a great question. Based on your recent activities, I'd suggest starting with the fundamentals of the topic and reviewing the feedback on your most recent exercise for specific pointers. Could you tell me more about what you're working on?";

export function getMockAiResponse(question: string): string {
  const normalized = question.toLowerCase();
  const match = cannedResponses.find((response) =>
    response.keywords.some((keyword) => normalized.includes(keyword))
  );
  return match ? match.answer : fallbackAnswer;
}
