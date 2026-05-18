import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Search,
  Package,
  Eye,
  Clock3,
  X,
  Star,
} from "lucide-react";
import MatchingListingsView from "./MatchingListingsView";

const HarvesterAlerts = ({ session, isVerified }) => {
  const [alerts, setAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAlertForMatches, setSelectedAlertForMatches] = useState(null);

  const [formData, setFormData] = useState({
    device_model: "",
    condition: "Defective",
    max_price: "",
    preferred_barangay: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, [session.user.id]);

  const fetchAlerts = async () => {
    setLoading(true);

    const { data: alertsData } = await supabase
      .from("alerts")
      .select("*")
      .eq("harvester_id", session.user.id);

    if (alertsData) {
      const alertsWithMatches = await Promise.all(
        alertsData.map(async (alert) => {
          const { count } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true })
            .eq("status", "active")
            .ilike("device_model", `%${alert.device_model}%`)
            .lte("asking_price", alert.max_price)
            .eq("condition", alert.condition);

          return {
            ...alert,
            matchCount: count || 0,
          };
        }),
      );

      setAlerts(alertsWithMatches);
    }

    setLoading(false);
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();

    setError("");

    const price = parseFloat(formData.max_price);

    if (isNaN(price) || price <= 0) {
      setError("Maximum price must be greater than zero.");
      return;
    }

    const { error: insertError } = await supabase.from("alerts").insert([
      {
        harvester_id: session.user.id,
        device_model: formData.device_model,
        condition: formData.condition,
        max_price: price,
        preferred_barangay: formData.preferred_barangay || null,
      },
    ]);

    if (!insertError) {
      setIsModalOpen(false);

      setFormData({
        device_model: "",
        condition: "Defective",
        max_price: "",
        preferred_barangay: "",
      });

      fetchAlerts();
    }
  };

  const deleteAlert = async (id) => {
    await supabase.from("alerts").delete().eq("id", id);
    fetchAlerts();
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] p-6">
      {selectedAlertForMatches ? (
        <MatchingListingsView
          alert={selectedAlertForMatches}
          onBack={() => setSelectedAlertForMatches(null)}
        />
      ) : (
        <div className="max-w-5xl mx-auto">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-gray-800">
                Component Alerts
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Get notified when matching listings are posted
              </p>
            </div>

            <button
              onClick={() =>
                isVerified
                  ? setIsModalOpen(true)
                  : alert("Verification required.")
              }
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                isVerified
                  ? "bg-[#78A22F] hover:bg-[#6d9328] text-white shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Plus size={16} />
              Create Alert
            </button>
          </div>

          {/* SUMMARY CARD */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Component Alerts
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Get notified whenever new matching listings are found
                </p>
              </div>

              <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all">
                Create New
              </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-4 gap-4 mb-5">
              <div className="border border-gray-100 rounded-xl p-4 text-center bg-[#fafafa]">
                <Bell className="mx-auto text-[#78A22F] mb-2" size={18} />
                <h3 className="text-lg font-bold text-gray-800">
                  {alerts.length}
                </h3>
                <p className="text-[11px] text-gray-400">Active Alerts</p>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 text-center bg-[#fafafa]">
                <Search className="mx-auto text-blue-500 mb-2" size={18} />
                <h3 className="text-lg font-bold text-gray-800">
                  {alerts.reduce(
                    (acc, curr) => acc + (curr.matchCount || 0),
                    0,
                  )}
                </h3>
                <p className="text-[11px] text-gray-400">New Matches</p>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 text-center bg-[#fafafa]">
                <AlertCircle
                  className="mx-auto text-orange-500 mb-2"
                  size={18}
                />
                <h3 className="text-lg font-bold text-gray-800">
                  {alerts.filter((item) => item.matchCount > 0).length}
                </h3>
                <p className="text-[11px] text-gray-400">High Priority</p>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 text-center bg-[#fafafa]">
                <Package className="mx-auto text-gray-500 mb-2" size={18} />
                <h3 className="text-lg font-bold text-gray-800">
                  {alerts.length}
                </h3>
                <p className="text-[11px] text-gray-400">Total Monitors</p>
              </div>
            </div>

            {/* MATCHES SECTION */}
            <div className="bg-[#edf8ed] border border-[#cce8cc] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={18} className="text-[#78A22F]" />

                <div>
                  <h3 className="text-sm font-semibold text-[#3b6b18]">
                    New Listings Match Your Alerts!
                  </h3>

                  <p className="text-xs text-[#5d7d4b]">
                    We found listings that match your monitoring criteria.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {alerts
                  .filter((alert) => alert.matchCount > 0)
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-white border border-[#d6ead1] rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-800 text-sm">
                            {alert.device_model}
                          </h3>

                          <span className="bg-[#78A22F] text-white text-[10px] px-2 py-1 rounded-full font-medium">
                            {alert.matchCount} MATCHES
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <CheckCircle2
                              size={12}
                              className="text-green-500"
                            />
                            {alert.condition}
                          </span>

                          <span className="flex items-center gap-1">
                            <Search size={12} className="text-blue-500" />₱
                            {alert.max_price.toLocaleString()}
                          </span>

                          {alert.preferred_barangay && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-orange-500" />
                              {alert.preferred_barangay}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedAlertForMatches(alert)}
                        className="flex items-center gap-2 bg-[#78A22F] hover:bg-[#6d9328] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Eye size={14} />
                        View Matches
                      </button>
                    </div>
                  ))}

                {alerts.filter((a) => a.matchCount > 0).length === 0 && (
                  <div className="text-center py-6 text-sm text-gray-500">
                    No new matches available right now.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ALERT CARDS */}
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white border border-orange-200 rounded-2xl p-5 shadow-sm overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
                      <Bell size={18} className="text-orange-500" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-bold text-gray-800 text-lg">
                          {alert.device_model}
                        </h2>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-bold uppercase tracking-tight">
                          Active
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center gap-1">
                          <span className="text-xs">☆</span> High Priority
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">
                          {alert.condition}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Search size={14} className="opacity-60" />
                          <span>
                            Max Price: ₱{alert.max_price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={14} className="opacity-60" />
                          <span>{alert.preferred_barangay || "Anywhere"}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">
                          Created 5/1/2026 • Last match: 4/28/2026
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* NEW MATCHES BANNER (As seen in mockup) */}
                {alert.matchCount > 0 && (
                  <div className="mt-4 bg-[#e8f9ee] border border-[#d1f2db] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1a7a3a] font-bold text-sm">
                        {alert.matchCount} matching listings found
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedAlertForMatches(alert)}
                      className="bg-[#00a843] hover:bg-[#008f39] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      View & Bid
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 mt-3 px-1">
                  Triggered {alert.matchCount} times
                </p>
              </div>
            ))}

            {!loading && alerts.length === 0 && (
              <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 text-center">
                <Bell size={40} className="mx-auto text-gray-300 mb-3" />

                <h3 className="font-semibold text-gray-500 mb-1">
                  No Active Alerts
                </h3>

                <p className="text-sm text-gray-400">
                  Create your first monitoring alert.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            {/* HEADER WITH GRADIENT */}
            <div className="bg-gradient-to-r from-[#FF833D] to-[#FF3D3D] p-8 text-white relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    Configure Component Alert
                  </h2>
                  <p className="text-white/80 text-sm">
                    Get notified when matching components are listed
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-500 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateAlert} className="space-y-6">
                {/* DEVICE MODEL */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-1">
                    Device Model <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Package
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g., iPhone 11, MacBook Pro, Samsung Galaxy S20"
                      value={formData.device_model}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          device_model: e.target.value,
                        })
                      }
                      className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Enter the device model you're looking for
                  </p>
                </div>

                {/* COMPONENT CONDITION GRID */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-3 block">
                    Component Condition <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: "Any Condition",
                        sub: "Working, defective, or parts-only",
                      },
                      { id: "Working", sub: "Fully functional devices" },
                      { id: "Defective", sub: "Some parts not working" },
                      { id: "Parts Only", sub: "For harvesting components" },
                    ].map((cond) => (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, condition: cond.id })
                        }
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          formData.condition === cond.id
                            ? "border-orange-500 bg-orange-50/50"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <p className="text-sm font-bold text-slate-800">
                          {cond.id}
                        </p>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {cond.sub}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PRICE AND BARANGAY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Maximum Price (₱) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="number"
                        required
                        placeholder="e.g., 5000"
                        value={formData.max_price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_price: e.target.value,
                          })
                        }
                        className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Preferred Barangay{" "}
                      <span className="text-slate-400 font-normal">
                        (Optional)
                      </span>
                    </label>
                    <div className="relative">
                      <MapPin
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="e.g., Barangay Marulas"
                        value={formData.preferred_barangay}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            preferred_barangay: e.target.value,
                          })
                        }
                        className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* ALERT PRIORITY */}
                {/* <div>
                  <label className="text-sm font-bold text-slate-700 mb-3 block">
                    Alert Priority
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, priority: "Normal" })
                      }
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        formData.priority !== "High"
                          ? "border-blue-500 bg-blue-50/50"
                          : "border-slate-100"
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-800">Normal</p>
                      <p className="text-[10px] text-slate-500">
                        Standard notifications
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, priority: "High" })
                      }
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        formData.priority === "High"
                          ? "border-orange-500 bg-orange-50/50"
                          : "border-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Star size={12} className="text-orange-500" />
                        <p className="text-sm font-bold text-slate-800">
                          High Priority
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Instant dashboard alerts
                      </p>
                    </button>
                  </div>
                </div> */}

                {/* FOOTER BUTTONS */}
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 border border-slate-200 rounded-2xl py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#FF833D] to-[#FF3D3D] hover:opacity-90 text-white rounded-2xl py-4 text-sm font-bold shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Bell size={18} />
                    Create Alert
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HarvesterAlerts;
