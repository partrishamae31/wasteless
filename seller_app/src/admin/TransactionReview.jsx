import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { scopeTransactionsQuery } from "./barangayScope";

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

const TransactionReview = ({ adminBarangay }) => {
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Meetup reports submitted by sellers/buyers are stored in
  // transaction_reports and reviewed from this admin screen.
  const [reportCount, setReportCount] = useState(0);

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
      setLoadError("");

      const transactionSelect = `
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
        completed_at,
        carbon_saved,
        receipt_reference,
        repair_appointment_id,

        listings (
          id,
          device_model,
          category,
          condition,
          asking_price,
          description
        )
      `;

      // ============================================
      // LOAD EXISTING FLAGGED TRANSACTIONS
      // ============================================

      let flaggedQuery = supabase
        .from("transactions")
        .select(transactionSelect)
        .not("flag_reason", "is", null)
        .order("created_at", { ascending: false });

      flaggedQuery = scopeTransactionsQuery(flaggedQuery, adminBarangay);

      const { data: flaggedData, error: flaggedError } = await flaggedQuery;

      if (flaggedError) throw flaggedError;

      // ============================================
      // LOAD MEETUP REPORTS
      // ============================================

      // First get the transactions visible to this administrator's barangay.
      // We use these IDs to scope transaction_reports as well. This avoids
      // relying on transaction_reports RLS to infer the barangay.
      let scopedTransactionsQuery = supabase
        .from("transactions")
        .select(transactionSelect);

      scopedTransactionsQuery = scopeTransactionsQuery(
        scopedTransactionsQuery,
        adminBarangay,
      );

      const {
        data: scopedTransactionData,
        error: scopedTransactionsError,
      } = await scopedTransactionsQuery;

      if (scopedTransactionsError) throw scopedTransactionsError;

      const scopedTransactionIds = [
        ...new Set(
          (scopedTransactionData || [])
            .map((transaction) => transaction.id)
            .filter(Boolean),
        ),
      ];

      let reports = [];

      // Load reports only for transactions inside the current admin scope.
      // This is intentionally scoped before merging with flagged transactions.
      if (scopedTransactionIds.length > 0) {
        const { data: reportData, error: reportError } = await supabase
          .from("transaction_reports")
          .select(
            `
              id,
              transaction_id,
              reporter_id,
              reason,
              details,
              status,
              created_at,
              resolved_at,
              resolved_by
            `,
          )
          .in("transaction_id", scopedTransactionIds)
          .order("created_at", { ascending: false });

        if (reportError) throw reportError;
        reports = reportData || [];
      }

      const openScopedReports = reports.filter(
        (report) => String(report.status || "").toLowerCase() === "open",
      );

      setReportCount(openScopedReports.length);

      // A meetup report may exist even when transactions.flag_reason is NULL.
      // The transaction list is already barangay-scoped, so only reports tied
      // to those transaction IDs can enter the admin review list.
      const reportTransactionIds = [
        ...new Set(reports.map((report) => report.transaction_id).filter(Boolean)),
      ];

      const scopedTransactionMap = new Map(
        (scopedTransactionData || []).map((transaction) => [
          transaction.id,
          transaction,
        ]),
      );

      const reportedTransactions = reportTransactionIds
        .map((transactionId) => scopedTransactionMap.get(transactionId))
        .filter(Boolean);

      // ============================================
      // MERGE FLAGGED + REPORTED TRANSACTIONS
      // ============================================

      const transactionMap = new Map();

      [...(flaggedData || []), ...reportedTransactions].forEach((transaction) => {
        if (!transactionMap.has(transaction.id)) {
          transactionMap.set(transaction.id, transaction);
        }
      });

      const transactionData = [...transactionMap.values()].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      );

      if (transactionData.length === 0) {
        setTransactions([]);
        setSelectedTransaction(null);
        return;
      }

      // ============================================
      // GET SELLER / BUYER / REPORTER PROFILES
      // ============================================

      const userIds = [
        ...new Set(
          transactionData.flatMap((transaction) => [
            transaction.seller_id,
            transaction.harvester_id,
          ]),
        ),
        ...new Set(reports.map((report) => report.reporter_id).filter(Boolean)),
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

      // Attach all reports to their transaction. The newest report is also
      // exposed as transaction_report for convenient rendering.
      const reportsByTransaction = {};
      reports.forEach((report) => {
        if (!reportsByTransaction[report.transaction_id]) {
          reportsByTransaction[report.transaction_id] = [];
        }
        reportsByTransaction[report.transaction_id].push({
          ...report,
          reporter: profileMap[report.reporter_id] || null,
          resolver: profileMap[report.resolved_by] || null,
        });
      });

      // ============================================
      // COMBINE TRANSACTION + PROFILE + REPORT DATA
      // ============================================

      const formattedTransactions = transactionData.map((transaction) => {
        const transactionReports = reportsByTransaction[transaction.id] || [];
        const openReports = transactionReports.filter(
          (report) => report.status === "open",
        );

        return {
          ...transaction,
          seller: profileMap[transaction.seller_id] || null,
          harvester: profileMap[transaction.harvester_id] || null,
          listing: transaction.listings || null,
          transaction_reports: transactionReports,
          open_transaction_reports: openReports,
          transaction_report: transactionReports[0] || null,
          has_open_report: openReports.length > 0,
        };
      });

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
      setLoadError(error?.message || "Unable to load flagged transactions and meetup reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminBarangay]);

  // ============================================
  // REPORT HELPERS
  // ============================================

  const getOpenReports = (transaction) =>
    transaction?.open_transaction_reports || [];

  const getPrimaryReport = (transaction) => {
    const reports = transaction?.transaction_reports || [];
    return reports[0] || null;
  };

  const getDisplayReason = (transaction) => {
    const report = getPrimaryReport(transaction);
    return report?.reason || transaction?.flag_reason || "Transaction Report";
  };

  const getReportSourceLabel = (transaction) => {
    const reports = getOpenReports(transaction);
    if (reports.length > 0) return "Meetup Report";
    if (transaction?.flag_reason) return "System Flag";
    return "Transaction Review";
  };

  // ============================================
  // STATUS COUNTS
  // ============================================

  const pendingCount = transactions.filter(
    (transaction) =>
      (!transaction.review_status || transaction.review_status === "pending") ||
      getOpenReports(transaction).length > 0 &&
        (!transaction.review_status || transaction.review_status === "pending"),
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
          (!transaction.review_status ||
            transaction.review_status === "pending") &&
          (transaction.has_open_report ||
            !transaction.review_status ||
            transaction.review_status === "pending"),
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

    if (activeTab === "escalated") {
      filtered = filtered.filter(
        (transaction) => transaction.review_status === "escalated",
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
        const reportReason = getPrimaryReport(transaction)?.reason || "";
        const reportDetails = getPrimaryReport(transaction)?.details || "";
        const reporter = getPrimaryReport(transaction)?.reporter?.full_name || "";

        const id = transaction.id || "";

        return (
          device.toLowerCase().includes(search) ||
          seller.toLowerCase().includes(search) ||
          harvester.toLowerCase().includes(search) ||
          reason.toLowerCase().includes(search) ||
          reportReason.toLowerCase().includes(search) ||
          reportDetails.toLowerCase().includes(search) ||
          reporter.toLowerCase().includes(search) ||
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

      const { data, error } = await supabase.rpc(
        "admin_update_transaction_review",
        {
          p_transaction_id: selectedTransaction.id,
          p_review_status: "under_review",
        },
      );

      if (error) throw error;

      const reviewData = Array.isArray(data) ? data[0] : data;

      if (!reviewData) {
        throw new Error("The transaction review update was not returned by the server.");
      }

      // Update local state immediately
      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === selectedTransaction.id
            ? {
                ...transaction,
                review_status: reviewData.review_status,
                reviewed_by: reviewData.reviewed_by,
                reviewed_at: reviewData.reviewed_at,
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
              reviewed_at: reviewData.reviewed_at,
            }
          : prev,
      );

      alert("Transaction assigned to you and review started.");
    } catch (error) {
      console.error("Error assigning transaction:", error);

      alert(
        `Failed to assign this transaction: ${
          error?.message || "Please try again."
        }`,
      );
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

      const reviewedAt = new Date().toISOString();

      // Resolve every open meetup report attached to this transaction.
      const openReports = getOpenReports(selectedTransaction);
      if (openReports.length > 0) {
        const { error: reportError } = await supabase
          .from("transaction_reports")
          .update({
            status: "resolved",
            resolved_at: reviewedAt,
            resolved_by: currentUser.id,
          })
          .eq("transaction_id", selectedTransaction.id)
          .eq("status", "open");

        if (reportError) throw reportError;
        setReportCount((prev) => Math.max(0, prev - openReports.length));
      }

      const { data, error } = await supabase.rpc(
        "admin_update_transaction_review",
        {
          p_transaction_id: selectedTransaction.id,
          p_review_status: "resolved",
        },
      );

      if (error) throw error;

      const reviewData = Array.isArray(data) ? data[0] : data;

      if (!reviewData) {
        throw new Error("The transaction review update was not returned by the server.");
      }

      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === selectedTransaction.id
            ? {
                ...transaction,
                review_status: reviewData.review_status,
                reviewed_by: reviewData.reviewed_by,
                reviewed_at: reviewData.reviewed_at,
                open_transaction_reports: [],
                transaction_reports: (transaction.transaction_reports || []).map((report) =>
                  report.status === "open"
                    ? {
                        ...report,
                        status: "resolved",
                        resolved_at: reviewedAt,
                        resolved_by: currentUser.id,
                        resolver: { id: currentUser.id, full_name: currentUser.user_metadata?.full_name || "Administrator" },
                      }
                    : report,
                ),
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
              reviewed_at: reviewData.reviewed_at,
              has_open_report: false,
              open_transaction_reports: [],
              transaction_reports: (prev.transaction_reports || []).map((report) =>
                report.status === "open"
                  ? { ...report, status: "resolved", resolved_at: reviewedAt, resolved_by: currentUser.id }
                  : report,
              ),
            }
          : prev,
      );

      // Notify both transaction parties that an administrator resolved the review.
      const partyIds = [selectedTransaction.seller_id, selectedTransaction.harvester_id].filter(Boolean);
      if (partyIds.length) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(
            partyIds.map((userId) => ({
              user_id: userId,
              type: "transaction_update",
              title: "Transaction Review Resolved",
              content: "An administrator has resolved the flagged transaction review.",
              related_listing_id: selectedTransaction.listing_id || null,
              is_read: false,
              description: `Transaction ${selectedTransaction.id} was marked resolved by an administrator.`,
            })),
          );
        if (notificationError) {
          console.warn("ADMIN REVIEW NOTIFICATION ERROR:", notificationError);
        }
      }

      alert("Transaction review marked as resolved.");
    } catch (error) {
      console.error("Error resolving transaction:", error);

      alert(
        `Failed to resolve this transaction: ${
          error?.message || "Please try again."
        }`,
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedTransaction || !currentUser) return;

    try {
      setAssigning(true);
      const { data, error } = await supabase.rpc(
        "admin_update_transaction_review",
        {
          p_transaction_id: selectedTransaction.id,
          p_review_status: "escalated",
        },
      );

      if (error) throw error;

      const reviewData = Array.isArray(data) ? data[0] : data;

      if (!reviewData) {
        throw new Error("The transaction review update was not returned by the server.");
      }

      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === selectedTransaction.id
            ? { ...transaction, ...reviewData }
            : transaction,
        ),
      );
      setSelectedTransaction((prev) => (prev ? { ...prev, ...reviewData } : prev));

      const partyIds = [selectedTransaction.seller_id, selectedTransaction.harvester_id].filter(Boolean);
      if (partyIds.length) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(partyIds.map((userId) => ({
            user_id: userId,
            type: "transaction_update",
            title: "Transaction Escalated",
            content: "An administrator escalated the transaction for further review.",
            related_listing_id: selectedTransaction.listing_id || null,
            is_read: false,
            description: `Transaction ${selectedTransaction.id} was escalated by an administrator.`,
          })));
        if (notificationError) console.warn("ESCALATION NOTIFICATION ERROR:", notificationError);
      }

      alert("Transaction escalated for further review.");
    } catch (error) {
      console.error("Error escalating transaction:", error);
      alert(
        `Failed to escalate this transaction: ${
          error?.message || "Please try again."
        }`,
      );
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

    if (status === "escalated") {
      return "Escalated";
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-800">Transaction Review</h1>
          <p className="mt-1 text-sm text-slate-400">
            Review flagged transactions, document the review, and resolve or escalate reported issues.
          </p>
          {adminBarangay && (
            <p className="mt-2 text-xs font-medium text-slate-500">
              Barangay scope: {adminBarangay}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Meetup reports are loaded from transaction_reports for transactions within this administrator scope.
          </p>
        </div>
        <button
          type="button"
          onClick={loadTransactions}
          disabled={loading || assigning}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loadError && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>Could not load transaction reviews: {loadError}</span>
          <button type="button" onClick={loadTransactions} className="font-semibold underline" disabled={loading}>Try again</button>
        </div>
      )}

      

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
          ["escalated", "Escalated"],
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
                Flagged Transactions & Meetup Reports ({filteredTransactions.length})
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
                  {searchTerm.trim()
                    ? "No matching transactions"
                    : "No flagged transactions or meetup reports"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {searchTerm.trim()
                    ? "Try a different search term or choose another status tab."
                    : "Flagged transactions and submitted meetup reports within your barangay scope will appear here."}
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
                                  : status === "escalated"
                                  ? "bg-orange-100 text-orange-500"
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
                              {item.has_open_report
                                ? getPrimaryReport(item)?.reason || "Meetup Report"
                                : item.flag_reason || "Transaction Flag"}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.listing?.device_model || "Unknown device"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Seller:{" "}
                              {item.seller?.full_name || "Unknown seller"}
                            </p>

                            {item.has_open_report && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
                                  Open Meetup Report
                                </span>
                                <span className="text-xs font-semibold text-red-600">
                                  {getPrimaryReport(item)?.reason || "Reported issue"}
                                </span>
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${
                                  status === "pending"
                                    ? "bg-orange-100 text-orange-600"
                                    : status === "under_review"
                                      ? "bg-blue-100 text-blue-600"
                                      : status === "escalated"
                                      ? "bg-orange-100 text-orange-600"
                                      : "bg-emerald-100 text-emerald-600"
                                }`}
                              >
                                {getStatusLabel(status)}
                              </span>

                              <span className="text-xs text-slate-400">
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
                      : getReviewStatus(selectedTransaction) === "escalated"
                        ? "bg-gradient-to-r from-orange-500 to-amber-600"
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

                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
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

                    {getDisplayReason(selectedTransaction)}
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate-400">
                    Source: {getReportSourceLabel(selectedTransaction)}
                  </p>
                </div>

                {getPrimaryReport(selectedTransaction) && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-red-100 p-2 text-red-600">
                        <AlertTriangle size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                          Meetup Report
                        </p>
                        <p className="mt-1 text-sm font-semibold text-red-800">
                          {getPrimaryReport(selectedTransaction)?.reason || "Reported issue"}
                        </p>
                        <p className="mt-2 text-xs text-red-700">
                          Reported by: {getPrimaryReport(selectedTransaction)?.reporter?.full_name || "Unknown user"}
                        </p>
                        <p className="mt-1 text-xs text-red-600">
                          Reported on: {formatDateTime(getPrimaryReport(selectedTransaction)?.created_at)}
                        </p>
                        <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm leading-relaxed text-slate-700">
                          {getPrimaryReport(selectedTransaction)?.details || "No additional details were provided."}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(selectedTransaction.transaction_reports || []).map((report) => (
                            <span
                              key={report.id}
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                report.status === "open"
                                  ? "bg-red-100 text-red-700"
                                  : report.status === "resolved"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {report.status === "open" ? "Open Report" : report.status}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TRANSACTION DETAILS */}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transaction Details
                  </p>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase text-slate-400">
                          Device
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {selectedTransaction.listing?.device_model ||
                            "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase text-slate-400">
                          Category
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {selectedTransaction.listing?.category || "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase text-slate-400">
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
                        <p className="text-xs uppercase text-slate-400">
                          Transaction Status
                        </p>

                        <p className="mt-1 text-sm font-semibold capitalize text-slate-700">
                          {selectedTransaction.status || "-"}
                        </p>
                        {selectedTransaction.has_open_report && (
                          <span className="mt-2 inline-flex rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
                            Open Meetup Report
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRANSACTION PROGRESS */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transaction Progress
                  </p>
                  <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                    {[
                      ["Matched", selectedTransaction.created_at],
                      ["Meetup Scheduled", selectedTransaction.meetup_date && selectedTransaction.meetup_time ? `${selectedTransaction.meetup_date}T${selectedTransaction.meetup_time}` : null],
                      ["Handover / Completed", selectedTransaction.completed_at],
                    ].map(([label, timestamp], index) => {
                      const done = Boolean(timestamp) && (index < 2 || selectedTransaction.status === "completed");
                      return (
                        <div key={label} className="flex items-start gap-3">
                          <div className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                            {done ? "✓" : index + 1}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${done ? "text-slate-700" : "text-slate-400"}`}>{label}</p>
                            <p className="text-xs text-slate-400">{timestamp ? formatDateTime(timestamp) : "Not recorded yet"}</p>
                          </div>
                        </div>
                      );
                    })}
                    {selectedTransaction.status === "cancelled" && (
                      <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                        Cancelled: {selectedTransaction.cancel_reason || "No cancellation reason provided."}
                      </div>
                    )}
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

                {selectedTransaction.has_open_report && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                          Administrator Alert
                        </p>
                        <p className="mt-1 text-sm font-semibold text-red-700">
                          This transaction has an open meetup report.
                        </p>
                      </div>
                      <ShieldAlert size={20} className="shrink-0 text-red-500" />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-red-600">
                      Automatic completion remains blocked while the report is open. Resolve the report only after reviewing the submitted information.
                    </p>
                  </div>
                )}

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
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <button
                      onClick={handleResolve}
                    disabled={assigning}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <CheckCircle2 size={16} />

                    {assigning ? "Resolving..." : "Mark Review as Resolved"}
                    </button>
                    <button
                      onClick={handleEscalate}
                      disabled={assigning}
                      className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <AlertTriangle size={16} />
                      {assigning ? "Updating..." : "Escalate"}
                    </button>
                  </div>
                )}

                {getReviewStatus(selectedTransaction) === "escalated" && (
                  <div className="space-y-3">
                    
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={assigning}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <CheckCircle2 size={16} />
                      {assigning ? "Resolving..." : "Mark Escalated Review as Resolved"}
                    </button>
                  </div>
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