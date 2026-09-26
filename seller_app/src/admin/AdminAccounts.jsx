// src/AdminAccounts.jsx

import React, { useState } from "react";
import { supabase } from "../supabaseClient";

import {
  Shield,
  Plus,
  User,
  Mail,
  MailWarning,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  ChevronDown,
  Building2,
  BadgeCheck,
  Info,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import { VALENZUELA_BARANGAYS } from "./barangayScope";

const AdminAccounts = ({ adminBarangay }) => {
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [toast, setToast] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Info about the last created admin, shown on the success screen.
  const [createdInfo, setCreatedInfo] = useState(null);

  // EMAIL CONFIRMATION: when "Confirm email" is enabled in Supabase Auth,
  // signUp returns no session and the new admin must open the confirmation
  // link before their password login works.
  const [createdNeedsConfirmation, setCreatedNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent

  // OTP VERIFICATION happens right here in the admin panel, immediately
  // after the account is created, so the new admin's email is confirmed
  // without them ever seeing "Email not confirmed" at login.
  const [otpStep, setOtpStep] = useState(false); // show the OTP screen
  const [otp, setOtp] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    
    // Defaults to the creating admin's barangay, but any barangay can be
    // selected so coordinators can onboard admins for other areas too.
    barangay: adminBarangay || "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      contact_number: "",
   
      barangay: adminBarangay || "",
      password: "",
      confirmPassword: "",
    });
  };

  const handleCreateAdmin = async () => {
    try {
      setLoading(true);

      // =========================
      // VALIDATION
      // =========================
      if (
        !formData.full_name ||
        !formData.email ||
        !formData.contact_number ||

        !formData.barangay ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        alert("Please complete all fields.");
        return;
      }

      if (formData.password.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      // =========================
      // SAVE CURRENT SESSION
      // IMPORTANT:
      // Prevent admin logout after signup
      // =========================
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      // =========================
      // CREATE AUTH USER
      // =========================
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,

        options: {
          data: {
            role: "admin",
          },
        },
      });

      if (authError) {
        console.error(authError);
        alert(authError.message);
        return;
      }

      if (!authData?.user) {
        alert("Failed to create admin account.");
        return;
      }

      const userId = authData.user.id;

      // With email confirmation enabled, Supabase returns no session and
      // sends a "confirm your email" link to the new admin.
      const needsConfirmation = !authData.session;

      // =========================
      // RESTORE CURRENT ADMIN SESSION
      // =========================
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      // =========================
      // UPDATE PROFILE
      // =========================
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          contact_number: formData.contact_number,
          barangay: formData.barangay,

          role: "admin",

          // CHANGE THESE IF YOU WANT
          // AUTO VERIFIED ADMINS
          status: "Active",
          verification_status: "verified",
          is_verified: true,

          average_rating: 0,
          total_reviews: 0,
        })
        .eq("id", userId);

      if (profileError) {
        console.error(profileError);
        alert(profileError.message);
        return;
      }

      // =========================
      // SUCCESS
      // =========================
      setCreatedInfo({
        name: formData.full_name,
        email: formData.email,
        barangay: formData.barangay,
      });

      setCreatedNeedsConfirmation(needsConfirmation);
      setEmailConfirmed(!needsConfirmation);
      setResendState("idle");
      setOtp("");
      setOtpError("");

      setShowForm(false);

      resetForm();

      if (needsConfirmation) {
        // Ask the creator for the emailed 6-digit code right away.
        setOtpStep(true);
      } else {
        setOtpStep(false);
        setSuccess(true);
        setToast("Administrator account created and activated successfully.");
        setTimeout(() => setToast(""), 5000);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!createdInfo?.email || resendState !== "idle") return;

    try {
      setResendState("sending");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: createdInfo.email,
      });

      if (error) {
        alert(error.message);
        setResendState("idle");
        return;
      }

      setResendState("sent");
    } catch (err) {
      console.error(err);
      setResendState("idle");
    }
  };

  // VERIFY THE 6-DIGIT CODE EMAILED TO THE NEW ADMIN
  const handleVerifyOtp = async () => {
    if (!createdInfo?.email || otp.trim().length < 6 || otpVerifying) return;

    try {
      setOtpVerifying(true);
      setOtpError("");

      // verifyOTP signs in as the NEW user, so save the creating admin's
      // session first and restore it afterwards.
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.auth.verifyOtp({
        email: createdInfo.email,
        token: otp.trim(),
        type: "signup",
      });

      if (error) {
        setOtpError(error.message);
        return;
      }

      // RESTORE CURRENT ADMIN SESSION
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      if (!data?.user) {
        setOtpError("Could not verify the code. Please try again.");
        return;
      }

      setEmailConfirmed(true);
      setOtpStep(false);
      setSuccess(true);
      setToast("Email confirmed. The new admin can now log in.");
      setTimeout(() => setToast(""), 5000);
    } catch (err) {
      console.error(err);
      setOtpError("Something went wrong while verifying the code.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSkipOtp = () => {
    // Leave the account pending confirmation; it can be completed later
    // from the success screen.
    setOtpStep(false);
    setSuccess(true);
  };

  const stats = [
    {
      label: "Total Users",
      value: "1,248",
    },
    {
      label: "Active Listing",
      value: "342",
    },
    {
      label: "Verified Shops",
      value: "87",
    },
    {
      label: "Devices Cataloged",
      value: "456",
    },
  ];

  // =========================
  // OTP VERIFICATION SCREEN
  // =========================
  if (otpStep) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-[#F8FAFC]">
        <div className="bg-white rounded-[32px] shadow-xl p-10 max-w-2xl w-full border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
              <KeyRound className="text-amber-600" size={36} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-slate-900 mb-3">
            Enter Confirmation Code
          </h1>

          <p className="text-center text-slate-500 mb-8">
            A <strong>6-digit code</strong> was emailed to{" "}
            <strong className="break-all">{createdInfo?.email}</strong>. Enter
            it below to finish activating this admin account.
          </p>

          {/* OTP INPUT + VERIFY BUTTON */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <KeyRound
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full h-16 rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-[24px] font-bold tracking-[0.45em] text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otp.trim().length < 6 || otpVerifying}
              className="h-16 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2 justify-center"
            >
              <ShieldCheck size={18} />
              {otpVerifying ? "Verifying..." : "Verify Code"}
            </button>
          </div>

          {/* OTP ERROR */}
          {otpError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-600">{otpError}</p>
            </div>
          )}

          {/* RESEND + SKIP */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendState !== "idle"}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-50 hover:bg-amber-100 disabled:opacity-60 border border-amber-200 px-4 py-2.5 text-xs font-semibold text-amber-700 transition"
            >
              <Mail size={14} />
              {resendState === "sending"
                ? "Resending..."
                : resendState === "sent"
                  ? "New code sent ✓"
                  : "Resend code"}
            </button>

            <button
              type="button"
              onClick={handleSkipOtp}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Verify later — the new admin can confirm from the login page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // SUCCESS SCREEN
  // =========================
  if (success) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-[#F8FAFC]">
        <div className="bg-white rounded-[32px] shadow-xl p-10 max-w-2xl w-full border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600" size={40} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-slate-900 mb-4">
            Administrator Created Successfully
          </h1>

          <p className="text-center text-slate-500 mb-8">
            The new administrator account has been created and activated.
          </p>

          {createdInfo && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
              <p className="font-semibold mb-3 text-slate-700">
                Account Details
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Name</span>

                  <span className="font-semibold text-slate-700 text-right">
                    {createdInfo.name}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Email</span>

                  <span className="font-semibold text-slate-700 text-right break-all">
                    {createdInfo.email}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Assigned Barangay</span>

                  <span className="font-semibold text-blue-700 text-right">
                    {createdInfo.barangay}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-700 mb-6">
            <p className="font-semibold mb-2">Account Activated</p>

            <p className="text-sm">
              {emailConfirmed
                ? "Email confirmed — the administrator can now log in using their email and password."
                : createdNeedsConfirmation
                  ? "The account was created, but its email is NOT yet confirmed. The new admin must verify the 6-digit code from their email before logging in."
                  : "The administrator can now log in using the registered email and password."}
            </p>
          </div>

          {createdNeedsConfirmation && !emailConfirmed && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-700 mb-6">
              <div className="flex items-start gap-4">
                <MailWarning size={22} className="text-amber-500 shrink-0 mt-0.5" />

                <div className="flex-1">
                  <p className="font-semibold mb-1">Email Confirmation Pending</p>

                  <p className="text-sm leading-relaxed">
                    The <strong>6-digit confirmation code</strong> was emailed to{" "}
                    <strong>{createdInfo?.email}</strong>. You can reopen this
                    flow later, or the new admin can enter the code on the
                    Admin Login page.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false);
                      setOtpStep(true);
                      setResendState("idle");
                      setOtpError("");
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-100 hover:bg-amber-200 px-4 py-2 text-xs font-semibold text-amber-800 transition"
                  >
                    <KeyRound size={14} />
                    Enter code now
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setSuccess(false);
              setShowForm(true);
            }}
            className="w-full h-14 rounded-2xl bg-[#2387A5] hover:bg-[#1f7690] text-white font-semibold transition-all"
          >
            Create Another Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
          >
            <h2 className="text-5xl font-black text-slate-900 text-center">
              {item.value}
            </h2>

            <p className="text-center text-slate-500 text-sm mt-2">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Administrator Accounts
          </h1>

          <p className="text-slate-500 mt-1">
            Create new administrator accounts for the platform
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-700 transition-all text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-200"
          >
            <Plus size={18} />
            Create New Admin
          </button>
        )}
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative">
          {/* CLOSE */}
          <button
            onClick={() => setShowForm(false)}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-700"
          >
            <X size={20} />
          </button>

          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Create Administrator Account
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ROW 1: FULL NAME | EMAIL */}
            <InputField
              icon={<User size={18} />}
              label="Full Name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Juan Dela Cruz"
            />

            <InputField
              icon={<Mail size={18} />}
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@valenzuela.gov.ph"
            />

            {/* ROW 2: CONTACT | DEPARTMENT */}
            <InputField
              icon={<Phone size={18} />}
              label="Contact Number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              placeholder="+63 917 123 4567"
            />

            

            {/* Barangay assignment: defaults to the creating admin's barangay,
                but any of the 32 barangays can be selected. */}
            <SelectField
              icon={<MapPin size={18} />}
              label="Barangay Assignment"
              name="barangay"
              value={formData.barangay}
              onChange={handleChange}
              placeholder="Select Barangay"
              options={VALENZUELA_BARANGAYS}
            />

            <div className="md:col-span-2 -mt-2 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
              <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />

              <p className="text-xs text-blue-600 leading-relaxed">
                The new admin will only see users, transactions, and analytics
                for their assigned barangay. Your own barangay
                {adminBarangay ? ` (${adminBarangay})` : ""} is pre-selected;
                you may assign them to any of the 32 barangays.
              </p>
            </div>

            {/* ROW 4: PASSWORD | CONFIRM PASSWORD */}
            <PasswordField
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              show={showPassword}
              toggle={() => setShowPassword(!showPassword)}
            />

            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              show={showConfirmPassword}
              toggle={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>

          {/* IMMEDIATE ACCESS NOTICE */}
          <div className="mt-8 bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-4">
            <Shield
              size={22}
              className="text-purple-600 shrink-0 mt-0.5"
            />

            <div>
              <p className="font-bold text-purple-700">
                Immediate Access
              </p>

              <p className="text-purple-600 text-sm mt-1">
                This account will be created immediately with full
                administrator privileges. No approval required.
              </p>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            <button
              onClick={() => setShowForm(false)}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              onClick={handleCreateAdmin}
              disabled={loading}
              className="h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all text-white font-semibold shadow-lg shadow-purple-200 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Admin Account"}
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={20} />
          <span className="font-semibold text-sm">{toast}</span>
        </div>
      )}
    </div>
  );
};

// =========================
// REUSABLE INPUT
// =========================
const InputField = ({ icon, label, type = "text", ...props }) => {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-2">
        {label}
      </label>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>

        <input
          type={type}
          className="w-full h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-slate-400 text-slate-700 transition"
          {...props}
        />
      </div>
    </div>
  );
};

// =========================
// REUSABLE SELECT
// =========================
const SelectField = ({
  icon,
  label,
  options = [],
  ...props
}) => {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-2">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
            {icon}
          </div>
        )}

        <select
          className="w-full h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-11 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none text-slate-700 transition"
          {...props}
        >
          <option value="">{props.placeholder || "Select an option"}</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          size={18}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );
};

// =========================
// PASSWORD FIELD
// =========================
const PasswordField = ({ label, show, toggle, ...props }) => {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-2">
        {label}
      </label>

      <div className="relative">
        <Lock
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type={show ? "text" : "password"}
          className="w-full h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-12 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-slate-400 text-slate-700 transition"
          {...props}
        />

        <button
          type="button"
          onClick={toggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

export default AdminAccounts;