import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

import {
  AlertTriangle,
  Eye,
  CheckCircle2,
  Clock3,
  Flag,
  Search,
  ShieldAlert,
  Users,
  Activity,
  BadgeCheck,
  Database,
} from "lucide-react";

const TransactionReview = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // ============================================
  // LOAD CURRENT ADMIN
  // ============================================

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user);
    };

    getCurrentUser();
  }, []);

  // ============================================
  // LOAD FLAGGED TRANSACTIONS
  // ============================================

  const loadTransactions = async () => {
    try {
      setLoading(true);

      /*
       * We only load transactions that have a flag.
       *
       * flag_reason IS NOT NULL
       *
       * This means normal completed transactions
       * will NOT appear in Transaction Review.
       */

      const { data: transactionData, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          created_at,
          seller_id,
          harvester_id,
          amount,
          barangay,
          status,
          meetup_date,
          meetup_time,
          notes,
          listing_id,
          cancel_reason,
          updated_at,
          drop_off_point_id,
          review_status,
          flag_reason,
          reviewed_by,
          reviewed_at,

          listings (
            id,
            device_model,
            category,
            condition,
            asking_price,
            description
          )
        `,
        )
        .not("flag_reason", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!transactionData || transactionData.length === 0) {
        setTransactions([]);
        setSelectedTransaction(null);
        return;
      }

      // ============================================
      // GET SELLER / HARVESTER PROFILES
      // ============================================

      const userIds = [
        ...new Set(
          transactionData.flatMap((transaction) => [
            transaction.seller_id,
            transaction.harvester_id,
          ]),
        ),
      ].filter(Boolean);

      let profiles = [];

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profileError) {
          console.error("Profile loading error:", profileError);
        } else {
          profiles = profileData || [];
        }
      }

      const profileMap = {};

      profiles.forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      // ============================================
      // COMBINE TRANSACTION + PROFILE DATA
      // ============================================

      const formattedTransactions = transactionData.map((transaction) => ({
        ...transaction,

        seller: profileMap[transaction.seller_id] || null,

        harvester: profileMap[transaction.harvester_id] || null,

        listing: transaction.listings || null,
      }));

      setTransactions(formattedTransactions);

      // Keep currently selected transaction selected
      if (selectedTransaction) {
        const updatedSelected = formattedTransactions.find(
          (item) => item.id === selectedTransaction.id,
        );

        setSelectedTransaction(updatedSelected || null);
      } else if (formattedTransactions.length > 0) {
        setSelectedTransaction(formattedTransactions[0]);
      }
    } catch (error) {
      console.error("Error loading transaction reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // ============================================
  // STATUS COUNTS
  // ============================================

  const pendingCount = transactions.filter(
    (transaction) =>
      !transaction.review_status || transaction.review_status === "pending",
  ).length;

  const underReviewCount = transactions.filter(
    (transaction) => transaction.review_status === "under_review",
  ).length;

  const resolvedCount = transactions.filter(
    (transaction) => transaction.review_status === "resolved",
  ).length;

  const timeoutCount = transactions.filter((transaction) =>
    transaction.flag_reason?.toLowerCase().includes("timeout"),
  ).length;

  // ============================================
  // FILTER TRANSACTIONS
  // ============================================

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // TAB FILTER
    if (activeTab === "pending") {
      filtered = filtered.filter(
        (transaction) =>
          !transaction.review_status || transaction.review_status === "pending",
      );
    }

    if (activeTab === "under_review") {
      filtered = filtered.filter(
        (transaction) => transaction.review_status === "under_review",
      );
    }

    if (activeTab === "resolved") {
      filtered = filtered.filter(
        (transaction) => transaction.review_status === "resolved",
      );
    }

    // SEARCH FILTER
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();

      filtered = filtered.filter((transaction) => {
        const device = transaction.listing?.device_model || "";

        const seller = transaction.seller?.full_name || "";

        const harvester = transaction.harvester?.full_name || "";

        const reason = transaction.flag_reason || "";

        const id = transaction.id || "";

        return (
          device.toLowerCase().includes(search) ||
          seller.toLowerCase().includes(search) ||
          harvester.toLowerCase().includes(search) ||
          reason.toLowerCase().includes(search) ||
          id.toLowerCase().includes(search)
        );
      });
    }

    return filtered;
  }, [transactions, activeTab, searchTerm]);

  // ============================================
  // ASSIGN TO ME
  // ============================================

  const handleAssignToMe = async () => {
    if (!selectedTransaction) {
      alert("Please select a transaction first.");
      return;
    }

    if (!currentUser) {
      alert("You must be logged in to review a transaction.");
      return;
    }

    try {
      setAssigning(true);

      const { data, error } = await supabase
        .from("transactions")
        .update({
          review_status: "under_review",
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedTransaction.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state immediately
      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === selectedTransaction.id
            ? {
                ...transaction,
                review_status: data.review_status,
                reviewed_by: data.reviewed_by,
                reviewed_at: data.reviewed_at,
              }
            : transaction,
        ),
      );

      setSelectedTransaction((prev) =>
        prev
          ? {
              ...prev,
              review_status: "under_review",
              reviewed_by: currentUser.id,
              reviewed_at: data.reviewed_at,
            }
          : prev,
      );

      alert("Transaction assigned to you and review started.");
    } catch (error) {
      console.error("Error assigning transaction:", error);

      alert("Failed to assign this transaction. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  // ============================================
  // RESOLVE REVIEW
  // ============================================

  const handleResolve = async () => {
    if (!selectedTransaction) return;

    if (!currentUser) {
      alert("You must be logged in.");
      return;
    }

    try {
      setAssigning(true);

      const { data, error } = await supabase
        .from("transactions")
        .update({
          review_status: "resolved",
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedTransaction.id)
        .select()
        .single();

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === selectedTransaction.id
            ? {
                ...transaction,
                review_status: data.review_status,
                reviewed_by: data.reviewed_by,
                reviewed_at: data.reviewed_at,
              }
            : transaction,
        ),
      );

      setSelectedTransaction((prev) =>
        prev
          ? {
              ...prev,
              review_status: "resolved",
              reviewed_by: currentUser.id,
              reviewed_at: data.reviewed_at,
            }
          : prev,
      );

      alert("Transaction review marked as resolved.");
    } catch (error) {
      console.error("Error resolving transaction:", error);

      alert("Failed to resolve this transaction. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  // ============================================
  // FORMAT DATE
  // ============================================

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ============================================
  // STATUS LABEL
  // ============================================

  const getReviewStatus = (transaction) => {
    if (!transaction.review_status) {
      return "pending";
    }

    return transaction.review_status;
  };

  const getStatusLabel = (status) => {
    if (status === "under_review") {
      return "Under Review";
    }

    if (status === "resolved") {
      return "Resolved";
    }

    return "Pending";
  };

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fb] p-6 lg:p-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f8ca3]" />

            <p className="text-sm text-slate-500">
              Loading transaction reviews...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // UI
  // ============================================

  return (
    <div className="min-h-screen bg-[#f6f8fb] p-6 lg:p-8">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-slate-800">
          Transaction Review
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Review flagged transactions and resolve transaction issues.
        </p>
      </div>

      {/* TOP STATS */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Flagged Transactions"
          value={transactions.length}
          icon={<Database size={18} />}
          color="text-orange-500"
        />

        <StatCard
          title="Pending Reviews"
          value={pendingCount}
          icon={<AlertTriangle size={18} />}
          color="text-orange-500"
        />

        <StatCard
          title="Under Review"
          value={underReviewCount}
          icon={<Eye size={18} />}
          color="text-blue-500"
        />

        <StatCard
          title="Resolved"
          value={resolvedCount}
          icon={<CheckCircle2 size={18} />}
          color="text-emerald-500"
        />
      </div>

      {/* STATUS CARDS */}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStatusCard
          title="Pending Review"
          value={pendingCount}
          color="orange"
          icon={<AlertTriangle size={16} />}
        />

        <MiniStatusCard
          title="Under Review"
          value={underReviewCount}
          color="blue"
          icon={<Eye size={16} />}
        />

        <MiniStatusCard
          title="Resolved"
          value={resolvedCount}
          color="green"
          icon={<CheckCircle2 size={16} />}
        />

        <MiniStatusCard
          title="Timeout Flags"
          value={timeoutCount}
          color="violet"
          icon={<Clock3 size={16} />}
        />
      </div>

      {/* FILTER TABS */}

      <div className="mt-5 flex overflow-hidden rounded-xl border border-slate-200 bg-white">
        {[
          ["pending", "Pending"],
          ["under_review", "Under Review"],
          ["resolved", "Resolved"],
          ["all", "All"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex-1 py-3 text-xs font-semibold transition ${
              activeTab === value
                ? "border-b-2 border-[#2f8ca3] bg-[#2f8ca3] text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* LEFT PANEL */}

        <div className="xl:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Flagged Transactions ({filteredTransactions.length})
              </h2>

              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={14} className="text-slate-400" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-24 text-xs text-slate-600 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
                <CheckCircle2
                  size={32}
                  className="mx-auto mb-3 text-emerald-400"
                />

                <p className="text-sm font-semibold text-slate-600">
                  No flagged transactions
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  There are no transactions in this category.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((item) => {
                  const status = getReviewStatus(item);

                  const isSelected = selectedTransaction?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTransaction(item)}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        isSelected
                          ? "border-[#2f8ca3] bg-[#f0fbff]"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div
                            className={`mt-1 rounded-lg p-2 ${
                              status === "pending"
                                ? "bg-orange-100 text-orange-500"
                                : status === "under_review"
                                  ? "bg-blue-100 text-blue-500"
                                  : "bg-emerald-100 text-emerald-500"
                            }`}
                          >
                            {status === "resolved" ? (
                              <CheckCircle2 size={15} />
                            ) : (
                              <AlertTriangle size={15} />
                            )}
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-slate-800">
                              {item.flag_reason || "Transaction Flag"}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.listing?.device_model || "Unknown device"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Seller:{" "}
                              {item.seller?.full_name || "Unknown seller"}
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                                  status === "pending"
                                    ? "bg-orange-100 text-orange-600"
                                    : status === "under_review"
                                      ? "bg-blue-100 text-blue-600"
                                      : "bg-emerald-100 text-emerald-600"
                                }`}
                              >
                                {getStatusLabel(status)}
                              </span>

                              <span className="text-[10px] text-slate-400">
                                {formatDate(item.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}

        <div className="xl:col-span-7">
          {!selectedTransaction ? (
            <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
              <div className="text-center">
                <ShieldAlert
                  size={40}
                  className="mx-auto mb-3 text-slate-200"
                />

                <p className="text-sm font-semibold text-slate-500">
                  Select a flagged transaction
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* HEADER */}

              <div
                className={`p-5 text-white ${
                  getReviewStatus(selectedTransaction) === "resolved"
                    ? "bg-gradient-to-r from-emerald-500 to-green-600"
                    : getReviewStatus(selectedTransaction) === "under_review"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                      : "bg-gradient-to-r from-orange-500 to-red-500"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={18} />

                      <h2 className="text-sm font-semibold">
                        Flagged Transaction Review
                      </h2>
                    </div>

                    <p className="mt-1 break-all text-xs text-white/70">
                      ID: {selectedTransaction.id}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
                    {getStatusLabel(getReviewStatus(selectedTransaction))}
                  </span>
                </div>
              </div>

              {/* BODY */}

              <div className="space-y-6 p-6">
                {/* REASON */}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Reason
                  </p>

                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <AlertTriangle size={15} className="text-orange-500" />

                    {selectedTransaction.flag_reason || "No reason provided"}
                  </div>
                </div>

                {/* TRANSACTION DETAILS */}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transaction Details
                  </p>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400">
                          Device
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {selectedTransaction.listing?.device_model ||
                            "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase text-slate-400">
                          Category
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {selectedTransaction.listing?.category || "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase text-slate-400">
                          Amount
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          ₱
                          {Number(
                            selectedTransaction.amount || 0,
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase text-slate-400">
                          Transaction Status
                        </p>

                        <p className="mt-1 text-sm font-semibold capitalize text-slate-700">
                          {selectedTransaction.status || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION / NOTES */}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transaction Notes
                  </p>

                  <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                    {selectedTransaction.notes ||
                      "No transaction notes were provided."}
                  </div>
                </div>

                {/* PEOPLE */}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Seller
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {selectedTransaction.seller?.full_name ||
                        "Unknown seller"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Buyer / Harvester
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {selectedTransaction.harvester?.full_name ||
                        "Unknown buyer"}
                    </p>
                  </div>
                </div>

                {/* MEETUP */}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Meetup Date
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {selectedTransaction.meetup_date
                        ? formatDate(selectedTransaction.meetup_date)
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Meetup Time
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {selectedTransaction.meetup_time || "-"}
                    </p>
                  </div>
                </div>

                {/* REVIEW META */}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Review Status
                    </p>

                    <p className="mt-2 text-sm font-medium capitalize text-slate-700">
                      {getStatusLabel(getReviewStatus(selectedTransaction))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Reviewed On
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {selectedTransaction.reviewed_at
                        ? formatDateTime(selectedTransaction.reviewed_at)
                        : "Not reviewed yet"}
                    </p>
                  </div>
                </div>

                {/* ACTION BUTTONS */}

                {getReviewStatus(selectedTransaction) === "pending" && (
                  <button
                    onClick={handleAssignToMe}
                    disabled={assigning}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Flag size={16} />

                    {assigning ? "Assigning..." : "Assign to Me & Start Review"}
                  </button>
                )}

                {getReviewStatus(selectedTransaction) === "under_review" && (
                  <button
                    onClick={handleResolve}
                    disabled={assigning}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <CheckCircle2 size={16} />

                    {assigning ? "Resolving..." : "Mark Review as Resolved"}
                  </button>
                )}

                {getReviewStatus(selectedTransaction) === "resolved" && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 size={16} />
                    Transaction Review Resolved
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================
   TOP STAT CARD
========================= */

const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-800">
            {value}
          </h2>
        </div>

        <div className={`rounded-xl bg-slate-50 p-3 ${color}`}>{icon}</div>
      </div>
    </div>
  );
};

/* =========================
   MINI STATUS CARD
========================= */

const MiniStatusCard = ({ title, value, color, icon }) => {
  const styles = {
    orange: "border-orange-200 text-orange-500 bg-orange-50",

    blue: "border-blue-200 text-blue-500 bg-blue-50",

    green: "border-emerald-200 text-emerald-500 bg-emerald-50",

    violet: "border-violet-200 text-violet-500 bg-violet-50",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div
            className={`mb-3 inline-flex rounded-lg border p-2 ${styles[color]}`}
          >
            {icon}
          </div>

          <p className="text-sm text-slate-500">{title}</p>
        </div>

        <h2 className="text-2xl font-semibold text-slate-800">{value}</h2>
      </div>
    </div>
  );
};

export default TransactionReview;
