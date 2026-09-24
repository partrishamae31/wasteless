// DonationTab.jsx
// Repair Shop Donation / E-Waste Drop-off Tab

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  MapPin,
  Plus,
  Navigation,
  Calendar,
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Package,
  X,
  ImagePlus,
  AlertCircle,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Trash2,
  RefreshCw,
} from "lucide-react";

const deviceCategories = [
  {
    label: "Smartphone",
    icon: Smartphone,
  },
  {
    label: "Laptop",
    icon: Laptop,
  },
  {
    label: "Tablet",
    icon: Tablet,
  },
  {
    label: "Monitor",
    icon: Monitor,
  },
  {
    label: "Others",
    icon: Package,
  },
  {
    label: "Parts",
    icon: Package,
  },
];

const functionalIssues = [
  "Won't Power On",
  "Dead/Degraded Battery",
  "Charging Problems",
  "Display Not Working (black screen, lines)",
  "Touch Screen Not Responding",
  "Camera Not Working",
  "Speaker/Microphone Issues",
  "Wi-Fi/Bluetooth Not Working",
  "Buttons Not Working",
];

const cosmeticIssues = [
  "Minor Dents/Scratches",
  "Paint Chipping/Fading",
  "Discoloration",
];

const defaultDropOffPoint = {
  id: "",
  name: "No drop-off center selected",
  barangay: "",
  city: "",
  address: "",
  contact: "",
  partner: "",
  operating_hours: "",
  accepted_devices: [],
  latitude: null,
  longitude: null,
};

const DonationTab = ({ profileData }) => {
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

  const [step, setStep] = useState(1);

  const [selectedCategory, setSelectedCategory] = useState("Smartphone");
  const [model, setModel] = useState("");

  const [deviceCondition, setDeviceCondition] = useState("Working");

  const [selectedFunctionalIssues, setSelectedFunctionalIssues] = useState(
    [],
  );

  const [selectedCosmeticIssues, setSelectedCosmeticIssues] = useState([]);

  const [noVisibleDamage, setNoVisibleDamage] = useState(false);

  const [additionalDetails, setAdditionalDetails] = useState("");

  const [photos, setPhotos] = useState([]);

  const [sanitizationChecklist, setSanitizationChecklist] = useState({
    factoryReset: false,
    accountsRemoved: false,
    storageRemoved: false,
    personalFilesDeleted: false,
  });

  const [hazardAcknowledged, setHazardAcknowledged] = useState(false);

  const [dropOffPoints, setDropOffPoints] = useState([]);
  const [selectedDropOffPointId, setSelectedDropOffPointId] = useState("");

  const [loadingDropOffPoints, setLoadingDropOffPoints] = useState(false);
  const [dropOffError, setDropOffError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  // ---------------------------------------------------------
  // LOAD ACTIVE DROP-OFF POINTS
  // ---------------------------------------------------------

  const fetchDropOffPoints = async () => {
    try {
      setLoadingDropOffPoints(true);
      setDropOffError("");

      const { data, error } = await supabase
        .from("drop_off_points")
        .select(
          `
            id,
            name,
            barangay,
            city,
            address,
            contact,
            partner,
            operating_hours,
            accepted_devices,
            latitude,
            longitude,
            is_active
          `,
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      setDropOffPoints(data || []);

      // Automatically select the first available center
      // if there is only one and nothing has been selected.
      if (data?.length === 1 && !selectedDropOffPointId) {
        setSelectedDropOffPointId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading drop-off points:", error);

      setDropOffError(
        error?.message ||
          "Unable to load active e-waste drop-off centers.",
      );
    } finally {
      setLoadingDropOffPoints(false);
    }
  };

  useEffect(() => {
    fetchDropOffPoints();
  }, []);

  // ---------------------------------------------------------
  // SELECTED DROP-OFF POINT
  // ---------------------------------------------------------

  const selectedDropOffPoint = useMemo(() => {
    return (
      dropOffPoints.find(
        (point) =>
          String(point.id) === String(selectedDropOffPointId),
      ) || defaultDropOffPoint
    );
  }, [dropOffPoints, selectedDropOffPointId]);

  // ---------------------------------------------------------
  // ISSUE TOGGLES
  // ---------------------------------------------------------

  const toggleFunctionalIssue = (issue) => {
    setSelectedFunctionalIssues((prev) =>
      prev.includes(issue)
        ? prev.filter((item) => item !== issue)
        : [...prev, issue],
    );
  };

  const toggleCosmeticIssue = (issue) => {
    setSelectedCosmeticIssues((prev) =>
      prev.includes(issue)
        ? prev.filter((item) => item !== issue)
        : [...prev, issue],
    );
  };

  // ---------------------------------------------------------
  // PHOTO HANDLING
  // ---------------------------------------------------------

  const handlePhotoChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    const remainingSlots = Math.max(0, 5 - photos.length);

    const filesToAdd = selectedFiles.slice(0, remainingSlots);

    setPhotos((prev) => [...prev, ...filesToAdd]);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index));
  };

  // ---------------------------------------------------------
  // SANITIZATION
  // ---------------------------------------------------------

  const toggleSanitizationItem = (key) => {
    setSanitizationChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const sanitizationComplete =
    sanitizationChecklist.factoryReset &&
    sanitizationChecklist.accountsRemoved &&
    sanitizationChecklist.storageRemoved &&
    sanitizationChecklist.personalFilesDeleted;

  // ---------------------------------------------------------
  // STEP NAVIGATION
  // ---------------------------------------------------------

  const handleNext = () => {
    if (step === 1 && !model.trim()) {
      return;
    }

    if (step === 1 && !selectedDropOffPointId) {
      return;
    }

    if (step < 3) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  // ---------------------------------------------------------
  // RESET FORM
  // ---------------------------------------------------------

  const resetForm = () => {
    setStep(1);

    setSelectedCategory("Smartphone");
    setModel("");

    setDeviceCondition("Working");

    setSelectedFunctionalIssues([]);
    setSelectedCosmeticIssues([]);

    setNoVisibleDamage(false);

    setAdditionalDetails("");

    setPhotos([]);

    setSanitizationChecklist({
      factoryReset: false,
      accountsRemoved: false,
      storageRemoved: false,
      personalFilesDeleted: false,
    });

    setHazardAcknowledged(false);

    setSelectedDropOffPointId("");

    setSubmitMessage("");
    setSubmitError("");
  };

  // ---------------------------------------------------------
  // CLOSE MODAL
  // ---------------------------------------------------------

  const closeDonationModal = () => {
    if (isSubmitting) return;

    setIsDonationModalOpen(false);
    resetForm();
  };

  // ---------------------------------------------------------
  // SUBMIT DONATION
  // ---------------------------------------------------------

  const handleDonate = async () => {
    if (!model.trim()) {
      setSubmitError("Please enter the device model.");
      return;
    }

    if (!selectedDropOffPointId) {
      setSubmitError("Please select a drop-off center.");
      return;
    }

    if (!sanitizationComplete) {
      setSubmitError(
        "Please complete all required data sanitization checklist items.",
      );
      return;
    }

    if (!hazardAcknowledged) {
      setSubmitError(
        "Please acknowledge the hazardous-material handling requirements.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      setSubmitMessage("");

      /*
       * This component is intentionally not creating a seller listing.
       *
       * Repair shops are not sellers in Wasteless.
       *
       * The donation information can be connected to your existing
       * donation/recovery table or Edge Function later without turning
       * the repair shop into a seller/listing account.
       */

      const donationData = {
        category: selectedCategory,
        device_model: model.trim(),
        condition: deviceCondition,
        functional_issues: selectedFunctionalIssues,
        cosmetic_issues: selectedCosmeticIssues,
        no_visible_damage: noVisibleDamage,
        additional_details: additionalDetails.trim(),
        drop_off_point_id: selectedDropOffPointId,
        drop_off_point_name: selectedDropOffPoint?.name || null,
        drop_off_point_address: selectedDropOffPoint?.address || null,
        sanitization_completed: sanitizationComplete,
        hazard_acknowledged: hazardAcknowledged,
        photo_count: photos.length,
      };

      console.log(
        "Repair shop donation submission:",
        donationData,
      );

      /*
       * IMPORTANT:
       * No database INSERT is performed here because the supplied
       * DonationTab did not specify an existing repair-shop donation
       * table/schema.
       *
       * This prevents accidentally inserting into `listings`, which
       * repair shops should not use for selling.
       */

      setSubmitMessage(
        "Donation information completed. Please bring the device to the selected e-waste center.",
      );

      setTimeout(() => {
        setIsDonationModalOpen(false);
        resetForm();
      }, 1800);
    } catch (error) {
      console.error("Repair shop donation error:", error);

      setSubmitError(
        error?.message ||
          "Unable to complete the donation request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <>
      <div className="space-y-6 animate-fadeIn">
        {/* HEADER */}
        <div className="flex justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#DDF3E2] flex items-center justify-center">
                <Building2
                  size={22}
                  className="text-[#3285a1]"
                />
              </div>

              <div>
                <h2 className="text-3xl font-black text-slate-800">
                  E-Waste Donation
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Repair Shop Drop-off Center
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500 mt-4 max-w-2xl">
              Donate unwanted, recovered, or end-of-life electronics from
              your repair shop to an authorized e-waste drop-off center.
              Devices submitted here are for proper recovery, recycling,
              or safe disposal and are not listed for sale.
            </p>

            <p className="text-xs text-slate-400 mt-2">
              Registered barangay:{" "}
              <span className="font-bold text-slate-600">
                {profileData?.barangay || "Not specified"}
              </span>
            </p>
          </div>

          <button
            onClick={() => {
              setSubmitMessage("");
              setSubmitError("");
              setIsDonationModalOpen(true);
              fetchDropOffPoints();
            }}
            className="bg-[#6DA43A] hover:bg-[#5e9032] transition-all text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-bold text-sm shadow-sm whitespace-nowrap"
          >
            <Plus size={18} />
            Donate / Dispose Device
          </button>
        </div>

        {/* DROP-OFF CENTER CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-7 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#12B347] flex items-center justify-center text-white shadow-sm">
                  <MapPin size={22} />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide font-bold text-emerald-600">
                    Available E-Waste Center
                  </p>

                  <h3 className="font-black text-slate-800 text-xl mt-1">
                    {selectedDropOffPoint.id
                      ? selectedDropOffPoint.name
                      : "Select a drop-off center"}
                  </h3>

                  {selectedDropOffPoint.id && (
                    <>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin
                          size={12}
                          className="text-red-400"
                        />

                        {selectedDropOffPoint.address ||
                          `${selectedDropOffPoint.barangay || ""}, ${
                            selectedDropOffPoint.city || ""
                          }`}
                      </p>

                      {selectedDropOffPoint.operating_hours && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                          <Calendar size={13} />

                          {selectedDropOffPoint.operating_hours}
                        </div>
                      )}

                      {selectedDropOffPoint.partner && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <Building2 size={13} />

                          Partner:{" "}
                          <span className="font-semibold">
                            {selectedDropOffPoint.partner}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (
                    selectedDropOffPoint.latitude &&
                    selectedDropOffPoint.longitude
                  ) {
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${selectedDropOffPoint.latitude},${selectedDropOffPoint.longitude}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
                disabled={
                  !selectedDropOffPoint.latitude ||
                  !selectedDropOffPoint.longitude
                }
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
                  selectedDropOffPoint.latitude &&
                  selectedDropOffPoint.longitude
                    ? "bg-white shadow-sm border border-slate-100 text-slate-500 hover:bg-slate-50"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
                title={
                  selectedDropOffPoint.latitude &&
                  selectedDropOffPoint.longitude
                    ? "Open location in Google Maps"
                    : "No map coordinates available"
                }
              >
                <Navigation size={18} />
              </button>
            </div>
          </div>

          {/* SIMPLE MAP AREA */}
          <div className="relative min-h-[360px] bg-[#DDF3E2]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[#12B347] flex flex-col items-center">
                <MapPin
                  size={70}
                  strokeWidth={2.5}
                />

                <p className="mt-3 font-bold text-slate-700">
                  E-Waste Drop-off Center
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {selectedDropOffPoint.id
                    ? selectedDropOffPoint.barangay ||
                      selectedDropOffPoint.city
                    : "Choose a center when donating"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* INFORMATION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <RefreshCw
                size={20}
                className="text-blue-600"
              />
            </div>

            <h3 className="font-bold text-slate-800">
              Recover & Recycle
            </h3>

            <p className="text-xs text-slate-500 mt-2">
              Help keep unwanted electronics out of regular waste streams.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <ShieldCheck
                size={20}
                className="text-emerald-600"
              />
            </div>

            <h3 className="font-bold text-slate-800">
              Data Protection
            </h3>

            <p className="text-xs text-slate-500 mt-2">
              Complete the required data-sanitization checklist before
              transferring devices.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
              <Trash2
                size={20}
                className="text-orange-600"
              />
            </div>

            <h3 className="font-bold text-slate-800">
              Safe Disposal
            </h3>

            <p className="text-xs text-slate-500 mt-2">
              Hazardous components such as batteries require proper
              handling.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          DONATION MODAL
      ===================================================== */}

      {isDonationModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-[760px] overflow-hidden animate-fadeIn max-h-[95vh] overflow-y-auto">
            {/* HEADER */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-200">
              <div>
                <h2 className="text-3xl font-black text-slate-800">
                  Donate Device
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Repair Shop E-Waste Transfer
                </p>
              </div>

              <button
                onClick={closeDonationModal}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-40"
              >
                <X size={24} />
              </button>
            </div>

            {/* STEPPER */}
            <div className="px-8 pt-8 flex items-center justify-center gap-3">
              {[1, 2, 3].map((s, index) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                      step >= s
                        ? "bg-[#3285a1] text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {step > s ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      s
                    )}
                  </div>

                  {index < 2 && (
                    <div
                      className={`w-28 h-1 rounded-full ${
                        step > s
                          ? "bg-[#3285a1]"
                          : "bg-slate-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* =================================================
                STEP 1
            ================================================= */}

            {step === 1 && (
              <div className="p-8 space-y-6">
                {/* DROP-OFF CENTER */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-800">
                      Select Drop-off Center
                    </h3>

                    <button
                      onClick={fetchDropOffPoints}
                      disabled={loadingDropOffPoints}
                      className="text-xs font-bold text-[#3285a1] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw
                        size={13}
                        className={
                          loadingDropOffPoints
                            ? "animate-spin"
                            : ""
                        }
                      />
                      Refresh
                    </button>
                  </div>

                  {loadingDropOffPoints ? (
                    <div className="border border-slate-200 rounded-2xl p-6 text-center">
                      <RefreshCw
                        size={22}
                        className="mx-auto text-[#3285a1] animate-spin"
                      />

                      <p className="text-sm text-slate-500 mt-2">
                        Loading active drop-off centers...
                      </p>
                    </div>
                  ) : dropOffError ? (
                    <div className="border border-red-200 bg-red-50 rounded-2xl p-4">
                      <p className="text-sm text-red-600">
                        {dropOffError}
                      </p>
                    </div>
                  ) : dropOffPoints.length === 0 ? (
                    <div className="border border-amber-200 bg-amber-50 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <AlertCircle
                          size={18}
                          className="text-amber-600 mt-0.5"
                        />

                        <div>
                          <p className="font-bold text-amber-800 text-sm">
                            No active drop-off centers
                          </p>

                          <p className="text-xs text-amber-700 mt-1">
                            There are currently no active e-waste
                            centers available for donation.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dropOffPoints.map((point) => {
                        const selected =
                          String(selectedDropOffPointId) ===
                          String(point.id);

                        return (
                          <button
                            key={point.id}
                            type="button"
                            onClick={() =>
                              setSelectedDropOffPointId(point.id)
                            }
                            className={`w-full text-left border rounded-2xl p-5 transition ${
                              selected
                                ? "border-[#3285a1] bg-[#EEF8FB]"
                                : "border-slate-200 hover:border-[#3285a1]/40"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  selected
                                    ? "bg-[#3285a1] text-white"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                <MapPin size={18} />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <h4 className="font-bold text-slate-800">
                                    {point.name}
                                  </h4>

                                  {selected && (
                                    <CheckCircle2
                                      size={19}
                                      className="text-[#3285a1]"
                                    />
                                  )}
                                </div>

                                <p className="text-xs text-slate-500 mt-1">
                                  {point.address ||
                                    `${point.barangay || ""}, ${
                                      point.city || ""
                                    }`}
                                </p>

                                {point.operating_hours && (
                                  <p className="text-xs text-slate-400 mt-2">
                                    {point.operating_hours}
                                  </p>
                                )}

                                {point.partner && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Partner: {point.partner}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CATEGORY */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-4">
                    Select Device Category
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {deviceCategories.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() =>
                            setSelectedCategory(item.label)
                          }
                          className={`border rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all ${
                            selectedCategory === item.label
                              ? "border-[#3285a1] bg-[#EEF8FB]"
                              : "border-slate-200 hover:border-[#3285a1]/40"
                          }`}
                        >
                          <Icon
                            size={34}
                            className={
                              selectedCategory === item.label
                                ? "text-[#3285a1]"
                                : "text-slate-400"
                            }
                          />

                          <span
                            className={`font-semibold ${
                              selectedCategory === item.label
                                ? "text-[#3285a1]"
                                : "text-slate-700"
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MODEL */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Device Model
                  </label>

                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. iPhone 11, Dell Inspiron 15"
                    className="w-full border border-slate-300 rounded-xl px-4 py-4 outline-none focus:border-[#3285a1]"
                  />
                </div>

                <button
                  disabled={!model.trim() || !selectedDropOffPointId}
                  onClick={handleNext}
                  className={`w-full py-4 rounded-2xl font-bold transition ${
                    model.trim() && selectedDropOffPointId
                      ? "bg-[#3285a1] text-white hover:bg-[#2d748d]"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>
              </div>
            )}

            {/* =================================================
                STEP 2
            ================================================= */}

            {step === 2 && (
              <div className="p-8 space-y-6">
                {/* PHOTO */}
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-3">
                    Photos ({photos.length}/5)
                  </p>

                  <label className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#3285a1]/50 transition">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handlePhotoChange}
                      disabled={photos.length >= 5}
                    />

                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <ImagePlus
                        size={28}
                        className="text-slate-400"
                      />
                    </div>

                    <p className="font-semibold text-slate-700">
                      Add photos
                    </p>

                    <p className="text-xs text-slate-400 mt-2">
                      JPG, PNG, or WEBP • Maximum 5 photos
                    </p>
                  </label>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {photos.map((photo, index) => (
                        <div
                          key={`${photo.name}-${index}`}
                          className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50"
                        >
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Device ${index + 1}`}
                            className="w-full h-28 object-cover"
                          />

                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CONDITION */}
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-3">
                    Device Condition
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Working",
                        desc: "Device is fully functional.",
                      },
                      {
                        title: "Defective",
                        desc: "Some components are not working.",
                      },
                      {
                        title: "Parts Only",
                        desc: "Device is primarily intended for component recovery.",
                      },
                    ].map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() =>
                          setDeviceCondition(item.title)
                        }
                        className={`w-full text-left border rounded-2xl p-5 transition ${
                          deviceCondition === item.title
                            ? "border-[#3285a1] bg-[#EEF8FB]"
                            : "border-slate-200 hover:border-[#3285a1]/40"
                        }`}
                      >
                        <h4 className="font-bold text-slate-800">
                          {item.title}
                        </h4>

                        <p className="text-xs text-slate-500 mt-1">
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DAMAGE ASSESSMENT */}
                <div className="bg-[#EEF5FF] border border-[#B9D4FF] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="text-[#3B82F6] mt-0.5"
                    />

                    <div>
                      <p className="font-bold text-[#2563EB] text-sm">
                        Damage Assessment
                      </p>

                      <p className="text-xs text-[#3B82F6] mt-1">
                        Please identify all known issues with the device.
                        This helps the receiving center determine the
                        appropriate handling method.
                      </p>
                    </div>
                  </div>
                </div>

                {/* NO DAMAGE */}
                <button
                  type="button"
                  onClick={() =>
                    setNoVisibleDamage(!noVisibleDamage)
                  }
                  className={`w-full border rounded-2xl p-5 flex items-start gap-3 transition ${
                    noVisibleDamage
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center ${
                      noVisibleDamage
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300"
                    }`}
                  >
                    {noVisibleDamage && (
                      <CheckCircle2
                        size={14}
                        className="text-white"
                      />
                    )}
                  </div>

                  <div className="text-left">
                    <p className="font-bold text-slate-800">
                      No Visible Damage
                    </p>

                    <p className="text-xs text-slate-500">
                      Device has no visible physical damage.
                    </p>
                  </div>
                </button>

                {/* FUNCTIONAL */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-3">
                    Functional Issues
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {functionalIssues.map((issue) => (
                      <button
                        key={issue}
                        type="button"
                        onClick={() =>
                          toggleFunctionalIssue(issue)
                        }
                        className={`border rounded-xl p-3 text-sm text-left transition ${
                          selectedFunctionalIssues.includes(
                            issue,
                          )
                            ? "border-[#3285a1] bg-[#EEF8FB] text-[#3285a1]"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {issue}
                      </button>
                    ))}
                  </div>
                </div>

                {/* COSMETIC */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-3">
                    Cosmetic Issues
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {cosmeticIssues.map((issue) => (
                      <button
                        key={issue}
                        type="button"
                        onClick={() =>
                          toggleCosmeticIssue(issue)
                        }
                        className={`border rounded-xl p-3 text-sm text-left transition ${
                          selectedCosmeticIssues.includes(
                            issue,
                          )
                            ? "border-[#3285a1] bg-[#EEF8FB] text-[#3285a1]"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {issue}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DETAILS */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Additional Details (Optional)
                  </label>

                  <textarea
                    rows={4}
                    value={additionalDetails}
                    onChange={(e) =>
                      setAdditionalDetails(e.target.value)
                    }
                    placeholder="Provide additional information about the device condition, repair history, or known issues..."
                    className="w-full border border-slate-300 rounded-2xl p-4 outline-none focus:border-[#3285a1]"
                  />
                </div>

                {/* FOOTER */}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleBack}
                    className="flex-1 border border-slate-300 py-4 rounded-2xl font-bold text-slate-700"
                  >
                    Back
                  </button>

                  <button
                    onClick={handleNext}
                    className="flex-1 bg-[#3285a1] text-white py-4 rounded-2xl font-bold hover:bg-[#2d748d]"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* =================================================
                STEP 3
            ================================================= */}

            {step === 3 && (
              <div className="p-8 space-y-6">
                {/* SELECTED CENTER SUMMARY */}
                <div className="bg-[#EEF8FB] border border-[#B9DDE8] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={20}
                      className="text-[#3285a1] mt-0.5"
                    />

                    <div>
                      <p className="text-xs uppercase font-bold tracking-wide text-[#3285a1]">
                        Selected Drop-off Center
                      </p>

                      <h3 className="font-bold text-slate-800 mt-1">
                        {selectedDropOffPoint.name}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        {selectedDropOffPoint.address ||
                          `${selectedDropOffPoint.barangay || ""}, ${
                            selectedDropOffPoint.city || ""
                          }`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* VIDEOS */}
                <div className="border border-red-200 bg-red-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">
                      ▶
                    </div>

                    <h3 className="font-bold text-slate-800">
                      Recommended Preparation Guides
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 mb-5">
                    Review these guides before transferring{" "}
                    <span className="font-bold">{model}</span>{" "}
                    to the e-waste center.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title:
                          "How to Factory Reset a Laptop",
                        desc:
                          "Complete reset guide for major laptop platforms.",
                      },
                      {
                        title:
                          "How to Safely Remove Hard Drive Data",
                        desc:
                          "Secure deletion and drive-wiping practices.",
                      },
                      {
                        title:
                          "Preparing Electronics for Donation",
                        desc:
                          "Cleaning, testing, and safe packaging tips.",
                      },
                    ].map((video, index) => (
                      <div
                        key={index}
                        className="bg-white border border-red-100 rounded-xl p-4 flex justify-between items-center"
                      >
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500">
                            ▶
                          </div>

                          <div>
                            <h4 className="font-semibold text-sm text-slate-800">
                              {video.title}
                            </h4>

                            <p className="text-xs text-slate-400 mt-1">
                              {video.desc}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="text-xs font-bold text-slate-400 hover:text-[#3285a1]"
                        >
                          Watch →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SANITIZATION */}
                <div className="bg-[#FFF8E7] border border-[#F5D27A] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="text-[#D97706] mt-0.5"
                    />

                    <div className="flex-1">
                      <h3 className="font-bold text-[#92400E] text-sm">
                        Data Sanitization Required
                      </h3>

                      <p className="text-xs text-[#B45309] mt-1">
                        Before transferring a device, make sure all
                        personal and business data has been removed.
                      </p>

                      <button
                        type="button"
                        className="mt-4 border border-[#F5D27A] bg-white hover:bg-[#FFF7E6] transition px-4 py-2 rounded-xl text-xs font-bold text-[#B45309]"
                      >
                        View Sanitization Guide
                      </button>
                    </div>
                  </div>
                </div>

                {/* CHECKLIST */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-4">
                    Data Sanitization Checklist{" "}
                    <span className="text-red-500">*</span>
                  </h3>

                  <div className="border border-slate-200 rounded-2xl p-5 space-y-5">
                    <p className="text-xs text-slate-400">
                      Confirm each required step has been completed
                      for <span className="font-bold">{model}</span>.
                    </p>

                    {[
                      {
                        key: "factoryReset",
                        title: "Factory reset performed",
                        desc:
                          "Device restored to its original factory settings.",
                      },
                      {
                        key: "accountsRemoved",
                        title:
                          "All accounts logged out and removed",
                        desc:
                          "Apple ID, Google account, Microsoft account, and other accounts signed out.",
                      },
                      {
                        key: "storageRemoved",
                        title:
                          "SIM card and memory card removed",
                        desc:
                          "All removable storage media extracted from the device.",
                      },
                      {
                        key: "personalFilesDeleted",
                        title: "Personal files deleted",
                        desc:
                          "Photos, documents, contacts, and personal data removed.",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            sanitizationChecklist[item.key]
                          }
                          onChange={() =>
                            toggleSanitizationItem(item.key)
                          }
                          className="mt-1"
                        />

                        <div>
                          <p className="font-semibold text-slate-700 text-sm">
                            {item.title}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            {item.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* HAZARD */}
                <div className="bg-[#FFF7ED] border border-[#FDBA74] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="text-[#EA580C] mt-0.5"
                    />

                    <div className="flex-1">
                      <h3 className="font-bold text-[#9A3412] text-sm">
                        Hazardous Materials
                      </h3>

                      <p className="text-xs text-[#C2410C] mt-1">
                        Electronics may contain batteries and other
                        components that require special handling.
                      </p>

                      <div className="inline-flex mt-3 px-3 py-1 rounded-full bg-white border border-orange-200 text-xs font-bold text-orange-700">
                        Lithium-Ion Battery
                      </div>

                      <button
                        type="button"
                        className="mt-4 block border border-orange-200 bg-white hover:bg-orange-50 transition px-4 py-2 rounded-xl text-xs font-bold text-orange-700"
                      >
                        View Handling & Disposal Guidelines
                      </button>

                      <label className="mt-4 flex gap-3 border border-slate-200 rounded-xl p-4 bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hazardAcknowledged}
                          onChange={(e) =>
                            setHazardAcknowledged(
                              e.target.checked,
                            )
                          }
                          className="mt-1"
                        />

                        <div>
                          <p className="font-bold text-slate-700 text-sm">
                            I acknowledge the presence of
                            hazardous materials
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            I have read the handling guidelines and
                            agree to comply with the applicable
                            safety requirements for disposal or
                            transfer.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* STATUS MESSAGE */}
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle
                        size={18}
                        className="text-red-500 mt-0.5"
                      />

                      <p className="text-sm text-red-600">
                        {submitError}
                      </p>
                    </div>
                  </div>
                )}

                {submitMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="flex gap-3">
                      <CheckCircle2
                        size={18}
                        className="text-emerald-600 mt-0.5"
                      />

                      <p className="text-sm text-emerald-700">
                        {submitMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* VALIDATION MESSAGE */}
                {!sanitizationComplete ||
                !hazardAcknowledged ? (
                  <div className="text-center text-red-500 text-xs font-medium">
                    Please complete all required data sanitization
                    and hazard acknowledgments before donating.
                  </div>
                ) : (
                  <div className="text-center text-emerald-600 text-xs font-medium">
                    All required safety confirmations are complete.
                  </div>
                )}

                {/* FOOTER */}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="flex-1 border border-slate-300 py-4 rounded-2xl font-bold text-slate-700 disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    onClick={handleDonate}
                    disabled={
                      isSubmitting ||
                      !sanitizationComplete ||
                      !hazardAcknowledged
                    }
                    className={`flex-1 py-4 rounded-2xl font-bold transition ${
                      !isSubmitting &&
                      sanitizationComplete &&
                      hazardAcknowledged
                        ? "bg-[#6DA43A] text-white hover:bg-[#5e9032]"
                        : "bg-slate-300 text-white cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : "Donate Device"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DonationTab;