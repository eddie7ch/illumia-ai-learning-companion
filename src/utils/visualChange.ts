export function hasMeaningfulVisualChange(previous: number[] | null, current: number[], threshold = 8): boolean {
  if (!previous || previous.length !== current.length || current.length === 0) return true;
  const difference = current.reduce((total, value, index) => total + Math.abs(value - previous[index]), 0);
  return difference / current.length >= threshold;
}