import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import valenzuelaMap from "./assets/valenzuela-map.png";

import {
  MapPin,
  ArrowRight,
  LayoutGrid,
  Smartphone,
  TrendingUp,
  Coins,
  X,
} from "lucide-react";

const HIGH_VALUE_THRESHOLD = 5000;

/* =========================================================
   VALENZUELA BARANGAY MAP POSITIONS
   ========================================================= */

const BARANGAY_POSITIONS = {
  "Wawang Pulo": { top: "17%", left: "5%" },
  Tagalag: { top: "28%", left: "17%" },
  Coloong: { top: "23%", left: "27%" },
  Malanday: { top: "31%", left: "34%" },

  Bignay: { top: "8%", left: "71%" },
  Punturin: { top: "20%", left: "65%" },
  "Lawang Bato": { top: "29%", left: "71%" },

  Lingunan: { top: "38%", left: "52%" },
  "Veinte Reales": { top: "34%", left: "43%" },

  "Canumay East": { top: "39%", left: "67%" },
  "Canumay West": { top: "48%", left: "62%" },

  Bagbaguin: { top: "48%", left: "81%" },
  "Paso de Blas": { top: "53%", left: "75%" },
  "Mapulang Lupa": { top: "61%", left: "83%" },
  Ugong: { top: "70%", left: "94%" },

  Maysan: { top: "54%", left: "51%" },
  Dalandanan: { top: "50%", left: "43%" },
  Pasolo: { top: "49%", left: "34%" },
  Mabolo: { top: "44%", left: "34%" },

  Balangkas: { top: "43%", left: "23%" },
  Polo: { top: "57%", left: "27%" },
  "Arkong Bato": { top: "62%", left: "25%" },
  Poblacion: { top: "53%", left: "20%" },

  Rincon: { top: "65%", left: "38%" },
  Malinta: { top: "76%", left: "38%" },

  Karuhatan: { top: "71%", left: "51%" },
  Parada: { top: "65%", left: "68%" },
  "Gen. T. de Leon": { top: "76%", left: "64%" },
  Marulas: { top: "90%", left: "60%" },
};

/* =========================================================
   BARANGAY NAME NORMALIZATION
   =========================================================
   This prevents active barangays from disappearing because
   of capitalization, spaces, punctuation, or small naming
   differences between the database and the map.
   ========================================================= */

const normalizeBarangayName = (value) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-");
};

/* =========================================================
   BARANGAY ALIASES
   ========================================================= */

const BARANGAY_ALIASES = {
  "gen t de leon": "Gen. T. de Leon",
  "gen t. de leon": "Gen. T. de Leon",
  "general t de leon": "Gen. T. de Leon",
  "general t. de leon": "Gen. T. de Leon",

  "lawang bato": "Lawang Bato",
  "lawang-bato": "Lawang Bato",

  "canumay east": "Canumay East",
  "canumay west": "Canumay West",

  "paso de blas": "Paso de Blas",
  "mapulang lupa": "Mapulang Lupa",

  "veinte reales": "Veinte Reales",
  "arkong bato": "Arkong Bato",

  "wawang pulo": "Wawang Pulo",
};

const getCanonicalBarangayName = (value) => {
  if (!value) return null;

  const normalized = normalizeBarangayName(value);

  /* First check exact normalized names */
  const exactMatch = Object.keys(BARANGAY_POSITIONS).find(
    (name) => normalizeBarangayName(name) === normalized,
  );

  if (exactMatch) {
    return exactMatch;
  }

  /* Then check known aliases */
  if (BARANGAY_ALIASES[normalized]) {
    return BARANGAY_ALIASES[normalized];
  }

  /*
   * If the database has a barangay that is not configured
   * in the map, preserve its original name instead of
   * silently deleting it.
   */
  return String(value).trim();
};

/* =========================================================
   FALLBACK POSITION
   =========================================================
   If a new/unknown active barangay exists in Supabase but
   does not yet have a manual position, give it a visible
   position instead of returning null.
   ========================================================= */

const FALLBACK_POSITIONS = [
  { top: "12%", left: "48%" },
  { top: "18%", left: "88%" },
  { top: "25%", left: "45%" },
  { top: "32%", left: "88%" },
  { top: "40%", left: "88%" },
  { top: "48%", left: "12%" },
  { top: "56%", left: "91%" },
  { top: "65%", left: "12%" },
  { top: "76%", left: "87%" },
  { top: "86%", left: "25%" },
  { top: "86%", left: "80%" },
];

const getFallbackPosition = (barangayName, index) => {
  /*
   * Generate a stable fallback index from the barangay name
   * so the marker does not randomly move every render.
   */
  const name = String(barangayName || "");

  let hash = 0;

  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }

  const positionIndex =
    Math.abs(hash + Number(index || 0)) % FALLBACK_POSITIONS.length;

  return FALLBACK_POSITIONS[positionIndex];
};

/* =========================================================
   GET BARANGAY POSITION
   ========================================================= */

const getBarangayPosition = (barangayName, index = 0) => {
  const canonicalName = getCanonicalBarangayName(barangayName);

  if (BARANGAY_POSITIONS[canonicalName]) {
    return BARANGAY_POSITIONS[canonicalName];
  }

  return getFallbackPosition(canonicalName, index);
};

/* =========================================================
   URBAN MINE MAP
   ========================================================= */

const UrbanMineMap = ({ isVerified }) => {
  const [mapData, setMapData] = useState([]);
  const [filter, setFilter] = useState("Not Working");
  const [loading, setLoading] = useState(true);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [userBarangay, setUserBarangay] = useState(null);
  const [allMapListings, setAllMapListings] = useState([]);
  const [viewingBarangay, setViewingBarangay] = useState(null);
  const [viewListings, setViewListings] = useState([]);

  /* =======================================================
     FETCH MAP DATA
     ======================================================= */

  useEffect(() => {
    fetchUserBarangay();
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [filter, userBarangay]);

  const fetchUserBarangay = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUserBarangay(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("barangay")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading Repair Shop barangay:", error);
        setUserBarangay(null);
        return;
      }

      setUserBarangay(
        data?.barangay ? getCanonicalBarangayName(data.barangay) : null,
      );
    } catch (err) {
      console.error("Unexpected user barangay error:", err);
      setUserBarangay(null);
    }
  };

  const fetchMapData = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
            id,
            device_model,
            category,
            asking_price,
            status,
            condition,
            profiles:seller_id (
              barangay
            )
          `,
        )
        .eq("status", "active");

      if (error) {
        console.error("Error loading Urban Mine Map:", error);
        setAllMapListings([]);
        setMapData([]);
        setLoading(false);
        return;
      }

      if (!data) {
        setAllMapListings([]);
        setMapData([]);
        setLoading(false);
        return;
      }

      setAllMapListings(data);

      /* ===================================================
         FILTER DATA FOR THE SELECTED MAP VIEW
         =================================================== */

      let filteredData = data;

      /* Initial/default map view: only active Not Working listings. */
      if (filter === "Not Working") {
        filteredData = data.filter(
          (item) => String(item?.condition || "").trim().toLowerCase() === "not working",
        );
      }

      /* High Value: only include active listings above the threshold. */
      if (filter === "High Value") {
        filteredData = data.filter(
          (item) => Number(item?.asking_price || 0) > HIGH_VALUE_THRESHOLD,
        );
      }

      /* ===================================================
         GROUP ACTIVE NOT WORKING LISTINGS BY BARANGAY
         =================================================== */

      const barangayGroups = filteredData.reduce((acc, item) => {
        const rawBarangay = item?.profiles?.barangay;

        if (!rawBarangay) {
          return acc;
        }

        const barangay = getCanonicalBarangayName(rawBarangay);

        if (!barangay) {
          return acc;
        }

        if (!acc[barangay]) {
          acc[barangay] = {
            count: 0,
            totalValue: 0,
            highValue: 0,
          };
        }

        const price = Number(item?.asking_price || 0);

        acc[barangay].count += 1;
        acc[barangay].totalValue += price;

        if (price > HIGH_VALUE_THRESHOLD) {
          acc[barangay].highValue += 1;
        }

        return acc;
      }, {});

      /* ===================================================
         FORMAT DATA
         =================================================== */

      let formattedData = Object.entries(barangayGroups).map(
        ([name, values]) => ({
          name,
          ...values,
        }),
      );

      /* ===================================================
         HIGH VALUE FILTER
         ===================================================
         The source data has already been reduced to high-value
         listings, so counts and values represent only those
         listings.
         =================================================== */

      if (filter === "High Value") {
        formattedData.sort((a, b) => b.totalValue - a.totalValue);
      }

      /* ===================================================
         NEARBY FILTER
         ===================================================
         Prioritize barangays closest to the Repair Shop's own
         barangay. The map uses the configured barangay positions
         as a privacy-preserving proximity model; no exact address
         or household coordinates are exposed.
         =================================================== */

      if (filter === "Nearby") {
        const userPosition = userBarangay
          ? getBarangayPosition(userBarangay)
          : null;

        const toPercent = (value) => Number.parseFloat(value) || 0;

        const distanceToUserBarangay = (barangay) => {
          if (!userPosition) return Number.POSITIVE_INFINITY;

          const position = getBarangayPosition(barangay.name);
          const dx =
            toPercent(position.left) - toPercent(userPosition.left);
          const dy =
            toPercent(position.top) - toPercent(userPosition.top);

          return Math.sqrt(dx * dx + dy * dy);
        };

        formattedData = formattedData
          .map((barangay) => ({
            ...barangay,
            distanceFromUser: distanceToUserBarangay(barangay),
          }))
          .sort(
            (a, b) =>
              a.distanceFromUser - b.distanceFromUser ||
              b.count - a.count,
          )
          .slice(0, 8);
      }

      /* ===================================================
         ALL LISTINGS
         ===================================================
         Sort all active barangays by number of devices.
         =================================================== */

      if (filter === "All Listings") {
        formattedData.sort((a, b) => b.count - a.count);
      }

      console.log("Urban Mine Map active Not Working barangays:", formattedData);

      setMapData(
        formattedData.map(({ distanceFromUser, ...barangay }) => barangay),
      );
    } catch (err) {
      console.error("Unexpected Urban Mine Map error:", err);
      setAllMapListings([]);
      setMapData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewListings = (barangay) => {
    const canonicalBarangay = getCanonicalBarangayName(barangay?.name);

    let listings = allMapListings.filter((item) => {
      const listingBarangay = getCanonicalBarangayName(item?.profiles?.barangay);
      return listingBarangay === canonicalBarangay;
    });

    if (filter === "Not Working") {
      listings = listings.filter(
        (item) =>
          String(item?.condition || "").trim().toLowerCase() ===
          "not working",
      );
    }

    if (filter === "High Value") {
      listings = listings.filter(
        (item) => Number(item?.asking_price || 0) > HIGH_VALUE_THRESHOLD,
      );
    }

    setViewingBarangay(barangay);
    setViewListings(listings);
  };

  const closeListings = () => {
    setViewingBarangay(null);
    setViewListings([]);
  };

  /* =======================================================
     STATS
     ======================================================= */

  const stats = useMemo(() => {
    const totalDevices = mapData.reduce(
      (total, barangay) => total + barangay.count,
      0,
    );

    const highValueDevices = mapData.reduce(
      (total, barangay) => total + barangay.highValue,
      0,
    );

    const totalValue = mapData.reduce(
      (total, barangay) => total + barangay.totalValue,
      0,
    );

    return {
      activeBarangays: mapData.length,
      totalDevices,
      highValueDevices,
      totalValue,
    };
  }, [mapData]);

  /* =======================================================
     DENSITY
     ======================================================= */

  const getDensity = (count) => {
    if (count >= 20) {
      return {
        label: "Very High",
        color: "#8b2bbd",
        bg: "bg-purple-600",
      };
    }

    if (count >= 11) {
      return {
        label: "High",
        color: "#dc2626",
        bg: "bg-red-600",
      };
    }

    if (count >= 6) {
      return {
        label: "Medium",
        color: "#ed9412",
        bg: "bg-orange-500",
      };
    }

    return {
      label: "Low",
      color: "#249447",
      bg: "bg-green-600",
    };
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <>
      <div className="w-full space-y-4 animate-in fade-in duration-500">
      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              Urban Mine Map
            </h2>

            <p className="text-xs text-slate-400 mt-1">
              E-waste availability across Valenzuela City
            </p>
          </div>

          {/* FILTERS */}

          <div className="flex items-center gap-2">
            {["Not Working", "All Listings", "High Value", "Nearby"].map((option) => (
              <button
                key={option}
                onClick={() => {
                  setSelectedBarangay(null);
                  setFilter(option);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                  filter === option
                    ? "bg-[#769c2d] border-[#769c2d] text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-500 hover:border-[#769c2d] hover:text-[#769c2d]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* =================================================
            STATS
            ================================================= */}

        <div className="grid grid-cols-4 gap-3 mt-4">
          <MapStat
            icon={<LayoutGrid />}
            label="Active Barangays"
            value={`${stats.activeBarangays}/33`}
          />

          <MapStat
            icon={<Smartphone />}
            label="Total Devices"
            value={stats.totalDevices}
          />

          <MapStat
            icon={<TrendingUp />}
            label="High Value Devices"
            value={stats.highValueDevices}
          />

          <MapStat
            icon={<Coins />}
            label="Total Value"
            value={`₱${stats.totalValue.toLocaleString()}`}
          />
        </div>
      </div>

      {/* =====================================================
          MAP
          ===================================================== */}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div
          className="relative h-[560px] overflow-hidden flex items-center justify-center"
          onClick={() => setSelectedBarangay(null)}
        >
          {/* =================================================
              ACTUAL VALENZUELA MAP
              ================================================= */}

          <div className="relative w-[700px] max-w-[90%] aspect-[429/350]">
            <img
              src={valenzuelaMap}
              alt="Valenzuela City Barangay Map"
              className="absolute inset-0 w-full h-full object-contain"
            />

            {/* =================================================
                LOADING
                ================================================= */}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-40">
                <div className="bg-white px-5 py-3 rounded-xl shadow-lg">
                  <p className="text-xs font-bold text-slate-500">
                    Loading map data...
                  </p>
                </div>
              </div>
            )}

            {/* =================================================
                DYNAMIC BARANGAY MARKERS
                ================================================= */}

            {!loading &&
              mapData.map((barangay, index) => {
                const position = getBarangayPosition(
                  barangay.name,
                  index,
                );

                const density = getDensity(barangay.count);

                const isSelected =
                  selectedBarangay?.name === barangay.name;

                return (
                  <div
                    key={barangay.name}
                    className="absolute z-20"
                    style={{
                      top: position.top,
                      left: position.left,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        setSelectedBarangay(
                          isSelected ? null : barangay,
                        );
                      }}
                      className="group relative"
                      aria-label={`View ${barangay.name} barangay details`}
                    >
                      {/* =================================================
                          COLORED DENSITY MARKER
                          ================================================= */}

                      <div
                        className="w-7 h-7 rounded-full border-[3px] border-white shadow-lg flex items-center justify-center transition-all duration-200 group-hover:scale-125"
                        style={{
                          backgroundColor: density.color,
                        }}
                      >
                        <MapPin
                          size={14}
                          className="text-white"
                          fill="white"
                        />
                      </div>

                      {/* =================================================
                          POPUP
                          ================================================= */}

                      {isSelected && (
                        <div
                          className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 bg-white rounded-xl border border-slate-200 shadow-2xl p-4 z-[100]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-black text-slate-800">
                            Barangay {barangay.name}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            {barangay.count} devices available
                          </p>

                          <div className="border-t border-slate-100 mt-3 pt-3 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-400">
                                Total Value
                              </span>

                              <span className="text-xs font-bold text-[#3285a1]">
                                ₱
                                {barangay.totalValue.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-xs text-slate-400">
                                High Value
                              </span>

                              <span className="text-xs font-bold text-purple-500">
                                {barangay.highValue} devices
                              </span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <span className="text-xs font-bold text-slate-400">
                              {density.label} Density
                            </span>
                          </div>

                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-slate-200 rotate-45" />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}

            {/* =================================================
                NO DATA
                ================================================= */}

            {!loading && mapData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-8 py-6 text-center">
                  <MapPin
                    size={28}
                    className="mx-auto text-slate-300 mb-2"
                  />

                  <p className="text-sm font-bold text-slate-600">
                    No active Not Working listings found
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    There are currently no listings for this filter.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              LOCATION CATEGORY KEY
              ================================================= */}

          <div className="absolute bottom-5 left-5 bg-white rounded-lg border-2 border-[#163d73] shadow-lg overflow-hidden z-30">
            <div className="bg-[#163d73] px-3 py-2">
              <p className="text-xs font-black text-white uppercase tracking-wide">
                Location Category Key
              </p>
            </div>

            <div className="px-3 py-3 grid grid-cols-2 gap-x-5 gap-y-2">
              <MapKeyItem color="#249447" label="LOW" />

              <MapKeyItem color="#dc2626" label="HIGH" />

              <MapKeyItem color="#ed9412" label="MEDIUM" />

              <MapKeyItem color="#8b2bbd" label="VERY HIGH" />
            </div>
          </div>
        </div>

        {/* =====================================================
            DENSITY LEGEND
            ===================================================== */}

        <div className="border-t border-slate-200 px-5 py-3 flex items-center gap-7">
          <span className="text-xs font-bold text-slate-400">
            Density:
          </span>

          <LegendItem
            color="bg-green-500"
            label="Low (1-5)"
          />

          <LegendItem
            color="bg-orange-500"
            label="Medium (6-10)"
          />

          <LegendItem
            color="bg-red-500"
            label="High (11-20)"
          />

          <LegendItem
            color="bg-purple-500"
            label="Very High (20+)"
          />
        </div>
      </div>

      {/* =====================================================
          BARANGAY CARDS
          ===================================================== */}

      <div className="grid grid-cols-3 gap-3">
        {mapData.length > 0 ? (
          mapData.map((barangay) => (
            <BarangayCard
              key={barangay.name}
              barangay={barangay}
              onView={() => handleViewListings(barangay)}
            />
          ))
        ) : (
          <div className="col-span-3 py-16 text-center bg-white rounded-xl border border-slate-200">
            <MapPin
              size={28}
              className="mx-auto text-slate-300 mb-3"
            />

            <p className="text-sm font-bold text-slate-500">
              No active Not Working listings found for the Urban Mine Map.
            </p>
          </div>
        )}
      </div>
    </div>

      {viewingBarangay && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeListings}
          role="dialog"
          aria-modal="true"
          aria-label={`Listings in Barangay ${viewingBarangay.name}`}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Listings in Barangay {viewingBarangay.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {viewListings.length} listing{viewListings.length === 1 ? "" : "s"} available for the current map filter.
                </p>
              </div>
              <button
                type="button"
                onClick={closeListings}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close listings"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
              {viewListings.length > 0 ? (
                <div className="space-y-3">
                  {viewListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-800 truncate">
                            {listing.device_model || "E-waste Listing"}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {listing.category && (
                              <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                                {listing.category}
                              </span>
                            )}
                            {listing.condition && (
                              <span className="px-2 py-1 rounded-md bg-orange-50 text-[10px] font-bold text-orange-600">
                                {listing.condition}
                              </span>
                            )}
                            <span className="px-2 py-1 rounded-md bg-green-50 text-[10px] font-bold text-green-600">
                              Active
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-[#3285a1]">
                            ₱{Number(listing.asking_price || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Asking price
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <MapPin size={28} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600">
                    No listings found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    The listings may have changed since the map was loaded.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* =========================================================
   STAT CARD
   ========================================================= */

const MapStat = ({ icon, label, value }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 min-h-[76px] flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
        {React.cloneElement(icon, { size: 18 })}
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400">
          {label}
        </p>

        <p className="text-xl font-black text-slate-800 mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
};

/* =========================================================
   MAP KEY
   ========================================================= */

const MapKeyItem = ({ color, label }) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: color }}
      />

      <span className="text-xs font-black text-slate-600">
        {label}
      </span>
    </div>
  );
};

/* =========================================================
   DENSITY LEGEND
   ========================================================= */

const LegendItem = ({ color, label }) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />

      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>
    </div>
  );
};

/* =========================================================
   BARANGAY CARD
   ========================================================= */

const BarangayCard = ({ barangay, onView }) => {
  const density =
    barangay.count >= 20
      ? "Very High"
      : barangay.count >= 11
        ? "High"
        : barangay.count >= 6
          ? "Medium"
          : "Low";

  const densityColor =
    density === "Very High"
      ? "bg-purple-500"
      : density === "High"
        ? "bg-red-500"
        : density === "Medium"
          ? "bg-orange-500"
          : "bg-emerald-500";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-xs font-black text-slate-700">
            Barangay {barangay.name}
          </h4>

          <p className="text-xs text-slate-400 mt-1">
            {barangay.count} devices available
          </p>
        </div>

        <div
          className={`w-2.5 h-2.5 rounded-full ${densityColor}`}
          title={`${density} density`}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">
            Total Value
          </span>

          <span className="text-xs font-bold text-[#3285a1]">
            ₱{barangay.totalValue.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">
            High Value
          </span>

          <span className="text-xs font-bold text-purple-500">
            {barangay.highValue} devices
          </span>
        </div>
      </div>

      <button
        onClick={onView}
        className="w-full mt-4 py-2.5 rounded-lg bg-slate-50 hover:bg-[#769c2d] hover:text-white text-[#769c2d] text-xs font-black transition-all flex items-center justify-center gap-1"
      >
        View {barangay.count} Listings
        <ArrowRight size={12} />
      </button>
    </div>
  );
};

export default UrbanMineMap;