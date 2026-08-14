import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressTrend from './ProgressTrend';
import type { Activity } from '../types';

function activity(id: string, score: number, completedOn: string): Activity {
  return {
    id,
    title: `Activity ${id}`,
    type: 'exercise',
    topic: 'Testing',
    status: 'completed',
    completedOn,
    feedback: { score, strengths: [], suggestions: [] },
  };
}

describe('ProgressTrend', () => {
  it('shows an empty state when fewer than two graded activities exist', () => {
    render(<ProgressTrend activities={[activity('1', 80, '2026-01-01')]} />);
    expect(screen.getByText(/complete at least two graded activities/i)).toBeInTheDocument();
  });

  it('renders a chart summarizing an upward score trend', () => {
    render(
      <ProgressTrend
        activities={[activity('1', 70, '2026-01-01'), activity('2', 90, '2026-01-05')]}
      />,
    );

    expect(screen.getByText(/trending up/i)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /trending up from 70 to 90/i }),
    ).toBeInTheDocument();
  });

  it('renders a chart summarizing a downward score trend', () => {
    render(
      <ProgressTrend
        activities={[activity('1', 90, '2026-01-01'), activity('2', 70, '2026-01-05')]}
      />,
    );

    expect(screen.getByText(/trending down/i)).toBeInTheDocument();
  });
});
