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

const UrbanMineMap = ({ isVerified }) => {
  const [mapData, setMapData] = useState([]);
  const [filter, setFilter] = useState("All Listings");
  const [loading, setLoading] = useState(true);
  const [selectedBarangay, setSelectedBarangay] = useState(null);

  useEffect(() => {
    fetchMapData();
  }, [filter]);

  const fetchMapData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        asking_price,
        status,
        profiles:seller_id (
          barangay
        )
      `,
      )
      .eq("status", "active");

    if (error) {
      console.error("Error loading Urban Mine Map:", error);
      setMapData([]);
      setLoading(false);
      return;
    }

    if (!data) {
      setMapData([]);
      setLoading(false);
      return;
    }

    const barangayGroups = data.reduce((acc, item) => {
      const barangay = item.profiles?.barangay;

      if (!barangay) return acc;

      if (!acc[barangay]) {
        acc[barangay] = {
          count: 0,
          totalValue: 0,
          highValue: 0,
        };
      }

      const price = Number(item.asking_price || 0);

      acc[barangay].count += 1;
      acc[barangay].totalValue += price;

      if (price > HIGH_VALUE_THRESHOLD) {
        acc[barangay].highValue += 1;
      }

      return acc;
    }, {});

    let formattedData = Object.entries(barangayGroups).map(
      ([name, values]) => ({
        name,
        ...values,
      }),
    );

    if (filter === "High Value") {
      formattedData = formattedData
        .filter((barangay) => barangay.highValue > 0)
        .sort((a, b) => b.totalValue - a.totalValue);
    }

    if (filter === "Nearby") {
      // Keeps the barangays closest to the center of the map.
      // Replace this later with browser geolocation if desired.
      formattedData = formattedData
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    }

    formattedData.sort((a, b) => b.count - a.count);

    setMapData(formattedData);
    setLoading(false);
  };

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

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      {/* ================= HEADER ================= */}
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

          <div className="flex items-center gap-2">
            {["All Listings", "High Value", "Nearby"].map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold border transition-all ${
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

        {/* ================= STATS ================= */}
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

      {/* ================= MAP ================= */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div
          className="relative h-[560px] overflow-hidden flex items-center justify-center"
          onClick={() => setSelectedBarangay(null)}
        >
          {/* Actual Valenzuela Barangay Map */}
          <div className="relative w-[700px] max-w-[90%] aspect-[429/350]">
            <img
              src={valenzuelaMap}
              alt="Valenzuela City Barangay Map"
              className="absolute inset-0 w-full h-full object-contain"
            />

            {/* Loading */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-40">
                <div className="bg-white px-5 py-3 rounded-xl shadow-lg">
                  <p className="text-xs font-bold text-slate-500">
                    Loading map data...
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Barangay Markers */}
            {!loading &&
              mapData.map((barangay) => {
                const position = BARANGAY_POSITIONS[barangay.name];

                // Don't display a marker if its barangay
                // doesn't have a configured position yet.
                if (!position) {
                  console.warn(
                    `No map position configured for barangay: ${barangay.name}`,
                  );
                  return null;
                }

                const density = getDensity(barangay.count);

                const isSelected = selectedBarangay?.name === barangay.name;

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

                        setSelectedBarangay(isSelected ? null : barangay);
                      }}
                      className="group relative"
                    >
                      {/* Colored Density Marker */}
                      <div
                        className="w-7 h-7 rounded-full border-[3px] border-white shadow-lg flex items-center justify-center transition-all duration-200 group-hover:scale-125"
                        style={{
                          backgroundColor: density.color,
                        }}
                      >
                        <MapPin size={14} className="text-white" fill="white" />
                      </div>

                      {/* Popup */}
                      {isSelected && (
                        <div
                          className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 bg-white rounded-xl border border-slate-200 shadow-2xl p-4 z-[100]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-[11px] font-black text-slate-800">
                            Barangay {barangay.name}
                          </p>

                          <p className="text-[9px] text-slate-400 mt-1">
                            {barangay.count} devices available
                          </p>

                          <div className="border-t border-slate-100 mt-3 pt-3 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-400">
                                Total Value
                              </span>

                              <span className="text-[9px] font-bold text-[#3285a1]">
                                ₱{barangay.totalValue.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-400">
                                High Value
                              </span>

                              <span className="text-[9px] font-bold text-purple-500">
                                {barangay.highValue} devices
                              </span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <span className="text-[8px] font-bold text-slate-400">
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

            {/* No data */}
            {!loading && mapData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-8 py-6 text-center">
                  <MapPin size={28} className="mx-auto text-slate-300 mb-2" />

                  <p className="text-sm font-bold text-slate-600">
                    No active listings found
                  </p>

                  <p className="text-[10px] text-slate-400 mt-1">
                    There are currently no listings for this filter.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* LOCATION CATEGORY KEY */}
          <div className="absolute bottom-5 left-5 bg-white rounded-lg border-2 border-[#163d73] shadow-lg overflow-hidden z-30">
            <div className="bg-[#163d73] px-3 py-2">
              <p className="text-[10px] font-black text-white uppercase tracking-wide">
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

        {/* DENSITY LEGEND */}
        <div className="border-t border-slate-200 px-5 py-3 flex items-center gap-7">
          <span className="text-[9px] font-bold text-slate-400">Density:</span>

          <LegendItem color="bg-green-500" label="Low (1-5)" />

          <LegendItem color="bg-orange-500" label="Medium (6-10)" />

          <LegendItem color="bg-red-500" label="High (11-20)" />

          <LegendItem color="bg-purple-500" label="Very High (20+)" />
        </div>
      </div>

      {/* ================= BARANGAY CARDS ================= */}
      <div className="grid grid-cols-3 gap-3">
        {mapData.length > 0 ? (
          mapData.map((barangay) => (
            <BarangayCard
              key={barangay.name}
              barangay={barangay}
              onView={() => setSelectedBarangay(barangay)}
            />
          ))
        ) : (
          <div className="col-span-3 py-16 text-center bg-white rounded-xl border border-slate-200">
            <MapPin size={28} className="mx-auto text-slate-300 mb-3" />

            <p className="text-sm font-bold text-slate-500">
              No active listings found for the Urban Mine Map.
            </p>
          </div>
        )}
      </div>
    </div>
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
        <p className="text-[9px] font-bold text-slate-400">{label}</p>

        <p className="text-xl font-black text-slate-800 mt-0.5">{value}</p>
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

      <span className="text-[8px] font-black text-slate-600">{label}</span>
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

      <span className="text-[9px] font-bold text-slate-500">{label}</span>
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

          <p className="text-[9px] text-slate-400 mt-1">
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
          <span className="text-[9px] font-bold text-slate-400">
            Total Value
          </span>

          <span className="text-[10px] font-bold text-[#3285a1]">
            ₱{barangay.totalValue.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400">
            High Value
          </span>

          <span className="text-[10px] font-bold text-purple-500">
            {barangay.highValue} devices
          </span>
        </div>
      </div>

      <button
        onClick={onView}
        className="w-full mt-4 py-2.5 rounded-lg bg-slate-50 hover:bg-[#769c2d] hover:text-white text-[#769c2d] text-[9px] font-black transition-all flex items-center justify-center gap-1"
      >
        View {barangay.count} Listings
        <ArrowRight size={12} />
      </button>
    </div>
  );
};

export default UrbanMineMap;
