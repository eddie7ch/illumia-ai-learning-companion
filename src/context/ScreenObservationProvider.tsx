import { useMemo, useState, type ReactNode } from 'react';
import {
  ScreenObservationContext,
  type SharedScreenObservation,
} from './screenObservationCore';

export function ScreenObservationProvider({ children }: { children: ReactNode }) {
  const [latestObservation, setLatestObservation] = useState<SharedScreenObservation | null>(null);
  const [isScreenAnalysisActive, setScreenAnalysisActive] = useState(false);

  const value = useMemo(() => ({
    latestObservation,
    isScreenAnalysisActive,
    publishObservation: setLatestObservation,
    setScreenAnalysisActive,
    clearObservation: () => setLatestObservation(null),
  }), [latestObservation, isScreenAnalysisActive]);

  return <ScreenObservationContext.Provider value={value}>{children}</ScreenObservationContext.Provider>;
}