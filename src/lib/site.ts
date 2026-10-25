// Site owner details used by the Privacy and Terms pages.
// Set them as environment variables (.env.local for local work, your host's
// dashboard for production) instead of editing the pages.
// Any value left unset shows as a [BRACKETED] placeholder and keeps the
// "Draft" notice on the page, so an unfinished policy is never shown as final.

export type SiteOwner = {
  operatorName: string | null;
  contactEmail: string | null;
  hostingProvider: string | null;
  governingLaw: string | null;
  legalEffectiveDate: string | null;
};

const read = (value: string | undefined) => value?.trim() || null;

export function getSiteOwner(env: Record<string, string | undefined> = process.env): SiteOwner {
  return {
    operatorName: read(env.SITE_OPERATOR_NAME),
    contactEmail: read(env.SITE_CONTACT_EMAIL),
    hostingProvider: read(env.SITE_HOSTING_PROVIDER),
    governingLaw: read(env.SITE_GOVERNING_LAW),
    legalEffectiveDate: read(env.SITE_LEGAL_EFFECTIVE_DATE),
  };
}

export const ownerPlaceholders: Record<keyof SiteOwner, string> = {
  operatorName: "[OPERATOR NAME]",
  contactEmail: "[CONTACT EMAIL]",
  hostingProvider: "[HOSTING PROVIDER]",
  governingLaw: "[GOVERNING LAW AND JURISDICTION]",
  legalEffectiveDate: "[EFFECTIVE DATE]",
};

const ownerLabels: Record<keyof SiteOwner, string> = {
  operatorName: "operator name",
  contactEmail: "contact email",
  hostingProvider: "hosting provider",
  governingLaw: "governing law",
  legalEffectiveDate: "effective date",
};

/** Plain-language labels of the fields a page needs that are still unset. */
export function missingOwnerFields(owner: SiteOwner, fields: (keyof SiteOwner)[]): string[] {
  return fields.filter((f) => owner[f] === null).map((f) => ownerLabels[f]);
}

/** The value, or its [BRACKETED] placeholder when unset. */
export function ownerValue(owner: SiteOwner, field: keyof SiteOwner): string {
  return owner[field] ?? ownerPlaceholders[field];
}

/** Formats an ISO date (2026-11-01) as "November 1, 2026"; other text passes through. */
export function formatEffectiveDate(value: string | null): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3])) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
