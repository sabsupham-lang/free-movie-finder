import type { SearchMode } from "@/lib/filters";
import { IconSearch } from "./Icons";

export function SearchForm({ q, mode, autoFocus }: { q?: string | null; mode?: SearchMode; autoFocus?: boolean }) {
  return (
    <form role="search" method="get" action="/search" className="search-form">
      <div className="field">
        <label htmlFor="q" className="visually-hidden">
          Search films
        </label>
        <input
          id="q"
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Film title, actor or director"
          autoComplete="off"
          enterKeyHint="search"
          autoFocus={autoFocus}
          required
          maxLength={100}
        />
      </div>
      <fieldset className="mode-toggle" style={{ padding: 0, margin: 0 }}>
        <legend className="visually-hidden">Search by</legend>
        <label>
          <input type="radio" name="mode" value="title" defaultChecked={mode !== "person"} />
          Title
        </label>
        <label>
          <input type="radio" name="mode" value="person" defaultChecked={mode === "person"} />
          Actor or director
        </label>
      </fieldset>
      <button type="submit" className="btn btn-primary">
        <IconSearch size={18} />
        Search
      </button>
    </form>
  );
}
