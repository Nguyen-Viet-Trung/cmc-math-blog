export const COVER_ACCENT_BAR: Record<string, string> = {
  blue: "bg-primary",
  indigo: "bg-primary/70",
  emerald: "bg-success",
  amber: "bg-bounty",
  rose: "bg-destructive",
};

export function getCoverAccentClass(color?: string | null): string {
  return (color && COVER_ACCENT_BAR[color]) || COVER_ACCENT_BAR.blue;
}
