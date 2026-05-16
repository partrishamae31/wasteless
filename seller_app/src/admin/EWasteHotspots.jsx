import React from "react";
import {
  Map,
  Users,
  Activity,
  Cpu,
  Layers3,
  Filter,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";

const EWasteHotspots = () => {
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

  const hotspots = [
    {
      barangay: "Barangay 1",
      intensity: "Very High",
      devices: 25,
      color: "bg-red-500",
      glow: "bg-red-400/40",
      trend: "+",
    },
    {
      barangay: "Barangay Marulas",
      intensity: "High",
      devices: 15,
      color: "bg-orange-500",
      glow: "bg-orange-400/40",
      trend: "+",
    },
    {
      barangay: "Barangay 2",
      intensity: "High",
      devices: 12,
      color: "bg-amber-500",
      glow: "bg-amber-400/40",
      trend: "-",
    },
    {
      barangay: "Barangay San Roque",
      intensity: "Medium",
      devices: 9,
      color: "bg-yellow-400",
      glow: "bg-yellow-300/40",
      trend: "+",
    },
  ];

  const mapPoints = [
    { size: "w-24 h-24", pos: "left-[38%] top-[52%]", color: "bg-red-500/35" },
    { size: "w-16 h-16", pos: "left-[48%] top-[45%]", color: "bg-orange-500/35" },
    { size: "w-14 h-14", pos: "left-[55%] top-[38%]", color: "bg-orange-400/35" },
    { size: "w-12 h-12", pos: "left-[63%] top-[33%]", color: "bg-amber-400/35" },
    { size: "w-8 h-8", pos: "left-[22%] top-[68%]", color: "bg-emerald-400/40" },
    { size: "w-10 h-10", pos: "left-[30%] top-[62%]", color: "bg-emerald-400/40" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="mb-5">
          <h1 className="text-[28px] font-semibold text-[#1E293B]">
            E-Waste Hotspots
          </h1>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
        </div>

        {/* MAP SECTION */}
        <div className="bg-white border border-[#E8EDF5] rounded-3xl p-5 shadow-sm">
          {/* TITLE */}
          <div className="flex items-center gap-2 mb-1">
            <Map className="text-[#3B82F6]" size={20} />
            <h2 className="text-[24px] font-semibold text-slate-700">
              E-Waste Hotspot Map
            </h2>
          </div>

          <p className="text-sm text-slate-400 mb-6">
            Visualize e-waste generation intensity across barangays
          </p>

          {/* SUMMARY BOXES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              ["Total Data Points", "75"],
              ["Active Barangays", "8"],
              ["High Intensity Zones", "3"],
              ["Top Category", "Tablet"],
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
              {["Intensity Level", "Device Type", "Time Period"].map(
                (item, i) => (
                  <div
                    key={i}
                    className="h-11 px-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <span className="text-sm text-slate-400">{item}</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                )
              )}
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
                {/* helper */}
                <div className="absolute top-4 left-4 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-400 shadow-sm">
                  Click on hotspots for details
                </div>

                {/* hotspot circles */}
                {mapPoints.map((point, i) => (
                  <div
                    key={i}
                    className={`absolute ${point.pos} ${point.size} rounded-full ${point.color} flex items-center justify-center`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white/70"></div>
                  </div>
                ))}
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