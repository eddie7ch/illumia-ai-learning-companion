import { createContext } from 'react';

export interface SharedScreenObservation {
  id: string;
  observedAt: string;
  summary: string;
  action: string;
  evidence: string;
  confidence: number;
  activityTitle: string | null;
}

export interface ScreenObservationApi {
  latestObservation: SharedScreenObservation | null;
  isScreenAnalysisActive: boolean;
  publishObservation: (observation: SharedScreenObservation) => void;
  setScreenAnalysisActive: (active: boolean) => void;
  clearObservation: () => void;
}

const noop = () => {};

export const ScreenObservationContext = createContext<ScreenObservationApi>({
  latestObservation: null,
  isScreenAnalysisActive: false,
  publishObservation: noop,
  setScreenAnalysisActive: noop,
  clearObservation: noop,
});