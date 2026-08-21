import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  Trophy,
  Medal,
  Award,
  MapPin,
  RefreshCw,
  Package,
  Users,
  TrendingUp,
  AlertCircle,
  BarChart3, 
} from "lucide-react";

const BarangayLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setError("");

      const isRefresh = leaderboardData.length > 0;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      /*
       * Get all listings and the barangay of the seller.
       *
       * profiles:seller_id means:
       * listings.seller_id -> profiles.id
       */
      const { data, error: listingsError } = await supabase
        .from("listings")
        .select(`
          id,
          seller_id,
          status,
          created_at,
          profiles:seller_id (
            id,
            barangay
          )
        `);

      if (listingsError) {
        throw listingsError;
      }

      if (!data) {
        setLeaderboardData([]);
        return;
      }

      /*
       * Group listings by barangay.
       */
      const barangays = {};

      data.forEach((listing) => {
        const barangay = listing.profiles?.barangay;

        // Ignore listings without a barangay
        if (!barangay) return;

        if (!barangays[barangay]) {
          barangays[barangay] = {
            name: barangay,
            items: 0,
            households: new Set(),
            collectedItems: 0,
            currentPeriodItems: 0,
            previousPeriodItems: 0,
          };
        }

        /*
         * Count active listings as available e-waste stock.
         */
        if (listing.status === "active") {
          barangays[barangay].items += 1;
        }

        /*
         * Count the seller as a participating household.
         *
         * Set prevents the same seller from being counted
         * multiple times.
         */
        if (listing.seller_id) {
          barangays[barangay].households.add(listing.seller_id);
        }

        /*
         * These statuses mean the e-waste has already entered
         * the donation/recovery process.
         */
        const isCollected = [
          "donated",
          "drop_off_assigned",
          "processed",
        ].includes(listing.status);

        if (isCollected) {
          barangays[barangay].collectedItems += 1;
        }
      });

      /*
       * Convert object to array.
       */
      const formattedData = Object.values(barangays)
        .map((barangay) => {
          const items = barangay.items;

          let stock = "Low Stock";

          if (items >= 11) {
            stock = "High Stock";
          } else if (items >= 6) {
            stock = "Medium Stock";
          }

          return {
            id: barangay.name,
            name: barangay.name,
            items,
            households: barangay.households.size,
            collectedItems: barangay.collectedItems,
            stock,
          };
        })
        /*
         * Only show barangays that actually have active listings.
         */
        .filter((barangay) => barangay.items > 0)
        /*
         * Highest number of active items first.
         */
        .sort((a, b) => b.items - a.items);

      setLeaderboardData(formattedData);
    } catch (err) {
      console.error("Error loading e-waste tracker:", err);

      setError(
        err?.message ||
          "Unable to load barangay e-waste data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
   * Total active e-waste currently available.
   */
  const totalItems = useMemo(() => {
    return leaderboardData.reduce(
      (total, barangay) => total + barangay.items,
      0
    );
  }, [leaderboardData]);

  /*
   * Total items that have entered the donation/recovery process.
   */
  const totalCollected = useMemo(() => {
    return leaderboardData.reduce(
      (total, barangay) => total + barangay.collectedItems,
      0
    );
  }, [leaderboardData]);

  /*
   * Total participating households.
   *
   * Note:
   * A household is represented here by a unique seller/profile
   * because that is the user data currently available.
   */
  const totalHouseholds = useMemo(() => {
    return leaderboardData.reduce(
      (total, barangay) => total + barangay.households,
      0
    );
  }, [leaderboardData]);

  const topThree = leaderboardData.slice(0, 3);

  const getStockClass = (stock) => {
    if (stock === "High Stock") {
      return "bg-emerald-100 text-emerald-600";
    }

    if (stock === "Medium Stock") {
      return "bg-blue-100 text-blue-600";
    }

    return "bg-orange-100 text-orange-600";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-lg font-black text-slate-800">
            Barangay E-waste Tracker
          </h2>

          <p className="text-[10px] text-slate-400 font-bold mt-1">
            Live rankings based on current e-waste listings
          </p>
        </div>

        <button
          onClick={fetchLeaderboardData}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-500 hover:text-[#769c2d] hover:border-[#769c2d] transition-all disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={refreshing ? "animate-spin" : ""}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">

          <AlertCircle
            size={18}
            className="text-red-500"
          />

          <div>
            <p className="text-xs font-black text-red-600">
              Unable to load tracker
            </p>

            <p className="text-[10px] text-red-400 mt-1">
              {error}
            </p>
          </div>

        </div>
      )}

      {/*
      {!loading && topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {topThree.map((item, index) => {

            const Icon =
              index === 0
                ? Trophy
                : index === 1
                ? Medal
                : Award;

            return (
              <div
                key={item.id}
                className={`relative overflow-hidden rounded-[2rem] p-6 shadow-sm border ${
                  index === 0
                    ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white border-orange-300"
                    : index === 1
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-gradient-to-br from-orange-700 to-orange-800 text-white border-orange-600"
                }`}
              >

                <Icon
                  size={55}
                  className="absolute right-5 top-5 opacity-20"
                />

                <div className="relative z-10">

                  <span className="text-3xl font-black opacity-40">
                    #{index + 1}
                  </span>

                  <h3 className="text-base font-black mt-2">
                    Barangay {item.name}
                  </h3>

                  <div className="mt-5 space-y-2">

                    <div className="flex justify-between">
                      <span className="text-[9px] font-bold opacity-70">
                        ACTIVE ITEMS
                      </span>

                      <span className="text-xs font-black">
                        {item.items}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[9px] font-bold opacity-70">
                        COLLECTED
                      </span>

                      <span className="text-xs font-black">
                        {item.collectedItems}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[9px] font-bold opacity-70">
                        HOUSEHOLDS
                      </span>

                      <span className="text-xs font-black">
                        {item.households.toLocaleString()}
                      </span>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}

        </div>
      )} */}

      {/* =====================================================
          COMPLETE RANKINGS
      ===================================================== */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">

        <div className="p-8 border-b border-slate-50 flex items-center justify-between">

          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Complete Rankings
            </h3>

            <p className="text-[10px] text-slate-400 font-bold mt-1">
              Rankings automatically update from active listings
            </p>
          </div>

          <BarChart3
            size={20}
            className="text-slate-300"
          />

        </div>

        {loading ? (

          /* =================================================
             LOADING
          ================================================= */
          <div className="py-16 text-center">

            <RefreshCw
              size={24}
              className="mx-auto text-[#769c2d] animate-spin"
            />

            <p className="text-xs font-bold text-slate-400 mt-3">
              Loading e-waste data...
            </p>

          </div>

        ) : leaderboardData.length === 0 ? (

          /* =================================================
             EMPTY
          ================================================= */
          <div className="py-16 text-center">

            <Package
              size={30}
              className="mx-auto text-slate-200"
            />

            <p className="text-sm font-black text-slate-500 mt-3">
              No e-waste listings found
            </p>

            <p className="text-[10px] text-slate-400 mt-1">
              Barangay rankings will appear once active listings
              are available.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">

                  <th className="px-8 py-4">
                    Rank
                  </th>

                  <th className="px-8 py-4">
                    Barangay Name
                  </th>

                  <th className="px-8 py-4">
                    Total Items
                  </th>

                  <th className="px-8 py-4">
                    Stock Level
                  </th>

                  <th className="px-8 py-4">
                    Households
                  </th>

                  <th className="px-8 py-4">
                    Collected
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">

                {leaderboardData.map((item, index) => (

                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >

                    {/* Rank */}
                    <td className="px-8 py-5">

                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                            ? "bg-slate-200 text-slate-600"
                            : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </span>

                    </td>

                    {/* Barangay */}
                    <td className="px-8 py-5">

                      <div className="flex items-center gap-2">

                        <MapPin
                          size={12}
                          className="text-slate-300"
                        />

                        <span className="text-xs font-bold text-slate-700">
                          Barangay {item.name}
                        </span>

                      </div>

                    </td>

                    {/* Total Items */}
                    <td className="px-8 py-5">

                      <div className="flex items-center gap-2">

                        <Package
                          size={13}
                          className="text-slate-300"
                        />

                        <span className="text-xs font-black text-slate-600">
                          {item.items} items
                        </span>

                      </div>

                    </td>

                    {/* Stock */}
                    <td className="px-8 py-5">

                      <span
                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${getStockClass(
                          item.stock
                        )}`}
                      >
                        {item.stock}
                      </span>

                    </td>

                    {/* Households */}
                    <td className="px-8 py-5">

                      <div className="flex items-center gap-2">

                        <Users
                          size={13}
                          className="text-slate-300"
                        />

                        <span className="text-xs font-bold text-slate-500">
                          {item.households.toLocaleString()}
                        </span>

                      </div>

                    </td>

                    {/* Collected */}
                    <td className="px-8 py-5">

                      <span className="text-xs font-black text-[#769c2d]">
                        {item.collectedItems}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* {/* =====================================================
          SUMMARY STATS
      ===================================================== */}
      <div className="grid grid-cols-3 gap-4">

        {/* Active Items */}
        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 text-center">

          <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 flex items-center justify-center mb-3">

            <Package
              size={18}
              className="text-blue-500"
            />

          </div>

          <p className="text-3xl font-black text-slate-800">
            {totalItems.toLocaleString()}
          </p>

          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-1">
            Active E-waste Items
          </p>

        </div>

        {/* Collected */}
        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 text-center">

          <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 flex items-center justify-center mb-3">

            <TrendingUp
              size={18}
              className="text-emerald-500"
            />

          </div>

          <p className="text-3xl font-black text-slate-800">
            {totalCollected.toLocaleString()}
          </p>

          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-1">
            Items Collected
          </p>

        </div>

        {/* Barangays */}
        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 text-center">

          <div className="w-10 h-10 mx-auto rounded-xl bg-purple-50 flex items-center justify-center mb-3">

            <MapPin
              size={18}
              className="text-purple-500"
            />

          </div>

          <p className="text-3xl font-black text-slate-800">
            {leaderboardData.length}
          </p>

          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-1">
            Participating Barangays
          </p>

        </div>

      </div> 

    </div>
  );
};

export default BarangayLeaderboard;