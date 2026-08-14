import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import LiveClock from './LiveClock';

describe('LiveClock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the current date and time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T09:05:00'));

    render(<LiveClock />);

    expect(screen.getByText(/Friday, August 14, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/09:05:00 AM/i)).toBeInTheDocument();
  });

  it('updates the displayed time as the clock ticks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T09:05:00'));

    render(<LiveClock />);
    expect(screen.getByText(/09:05:00 AM/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText(/09:05:30 AM/i)).toBeInTheDocument();
  });
});
