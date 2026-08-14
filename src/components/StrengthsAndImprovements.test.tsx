import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StrengthsAndImprovements from './StrengthsAndImprovements';

describe('StrengthsAndImprovements', () => {
  it('renders strengths and improvement areas in separate sections', () => {
    render(
      <StrengthsAndImprovements
        strengths={['Clear component structure']}
        improvementAreas={['Automated testing coverage']}
      />,
    );

    expect(screen.getByText('Strengths')).toBeInTheDocument();
    expect(screen.getByText('Clear component structure')).toBeInTheDocument();
    expect(screen.getByText('Areas for improvement')).toBeInTheDocument();
    expect(screen.getByText('Automated testing coverage')).toBeInTheDocument();
  });
});
