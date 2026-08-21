import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Wifi,
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Users,
  MapPinned,
  Server,
  Cpu,
  RefreshCcw,
  Package,
  XCircle,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}
  >
    {children}
  </div>
);

const SystemHealth = () => {
  /* =========================================================
     STATE
  ========================================================= */

  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dropOffPoints, setDropOffPoints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dbResponseTime, setDbResponseTime] = useState(null);
  const [databaseStatus, setDatabaseStatus] = useState("Checking...");
  const [databaseError, setDatabaseError] = useState(null);

  const [lastUpdated, setLastUpdated] = useState(null);

  /* =========================================================
     LOAD SYSTEM DATA
  ========================================================= */

  const loadSystemHealth = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setDatabaseError(null);

      const startTime = performance.now();

      /*
       * Load the main system data.
       *
       * IMPORTANT:
       * We intentionally DO NOT request listings.updated_at
       * because that column does not exist in your database.
       */
      const [
        usersResult,
        listingsResult,
        transactionsResult,
        dropOffResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, role, is_verified, created_at"),

        supabase
          .from("listings")
          .select(
            "id, seller_id, device_model, category, status, barangay, created_at"
          ),

        supabase
          .from("transactions")
          .select(
            `
              id,
              seller_id,
              harvester_id,
              listing_id,
              amount,
              status,
              barangay,
              created_at
            `
          ),

        supabase
          .from("drop_off_points")
          .select(
            "id, barangay, city, partner, operating_hours, is_active"
          ),
      ]);

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      setDbResponseTime(responseTime);

      if (usersResult.error) {
        throw new Error(
          `Unable to load users: ${usersResult.error.message}`
        );
      }

      if (listingsResult.error) {
        throw new Error(
          `Unable to load listings: ${listingsResult.error.message}`
        );
      }

      if (transactionsResult.error) {
        throw new Error(
          `Unable to load transactions: ${transactionsResult.error.message}`
        );
      }

      if (dropOffResult.error) {
        /*
         * If your drop_off_points table does not exist,
         * the rest of the system can still work.
         */
        console.warn(
          "Drop-off points could not be loaded:",
          dropOffResult.error.message
        );
      }

      setUsers(usersResult.data || []);
      setListings(listingsResult.data || []);
      setTransactions(transactionsResult.data || []);
      setDropOffPoints(dropOffResult.data || []);

      setDatabaseStatus("Optimal");
      setLastUpdated(new Date());
    } catch (err) {
      console.error("System health error:", err);

      setDatabaseStatus("Unavailable");
      setDatabaseError(err.message || "Unable to load system data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* =========================================================
     INITIAL LOAD + REALTIME
  ========================================================= */

  useEffect(() => {
    loadSystemHealth();

    const channel = supabase
      .channel("system-health-monitoring")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          loadSystemHealth(true);
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        () => {
          loadSystemHealth(true);
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          loadSystemHealth(true);
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drop_off_points",
        },
        () => {
          loadSystemHealth(true);
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSystemHealth]);

  /* =========================================================
     USER METRICS
  ========================================================= */

  const totalUsers = users.length;

  const verifiedUsers = users.filter(
    (user) => user.is_verified === true
  ).length;

  const verificationRate =
    totalUsers > 0
      ? ((verifiedUsers / totalUsers) * 100).toFixed(1)
      : "0.0";

  /* =========================================================
     TRANSACTION METRICS
  ========================================================= */

  const normalizedTransactions = useMemo(() => {
    return transactions.map((transaction) => ({
      ...transaction,
      normalizedStatus: String(transaction.status || "")
        .trim()
        .toLowerCase(),
    }));
  }, [transactions]);

  const completedTransactions = normalizedTransactions.filter(
    (transaction) => transaction.normalizedStatus === "completed"
  ).length;

  const cancelledTransactions = normalizedTransactions.filter(
    (transaction) =>
      transaction.normalizedStatus === "cancelled" ||
      transaction.normalizedStatus === "canceled"
  ).length;

  const failedTransactions = normalizedTransactions.filter(
    (transaction) => transaction.normalizedStatus === "failed"
  ).length;

  const activeTransactions = normalizedTransactions.filter(
    (transaction) =>
      ![
        "completed",
        "cancelled",
        "canceled",
        "failed",
      ].includes(transaction.normalizedStatus)
  ).length;

  /* =========================================================
     LISTING METRICS
  ========================================================= */

  const activeListings = listings.filter((listing) => {
    const status = String(listing.status || "")
      .trim()
      .toLowerCase();

    return ![
      "sold",
      "completed",
      "cancelled",
      "canceled",
      "donated",
      "processed",
    ].includes(status);
  }).length;

  /* =========================================================
     BARANGAY METRICS
  ========================================================= */

  const barangays = useMemo(() => {
    const uniqueBarangays = new Set();

    listings.forEach((listing) => {
      if (listing.barangay) {
        uniqueBarangays.add(listing.barangay.trim());
      }
    });

    transactions.forEach((transaction) => {
      if (transaction.barangay) {
        uniqueBarangays.add(transaction.barangay.trim());
      }
    });

    dropOffPoints.forEach((point) => {
      if (point.barangay) {
        uniqueBarangays.add(point.barangay.trim());
      }
    });

    return Array.from(uniqueBarangays).sort();
  }, [listings, transactions, dropOffPoints]);

  const activeDropOffPoints = dropOffPoints.filter(
    (point) => point.is_active === true
  ).length;

  /* =========================================================
     BARANGAY ACTIVITY
  ========================================================= */

  const barangayActivity = useMemo(() => {
    return barangays
      .map((barangay) => {
        const listingCount = listings.filter(
          (listing) =>
            String(listing.barangay || "")
              .trim()
              .toLowerCase() === barangay.toLowerCase()
        ).length;

        const transactionCount = transactions.filter(
          (transaction) =>
            String(transaction.barangay || "")
              .trim()
              .toLowerCase() === barangay.toLowerCase()
        ).length;

        const dropOffCount = dropOffPoints.filter(
          (point) =>
            String(point.barangay || "")
              .trim()
              .toLowerCase() === barangay.toLowerCase()
        ).length;

        const activity =
          listingCount + transactionCount + dropOffCount;

        return {
          name: barangay,
          listings: listingCount,
          transactions: transactionCount,
          dropOffs: dropOffCount,
          activity,
        };
      })
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 6);
  }, [barangays, listings, transactions, dropOffPoints]);

  /* =========================================================
     PERFORMANCE
  ========================================================= */

  const responseTimeValue =
    dbResponseTime !== null
      ? `${dbResponseTime} ms`
      : "Checking...";

  const responseWidth = useMemo(() => {
    if (dbResponseTime === null) return "0%";

    /*
     * 0ms = best
     * 500ms+ = poor
     *
     * We convert this into a visual bar.
     */
    const percentage = Math.min(
      100,
      Math.max(10, (dbResponseTime / 500) * 100)
    );

    return `${percentage}%`;
  }, [dbResponseTime]);

  const responseColor =
    dbResponseTime === null
      ? "bg-slate-300"
      : dbResponseTime <= 300
        ? "bg-emerald-500"
        : dbResponseTime <= 500
          ? "bg-amber-500"
          : "bg-red-500";

  /* =========================================================
     HEALTH SCORE
  ========================================================= */

  const healthScore = useMemo(() => {
    if (databaseStatus === "Unavailable") {
      return 0;
    }

    let score = 100;

    /*
     * Database response time
     */
    if (dbResponseTime !== null) {
      if (dbResponseTime > 500) {
        score -= 20;
      } else if (dbResponseTime > 300) {
        score -= 10;
      }
    }

    /*
     * Failed transactions affect operational health,
     * but they do not mean the database is broken.
     */
    if (transactions.length > 0) {
      const failureRate =
        (failedTransactions / transactions.length) * 100;

      if (failureRate > 10) {
        score -= 10;
      } else if (failureRate > 5) {
        score -= 5;
      }
    }

    return Math.max(0, score);
  }, [
    databaseStatus,
    dbResponseTime,
    transactions.length,
    failedTransactions,
  ]);

  /* =========================================================
     SYSTEM ISSUES
  ========================================================= */

  const systemIssues = useMemo(() => {
    const issues = [];

    if (databaseStatus === "Unavailable") {
      issues.push({
        title: "Database connection unavailable",
        subtitle:
          databaseError || "Unable to communicate with Supabase.",
        status: "Critical",
        icon: Database,
        color: "text-red-500",
        bg: "bg-red-50",
      });
    }

    if (dbResponseTime !== null && dbResponseTime > 500) {
      issues.push({
        title: "Slow database response",
        subtitle: `Current response time is ${dbResponseTime} ms.`,
        status: "Warning",
        icon: Clock3,
        color: "text-amber-500",
        bg: "bg-amber-50",
      });
    }

    if (failedTransactions > 0) {
      issues.push({
        title: "Failed transactions detected",
        subtitle: `${failedTransactions} failed transaction${
          failedTransactions !== 1 ? "s" : ""
        } recorded in the database.`,
        status: "Review",
        icon: XCircle,
        color: "text-orange-500",
        bg: "bg-orange-50",
      });
    }

    if (issues.length === 0) {
      issues.push({
        title: "No system issues detected",
        subtitle: "Database and platform data are responding normally.",
        status: "Healthy",
        icon: CheckCircle2,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
      });
    }

    return issues;
  }, [
    databaseStatus,
    databaseError,
    dbResponseTime,
    failedTransactions,
  ]);

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatLastUpdated = () => {
    if (!lastUpdated) return "Not yet updated";

    return lastUpdated.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCcw
            size={32}
            className="animate-spin text-emerald-500"
          />

          <p className="text-sm font-medium">
            Checking system health...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="space-y-5">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-800">
              System Health
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Centralized monitoring dashboard overview
            </p>

            <p className="text-[10px] text-slate-400 mt-1">
              Last updated: {formatLastUpdated()}
            </p>
          </div>

          <button
            onClick={() => loadSystemHealth(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        {/* ERROR */}
        {databaseError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="text-red-500"
            />

            <div>
              <p className="text-sm font-semibold text-red-700">
                System monitoring error
              </p>

              <p className="text-xs text-red-600 mt-1">
                {databaseError}
              </p>
            </div>
          </div>
        )}

        {/* STATUS OVERVIEW */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

          {/* DATABASE */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-500">
                  <Database size={20} />
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    Database Health
                  </p>

                  <h3 className="text-lg font-semibold text-slate-800 mt-1">
                    {databaseStatus}
                  </h3>
                </div>
              </div>

              {databaseStatus === "Optimal" ? (
                <CheckCircle2
                  size={18}
                  className="text-emerald-500"
                />
              ) : (
                <AlertTriangle
                  size={18}
                  className="text-red-500"
                />
              )}
            </div>
          </Card>

          {/* RESPONSE TIME */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-sky-50 text-sky-500">
                  <Wifi size={20} />
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    Database Response
                  </p>

                  <h3 className="text-lg font-semibold text-slate-800 mt-1">
                    {responseTimeValue}
                  </h3>
                </div>
              </div>

              <Activity
                size={18}
                className={
                  dbResponseTime !== null &&
                  dbResponseTime <= 300
                    ? "text-emerald-500"
                    : "text-amber-500"
                }
              />
            </div>
          </Card>

          {/* USERS */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-violet-50 text-violet-500">
                  <Users size={20} />
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    Registered Users
                  </p>

                  <h3 className="text-lg font-semibold text-slate-800 mt-1">
                    {totalUsers.toLocaleString()}
                  </h3>
                </div>
              </div>

              <span className="text-[10px] font-bold text-violet-500">
                {verificationRate}% verified
              </span>
            </div>
          </Card>

          {/* TRANSACTIONS */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-orange-50 text-orange-500">
                  <Activity size={20} />
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    Transactions
                  </p>

                  <h3 className="text-lg font-semibold text-slate-800 mt-1">
                    {transactions.length.toLocaleString()}
                  </h3>
                </div>
              </div>

              <span className="text-[10px] font-bold text-orange-500">
                {activeTransactions} active
              </span>
            </div>
          </Card>
        </div>

        {/* LIVE DATABASE STATUS */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Cpu size={17} className="text-sky-500" />

            <h2 className="text-sm font-semibold text-slate-800">
              Live Performance Metrics
            </h2>
          </div>

          <div className="space-y-5">

            {/* RESPONSE */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-medium">
                  Supabase Database Response
                </p>

                <span className="text-sm font-semibold text-slate-800">
                  {responseTimeValue}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${responseColor}`}
                  style={{ width: responseWidth }}
                />
              </div>
            </div>

            {/* ACTIVE TRANSACTIONS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-medium">
                  Active Transactions
                </p>

                <span className="text-sm font-semibold text-slate-800">
                  {activeTransactions}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{
                    width:
                      transactions.length > 0
                        ? `${Math.min(
                            100,
                            (activeTransactions /
                              transactions.length) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* ACTIVE LISTINGS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-medium">
                  Active Listings
                </p>

                <span className="text-sm font-semibold text-slate-800">
                  {activeListings}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width:
                      listings.length > 0
                        ? `${Math.min(
                            100,
                            (activeListings /
                              listings.length) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* FAILED TRANSACTIONS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-medium">
                  Failed Transactions
                </p>

                <span className="text-sm font-semibold text-slate-800">
                  {failedTransactions}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-400"
                  style={{
                    width:
                      transactions.length > 0
                        ? `${Math.min(
                            100,
                            (failedTransactions /
                              transactions.length) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* SYSTEM ISSUES + BARANGAY */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* SYSTEM ISSUES */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle
                size={16}
                className="text-amber-500"
              />

              <h2 className="text-sm font-semibold text-slate-800">
                Recent System Issues
              </h2>
            </div>

            <div className="space-y-4">
              {systemIssues.map((item, index) => (
                <div
                  key={index}
                  className="border border-slate-100 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}
                    >
                      <item.icon size={16} />
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-800">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-400 mt-1">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-lg ${
                      item.status === "Critical"
                        ? "text-red-600 bg-red-50"
                        : item.status === "Warning"
                          ? "text-amber-600 bg-amber-50"
                          : "text-emerald-600 bg-emerald-50"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* BARANGAY CONNECTIVITY */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPinned
                  size={16}
                  className="text-sky-500"
                />

                <h2 className="text-sm font-semibold text-slate-800">
                  Barangay Platform Activity
                </h2>
              </div>

              <span className="text-[10px] font-bold text-slate-400">
                {barangays.length} barangays
              </span>
            </div>

            <div>
              {barangayActivity.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <MapPinned
                    size={28}
                    className="mx-auto mb-2 opacity-40"
                  />

                  <p className="text-sm">
                    No barangay activity found.
                  </p>
                </div>
              ) : (
                barangayActivity.map((item, index) => (
                  <div
                    key={index}
                    className="px-5 py-4 border-b border-slate-100 last:border-none flex items-center justify-between hover:bg-slate-50 transition-all"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-slate-800">
                        {item.name}
                      </h3>

                      <p className="text-xs text-slate-400 mt-1">
                        {item.listings} listings •{" "}
                        {item.transactions} transactions •{" "}
                        {item.dropOffs} drop-off points
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

                      <span className="text-xs text-emerald-600 font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* DATABASE SUMMARY */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Database
              size={17}
              className="text-violet-500"
            />

            <h2 className="text-sm font-semibold text-slate-800">
              Database Activity Summary
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Users
              </p>

              <p className="text-xl font-black text-slate-800 mt-1">
                {users.length}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Listings
              </p>

              <p className="text-xl font-black text-slate-800 mt-1">
                {listings.length}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Transactions
              </p>

              <p className="text-xl font-black text-slate-800 mt-1">
                {transactions.length}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Drop-off Points
              </p>

              <p className="text-xl font-black text-slate-800 mt-1">
                {activeDropOffPoints}
              </p>
            </div>
          </div>
        </Card>

        {/* FOOTER HEALTH */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">
                Overall Health Score
              </p>

              <h2 className="text-3xl font-semibold text-emerald-700 mt-2">
                {healthScore}%
              </h2>
            </div>

            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">
                Database Status
              </p>

              <h2 className="text-3xl font-semibold text-emerald-700 mt-2">
                {databaseStatus}
              </h2>
            </div>

            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">
                Active Monitoring
              </p>

              <h2 className="text-3xl font-semibold text-emerald-700 mt-2">
                LIVE
              </h2>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemHealth;