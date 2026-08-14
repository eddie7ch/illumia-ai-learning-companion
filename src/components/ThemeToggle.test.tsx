import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  it('shows the current theme and reflects it in aria-pressed', () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} />);
    const button = screen.getByRole('button', { name: /light/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ThemeToggle theme="dark" onToggle={onToggle} />);

    expect(screen.getByRole('button', { name: /dark/i })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /dark/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
