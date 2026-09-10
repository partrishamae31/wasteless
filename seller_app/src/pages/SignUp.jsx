import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Upload, MapPin } from "lucide-react";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BARANGAY_COORDINATES = {
  "Arkong Bato": [14.6756, 120.9576],
  Bagbaguin: [14.7038, 120.9973],
  Balangkas: [14.6768, 120.9696],
  Bignay: [14.7002, 121.0165],
  Bisig: [14.6852, 120.9664],
  "Canumay East": [14.6908, 120.9884],
  "Canumay West": [14.6877, 120.9794],

  // Corrected Coloong location
  Coloong: [14.7240, 120.9433],

  Dalandanan: [14.6918, 120.9785],
  "Gen. T. de Leon": [14.6907, 121.0122],
  Isla: [14.6888, 120.9607],
  Karuhatan: [14.6847, 120.9747],
  "Lawang Bato": [14.7154, 121.0034],
  Lingunan: [14.6984, 120.9819],
  Mabolo: [14.6786, 120.9845],
  Malanday: [14.7024, 120.9711],
  Malinta: [14.6798, 120.9707],
  "Mapulang Lupa": [14.7155, 121.0173],
  Marulas: [14.6737, 120.9659],
  Maysan: [14.6950, 120.9922],
  Palasan: [14.6808, 120.9745],
  "Pariancillo Villa": [14.6818, 120.9596],
  "Paso de Blas": [14.7105, 120.9960],
  Pasolo: [14.7093, 120.9600],
  Poblacion: [14.6911, 120.9661],
  Pulo: [14.6971, 120.9672],
  Punturin: [14.7237, 121.0180],
  Rincon: [14.6780, 120.9507],
  Tagalag: [14.7163, 120.9494],
  Ugong: [14.6736, 121.0142],
  "Veinte Reales": [14.7104, 121.0051],
  "Wawang Pulo": [14.7285, 120.9604],
};

const VALENZUELA_CENTER = [14.676, 120.983];

const repairShopPin = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const LocationSelector = ({ position, onChange }) => {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      icon={repairShopPin}
      draggable={true}
      eventHandlers={{
        dragend: (event) => {
          const marker = event.target;
          const location = marker.getLatLng();

          onChange([location.lat, location.lng]);
        },
      }}
    />
  );
};

const SignUp = ({ onLoginClick }) => {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shopLocation, setShopLocation] = useState(null);
  const permitRef = React.useRef();
  const techRef = React.useRef();
  const valenzuelaBarangays = [
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
    "Mabolo",
    "Malanday",
    "Malinta",
    "Mapulang Lupa",
    "Marulas",
    "Maysan",
    "Palasan",
    "Pariancillo Villa",
    "Paso de Blas",
    "Pasolo",
    "Poblacion",
    "Pulo",
    "Punturin",
    "Rincon",
    "Tagalag",
    "Ugong",
    "Viente Reales",
    "Wawang Pulo",
  ];

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    barangay: "",
    password: "",
    confirmPassword: "",

    // Repair Shop
    businessName: "",
    address: "",
    businessPermit: null,
    certificationType: "",
    otherCertification: "",
    techCert: null,
  });

  const certificationOptions = [
    {
      value: "NC I",
      label: "NC I — Electronics Products Assembly and Servicing",
    },
    {
      value: "NC II",
      label: "NC II — Consumer Electronics Servicing",
    },
    {
      value: "NC III",
      label: "NC III — Industrial Electronics Servicing",
    },
    {
      value: "TESDA COC",
      label: "TESDA Certificate of Competency (COC)",
    },
    {
      value: "DTI Accreditation",
      label: "DTI Accreditation",
    },
    {
      value: "DepEd Tech-Voc Completion",
      label: "DepEd Tech-Voc Completion",
    },
    {
      value: "Other Certification",
      label: "Other Certification",
    },
  ];

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
  const { name, value } = e.target;

  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));

  if (errors[name]) {
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }

  // Set the initial repair-shop map position
  // based on the selected barangay.
  if (
    name === "barangay" &&
    accountType === "repair_shop" &&
    BARANGAY_COORDINATES[value]
  ) {
    setShopLocation(BARANGAY_COORDINATES[value]);
  }
};

  const handleFileChange = (e, field) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or JPEG file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must not exceed 5MB.");
      e.target.value = "";
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: file,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateStep2 = () => {
    let newErrors = {};
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.contactNumber)
      newErrors.contactNumber = "Contact number is required";
    if (!formData.barangay) newErrors.barangay = "Please select your barangay";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getInitialShopLocation = () => {
    return (
      BARANGAY_COORDINATES[formData.barangay] ||
      VALENZUELA_CENTER
    );
  };

  const handleContinue = async () => {
    if (step === 1 && accountType) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
      return;
    }

    if (step === 3) {
      // =========================
      // REPAIR SHOP
      // =========================
      if (accountType === "repair_shop") {
        if (!formData.businessName.trim()) {
          alert("Please enter your Shop / Business Name.");
          return;
        }

        if (!formData.address.trim()) {
          alert("Please enter your shop address.");
          return;
        }

        if (!shopLocation) {
          alert("Please select your shop location on the map.");
          return;
        }

        if (!formData.businessPermit) {
          alert("Please upload your Business Permit / DTI Registration.");
          return;
        }

        if (!formData.certificationType) {
          alert("Please select a Certification Type.");
          return;
        }

        if (
          formData.certificationType === "Other Certification" &&
          !formData.otherCertification.trim()
        ) {
          alert("Please specify your certification.");
          return;
        }

        if (!formData.techCert) {
          alert("Please upload your Certification Document.");
          return;
        }

        await handleFinalSubmit();
        return;
      }

      // =========================
      // HARVESTER
      // =========================
      if (accountType === "harvester") {
        const idFile = permitRef.current?.files?.[0];

        if (!idFile) {
          alert("Please upload a Valid Government ID");
          return;
        }

        setFormData((prev) => ({
          ...prev,
          businessPermit: idFile,
        }));

        setIsSubmitted(true);
        return;
      }

      // =========================
      // SELLER
      // =========================
      if (accountType === "seller") {
        const idFile = permitRef.current?.files?.[0];

        if (!idFile) {
          alert("Please upload a Valid ID");
          return;
        }

        setFormData((prev) => ({
          ...prev,
          businessPermit: idFile,
        }));

        setIsSubmitted(true);
      }
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);

    try {
      const autoVerify = false;

      // =========================
      // DETERMINE FINAL ROLE
      // =========================
      const finalRole = accountType;

      // =========================
      // CREATE AUTH ACCOUNT
      // =========================
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,

        options: {
          data: {
            full_name: formData.fullName,

            // SAVE CORRECT ROLE
            role: finalRole,

            buyer_type: finalRole,

            barangay: formData.barangay,
            contact_number: formData.contactNumber,
            business_name: formData.businessName,

            is_verified: autoVerify,
            status: autoVerify ? "Active" : "Pending",
          },
        },
      });

      if (authError) throw authError;

      if (!authData?.user) {
        throw new Error("User creation failed.");
      }

      const userId = authData.user.id;

      // =========================
      // PROFILE UPDATES
      // =========================
      let updates = {
  full_name: formData.fullName,
  email: formData.email,
  contact_number: formData.contactNumber,
  barangay: formData.barangay,

  role: finalRole,

  business_name: formData.businessName || null,

  // Repair Shop location
  address:
    finalRole === "repair_shop"
      ? formData.address.trim()
      : null,

  latitude:
    finalRole === "repair_shop" && shopLocation
      ? shopLocation[0]
      : null,

  longitude:
    finalRole === "repair_shop" && shopLocation
      ? shopLocation[1]
      : null,

  verification_status: "pending",
  is_verified: false,
  status: "Pending",

  average_rating: 0,
  total_reviews: 0,

  certification_type:
    finalRole === "repair_shop"
      ? formData.certificationType
      : null,

  other_certification:
    finalRole === "repair_shop" &&
    formData.certificationType === "Other Certification"
      ? formData.otherCertification
      : null,
};

      // =========================
      // SELLER ID UPLOAD
      // =========================
      if (
        (accountType === "seller" || finalRole === "harvester") &&
        formData.businessPermit
      ) {
        const file = formData.businessPermit;

        const fileExt = file.name.split(".").pop();

        const fileName = `${userId}/permit_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("verifications")
          .upload(`permits/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("verifications")
          .getPublicUrl(`permits/${fileName}`);

        updates.business_permit_url = data.publicUrl;
      }

      // =========================
      // REPAIR SHOP FILES
      // =========================
      if (finalRole === "repair_shop") {
        // BUSINESS PERMIT
        if (formData.businessPermit) {
          const file = formData.businessPermit;

          const fileExt = file.name.split(".").pop();

          const fileName = `${userId}/permit_${Date.now()}.${fileExt}`;

          const { error } = await supabase.storage
            .from("verifications")
            .upload(`permits/${fileName}`, file);

          if (error) throw error;

          const { data } = supabase.storage
            .from("verifications")
            .getPublicUrl(`permits/${fileName}`);

          updates.business_permit_url = data.publicUrl;
        }

        // TECH CERT
        if (formData.techCert) {
          const file = formData.techCert;

          const fileExt = file.name.split(".").pop();

          const fileName = `${userId}/cert_${Date.now()}.${fileExt}`;

          const { error } = await supabase.storage
            .from("verifications")
            .upload(`certs/${fileName}`, file);

          if (error) throw error;

          const { data } = supabase.storage
            .from("verifications")
            .getPublicUrl(`certs/${fileName}`);

          updates.tech_cert_url = data.publicUrl;
        }
      }

      // =========================
      // UPDATE PROFILE TABLE
      // =========================
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (profileError) throw profileError;

      alert(
        autoVerify
          ? "Account created! You can now log in."
          : "Registration submitted! Please wait for admin approval.",
      );
    } catch (err) {
      console.error(err);

      alert("Registration Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const steps = [1, 2, 3];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1a4567] via-[#2d7a7f] to-[#6da43a] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        <div className="bg-gradient-to-r from-[#448b78] to-[#6da43a] p-6 text-white text-left flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a13 13 0 0 1-13 13L8.1 20H11Z" />
              <path d="M19 2c-3 1.5-6.5 4-8 10" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">Join Wasteless</h2>
            <p className="text-[10px] opacity-90">Create your account</p>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-center mb-8 relative">
            <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-gray-100 -z-0"></div>
            <div className="flex justify-between w-full px-4 relative z-10">
              {steps.map((num) => (
                <div
                  key={num}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= num
                    ? "bg-[#2d7a7f] text-white"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                >
                  {step > num || isSubmitted ? "✓" : num}
                </div>
              ))}
            </div>
          </div>

          {!isSubmitted && step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                Select Account Type
              </h3>

              <button
                onClick={() => setAccountType("harvester")}
                className={`w-full py-4 px-6 border rounded-xl text-sm transition-all text-center ${accountType === "harvester"
                  ? "border-teal-500 bg-teal-50 text-teal-700 font-bold"
                  : "border-gray-100 text-gray-600 hover:border-gray-300"
                  }`}
              >
                Community User / Tech-Harvester
                <span className="block text-[10px] font-normal text-gray-400 mt-1">
                  Buy working items or sell unused/non-working electronics
                </span>
              </button>

              <button
                onClick={() => setAccountType("repair_shop")}
                className={`w-full py-4 px-6 border rounded-xl text-sm transition-all text-center ${accountType === "repair_shop"
                  ? "border-teal-500 bg-teal-50 text-teal-700 font-bold"
                  : "border-gray-100 text-gray-600 hover:border-gray-300"
                  }`}
              >
                Repair Shop
                <span className="block text-[10px] font-normal text-gray-400 mt-1">
                  Buy items for parts or request repair services
                </span>
              </button>
              <button
                disabled={!accountType}
                onClick={handleContinue}
                className={`w-full mt-6 py-3 rounded-lg font-bold text-sm transition-all ${accountType ? "bg-[#2d7a7f] text-white hover:opacity-90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              >
                Continue
              </button>
            </div>
          )}

          {!isSubmitted && step === 2 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="fullName"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.fullName ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.fullName}
                  />
                  {errors.fullName && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="juan.delacruz@example.com"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.email ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.email}
                  />
                  {errors.email && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="contactNumber"
                    type="text"
                    placeholder="09123456789"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.contactNumber ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.contactNumber}
                  />
                  {errors.contactNumber && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.contactNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Barangay of Residence{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="barangay"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 appearance-none ${errors.barangay ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.barangay}
                  >
                    <option value="">Select barangay...</option>
                    {valenzuelaBarangays.map((brgy) => (
                      <option key={brgy} value={brgy}>
                        {brgy}
                      </option>
                    ))}
                  </select>
                  {errors.barangay && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.barangay}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder="........"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.password ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.password}
                  />
                  <p className="text-[9px] text-gray-400 mt-1.5">
                    Minimum 8 characters with uppercase, lowercase, and digit
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="........"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.confirmPassword ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 py-3 bg-[#2d7a7f] text-white rounded-xl font-bold text-sm hover:bg-[#246367] transition-all shadow-md"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {!isSubmitted && step === 3 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-xs font-bold text-emerald-900 mb-1">
                Professional Verification
              </h3>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  {accountType === "seller"
                    ? "To maintain a secure environment for all users, we require a quick credential verification for new seller accounts."
                    : accountType === "harvester"
                      ? "To verify your Tech-Harvester account, please upload a valid government ID."
                      : "Please provide your business and technical credentials for verification."}
                </p>
              </div>

              {/* =========================
        SELLER / HARVESTER
    ========================= */}
              {(accountType === "seller" || accountType === "harvester") && (
                <div className="space-y-6">

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Valid Government ID{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div
                      onClick={() => permitRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer transition-colors ${formData.businessPermit
                          ? "border-emerald-400 bg-emerald-50/10"
                          : "border-gray-200"
                        }`}
                    >
                      <input
                        type="file"
                        ref={permitRef}
                        accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, "businessPermit")
                        }
                      />

                      <Upload
                        className={
                          formData.businessPermit
                            ? "text-emerald-500 mb-2"
                            : "text-gray-400 mb-2"
                        }
                        size={24}
                      />

                      <span className="text-teal-600 font-semibold text-sm">
                        {formData.businessPermit
                          ? "File uploaded successfully!"
                          : "Click to upload"}
                      </span>

                      <span className="text-gray-400 text-[10px] mt-1">
                        {formData.businessPermit
                          ? formData.businessPermit.name
                          : "PDF or JPEG (max 5MB)"}
                      </span>
                    </div>
                  </div>

                  {/* ROLE DESCRIPTION */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {accountType === "harvester"
                        ? "As a Tech-Harvester, you can buy working second-hand electronics and sell unused or non-working electronics on Wasteless."
                        : "As a Seller, you can create listings and sell eligible electronics on Wasteless."}
                    </p>
                  </div>
                </div>
              )}

              {/* =========================
        REPAIR SHOP
    ========================= */}
              {accountType === "repair_shop" && (
                <div className="space-y-6">

                  {/* BUSINESS NAME */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Business/Shop Name{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <input
                      name="businessName"
                      type="text"
                      placeholder="Enter your business name"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      onChange={handleChange}
                      value={formData.businessName || ""}
                    />
                  </div>

                  {/* SHOP ADDRESS */}
<div>
  <label className="text-[11px] font-bold text-gray-700 block mb-2">
    Shop Address{" "}
    <span className="text-red-500">*</span>
  </label>

  <textarea
    name="address"
    rows={3}
    placeholder="Enter your complete shop address"
    value={formData.address}
    onChange={handleChange}
    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  />

  <p className="text-[9px] text-gray-400 mt-1.5">
    Enter the address of your actual repair shop location.
  </p>
</div>

{/* =========================
    SHOP LOCATION
========================= */}
<div>
  <label className="text-[11px] font-bold text-gray-700 block mb-2">
    Shop Location{" "}
    <span className="text-red-500">*</span>
  </label>

  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3">
    <div className="flex items-start gap-2">
      <MapPin
        size={16}
        className="text-emerald-600 mt-0.5 shrink-0"
      />

      <p className="text-[10px] text-emerald-800 leading-relaxed">
        Select the exact location of your repair shop.
        Click on the map or drag the pin to position it
        at your shop.
      </p>
    </div>
  </div>

  <div className="relative overflow-hidden rounded-xl border border-gray-200">
    <MapContainer
      center={
        shopLocation ||
        getInitialShopLocation()
      }
      zoom={15}
      scrollWheelZoom={true}
      style={{
        height: "300px",
        width: "100%",
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationSelector
        position={
          shopLocation ||
          getInitialShopLocation()
        }
        onChange={setShopLocation}
      />
    </MapContainer>
  </div>

  {shopLocation ? (
    <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
      <p className="text-[9px] font-semibold text-gray-600">
        Selected shop location
      </p>

      <p className="text-[9px] text-gray-400 mt-0.5">
        Latitude: {shopLocation[0].toFixed(6)}
        {" • "}
        Longitude: {shopLocation[1].toFixed(6)}
      </p>
    </div>
  ) : (
    <p className="text-[9px] text-gray-400 mt-1.5">
      A starting location based on your selected barangay
      will be shown. Please move the pin to your actual
      shop location.
    </p>
  )}
</div>

                  {/* BUSINESS PERMIT */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Business Permit / DTI Registration{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div
                      onClick={() => permitRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer transition-colors ${formData.businessPermit
                          ? "border-emerald-400 bg-emerald-50/10"
                          : "border-gray-200"
                        }`}
                    >
                      <input
                        type="file"
                        ref={permitRef}
                        accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, "businessPermit")
                        }
                      />

                      <Upload
                        className={
                          formData.businessPermit
                            ? "text-emerald-500 mb-2"
                            : "text-gray-400 mb-2"
                        }
                        size={24}
                      />

                      <span className="text-teal-600 font-semibold text-sm">
                        {formData.businessPermit
                          ? "Permit uploaded!"
                          : "Click to upload"}
                      </span>

                      <span className="text-gray-400 text-[10px] mt-1">
                        {formData.businessPermit
                          ? formData.businessPermit.name
                          : "PDF or JPEG (max 5MB)"}
                      </span>
                    </div>
                  </div>

                  {/* CERTIFICATION TYPE */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Certification Type{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="certificationType"
                      value={formData.certificationType}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="">
                        Select certification type...
                      </option>

                      {certificationOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* OTHER CERTIFICATION */}
                  {formData.certificationType === "Other Certification" && (
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">
                        Specify Certification{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        name="otherCertification"
                        type="text"
                        placeholder="Enter certification name"
                        value={formData.otherCertification}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  )}

                  {/* TECHNICAL CERTIFICATION */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Technical Certification{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div
                      onClick={() => techRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer transition-colors ${formData.techCert
                          ? "border-emerald-400 bg-emerald-50/10"
                          : "border-gray-200"
                        }`}
                    >
                      <input
                        type="file"
                        ref={techRef}
                        accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, "techCert")
                        }
                      />

                      <Upload
                        className={
                          formData.techCert
                            ? "text-emerald-500 mb-2"
                            : "text-gray-400 mb-2"
                        }
                        size={24}
                      />

                      <span className="text-teal-600 font-semibold text-sm">
                        {formData.techCert
                          ? "Certification uploaded!"
                          : "Click to upload"}
                      </span>

                      <span className="text-gray-400 text-[10px] mt-1">
                        {formData.techCert
                          ? formData.techCert.name
                          : "PDF or JPEG (max 5MB)"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================
        BUTTONS
    ========================= */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={loading}
                  className="flex-1 py-2 bg-[#2d7a7f] text-white rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Continue"}
                </button>
              </div>
            </div>
          )}


          {isSubmitted && (
            <div className="space-y-6 animate-fadeIn text-left">
              <h3 className="text-sm font-bold text-gray-700">
                Complete Registration
              </h3>
              <div className="bg-[#fffdf0] border border-[#fdf5d3] p-8 rounded-xl flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-2 border-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-orange-400 font-bold text-xl">!</span>
                </div>
                <p className="text-[11px] text-gray-600 text-center leading-relaxed max-w-[280px]">
                  Click "Complete Registration" to submit your account for
                  verification. Your account will be activated after
                  administrator approval.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="flex-1 py-2.5 border border-gray-100 text-gray-500 rounded-lg font-medium text-xs hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#6da43a] text-white rounded-lg font-medium text-xs shadow-sm hover:bg-[#5f8f32] disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Complete Registration"}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-gray-400 mt-6">
            Already have an account?{" "}
            <span
              onClick={onLoginClick}
              className="text-teal-600 font-bold cursor-pointer hover:underline"
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
