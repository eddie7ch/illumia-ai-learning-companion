import { createContext } from 'react';
import type { SessionActivityKind, SessionReport } from '../types';

export type SessionPhase = 'idle' | 'active' | 'ended';

export interface StudySessionApi {
  phase: SessionPhase;
  elapsedMs: number;
  currentLabel: string;
  currentKind: SessionActivityKind;
  report: SessionReport | null;
  startSession: () => void;
  endSession: () => void;
  setFocusLabel: (label: string | null) => void;
  setExternalAway: (away: boolean) => void;
}

const noop = () => {};

/** No-op default so components (e.g. Drawer) can call these hooks even without a provider mounted, such as in isolated component tests. */
export const defaultStudySessionApi: StudySessionApi = {
  phase: 'idle',
  elapsedMs: 0,
  currentLabel: 'Dashboard',
  currentKind: 'active',
  report: null,
  startSession: noop,
  endSession: noop,
  setFocusLabel: noop,
  setExternalAway: noop,
};

export const StudySessionContext = createContext<StudySessionApi>(defaultStudySessionApi);
