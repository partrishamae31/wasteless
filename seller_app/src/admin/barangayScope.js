
import { supabase } from "./supabaseClient";

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

export function getAdminBarangay(adminProfile) {
  const barangay = adminProfile?.barangay;

  return typeof barangay === "string" && barangay.trim()
    ? barangay.trim()
    : null;
}

export function normalizeBarangay(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

export function filterByBarangay(
  records,
  barangay,
  field = "barangay"
) {
  if (!barangay) return records || [];

  return (records || []).filter(
    (record) =>
      normalizeBarangay(record?.[field]) ===
      normalizeBarangay(barangay)
  );
}

export function scopeQuery(query, barangay, field = "barangay") {
  return barangay ? query.eq(field, barangay.trim()) : query;
}

/**
 * Scope transactions to the admin's barangay.
 *
 * Includes:
 * 1. Transactions whose barangay column matches.
 * 2. Transactions whose drop_off_point_id belongs to a
 *    drop-off point in the admin's barangay.
 *
 * IMPORTANT: This function is asynchronous.
 * Use: query = await scopeTransactionsQuery(query, barangay);
 */
export async function scopeTransactionsQuery(query, barangay) {
  if (!barangay || !barangay.trim()) {
    return query;
  }

  const normalizedBarangay = barangay.trim();

  const { data: points, error } = await supabase
    .from("drop_off_points")
    .select("id")
    .ilike("barangay", normalizedBarangay);

  if (error) {
    console.error(
      "Failed to load barangay drop-off points:",
      error.message
    );

    // Fail closed rather than showing city-wide transactions.
    return query.eq("barangay", normalizedBarangay);
  }

  const pointIds = (points || []).map((point) => point.id);

  if (pointIds.length === 0) {
    return query.eq("barangay", normalizedBarangay);
  }

  const ids = pointIds.join(",");

  return query.or(
    `barangay.eq."${normalizedBarangay}",drop_off_point_id.in.(${ids})`
  );
}

export function isSameBarangay(a, b) {
  return (
    normalizeBarangay(a) === normalizeBarangay(b) &&
    normalizeBarangay(a) !== ""
  );
}