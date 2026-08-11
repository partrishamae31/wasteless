import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

import {
  Users,
  Activity,
  Cpu,
  BadgeCheck,
  Gift,
  Settings2,
  History,
  Save,
  MapPin,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  PackageCheck,
  X,
} from "lucide-react";

const DonationManagement = () => {
  const [activeTab, setActiveTab] = useState("configuration");

  const [donations, setDonations] = useState([]);
  const [dropOffPoints, setDropOffPoints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedDonation, setSelectedDonation] = useState(null);
  const [selectedDropOffPoint, setSelectedDropOffPoint] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);

  const [config, setConfig] = useState({
    firstReminder: 7,
    secondReminder: 3,
    autoSuggest: 14,
  });

  /*
   * ---------------------------------------------------------
   * LOAD CONFIGURATION
   * ---------------------------------------------------------
   *
   * For now this uses localStorage.
   *
   * If you have an admin_settings table in Supabase later,
   * we can move these values there so every admin sees them.
   */
  useEffect(() => {
    const savedConfig = localStorage.getItem(
      "wasteless_donation_configuration",
    );

    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error("Failed to load donation configuration:", error);
      }
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD DONATIONS
   * ---------------------------------------------------------
   */
  const fetchDonations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          id,
          seller_id,
          device_model,
          category,
          condition,
          asking_price,
          scrap_value,
          status,
          created_at,
          drop_off_point_id,
          profiles:seller_id (
            id,
            full_name,
            email
          ),
          drop_off_points:drop_off_point_id (
            id,
            barangay,
            city,
            partner,
            operating_hours
          )
        `,
        )
        .in("status", ["donated", "drop_off_assigned", "processed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDonations(data || []);
    } catch (error) {
      console.error("Error loading donations:", error);
      alert("Failed to load donations: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD DROP-OFF POINTS
   * ---------------------------------------------------------
   */
  const fetchDropOffPoints = async () => {
    try {
      const { data, error } = await supabase
        .from("drop_off_points")
        .select(
          `
          id,
          barangay,
          city,
          partner,
          operating_hours,
          is_active
        `,
        )
        .eq("is_active", true)
        .order("city", { ascending: true });

      if (error) throw error;

      setDropOffPoints(data || []);
    } catch (error) {
      console.error("Error loading drop-off points:", error);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */
  useEffect(() => {
    fetchDonations();
    fetchDropOffPoints();
  }, []);

  /*
   * ---------------------------------------------------------
   * REFRESH
   * ---------------------------------------------------------
   */
  const handleRefresh = async () => {
    setRefreshing(true);

    await Promise.all([fetchDonations(), fetchDropOffPoints()]);

    setRefreshing(false);
  };

  /*
   * ---------------------------------------------------------
   * SAVE CONFIGURATION
   * ---------------------------------------------------------
   */
  const handleSaveConfiguration = () => {
    const first = Number(config.firstReminder);
    const second = Number(config.secondReminder);
    const autoSuggest = Number(config.autoSuggest);

    if (
      !Number.isFinite(first) ||
      !Number.isFinite(second) ||
      !Number.isFinite(autoSuggest)
    ) {
      alert("Please enter valid numbers.");
      return;
    }

    if (first <= 0 || second <= 0 || autoSuggest <= 0) {
      alert("Reminder values must be greater than 0.");
      return;
    }

    if (autoSuggest < first) {
      alert(
        "Auto-suggest donation days should be greater than or equal to the first reminder.",
      );
      return;
    }

    localStorage.setItem(
      "wasteless_donation_configuration",
      JSON.stringify({
        firstReminder: first,
        secondReminder: second,
        autoSuggest,
      }),
    );

    alert("Donation configuration saved successfully.");
  };

  /*
   * ---------------------------------------------------------
   * RESET CONFIGURATION
   * ---------------------------------------------------------
   */
  const handleResetConfiguration = () => {
    const defaultConfig = {
      firstReminder: 7,
      secondReminder: 3,
      autoSuggest: 14,
    };

    setConfig(defaultConfig);

    localStorage.setItem(
      "wasteless_donation_configuration",
      JSON.stringify(defaultConfig),
    );
  };

  /*
   * ---------------------------------------------------------
   * ASSIGN DROP-OFF POINT
   * ---------------------------------------------------------
   */
  const handleAssignDropOff = async () => {
    if (!selectedDonation) {
      alert("No donation selected.");
      return;
    }

    if (!selectedDropOffPoint) {
      alert("Please select a drop-off point.");
      return;
    }

    try {
      console.log("Donation ID:", selectedDonation.id);
      console.log("Drop-off Point ID:", selectedDropOffPoint);

      const { error } = await supabase
        .from("listings")
        .update({
          drop_off_point_id: selectedDropOffPoint,
          status: "drop_off_assigned",
        })
        .eq("id", selectedDonation.id);

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      console.log("Donation successfully assigned.");

      // Find the selected drop-off point
      const assignedPoint = dropOffPoints.find(
        (point) => String(point.id) === String(selectedDropOffPoint),
      );

      // Update UI immediately
      setDonations((prev) =>
        prev.map((donation) =>
          donation.id === selectedDonation.id
            ? {
                ...donation,
                status: "drop_off_assigned",
                drop_off_point_id: selectedDropOffPoint,
                drop_off_points: assignedPoint || null,
              }
            : donation,
        ),
      );

      // Close modal
      setShowAssignModal(false);
      setSelectedDonation(null);
      setSelectedDropOffPoint("");

      alert("Drop-off point assigned successfully.");

      // Reload from Supabase
      await fetchDonations();
    } catch (error) {
      console.error("Error assigning drop-off point:", error);

      alert(
        "Failed to assign drop-off point: " +
          (error?.message || "Unknown error"),
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * MARK DONATION AS PROCESSED
   * ---------------------------------------------------------
   */
  const handleMarkProcessed = async (donation) => {
    const confirmed = window.confirm(
      `Mark ${donation.device_model || "this donation"} as processed?`,
    );

    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from("listings")
        .update({
          status: "processed",
        })
        .eq("id", donation.id)
        .select()
        .single();

      if (error) throw error;

      console.log("Donation processed:", data);

      setDonations((prev) =>
        prev.map((item) =>
          item.id === donation.id
            ? {
                ...item,
                status: "processed",
              }
            : item,
        ),
      );

      alert("Donation marked as processed.");
    } catch (error) {
      console.error("Error processing donation:", error);
      alert("Failed to process donation: " + error.message);
    }
  };

  /*
   * ---------------------------------------------------------
   * STATISTICS
   * ---------------------------------------------------------
   */
  const totalDonations = donations.length;

  const pendingDropOff = donations.filter(
    (donation) => donation.status === "donated" && !donation.drop_off_point_id,
  ).length;

  const assignedDonations = donations.filter(
    (donation) => donation.status === "drop_off_assigned",
  ).length;

  const processedDonations = donations.filter(
    (donation) => donation.status === "processed",
  ).length;

  /*
   * ---------------------------------------------------------
   * SEARCH
   * ---------------------------------------------------------
   */
  const filteredDonations = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return donations;

    return donations.filter((donation) => {
      const device = donation.device_model?.toLowerCase() || "";
      const category = donation.category?.toLowerCase() || "";
      const seller = donation.profiles?.full_name?.toLowerCase() || "";
      const email = donation.profiles?.email?.toLowerCase() || "";
      const barangay = donation.drop_off_points?.barangay?.toLowerCase() || "";

      return (
        device.includes(search) ||
        category.includes(search) ||
        seller.includes(search) ||
        email.includes(search) ||
        barangay.includes(search)
      );
    });
  }, [donations, searchTerm]);

  /*
   * ---------------------------------------------------------
   * STATUS DISPLAY
   * ---------------------------------------------------------
   */
  const getStatusBadge = (donation) => {
    if (donation.status === "donated" && !donation.drop_off_point_id) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600">
          <Clock size={12} />
          Pending Drop-off
        </span>
      );
    }

    if (donation.status === "drop_off_assigned") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
          <MapPin size={12} />
          Drop-off Assigned
        </span>
      );
    }

    if (donation.status === "processed") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
          <CheckCircle2 size={12} />
          Processed
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
        {donation.status}
      </span>
    );
  };

  /*
   * ---------------------------------------------------------
   * FORMAT DATE
   * ---------------------------------------------------------
   */
  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-6">
      {/* PAGE TITLE */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-700">
          Donation Management
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Manage donated devices, drop-off assignments, and donation reminders.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E7ECF3] rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-2">Total Donations</p>

          <h2 className="text-3xl font-semibold text-slate-700">
            {totalDonations}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-emerald-500">
            <Gift size={16} />
            <span className="text-xs">All donations</span>
          </div>
        </div>

        <div className="bg-white border border-[#E7ECF3] rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-2">Pending Drop-off</p>

          <h2 className="text-3xl font-semibold text-orange-500">
            {pendingDropOff}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-orange-500">
            <Clock size={16} />
            <span className="text-xs">Needs admin assignment</span>
          </div>
        </div>

        <div className="bg-white border border-[#E7ECF3] rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-2">Drop-off Assigned</p>

          <h2 className="text-3xl font-semibold text-blue-500">
            {assignedDonations}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-blue-500">
            <MapPin size={16} />
            <span className="text-xs">Awaiting processing</span>
          </div>
        </div>

        <div className="bg-white border border-[#E7ECF3] rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-2">Processed</p>

          <h2 className="text-3xl font-semibold text-green-500">
            {processedDonations}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-green-500">
            <PackageCheck size={16} />
            <span className="text-xs">Completed donations</span>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white border border-[#E8EDF5] rounded-3xl shadow-sm overflow-hidden">
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-[#EEF2F7]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Gift size={20} />
              </div>

              <div>
                <h2 className="text-[22px] font-semibold text-slate-700">
                  Donation Management
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Configure reminders and manage donated devices.
                </p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-10 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-[#EEF2F7] bg-[#FBFCFD]">
          <button
            onClick={() => setActiveTab("configuration")}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === "configuration"
                ? "text-sky-600 border-b-2 border-sky-500"
                : "text-slate-400"
            }`}
          >
            <Settings2 size={15} />
            Configuration
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === "history"
                ? "text-sky-600 border-b-2 border-sky-500"
                : "text-slate-400"
            }`}
          >
            <History size={15} />
            Donation History ({totalDonations})
          </button>
        </div>

        {/* CONFIGURATION */}
        {activeTab === "configuration" && (
          <div className="p-6">
            <h3 className="text-[15px] font-semibold text-slate-700 mb-5">
              Reminder Thresholds
            </h3>

            <div className="space-y-5">
              {/* FIRST */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  First Reminder (days after listing with no bids)
                </label>

                <input
                  type="number"
                  min="1"
                  value={config.firstReminder}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      firstReminder: e.target.value,
                    }))
                  }
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  Sellers will receive a donation reminder after this many days
                  without bids.
                </p>
              </div>

              {/* SECOND */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  Second Reminder (days after first reminder if dismissed)
                </label>

                <input
                  type="number"
                  min="1"
                  value={config.secondReminder}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      secondReminder: e.target.value,
                    }))
                  }
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  If the seller dismisses the first reminder, another reminder
                  will be scheduled after this many days.
                </p>
              </div>

              {/* AUTO SUGGEST */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  Auto-suggest Donation (total days)
                </label>

                <input
                  type="number"
                  min="1"
                  value={config.autoSuggest}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      autoSuggest: e.target.value,
                    }))
                  }
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  Total days before strongly suggesting donation as the best
                  option.
                </p>
              </div>

              {/* TIMELINE */}
              <div className="bg-[#F3F8FF] border border-[#D8E8FF] rounded-2xl p-5">
                <h4 className="text-sm font-medium text-slate-700 mb-4">
                  Timeline Preview
                </h4>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />

                    <span className="text-slate-600">
                      Day 0: Listing created
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />

                    <span className="text-slate-600">
                      Day {config.firstReminder || 0}: First donation reminder
                      sent
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500" />

                    <span className="text-slate-600">
                      Day{" "}
                      {Number(config.firstReminder || 0) +
                        Number(config.secondReminder || 0)}
                      : Second reminder
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />

                    <span className="text-slate-600">
                      Day {config.autoSuggest || 0}: Strong donation suggestion
                    </span>
                  </div>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={handleResetConfiguration}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition"
                >
                  Reset
                </button>

                <button
                  onClick={handleSaveConfiguration}
                  className="flex-1 h-11 rounded-xl bg-[#2C8CA3] hover:bg-[#257A8F] text-white text-sm font-medium transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save size={15} />
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DONATION HISTORY */}
        {activeTab === "history" && (
          <div className="p-6">
            {/* SEARCH */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search device, seller, category, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                />
              </div>
            </div>

            {/* LOADING */}
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw size={24} className="mx-auto mb-3 animate-spin" />
                Loading donations...
              </div>
            ) : filteredDonations.length === 0 ? (
              <div className="py-16 text-center">
                <Gift size={40} className="mx-auto text-slate-200 mb-3" />

                <h3 className="font-semibold text-slate-600">
                  No donations found
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  Donations made by sellers will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDonations.map((donation) => (
                  <div
                    key={donation.id}
                    className="border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* DEVICE */}
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Gift size={20} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-700">
                              {donation.device_model || "Unknown Device"}
                            </h3>

                            {getStatusBadge(donation)}
                          </div>

                          <p className="text-xs text-slate-400 mt-1">
                            {donation.category || "Unknown category"}
                            {" • "}
                            Donated {formatDate(donation.created_at)}
                          </p>

                          <p className="text-sm text-slate-500 mt-3">
                            Donor:{" "}
                            <span className="font-medium text-slate-700">
                              {donation.profiles?.full_name || "Unknown seller"}
                            </span>
                          </p>

                          {donation.profiles?.email && (
                            <p className="text-xs text-slate-400 mt-1">
                              {donation.profiles.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ACTION */}
                      <div className="flex items-center gap-2">
                        {donation.status === "donated" &&
                          !donation.drop_off_point_id && (
                            <button
                              onClick={() => {
                                setSelectedDonation(donation);
                                setSelectedDropOffPoint("");
                                setShowAssignModal(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#2C8CA3] text-white text-xs font-semibold hover:bg-[#257A8F] flex items-center gap-2"
                            >
                              <MapPin size={14} />
                              Assign Drop-off
                            </button>
                          )}

                        {donation.status === "drop_off_assigned" && (
                          <button
                            onClick={() => handleMarkProcessed(donation)}
                            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 flex items-center gap-2"
                          >
                            <CheckCircle2 size={14} />
                            Mark Processed
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DROP-OFF INFORMATION */}
                    {donation.drop_off_points && (
                      <div className="mt-4 bg-slate-50 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <MapPin size={17} className="text-[#2C8CA3] mt-0.5" />

                          <div>
                            <p className="text-xs text-slate-400">
                              Assigned Drop-off Point
                            </p>

                            <p className="text-sm font-semibold text-slate-700">
                              {donation.drop_off_points.partner ||
                                "Drop-off Center"}
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              {donation.drop_off_points.barangay},{" "}
                              {donation.drop_off_points.city}
                            </p>

                            {donation.drop_off_points.operating_hours && (
                              <p className="text-xs text-slate-400 mt-1">
                                Hours:{" "}
                                {donation.drop_off_points.operating_hours}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FOOTER STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 pt-0">
          <div className="bg-[#FCFDFE] border border-[#E9EEF5] rounded-2xl px-5 py-4">
            <p className="text-[12px] text-slate-400 mb-2">Total Donations</p>

            <h3 className="text-3xl font-semibold text-slate-700">
              {totalDonations}
            </h3>
          </div>

          <div className="bg-[#FCFDFE] border border-[#E9EEF5] rounded-2xl px-5 py-4">
            <p className="text-[12px] text-slate-400 mb-2">Pending Drop-off</p>

            <h3 className="text-3xl font-semibold text-orange-500">
              {pendingDropOff}
            </h3>
          </div>

          <div className="bg-[#FCFDFE] border border-[#E9EEF5] rounded-2xl px-5 py-4">
            <p className="text-[12px] text-slate-400 mb-2">Processed</p>

            <h3 className="text-3xl font-semibold text-green-500">
              {processedDonations}
            </h3>
          </div>
        </div>
      </div>

      {/* ASSIGN DROP-OFF MODAL */}
      {showAssignModal && selectedDonation && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-700">
                  Assign Drop-off Point
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Choose where the donated device should be dropped off.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedDonation(null);
                  setSelectedDropOffPoint("");
                }}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* DONATION */}
            <div className="p-6">
              <div className="bg-emerald-50 rounded-2xl p-4 mb-5">
                <p className="text-xs text-emerald-600">Donated Device</p>

                <p className="font-semibold text-slate-700 mt-1">
                  {selectedDonation.device_model}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Donor:{" "}
                  {selectedDonation.profiles?.full_name || "Unknown seller"}
                </p>
              </div>

              {/* SELECT */}
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Drop-off Point
              </label>

              <select
                value={selectedDropOffPoint}
                onChange={(e) => setSelectedDropOffPoint(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
              >
                <option value="">Select a drop-off point</option>

                {dropOffPoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.partner || "Drop-off Center"} — {point.barangay},{" "}
                    {point.city}
                  </option>
                ))}
              </select>

              {dropOffPoints.length === 0 && (
                <p className="text-xs text-red-500 mt-2">
                  No active drop-off points are available. Add a drop-off point
                  first.
                </p>
              )}

              {/* ACTIONS */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedDonation(null);
                    setSelectedDropOffPoint("");
                  }}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAssignDropOff}
                  disabled={!selectedDropOffPoint}
                  className="flex-1 h-11 rounded-xl bg-[#2C8CA3] text-white text-sm font-medium hover:bg-[#257A8F] disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Assign Point
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationManagement;
