import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressOverview from './ProgressOverview';
import type { LearnerProfile } from '../types';

const profile: LearnerProfile = {
  name: 'Jordan Lee',
  track: 'React Development',
  overallProgress: 62,
  strengths: [],
  improvementAreas: [],
  recommendation: { activityTitle: 'x', reason: 'y' },
};

describe('ProgressOverview', () => {
  it('renders the track name and progress percentage', () => {
    render(<ProgressOverview profile={profile} />);
    expect(screen.getByText('React Development')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('exposes an accessible progressbar reflecting the progress value', () => {
    render(<ProgressOverview profile={profile} />);
    const progressbar = screen.getByRole('progressbar', { name: 'Overall course progress' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '62');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });
});
