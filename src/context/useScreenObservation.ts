import { useContext } from 'react';
import { ScreenObservationContext } from './screenObservationCore';

export function useScreenObservation() {
  return useContext(ScreenObservationContext);
}