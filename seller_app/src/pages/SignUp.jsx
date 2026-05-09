import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Upload } from "lucide-react";

const SignUp = ({ onLoginClick }) => {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false); // New: Loading state
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
    businessName: "",
    businessPermit: null,
    techCert: null,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0]; // Grab the first file index

    if (file) {
      console.log(`File selected for ${field}:`, file.name);

      setFormData((prev) => ({
        ...prev,
        [field]: file,
      }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
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

  const handleContinue = () => {
    if (step === 1 && accountType) {
      setStep(2);
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    } else if (step === 3) {
      if (accountType === "harvester") {
        const pFile = permitRef.current?.files?.[0];
        const tFile = techRef.current?.files?.[0];

        if (!formData.businessName) {
          alert("Please enter your Shop/Business Name");
          return;
        }

        if (!pFile || !tFile) {
          alert("Please ensure BOTH files are selected!");
          return;
        }

        setFormData((prev) => ({
          ...prev,
          businessPermit: pFile,
          techCert: tFile,
        }));
        setIsSubmitted(true);
      } else if (accountType === "seller") {
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
      const autoVerify = accountType === "seller";
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: accountType === "seller" ? "Seller" : "Harvester",
            barangay: formData.barangay,
            contact_number: formData.contactNumber,
            business_name: formData.businessName,
            is_verified: autoVerify,
            status: autoVerify ? "Active" : "Pending",
          },
        },
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error("User creation failed.");

      const userId = authData.user.id;

      // 2. Prepare the updates for the profiles table
      let updates = {
        is_verified: autoVerify,
        status: autoVerify ? "Active" : "Pending",
      };

      // SELLER upload
      if (accountType === "seller" && formData.businessPermit) {
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

      // HARVESTER upload
      if (accountType === "harvester") {
        // Permit
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

        // Tech Cert
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

      // FINAL UPDATE
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
      alert("Registration Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const steps = [1, 2, 3];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1a4567] via-[#2d7a7f] to-[#6da43a] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header Section */}
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
          {/* Progress Bar / Step Indicator */}
          <div className="flex items-center justify-center mb-8 relative">
            <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-gray-100 -z-0"></div>
            <div className="flex justify-between w-full px-4 relative z-10">
              {steps.map((num) => (
                <div
                  key={num}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step >= num
                      ? "bg-[#2d7a7f] text-white"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}
                >
                  {step > num || isSubmitted ? "✓" : num}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1: Account Selection */}
          {!isSubmitted && step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                Select Account Type
              </h3>
              <button
                onClick={() => setAccountType("seller")}
                className={`w-full py-4 px-6 border rounded-xl text-sm transition-all text-center ${
                  accountType === "seller"
                    ? "border-teal-500 bg-teal-50 text-teal-700 font-bold"
                    : "border-gray-100 text-gray-600 hover:border-gray-300"
                }`}
              >
                E-waste Seller
              </button>
              <button
                onClick={() => setAccountType("harvester")}
                className={`w-full py-4 px-6 border rounded-xl text-sm transition-all text-center ${
                  accountType === "harvester"
                    ? "border-teal-500 bg-teal-50 text-teal-700 font-bold"
                    : "border-gray-100 text-gray-600 hover:border-gray-300"
                }`}
              >
                Repair Shop / Tech-Harvester
              </button>
              <button
                disabled={!accountType}
                onClick={handleContinue}
                className={`w-full mt-6 py-3 rounded-lg font-bold text-sm transition-all ${
                  accountType
                    ? "bg-[#2d7a7f] text-white hover:opacity-90"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Continue
              </button>
            </div>
          )}

          {/* STEP 2: Basic Information */}
          {!isSubmitted && step === 2 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Basic Information
              </h3>
              <div className="space-y-4">
                {/* Full Name */}
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

                {/* Email */}
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

                {/* Contact Number */}
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

                {/* Barangay */}
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

                {/* Password with Eye Icon and Helper Text */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type="password"
                      placeholder="........"
                      className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.password ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1.5">
                    Minimum 8 characters with uppercase, lowercase, and digit
                  </p>
                </div>

                {/* Confirm Password */}
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
                  />
                  {errors.confirmPassword && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Buttons aligned with mockup */}
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

          {/* STEP 3: Professional Verification */}
          {!isSubmitted && step === 3 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-xs font-bold text-emerald-900 mb-1">
                {accountType === "seller"
                  ? "Professional Verification"
                  : "Professional Verification"}
              </h3>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  {accountType === "seller"
                    ? "To maintain a secure environment for all users, we require a quick credential verification for new seller accounts. Your status will remain as 'Pending Verification' until our team has reviewed your ID. This step helps ensure you are recognized as a trusted seller in our community."
                    : "To ensure marketplace integrity, we require all repair shops to verify credentials."}
                </p>
              </div>

              {/* Business Name - Shared by both */}
              {accountType === "harvester" && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Business/Shop Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="businessName"
                    type="text"
                    placeholder="Enter your business name"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 ${errors.businessName ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20"}`}
                    onChange={handleChange}
                    value={formData.businessName || ""}
                  />
                  {errors.businessName && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border border-red-500 rounded-full text-center leading-[10px]">
                        !
                      </span>
                      {errors.businessName}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-6 mt-6">
                {/* SELLER ONLY: Valid ID */}
                {accountType === "seller" && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Valid Government ID{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div
                      onClick={() => permitRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      <input
                        type="file"
                        ref={permitRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          console.log("ID selected:", e.target.files[0]?.name)
                        }
                      />
                      <Upload
                        className="text-gray-400 group-hover:text-teal-500 mb-2"
                        size={24}
                      />
                      <span className="text-teal-600 font-semibold text-sm">
                        Click to upload
                      </span>
                      <span className="text-gray-400 text-[10px] mt-1">
                        PDF or JPEG (max 5MB)
                      </span>
                    </div>
                  </div>
                )}

                {/* HARVESTER ONLY: Existing Permit & Tech Cert */}
                {accountType === "harvester" && (
                  <>
                    {/* Business Permit */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">
                        Business Permit / DTI Registration{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div
                        onClick={() => permitRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        <input
                          type="file"
                          ref={permitRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            console.log(
                              "Permit selected:",
                              e.target.files[0]?.name,
                            )
                          }
                        />
                        <Upload
                          className="text-gray-400 group-hover:text-teal-500 mb-2"
                          size={24}
                        />
                        <span className="text-teal-600 font-semibold text-sm">
                          Click to upload
                        </span>
                        <span className="text-gray-400 text-[10px] mt-1">
                          PDF or JPEG (max 5MB)
                        </span>
                      </div>
                    </div>

                    {/* Technical Certification */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">
                        Technical Certification{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div
                        onClick={() => techRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        <input
                          type="file"
                          ref={techRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            console.log(
                              "Tech Cert selected:",
                              e.target.files[0]?.name,
                            )
                          }
                        />
                        <Upload
                          className="text-gray-400 group-hover:text-teal-500 mb-2"
                          size={24}
                        />
                        <span className="text-teal-600 font-semibold text-sm">
                          Click to upload
                        </span>
                        <span className="text-gray-400 text-[10px] mt-1">
                          PDF or JPEG (max 5MB)
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Navigation Buttons (Keep as is) */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 py-2 bg-[#2d7a7f] text-white rounded-lg font-bold text-sm hover:opacity-90"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {/* FINAL STEP: Complete Registration */}
          {isSubmitted && (
            <div className="space-y-6 animate-fadeIn text-left">
              <h3 className="text-sm font-bold text-gray-700">
                Complete Registration
              </h3>

              {/* Notice Box - Styled according to image_90c07d.jpg / image_90a63d.jpg */}
              <div className="bg-[#fffdf0] border border-[#fdf5d3] p-8 rounded-xl flex flex-col items-center justify-center space-y-4">
                <div className="flex items-center justify-center">
                  {/* Warning Icon from image_90c07d.jpg */}
                  <div className="w-10 h-10 border-2 border-orange-400 rounded-full flex items-center justify-center">
                    <span className="text-orange-400 font-bold text-xl">!</span>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[11px] text-gray-600 leading-relaxed max-w-[280px]">
                    Click "Complete Registration" to submit your account for
                    verification. Your account will be activated after
                    administrator approval.
                  </p>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="flex-1 py-2.5 border border-gray-100 text-gray-500 rounded-lg font-medium text-xs hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  className="flex-1 py-2.5 bg-[#6da43a] text-white rounded-lg font-medium text-xs shadow-sm hover:bg-[#5f8f32] transition-colors"
                >
                  Complete Registration
                </button>
              </div>
            </div>
          )}

          {/* Login Footer */}
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
