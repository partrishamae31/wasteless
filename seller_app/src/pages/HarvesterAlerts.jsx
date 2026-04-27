import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Bell, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import MatchingListingsView from "./MatchingListingsView"; 

const HarvesterAlerts = ({ session }) => {
  const [alerts, setAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAlertForMatches, setSelectedAlertForMatches] = useState(null);

  // Form State for REQ-1
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

    // 1. Fetch the user's active alerts
    const { data: alertsData, error: alertsError } = await supabase
      .from("alerts")
      .select("*")
      .eq("harvester_id", session.user.id);

    if (alertsData) {
      const alertsWithMatches = await Promise.all(
        alertsData.map(async (alert) => {
          const { count, error: countError } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true })
            .eq("status", "active")
            .ilike("device_model", `%${alert.device_model}%`)
            .lte("asking_price", alert.max_price)
            .eq("condition", alert.condition);

          return { ...alert, matchCount: count || 0 };
        }),
      );

      setAlerts(alertsWithMatches);
    }
    setLoading(false);
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setError("");

    // 11.2.2 Negative Flow Validation
    const price = parseFloat(formData.max_price);
    if (isNaN(price) || price <= 0) {
      setError("Maximum price must be a number greater than zero.");
      return;
    }

    // 11.2.1.1 Positive Flow: Save alert criteria
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
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* CONDITIONAL VIEW TOGGLE: 
        If an alert is selected, show MatchingListingsView. 
        Otherwise, show the Alerts Dashboard.
      */}
      {selectedAlertForMatches ? (
        <MatchingListingsView
          alert={selectedAlertForMatches}
          onBack={() => setSelectedAlertForMatches(null)}
        />
      ) : (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Component Alerts
              </h2>
              <p className="text-sm text-slate-500">
                Get notified when matching devices are listed
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#5c8d27] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-[#4a721f] shadow-lg shadow-lime-900/10 transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={3} /> Create Alert
            </button>
          </div>

          {/* Stats Row */}
          <div className="flex gap-8 mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <div>
              <span className="block text-2xl font-black text-slate-800">
                {alerts.length}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                Active Alerts
              </span>
            </div>

            <div className="border-l border-slate-100 pl-8">
              <span className="block text-2xl font-black text-[#5c8d27]">
                {alerts.reduce((acc, curr) => acc + (curr.matchCount || 0), 0)}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                Total Matches
              </span>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center hover:border-[#5c8d27]/30 transition-colors group"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-emerald-50 rounded-2xl text-[#5c8d27] group-hover:scale-110 transition-transform">
                      <Bell size={24} fill="currentColor" fillOpacity={0.1} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-800 text-lg tracking-tight">
                          {alert.device_model}
                        </h3>
                        {/* Match Count Badge */}
                        {alert.matchCount > 0 ? (
                          <span className="bg-[#5c8d27] text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                            {alert.matchCount} NEW
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                            Monitoring
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">
                        {alert.condition} • Max ₱
                        {alert.max_price.toLocaleString()}
                        {alert.preferred_barangay &&
                          ` • ${alert.preferred_barangay}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* VIEW MATCHES BUTTON */}
                    <button
                      onClick={() => setSelectedAlertForMatches(alert)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-[#5c8d27] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <CheckCircle size={16} /> View
                    </button>

                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <Bell size={48} className="mx-auto mb-4 text-slate-100" />
                <p className="font-black text-slate-300 uppercase text-xs tracking-[0.2em]">
                  No alerts configured
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for 11.2.1.1 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            {/* Header with Icon */}
            <div className="flex flex-col items-center pt-10 pb-6 px-8">
              <div className="w-20 h-20 bg-[#f0f9ee] rounded-full flex items-center justify-center text-[#5c8d27] mb-6">
                <Bell size={32} fill="currentColor" fillOpacity={0.2} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight text-center">
                Set Component Alert
              </h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                Configure real-time tracking
              </p>
            </div>

            <form onSubmit={handleCreateAlert} className="p-10 pt-4 space-y-8">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-2xl flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="space-y-6">
                {/* Model Name Input */}
                <div className="group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-[#5c8d27] transition-colors">
                    Target Device / Model
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. iPhone 13 Pro Max"
                    className="w-full bg-transparent border-b-2 border-slate-100 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#5c8d27] transition-all"
                    value={formData.device_model}
                    onChange={(e) =>
                      setFormData({ ...formData, device_model: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Condition Select */}
                  <div className="group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-[#5c8d27]">
                      Min. Condition
                    </label>
                    <select
                      className="w-full bg-transparent border-b-2 border-slate-100 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#5c8d27] transition-all"
                      value={formData.condition}
                      onChange={(e) =>
                        setFormData({ ...formData, condition: e.target.value })
                      }
                    >
                      <option>Working</option>
                      <option>Defective</option>
                      <option>Parts Only</option>
                    </select>
                  </div>

                  {/* Price Input */}
                  <div className="group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-[#5c8d27]">
                      Budget (Max ₱)
                    </label>
                    <input
                      required
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-transparent border-b-2 border-slate-100 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#5c8d27] transition-all"
                      value={formData.max_price}
                      onChange={(e) =>
                        setFormData({ ...formData, max_price: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Barangay Input */}
                <div className="group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-[#5c8d27]">
                    Preferred Location
                  </label>
                  <input
                    type="text"
                    placeholder="Any Barangay"
                    className="w-full bg-transparent border-b-2 border-slate-100 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#5c8d27] transition-all"
                    value={formData.preferred_barangay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferred_barangay: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-[#5c8d27] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-lime-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Activate Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HarvesterAlerts;
