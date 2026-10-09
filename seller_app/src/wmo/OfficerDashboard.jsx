import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Activity,
  RefreshCcw,
  MapPin,
  Package,
  CheckCircle,
  Store,
  Leaf,
  Droplets,
  Trees,
  Trash2,
  Filter,
  CalendarDays,
  Info as InfoIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { supabase } from "../supabaseClient";

const OfficerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dropOffPoints, setDropOffPoints] = useState([]);

  // Recovery Metrics / Environmental Analytics filters.
  const [selectedBarangay, setSelectedBarangay] = useState("all");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [currentProfile, setCurrentProfile] = useState(null);

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      // The profile is also used to enforce the coordinator's assigned
      // barangay scope. The profile table remains the source of truth.
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const [
        profilesResult,
        listingsResult,
        transactionsResult,
        dropOffResult,
      ] = await Promise.all([
        // USERS
        supabase.from("profiles").select("id, role, is_verified, created_at, full_name, barangay"),

        // LISTINGS
        supabase.from("listings").select(`
          id,
          status,
          barangay,
          category,
          condition,
          drop_off_point_id,
          created_at
        `),

        // TRANSACTIONS
        supabase
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
          drop_off_point_id,
          cancel_reason,
          updated_at
        `,
          )
          .order("created_at", { ascending: false }),

        // DROP-OFF POINTS
        supabase
          .from("drop_off_points")
          .select(
            `
          id,
          barangay,
          is_active
        `,
          )
          .eq("is_active", true),
      ]);

      // -----------------------------
      // CHECK ERRORS
      // -----------------------------

      if (profilesResult.error) {
        throw new Error(
          `Unable to load users: ${profilesResult.error.message}`,
        );
      }

      if (listingsResult.error) {
        throw new Error(
          `Unable to load listings: ${listingsResult.error.message}`,
        );
      }

      if (transactionsResult.error) {
        throw new Error(
          `Unable to load transactions: ${transactionsResult.error.message}`,
        );
      }

      if (dropOffResult.error) {
        throw new Error(
          `Unable to load drop-off points: ${dropOffResult.error.message}`,
        );
      }

      // -----------------------------
      // SAVE DATA
      // -----------------------------

      const loadedProfiles = profilesResult.data || [];
      const loadedCurrentProfile = currentUserId
        ? loadedProfiles.find((profile) => profile.id === currentUserId) || null
        : null;

      setUsers(loadedProfiles);
      setCurrentProfile(loadedCurrentProfile);
      setListings(listingsResult.data || []);
      setTransactions(transactionsResult.data || []);
      setDropOffPoints(dropOffResult.data || []);

      console.log("Transactions loaded:", transactionsResult.data?.length || 0);
    } catch (err) {
      console.error("Officer dashboard error:", err);

      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel("officer-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => loadDashboard(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        () => loadDashboard(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => loadDashboard(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drop_off_points",
        },
        () => loadDashboard(true),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* =========================================================
     USER METRICS
  ========================================================= */

  const totalUsers = users.length;

  const verifiedShops = users.filter(
    (user) => user.role === "repair_shop" && user.is_verified === true,
  ).length;

  /* =========================================================
   TRANSACTION METRICS
========================================================= */

  // Normalize every transaction status.
  // Example:
  // "Completed" -> "completed"
  // " completed " -> "completed"
  // "CANCELLED" -> "cancelled"
  const normalizedTransactions = useMemo(() => {
    return transactions.map((transaction) => ({
      ...transaction,
      normalizedStatus: String(transaction.status || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_"),
    }));
  }, [transactions]);

  // TOTAL TRANSACTIONS
  const totalTransactions = normalizedTransactions.length;

  // COMPLETED
  const completedTransactions = normalizedTransactions.filter(
    (transaction) => transaction.normalizedStatus === "completed",
  ).length;

  // CANCELLED
  const cancelledTransactions = normalizedTransactions.filter(
    (transaction) =>
      transaction.normalizedStatus === "cancelled" ||
      transaction.normalizedStatus === "canceled",
  ).length;

  // FAILED
  const failedTransactions = normalizedTransactions.filter(
    (transaction) => transaction.normalizedStatus === "failed",
  ).length;

  // ACTIVE / PENDING
  const pendingTransactions = normalizedTransactions.filter((transaction) => {
    const status = transaction.normalizedStatus;

    return !["completed", "cancelled", "canceled", "failed"].includes(status);
  }).length;

  // UNSUCCESSFUL
  const unsuccessfulTransactions = cancelledTransactions + failedTransactions;

  // SUCCESS RATE
  const successRate =
    totalTransactions > 0
      ? ((completedTransactions / totalTransactions) * 100).toFixed(1)
      : "0.0";

  // COMPLETED TRANSACTION VALUE
  const completedTransactionValue = normalizedTransactions
    .filter((transaction) => transaction.normalizedStatus === "completed")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

  // TOTAL TRANSACTION VALUE
  const totalTransactionValue = normalizedTransactions.reduce(
    (total, transaction) => total + Number(transaction.amount || 0),
    0,
  );

  /* =========================================================
     LISTING METRICS
  ========================================================= */

  const totalListings = listings.length;

  const activeListings = listings.filter((listing) => {
    const status = String(listing.status || "").toLowerCase();

    return ![
      "completed",
      "cancelled",
      "canceled",
      "donated",
      "processed",
    ].includes(status);
  }).length;

  const completedListings = listings.filter((listing) => {
    const status = String(listing.status || "").toLowerCase();

    return status === "completed" || status === "processed";
  }).length;

  const cancelledListings = listings.filter((listing) => {
    const status = String(listing.status || "").toLowerCase();

    return status === "cancelled" || status === "canceled";
  }).length;

  const underNegotiationListings = listings.filter((listing) => {
    const status = String(listing.status || "").toLowerCase();

    return [
      "negotiating",
      "negotiation",
      "pending",
      "reserved",
      "offer",
      "under_negotiation",
    ].includes(status);
  }).length;

  /* =========================================================
     BARANGAY METRICS
  ========================================================= */

  const activeBarangays = useMemo(() => {
    const barangays = new Set();

    listings.forEach((listing) => {
      const status = String(listing.status || "").toLowerCase();

      if (listing.barangay && !["cancelled", "canceled"].includes(status)) {
        barangays.add(listing.barangay.trim());
      }
    });

    transactions.forEach((transaction) => {
      if (transaction.barangay) {
        barangays.add(transaction.barangay.trim());
      }
    });

    return barangays;
  }, [listings, transactions]);

  const activeBarangayCount = activeBarangays.size;

  const totalBarangayCoverage = useMemo(() => {
    const barangays = new Set();

    dropOffPoints.forEach((point) => {
      if (point.barangay) {
        barangays.add(point.barangay.trim());
      }
    });

    listings.forEach((listing) => {
      if (listing.barangay) {
        barangays.add(listing.barangay.trim());
      }
    });

    transactions.forEach((transaction) => {
      if (transaction.barangay) {
        barangays.add(transaction.barangay.trim());
      }
    });

    return barangays.size;
  }, [dropOffPoints, listings, transactions]);

  /* =========================================================
     MONTHLY ACTIVITY
  ========================================================= */

  const activityData = useMemo(() => {
    const now = new Date();

    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

      months.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        month: date.toLocaleString("en-US", {
          month: "short",
        }),
        listings: 0,
        transactions: 0,
        users: 0,
      });
    }

    listings.forEach((listing) => {
      if (!listing.created_at) return;

      const date = new Date(listing.created_at);

      const item = months.find(
        (month) => month.key === `${date.getFullYear()}-${date.getMonth()}`,
      );

      if (item) {
        item.listings++;
      }
    });

    transactions.forEach((transaction) => {
      if (!transaction.created_at) return;

      const date = new Date(transaction.created_at);

      const item = months.find(
        (month) => month.key === `${date.getFullYear()}-${date.getMonth()}`,
      );

      if (item) {
        item.transactions++;
      }
    });

    users.forEach((user) => {
      if (!user.created_at) return;

      const date = new Date(user.created_at);

      const item = months.find(
        (month) => month.key === `${date.getFullYear()}-${date.getMonth()}`,
      );

      if (item) {
        item.users++;
      }
    });

    return months;
  }, [listings, transactions, users]);

  /* =========================================================
     MONTH-OVER-MONTH CHANGE
  ========================================================= */

  const getGrowth = (data, field) => {
    if (data.length < 2) return "0%";

    const current = data[data.length - 1][field];
    const previous = data[data.length - 2][field];

    if (previous === 0) {
      return current > 0 ? "+100%" : "0%";
    }

    const growth = ((current - previous) / previous) * 100;

    return `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`;
  };

  const listingGrowth = getGrowth(activityData, "listings");
  const transactionGrowth = getGrowth(activityData, "transactions");
  const userGrowth = getGrowth(activityData, "users");

  /* =========================================================
     LISTING DISTRIBUTION
  ========================================================= */

  const listingDistribution = [
    {
      label: "Active Listings",
      value: activeListings,
      color: "bg-emerald-500",
    },
    {
      label: "Under Negotiation",
      value: underNegotiationListings,
      color: "bg-sky-500",
    },
    {
      label: "Completed / Processed",
      value: completedListings,
      color: "bg-violet-500",
    },
    {
      label: "Cancelled",
      value: cancelledListings,
      color: "bg-red-400",
    },
  ];

  const distributionTotal =
    listingDistribution.reduce((sum, item) => sum + item.value, 0) ||
    totalListings;

  /* =========================================================
     RECOVERY METRICS / ENVIRONMENTAL ANALYTICS
  ========================================================= */

  // Keep the same environmental basis used by the EnvironmentalImpact
  // component: 4.2 kg CO₂ saved for every completed recovery device.
  const CO2_PER_RECOVERED_DEVICE = 4.2;
  const ENERGY_PER_RECOVERED_DEVICE = 78;
  const WATER_PER_RECOVERED_DEVICE = 3800;
  const WEIGHT_PER_RECOVERED_DEVICE = 2.3;

  const normalizedProfileRole = String(currentProfile?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const isBarangayCoordinator = [
    "barangay_coordinator",
    "coordinator",
    "barangaycoord",
  ].includes(normalizedProfileRole);

  const assignedBarangay = String(currentProfile?.barangay || "").trim();

  const recoveryBarangays = useMemo(() => {
    const values = new Set();

    listings.forEach((listing) => {
      if (listing.barangay) values.add(String(listing.barangay).trim());
    });

    transactions.forEach((transaction) => {
      if (transaction.barangay) values.add(String(transaction.barangay).trim());
    });

    dropOffPoints.forEach((point) => {
      if (point.barangay) values.add(String(point.barangay).trim());
    });

    return Array.from(values).filter(Boolean).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [listings, transactions, dropOffPoints]);

  // A coordinator cannot broaden the scope beyond the barangay stored on
  // their profile. WMO/environment officers retain the All Barangays view.
  useEffect(() => {
    if (isBarangayCoordinator && assignedBarangay) {
      setSelectedBarangay(assignedBarangay);
    }
  }, [isBarangayCoordinator, assignedBarangay]);

  const effectiveRecoveryBarangay = isBarangayCoordinator
    ? (assignedBarangay || "__unassigned_coordinator__")
    : selectedBarangay;

  const recoveryDateInRange = (dateValue) => {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;

    if (selectedStartDate) {
      const start = new Date(`${selectedStartDate}T00:00:00`);
      if (date < start) return false;
    }

    if (selectedEndDate) {
      const end = new Date(`${selectedEndDate}T23:59:59.999`);
      if (date > end) return false;
    }

    return true;
  };

  const recoveryData = useMemo(() => {
    const barangayMatches = (barangay) => {
      if (!effectiveRecoveryBarangay || effectiveRecoveryBarangay === "all") {
        return true;
      }

      return (
        String(barangay || "").trim().toLowerCase() ===
        String(effectiveRecoveryBarangay).trim().toLowerCase()
      );
    };

    const completed = normalizedTransactions.filter((transaction) => {
      if (transaction.normalizedStatus !== "completed") return false;
      if (!barangayMatches(transaction.barangay)) return false;
      return recoveryDateInRange(transaction.created_at);
    });

    const donated = listings.filter((listing) => {
      const status = String(listing.status || "").trim().toLowerCase();
      if (status !== "donated") return false;
      if (!barangayMatches(listing.barangay)) return false;
      return recoveryDateInRange(listing.created_at);
    });

    const filteredDropOffPoints = dropOffPoints.filter((point) =>
      barangayMatches(point.barangay),
    );

    const usedDropOffIds = new Set();
    const dropOffUsage = {};

    donated.forEach((listing) => {
      if (!listing.drop_off_point_id) return;
      usedDropOffIds.add(listing.drop_off_point_id);
      dropOffUsage[listing.drop_off_point_id] =
        (dropOffUsage[listing.drop_off_point_id] || 0) + 1;
    });

    completed.forEach((transaction) => {
      if (!transaction.drop_off_point_id) return;
      usedDropOffIds.add(transaction.drop_off_point_id);
      dropOffUsage[transaction.drop_off_point_id] =
        (dropOffUsage[transaction.drop_off_point_id] || 0) + 1;
    });

    const recoveredDevices = completed.length;
    const co2Saved = recoveredDevices * CO2_PER_RECOVERED_DEVICE;
    const energySaved = recoveredDevices * ENERGY_PER_RECOVERED_DEVICE;
    const waterSaved = recoveredDevices * WATER_PER_RECOVERED_DEVICE;
    const weightDiverted = recoveredDevices * WEIGHT_PER_RECOVERED_DEVICE;

    const barangayMap = {};
    completed.forEach((transaction) => {
      const barangay = String(transaction.barangay || "Unassigned").trim() || "Unassigned";
      if (!barangayMap[barangay]) {
        barangayMap[barangay] = { barangay, recovered: 0, co2: 0 };
      }
      barangayMap[barangay].recovered += 1;
      barangayMap[barangay].co2 += CO2_PER_RECOVERED_DEVICE;
    });

    return {
      completed,
      donated,
      filteredDropOffPoints,
      usedDropOffIds,
      dropOffUsage,
      recoveredDevices,
      co2Saved,
      energySaved,
      waterSaved,
      weightDiverted,
      barangayBreakdown: Object.values(barangayMap).sort(
        (a, b) => b.recovered - a.recovered,
      ),
    };
  }, [
    normalizedTransactions,
    listings,
    dropOffPoints,
    effectiveRecoveryBarangay,
    selectedStartDate,
    selectedEndDate,
  ]);

  const recoveryIsEmpty = recoveryData.recoveredDevices === 0 &&
    recoveryData.donated.length === 0;

  /* =========================================================
     UI
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={35} className="animate-spin text-emerald-500" />
          <p className="text-sm font-medium">Loading officer dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] font-sans">
      <main className="flex-1 p-8 overflow-y-auto">
        {/* HEADER */}
        <div className="mb-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              System Overview
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Centralized monitoring dashboard for Valenzuela City E-waste
              Platform
            </p>
          </div>

          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-60"
          >
            <RefreshCcw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 mt-0.5" />

            <div>
              <p className="font-semibold text-red-700">Dashboard data error</p>

              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          <StatCard
            icon={Users}
            label="Total Platform Users"
            value={totalUsers.toLocaleString()}
            trend={userGrowth}
            color="text-emerald-500"
          />

          <StatCard
            icon={Activity}
            label="Active Transactions"
            value={pendingTransactions.toLocaleString()}
            trend={transactionGrowth}
            color="text-emerald-500"
          />

          <StatCard
            icon={RefreshCcw}
            label="Completed Transactions"
            value={completedTransactions.toLocaleString()}
            trend={`${successRate}% success`}
            color="text-blue-500"
          />

          <StatCard
            icon={MapPin}
            label="Active Barangays"
            value={`${activeBarangayCount}/${totalBarangayCoverage || activeBarangayCount}`}
            trend={
              totalBarangayCoverage > 0
                ? `${Math.round(
                    (activeBarangayCount / totalBarangayCoverage) * 100,
                  )}%`
                : "0%"
            }
            color="text-blue-500"
          />
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          <SummaryCard
            icon={Package}
            title="Total Listings"
            value={totalListings}
            sub={`${listingGrowth} vs previous month`}
            bg="from-sky-500 to-blue-600"
          />

          <SummaryCard
            icon={CheckCircle}
            title="Completed Deals"
            value={completedTransactions}
            sub={`${successRate}% transaction success rate`}
            bg="from-emerald-500 to-green-600"
          />

          <SummaryCard
            icon={Users}
            title="Active Users"
            value={totalUsers}
            sub="Registered platform users"
            bg="from-fuchsia-500 to-violet-600"
          />

          <SummaryCard
            icon={Store}
            title="Verified Shops"
            value={verifiedShops}
            sub="Verified repair shops"
            bg="from-orange-500 to-red-500"
          />
        </div>

        {/* TRANSACTION METRICS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Transaction Dashboard
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Current transaction activity and status overview
              </p>
            </div>

            <div className="text-xs text-slate-500">
              Total value:
              <span className="font-bold text-slate-800 ml-1">
                ₱{totalTransactionValue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {/* TOTAL */}
            <MetricCard
              label="Total Transactions"
              value={totalTransactions}
              trend={`${transactionGrowth} this month`}
              color="text-slate-700"
            />

            {/* ACTIVE */}
            <MetricCard
              label="Active / Pending"
              value={pendingTransactions}
              trend="Currently active"
              color="text-blue-500"
            />

            {/* COMPLETED */}
            <MetricCard
              label="Completed"
              value={completedTransactions}
              trend={`₱${completedTransactionValue.toLocaleString()}`}
              color="text-emerald-500"
            />

            {/* CANCELLED */}
            <MetricCard
              label="Cancelled"
              value={cancelledTransactions}
              trend="Cancelled transactions"
              color="text-orange-500"
            />

            {/* FAILED */}
            <MetricCard
              label="Failed"
              value={failedTransactions}
              trend={`${successRate}% success rate`}
              color="text-red-500"
            />
          </div>

          {/* STATUS BREAKDOWN */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-700">
                Transaction Status Breakdown
              </h4>

              <span className="text-xs text-slate-400">
                {totalTransactions} total
              </span>
            </div>

            <div className="space-y-4">
              {/* ACTIVE */}
              <TransactionStatusBar
                label="Active / Pending"
                value={pendingTransactions}
                total={totalTransactions}
                color="bg-blue-500"
              />

              {/* COMPLETED */}
              <TransactionStatusBar
                label="Completed"
                value={completedTransactions}
                total={totalTransactions}
                color="bg-emerald-500"
              />

              {/* CANCELLED */}
              <TransactionStatusBar
                label="Cancelled"
                value={cancelledTransactions}
                total={totalTransactions}
                color="bg-orange-500"
              />

              {/* FAILED */}
              <TransactionStatusBar
                label="Failed"
                value={failedTransactions}
                total={totalTransactions}
                color="bg-red-500"
              />
            </div>
          </div>
        </div>

        {/* ACTIVITY CHART */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Platform Activity Trend
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Actual activity recorded during the last 6 months
              </p>
            </div>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                <XAxis dataKey="month" tick={{ fontSize: 12 }} />

                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="listings"
                  name="Listings Created"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="transactions"
                  name="Transactions"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="users"
                  name="New Users"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECOVERY METRICS / ENVIRONMENTAL ANALYTICS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Leaf size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Recovery Metrics & Environmental Analytics
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {isBarangayCoordinator && assignedBarangay
                      ? `Assigned barangay: ${assignedBarangay}`
                      : "Platform-wide recovery performance and environmental impact"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Filter size={15} className="text-slate-400" />
                <select
                  value={effectiveRecoveryBarangay || "all"}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  disabled={isBarangayCoordinator}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label="Filter recovery metrics by barangay"
                >
                  {!isBarangayCoordinator && <option value="all">All Barangays</option>}
                  {recoveryBarangays.map((barangay) => (
                    <option key={barangay} value={barangay}>{barangay}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <CalendarDays size={15} className="text-slate-400" />
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                  aria-label="Recovery metrics start date"
                />
              </label>

              <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <CalendarDays size={15} className="text-slate-400" />
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                  aria-label="Recovery metrics end date"
                />
              </label>

              {(selectedBarangay !== "all" || selectedStartDate || selectedEndDate) && !isBarangayCoordinator && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBarangay("all");
                    setSelectedStartDate("");
                    setSelectedEndDate("");
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {isBarangayCoordinator && !assignedBarangay && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              No barangay is assigned to this coordinator profile. Recovery metrics are therefore not displayed until an assigned barangay is available.
            </div>
          )}

          {recoveryIsEmpty ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Leaf size={30} className="mx-auto text-slate-300" />
              <h4 className="mt-3 text-sm font-bold text-slate-700">
                No recovery data available
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                There is no completed recovery or donation activity for the selected filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <MetricCard
                  label="Recovered Devices"
                  value={recoveryData.recoveredDevices}
                  trend="Completed recovery"
                  color="text-emerald-600"
                />
                <MetricCard
                  label="CO₂ Savings"
                  value={`${recoveryData.co2Saved.toFixed(2)} kg`}
                  trend="4.2 kg/device"
                  color="text-emerald-600"
                />
                <MetricCard
                  label="Energy Saved"
                  value={`${recoveryData.energySaved.toLocaleString()} kWh`}
                  trend="Estimated"
                  color="text-amber-600"
                />
                <MetricCard
                  label="Water Saved"
                  value={`${recoveryData.waterSaved.toLocaleString()} L`}
                  trend="Estimated"
                  color="text-blue-600"
                />
                <MetricCard
                  label="Landfill Diversion"
                  value={`${recoveryData.weightDiverted.toFixed(1)} kg`}
                  trend="Estimated"
                  color="text-violet-600"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                      <Leaf size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">Environmental Impact</p>
                      <p className="text-xs text-emerald-600 mt-1">CO₂ savings from completed recoveries</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-800 mt-4">{recoveryData.co2Saved.toFixed(2)} kg</p>
                  <p className="text-xs text-slate-500 mt-1">CO₂e estimated savings</p>
                </div>

                <div className="rounded-2xl bg-sky-50 border border-sky-100 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                      <Droplets size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-sky-700">Water Conservation</p>
                      <p className="text-xs text-sky-600 mt-1">Estimated freshwater savings</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-800 mt-4">{recoveryData.waterSaved.toLocaleString()} L</p>
                  <p className="text-xs text-slate-500 mt-1">Based on completed recovery devices</p>
                </div>

                <div className="rounded-2xl bg-violet-50 border border-violet-100 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center">
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-violet-700">Donation Activity</p>
                      <p className="text-xs text-violet-600 mt-1">Devices marked as donated</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-800 mt-4">{recoveryData.donated.length.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">Within the selected filters</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                <div className="border border-slate-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Recovery by Barangay</h4>
                      <p className="text-xs text-slate-500 mt-1">Completed recovery and CO₂ contribution</p>
                    </div>
                    <Trees size={18} className="text-emerald-500" />
                  </div>
                  {recoveryData.barangayBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 py-5">No completed recovery data for this filter.</p>
                  ) : (
                    <div className="space-y-4">
                      {recoveryData.barangayBreakdown.slice(0, 8).map((item) => {
                        const max = recoveryData.barangayBreakdown[0]?.recovered || 1;
                        const width = (item.recovered / max) * 100;
                        return (
                          <div key={item.barangay}>
                            <div className="flex justify-between text-xs mb-2">
                              <span className="font-semibold text-slate-600">{item.barangay}</span>
                              <span className="font-bold text-slate-700">{item.recovered} · {item.co2.toFixed(1)} kg CO₂</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(width, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border border-slate-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Drop-off Utilization</h4>
                      <p className="text-xs text-slate-500 mt-1">Recovery and donation activity recorded per active point</p>
                    </div>
                    <MapPin size={18} className="text-sky-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Active Points</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{recoveryData.filteredDropOffPoints.length}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Utilized Points</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{recoveryData.usedDropOffIds.size}</p>
                    </div>
                  </div>

                  {recoveryData.filteredDropOffPoints.length === 0 ? (
                    <p className="text-xs text-slate-400">No active drop-off points for the selected barangay.</p>
                  ) : (
                    <div className="space-y-3">
                      {recoveryData.filteredDropOffPoints.map((point) => (
                        <div key={point.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Drop-off point {String(point.id).slice(0, 8)}</p>
                            <p className="text-[10px] text-slate-400">{point.barangay || "Barangay not set"}</p>
                          </div>
                          <span className="text-xs font-bold text-slate-600">{recoveryData.dropOffUsage[point.id] || 0} activities</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
                <InfoIcon size={18} className="text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Recovery calculation basis</p>
                  <p className="text-xs text-slate-500 mt-1">
                    CO₂ savings use 4.2 kg/device, energy 78 kWh/device, water 3,800 L/device, and landfill diversion 2.3 kg/device, matching the Environmental Impact dashboard.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>


        {/* LISTING STATUS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-6">
            Listing Status Distribution
          </h3>

          <div className="space-y-5">
            {listingDistribution.map((item) => {
              const percentage =
                distributionTotal > 0
                  ? (item.value / distributionTotal) * 100
                  : 0;

              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-medium mb-2 text-slate-600">
                    <span>{item.label}</span>

                    <span>{item.value.toLocaleString()}</span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full transition-all`}
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <Activity size={18} className="text-blue-500" />

            <p className="text-sm text-blue-700 font-medium">
              Total platform activity:
              <span className="font-bold ml-1">
                {totalListings.toLocaleString()} listings
              </span>{" "}
              currently recorded in the system.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

/* =========================================================
   COMPONENTS
========================================================= */

const StatCard = ({ icon: Icon, label, value, trend, color }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
        <Icon size={20} />
      </div>

      <span className={`text-xs font-bold ${color}`}>{trend}</span>
    </div>

    <p className="text-xs font-medium text-slate-500">{label}</p>

    <h2 className="text-2xl font-bold text-slate-800 mt-1">{value}</h2>
  </div>
);

const SummaryCard = ({ icon: Icon, title, value, sub, bg }) => (
  <div
    className={`bg-gradient-to-br ${bg} rounded-2xl p-6 text-white relative overflow-hidden shadow-lg`}
  >
    <div className="relative z-10">
      <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-5">
        <Icon size={22} />
      </div>

      <p className="text-xs uppercase tracking-widest opacity-80">{title}</p>

      <h2 className="text-4xl font-bold mt-1">{value.toLocaleString()}</h2>

      <p className="text-xs mt-2 opacity-80">{sub}</p>
    </div>

    <Icon size={90} className="absolute -bottom-5 -right-5 opacity-10" />
  </div>
);
const TransactionStatusBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>

        <span className="text-xs font-bold text-slate-700">
          {value.toLocaleString()}
          <span className="text-slate-400 font-medium ml-1">
            ({percentage.toFixed(1)}%)
          </span>
        </span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{
            width: `${Math.min(percentage, 100)}%`,
          }}
        />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, trend, color }) => (
  <div className="border border-slate-100 rounded-xl p-4">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>

        <h2 className="text-2xl font-bold text-slate-800 mt-2">
          {typeof value === "number" ? value.toLocaleString() : value}
        </h2>
      </div>

      <span className={`text-xs font-bold ${color}`}>{trend}</span>
    </div>
  </div>
);

export default OfficerDashboard;
