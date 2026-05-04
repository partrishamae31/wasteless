import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  MapPin,
  Info,
  ArrowRight,
  LayoutGrid,
  TrendingUp,
  Coins,
} from "lucide-react";

const UrbanMineMap = ({ isVerified }) => {
  const [mapData, setMapData] = useState([]);
  const [filter, setFilter] = useState("All Listings"); // REQ-2
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMapData();
  }, [filter]);

  const fetchMapData = async () => {
    setLoading(true);

    // Joins the listings table with the profiles table using seller_id
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

    if (data) {
      const barangayGroups = data.reduce((acc, item) => {
        // Access the barangay from the joined profile object
        const b = item.profiles?.barangay;

        if (b) {
          if (!acc[b]) acc[b] = { count: 0, totalValue: 0, highValue: 0 };

          acc[b].count += 1;
          acc[b].totalValue += Number(item.asking_price || 0);
          if (item.asking_price > 5000) acc[b].highValue += 1;
        }
        return acc;
      }, {});

      const formattedData = Object.keys(barangayGroups).map((key) => ({
        name: key,
        ...barangayGroups[key],
      }));

      setMapData(formattedData);
    }
    setLoading(false);
  };

  const getDensityColor = (count) => {
    if (count >= 20) return "bg-purple-500";
    if (count >= 11) return "bg-red-500";
    if (count >= 6) return "bg-orange-500";
    return "bg-[#769c2d]"; // Low (1-5)
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Filter (REQ-2) */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Urban Mine Map</h2>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
            E-waste availability across Valenzuela City
          </p>
        </div>
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex gap-1 shadow-sm">
          {["All Listings", "High Value", "Nearby"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f
                  ? "bg-[#769c2d] text-white shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-6">
        <MapStat
          icon={<LayoutGrid />}
          label="Active Barangays"
          value={mapData.length}
          sub="of 33 total"
          color="bg-blue-50 text-blue-600"
        />
        <MapStat
          icon={<TrendingUp />}
          label="Total Devices"
          value={mapData.reduce((a, b) => a + b.count, 0)}
          sub="Across City"
          color="bg-emerald-50 text-emerald-600"
        />
        <MapStat
          icon={<TrendingUp />}
          label="High Value"
          value={mapData.reduce((a, b) => a + b.highValue, 0)}
          sub="Devices @ Risk"
          color="bg-purple-50 text-purple-600"
        />
        <MapStat
          icon={<Coins />}
          label="Total Value"
          value={`₱${(mapData.reduce((a, b) => a + b.totalValue, 0) / 1000).toFixed(1)}k`}
          sub="Market Est."
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Privacy Banner (REQ-3) */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4 text-blue-800">
        <Info size={20} className="shrink-0" />
        <p className="text-[10px] font-bold leading-relaxed">
          <span className="font-black uppercase mr-2">Privacy Protection:</span>
          Map displays data at barangay-level only. Exact seller locations are
          never shown to protect privacy and security.
        </p>
      </div>

      {/* Map Mockup Area */}
      <div className="bg-slate-50 border-2 border-white rounded-[3rem] h-[500px] relative overflow-hidden shadow-inner flex items-center justify-center">
        <div className="absolute inset-0 opacity-10 grayscale pointer-events-none bg-[url('https://www.valenzuela.gov.ph/images/map_valenzuela.png')] bg-center bg-no-repeat bg-contain" />

        {/* Render Pins based on Data Density (REQ-1) */}
        <div className="relative w-full h-full">
          {mapData.map((b, i) => (
            <div
              key={i}
              className="absolute group cursor-pointer"
              style={{
                top: `${20 + ((i * 12) % 60)}%`,
                left: `${15 + ((i * 18) % 70)}%`,
              }}
            >
              <div
                className={`p-2 rounded-full ${getDensityColor(b.count)} text-white shadow-lg group-hover:scale-110 transition-transform`}
              >
                <MapPin size={16} />
              </div>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl border border-slate-100 hidden group-hover:block z-50 whitespace-nowrap">
                <p className="text-[10px] font-black text-slate-800 uppercase">
                  {b.name}
                </p>
                <p className="text-[9px] font-bold text-slate-400">
                  {b.count} active listings
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-8 left-8 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex gap-6 items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Density:
          </span>
          <LegendItem color="bg-[#769c2d]" label="Low (1-5)" />
          <LegendItem color="bg-orange-500" label="Medium (6-10)" />
          <LegendItem color="bg-red-500" label="High (11-20)" />
          <LegendItem color="bg-purple-500" label="Very High (20+)" />
        </div>
      </div>

      {/* Grid of Barangay Cards */}
      <div className="grid grid-cols-3 gap-6">
        {mapData.length > 0 ? (
          mapData.map((b) => <BarangayCard key={b.name} b={b} />)
        ) : (
          <div className="col-span-3 py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              No active listings found for the Urban Mine Map.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const MapStat = ({ icon, label, value, sub, color }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-white shadow-sm flex items-center gap-4">
    <div
      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}
    >
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-black text-slate-800">{value}</span>
        <span className="text-[9px] font-bold text-slate-400">{sub}</span>
      </div>
    </div>
  </div>
);

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <span className="text-[9px] font-bold text-slate-500">{label}</span>
  </div>
);

const BarangayCard = ({ b }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <h4 className="font-black text-slate-800 text-sm">{b.name}</h4>
      <div
        className={`w-2 h-2 rounded-full ${b.count > 10 ? "bg-red-500" : "bg-[#769c2d]"}`}
      />
    </div>
    <p className="text-[10px] font-bold text-slate-400 mb-4">
      {b.count} devices available
    </p>
    <div className="space-y-2 mb-6">
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-slate-300 uppercase">Total Value</span>
        <span className="text-[#3285a1]">₱{b.totalValue.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-slate-300 uppercase">High Value</span>
        <span className="text-purple-500">{b.highValue} devices</span>
      </div>
    </div>
    <button className="w-full py-3 bg-slate-50 hover:bg-[#769c2d] hover:text-white text-slate-400 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2">
      View Listings <ArrowRight size={14} />
    </button>
  </div>
);

export default UrbanMineMap;
