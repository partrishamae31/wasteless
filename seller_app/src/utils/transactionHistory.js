import { supabase } from "../supabaseClient";

/**
 * Requirement 7 (Coordinate Transactions) shared helpers.
 *
 * REQ-3: every status change is written to transaction_status_history so a
 *        complete, ordered history exists for reference, monitoring and tracking.
 * 7.2.2.1: getMissingHandoverFields() lets each dashboard block an update and
 *        tell the user exactly which required data must be corrected.
 */

// Best available meeting location for a marketplace transaction.
export const getMeetingLocation = (tx) =>
  String(tx?.meeting_location || tx?.barangay || "").trim();

// Returns the list of required coordination fields that are still missing.
export const getMissingHandoverFields = (tx) => {
  const missing = [];
  if (!String(tx?.meetup_date || "").trim()) missing.push("meetup date");
  if (!String(tx?.meetup_time || "").trim()) missing.push("meetup time");
  if (!getMeetingLocation(tx)) missing.push("meeting location");
  return missing;
};

// Idempotent: skips the insert if the same transition was written in the last
// 15 seconds (e.g. by a database trigger or the other participant's client).
export const recordTransactionStatusHistory = async ({
  transactionId,
  oldStatus,
  newStatus,
  transaction,
  notes = null,
}) => {
  if (!transactionId || !newStatus) return;

  try {
    let lookup = supabase
      .from("transaction_status_history")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("new_status", newStatus)
      .gte("changed_at", new Date(Date.now() - 15_000).toISOString())
      .limit(1);

    lookup = oldStatus ? lookup.eq("old_status", oldStatus) : lookup.is("old_status", null);

    const { data: existing, error: lookupError } = await lookup;

    // A missing history table must never make a valid update fail.
    if (lookupError) {
      console.warn("Transaction status history could not be checked:", lookupError.message);
      return;
    }
    if (existing?.length) return;

    const { error } = await supabase.from("transaction_status_history").insert({
      transaction_id: transactionId,
      old_status: oldStatus || null,
      new_status: newStatus,
      changed_at: new Date().toISOString(),
      meetup_date: transaction?.meetup_date || null,
      meetup_time: transaction?.meetup_time || null,
      meeting_location: getMeetingLocation(transaction) || null,
      notes: notes || transaction?.notes || null,
    });

    if (error) {
      console.warn("Transaction updated, but status history could not be recorded:", error.message);
    }
  } catch (err) {
    console.warn("Unexpected transaction history error:", err);
  }
};
