import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LearningPlan from './LearningPlan';

describe('LearningPlan', () => {
  it('renders nothing when there are no steps', () => {
    const { container } = render(<LearningPlan steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each step in order with a numbered badge', () => {
    render(
      <LearningPlan
        steps={[
          { id: 'a', title: 'Finish current lesson', description: 'First description' },
          { id: 'b', title: 'Try the recommendation', description: 'Second description' },
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByText('Finish current lesson')).toBeInTheDocument();
    expect(screen.getByText('Try the recommendation')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
