// AdminSignup.jsx

import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  FileText,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

const AdminSignup = ({ onLoginClick }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contact: "",
    barangay: "",
    password: "",
    confirmPassword: "",
    ewasteId: null,
    registrationId: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleContinue = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // =========================
      // 1. CREATE AUTH ACCOUNT
      // =========================
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        alert(authError.message);
        return;
      }

      const user = authData.user;

      if (!user) {
        alert("Failed to create account");
        return;
      }

      // =========================
      // 2. UPLOAD E-WASTE ID
      // =========================
      let uploadedFilePath = null;

      if (formData.ewasteId) {
        const fileExt = formData.ewasteId.name.split(".").pop();

        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("admin-ids")
          .upload(fileName, formData.ewasteId);

        if (uploadError) {
          alert(uploadError.message);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("admin-ids").getPublicUrl(fileName);

        uploadedFilePath = publicUrl;
      }

      // =========================
      // 3. INSERT PROFILE
      // =========================
      const registrationId = `ADM-${Math.floor(
        10000000 + Math.random() * 90000000,
      )}`;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: formData.fullName,
        email: formData.email,
        contact_number: formData.contact,
        barangay: formData.barangay,

        role: "admin",

        is_verified: false,
        verification_status: "pending",
        status: "pending",

        employee_id: registrationId,

        tech_cert_url: uploadedFilePath,
      });

      if (profileError) {
        alert(profileError.message);
        return;
      }

      // SAVE REGISTRATION ID
      setFormData((prev) => ({
        ...prev,
        registrationId,
      }));

      // SUCCESS SCREEN
      setStep(3);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07142d] px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,70,180,0.35),_transparent_55%)]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#f7f7f7] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-10 py-10">
        {/* TITLE */}
        {step !== 3 && (
          <h1 className="text-center text-[38px] font-bold text-[#114d27] mb-10">
            Create Admin Account
          </h1>
        )}

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <form onSubmit={handleContinue} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-[15px] font-semibold text-[#3f4b5f] mb-2">
                Full Name
              </label>

              <div className="relative">
                <User
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  name="fullName"
                  placeholder="Juan Dela Cruz"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full h-[58px] rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[15px] font-semibold text-[#3f4b5f] mb-2">
                Official Email Address
              </label>

              <div className="relative">
                <Mail
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="email"
                  name="email"
                  placeholder="admin@valenzuela.gov.ph"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full h-[58px] rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20"
                />
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="block text-[15px] font-semibold text-[#3f4b5f] mb-2">
                Contact Number
              </label>

              <div className="relative">
                <Phone
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  name="contact"
                  placeholder="+63 917 123 4567"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  className="w-full h-[58px] rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20"
                />
              </div>
            </div>

            {/* Barangay */}
            <div>
              <label className="block text-[15px] font-semibold text-[#3f4b5f] mb-2">
                Barangay Assignment
              </label>

              <div className="relative">
                <MapPin
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  name="barangay"
                  value={formData.barangay}
                  onChange={handleChange}
                  required
                  className="w-full h-[58px] rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[15px] font-semibold text-[#3f4b5f] mb-2">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter secure password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full h-[58px] rounded-2xl border border-gray-300 bg-white pl-12 pr-12 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[15px] font-semibold text-[#3f4b5f] mb-2">
                Confirm Password
              </label>

              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full h-[58px] rounded-2xl border border-gray-300 bg-white pl-12 pr-12 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Continue */}
            <button
              type="submit"
              className="w-full h-[60px] mt-8 rounded-2xl bg-gradient-to-r from-[#2387b7] to-[#5da11e] text-white text-[18px] font-semibold shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Continue
            </button>
          </form>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-[15px] font-semibold text-[#3f4b5f] mb-3">
                E-Waste ID
              </label>

              <label
                htmlFor="ewaste-id"
                className="w-full h-[150px] border border-dashed border-gray-300 rounded-2xl bg-white flex flex-col items-center justify-center cursor-pointer hover:border-[#2f8f46] transition-all"
              >
                <FileText size={38} className="text-gray-400 mb-3" />

                <p className="text-[17px] font-medium text-[#3f4b5f]">
                  Click to upload ID
                </p>

                <p className="text-[13px] text-gray-400 mt-1">
                  PNG, JPG, or PDF (Max 5MB)
                </p>

                <input
                  id="ewaste-id"
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  className="hidden"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ewasteId: e.target.files[0],
                    })
                  }
                />
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-[58px] rounded-2xl border border-gray-300 bg-white text-[#3f4b5f] text-[17px] font-semibold hover:bg-gray-50 transition-all"
              >
                Back
              </button>

              <button
                type="submit"
                className="flex-1 h-[58px] rounded-2xl bg-gradient-to-r from-[#2387b7] to-[#5da11e] text-white text-[17px] font-semibold shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Submit
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <div className="flex flex-col items-center">
            <div className="w-[90px] h-[90px] rounded-full bg-[#f6edb5] flex items-center justify-center mb-8">
              <AlertCircle size={42} className="text-[#c88700]" />
            </div>

            <h2 className="text-[38px] font-semibold text-[#1d2433] text-center leading-tight">
              Registration Pending WMO Approval
            </h2>

            <p className="text-center text-[#6b7280] text-[18px] leading-relaxed mt-5 max-w-[700px]">
              Your administrator registration has been submitted successfully
              and is now awaiting approval.
            </p>

            <div className="w-full mt-10 border border-[#ff8a8a] bg-[#fff5f5] rounded-2xl p-6">
              <div className="flex gap-4">
                <ShieldAlert
                  size={24}
                  className="text-[#ef4444] shrink-0 mt-1"
                />

                <div>
                  <h3 className="text-[18px] font-semibold text-[#d93c3c]">
                    Account Not Yet Active
                  </h3>

                  <p className="text-[17px] text-[#d93c3c] leading-relaxed mt-2">
                    You will not be able to log in until your account has been
                    reviewed and approved by the Waste Management Officer (WMO).
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full mt-8 bg-[#f8f8f8] rounded-2xl p-7">
              <h3 className="text-[22px] font-semibold text-[#1d2433] mb-5">
                What happens next?
              </h3>

              <div className="space-y-4 text-[17px] text-[#6b7280]">
                <div className="flex gap-3">
                  <span className="text-[#9333ea] font-bold">1.</span>
                  <p>WMO reviews your credentials and documents</p>
                </div>

                <div className="flex gap-3">
                  <span className="text-[#9333ea] font-bold">2.</span>
                  <p>Department head authorization is verified</p>
                </div>

                <div className="flex gap-3">
                  <span className="text-[#9333ea] font-bold">3.</span>
                  <p>You&apos;ll receive an email notification once approved</p>
                </div>

                <div className="flex gap-3">
                  <span className="text-[#9333ea] font-bold">4.</span>
                  <p>After approval, you can log in using your credentials</p>
                </div>
              </div>
            </div>

            <div className="w-full mt-8 border border-gray-300 rounded-2xl bg-white py-6 px-4 text-center">
              <p className="text-[20px] font-semibold text-[#1d2433]">
                Registration ID:{" "}
                <span className="font-medium text-[#6b7280]">
                  {formData.registrationId}
                </span>
              </p>

              <p className="text-[14px] text-[#6b7280] mt-2">
                Please save this ID for your reference when contacting support.
              </p>
            </div>

            <button
              type="button"
              onClick={onLoginClick}
              className="w-full h-[62px] mt-8 rounded-2xl bg-gradient-to-r from-[#2387b7] to-[#5da11e] text-white text-[18px] font-semibold shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Bottom Text */}
        {step !== 3 && (
          <div className="text-center mt-8 text-[15px] text-gray-600">
            Already have an account?{" "}
            <button
              onClick={onLoginClick}
              className="font-semibold text-[#114d27] hover:underline"
            >
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSignup;
