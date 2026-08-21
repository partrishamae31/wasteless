import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  RefreshCcw,
  Loader2,
  AlertCircle,
  Package,
  Users,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const BarangayMonitor = () => {
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [dropOffPoints, setDropOffPoints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     NORMALIZE BARANGAY
  ========================================================= */

  const normalizeBarangay = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^barangay\s+/i, "")
      .replace(/\s+/g, " ");
  };

  const displayBarangay = (value) => {
    if (!value) return "Unknown Barangay";

    const clean = String(value)
      .trim()
      .replace(/^barangay\s+/i, "");

    return `Barangay ${clean}`;
  };

  /* =========================================================
     LOAD DATABASE DATA
  ========================================================= */

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        listingsResult,
        transactionsResult,
        profilesResult,
        dropOffResult,
      ] = await Promise.all([
        supabase
          .from("listings")
          .select(`
            id,
            seller_id,
            barangay,
            category,
            device_model,
            status,
            created_at
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("transactions")
          .select(`
            id,
            seller_id,
            harvester_id,
            listing_id,
            status,
            created_at,
            listings (
              id,
              barangay,
              category,
              device_model
            )
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select(`
            id,
            role,
            is_verified
          `),

        supabase
          .from("drop_off_points")
          .select(`
            id,
            barangay,
            city,
            partner,
            is_active
          `)
          .eq("is_active", true),
      ]);

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

      if (profilesResult.error) {
        throw new Error(
          `Unable to load users: ${profilesResult.error.message}`
        );
      }

      if (dropOffResult.error) {
        throw new Error(
          `Unable to load drop-off points: ${dropOffResult.error.message}`
        );
      }

      setListings(listingsResult.data || []);
      setTransactions(transactionsResult.data || []);
      setProfiles(profilesResult.data || []);
      setDropOffPoints(dropOffResult.data || []);
    } catch (err) {
      console.error("Barangay monitor error:", err);
      setError(err.message || "Unable to load barangay monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =========================================================
     INITIAL LOAD + REALTIME
  ========================================================= */

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("barangay-monitor")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        () => loadData(true)
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => loadData(true)
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => loadData(true)
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drop_off_points",
        },
        () => loadData(true)
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* =========================================================
     COMPLETED TRANSACTIONS
  ========================================================= */

  const completedTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const status = String(transaction.status || "")
        .trim()
        .toLowerCase();

      return status === "completed";
    });
  }, [transactions]);

  /* =========================================================
     BARANGAY DATA
  ========================================================= */

  const barangayStats = useMemo(() => {
    const barangayMap = {};

    const ensureBarangay = (barangay) => {
      if (!barangay) return null;

      const key = normalizeBarangay(barangay);

      if (!key) return null;

      if (!barangayMap[key]) {
        barangayMap[key] = {
          key,
          name: displayBarangay(barangay),
          totalItems: 0,
          completedItems: 0,
          activeUsers: 0,
          activeDropOffPoints: 0,
          totalListings: 0,
        };
      }

      return barangayMap[key];
    };

    /* ---------------------------------------------------------
       LISTINGS
       Barangay comes directly from listings.barangay
    --------------------------------------------------------- */

    listings.forEach((listing) => {
      const barangay = ensureBarangay(listing.barangay);

      if (!barangay) return;

      barangay.totalListings += 1;
    });

    /* ---------------------------------------------------------
       COMPLETED TRANSACTIONS
       Transaction → listing → barangay
    --------------------------------------------------------- */

    completedTransactions.forEach((transaction) => {
      const barangayName =
        transaction.listings?.barangay || null;

      const barangay = ensureBarangay(barangayName);

      if (!barangay) return;

      barangay.completedItems += 1;
      barangay.totalItems += 1;
    });

    /* ---------------------------------------------------------
       ACTIVE DROP-OFF POINTS
    --------------------------------------------------------- */

    dropOffPoints.forEach((point) => {
      const barangay = ensureBarangay(point.barangay);

      if (!barangay) return;

      barangay.activeDropOffPoints += 1;
    });

    /* ---------------------------------------------------------
       ACTIVE USERS
       Count users who have a matching barangay through listings.

       NOTE:
       Your current profiles table does not contain barangay,
       so users cannot be directly assigned to a barangay.
       Therefore we do NOT invent household numbers.
    --------------------------------------------------------- */

    const userBarangays = {};

    listings.forEach((listing) => {
      if (!listing.seller_id || !listing.barangay) return;

      const key = normalizeBarangay(listing.barangay);

      if (!userBarangays[key]) {
        userBarangays[key] = new Set();
      }

      userBarangays[key].add(listing.seller_id);
    });

    Object.entries(userBarangays).forEach(([key, usersSet]) => {
      if (barangayMap[key]) {
        barangayMap[key].activeUsers = usersSet.size;
      }
    });

    return Object.values(barangayMap)
      .sort((a, b) => b.totalItems - a.totalItems)
      .map((item, index, array) => ({
        ...item,
        rank:
          item.totalItems > 0
            ? index + 1
            : null,

        /*
         * Stock level is based on actual completed
         * collection volume.
         */
        stockLevel:
          item.completedItems >= 100
            ? "High"
            : item.completedItems >= 50
              ? "Medium"
              : item.completedItems > 0
                ? "Low"
                : "No Activity",

        stockColor:
          item.completedItems >= 100
            ? "bg-emerald-500"
            : item.completedItems >= 50
              ? "bg-blue-500"
              : item.completedItems > 0
                ? "bg-orange-500"
                : "bg-slate-300",
      }));
  }, [
    listings,
    completedTransactions,
    dropOffPoints,
  ]);

  /* =========================================================
     TOTALS
  ========================================================= */

  const totalCollected = completedTransactions.length;

  const participatingBarangays = barangayStats.filter(
    (item) =>
      item.completedItems > 0 ||
      item.activeDropOffPoints > 0
  ).length;

  const activeUsers = profiles.length;

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2
            size={35}
            className="animate-spin text-emerald-500"
          />

          <p className="text-sm font-medium">
            Loading barangay monitoring data...
          </p>
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
            Barangay Monitor
          </h1>

          <p className="text-sm text-slate-500 font-medium">
            Centralized monitoring dashboard for Valenzuela City
            E-waste Platform
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-60"
        >
          <RefreshCcw
            size={16}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh Data"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle
            size={20}
            className="text-red-500"
          />

          <div>
            <p className="font-semibold text-red-700">
              Unable to load barangay data
            </p>

            <p className="text-sm text-red-600 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">
                Total Items Collected
              </p>

              <h2 className="text-2xl font-black text-slate-800">
                {totalCollected.toLocaleString()}
              </h2>

              <p className="text-[10px] text-slate-400 mt-1">
                Completed transactions
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">
                Participating Barangays
              </p>

              <h2 className="text-2xl font-black text-slate-800">
                {participatingBarangays}
              </h2>

              <p className="text-[10px] text-slate-400 mt-1">
                Based on activity and active drop-off points
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">
                Platform Users
              </p>

              <h2 className="text-2xl font-black text-slate-800">
                {activeUsers.toLocaleString()}
              </h2>

              <p className="text-[10px] text-slate-400 mt-1">
                Registered profiles
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        <div className="p-5 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Barangay E-waste Activity
          </h3>

          <p className="text-[10px] text-slate-400 mt-1">
            Rankings are calculated from completed transactions
            associated with each barangay.
          </p>
        </div>

        {barangayStats.length === 0 ? (
          <div className="p-10 text-center">
            <MapPin
              size={35}
              className="mx-auto text-slate-300 mb-3"
            />

            <p className="text-sm font-semibold text-slate-600">
              No barangay activity found
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Barangay information will appear when listings,
              completed transactions, or active drop-off points
              contain barangay data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">

              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">

                  <th className="px-6 py-4 text-left">
                    Rank
                  </th>

                  <th className="px-6 py-4 text-left">
                    Barangay Name
                  </th>

                  <th className="px-6 py-4 text-left">
                    Total Items Collected
                  </th>

                  <th className="px-6 py-4 text-left">
                    Stock Level
                  </th>

                  <th className="px-6 py-4 text-left">
                    Active Users
                  </th>

                  <th className="px-6 py-4 text-left">
                    Drop-off Points
                  </th>

                  <th className="px-6 py-4 text-left">
                    Status
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">

                {barangayStats.map((item) => (
                  <tr
                    key={item.key}
                    className="hover:bg-slate-50/50 transition-colors"
                  >

                    {/* RANK */}
                    <td className="px-6 py-4">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                          item.rank <= 3
                            ? "bg-orange-100 text-orange-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.rank}
                      </div>
                    </td>

                    {/* BARANGAY */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">

                        <MapPin
                          size={13}
                          className="text-slate-300"
                        />

                        <div>
                          <span className="text-xs font-bold text-slate-700">
                            {item.name}
                          </span>

                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {item.totalListings} listing
                            {item.totalListings !== 1
                              ? "s"
                              : ""}
                          </p>
                        </div>

                      </div>
                    </td>

                    {/* ITEMS */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-slate-700">
                        {item.completedItems.toLocaleString()}
                      </span>
                    </td>

                    {/* STOCK */}
                    <td className="px-6 py-4">

                      <div className="flex items-center gap-2">

                        <div
                          className={`w-2 h-2 rounded-full ${item.stockColor}`}
                        />

                        <span
                          className={`text-[9px] font-bold uppercase ${
                            item.stockColor.replace(
                              "bg-",
                              "text-"
                            )
                          }`}
                        >
                          {item.stockLevel}
                        </span>

                      </div>

                    </td>

                    {/* USERS */}
                    <td className="px-6 py-4">

                      <span className="text-xs font-bold text-slate-700">
                        {item.activeUsers.toLocaleString()}
                      </span>

                      <p className="text-[9px] text-slate-400">
                        sellers with listings
                      </p>

                    </td>

                    {/* DROP-OFF */}
                    <td className="px-6 py-4">

                      <span className="text-xs font-bold text-slate-700">
                        {item.activeDropOffPoints}
                      </span>

                      <p className="text-[9px] text-slate-400">
                        active
                      </p>

                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">

                      {item.completedItems > 0 ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">

                          <CheckCircle2 size={14} />

                          <span className="text-[9px] font-bold uppercase">
                            Active
                          </span>

                        </div>
                      ) : item.activeDropOffPoints > 0 ? (
                        <div className="flex items-center gap-1.5 text-blue-600">

                          <MapPin size={14} />

                          <span className="text-[9px] font-bold uppercase">
                            Drop-off Available
                          </span>

                        </div>
                      ) : (
                        <span className="text-[9px] font-bold uppercase text-slate-400">
                          No Activity
                        </span>
                      )}

                    </td>

                  </tr>
                ))}

              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* FOOTER TOTALS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white p-5 rounded-xl border border-slate-100 text-center shadow-sm">

          <h4 className="text-2xl font-black text-slate-800">
            {totalCollected.toLocaleString()}
          </h4>

          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Total Items Collected
          </p>

          <p className="text-[8px] text-blue-500 mt-1 italic font-medium">
            Based only on completed transactions
          </p>

        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 text-center shadow-sm">

          <h4 className="text-2xl font-black text-slate-800">
            {participatingBarangays}
          </h4>

          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Participating Barangays
          </p>

          <p className="text-[8px] text-blue-500 mt-1 italic font-medium">
            Active through e-waste activity or drop-off points
          </p>

        </div>

      </div>

    </div>
  );
};

export default BarangayMonitor;