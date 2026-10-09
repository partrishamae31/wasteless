import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

import {
  Map,
  Users,
  Activity,
  Cpu,
  Layers3,
  Filter,
  ChevronDown,
  ArrowUpRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const INTENSITY_OPTIONS = ["All", "Very High", "High", "Medium", "Low"];
const TIME_OPTIONS = ["All Time", "Last 7 Days", "Last 30 Days", "Last 90 Days"];

// Privacy-safe barangay centroids. These are area-level display anchors only and
// intentionally do not represent any Tech Owner/Dealer household or exact address.
const BARANGAY_POSITIONS = {
  ArkongBato: { left: "47%", top: "76%" },
  Bagbaguin: { left: "61%", top: "18%" },
  Balangkas: { left: "42%", top: "67%" },
  Bignay: { left: "53%", top: "14%" },
  Bisig: { left: "49%", top: "28%" },
  CanumayEast: { left: "45%", top: "22%" },
  CanumayWest: { left: "38%", top: "24%" },
  Coloong: { left: "26%", top: "37%" },
  Dalandanan: { left: "46%", top: "47%" },
  GenTDeLeon: { left: "60%", top: "52%" },
  Isla: { left: "30%", top: "74%" },
  Karuhatan: { left: "53%", top: "61%" },
  LawangBato: { left: "58%", top: "25%" },
  Lingunan: { left: "67%", top: "43%" },
  Mabolo: { left: "37%", top: "71%" },
  Malanday: { left: "37%", top: "43%" },
  Malinta: { left: "51%", top: "42%" },
  MapulangLupa: { left: "70%", top: "22%" },
  Marulas: { left: "59%", top: "68%" },
  Maysan: { left: "62%", top: "57%" },
  Palasan: { left: "42%", top: "74%" },
  PariancilloVilla: { left: "33%", top: "67%" },
  PasoDeBlas: { left: "73%", top: "39%" },
  Pasolo: { left: "28%", top: "66%" },
  Poblacion: { left: "36%", top: "79%" },
  Punturin: { left: "70%", top: "30%" },
  Rincon: { left: "31%", top: "56%" },
  Tagalag: { left: "21%", top: "69%" },
  Ugong: { left: "75%", top: "49%" },
  VienteReales: { left: "65%", top: "35%" },
  WawangPulo: { left: "22%", top: "59%" },
};

const normalizeBarangayKey = (name = "") =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^General/i, "Gen");

const fallbackPosition = (barangay = "") => {
  const seed = [...barangay].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    left: `${24 + (seed % 52)}%`,
    top: `${17 + ((seed * 7) % 66)}%`,
  };
};

const EWasteHotspots = () => {
  const [hotspots, setHotspots] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [listingMetadata, setListingMetadata] = useState({});
  const [intensityFilter, setIntensityFilter] = useState("All");
  const [deviceFilter, setDeviceFilter] = useState("All Devices");
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [renderError, setRenderError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const stats = [
    {
      title: "Total Users",
      value: "1,248",
      growth: "+12%",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Active Listings",
      value: "342",
      growth: "+8%",
      icon: Activity,
      color: "text-green-500",
    },
    {
      title: "Verified Users",
      value: "87",
      growth: "+18%",
      icon: Layers3,
      color: "text-violet-500",
    },
    {
      title: "Devices Catalogued",
      value: "456",
      growth: "+22%",
      icon: Cpu,
      color: "text-orange-500",
    },
  ];

  const loadHotspots = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErrorMessage("");
    setRenderError("");

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, barangay, status, created_at, drop_off_point_id, listing_id")
        .in("status", ["completed", "complete"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = data || [];
      setTransactions(rows);

      const listingIds = [...new Set(rows.map((row) => row.listing_id).filter(Boolean))];
      const metadata = {};

      if (listingIds.length > 0) {
        const { data: listings, error: listingError } = await supabase
          .from("listings")
          .select("id, category, device_model")
          .in("id", listingIds);

        if (listingError) {
          console.warn("Hotspot device metadata could not be loaded:", listingError);
        } else {
          (listings || []).forEach((listing) => {
            metadata[listing.id] = listing;
          });
        }
      }

      setListingMetadata(metadata);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading hotspots:", error);
      setTransactions([]);
      setListingMetadata({});
      setErrorMessage(
        "Unable to load e-waste hotspot data. Check the data connection, then try again.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotspots();

    const channel = supabase
      .channel("ewaste-hotspots-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => loadHotspots({ silent: true }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => loadHotspots({ silent: true }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadHotspots]);

  const deviceOptions = useMemo(() => {
    const values = new Set();
    Object.values(listingMetadata).forEach((listing) => {
      if (listing?.category) values.add(listing.category);
      else if (listing?.device_model) values.add(listing.device_model);
    });
    return ["All Devices", ...[...values].sort((a, b) => a.localeCompare(b))];
  }, [listingMetadata]);

  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    const maxAge =
      timeFilter === "Last 7 Days"
        ? 7
        : timeFilter === "Last 30 Days"
          ? 30
          : timeFilter === "Last 90 Days"
            ? 90
            : null;

    return transactions.filter((transaction) => {
      if (!transaction.barangay) return false;

      if (maxAge) {
        const createdAt = new Date(transaction.created_at).getTime();
        if (!Number.isFinite(createdAt)) return false;
        const ageDays = (now - createdAt) / 86400000;
        if (ageDays > maxAge) return false;
      }

      if (deviceFilter !== "All Devices") {
        const listing = listingMetadata[transaction.listing_id];
        const deviceValue = listing?.category || listing?.device_model || "";
        if (deviceValue !== deviceFilter) return false;
      }

      return true;
    });
  }, [transactions, listingMetadata, deviceFilter, timeFilter]);

  const computedHotspots = useMemo(() => {
    try {
      const grouped = {};
      filteredTransactions.forEach((transaction) => {
        const barangay = transaction.barangay?.trim();
        if (!barangay) return;
        grouped[barangay] = (grouped[barangay] || 0) + 1;
      });

      const counts = Object.values(grouped);
      const maxDevices = Math.max(...counts, 1);

      return Object.entries(grouped)
        .map(([barangay, devices]) => {
          const percentage = devices / maxDevices;
          let intensity = "Low";
          let color = "bg-emerald-400";

          if (percentage >= 0.75) {
            intensity = "Very High";
            color = "bg-red-500";
          } else if (percentage >= 0.5) {
            intensity = "High";
            color = "bg-orange-500";
          } else if (percentage >= 0.25) {
            intensity = "Medium";
            color = "bg-yellow-400";
          }

          return {
            barangay,
            devices,
            intensity,
            color,
            trend: "+",
            position:
              BARANGAY_POSITIONS[normalizeBarangayKey(barangay)] ||
              fallbackPosition(barangay),
          };
        })
        .sort((a, b) => b.devices - a.devices);
    } catch (error) {
      console.error("Hotspot visualization processing error:", error);
      return [];
    }
  }, [filteredTransactions]);

  useEffect(() => {
    try {
      const visible =
        intensityFilter === "All"
          ? computedHotspots
          : computedHotspots.filter((spot) => spot.intensity === intensityFilter);
      setHotspots(visible);
      setRenderError("");
    } catch (error) {
      console.error("Hotspot rendering error:", error);
      setHotspots([]);
      setRenderError(
        "The hotspot visualization could not be rendered. Refresh the map to try again.",
      );
    }
  }, [computedHotspots, intensityFilter]);

  const totalDevices = hotspots.reduce((sum, h) => sum + h.devices, 0);
  const activeBarangays = hotspots.length;
  const highZones = hotspots.filter(
    (h) => h.intensity === "High" || h.intensity === "Very High",
  ).length;
  const topBarangay = hotspots[0]?.barangay ?? "-";
  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="mb-5">
          {/* <h1 className="text-[28px] font-semibold text-[#1E293B]">
            E-Waste Hotspots
          </h1> */}
        </div>

        {/* TOP STATS */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {stats.map((item, i) => {
            const Icon = item.icon;

            return (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E9EEF5] px-5 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] text-slate-400 mb-2">
                      {item.title}
                    </p>

                    <h2 className="text-3xl font-semibold text-slate-700">
                      {item.value}
                    </h2>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] font-medium text-emerald-500 mb-3">
                      {item.growth}
                    </p>

                    <div
                      className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${item.color}`}
                    >
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div> */}

        {/* MAP SECTION */}
        <div className="bg-white border border-[#E8EDF5] rounded-3xl p-5 shadow-sm">
          {/* TITLE */}
          <div className="flex items-center gap-2 mb-1">
            <Map className="text-[#3B82F6]" size={20} />
            <h2 className="text-[24px] font-semibold text-slate-700">
              E-Waste Hotspot Map
            </h2>
          </div>

          <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Visualize privacy-safe e-waste generation intensity across Valenzuela City barangays
            </p>

            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-[11px] text-slate-400">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                type="button"
                onClick={() => loadHotspots()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh Map
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Hotspot data could not be loaded</p>
                <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => loadHotspots()}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Retry
              </button>
            </div>
          )}

          {/* SUMMARY BOXES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              ["Total Data Points", totalDevices],
              ["Active Barangays", activeBarangays],
              ["High Intensity Zones", highZones],
              ["Top Hotspot", topBarangay],
            ].map((item, i) => (
              <div
                key={i}
                className="border border-[#EEF2F7] rounded-2xl px-5 py-4 bg-[#FCFDFE]"
              >
                <p className="text-[12px] text-slate-400 mb-2">{item[0]}</p>

                <h3
                  className={`text-2xl font-semibold ${
                    i === 2 ? "text-red-500" : "text-slate-700"
                  }`}
                >
                  {item[1]}
                </h3>
              </div>
            ))}
          </div>

          {/* FILTERS */}
          <div className="border border-[#EEF2F7] rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                Filters
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="relative">
                <span className="sr-only">Hotspot intensity</span>
                <select
                  value={intensityFilter}
                  onChange={(event) => setIntensityFilter(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-600 outline-none focus:border-blue-400"
                >
                  {INTENSITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "All" ? "All Intensity Levels" : `${option} Intensity`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-3.5 text-slate-400" />
              </label>

              <label className="relative">
                <span className="sr-only">Device type</span>
                <select
                  value={deviceFilter}
                  onChange={(event) => setDeviceFilter(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-600 outline-none focus:border-blue-400"
                >
                  {deviceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-3.5 text-slate-400" />
              </label>

              <label className="relative">
                <span className="sr-only">Time period</span>
                <select
                  value={timeFilter}
                  onChange={(event) => setTimeFilter(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-600 outline-none focus:border-blue-400"
                >
                  {TIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-3.5 text-slate-400" />
              </label>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* MAP */}
            <div className="xl:col-span-8 border border-[#EEF2F7] rounded-3xl p-4 bg-[#FCFCFD]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-700">
                  Barangay Heatmap
                </h3>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-slate-400">Very High</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span className="text-slate-400">High</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    <span className="text-slate-400">Medium</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-slate-400">Low</span>
                  </div>
                </div>
              </div>

              {/* MAP CANVAS */}
              <div className="relative h-[520px] rounded-3xl bg-[#F4F6FA] overflow-hidden border border-[#E9EDF5]">
                {/* Privacy notice */}
                <div className="absolute top-4 left-4 z-10 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-400 shadow-sm">
                  E-waste activity is shown by area for privacy.
                </div>

                {/* Hotspot visualization */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {loading ? (
                    <div className="text-center">
                      <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-slate-400" />
                      <p className="text-sm font-medium text-slate-500">Loading hotspot data...</p>
                    </div>
                  ) : renderError ? (
                    <div className="max-w-sm px-6 text-center">
                      <AlertCircle size={24} className="mx-auto mb-3 text-red-500" />
                      <p className="text-sm font-semibold text-red-600">Visualization error</p>
                      <p className="mt-1 text-xs text-slate-400">{renderError}</p>
                      <button
                        type="button"
                        onClick={() => loadHotspots()}
                        className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Refresh Map
                      </button>
                    </div>
                  ) : errorMessage ? (
                    <div className="max-w-sm px-6 text-center">
                      <AlertCircle size={24} className="mx-auto mb-3 text-red-400" />
                      <p className="text-sm font-medium text-slate-500">Hotspot map unavailable.</p>
                      <p className="mt-1 text-xs text-slate-400">No private location details are displayed while data is unavailable.</p>
                    </div>
                  ) : hotspots.length === 0 ? (
                    <div className="max-w-sm px-6 text-center">
                      <Map size={28} className="mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No hotspot data for the selected filters.
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Completed transactions with barangay-level location data will appear here. Exact household addresses are never shown.
                      </p>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      <div className="absolute inset-[10%] rounded-[45%] border border-dashed border-slate-300/70 bg-white/20" />
                      {hotspots.map((spot) => {
                        let size = "w-12 h-12";
                        let color = "bg-emerald-400/40";

                        if (spot.intensity === "Medium") {
                          size = "w-16 h-16";
                          color = "bg-yellow-400/45";
                        }

                        if (spot.intensity === "High") {
                          size = "w-20 h-20";
                          color = "bg-orange-500/45";
                        }

                        if (spot.intensity === "Very High") {
                          size = "w-28 h-28";
                          color = "bg-red-500/45";
                        }

                        return (
                          <div
                            key={spot.barangay}
                            className={`group absolute ${size} ${color} rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300`}
                            style={{ left: spot.position.left, top: spot.position.top }}
                            title={`${spot.barangay}: ${spot.devices} recovered device${spot.devices === 1 ? "" : "s"} (${spot.intensity})`}
                          >
                            <div className="w-4 h-4 rounded-full bg-white/90 shadow-sm" />
                            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden min-w-max -translate-x-1/2 rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
                              {spot.barangay} · {spot.devices} devices
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DETAILS */}
            <div className="xl:col-span-4 border border-[#EEF2F7] rounded-3xl p-4 bg-[#FCFCFD]">
              <h3 className="text-sm font-medium text-slate-700 mb-4">
                Hotspot Details
              </h3>

              <div className="space-y-4">
                {hotspots.map((spot, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#EEF2F7] rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700">
                          {spot.barangay}
                        </h4>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`w-2 h-2 rounded-full ${spot.color}`}
                          ></span>

                          <span className="text-xs text-slate-400">
                            {spot.intensity} Intensity
                          </span>
                        </div>
                      </div>

                      <ArrowUpRight
                        size={16}
                        className={`${
                          spot.trend === "+"
                            ? "text-emerald-500"
                            : "text-slate-300"
                        }`}
                      />
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Devices</span>
                        <span className="font-semibold text-slate-700">
                          {spot.devices}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EWasteHotspots;
