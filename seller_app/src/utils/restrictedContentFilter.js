/**
 * Shared restricted-content filter for in-app messaging (TC_MSG_03, REQ-4).
 *
 * Blocks transmission of messages that contain:
 *  1. restricted keywords (off-platform channels, profanity/harassment), and
 *  2. contact details or specific locations (phone numbers, emails, links,
 *     street addresses, coordinates) that should go through the app instead.
 *
 * Callers surface the returned `message` as a content-violation warning.
 */

// ---------------------------------------------------------------------------
// Keyword lists
// ---------------------------------------------------------------------------

// Distinctive keywords. These match anywhere inside a word ("fucking",
// "emailed") and when letters are split across tokens ("what s app").
const SUBSTRING_KEYWORDS = [
  // Off-platform contact channels
  "viber",
  "whatsapp",
  "telegram",
  "messenger",
  "facebook",
  "instagram",
  "gmail",
  "email",
  "e-mail",
  "mobile number",
  "contact number",
  "personal number",
  "personal contact",

  // Profanity / harassment / abuse
  "putang ina",
  "tangina",
  "tarantado",
  "hinayupak",
  "fuck",
  "fucker",
  "bitch",
  "asshole",
  "bastard",
  "dickhead",
  "son of a bitch",
  "kingina",
  "pakyu",
  "kantutan",
  "putangena mo",
  "potangena",
  "pekpek",
  "pwetan",
  "papapwet",
  "dildo",
  "tewup",
  "libog",
  "tamod",
  "jakol",
];

// Short or collision-prone keywords. These only match a COMPLETE word
// ("phone" matches "phone" but not "iPhone"; "cum" does not match
// "document"; "otin" does not match "not in stock").
const WORD_KEYWORDS = [
  "phone",
  "efbi",
  "epbi",
  "gago",
  "gagu",
  "bobo",
  "tanga",
  "puta",
  "puke",
  "pota",
  "pvta",
  "ulol",
  "ungas",
  "leche",
  "shet",
  "shit",
  "shiet",
  "sex",
  "sexy",
  "sexting",
  "inamo",
  "vovo",
  "baliw",
  "bading",
  "jakol",
  "tite",
  "pepe",
  "otin",
  "horny",
  "cum",
  "cumming",
  "cumshot",
  "nigga",
  "niggas",
  "niggaz",
  "nigger",
  "niggers",
];

// Phrases that must match as a whole phrase only (never inside a longer word,
// e.g. "blue app" must not match "blue apple").
const PHRASE_KEYWORDS = ["blue app"];

// Innocent words that would otherwise collide with a keyword once repeated
// letters are collapsed ("sheet" -> "shet", "unggas" -> "ungas") or that
// merely contain one ("voicemail" contains "email").
const SAFE_WORDS = new Set(["sheet", "sheets", "unggas", "voicemail"]);

// Words that are legitimate when describing a device (repair requests, device
// models) but are still blocked in ordinary chat. Only ignored when the caller
// passes { allowDeviceTerms: true }.
const DEVICE_TERMS = new Set(["phone"]);

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

// Leetspeak and visual variants are unified to letters so that
// "v1ber", "sh1t", "b0bo", etc. are still detected.
const LEET_MAP = {
  0: "o",
  1: "i",
  3: "e",
  4: "a",
  5: "s",
  7: "t",
  8: "b",
  "@": "a",
  $: "s",
  "!": "i",
};

const toBase = (text) =>
  String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const applyLeet = (text) => text.replace(/[0134578@$!]/g, (c) => LEET_MAP[c]);

// "fuuuuck" -> "fuck"
const collapseRepeats = (text) => text.replace(/(.)\1+/g, "$1");

const normalizeKeyword = (keyword) =>
  collapseRepeats(applyLeet(toBase(keyword)).replace(/[^a-z0-9]/g, ""));

const SUBSTRING_SET = new Set(SUBSTRING_KEYWORDS.map(normalizeKeyword));
const WORD_SET = new Set(WORD_KEYWORDS.map(normalizeKeyword));
const PHRASE_SET = new Set(PHRASE_KEYWORDS.map(normalizeKeyword));

// Phrases and distinctive keywords can be split across tokens.
const WINDOW_SET = new Set([...SUBSTRING_SET, ...PHRASE_SET]);

/**
 * Split a message into word tokens.
 *
 * Punctuation at the edges of a word is trimmed BEFORE leetspeak is applied,
 * so "gago!" stays "gago" instead of becoming "gagoi", while "sh!t" and
 * "$hit" are still read as "shit".
 */
const tokenize = (message) =>
  toBase(message)
    .split(/\s+/)
    .flatMap((piece) => {
      const core = piece.replace(/^[^a-z0-9@$]+|[^a-z0-9@$]+$/g, "");

      if (!core) {
        return [];
      }

      return core
        .split(/[^a-z0-9@$!]+/)
        .filter(Boolean)
        .map((part) => applyLeet(part));
    })
    .map((raw) => ({ raw, col: collapseRepeats(raw) }));

const MAX_WINDOW_CHARS = 30;

/**
 * Keyword check.
 *
 * 1. Single tokens: distinctive keywords may appear anywhere inside a token;
 *    short keywords must equal the whole token.
 * 2. Windows of adjacent tokens: catches letters split by spaces or
 *    punctuation ("what s app", "f.a.c.e.b.o.o.k"). A window must EQUAL a
 *    keyword, so text across unrelated words ("a bit chipped") never matches.
 *    Short keywords are only matched in windows made entirely of single
 *    characters ("s h i t").
 */
const containsRestrictedKeyword = (message, ignoredWords = null) => {
  const tokens = tokenize(message);
  const isIgnored = (word) => Boolean(ignoredWords && ignoredWords.has(word));

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (!SAFE_WORDS.has(token.raw)) {
      if (
        (WORD_SET.has(token.col) && !isIgnored(token.col)) ||
        PHRASE_SET.has(token.col)
      ) {
        return true;
      }

      for (const keyword of SUBSTRING_SET) {
        if (token.col.includes(keyword)) {
          return true;
        }
      }
    }

    let joined = token.raw;
    let allSingleChars = token.raw.length === 1;

    for (let j = i + 1; j < tokens.length; j += 1) {
      joined += tokens[j].raw;
      allSingleChars = allSingleChars && tokens[j].raw.length === 1;

      if (joined.length > MAX_WINDOW_CHARS) {
        break;
      }

      const collapsed = collapseRepeats(joined);

      if (
        WINDOW_SET.has(collapsed) ||
        (collapsed.endsWith("s") && WINDOW_SET.has(collapsed.slice(0, -1)))
      ) {
        return true;
      }

      if (
        allSingleChars &&
        collapsed.length >= 3 &&
        WORD_SET.has(collapsed) &&
        !isIgnored(collapsed)
      ) {
        return true;
      }
    }
  }

  return false;
};

// ---------------------------------------------------------------------------
// Contact details and unauthorized location details (REQ-4)
// Checked on the raw text, before leetspeak mapping turns digits into letters.
// ---------------------------------------------------------------------------

// 9-13 digits, allowing spaces, dots, dashes and brackets between them:
// 09171234567, +63 917 123 4567, (02) 8123 4567.
const PHONE_DIGITS = /[+(]?\d(?:[\s().-]{0,2}\d){8,}/g;

// Seven or more spelled-out digits in a row ("zero nine one seven ...").
const SPELLED_DIGITS =
  /\b(?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)\b[\s,.-]*){7,}/i;

// name@host, name (at) host, and bare @handles.
const EMAIL_LIKE = /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]{2,}/i;
const HANDLE = /(?:^|\s)@[\w.]{3,}/;

// Links and bare domains (fb.me, bit.ly/xyz, goo.gl/maps, name dot com).
const URL_LIKE =
  /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|ph|me|io|co|ly|gl|link|xyz)\b|\bdot\s*(?:com|net|org|ph)\b/i;

// Specific locations: the word "address", house/block/lot/unit numbers,
// street addresses, GPS coordinates, and location-sharing requests.
// Adjust these to match what your team considers "unauthorized location".
const LOCATION_PATTERNS = [
  /\baddress(?:es)?\b/i,
  /\b(?:blk|block|lot|unit|bldg|building|rm|room|floor|flr)\.?\s*#?\s*\d+\b/i,
  /\b\d{1,5}[a-z]?\s+(?:[a-z.]+\s+){0,3}(?:st|street|ave|avenue|rd|road|blvd|boulevard|hwy|highway|lane|ln)\b/i,
  /-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/,
  /\b(?:pin|share|send|drop)\s*(?:me\s*)?(?:your\s*|my\s*)?(?:live\s*)?(?:location|loc)\b/i,
];

const containsContactOrLocation = (message) => {
  const text = String(message || "");

  const digitRuns = text.match(PHONE_DIGITS) || [];
  const hasPhoneNumber = digitRuns.some((run) => {
    const count = run.replace(/\D/g, "").length;
    return count >= 9 && count <= 13;
  });

  return (
    hasPhoneNumber ||
    SPELLED_DIGITS.test(text) ||
    EMAIL_LIKE.test(text) ||
    HANDLE.test(text) ||
    URL_LIKE.test(text) ||
    LOCATION_PATTERNS.some((pattern) => pattern.test(text))
  );
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const VIOLATION_MESSAGE =
  "Message blocked: Your message contains restricted or inappropriate language and was not sent. Please revise it before sending again.";

const CONTACT_LOCATION_MESSAGE =
  "Message blocked: Phone numbers, emails, links, and specific addresses cannot be shared in chat. Please use the in-app meetup scheduling instead.";

/**
 * Check a message for restricted content.
 *
 * @param {string} message - The raw message the user wants to send.
 * @param {{ allowDeviceTerms?: boolean }} [options] - Pass
 * `{ allowDeviceTerms: true }` for device descriptions (e.g. repair requests)
 * so a word like "phone" is allowed. Phone numbers, emails, links and every
 * other rule still apply.
 * @returns {{ blocked: boolean, message: string, reason?: string }} `blocked`
 * is true when the message violates the messaging rules; `message` is the
 * content-violation warning to display to the user; `reason` is "keyword" or
 * "contact_or_location" when blocked.
 */
export const containsRestrictedContent = (message, options = {}) => {
  const text = String(message || "");

  if (!text.trim()) {
    return { blocked: false, message: "" };
  }

  const ignoredWords = options && options.allowDeviceTerms ? DEVICE_TERMS : null;

  if (containsRestrictedKeyword(text, ignoredWords)) {
    return { blocked: true, reason: "keyword", message: VIOLATION_MESSAGE };
  }

  if (containsContactOrLocation(text)) {
    return {
      blocked: true,
      reason: "contact_or_location",
      message: CONTACT_LOCATION_MESSAGE,
    };
  }

  return { blocked: false, message: "" };
};