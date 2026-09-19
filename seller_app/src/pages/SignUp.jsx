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
  const [scanningId, setScanningId] = useState(false);
  const [scanningPermit, setScanningPermit] = useState(false);
  const [scanningTechCert, setScanningTechCert] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [authUserId, setAuthUserId] = useState(null);
  const [shopLocation, setShopLocation] = useState(null);
  const governmentIdRef = React.useRef();
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
    governmentId: null,
    businessPermit: null,
    businessPermitNumber: "",
    permitType: "",
    permitIssuingLgu: "",
    permitIssueDate: "",
    permitExpiryDate: "",
    businessActivity: "",
    certificationType: "",
    otherCertification: "",
    techCert: null,
    techCertificateNumber: "",
    techCertificateIssuer: "",
    techCertificateTitle: "",
    techCertificateIssueDate: "",
    techCertificateExpiryDate: "",
    techSpecialization: "",
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
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF, JPEG, PNG, or WebP file.");
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

  const scanGovernmentId = async () => {
    const file = governmentIdRef.current?.files?.[0] || formData.governmentId;
    if (!file) { alert("Please upload your government ID first."); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) && file.type !== "application/pdf") {
      alert("Please upload a JPEG, PNG, WebP, or PDF ID."); return;
    }
    setScanningId(true);
    setScanMessage("Scanning ID…");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read the selected file."));
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("scan-government-id", {
        body: { mimeType: file.type, base64 },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Could not read the ID.");
      const extracted = data.fields || {};
      setFormData((prev) => ({
        ...prev,
        ...(typeof extracted.fullName === "string" && extracted.fullName.trim()
          ? { fullName: extracted.fullName.trim() } : {}),
        ...(typeof extracted.barangay === "string" && valenzuelaBarangays.includes(extracted.barangay)
          ? { barangay: extracted.barangay } : {}),
      }));
      setScanMessage("Scan complete. Please review the suggested name and barangay before continuing.");
    } catch (error) {
  console.error("Government ID scan failed:", error);

  if (error?.context) {
    try {
      const responseBody = await error.context.clone().text();
      console.error("Edge Function response:", responseBody);
    } catch (readError) {
      console.error("Could not read Edge Function response:", readError);
    }
  }

  alert("ID scan failed. Check the browser console and Supabase Edge Function logs.");
} finally { setScanningId(false); }
  };

  const scanBusinessPermit = async () => {
    const file = permitRef.current?.files?.[0] || formData.businessPermit;
    if (!file) {
      alert("Please upload your business permit first.");
      return;
    }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type) && file.type !== "application/pdf") {
      alert("Please upload a PDF, JPEG, PNG, or WebP permit.");
      return;
    }

    setScanningPermit(true);
    setScanMessage("Scanning business permit…");

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read the selected permit."));
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("scan-business-permit", {
        body: { mimeType: file.type, base64 },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Could not read the permit.");

      const extracted = data.fields || {};
      setFormData((prev) => ({
        ...prev,
        ...(typeof extracted.fullName === "string" && extracted.fullName.trim() ? { fullName: extracted.fullName.trim() } : {}),
        ...(typeof extracted.businessName === "string" && extracted.businessName.trim() ? { businessName: extracted.businessName.trim() } : {}),
        ...(typeof extracted.address === "string" && extracted.address.trim() ? { address: extracted.address.trim() } : {}),
        ...(typeof extracted.contactNumber === "string" && extracted.contactNumber.trim() ? { contactNumber: extracted.contactNumber.trim() } : {}),
        ...(typeof extracted.businessPermitNumber === "string" && extracted.businessPermitNumber.trim() ? { businessPermitNumber: extracted.businessPermitNumber.trim() } : {}),
        ...(typeof extracted.permitType === "string" && extracted.permitType.trim() ? { permitType: extracted.permitType.trim() } : {}),
        ...(typeof extracted.permitIssuingLgu === "string" && extracted.permitIssuingLgu.trim() ? { permitIssuingLgu: extracted.permitIssuingLgu.trim() } : {}),
        ...(typeof extracted.permitIssueDate === "string" && extracted.permitIssueDate.trim() ? { permitIssueDate: extracted.permitIssueDate.trim() } : {}),
        ...(typeof extracted.permitExpiryDate === "string" && extracted.permitExpiryDate.trim() ? { permitExpiryDate: extracted.permitExpiryDate.trim() } : {}),
        ...(typeof extracted.businessActivity === "string" && extracted.businessActivity.trim() ? { businessActivity: extracted.businessActivity.trim() } : {}),
      }));

      setScanMessage("Permit scan complete. Review and correct all extracted details before continuing.");
    } catch (error) {
      console.error("Business permit scan failed:", error);
      alert(error?.message || "Permit scan failed. Please enter the details manually.");
      setScanMessage("Permit scan failed. You can enter the details manually.");
    } finally {
      setScanningPermit(false);
    }
  };

  const scanTechnicalCertificate = async () => {
    const file = techRef.current?.files?.[0] || formData.techCert;
    if (!file) {
      alert("Please upload your technical certification first.");
      return;
    }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type) && file.type !== "application/pdf") {
      alert("Please upload a PDF, JPEG, PNG, or WebP certificate.");
      return;
    }

    setScanningTechCert(true);
    setScanMessage("Scanning technical certificate…");

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read the selected certificate."));
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("scan-technical-certificate", {
        body: { mimeType: file.type, base64 },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Could not read the technical certificate.");

      const extracted = data.fields || {};
      setFormData((prev) => ({
        ...prev,
        ...(typeof extracted.certificateNumber === "string" && extracted.certificateNumber.trim() ? { techCertificateNumber: extracted.certificateNumber.trim() } : {}),
        ...(typeof extracted.issuer === "string" && extracted.issuer.trim() ? { techCertificateIssuer: extracted.issuer.trim() } : {}),
        ...(typeof extracted.certificateTitle === "string" && extracted.certificateTitle.trim() ? { techCertificateTitle: extracted.certificateTitle.trim() } : {}),
        ...(typeof extracted.issueDate === "string" && extracted.issueDate.trim() ? { techCertificateIssueDate: extracted.issueDate.trim() } : {}),
        ...(typeof extracted.expiryDate === "string" && extracted.expiryDate.trim() ? { techCertificateExpiryDate: extracted.expiryDate.trim() } : {}),
        ...(typeof extracted.specialization === "string" && extracted.specialization.trim() ? { techSpecialization: extracted.specialization.trim() } : {}),
      }));

      setScanMessage("Technical certificate scan complete. Review the extracted details.");
    } catch (error) {
      console.error("Technical certificate scan failed:", error);
      alert(error?.message || "Certificate scan failed. Please enter the details manually.");
      setScanMessage("Certificate scan failed. You can enter the details manually.");
    } finally {
      setScanningTechCert(false);
    }
  };

  const validateStep2 = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      const password = formData.password;
      const hasMinLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[^A-Za-z0-9]/.test(password);

      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
        newErrors.password =
          "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and symbol.";
      }
    }

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
      if (!formData.email.trim() || !formData.password || !formData.confirmPassword) { alert("Please enter your email and password, then confirm your password."); return; }
      if (formData.password !== formData.confirmPassword) { alert("Passwords do not match."); return; }
      if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) { alert("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol."); return; }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          options: { data: { role: accountType, buyer_type: accountType, is_verified: false, status: "verified" } }
        });
        if (error) throw error;
        if (!data?.user) throw new Error("Could not create the account.");
        setAuthUserId(data.user.id);
        setStep(3);
        alert("A verification code has been sent to your email. Check your inbox and spam folder.");
      } catch (err) {
        console.error("Signup error details:", err);

        const details = [
          err?.message,
          err?.code,
          err?.status,
          err?.name,
        ].filter(Boolean).join(" | ");

        alert("Could not send verification code: " + (details || String(err)));
      } finally {
        setLoading(false);
      }
    }

    if (step === 3) {
      if (!/^\d{6}$/.test(otp.trim())) { alert("Enter the 6-digit code sent to your email."); return; }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({ email: formData.email.trim().toLowerCase(), token: otp.trim(), type: "signup" });
        if (error) throw error;
        if (!data?.user?.id) throw new Error("Email verification could not be confirmed.");
        setEmailVerified(true);
        setAuthUserId(data.user.id);
        setStep(accountType === "repair_shop" ? 4 : 4);
        alert("Email verified! Please complete your account verification details.");
      } catch (err) { alert("Email verification failed: " + err.message); }
      finally { setLoading(false); }
      return;
    }

    if (step === 4) {
      if (!formData.fullName.trim()) { alert("Please scan your ID or enter the name shown on it."); return; }
      if (!formData.contactNumber.trim()) { alert("Please enter your contact number after scanning your ID."); return; }
      if (!formData.barangay) { alert("Please confirm your barangay after scanning your ID."); return; }
      if (accountType === "harvester") {
        const idFile = governmentIdRef.current?.files?.[0] || formData.governmentId;
        if (!idFile) { alert("Please upload your personal government ID and scan it before continuing."); return; }
      }
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

        if (!formData.businessPermitNumber.trim()) {
          alert("Please enter or confirm the Business Permit Number.");
          return;
        }
        if (!formData.permitType.trim()) {
          alert("Please enter or confirm the Permit Type.");
          return;
        }
        if (!formData.permitIssuingLgu.trim()) {
          alert("Please enter or confirm the Permit Issuing LGU.");
          return;
        }
        if (!formData.businessActivity.trim()) {
          alert("Please enter or confirm the Business Activity / Nature of Business.");
          return;
        }
        if (!formData.techCertificateNumber.trim()) {
          alert("Please enter or confirm the Technical Certificate Number.");
          return;
        }
        if (!formData.techCertificateIssuer.trim()) {
          alert("Please enter or confirm the Technical Certificate Issuer.");
          return;
        }
        if (!formData.techCertificateTitle.trim()) {
          alert("Please enter or confirm the Technical Certification Title.");
          return;
        }

        await handleFinalSubmit();
        return;
      }

      await handleFinalSubmit();
      return;
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);

    try {
      // =========================
      // DETERMINE FINAL ROLE
      // =========================
      const finalRole = accountType;

      if (!emailVerified || !authUserId) throw new Error("Please verify your email before submitting registration.");
      const userId = authUserId;

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

        verification_status: "verified",
        is_verified: true,
        status: "Verified",

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

        business_permit_number:
          finalRole === "repair_shop" ? formData.businessPermitNumber.trim() || null : null,
        permit_type:
          finalRole === "repair_shop" ? formData.permitType.trim() || null : null,
        permit_issuing_lgu:
          finalRole === "repair_shop" ? formData.permitIssuingLgu.trim() || null : null,
        permit_issue_date:
          finalRole === "repair_shop" ? formData.permitIssueDate || null : null,
        permit_expiry_date:
          finalRole === "repair_shop" ? formData.permitExpiryDate || null : null,
        business_activity:
          finalRole === "repair_shop" ? formData.businessActivity.trim() || null : null,

        tech_certificate_number:
          finalRole === "repair_shop" ? formData.techCertificateNumber.trim() || null : null,
        tech_certificate_issuer:
          finalRole === "repair_shop" ? formData.techCertificateIssuer.trim() || null : null,
        tech_certificate_title:
          finalRole === "repair_shop" ? formData.techCertificateTitle.trim() || null : null,
        tech_certificate_issue_date:
          finalRole === "repair_shop" ? formData.techCertificateIssueDate || null : null,
        tech_certificate_expiry_date:
          finalRole === "repair_shop" ? formData.techCertificateExpiryDate || null : null,
        tech_specialization:
          finalRole === "repair_shop" ? formData.techSpecialization.trim() || null : null,
      };

      // PERSONAL GOVERNMENT ID — required for community users/harvesters only.
      if (finalRole === "harvester") {
        const file = governmentIdRef.current?.files?.[0] || formData.governmentId;
        if (!file) throw new Error("Please upload your personal government ID.");
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `government-ids/${userId}/id_${Date.now()}.${ext}`;
        const { error: idUploadError } = await supabase.storage.from("verifications").upload(path, file);
        if (idUploadError) throw idUploadError;
        const { data } = supabase.storage.from("verifications").getPublicUrl(path);
        updates.government_id_url = data.publicUrl;
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

      setIsSubmitted(true);
      alert("Registration complete. You can now log in to your account.");
    } catch (err) {
      console.error(err);

      alert("Registration Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const steps = [1, 2, 3, 4];

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
                Community User / Tech-Dealer
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
                    Minimum 8 characters with uppercase, lowercase, number, and symbol
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
              <h3 className="text-lg font-bold text-gray-800">Verify your email</h3>
              <p className="text-sm text-gray-600">We sent a 6-digit code to <strong>{formData.email}</strong>. Enter it below to continue.</p>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit code" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-xl tracking-widest" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 border rounded-xl text-sm">Back</button>
                <button type="button" onClick={handleContinue} disabled={loading || otp.length !== 6} className="flex-1 py-3 bg-[#2d7a7f] text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Verifying..." : "Verify code"}</button>
              </div>
              <button type="button" disabled={loading} onClick={async () => { setLoading(true); try { const { error } = await supabase.auth.resend({ type: "signup", email: formData.email.trim().toLowerCase() }); if (error) throw error; alert("A new verification code has been sent."); } catch (err) { alert("Could not resend code: " + err.message); } finally { setLoading(false); } }} className="w-full text-sm text-teal-700 font-semibold disabled:opacity-50">Resend code</button>
            </div>
          )}

          {!isSubmitted && step === 4 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-xs font-bold text-emerald-900 mb-1">
                Professional Verification
              </h3>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  {accountType === "harvester"
                    ? "Upload your personal government ID so Wasteless can suggest your details. Review the information before continuing."
                    : "Provide your shop details, business registration, and technical certification. A personal government ID is not required for repair-shop registration."}
                </p>
              </div>

              {accountType === "harvester" && (
              <div className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <label className="text-[11px] font-bold text-gray-700 block">Personal Government ID <span className="text-red-500">*</span></label>
                <input type="file" ref={governmentIdRef} accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => handleFileChange(e, "governmentId")} className="block w-full text-xs" />
                {formData.governmentId && <p className="text-xs text-emerald-700">Selected: {formData.governmentId.name}</p>}
                <button type="button" onClick={scanGovernmentId} disabled={scanningId || !formData.governmentId} className="w-full py-2.5 rounded-lg border border-teal-600 text-teal-700 font-semibold text-sm disabled:opacity-50">{scanningId ? "Scanning ID…" : "Scan ID and autofill"}</button>
                <p className="text-[10px] text-gray-500">Review the suggested name and barangay. Scanning assists with data entry; it does not verify ID authenticity.</p>
                {scanMessage && <p role="status" className="text-xs text-teal-700">{scanMessage}</p>}
              </div>
              )}
              {accountType === "repair_shop" && (
                <>
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
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
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
                          : "PDF, JPEG, PNG, or WebP (max 5MB)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={scanBusinessPermit}
                      disabled={scanningPermit || scanningTechCert || !formData.businessPermit}
                      className="w-full mt-3 py-2.5 rounded-lg border border-teal-600 text-teal-700 font-semibold text-sm disabled:opacity-50"
                    >
                      {scanningPermit ? "Scanning permit…" : "Scan permit and autofill details"}
                    </button>
                    {scanMessage && <p role="status" className="text-xs text-teal-700 mt-2">{scanMessage}</p>}
                    <p className="text-[10px] text-gray-500 mt-1">OCR may misread details. Review the fields above. Scanning does not verify permit authenticity.</p>
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
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
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
                          : "PDF, JPEG, PNG, or WebP (max 5MB)"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={scanTechnicalCertificate}
                      disabled={scanningTechCert || scanningPermit || !formData.techCert}
                      className="w-full mt-3 py-2.5 rounded-lg border border-teal-600 text-teal-700 font-semibold text-sm disabled:opacity-50"
                    >
                      {scanningTechCert ? "Scanning certificate…" : "Scan certificate and autofill details"}
                    </button>
                    <p className="text-[10px] text-gray-500 mt-1">
                      OCR assists with data entry. Review the extracted details; scanning does not verify certificate authenticity.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                    <p className="text-xs font-semibold text-gray-700">Business Permit Details</p>
                    <p className="text-[10px] text-gray-500">Review the fields extracted from your business permit before submitting.</p>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Business Permit Number <span className="text-red-500">*</span></label>
                      <input name="businessPermitNumber" type="text" value={formData.businessPermitNumber} onChange={handleChange} placeholder="Permit number" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Permit Type <span className="text-red-500">*</span></label>
                      <input name="permitType" type="text" value={formData.permitType} onChange={handleChange} placeholder="e.g. Mayor's Permit / Business Permit" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Permit Issuing LGU <span className="text-red-500">*</span></label>
                      <input name="permitIssuingLgu" type="text" value={formData.permitIssuingLgu} onChange={handleChange} placeholder="e.g. City Government of Valenzuela" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-2">Issue Date</label>
                        <input name="permitIssueDate" type="date" value={formData.permitIssueDate} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-2">Expiry Date</label>
                        <input name="permitExpiryDate" type="date" value={formData.permitExpiryDate} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Business Activity / Nature of Business <span className="text-red-500">*</span></label>
                      <input name="businessActivity" type="text" value={formData.businessActivity} onChange={handleChange} placeholder="Nature of business" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                    <p className="text-xs font-semibold text-gray-700">Technical Certification Details</p>
                    <p className="text-[10px] text-gray-500">Review the fields extracted from your technical certificate before submitting.</p>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Certificate Number <span className="text-red-500">*</span></label>
                      <input name="techCertificateNumber" type="text" value={formData.techCertificateNumber} onChange={handleChange} placeholder="Certificate number" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Issuing Organization <span className="text-red-500">*</span></label>
                      <input name="techCertificateIssuer" type="text" value={formData.techCertificateIssuer} onChange={handleChange} placeholder="e.g. TESDA" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Certification / Qualification Title <span className="text-red-500">*</span></label>
                      <input name="techCertificateTitle" type="text" value={formData.techCertificateTitle} onChange={handleChange} placeholder="Certification or qualification title" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-2">Issue Date</label>
                        <input name="techCertificateIssueDate" type="date" value={formData.techCertificateIssueDate} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-2">Expiry Date</label>
                        <input name="techCertificateExpiryDate" type="date" value={formData.techCertificateExpiryDate} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Specialization / Competency</label>
                      <input name="techSpecialization" type="text" value={formData.techSpecialization} onChange={handleChange} placeholder="Specialization or competency" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>
                </>
              )}

              {/* DETAILS TO REVIEW / COMPLETE AFTER ID SCAN */}
              <div className="space-y-4 rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-700">Review your details</p>
                {/* REVIEW NAME EXTRACTED FROM ID */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-2">Full Name <span className="text-red-500">*</span></label>
                <input name="fullName" type="text" value={formData.fullName} onChange={handleChange} placeholder={accountType === "repair_shop" ? "Full name of owner/contact person" : "Name as shown on your government ID"} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                {!formData.fullName.trim() && <p className="text-[10px] text-amber-700 mt-1">{accountType === "repair_shop" ? "Enter the full name shown on the business permit." : "Scan your ID first. If the name cannot be read, enter it exactly as shown on your ID."}</p>}
              </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-2">Contact Number <span className="text-red-500">*</span></label>
                  <input name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleChange} placeholder="09123456789" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                  <p className="text-[10px] text-gray-500 mt-1">{accountType === "repair_shop" ? "Review the contact number extracted from the business permit." : "Enter or correct your phone number if it was not extracted from the ID."}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-2">{accountType === "repair_shop" ? "Business Barangay" : "Barangay of Residence"} <span className="text-red-500">*</span></label>
                  <select name="barangay" value={formData.barangay} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
                    <option value="">Select barangay...</option>
                    {valenzuelaBarangays.map((brgy) => <option key={brgy} value={brgy}>{brgy}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">{accountType === "repair_shop" ? "Confirm the barangay where the repair shop is located." : "Confirm the barangay suggested by the ID scan."}</p>
                </div>
              </div>
              {/* =========================
        SELLER / HARVESTER
    ========================= */}
              {accountType === "harvester" && (
                <div className="space-y-6">

                  {/* ROLE DESCRIPTION */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      As a Community User / Tech-Dealer, you can buy working second-hand electronics and sell eligible electronics on Wasteless.
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
            <div className="space-y-4 animate-fadeIn text-center">
              <h3 className="text-lg font-bold text-gray-800">Registration complete</h3>
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
                <p className="text-sm text-emerald-800 leading-relaxed">
                  Your registration details and documents were submitted. You can now log in. The app has marked this account as verified; this status does not independently confirm document authenticity.
                </p>
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
