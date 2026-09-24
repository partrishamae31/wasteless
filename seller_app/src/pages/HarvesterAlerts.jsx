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
  X,
} from "lucide-react";
import MatchingListingsView from "./MatchingListingsView";

const HarvesterAlerts = ({ session, isVerified }) => {
  const [alerts, setAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAlertForMatches, setSelectedAlertForMatches] =
    useState(null);

  const [formData, setFormData] = useState({
    device_model: "",
    max_price: "",
    preferred_barangay: "",
  });

  const [error, setError] = useState("");

  /*
   * IMPORTANT:
   * Repair Shop alerts are ONLY for Not Working listings.
   *
   * Your database may still contain older records using "Defective".
   * Therefore matching supports BOTH:
   *
   *   "Not Working"
   *   "Defective"
   *
   * New alerts are saved as "Not Working".
   */
  const NOT_WORKING_CONDITIONS = ["Not Working", "Defective"];

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchAlerts();
  }, [session?.user?.id]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);

      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .eq("harvester_id", session.user.id)
        .order("created_at", { ascending: false });

      if (alertsError) {
        console.error("Alerts fetch error:", alertsError);
        setAlerts([]);
        return;
      }

      if (!alertsData || alertsData.length === 0) {
        setAlerts([]);
        return;
      }

      const alertsWithMatches = await Promise.all(
        alertsData.map(async (alert) => {
          let query = supabase
            .from("listings")
            .select(
              "id, device_model, asking_price, condition, barangay, status, seller_id"
            )
            .eq("status", "active")
            .in("condition", NOT_WORKING_CONDITIONS);

          /*
           * DEVICE MODEL
           */
          if (alert.device_model?.trim()) {
            query = query.ilike(
              "device_model",
              `%${alert.device_model.trim()}%`
            );
          }

          /*
           * MAXIMUM PRICE
           */
          if (
            alert.max_price !== null &&
            alert.max_price !== undefined &&
            alert.max_price !== ""
          ) {
            query = query.lte(
              "asking_price",
              Number(alert.max_price)
            );
          }

          /*
           * BARANGAY
           */
          if (
            alert.preferred_barangay &&
            alert.preferred_barangay.trim() !== ""
          ) {
            query = query.ilike(
              "barangay",
              `%${alert.preferred_barangay.trim()}%`
            );
          }

          const { data: matchedListings, error: matchError } =
            await query;

          if (matchError) {
            console.error(
              "Matching listings error:",
              matchError
            );
          }

          console.log("ALERT:", alert);
          console.log("MATCHED:", matchedListings);

          return {
            ...alert,

            /*
             * Normalize the old "Defective" value for display.
             */
            condition: "Not Working",

            matchCount: matchedListings?.length || 0,
          };
        })
      );

      console.log("FINAL ALERTS:", alertsWithMatches);

      setAlerts(alertsWithMatches);
    } catch (err) {
      console.error("Fetch alerts error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();

    setError("");

    /*
     * DEVICE MODEL
     */
    if (!formData.device_model.trim()) {
      setError("Please enter a device model.");
      return;
    }

    /*
     * PRICE
     */
    const price = parseFloat(formData.max_price);

    if (isNaN(price) || price <= 0) {
      setError("Maximum price must be greater than zero.");
      return;
    }

    /*
     * NEW ALERT
     *
     * No condition is selected by the user.
     * Repair Shop alerts automatically target Not Working listings.
     */
    const { error: insertError } = await supabase
      .from("alerts")
      .insert([
        {
          harvester_id: session.user.id,
          device_model: formData.device_model.trim(),

          // Automatically set for Repair Shop alert flow.
          condition: "Not Working",

          max_price: price,
          preferred_barangay:
            formData.preferred_barangay.trim() || null,
        },
      ]);

    if (insertError) {
      console.error("CREATE ALERT ERROR:", insertError);

      setError(
        insertError.message ||
          "Unable to create the component alert."
      );

      return;
    }

    /*
     * RESET
     */
    setIsModalOpen(false);

    setFormData({
      device_model: "",
      max_price: "",
      preferred_barangay: "",
    });

    await fetchAlerts();
  };

  const deleteAlert = async (id) => {
    const { error: deleteError } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete alert error:", deleteError);
      return;
    }

    await fetchAlerts();
  };

  const openCreateModal = () => {
    if (!isVerified) {
      alert("Verification required.");
      return;
    }

    setError("");
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] p-6">
      {selectedAlertForMatches ? (
        <MatchingListingsView
          alerts={selectedAlertForMatches}
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
                Get notified when matching not working components
                are posted
              </p>
            </div>

            <button
              onClick={openCreateModal}
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
                  Monitor new Not Working listings that match
                  your criteria
                </p>
              </div>

              <button
                onClick={openCreateModal}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              >
                Create New
              </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-4 gap-4 mb-5">
              <div className="border border-gray-100 rounded-xl p-4 text-center bg-[#fafafa]">
                <Bell
                  className="mx-auto text-[#78A22F] mb-2"
                  size={18}
                />

                <h3 className="text-lg font-bold text-gray-800">
                  {alerts.length}
                </h3>

                <p className="text-xs text-gray-400">
                  Active Alerts
                </p>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 text-center bg-[#fafafa]">
                <Search
                  className="mx-auto text-blue-500 mb-2"
                  size={18}
                />

                <h3 className="text-lg font-bold text-gray-800">
                  {alerts.reduce(
                    (acc, curr) => acc + (curr.matchCount || 0),
                    0
                  )}
                </h3>

                <p className="text-xs text-gray-400">
                  New Matches
                </p>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 text-center bg-[#fafafa]">
                <AlertCircle
                  className="mx-auto text-orange-500 mb-2"
                  size={18}
                />

                <h3 className="text-lg font-bold text-gray-800">
                  {
                    alerts.filter(
                      (item) => item.matchCount > 0
                    ).length
                  }
                </h3>

                <p className="text-xs text-gray-400">
                  Alerts With Matches
                </p>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 text-center bg-[#fafafa]">
                <Package
                  className="mx-auto text-gray-500 mb-2"
                  size={18}
                />

                <h3 className="text-lg font-bold text-gray-800">
                  {alerts.length}
                </h3>

                <p className="text-xs text-gray-400">
                  Total Monitors
                </p>
              </div>
            </div>

            {/* MATCHES SECTION */}
            <div className="bg-[#edf8ed] border border-[#cce8cc] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2
                  size={18}
                  className="text-[#78A22F]"
                />

                <div>
                  <h3 className="text-sm font-semibold text-[#3b6b18]">
                    New Not Working Listings Match Your Alerts!
                  </h3>

                  <p className="text-xs text-[#5d7d4b]">
                    Matching listings are limited to Not Working
                    components for Repair Shops.
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

                          <span className="bg-[#78A22F] text-white text-xs px-2 py-1 rounded-full font-medium">
                            {alert.matchCount} MATCHES
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <CheckCircle2
                              size={12}
                              className="text-green-500"
                            />
                            Not Working
                          </span>

                          <span className="flex items-center gap-1">
                            <Search
                              size={12}
                              className="text-blue-500"
                            />
                            ₱
                            {Number(
                              alert.max_price || 0
                            ).toLocaleString()}
                          </span>

                          {alert.preferred_barangay && (
                            <span className="flex items-center gap-1">
                              <MapPin
                                size={12}
                                className="text-orange-500"
                              />
                              {alert.preferred_barangay}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          setSelectedAlertForMatches(alert)
                        }
                        className="flex items-center gap-2 bg-[#78A22F] hover:bg-[#6d9328] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Eye size={14} />
                        View Matches
                      </button>
                    </div>
                  ))}

                {alerts.filter(
                  (a) => a.matchCount > 0
                ).length === 0 && (
                  <div className="text-center py-6 text-sm text-gray-500">
                    No new Not Working matches available right
                    now.
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
                      <Bell
                        size={18}
                        className="text-orange-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-bold text-gray-800 text-lg">
                          {alert.device_model}
                        </h2>

                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-bold uppercase tracking-tight">
                          Active
                        </span>

                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">
                          Not Working
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Search
                            size={14}
                            className="opacity-60"
                          />

                          <span>
                            Max Price: ₱
                            {Number(
                              alert.max_price || 0
                            ).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin
                            size={14}
                            className="opacity-60"
                          />

                          <span>
                            {alert.preferred_barangay ||
                              "Anywhere"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 mt-2">
                          Only Not Working listings are monitored.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedAlertForMatches(alert)
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      title="View matches"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* MATCH BANNER */}
                {alert.matchCount > 0 && (
                  <div className="mt-4 bg-[#e8f9ee] border border-[#d1f2db] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1a7a3a] font-bold text-sm">
                        {alert.matchCount} matching Not Working
                        listings found
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedAlertForMatches(alert)
                      }
                      className="bg-[#00a843] hover:bg-[#008f39] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      View & Bid
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3 px-1">
                  Triggered {alert.matchCount || 0} times
                </p>
              </div>
            ))}

            {!loading && alerts.length === 0 && (
              <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 text-center">
                <Bell
                  size={40}
                  className="mx-auto text-gray-300 mb-3"
                />

                <h3 className="font-semibold text-gray-500 mb-1">
                  No Active Alerts
                </h3>

                <p className="text-sm text-gray-400">
                  Create your first Not Working component
                  monitoring alert.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE ALERT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            {/* HEADER */}
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
                    Get notified when Not Working components
                    are listed
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

              <form
                onSubmit={handleCreateAlert}
                className="space-y-6"
              >
                {/* DEVICE MODEL */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">
                    Device Model{" "}
                    <span className="text-red-500">*</span>
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

                  <p className="text-xs text-slate-400 mt-1.5">
                    Enter the device model you're looking for.
                  </p>
                </div>

                {/* AUTOMATIC CONDITION */}
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      size={20}
                      className="text-orange-500 shrink-0"
                    />

                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Condition: Not Working
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Repair Shops can only purchase Not
                        Working listings through this alert.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PRICE AND BARANGAY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Maximum Price (₱){" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />

                      <input
                        type="number"
                        required
                        min="1"
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
                        placeholder="e.g., Marulas"
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

                {/* FOOTER */}
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