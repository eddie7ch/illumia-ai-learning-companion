import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityCalendar from './ActivityCalendar';
import type { Activity } from '../types';

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function activity(id: string, completedOn: string, timeSpentMinutes: number): Activity {
  return {
    id,
    title: `Activity ${id}`,
    type: 'exercise',
    topic: 'Testing',
    status: 'completed',
    completedOn,
    timeSpentMinutes,
  };
}

describe('ActivityCalendar', () => {
  it('shows an empty state when no activity has a completion date', () => {
    render(
      <ActivityCalendar
        activities={[
          { id: '1', title: 'Untouched', type: 'lesson', topic: 'Testing', status: 'not-started' },
        ]}
      />,
    );
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it('summarizes total time invested and active days', () => {
    const today = dateKey(new Date());
    render(<ActivityCalendar activities={[activity('1', today, 90)]} />);

    expect(screen.getByText(/1h 30m invested/i)).toBeInTheDocument();
    expect(screen.getByText(/1 active day/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /1 active day/i })).toBeInTheDocument();
  });

  it('reports a current streak spanning today and yesterday', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayKey = dateKey(today);
    const yesterdayKey = dateKey(yesterday);

    render(<ActivityCalendar activities={[activity('1', yesterdayKey, 20), activity('2', todayKey, 20)]} />);

    expect(screen.getByText(/2-day streak/i)).toBeInTheDocument();
  });

  it('lists each active day in an accessible summary list', () => {
    const today = dateKey(new Date());
    render(<ActivityCalendar activities={[activity('1', today, 45)]} />);

    expect(screen.getByText(`${today}: 45m spent on Activity 1`)).toBeInTheDocument();
  });
});
