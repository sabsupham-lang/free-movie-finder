// Countries where JustWatch (the source behind TMDB's watch providers)
// publishes availability. Names come from the runtime's Intl data.
export const REGION_CODES = [
  "AR", "AT", "AU", "BE", "BR", "CA", "CH", "CL", "CO", "CZ", "DE", "DK", "EC", "EE", "ES", "FI",
  "FR", "GB", "GR", "HU", "ID", "IE", "IN", "IT", "JP", "KR", "LT", "LV", "MX", "MY", "NL", "NO",
  "NZ", "PE", "PH", "PL", "PT", "RO", "RU", "SE", "SG", "TH", "TR", "TW", "US", "VE", "ZA",
] as const;

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export function regionName(code: string): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function normalizeRegion(input: string | null | undefined, fallback = "US"): string {
  const code = (input ?? "").toUpperCase();
  return (REGION_CODES as readonly string[]).includes(code) ? code : fallback;
}

export const REGION_COOKIE = "region";
