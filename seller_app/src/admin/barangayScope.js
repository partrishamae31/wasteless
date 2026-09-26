import { supabase } from "./supabaseClient";

/**
 * Barangay-coordinator scoping helpers.
 *
 * Every admin is assigned ONE barangay (profiles.barangay, role = "admin").
 * These helpers resolve the logged-in admin's barangay and expose small
 * helpers so every admin tab only loads data for that barangay.
 */

export const VALENZUELA_BARANGAYS = [
  "Arkong Bato",
  "Bagbaguin",
  "Balangkas",
  "Bignay",
  "Bisig",
  "Canumay East",
  "Canumay West",
  "Coloong",
  "Dalandanan",
  "Gen. T. de Leon",
  "Isla",
  "Karuhatan",
  "Lawang Bato",
  "Lingunan",
  "Mabolo",
  "Malanday",
  "Malinta",
  "Mapulang Lupa",
  "Marulas",
  "Maysan",
  "Palasan",
  "Pariancillo Villa",
  "Paso de Blas",
  "Pasolo",
  "Poblacion",
  "Pulo",
  "Punturin",
  "Rincon",
  "Tagalag",
  "Ugong",
  "Veinte Reales",
  "Wawang Pulo",
];

/**
 * Fetch the logged-in admin's full profile row from `profiles`.
 * Returns the profile object or null when unavailable.
 */
export async function fetchAdminProfile(session) {
  const userId = session?.user?.id;

  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load admin profile:", error.message);
    return null;
  }

  return data || null;
}

/**
 * Resolve the barangay an admin is assigned to.
 * Falls back to null when unknown — callers treat null as "no scoping data".
 */
export function getAdminBarangay(adminProfile) {
  const barangay = adminProfile?.barangay;

  return typeof barangay === "string" && barangay.trim()
    ? barangay.trim()
    : null;
}

/**
 * Normalize a barangay string for comparison (case/space insensitive).
 */
export function normalizeBarangay(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Client-side filter: keep only records whose barangay matches the admin's.
 * Records with no barangay are dropped when scoping is active.
 */
export function filterByBarangay(records, barangay, field = "barangay") {
  if (!barangay) return records;

  return (records || []).filter(
    (record) => normalizeBarangay(record?.[field]) === normalizeBarangay(barangay),
  );
}

/**
 * Apply a Supabase `.eq(field, barangay)` filter to a query builder.
 * Returns the builder untouched when no barangay is known.
 */
export function scopeQuery(query, barangay, field = "barangay") {
  return barangay ? query.eq(field, barangay) : query;
}

/**
 * True when two barangay strings refer to the same barangay.
 */
export function isSameBarangay(a, b) {
  return normalizeBarangay(a) === normalizeBarangay(b) && normalizeBarangay(a) !== "";
}