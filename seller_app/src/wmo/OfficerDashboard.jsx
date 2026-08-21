import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Activity,
  RefreshCcw,
  MapPin,
  Package,
  CheckCircle,
  Store,
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

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        profilesResult,
        listingsResult,
        transactionsResult,
        dropOffResult,
      ] = await Promise.all([
        // USERS
        supabase.from("profiles").select("id, role, is_verified, created_at"),

        // LISTINGS
        supabase.from("listings").select(`
          id,
          status,
          barangay,
          category,
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

      setUsers(profilesResult.data || []);
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
