import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

import {
  Gift,
  Settings2,
  History,
  Save,
  MapPin,
  Search,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
  Plus,
  X,
  Power,
} from "lucide-react";

const DEFAULT_CONFIG = {
  firstReminder: 7,
  secondReminder: 3,
  autoSuggest: 14,
};

const EMPTY_DROP_OFF_FORM = {
  partner: "",
  barangay: "",
  city: "",
  operating_hours: "",
};

const DonationManagement = () => {
  const [activeTab, setActiveTab] = useState("configuration");
  const [address, setAddress] = useState("");

  const [donations, setDonations] = useState([]);
  const [dropOffPoints, setDropOffPoints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPoint, setSavingPoint] = useState(false);
  const [updatingPointId, setUpdatingPointId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [pointSearchTerm, setPointSearchTerm] = useState("");

  const [pointForm, setPointForm] = useState(EMPTY_DROP_OFF_FORM);

  const [config, setConfig] = useState(DEFAULT_CONFIG);

  /*
   * ---------------------------------------------------------
   * LOAD CONFIGURATION
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const savedConfig = localStorage.getItem(
      "wasteless_donation_configuration",
    );

    if (!savedConfig) return;

    try {
      const parsedConfig = JSON.parse(savedConfig);

      setConfig({
        firstReminder:
          parsedConfig.firstReminder ?? DEFAULT_CONFIG.firstReminder,
        secondReminder:
          parsedConfig.secondReminder ?? DEFAULT_CONFIG.secondReminder,
        autoSuggest:
          parsedConfig.autoSuggest ?? DEFAULT_CONFIG.autoSuggest,
      });
    } catch (error) {
      console.error("Failed to load donation configuration:", error);
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD DONATIONS
   * ---------------------------------------------------------
   */
  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(`
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
  name,
  partner,
  address,
  barangay,
  city,
  operating_hours
)
        `)
        .in("status", ["donated", "drop_off_assigned", "processed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDonations(data || []);
    } catch (error) {
      console.error("Error loading donations:", error);
      alert("Failed to load donations: " + error.message);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD DROP-OFF POINTS
   * ---------------------------------------------------------
   *
   * Only active locations are shown in the admin list.
   * Deactivated locations remain in the database so existing
   * donation records can still reference them.
   */
  const fetchDropOffPoints = async () => {
    try {
      const { data, error } = await supabase
        .from("drop_off_points")
        .select(`
  id,
  name,
  partner,
  address,
  barangay,
  city,
  operating_hours,
  is_active
`)
        .eq("is_active", true)
        .order("city", { ascending: true })
        .order("barangay", { ascending: true });

      if (error) throw error;

      setDropOffPoints(data || []);
    } catch (error) {
      console.error("Error loading drop-off points:", error);
      alert("Failed to load drop-off points: " + error.message);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDonations(), fetchDropOffPoints()]);
      setLoading(false);
    };

    loadData();
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const updatedConfig = {
      firstReminder: first,
      secondReminder: second,
      autoSuggest,
    };

    localStorage.setItem(
      "wasteless_donation_configuration",
      JSON.stringify(updatedConfig),
    );

    setConfig(updatedConfig);
    alert("Donation configuration saved successfully.");
  };

  /*
   * ---------------------------------------------------------
   * RESET CONFIGURATION
   * ---------------------------------------------------------
   */
  const handleResetConfiguration = () => {
    setConfig(DEFAULT_CONFIG);

    localStorage.setItem(
      "wasteless_donation_configuration",
      JSON.stringify(DEFAULT_CONFIG),
    );
  };

  /*
   * ---------------------------------------------------------
   * CREATE DROP-OFF POINT
   * ---------------------------------------------------------
   */
  const handleCreateDropOffPoint = async (event) => {
    event.preventDefault();

    const partner = pointForm.partner.trim();
    const address = pointForm.address.trim();
    const barangay = pointForm.barangay.trim();
    const city = pointForm.city.trim();
    const operatingHours = pointForm.operating_hours.trim();

    if (!partner || !address || !barangay || !city) {
      alert("Please enter the drop-off point name, full address, barangay, and city.");
      return;
    }

    try {
      setSavingPoint(true);

      const { data, error } = await supabase
        .from("drop_off_points")
        .insert({
          name: partner,
          partner,
          address,
          barangay,
          city,
          operating_hours: operatingHours || null,
          is_active: true,
        })
        .select(`
    id,
    name,
    partner,
    address,
    barangay,
    city,
    operating_hours,
    is_active
  `)
        .single();

      if (error) throw error;

      setDropOffPoints((previous) =>
        [...previous, data].sort((a, b) => {
          const cityCompare = (a.city || "").localeCompare(b.city || "");

          if (cityCompare !== 0) return cityCompare;

          return (a.barangay || "").localeCompare(b.barangay || "");
        }),
      );

      setPointForm(EMPTY_DROP_OFF_FORM);
      alert("Drop-off point created successfully.");
    } catch (error) {
      console.error("Error creating drop-off point:", error);
      alert(
        "Failed to create drop-off point: " +
        (error?.message || "Unknown error"),
      );
    } finally {
      setSavingPoint(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * DEACTIVATE DROP-OFF POINT
   * ---------------------------------------------------------
   *
   * We deactivate instead of deleting so donations that already
   * reference this location keep their location information.
   */
  const handleDeactivateDropOffPoint = async (point) => {
    const confirmed = window.confirm(
      `Deactivate "${point.partner}" in ${point.barangay}, ${point.city}?\n\nDonors will no longer be able to select this location.`,
    );

    if (!confirmed) return;

    try {
      setUpdatingPointId(point.id);

      const { error } = await supabase
        .from("drop_off_points")
        .update({ is_active: false })
        .eq("id", point.id);

      if (error) throw error;

      setDropOffPoints((previous) =>
        previous.filter((item) => item.id !== point.id),
      );

      alert("Drop-off point deactivated.");
    } catch (error) {
      console.error("Error deactivating drop-off point:", error);
      alert(
        "Failed to deactivate drop-off point: " +
        (error?.message || "Unknown error"),
      );
    } finally {
      setUpdatingPointId(null);
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
      const { error } = await supabase
        .from("listings")
        .update({ status: "processed" })
        .eq("id", donation.id);

      if (error) throw error;

      setDonations((previous) =>
        previous.map((item) =>
          item.id === donation.id
            ? { ...item, status: "processed" }
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

  const assignedDonations = donations.filter(
    (donation) =>
      donation.status === "drop_off_assigned" ||
      (donation.status === "donated" && donation.drop_off_point_id),
  ).length;

  const processedDonations = donations.filter(
    (donation) => donation.status === "processed",
  ).length;

  /*
   * ---------------------------------------------------------
   * SEARCH DONATIONS
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
      const barangay =
        donation.drop_off_points?.barangay?.toLowerCase() || "";
      const city = donation.drop_off_points?.city?.toLowerCase() || "";
      const partner = donation.drop_off_points?.partner?.toLowerCase() || "";

      return (
        device.includes(search) ||
        category.includes(search) ||
        seller.includes(search) ||
        email.includes(search) ||
        barangay.includes(search) ||
        city.includes(search) ||
        partner.includes(search)
      );
    });
  }, [donations, searchTerm]);

  /*
   * ---------------------------------------------------------
   * SEARCH DROP-OFF POINTS
   * ---------------------------------------------------------
   */
  const filteredDropOffPoints = useMemo(() => {
    const search = pointSearchTerm.toLowerCase().trim();

    if (!search) return dropOffPoints;

    return dropOffPoints.filter((point) => {
      const partner = point.partner?.toLowerCase() || "";
      const barangay = point.barangay?.toLowerCase() || "";
      const city = point.city?.toLowerCase() || "";
      const hours = point.operating_hours?.toLowerCase() || "";

      return (
        partner.includes(search) ||
        barangay.includes(search) ||
        city.includes(search) ||
        hours.includes(search)
      );
    });
  }, [dropOffPoints, pointSearchTerm]);

  /*
   * ---------------------------------------------------------
   * STATUS DISPLAY
   * ---------------------------------------------------------
   */
  const getStatusBadge = (donation) => {
    if (donation.status === "processed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
          <CheckCircle2 size={12} />
          Processed
        </span>
      );
    }

    if (donation.drop_off_point_id) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          <MapPin size={12} />
          Drop-off Selected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
        Donation Recorded
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
    <div className="min-h-screen bg-[#F7F9FC] p-4 sm:p-6">
      {/* PAGE TITLE */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-700">
          Donation Management
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Manage donation reminders, create drop-off locations, and view donated devices.
        </p>
      </div>

      {/* STATS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
          <p className="mb-2 text-xs text-slate-400">Total Donations</p>
          <h2 className="text-3xl font-semibold text-slate-700">
            {totalDonations}
          </h2>
          <div className="mt-3 flex items-center gap-2 text-emerald-500">
            <Gift size={16} />
            <span className="text-xs">All donations</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
          <p className="mb-2 text-xs text-slate-400">Active Drop-off Points</p>
          <h2 className="text-3xl font-semibold text-sky-600">
            {dropOffPoints.length}
          </h2>
          <div className="mt-3 flex items-center gap-2 text-sky-500">
            <MapPin size={16} />
            <span className="text-xs">Available for donors</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
          <p className="mb-2 text-xs text-slate-400">Drop-off Selected</p>
          <h2 className="text-3xl font-semibold text-blue-500">
            {assignedDonations}
          </h2>
          <div className="mt-3 flex items-center gap-2 text-blue-500">
            <MapPin size={16} />
            <span className="text-xs">Donations with a location</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
          <p className="mb-2 text-xs text-slate-400">Processed</p>
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
      <div className="overflow-hidden rounded-3xl border border-[#E8EDF5] bg-white shadow-sm">
        {/* HEADER */}
        <div className="border-b border-[#EEF2F7] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Gift size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-700 sm:text-[22px]">
                  Donation Management
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Create locations that donors can select when donating.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="flex flex-wrap border-b border-[#EEF2F7] bg-[#FBFCFD]">
          <button
            type="button"
            onClick={() => setActiveTab("configuration")}
            className={`flex min-w-[150px] flex-1 items-center justify-center gap-2 px-3 py-4 text-sm font-medium ${activeTab === "configuration"
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-slate-400 hover:text-slate-600"
              }`}
          >
            <Settings2 size={15} />
            Configuration
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("locations")}
            className={`flex min-w-[150px] flex-1 items-center justify-center gap-2 px-3 py-4 text-sm font-medium ${activeTab === "locations"
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-slate-400 hover:text-slate-600"
              }`}
          >
            <MapPin size={15} />
            Create Drop-off Points ({dropOffPoints.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex min-w-[150px] flex-1 items-center justify-center gap-2 px-3 py-4 text-sm font-medium ${activeTab === "history"
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-slate-400 hover:text-slate-600"
              }`}
          >
            <History size={15} />
            Donation History ({totalDonations})
          </button>
        </div>

        {/* CONFIGURATION TAB */}
        {activeTab === "configuration" && (
          <div className="p-4 sm:p-6">
            <h3 className="mb-5 text-[15px] font-semibold text-slate-700">
              Reminder Thresholds
            </h3>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  First Reminder (days after listing with no bids)
                </label>

                <input
                  type="number"
                  min="1"
                  value={config.firstReminder}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      firstReminder: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />

                <p className="mt-2 text-[11px] text-slate-400">
                  Sellers will receive a donation reminder after this many days
                  without bids.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Second Reminder (days after first reminder if dismissed)
                </label>

                <input
                  type="number"
                  min="1"
                  value={config.secondReminder}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      secondReminder: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />


                <p className="mt-2 text-[11px] text-slate-400">
                  If the seller dismisses the first reminder, another reminder
                  will be scheduled after this many days.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Auto-suggest Donation (total days)
                </label>

                <input
                  type="number"
                  min="1"
                  value={config.autoSuggest}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      autoSuggest: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />

                <p className="mt-2 text-[11px] text-slate-400">
                  Total days before strongly suggesting donation as the best
                  option.
                </p>
              </div>

              {/* TIMELINE */}
              <div className="rounded-2xl border border-[#D8E8FF] bg-[#F3F8FF] p-5">
                <h4 className="mb-4 text-sm font-medium text-slate-700">
                  Timeline Preview
                </h4>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-slate-600">
                      Day 0: Listing created
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="text-slate-600">
                      Day {config.firstReminder || 0}: First donation reminder
                      sent
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-slate-600">
                      Day{" "}
                      {Number(config.firstReminder || 0) +
                        Number(config.secondReminder || 0)}
                      : Second reminder
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-slate-600">
                      Day {config.autoSuggest || 0}: Strong donation suggestion
                    </span>
                  </div>
                </div>
              </div>

              {/* CONFIGURATION BUTTONS */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleResetConfiguration}
                  className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfiguration}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2C8CA3] text-sm font-medium text-white shadow-sm transition hover:bg-[#257A8F]"
                >
                  <Save size={15} />
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE DROP-OFF POINTS TAB */}
        {activeTab === "locations" && (
          <div className="p-4 sm:p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-700">
                Create Drop-off Point
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Add a donation location. Active locations will be available for
                donors to select.
              </p>
            </div>

            {/* CREATE FORM */}
            <form
              onSubmit={handleCreateDropOffPoint}
              className="mb-8 rounded-2xl border border-slate-100 bg-[#FBFCFD] p-4 sm:p-5"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Drop-off Point Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    placeholder="e.g. Barangay Donation Center"
                    value={pointForm.partner}
                    onChange={(event) =>
                      setPointForm((previous) => ({
                        ...previous,
                        partner: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Barangay *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Karuhatan"
                    value={pointForm.barangay}
                    onChange={(event) =>
                      setPointForm((previous) => ({
                        ...previous,
                        barangay: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Valenzuela City"
                    value={pointForm.city}
                    onChange={(event) =>
                      setPointForm((previous) => ({
                        ...previous,
                        city: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    placeholder="e.g. Monday–Friday, 8:00 AM–5:00 PM"
                    value={pointForm.operating_hours}
                    onChange={(event) =>
                      setPointForm((previous) => ({
                        ...previous,
                        operating_hours: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Full Address *
                </label>
                <input
                  type="text"
                  required
                  maxLength={250}
                  placeholder="Street, building, or landmark"
                  value={pointForm.address}
                  onChange={(event) =>
                    setPointForm((previous) => ({
                      ...previous,
                      address: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPoint}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2C8CA3] px-5 text-sm font-semibold text-white transition hover:bg-[#257A8F] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {savingPoint ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  {savingPoint ? "Creating..." : "Create Drop-off Point"}
                </button>
              </div>


            </form>

            {/* ACTIVE LOCATIONS */}
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-700">
                    Active Drop-off Locations
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {dropOffPoints.length} active location
                    {dropOffPoints.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="relative w-full sm:max-w-xs">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={pointSearchTerm}
                    onChange={(event) =>
                      setPointSearchTerm(event.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              {filteredDropOffPoints.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center">
                  <MapPin size={34} className="mx-auto mb-3 text-slate-200" />
                  <h4 className="font-semibold text-slate-600">
                    {dropOffPoints.length === 0
                      ? "No drop-off points yet"
                      : "No matching locations"}
                  </h4>
                  <p className="mt-1 text-sm text-slate-400">
                    {dropOffPoints.length === 0
                      ? "Create a drop-off point using the form above."
                      : "Try another search term."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDropOffPoints.map((point) => (
                    <div
                      key={point.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 sm:flex-row sm:items-start sm:justify-between sm:p-5"
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                          <MapPin size={19} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-slate-700">
                              {point.partner || "Drop-off Center"}
                            </h4>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                              Active
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {point.barangay}, {point.city}
                          </p>

                          {point.operating_hours && (
                            <p className="mt-2 text-xs text-slate-400">
                              Operating hours: {point.operating_hours}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeactivateDropOffPoint(point)}
                        disabled={updatingPointId === point.id}
                        className="flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingPointId === point.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Power size={14} />
                        )}
                        Deactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DONATION HISTORY TAB */}
        {activeTab === "history" && (
          <div className="p-4 sm:p-6">
            {/* SEARCH */}
            <div className="mb-5">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search device, seller, category, or location..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw size={24} className="mx-auto mb-3 animate-spin" />
                Loading donations...
              </div>
            ) : filteredDonations.length === 0 ? (
              <div className="py-16 text-center">
                <Gift size={40} className="mx-auto mb-3 text-slate-200" />
                <h3 className="font-semibold text-slate-600">
                  No donations found
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Donations made by sellers will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDonations.map((donation) => (
                  <div
                    key={donation.id}
                    className="rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* DEVICE */}
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <Gift size={20} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-700">
                              {donation.device_model || "Unknown Device"}
                            </h3>
                            {getStatusBadge(donation)}
                          </div>

                          <p className="mt-1 text-xs text-slate-400">
                            {donation.category || "Unknown category"}
                            {" • "}
                            Donated {formatDate(donation.created_at)}
                          </p>

                          <p className="mt-3 text-sm text-slate-500">
                            Donor:{" "}
                            <span className="font-medium text-slate-700">
                              {donation.profiles?.full_name || "Unknown seller"}
                            </span>
                          </p>

                          {donation.profiles?.email && (
                            <p className="mt-1 text-xs text-slate-400">
                              {donation.profiles.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ACTION */}
                      {donation.status !== "processed" &&
                        donation.drop_off_point_id && (
                          <button
                            type="button"
                            onClick={() => handleMarkProcessed(donation)}
                            className="flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                          >
                            <CheckCircle2 size={14} />
                            Mark Processed
                          </button>
                        )}
                    </div>

                    {/* DONOR-SELECTED LOCATION */}
                    {donation.drop_off_points ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <MapPin
                            size={17}
                            className="mt-0.5 shrink-0 text-[#2C8CA3]"
                          />

                          <div>
                            <p className="text-xs text-slate-400">
                              Donor-selected Drop-off Point
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {donation.drop_off_points.partner ||
                                "Drop-off Center"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {donation.drop_off_points.barangay},{" "}
                              {donation.drop_off_points.city}
                            </p>

                            {donation.drop_off_points.operating_hours && (
                              <p className="mt-1 text-xs text-slate-400">
                                Hours:{" "}
                                {donation.drop_off_points.operating_hours}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-orange-50 p-4">
                        <p className="text-xs text-orange-700">
                          No drop-off location is saved for this donation.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FOOTER STATS */}
        <div className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-3 sm:p-6 sm:pt-0">
          <div className="rounded-2xl border border-[#E9EEF5] bg-[#FCFDFE] px-5 py-4">
            <p className="mb-2 text-xs text-slate-400">Total Donations</p>
            <h3 className="text-3xl font-semibold text-slate-700">
              {totalDonations}
            </h3>
          </div>

          <div className="rounded-2xl border border-[#E9EEF5] bg-[#FCFDFE] px-5 py-4">
            <p className="mb-2 text-xs text-slate-400">Active Drop-off Points</p>
            <h3 className="text-3xl font-semibold text-sky-600">
              {dropOffPoints.length}
            </h3>
          </div>

          <div className="rounded-2xl border border-[#E9EEF5] bg-[#FCFDFE] px-5 py-4">
            <p className="mb-2 text-xs text-slate-400">Processed</p>
            <h3 className="text-3xl font-semibold text-green-500">
              {processedDonations}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationManagement;