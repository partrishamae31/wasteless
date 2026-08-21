import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Activity,
  RefreshCcw,
  Clock,
  ShieldAlert,
  Store,
  Hammer,
  UserCheck,
  Loader2,
  AlertCircle,
  Package,
  CheckCircle,
  XCircle,
  MapPin,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const UserActivity = () => {
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadActivity = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [usersResult, listingsResult, transactionsResult] =
        await Promise.all([
          /* =========================
         USERS
      ========================= */
          supabase
            .from("profiles")
            .select(
              `
          id,
          role,
          is_verified,
          created_at
        `,
            )
            .order("created_at", { ascending: false }),

          /* =========================
         LISTINGS
      ========================= */
          supabase
            .from("listings")
            .select(
              `
          id,
          seller_id,
          device_model,
          category,
          status,
          barangay,
          created_at
        `,
            )
            .order("created_at", { ascending: false }),

          /* =========================
         TRANSACTIONS
      ========================= */
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
          created_at,
          listings (
            device_model,
            category,
            barangay
          )
        `,
            )
            .order("created_at", { ascending: false }),
        ]);

      /* =========================
       ERROR CHECKING
    ========================= */

      if (usersResult.error) {
        throw new Error(`Unable to load users: ${usersResult.error.message}`);
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

      /* =========================
       SAVE DATA
    ========================= */

      setUsers(usersResult.data || []);
      setListings(listingsResult.data || []);
      setTransactions(transactionsResult.data || []);
    } catch (err) {
      console.error("User activity error:", err);

      setError(err.message || "Unable to load user activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =========================================================
     INITIAL LOAD + REALTIME
  ========================================================= */

  useEffect(() => {
    loadActivity();

    const channel = supabase
      .channel("officer-user-activity")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => loadActivity(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        () => loadActivity(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => loadActivity(true),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* =========================================================
     GENERAL USER METRICS
  ========================================================= */

  const totalUsers = users.length;

  const verifiedUsers = users.filter(
    (user) => user.is_verified === true,
  ).length;

  const pendingUsers = users.filter((user) => user.is_verified !== true).length;

  const verificationRate =
    totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : "0.0";

  /* =========================================================
     ROLE HELPERS
  ========================================================= */

  const normalizeRole = (role) => {
    return String(role || "")
      .trim()
      .toLowerCase();
  };

  const sellers = useMemo(
    () => users.filter((user) => normalizeRole(user.role) === "seller"),
    [users],
  );

  const repairShops = useMemo(
    () => users.filter((user) => normalizeRole(user.role) === "repair_shop"),
    [users],
  );

  const harvesters = useMemo(
    () =>
      users.filter(
        (user) =>
          normalizeRole(user.role) === "harvester" ||
          normalizeRole(user.role) === "tech_harvester",
      ),
    [users],
  );

  /* =========================================================
     ROLE STATISTICS
  ========================================================= */

  const getRoleStats = (roleUsers) => {
    const total = roleUsers.length;

    const verified = roleUsers.filter(
      (user) => user.is_verified === true,
    ).length;

    const pending = roleUsers.filter(
      (user) => user.is_verified !== true,
    ).length;

    // Your supplied profile query does not show a suspension field.
    // Therefore we don't invent a suspended count.
    const suspended = 0;

    return {
      total,
      verified,
      pending,
      suspended,
    };
  };

  const sellerStats = getRoleStats(sellers);
  const repairShopStats = getRoleStats(repairShops);
  const harvesterStats = getRoleStats(harvesters);

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

  const activeTransactions = normalizedTransactions.filter(
    (transaction) =>
      !["completed", "cancelled", "canceled", "failed"].includes(
        transaction.normalizedStatus,
      ),
  ).length;

  const completedTransactions = normalizedTransactions.filter(
    (transaction) => transaction.normalizedStatus === "completed",
  ).length;

  const cancelledTransactions = normalizedTransactions.filter(
    (transaction) =>
      transaction.normalizedStatus === "cancelled" ||
      transaction.normalizedStatus === "canceled",
  ).length;

  /* =========================================================
     RECENT USER ACTIVITY
  ========================================================= */

  const recentActivity = useMemo(() => {
    const activities = [];

    /* -------------------------
       LISTING ACTIVITY
    ------------------------- */

    listings.forEach((listing) => {
      const seller = users.find((user) => user.id === listing.seller_id);

      const device = listing.device_model || listing.category || "Device";

      activities.push({
        id: `listing-${listing.id}`,
        userId: listing.seller_id,
        name: getUserDisplayName(seller),
        role: "Seller",
        action: `Created new listing: ${device}`,
        timestamp: listing.created_at,
        status: "New",
        type: "listing",
      });
    });

    /* -------------------------
       TRANSACTION ACTIVITY
    ------------------------- */

    transactions.forEach((transaction) => {
      const status = String(transaction.status || "")
        .trim()
        .toLowerCase();

      const seller = users.find((user) => user.id === transaction.seller_id);

      const harvester = users.find(
        (user) => user.id === transaction.harvester_id,
      );

      const device =
        transaction.listings?.device_model ||
        transaction.listings?.category ||
        "Device";

      /*
       * Completed transaction is primarily associated
       * with the harvester.
       */
      const user =
        status === "completed" ? harvester || seller : seller || harvester;

      let action = "Transaction updated";
      let activityStatus = "Active";

      if (status === "completed") {
        action = `Completed transaction: ${device}`;
        activityStatus = "Success";
      } else if (status === "cancelled" || status === "canceled") {
        action = `Cancelled transaction: ${device}`;
        activityStatus = "Cancelled";
      } else if (status === "failed") {
        action = `Failed transaction: ${device}`;
        activityStatus = "Failed";
      } else {
        action = `Transaction activity: ${device}`;
        activityStatus = "Active";
      }

      activities.push({
        id: `transaction-${transaction.id}`,
        userId: user?.id,
        name: getUserDisplayName(user),
        role:
          status === "completed" ? "Tech Harvester" : getRoleLabel(user?.role),
        action,
        timestamp: transaction.created_at,
        status: activityStatus,
        type: "transaction",
      });
    });

    return activities
      .filter((item) => item.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [listings, transactions, users]);

  /* =========================================================
     SUSPICIOUS ACTIVITY
  ========================================================= */

  /*
   * These are DATA-DRIVEN alerts.
   * They are not hardcoded users.
   */

  const suspiciousActivities = useMemo(() => {
    const alerts = [];

    /* -------------------------
       MANY CANCELLED TRANSACTIONS
    ------------------------- */

    const cancelledByUser = {};

    normalizedTransactions
      .filter(
        (transaction) =>
          transaction.normalizedStatus === "cancelled" ||
          transaction.normalizedStatus === "canceled",
      )
      .forEach((transaction) => {
        const userId = transaction.seller_id;

        if (!userId) return;

        cancelledByUser[userId] = (cancelledByUser[userId] || 0) + 1;
      });

    Object.entries(cancelledByUser).forEach(([userId, count]) => {
      if (count >= 3) {
        const user = users.find((item) => item.id === userId);

        alerts.push({
          id: userId,
          type: "High Activity",
          desc: `${count} cancelled transactions`,
          color: "bg-red-500",
        });
      }
    });

    /* -------------------------
       MANY FAILED TRANSACTIONS
    ------------------------- */

    const failedByUser = {};

    normalizedTransactions
      .filter((transaction) => transaction.normalizedStatus === "failed")
      .forEach((transaction) => {
        const userId = transaction.seller_id || transaction.harvester_id;

        if (!userId) return;

        failedByUser[userId] = (failedByUser[userId] || 0) + 1;
      });

    Object.entries(failedByUser).forEach(([userId, count]) => {
      if (count >= 3) {
        const user = users.find((item) => item.id === userId);

        alerts.push({
          id: userId,
          type: "Transaction Risk",
          desc: `${count} failed transactions`,
          color: "bg-orange-500",
        });
      }
    });

    return alerts.slice(0, 5);
  }, [normalizedTransactions, users]);

  /* =========================================================
     FORMATTERS
  ========================================================= */

  function getUserDisplayName(user) {
    if (!user) return "Unknown User";

    /*
     * Your current profiles query does not include
     * first_name/last_name, so use a shortened ID.
     */
    return `User #${String(user.id || "").slice(0, 8)}`;
  }

  function getRoleLabel(role) {
    const normalized = normalizeRole(role);

    if (normalized === "seller") return "Seller";
    if (normalized === "repair_shop") return "Repair Shop";
    if (normalized === "harvester" || normalized === "tech_harvester") {
      return "Tech Harvester";
    }

    return role || "User";
  }

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Unknown time";

    const date = new Date(dateString);
    const now = new Date();

    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) {
      return `${Math.max(diffSeconds, 1)} sec ago`;
    }

    const minutes = Math.floor(diffSeconds / 60);

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} hr ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }

    return date.toLocaleDateString();
  };
  /* =========================================================
     BARANGAY COUNT
  ========================================================= */

  function getBarangayCount() {
    const barangays = new Set();

    listings.forEach((listing) => {
      if (listing.barangay) {
        barangays.add(listing.barangay.trim());
      }
    });

    transactions.forEach((transaction) => {
      const barangay = transaction.barangay || transaction.listings?.barangay;

      if (barangay) {
        barangays.add(barangay.trim());
      }
    });

    return barangays.size;
  }

  /* =========================================================
     MINI STAT
  ========================================================= */

  const MiniStat = ({ icon: Icon, label, value, trend, color }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex-1">
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
          <Icon size={18} />
        </div>

        <span className={`text-[10px] font-bold ${color}`}>{trend}</span>
      </div>

      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        {label}
      </p>

      <h3 className="text-lg font-black text-slate-800">{value}</h3>
    </div>
  );

  /* =========================================================
     ROLE STAT BAR
  ========================================================= */

  const RoleStatBar = ({
    icon: Icon,
    role,
    total,
    verified,
    pending,
    suspended,
  }) => (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-400" />

          <span className="text-xs font-bold text-slate-700">{role}</span>
        </div>

        <span className="text-xs font-black text-slate-800">
          {total.toLocaleString()}
        </span>
      </div>

      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
          <p className="text-[9px] font-bold text-emerald-600 uppercase">
            Verified
          </p>

          <p className="text-sm font-black text-emerald-700">{verified}</p>
        </div>

        <div className="bg-orange-50/50 p-2 rounded-lg border border-orange-100">
          <p className="text-[9px] font-bold text-orange-600 uppercase">
            Pending
          </p>

          <p className="text-sm font-black text-orange-700">{pending}</p>
        </div>

        <div className="bg-red-50/50 p-2 rounded-lg border border-red-100">
          <p className="text-[9px] font-bold text-red-600 uppercase">
            Suspended
          </p>

          <p className="text-sm font-black text-red-700">{suspended}</p>
        </div>
      </div>
    </div>
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={35} className="animate-spin text-emerald-500" />

          <p className="text-sm font-medium">Loading user activity...</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#F4F7FB] p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            User Activity
          </h1>

          <p className="text-sm text-slate-500 font-medium">
            Centralized monitoring dashboard for Valenzuela City E-waste
            Platform
          </p>
        </div>

        <button
          onClick={() => loadActivity(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-60"
        >
          <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />

          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500" />

          <div>
            <p className="font-semibold text-red-700">
              Unable to load user activity
            </p>

            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* TOP MINI STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat
          icon={Users}
          label="Total Platform Users"
          value={totalUsers.toLocaleString()}
          trend={`${verificationRate}% verified`}
          color="text-emerald-500"
        />

        <MiniStat
          icon={Activity}
          label="Active Transactions"
          value={activeTransactions.toLocaleString()}
          trend={`${completedTransactions} completed`}
          color="text-blue-500"
        />

        <MiniStat
          icon={Package}
          label="Total Listings"
          value={listings.length.toLocaleString()}
          trend="Recorded listings"
          color="text-violet-500"
        />

        <MiniStat
          icon={MapPin}
          label="Registered Barangays"
          value={getBarangayCount().toLocaleString()}
          trend="Across platform"
          color="text-orange-500"
        />
      </div>

      {/* USER STATISTICS BY ROLE */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
          User Statistics by Role
        </h2>

        <div className="space-y-3">
          <RoleStatBar icon={UserCheck} role="Sellers" {...sellerStats} />

          <RoleStatBar icon={Hammer} role="Repair Shops" {...repairShopStats} />

          <RoleStatBar
            icon={Store}
            role="Tech Harvesters"
            {...harvesterStats}
          />
        </div>

        <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
          <Activity size={14} className="text-blue-500" />

          <p className="text-[10px] font-bold text-blue-700">
            Total platform users: {totalUsers.toLocaleString()} / Verification
            rate: <span className="text-blue-500">{verificationRate}%</span>
          </p>
        </div>
      </div>

      {/* RECENT USER ACTIVITY */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Recent User Activity
            </h2>

            <p className="text-[10px] text-slate-400 mt-1">
              Latest platform activity from listings and transactions
            </p>
          </div>

          <Activity size={16} className="text-emerald-500" />
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Activity size={30} className="mx-auto mb-2 opacity-40" />

            <p className="text-sm">No recent activity found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {item.name.replace("User #", "").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {item.name}

                      <span className="text-[9px] font-medium text-slate-400 ml-1">
                        ({item.role})
                      </span>
                    </p>

                    <p className="text-[10px] text-slate-500">{item.action}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 mb-1 flex items-center justify-end gap-1">
                    <Clock size={10} />

                    {formatTimeAgo(item.timestamp)}
                  </p>

                  <span
                    className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                      item.status === "Success"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : item.status === "Cancelled" ||
                            item.status === "Failed"
                          ? "bg-red-50 text-red-600 border-red-100"
                          : item.status === "New"
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : "bg-slate-50 text-slate-600 border-slate-100"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIVITY SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={18} />
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Completed Transactions
              </p>

              <p className="text-xl font-black text-slate-800">
                {completedTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity size={18} />
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Active Transactions
              </p>

              <p className="text-xl font-black text-slate-800">
                {activeTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle size={18} />
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Cancelled Transactions
              </p>

              <p className="text-xl font-black text-slate-800">
                {cancelledTransactions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUSPICIOUS ACTIVITY */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-red-50/30 border-b border-red-50 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-500" />

          <h2 className="text-xs font-black text-red-700 uppercase tracking-widest">
            Suspicious Activity Alerts
          </h2>
        </div>

        {suspiciousActivities.length === 0 ? (
          <div className="p-6 text-center">
            <ShieldAlert size={28} className="mx-auto text-emerald-400 mb-2" />

            <p className="text-sm font-semibold text-slate-600">
              No suspicious activity detected
            </p>

            <p className="text-xs text-slate-400 mt-1">
              No users currently meet the transaction-risk thresholds.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {suspiciousActivities.map((alert, idx) => (
              <div
                key={`${alert.id}-${idx}`}
                className="bg-orange-50/30 border border-orange-100/50 p-3 rounded-xl flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    User #{String(alert.id).slice(0, 8)}
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded text-white ml-2 uppercase ${alert.color}`}
                    >
                      {alert.type}
                    </span>
                  </p>

                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {alert.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivity;
