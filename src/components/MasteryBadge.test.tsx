import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MasteryBadge from './MasteryBadge';

describe('MasteryBadge', () => {
  it.each([
    [10, 'Newcomer'],
    [30, 'Explorer'],
    [60, 'Builder'],
    [80, 'Practitioner'],
    [95, 'Master'],
  ])('shows the %i tier as %s', (progress, tier) => {
    render(<MasteryBadge track="React Development" progress={progress} />);
    expect(screen.getByText(`React ${tier}`)).toBeInTheDocument();
  });
});
