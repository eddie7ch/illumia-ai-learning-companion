import { useContext } from 'react';
import { StudySessionContext } from './studySessionCore';

export function useStudySession() {
  return useContext(StudySessionContext);
}
