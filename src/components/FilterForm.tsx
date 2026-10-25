import { activeFilterCount, type Filters } from "@/lib/filters";
import { GENRES, LANGUAGES } from "@/lib/genres";
import type { ProviderOption } from "@/lib/types";
import { IconFilter } from "./Icons";

type Props = {
  action: string;
  filters: Filters;
  providers: ProviderOption[];
  regionLabel: string;
  // Search query and mode are carried through so filtering keeps them.
  keepSearch?: boolean;
};

const RATING_OPTIONS = [5, 6, 7, 7.5, 8, 8.5];
const SORT_OPTIONS = [
  ["default", "Default for this list"],
  ["popularity", "Most popular"],
  ["rating", "Highest rated"],
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["title", "Title A to Z"],
] as const;

// A plain GET form: works without JavaScript, every control has a label,
// and the resulting URL can be bookmarked or shared.
export function FilterForm({ action, filters: f, providers, regionLabel, keepSearch }: Props) {
  const count = activeFilterCount(f);
  return (
    <details className="filters" open={count > 0 ? true : undefined}>
      <summary>
        <IconFilter size={18} />
        Filters{count > 0 ? ` (${count} active)` : ""}
      </summary>
      <form method="get" action={action} className="filters-body">
        {keepSearch && f.q && (
          <>
            <input type="hidden" name="q" value={f.q} />
            <input type="hidden" name="mode" value={f.mode} />
          </>
        )}
        <label className="checkbox full">
          <input type="checkbox" name="free" value="1" defaultChecked={f.freeOnly} />
          Only free to watch in {regionLabel} (free or free with ads)
        </label>
        <div className="field">
          <label htmlFor="f-genre">Genre</label>
          <select id="f-genre" name="genre" defaultValue={f.genre ?? ""}>
            <option value="">Any genre</option>
            {GENRES.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-lang">Original language</label>
          <select id="f-lang" name="language" defaultValue={f.language ?? ""}>
            <option value="">Any language</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-from">Released from</label>
          <input id="f-from" type="number" inputMode="numeric" name="yearFrom" min={1870} max={2100} placeholder="e.g. 1950" defaultValue={f.yearFrom ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="f-to">Released to</label>
          <input id="f-to" type="number" inputMode="numeric" name="yearTo" min={1870} max={2100} placeholder="e.g. 1999" defaultValue={f.yearTo ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="f-rating">Minimum rating</label>
          <select id="f-rating" name="minRating" defaultValue={f.minRating ?? ""}>
            <option value="">Any rating</option>
            {RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}+ out of 10
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-rmin">Runtime from (min)</label>
          <input id="f-rmin" type="number" inputMode="numeric" name="runtimeMin" min={0} max={600} defaultValue={f.runtimeMin ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="f-rmax">Runtime up to (min)</label>
          <input id="f-rmax" type="number" inputMode="numeric" name="runtimeMax" min={0} max={600} defaultValue={f.runtimeMax ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="f-sort">Sort by</label>
          <select id="f-sort" name="sort" defaultValue={f.sort}>
            {SORT_OPTIONS.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>Where to watch in {regionLabel}</legend>
          <div className="provider-list">
            {providers.map((p) => (
              <label key={p.id} className="checkbox">
                <input type="checkbox" name="provider" value={p.id} defaultChecked={f.providers.includes(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="filter-actions full">
          <button type="submit" className="btn btn-primary">
            Apply filters
          </button>
          <a className="btn" href={keepSearch && f.q ? `${action}?q=${encodeURIComponent(f.q)}&mode=${f.mode}` : action}>
            Clear all
          </a>
        </div>
      </form>
    </details>
  );
}
