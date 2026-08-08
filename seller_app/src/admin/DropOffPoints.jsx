import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  MapPin,
  Plus,
  Search,
  Edit3,
  Trash2,
  Phone,
  Building2,
  Clock,
  X,
  Save,
  RefreshCw,
  Navigation,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  barangay: "",
  city: "Valenzuela City",
  address: "",
  contact: "",
  partner: "",
  operating_hours: "",
  accepted_devices: [],
  latitude: "",
  longitude: "",
  is_active: true,
};

const DEVICE_OPTIONS = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Phone",
  "Tablet",
  "Printer",
  "TV",
  "Router",
  "Keyboard",
  "Mouse",
  "Other",
];

const BARANGAYS = [
  "Arkong Bato",
  "Bagbaguin",
  "Balangkas",
  "Bignay",
  "Bisig",
  "Canumay East",
  "Canumay West",
  "Coloong",
  "Dalandanan",
  "Gen. T. de Leon",
  "Isla",
  "Karuhatan",
  "Lawang Bato",
  "Lingunan",
  "Malanday",
  "Malinta",
  "Mapulang Lupa",
  "Marulas",
  "Maysan",
  "Palasan",
  "Parada",
  "Paso de Blas",
  "Pasolo",
  "Polo",
  "Punturin",
  "Rincon",
  "Tagalag",
  "Ugong",
  "Viente Reales",
  "Wawang Pulo",
];

const DropOffPoints = () => {
  const [points, setPoints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------------------------------------------------------
  // LOAD DROP-OFF POINTS
  // ---------------------------------------------------------

  const fetchPoints = async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("drop_off_points")
        .select("*")
        .order("barangay", { ascending: true })
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      setPoints(data || []);
    } catch (err) {
      console.error("Failed to load drop-off points:", err);

      setError(
        err.message ||
          "Failed to load drop-off points. Please check your Supabase table."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  // ---------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------

  const filteredPoints = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return points;

    return points.filter((point) => {
      return (
        point.name?.toLowerCase().includes(keyword) ||
        point.barangay?.toLowerCase().includes(keyword) ||
        point.address?.toLowerCase().includes(keyword) ||
        point.partner?.toLowerCase().includes(keyword)
      );
    });
  }, [points, search]);

  // ---------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------

  const totalPoints = points.length;

  const activePoints = points.filter(
    (point) => point.is_active !== false
  ).length;

  const inactivePoints = points.filter(
    (point) => point.is_active === false
  ).length;

  const barangayCount = new Set(
    points.map((point) => point.barangay).filter(Boolean)
  ).size;

  // ---------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleDevice = (device) => {
    setForm((prev) => {
      const exists = prev.accepted_devices.includes(device);

      return {
        ...prev,
        accepted_devices: exists
          ? prev.accepted_devices.filter((item) => item !== device)
          : [...prev.accepted_devices, device],
      };
    });
  };

  // ---------------------------------------------------------
  // OPEN ADD MODAL
  // ---------------------------------------------------------

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // ---------------------------------------------------------
  // OPEN EDIT MODAL
  // ---------------------------------------------------------

  const openEditModal = (point) => {
    setEditingId(point.id);

    setForm({
      name: point.name || "",
      barangay: point.barangay || "",
      city: point.city || "Valenzuela City",
      address: point.address || "",
      contact: point.contact || "",
      partner: point.partner || "",
      operating_hours: point.operating_hours || "",
      accepted_devices: Array.isArray(point.accepted_devices)
        ? point.accepted_devices
        : [],
      latitude:
        point.latitude !== null && point.latitude !== undefined
          ? String(point.latitude)
          : "",
      longitude:
        point.longitude !== null && point.longitude !== undefined
          ? String(point.longitude)
          : "",
      is_active: point.is_active !== false,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // ---------------------------------------------------------
  // CLOSE MODAL
  // ---------------------------------------------------------

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  // ---------------------------------------------------------
  // VALIDATE
  // ---------------------------------------------------------

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Drop-off point name is required.";
    }

    if (!form.barangay.trim()) {
      return "Barangay is required.";
    }

    if (!form.address.trim()) {
      return "Address is required.";
    }

    if (
      form.latitude === "" ||
      form.latitude === null ||
      form.latitude === undefined
    ) {
      return "Latitude is required.";
    }

    if (
      form.longitude === "" ||
      form.longitude === null ||
      form.longitude === undefined
    ) {
      return "Longitude is required.";
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      return "Latitude must be between -90 and 90.";
    }

    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      return "Longitude must be between -180 and 180.";
    }

    return null;
  };

  // ---------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        barangay: form.barangay.trim(),
        city: form.city.trim() || "Valenzuela City",
        address: form.address.trim(),
        contact: form.contact.trim() || null,
        partner: form.partner.trim() || null,
        operating_hours: form.operating_hours.trim() || null,
        accepted_devices: form.accepted_devices,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("drop_off_points")
          .update(payload)
          .eq("id", editingId);

        if (updateError) throw updateError;

        setSuccess("Drop-off point updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("drop_off_points")
          .insert([payload]);

        if (insertError) throw insertError;

        setSuccess("Drop-off point added successfully.");
      }

      await fetchPoints();

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Save error:", err);

      setError(
        err.message ||
          "Failed to save the drop-off point. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------

  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      const { error: deleteError } = await supabase
        .from("drop_off_points")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setPoints((prev) => prev.filter((point) => point.id !== id));

      setSuccess("Drop-off point deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);

      setError(
        err.message ||
          "Failed to delete the drop-off point."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------------------------------------------------
  // TOGGLE ACTIVE STATUS
  // ---------------------------------------------------------

  const toggleActive = async (point) => {
    try {
      const newStatus = point.is_active === false;

      const { error: updateError } = await supabase
        .from("drop_off_points")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", point.id);

      if (updateError) throw updateError;

      setPoints((prev) =>
        prev.map((item) =>
          item.id === point.id
            ? {
                ...item,
                is_active: newStatus,
              }
            : item
        )
      );
    } catch (err) {
      console.error("Status update error:", err);

      setError(
        err.message ||
          "Failed to update the drop-off point status."
      );
    }
  };

  // ---------------------------------------------------------
  // OPEN MAP
  // ---------------------------------------------------------

  const openMap = (point) => {
    if (
      point.latitude === null ||
      point.latitude === undefined ||
      point.longitude === null ||
      point.longitude === undefined
    ) {
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="max-w-[1600px] mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MapPin size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-slate-800">
                  Drop-off Points Management
                </h1>

                <p className="text-sm text-slate-400 mt-1">
                  Manage official e-waste collection and drop-off locations.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPoints}
              disabled={loading}
              className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center gap-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />

              Refresh
            </button>

            <button
              onClick={openAddModal}
              className="h-11 px-4 rounded-xl bg-[#2D7A7F] text-white flex items-center gap-2 text-sm font-semibold hover:opacity-90 shadow-sm"
            >
              <Plus size={17} />

              Add Drop-off Point
            </button>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-start gap-3">
            <XCircle size={18} className="mt-0.5 shrink-0" />

            <div className="flex-1">{error}</div>

            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-3">
            <CheckCircle2 size={18} />

            <span className="flex-1">{success}</span>

            <button onClick={() => setSuccess("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs text-slate-400 mb-2">
              Total Drop-off Points
            </p>

            <h2 className="text-3xl font-semibold text-slate-800">
              {totalPoints}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs text-slate-400 mb-2">
              Active Locations
            </p>

            <h2 className="text-3xl font-semibold text-emerald-600">
              {activePoints}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs text-slate-400 mb-2">
              Inactive Locations
            </p>

            <h2 className="text-3xl font-semibold text-slate-500">
              {inactivePoints}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs text-slate-400 mb-2">
              Barangays Covered
            </p>

            <h2 className="text-3xl font-semibold text-blue-600">
              {barangayCount}
            </h2>
          </div>
        </div>

        {/* SEARCH */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm mb-6">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, barangay, address, or partner..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]/20 focus:border-[#2D7A7F] text-sm"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Registered Drop-off Points
            </h2>

            <p className="text-xs text-slate-400 mt-1">
              {filteredPoints.length} location
              {filteredPoints.length !== 1 ? "s" : ""} shown
            </p>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw size={28} className="animate-spin mb-3" />

              <p className="text-sm">
                Loading drop-off points...
              </p>
            </div>
          ) : filteredPoints.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
                <MapPin size={25} />
              </div>

              <h3 className="font-semibold text-slate-700">
                No drop-off points found
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                Add your first drop-off point to get started.
              </p>

              <button
                onClick={openAddModal}
                className="mt-5 px-4 py-2.5 rounded-xl bg-[#2D7A7F] text-white text-sm font-semibold"
              >
                Add Drop-off Point
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Location
                    </th>

                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Barangay
                    </th>

                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Partner
                    </th>

                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Contact
                    </th>

                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Coordinates
                    </th>

                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>

                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPoints.map((point) => (
                    <tr
                      key={point.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition"
                    >
                      {/* LOCATION */}
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <MapPin size={18} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-700">
                              {point.name}
                            </p>

                            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                              {point.address}
                            </p>

                            {point.operating_hours && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                                <Clock size={12} />

                                {point.operating_hours}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* BARANGAY */}
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-slate-700">
                          {point.barangay}
                        </span>
                      </td>

                      {/* PARTNER */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building2
                            size={15}
                            className="text-slate-400"
                          />

                          {point.partner || "—"}
                        </div>
                      </td>

                      {/* CONTACT */}
                      <td className="px-6 py-5">
                        {point.contact ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone
                              size={14}
                              className="text-slate-400"
                            />

                            {point.contact}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      {/* COORDINATES */}
                      <td className="px-6 py-5">
                        {point.latitude !== null &&
                        point.longitude !== null ? (
                          <button
                            onClick={() => openMap(point)}
                            className="text-left group"
                            title="Open coordinates in Google Maps"
                          >
                            <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:underline">
                              <Navigation size={14} />

                              {Number(point.latitude).toFixed(6)}
                            </div>

                            <p className="text-xs text-slate-400 mt-1">
                              {Number(point.longitude).toFixed(6)}
                            </p>
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">
                            No coordinates
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-5">
                        <button
                          onClick={() => toggleActive(point)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            point.is_active !== false
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              point.is_active !== false
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />

                          {point.is_active !== false
                            ? "Active"
                            : "Inactive"}
                        </button>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(point)}
                            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(point.id, point.name)
                            }
                            disabled={deletingId === point.id}
                            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === point.id ? (
                              <RefreshCw
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden">

            {/* MODAL HEADER */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {editingId
                    ? "Edit Drop-off Point"
                    : "Add Drop-off Point"}
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Enter the official details and GPS coordinates.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto max-h-[calc(90vh-150px)]"
            >
              <div className="p-6 space-y-6">

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* BASIC INFORMATION */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">
                    Location Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* NAME */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Drop-off Point Name *
                      </label>

                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Valenzuela E-Waste Collection Center"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]/20 focus:border-[#2D7A7F]"
                      />
                    </div>

                    {/* BARANGAY */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Barangay *
                      </label>

                      <select
                        name="barangay"
                        value={form.barangay}
                        onChange={handleChange}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]/20 focus:border-[#2D7A7F]"
                      >
                        <option value="">
                          Select barangay
                        </option>

                        {BARANGAYS.map((barangay) => (
                          <option
                            key={barangay}
                            value={barangay}
                          >
                            {barangay}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CITY */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        City
                      </label>

                      <input
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none"
                      />
                    </div>

                    {/* ADDRESS */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Complete Address *
                      </label>

                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Enter the complete physical address"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]/20 focus:border-[#2D7A7F]"
                      />
                    </div>
                  </div>
                </div>

                {/* GPS */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Navigation size={17} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">
                        GPS Coordinates
                      </h3>

                      <p className="text-xs text-slate-400 mt-1">
                        Use the official latitude and longitude of
                        the physical drop-off location.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* LATITUDE */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Latitude *
                      </label>

                      <input
                        type="number"
                        name="latitude"
                        value={form.latitude}
                        onChange={handleChange}
                        step="any"
                        min="-90"
                        max="90"
                        placeholder="e.g. 14.7011"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    {/* LONGITUDE */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Longitude *
                      </label>

                      <input
                        type="number"
                        name="longitude"
                        value={form.longitude}
                        onChange={handleChange}
                        step="any"
                        min="-180"
                        max="180"
                        placeholder="e.g. 120.9830"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* CONTACT */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">
                    Contact & Operations
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Contact Number
                      </label>

                      <input
                        name="contact"
                        value={form.contact}
                        onChange={handleChange}
                        placeholder="e.g. 09XX XXX XXXX"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]/20 focus:border-[#2D7A7F]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Partner / NGO
                      </label>

                      <input
                        name="partner"
                        value={form.partner}
                        onChange={handleChange}
                        placeholder="e.g. Barangay Environment Office"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]/20 focus:border-[#2D7A7F]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Operating Hours
                      </label>

                      <input
                        name="operating_hours"
                        value={form.operating_hours}
                        onChange={handleChange}
                        placeholder="e.g. Mon-Fri, 8:00 AM - 5:00 PM"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]/20 focus:border-[#2D7A7F]"
                      />
                    </div>

                    {/* STATUS */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">
                        Status
                      </label>

                      <label className="h-11 px-4 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={form.is_active}
                          onChange={handleChange}
                          className="w-4 h-4 accent-[#2D7A7F]"
                        />

                        <span className="text-sm text-slate-600">
                          Active drop-off point
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ACCEPTED DEVICES */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Accepted Devices
                  </h3>

                  <p className="text-xs text-slate-400 mb-4">
                    Select the types of e-waste accepted at this location.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {DEVICE_OPTIONS.map((device) => {
                      const selected =
                        form.accepted_devices.includes(device);

                      return (
                        <button
                          type="button"
                          key={device}
                          onClick={() => toggleDevice(device)}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                            selected
                              ? "border-[#2D7A7F] bg-[#2D7A7F]/10 text-[#2D7A7F]"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {device}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#2D7A7F] text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />

                      {editingId
                        ? "Save Changes"
                        : "Add Drop-off Point"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropOffPoints;
