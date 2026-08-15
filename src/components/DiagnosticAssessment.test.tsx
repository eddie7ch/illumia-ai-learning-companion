import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DiagnosticAssessment from './DiagnosticAssessment';

describe('DiagnosticAssessment', () => {
  it('generates questions and saves one result per topic', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <DiagnosticAssessment
        topics={['State', 'Testing']}
        completed={false}
        onRequest={vi.fn().mockResolvedValue([
          { id: '1', topic: 'State', prompt: 'State question?', choices: ['A', 'B', 'C', 'D'], correctIndex: 0 },
          { id: '2', topic: 'Testing', prompt: 'Testing question?', choices: ['A', 'B', 'C', 'D'], correctIndex: 1 },
        ])}
        onComplete={onComplete}
      />,
    );
    await user.click(screen.getByRole('button', { name: /start diagnostic/i }));
    const radios = await screen.findAllByRole('radio');
    await user.click(radios[0]);
    await user.click(radios[5]);
    await user.click(screen.getByRole('button', { name: /submit diagnostic/i }));
    expect(onComplete).toHaveBeenCalledWith([{ topic: 'State', score: 100 }, { topic: 'Testing', score: 100 }]);
    expect(await screen.findByText(/diagnostic saved/i)).toBeInTheDocument();
  });
});