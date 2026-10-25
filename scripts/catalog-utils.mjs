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
