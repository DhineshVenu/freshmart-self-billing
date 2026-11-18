/**
 * Maps a Nutri-Score grade (A–E) to a color.
 * A = healthiest (green), E = least healthy (red).
 */
export function nutriScoreColor(score?: string): string {
  switch (score) {
    case "A":
      return "#22c55e";
    case "B":
      return "#84cc16";
    case "C":
      return "#eab308";
    case "D":
      return "#f97316";
    case "E":
      return "#ef4444";
    default:
      return "#64748b";
  }
}

/**
 * Human-readable label for a Nutri-Score grade.
 */
export function nutriScoreLabel(score?: string): string {
  switch (score) {
    case "A":
      return "A · Healthiest";
    case "B":
      return "B · Good";
    case "C":
      return "C · Average";
    case "D":
      return "D · Less healthy";
    case "E":
      return "E · Least healthy";
    default:
      return "Not rated";
  }
}
