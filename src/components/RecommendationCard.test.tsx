import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecommendationCard from './RecommendationCard';

describe('RecommendationCard', () => {
  it('renders the recommended activity and reason', () => {
    render(
      <RecommendationCard
        recommendation={{
          activityTitle: 'React Performance Optimization',
          reason: 'Your component architecture is strong.',
        }}
      />,
    );

    expect(screen.getByText('React Performance Optimization')).toBeInTheDocument();
    expect(screen.getByText('Your component architecture is strong.')).toBeInTheDocument();
  });
});
