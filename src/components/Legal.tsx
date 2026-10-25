import { formatEffectiveDate, missingOwnerFields, ownerValue, type SiteOwner } from "@/lib/site";

/** Shows a "Draft" note listing the owner details still missing, or nothing when all are set. */
export function DraftNotice({ owner, fields }: { owner: SiteOwner; fields: (keyof SiteOwner)[] }) {
  const missing = missingOwnerFields(owner, fields);
  if (!missing.length) return null;
  return (
    <p className="notice" role="note">
      Draft. Still to be filled in by the site owner: {missing.join(", ")}.
    </p>
  );
}

/** The contact email as a mailto link, or its placeholder. */
export function ContactEmail({ owner }: { owner: SiteOwner }) {
  if (!owner.contactEmail) return <>{ownerValue(owner, "contactEmail")}</>;
  return <a href={`mailto:${owner.contactEmail}`}>{owner.contactEmail}</a>;
}

export function EffectiveDate({ owner }: { owner: SiteOwner }) {
  return <>{formatEffectiveDate(owner.legalEffectiveDate) ?? ownerValue(owner, "legalEffectiveDate")}</>;
}
