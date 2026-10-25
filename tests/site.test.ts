import { describe, expect, it } from "vitest";
import { formatEffectiveDate, getSiteOwner, missingOwnerFields, ownerValue } from "../src/lib/site";

describe("site owner settings", () => {
  it("treats unset and blank values as missing", () => {
    const owner = getSiteOwner({ SITE_OPERATOR_NAME: "  ", SITE_CONTACT_EMAIL: "hi@example.com" });
    expect(owner.operatorName).toBeNull();
    expect(owner.contactEmail).toBe("hi@example.com");
    expect(missingOwnerFields(owner, ["operatorName", "contactEmail"])).toEqual(["operator name"]);
  });

  it("falls back to bracketed placeholders", () => {
    const owner = getSiteOwner({});
    expect(ownerValue(owner, "governingLaw")).toBe("[GOVERNING LAW AND JURISDICTION]");
    expect(missingOwnerFields(owner, ["hostingProvider"])).toEqual(["hosting provider"]);
  });

  it("formats ISO effective dates and passes other text through", () => {
    expect(formatEffectiveDate("2026-11-01")).toBe("November 1, 2026");
    expect(formatEffectiveDate("1 Nov 2026")).toBe("1 Nov 2026");
    expect(formatEffectiveDate("2026-02-30")).toBe("2026-02-30");
    expect(formatEffectiveDate(null)).toBeNull();
  });
});
