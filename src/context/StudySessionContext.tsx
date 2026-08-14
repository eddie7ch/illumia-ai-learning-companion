import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SessionActivityKind, SessionReport, SessionSegment } from '../types';
import { StudySessionContext, type StudySessionApi, type SessionPhase } from './studySessionCore';

const IDLE_THRESHOLD_MS = 60_000;
const TICK_MS = 1000;
const DEFAULT_LABEL = 'Dashboard';

export function StudySessionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [report, setReport] = useState<SessionReport | null>(null);
  const [, forceTick] = useState(0);

  const segmentsRef = useRef<SessionSegment[]>([]);
  const currentRef = useRef<{ label: string; kind: SessionActivityKind; startedAt: number } | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const labelRef = useRef(DEFAULT_LABEL);

  const sealSegment = useCallback((endedAt: number) => {
    const current = currentRef.current;
    if (!current || endedAt <= current.startedAt) return;
    segmentsRef.current.push({ label: current.label, kind: current.kind, startedAt: current.startedAt, endedAt });
  }, []);

  const startSession = useCallback(() => {
    const now = Date.now();
    segmentsRef.current = [];
    labelRef.current = DEFAULT_LABEL;
    lastActivityAtRef.current = now;
    sessionStartedAtRef.current = now;
    currentRef.current = { label: DEFAULT_LABEL, kind: 'active', startedAt: now };
    setReport(null);
    setPhase('active');
  }, []);

  const endSession = useCallback(() => {
    const now = Date.now();
    sealSegment(now);
    const segments = segmentsRef.current;
    const startedAt = sessionStartedAtRef.current ?? now;
    const byLabel = new Map<string, number>();
    let activeMs = 0;
    let idleMs = 0;
    let awayMs = 0;

    for (const segment of segments) {
      const duration = segment.endedAt - segment.startedAt;
      if (segment.kind === 'active') {
        activeMs += duration;
        byLabel.set(segment.label, (byLabel.get(segment.label) ?? 0) + duration);
      } else if (segment.kind === 'idle') {
        idleMs += duration;
      } else {
        awayMs += duration;
      }
    }

    currentRef.current = null;
    setReport({
      startedAt,
      endedAt: now,
      totalMs: now - startedAt,
      activeMs,
      idleMs,
      awayMs,
      byLabel: Array.from(byLabel, ([label, ms]) => ({ label, ms })).sort((a, b) => b.ms - a.ms),
      segments,
    });
    setPhase('ended');
  }, [sealSegment]);

  const setFocusLabel = useCallback((label: string | null) => {
    labelRef.current = label ?? DEFAULT_LABEL;
  }, []);

  // Track user activity for idle detection while a session is active.
  useEffect(() => {
    if (phase !== 'active') return;
    function handleActivity() {
      lastActivityAtRef.current = Date.now();
    }
    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, handleActivity));
  }, [phase]);

  // Reconcile the current segment's kind/label roughly once a second and re-render for the live timer.
  useEffect(() => {
    if (phase !== 'active') return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const desiredKind: SessionActivityKind = document.hidden
        ? 'away'
        : now - lastActivityAtRef.current > IDLE_THRESHOLD_MS
          ? 'idle'
          : 'active';
      const current = currentRef.current;
      if (!current || current.kind !== desiredKind || current.label !== labelRef.current) {
        sealSegment(now);
        currentRef.current = { label: labelRef.current, kind: desiredKind, startedAt: now };
      }
      forceTick((t) => t + 1);
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [phase, sealSegment]);

  const elapsedMs =
    phase === 'active' && sessionStartedAtRef.current
      ? Date.now() - sessionStartedAtRef.current
      : phase === 'ended' && report
        ? report.totalMs
        : 0;

  const value: StudySessionApi = {
    phase,
    elapsedMs,
    currentLabel: currentRef.current?.label ?? labelRef.current,
    currentKind: currentRef.current?.kind ?? 'active',
    report,
    startSession,
    endSession,
    setFocusLabel,
  };

  return <StudySessionContext.Provider value={value}>{children}</StudySessionContext.Provider>;
}
