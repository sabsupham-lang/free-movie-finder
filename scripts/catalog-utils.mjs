// Pure helpers shared by the catalog scripts and unit tests.

// Wikidata genre labels ("comedy film", "Western film") mapped onto the
// TMDB genre names the rest of the app uses, so one filter works everywhere.
const GENRE_RULES = [
  [/documentary/, "Documentary"],
  [/comedy|comedic|slapstick/, "Comedy"],
  [/horror/, "Horror"],
  [/science fiction|sci-fi/, "Science Fiction"],
  [/western/, "Western"],
  [/romance|romantic/, "Romance"],
  [/thriller|suspense/, "Thriller"],
  [/crime|gangster|noir|heist|detective/, "Crime"],
  [/adventure|swashbuckler/, "Adventure"],
  [/\bwar\b|propaganda/, "War"],
  [/anima|cartoon/, "Animation"],
  [/musical|music/, "Music"],
  [/fantasy|fairy/, "Fantasy"],
  [/mystery/, "Mystery"],
  [/action|martial arts/, "Action"],
  [/family|children/, "Family"],
  [/histor|biograph|epic/, "History"],
  [/drama|melodrama/, "Drama"],
];

export function normalizeGenres(labels = []) {
  const genres = new Set();
  const tags = new Set();
  for (const raw of labels) {
    const label = String(raw).toLowerCase();
    let matched = false;
    for (const [re, name] of GENRE_RULES) {
      if (re.test(label)) {
        genres.add(name);
        matched = true;
      }
    }
    if (!matched || /silent|black-and-white|short/.test(label)) {
      tags.add(String(raw).replace(/ film$/i, ""));
    }
  }
  return { genres: [...genres].sort(), tags: [...tags].sort() };
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

// Archive descriptions are free-form uploader HTML. Strip tags, decode the
// common entities, drop URLs and trim to a readable length at a sentence end.
export function cleanDescription(input, max = 700) {
  if (!input) return null;
  let text = Array.isArray(input) ? input.join(" ") : String(input);
  text = text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ENTITIES[e])
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 20) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.trimEnd()}...`;
}

// ---- Internet Archive library helpers (scripts/refresh-archive-library.mjs) ----

export const asArray = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]);

// Archive "runtime" is free text: "01:23:45", "83:10", "83 min", "1h 23m", "5 minutes".
export function parseRuntime(value) {
  const s = String(asArray(value)[0] ?? "").trim().toLowerCase();
  if (!s) return null;
  let minutes = null;
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (clock) {
    const [a, b, c] = [Number(clock[1]), Number(clock[2]), clock[3] === undefined ? null : Number(clock[3])];
    minutes = c === null ? a + b / 60 : a * 60 + b + c / 60;
  } else {
    const h = /(\d+(?:\.\d+)?)\s*h/.exec(s);
    const m = /(\d+(?:\.\d+)?)\s*m(?:in|$|\b)/.exec(s);
    const sec = /(\d+)\s*s(?:ec|$|\b)/.exec(s);
    if (h || m || sec) minutes = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0) + (sec ? Number(sec[1]) / 60 : 0);
    else if (/^\d+(\.\d+)?$/.test(s)) minutes = Number(s);
  }
  if (minutes === null || !Number.isFinite(minutes)) return null;
  const rounded = Math.max(1, Math.round(minutes));
  return rounded > 0 && rounded <= 600 ? rounded : null;
}

export function parseYear(year, date, now = new Date().getFullYear()) {
  for (const v of [...asArray(year), ...asArray(date)]) {
    const m = /^(\d{4})/.exec(String(v).trim());
    if (m) {
      const y = Number(m[1]);
      if (y >= 1870 && y <= now) return y;
    }
  }
  return null;
}

const LANGUAGE_CODES = {
  english: "en", eng: "en", en: "en", spanish: "es", spa: "es", es: "es", french: "fr", fre: "fr", fra: "fr", fr: "fr",
  german: "de", ger: "de", deu: "de", de: "de", italian: "it", ita: "it", it: "it", portuguese: "pt", por: "pt", pt: "pt",
  japanese: "ja", jpn: "ja", ja: "ja", russian: "ru", rus: "ru", ru: "ru", chinese: "zh", chi: "zh", zho: "zh", zh: "zh",
  dutch: "nl", dut: "nl", nld: "nl", nl: "nl", swedish: "sv", swe: "sv", sv: "sv", danish: "da", dan: "da", da: "da",
  polish: "pl", pol: "pl", pl: "pl", hindi: "hi", hin: "hi", hi: "hi", korean: "ko", kor: "ko", ko: "ko",
};
const LANGUAGE_NAMES = { en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", ja: "Japanese", ru: "Russian", zh: "Chinese", nl: "Dutch", sv: "Swedish", da: "Danish", pl: "Polish", hi: "Hindi", ko: "Korean" };

export function parseLanguages(value) {
  const out = [];
  for (const raw of asArray(value)) {
    for (const part of String(raw).split(/[;,/]/)) {
      const code = LANGUAGE_CODES[part.trim().toLowerCase()];
      if (code && !out.some((l) => l.code === code)) out.push({ code, name: LANGUAGE_NAMES[code] });
    }
  }
  return out;
}

const NON_FEDERAL = /universit|college|state of |county|city of|school district|commonwealth of/i;

// Decides whether an Archive item may be listed, and why. Returns null when
// it should be left out. Order matters: the strongest reason wins.
//   age:         dated 1930 or earlier (US copyright has expired for works published before 1931)
//   us-gov:      FedFlix / US Government Films item made by a federal agency (17 U.S.C. 105)
//   prelinger:   Prelinger Archives, released by the collector without restriction
//   uploader-pd: uploader marked it public domain (curated film collections only)
//   cc:          Creative Commons license chosen by the uploader (curated film collections only)
export function classifyArchiveItem(item, { pdCutoffYear = 1930 } = {}) {
  const collections = asArray(item.collection).map(String);
  const license = String(asArray(item.licenseurl)[0] ?? "");
  const creator = String(asArray(item.creator)[0] ?? "");
  const year = parseYear(item.year, item.date);
  const curated = collections.some((c) => CURATED_COLLECTIONS.includes(c));
  const pdMark = /publicdomain|\/zero\//.test(license);
  const cc = /creativecommons\.org\/licenses\//.test(license);

  if (curated && year !== null && year <= pdCutoffYear) return { basis: "age", shelf: "classic" };
  const govFilm = collections.includes("FedFlix") || collections.includes("usgovfilms");
  if (govFilm && (!NON_FEDERAL.test(creator) || pdMark)) return { basis: "us-gov", shelf: "government" };
  if (collections.includes("prelinger")) return { basis: "prelinger", shelf: "vintage" };
  if (curated && pdMark) return { basis: "uploader-pd", shelf: "classic" };
  if (curated && cc) return { basis: "cc", shelf: "open", license };
  return null;
}

export const CURATED_COLLECTIONS = [
  "feature_films",
  "short_films",
  "silent_films",
  "classic_cartoons",
  "film_noir",
  "sciencefiction_horror",
  "comedy_films",
  "animationandcartoons",
  "independentfilms",
];

// Collection names that imply a genre.
export const COLLECTION_GENRES = {
  silent_films: "silent film",
  classic_cartoons: "cartoon",
  animationandcartoons: "animation",
  film_noir: "film noir",
  sciencefiction_horror: "science fiction horror",
  comedy_films: "comedy",
  short_films: "short film",
};

// Keeps explicit material off a general-audience site. Checked against the
// title, subjects and the start of the description.
const ADULT = /\b(stag films?|porn\w*|xxx|nudes?|nudity|nudists?|naked|erotic\w*|fetish\w*|spank\w*|sexploitation|strip ?tease|stripper|hardcore|softcore|smut|nsfw|burlesque|peep ?show|girlie|bondage|bdsm)\b/i;

export function isAdultItem(item) {
  const text = [
    ...asArray(item.title),
    ...asArray(item.subject),
    String(asArray(item.description)[0] ?? "").slice(0, 400),
  ].join(" ");
  return ADULT.test(text) || asArray(item.collection).some((c) => /adult|erotic/i.test(String(c)));
}

// Same film uploaded more than once: compare titles without punctuation,
// leading articles or a "(1942)" suffix, plus the year. Very short titles
// are never merged, since "Reel 1" or "Untitled" say nothing about the film.
export function dedupeKey(title, year) {
  const t = String(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\((18|19|20)\d\d\)/g, " ")
    .replace(/^(the|a|an) /, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (t.length < 6 || /^(reel|part|untitled|episode|clip|tape|film|video|roll)( [a-z]?\d+[a-z]?)*$/.test(t)) return null;
  return `${t}|${year ?? ""}`;
}
