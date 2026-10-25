import type { Metadata } from "next";
import { ContactEmail, DraftNotice, EffectiveDate } from "@/components/Legal";
import { getSiteOwner, ownerValue } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

// Owner details come from SITE_* environment variables (see .env.example).
// Have the final text reviewed for the countries you serve.
export default function PrivacyPage() {
  const owner = getSiteOwner();
  return (
    <div className="prose">
      <h1>Privacy policy</h1>
      <DraftNotice owner={owner} fields={["operatorName", "contactEmail", "hostingProvider", "legalEffectiveDate"]} />
      <p>
        Effective date: <EffectiveDate owner={owner} />. Operated by {ownerValue(owner, "operatorName")}. Contact:{" "}
        <ContactEmail owner={owner} />.
      </p>

      <h2>The short version</h2>
      <p>No accounts, no ads from us, no analytics, no tracking cookies. Your lists stay on your device.</p>

      <h2>What is stored on your device</h2>
      <ul>
        <li>
          <strong>Your watchlist and favorites</strong>, in your browser&apos;s local storage. They are never sent to our server.
        </li>
        <li>
          <strong>Your theme choice</strong> (light or dark), in local storage.
        </li>
        <li>
          <strong>Your country</strong>, in a cookie named <code>region</code>, only if you choose one in Settings. It is
          used to show availability for that country.
        </li>
      </ul>
      <p>You can delete all of this at any time by clearing this site&apos;s data in your browser.</p>

      <h2>What our host sees</h2>
      <p>
        Like any website, the hosting provider ({ownerValue(owner, "hostingProvider")}) receives standard request data such as your IP address,
        browser type and the pages you request, and may keep it in short-lived server logs for security and debugging.
      </p>

      <h2>Third parties</h2>
      <ul>
        <li>Posters and logos load directly from TMDB, Wikimedia and the Internet Archive, which see your IP address when your browser fetches them.</li>
        <li>
          Trailers (YouTube, privacy-enhanced mode) and public-domain players (Internet Archive) load only after you press
          play. Those services&apos; own privacy policies apply once loaded.
        </li>
        <li>Links to streaming services take you to their sites, where their policies apply.</li>
      </ul>

      <h2>Changes and contact</h2>
      <p>We will post changes on this page with a new effective date. Questions: <ContactEmail owner={owner} />.</p>
    </div>
  );
}
