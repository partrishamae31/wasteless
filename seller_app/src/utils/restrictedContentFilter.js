/**
 * Shared restricted-content filter for in-app messaging (TC_MSG_03).
 *
 * Blocks transmission of messages containing restricted keywords by returning
 * a violation reason that callers surface as a content-violation warning.
 */

// Keywords whose transmission is restricted: off-platform contact channels
// and common profanity/harassment terms.
const RESTRICTED_KEYWORDS = [
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
  "phone",
  "mobile number",
  "contact number",
  "personal number",
  "personal contact",
  "efbi",
  "epbi",
  "blue app",

  // Profanity / harassment / abuse (multilingual, matching the
  // Wasteless community's Filipino/English user base)
  "gago",
  "gagu",
  "bobo",
  "tanga",
  "putang ina",
  "puta",
  "puke",
  "tangina",
  "tarantado",
  "hinayupak",
  "leche",
  "ulol",
  "ungas",
  "shet",
  "shit",
  "fuck",
  "fucker",
  "bitch",
  "asshole",
  "bastard",
  "dickhead",
  "son of a bitch",
  "kingina",
  "pota",
  "pakyu",
  "kantutan",
  "sex",
  "inamo",
  "vovo",
  "baliw",
  "bading",
  "jakol",
  "putangena mo",
  "potangena",
  "pota",
  "pekpek",
  "tite",
  "pepe",
  "pvta",
  "otin",
  "nigga",
  "pwetan",
  "papapwet",
  "dildo",
  "tewup",
  "horny",
  "libog",
  "tamod",
  "cum"
];

// Leetspeak and visual variants are unified to letters so that
// "v1ber", "sh1t", "b0bo", etc. are still detected.
const LEET_MAP = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
};

const applyLeet = (text) =>
  String(text || "")
    .toLowerCase()
    .split("")
    .map((char) => LEET_MAP[char] || char)
    .join("");

/**
 * Form A: separators become spaces and repeated characters are collapsed,
 * so "fuuuuck" or "sh!t" still match their keyword.
 */
const normalizeSpaced = (text) =>
  applyLeet(text)
    .replace(/(.)\1+/g, "$1")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Form B: separators removed entirely, so letters split across spaces or
 * punctuation ("what s app", "f.a.c.e.b.o.o.k") still match.
 */
const normalizeCompact = (text) => applyLeet(text).replace(/[^a-z0-9]/g, "");

const VIOLATION_MESSAGE =
  "Message blocked: Your message contains restricted or inappropriate language and was not sent. Please revise it before sending again.";

/**
 * Keywords that must match as a whole token only. These are common words or
 * substrings of innocent words ("smartphone", "microphone"), so matching
 * them anywhere would produce false positives.
 */
const WHOLE_WORD_KEYWORDS = new Set([
  "phone",
  "shit",
  "shet",
  "puta",
  "puke",
  "gago",
  "bobo",
  "tanga",
  "ulol",
  "leche",
]);

/**
 * Check a message for restricted content.
 *
 * Each keyword is checked against two normalized forms of the message so
 * common evasion tricks are still caught:
 * 1. The spaced form — catches repeated-character and symbol obfuscation
 *    like "fuuuuck" or "v1ber".
 * 2. The compact form — catches letters split across spaces or punctuation
 *    like "what s app" or "f.a.c.e.b.o.o.k".
 *
 * @param {string} message - The raw message the user wants to send.
 * @returns {{ blocked: boolean, message: string }} `blocked` is true when the
 * message contains a restricted keyword; `message` is the content-violation
 * warning to display to the user.
 */
export const containsRestrictedContent = (message) => {
  const spaced = normalizeSpaced(message);

  if (!spaced) {
    return { blocked: false, message: "" };
  }

  const compact = normalizeCompact(message);
  const spacedTokens = new Set(spaced.split(" "));

  const isBlocked = RESTRICTED_KEYWORDS.some((keyword) => {
    const keywordSpaced = normalizeSpaced(keyword);
    const keywordCompact = normalizeCompact(keyword);

    // Whole-word keywords must match a complete token, not a fragment —
    // "phone" inside "smartphone" or "microphone" is legitimate.
    if (WHOLE_WORD_KEYWORDS.has(keyword)) {
      return spacedTokens.has(keywordSpaced) || compact === keywordCompact;
    }

    return spaced.includes(keywordSpaced) || compact.includes(keywordCompact);
  });

  if (isBlocked) {
    return { blocked: true, message: VIOLATION_MESSAGE };
  }

  return { blocked: false, message: "" };
};