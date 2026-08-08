import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

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
  const [hotspots, setHotspots] = useState([]);
  const [dropOffPoints, setDropOffPoints] = useState([]);
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

  const totalDevices = hotspots.reduce((sum, h) => sum + h.devices, 0);

  const activeBarangays = hotspots.length;

  const highZones = hotspots.filter(
    (h) => h.intensity === "High" || h.intensity === "Very High",
  ).length;

  const topBarangay = hotspots[0]?.barangay ?? "-";

  useEffect(() => {
    const loadHotspots = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
    id,
    barangay,
    status,
    created_at,
    drop_off_point_id,
    drop_off_points (
      id,
      name,
      barangay,
      city,
      address,
      latitude,
      longitude
    )
  `,
        )
        .eq("status", "completed");

      if (error) {
        console.error(error);
        return;
      }

      const grouped = {};

      data.forEach((transaction) => {
        const point = transaction.drop_off_points;

        if (!point) return;

        if (!grouped[point.id]) {
          grouped[point.id] = {
            id: point.id,
            name: point.name,
            barangay: point.barangay,
            city: point.city,
            address: point.address,
            latitude: Number(point.latitude),
            longitude: Number(point.longitude),
            devices: 0,
          };
        }

        grouped[point.id].devices += 1;
      });

      const points = Object.values(grouped);

      const maxDevices = Math.max(...points.map((point) => point.devices), 1);

      const hotspotData = points
        .map((point) => {
          const percentage = point.devices / maxDevices;

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
            ...point,
            intensity,
            color,
            trend: "+",
          };
        })
        .sort((a, b) => b.devices - a.devices);

      setHotspots(hotspotData);
    };

    loadHotspots();
  }, []);

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

          <p className="text-sm text-slate-400 mb-6">
            Visualize e-waste generation intensity across barangays
          </p>

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
              {["Intensity Level", "Device Type", "Time Period"].map(
                (item, i) => (
                  <div
                    key={i}
                    className="h-11 px-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <span className="text-sm text-slate-400">{item}</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                ),
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
              <div className="relative h-[520px] rounded-3xl overflow-hidden border border-[#E9EDF5]">
                <MapContainer
                  center={[14.676, 120.983]}
                  zoom={12}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {hotspots.map((spot) => {
                    let radius = 12;
                    let mapColor = "#34d399";

                    if (spot.intensity === "Medium") {
                      radius = 18;
                      mapColor = "#facc15";
                    }

                    if (spot.intensity === "High") {
                      radius = 25;
                      mapColor = "#f97316";
                    }

                    if (spot.intensity === "Very High") {
                      radius = 35;
                      mapColor = "#ef4444";
                    }

                    return (
                      <CircleMarker
                        key={spot.id}
                        center={[spot.latitude, spot.longitude]}
                        radius={radius}
                        pathOptions={{
                          color: mapColor,
                          fillColor: mapColor,
                          fillOpacity: 0.35,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div className="min-w-[200px]">
                            <h3 className="font-semibold text-slate-700">
                              {spot.name}
                            </h3>

                            <p className="text-xs text-slate-400 mt-1">
                              {spot.barangay}, {spot.city}
                            </p>

                            <div className="mt-3 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Devices</span>
                                <strong>{spot.devices}</strong>
                              </div>

                              <div className="flex justify-between">
                                <span>Intensity</span>
                                <strong>{spot.intensity}</strong>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>

                <div className="absolute top-4 left-4 z-[1000] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-400 shadow-sm">
                  Click on hotspots for details
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
