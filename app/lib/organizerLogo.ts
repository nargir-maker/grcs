// Resolves a raw organizer identifier (as stored in history_raw's `og` field —
// sometimes a numeric club id like "650001", sometimes a free-typed name like
// "Π.Ε.Π.Α." or "BLE CYCLING CLUB") to the numeric id used for /logos/{id}.png.
// Ported from the Flutter app's UIHelpers.getOrganizerLogoPath keyword map so
// both apps agree on which logo belongs to which organizer.

function stripAccents(s: string): string {
  return s
    .replace(/Ά/g, 'Α').replace(/ά/g, 'α')
    .replace(/Έ/g, 'Ε').replace(/έ/g, 'ε')
    .replace(/Ή/g, 'Η').replace(/ή/g, 'η')
    .replace(/Ί/g, 'Ι').replace(/ί/g, 'ι')
    .replace(/Ϊ/g, 'Ι').replace(/ϊ/g, 'ι').replace(/ΐ/g, 'ι')
    .replace(/Ό/g, 'Ο').replace(/ό/g, 'ο')
    .replace(/Ύ/g, 'Υ').replace(/ύ/g, 'υ')
    .replace(/Ϋ/g, 'Υ').replace(/ϋ/g, 'υ').replace(/ΰ/g, 'υ')
    .replace(/Ώ/g, 'Ω').replace(/ώ/g, 'ω');
}

function toUpper(s: string): string {
  return stripAccents(s).toUpperCase();
}

// Legacy/alternate numeric ids that don't have their own logo file.
const ID_ALIASES: Record<string, string> = {
  '65999': '659999',
};

// Keyword (accent/case-insensitive, substring match) → numeric organizer id.
// Order matters: more specific entries should come before generic ones.
const NAME_TO_ID: [string, string][] = [
  ['Π.Ε.Π.Α', '650001'],
  ['ΠΕΠΑ', '650001'],
  ['PEPA', '650001'],
  ['BLE', '650031'],
  ['GREEK RANDONNEURS', '650063'],
  ['ΛΕΣΧΗ ΠΟΔΗΛΑΤΙΚΟΥ ΤΟΥΡΙΣΜΟΥ', '650000'],
  ['AUDAX', '650000'],
  ['ARG', '650000'],
  ['BIORACER', '650069'],
  ['ΚΑΡΔΙΤΣ', '650033'],
  ['Π.Ο.Κ', '650033'],
  ['ΑΙΟΛΟΣ', '650005'],
  ['KASSIMATIS', '650054'],
  ['ΟΨΟΜΕΘΑ', '650067'],
  ['FILIPPOI', '650067'],
  ['Σ.Φ.Π.Ι.Π.', '650078'],
  ['SFPIP', '650078'],
  ['SKINOS', '650094'],
  ['Σ.Χ.Ο.Π', '650037'],
  ['SXOP', '650037'],
  ['ΘΗΒΑ', '650037'],
  ['ΤΑΛΩΣ', '650064'],
  ['TALOS', '650064'],
  ['ΘΕΡΜΟΥ', '650032'],
  ['ΣΑΜΟΥ', '650089'],
  ['SAMOS', '650089'],
  ['ΧΙΟΥ', '650065'],
  ['CHIOS', '650065'],
  ['PEACOCK', '650095'],
  ['ΦΙΛΑΘΛ', '650102'],
  ['HELLENIC AUTONOMOUS', '659999'],
  ['HELLAS AUTONOMOUS', '659999'],
  ['H.A.R.', '659999'],
  ['HAR', '659999'],
  ['ΑΠΟΣΤΟΛΟΣ ΓΑΖΗΣ', '659999'],
  ['ΣΤΡΑΤΟΣ', '659999'],
  ['ΜΑΙΡΗ ΜΠΑΜΠΟΥΛΗ', '659999'],
  ['ΠΑΡΑΚΑΛΑΜΙΕΣ', '659999'],
  ['Ε.Α.Α. ΘΕΣΣΑΛΟΝΙΚΗΣ', '650096'],
  ['Α.Ε.Κ.', '650003'],
  ['Π.Α.Σ. ΘΕΣΣΑΛΟΝΙΚΗΣ', '650061'],
  ['ΓΙΑΝΝΙΤΣ', '650085'],
];

// Returns the numeric id whose logo lives at /logos/{id}.png, or null if
// no logo is known for this organizer.
export function resolveOrganizerLogoId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return ID_ALIASES[trimmed] ?? trimmed;
  }

  const upper = toUpper(trimmed);
  for (const [needle, id] of NAME_TO_ID) {
    if (upper.includes(toUpper(needle))) return id;
  }
  return null;
}
