export const CHAIN_COLORS = ["#1b7a43", "#2b6cb0", "#6c5ce7", "#c05621", "#0f766e", "#b7791f", "#9f1239", "#4a5568", "#2f855a", "#553c9a", "#c53030", "#2c5282", "#718096"];

export function colorByName(orderedNames: string[], name: string): string {
  const i = orderedNames.indexOf(name);
  return CHAIN_COLORS[(i >= 0 ? i : 0) % CHAIN_COLORS.length];
}
