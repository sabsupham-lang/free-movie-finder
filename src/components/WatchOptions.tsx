import Link from "next/link";
import { regionName } from "@/lib/regions";
import type { MovieDetail, OfferKind, WatchOffer } from "@/lib/types";
import { IconExternal } from "./Icons";

const GROUPS: { kind: OfferKind; title: string; hint: string }[] = [
  { kind: "free", title: "Free", hint: "No subscription. Some need a free account or a library card." },
  { kind: "ads", title: "Free with ads", hint: "No subscription. Plays with advertising breaks." },
  { kind: "subscription", title: "With a subscription", hint: "Included with a paid streaming plan." },
  { kind: "rent", title: "Rent", hint: "Pay per rental." },
  { kind: "buy", title: "Buy", hint: "Pay to own a digital copy." },
];

function Offer({ offer }: { offer: WatchOffer }) {
  return (
    <li className="offer">
      {offer.logoUrl ? <img src={offer.logoUrl} alt="" width={32} height={32} loading="lazy" referrerPolicy="no-referrer" /> : null}
      <span>
        {offer.url ? (
          <a href={offer.url} target="_blank" rel="noopener noreferrer">
            Watch on {offer.providerName} <IconExternal size={14} />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ) : (
          offer.providerName
        )}
        {offer.note && <small>{offer.note}</small>}
      </span>
    </li>
  );
}

export function WatchOptions({ movie }: { movie: MovieDetail }) {
  const { availability: a, publicDomainCopy: pd } = movie;
  const country = regionName(a.region);
  return (
    <div className="offers">
      {pd && (
        <div className="offer-group">
          <h3>{pd.heading}</h3>
          <ul className="offer-list">
            {pd.archiveId && (
              <li className="offer">
                <a href={`https://archive.org/details/${encodeURIComponent(pd.archiveId)}`} target="_blank" rel="noopener noreferrer">
                  Internet Archive <IconExternal size={14} />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {pd.commonsVideo && (
              <li className="offer">
                <a href={`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(pd.commonsVideo.file.replace(/ /g, "_"))}`} target="_blank" rel="noopener noreferrer">
                  Wikimedia Commons <IconExternal size={14} />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            )}
          </ul>
          <p className="source-note">{pd.rightsNote}</p>
        </div>
      )}

      {a.status === "known" &&
        GROUPS.map((g) => {
          const offers = a.offers.filter((o) => o.kind === g.kind);
          if (!offers.length) return null;
          return (
            <div key={g.kind} className="offer-group">
              <h3>
                {g.title} <span className="source-note">in {country}</span>
              </h3>
              <p className="source-note" style={{ margin: "0 0 6px" }}>
                {g.hint}
              </p>
              <ul className="offer-list">
                {offers.map((o) => (
                  <Offer key={`${o.kind}-${o.providerId}`} offer={o} />
                ))}
              </ul>
            </div>
          );
        })}

      {a.status === "none" && (
        <p>
          No streaming, rental or purchase offers are listed for {country} right now. The film may be available in other
          countries. <Link href="/settings">Change country</Link>.
        </p>
      )}
      {a.status === "unknown" && !pd && <p>Streaming availability is unknown because no availability source is configured.</p>}
      {a.status === "unknown" && pd && (
        <p className="source-note">Paid and ad-supported streaming offers are not shown in demo mode.</p>
      )}

      {a.source && (
        <p className="source-note">
          Availability for {country} from {a.source === "JustWatch via TMDB" ? (
            <>
              <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer">
                JustWatch
              </a>{" "}
              via TMDB
            </>
          ) : (
            a.source
          )}
          . Listings can lag behind the services by a day or more.
          {a.link && (
            <>
              {" "}
              <a href={a.link} target="_blank" rel="noopener noreferrer">
                Open the full listing with links to each service <IconExternal size={12} />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
