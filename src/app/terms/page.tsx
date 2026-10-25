import type { Metadata } from "next";
import { ContactEmail, DraftNotice, EffectiveDate } from "@/components/Legal";
import { getSiteOwner, ownerValue } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use" };

// Owner details come from SITE_* environment variables (see .env.example).
// Have the final text reviewed by someone qualified for your jurisdiction.
export default function TermsPage() {
  const owner = getSiteOwner();
  return (
    <div className="prose">
      <h1>Terms of use</h1>
      <DraftNotice owner={owner} fields={["operatorName", "contactEmail", "governingLaw", "legalEffectiveDate"]} />
      <p>
        Effective date: <EffectiveDate owner={owner} />. These terms apply to Free Movie Finder, operated by{" "}
        {ownerValue(owner, "operatorName")}.
      </p>

      <h2>What this site is</h2>
      <p>
        A directory that helps you find films and the legal places to watch them. We do not host or distribute films.
        Public-domain films are played through the official players of the Internet Archive and Wikimedia Commons.
      </p>

      <h2>Accuracy</h2>
      <p>
        Film details and availability come from third parties (TMDB, JustWatch, Wikidata, the Internet Archive and
        Wikimedia Commons). They change often and can be wrong or out of date. Check with the service before relying on a
        listing. Public-domain status is shown for the United States only; you are responsible for following the
        copyright rules where you live.
      </p>

      <h2>Third-party services</h2>
      <p>
        Links and embeds take you to services we do not control. Their terms, prices, ads, account requirements and
        regional limits apply.
      </p>

      <h2>Acceptable use</h2>
      <p>Do not use automated tools to scrape this site at high volume, or try to break its security.</p>

      <h2>Takedown requests</h2>
      <p>
        If you believe a listing points to content that infringes your rights, contact <ContactEmail owner={owner} /> with the page
        address and details, and we will review and remove it where appropriate.
      </p>

      <h2>No warranty</h2>
      <p>The site is provided as is, without warranties of any kind, to the extent the law allows.</p>

      <h2>Governing law</h2>
      <p>{ownerValue(owner, "governingLaw")}.</p>
    </div>
  );
}
