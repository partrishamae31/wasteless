import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  MailCheck,
  MailWarning,
} from "lucide-react";
import wastelessLogo from "./assets/wasteless-logo.png";

const AdminLogin = ({
  onBackToUserLogin,
  onSignUpClick,
  onLoginSuccess,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // EMAIL CONFIRMATION: Supabase blocks password login until the admin's
  // email is confirmed. Verification with the emailed 6-digit code normally
  // happens in the admin panel right after account creation; this page only
  // explains the situation and offers a resend.
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent
  const [loginError, setLoginError] = useState("");

  // FORGOT PASSWORD: sends a Supabase reset link that opens /reset-password,
  // where the admin sets a new password. This is the recovery path when an
  // account exists but the password doesn't match.
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetState, setResetState] = useState("idle"); // idle | sending | sent
  const [resetError, setResetError] = useState("");

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    const normalizedEmail = forgotEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    try {
      setResetError("");
      setResetState("sending");

      const { error: resetRequestError } =
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (resetRequestError) throw resetRequestError;

      setResetState("sent");
    } catch (err) {
      console.error("Password reset error:", err);
      setResetError(
        err.message || "Unable to send the password reset email."
      );
      setResetState("idle");
    }
  };

  const handleResend = async () => {
    if (!email || resendState !== "idle") return;

    try {
      setResendState("sending");
      setLoginError("");

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        setLoginError(resendError.message);
        setResendState("idle");
        return;
      }

      setResendState("sent");
    } catch (err) {
      console.error(err);
      setResendState("idle");
    }
  };

  // SHARED POST-LOGIN CHECKS (used by password login and OTP verification)

  const completeLogin = async (user) => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      alert("Profile not found.");
      await supabase.auth.signOut();
      return;
    }

    if (profile.role !== "admin") {
      alert("Access denied. Not an admin account.");
      await supabase.auth.signOut();
      return;
    }

    if (!profile.is_verified) {
      alert(
        "Your admin account is still pending approval by WMO."
      );

      await supabase.auth.signOut();
      return;
    }

    // Store the authenticated admin's identity.
    localStorage.setItem("adminAuthenticated", "true");

    // Pass the profile so the parent can resolve the correct barangay.
    onLoginSuccess(profile);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setEmailNotConfirmed(false);
    setLoginError("");

    try {
      setLoading(true);

      // LOGIN USING SUPABASE AUTH
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        // Full error detail in the browser console: `code` distinguishes
        // invalid_credentials / email_not_confirmed / user_not_found etc.
        console.error("Admin login failed:", {
          code: error.code,
          status: error.status,
          message: error.message,
        });

        const message = (error.message || "").toLowerCase();

        // Supabase rejects password login until the email is confirmed.
        if (
          error.code === "email_not_confirmed" ||
          message.includes("email not confirmed") ||
          message.includes("not confirmed") ||
          message.includes("confirm")
        ) {
          setEmailNotConfirmed(true);
          setResendState("idle");
          return;
        }

        setLoginError(error.message);
        return;
      }

      const user = data.user;

      await completeLogin(user);

    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD VIEW (separate screen, same visual theme)
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07142d] px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,70,180,0.35),_transparent_55%)]" />

        <div className="relative z-10 w-full max-w-2xl bg-[#f7f7f7] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-10 py-12">
          <h1 className="text-center text-[40px] font-bold text-[#114d27] mb-6">
            Reset Password
          </h1>

          <p className="text-center text-[15px] text-gray-600 mb-10 leading-relaxed">
            Enter the email linked to your admin account and we'll send a
            password reset link.
          </p>

          {resetState === "sent" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <MailCheck
                  size={22}
                  className="text-emerald-600 shrink-0 mt-0.5"
                />

                <div className="flex-1">
                  <p className="font-semibold text-emerald-800">
                    Reset link sent
                  </p>

                  <p className="text-sm text-emerald-700 mt-1 leading-relaxed">
                    If an account exists for <strong>{forgotEmail}</strong>, a
                    password reset link was sent. Check your inbox and spam
                    folder, then follow the link to set a new password.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="mt-4 rounded-lg bg-emerald-100 hover:bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800 transition"
                  >
                    Back to login
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-8">
              {resetError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                  <p className="text-sm font-semibold text-red-600">
                    {resetError}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[15px] font-semibold text-[#1f4d2f] mb-3">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={20}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full h-[62px] rounded-2xl border border-gray-300 bg-white pl-14 pr-5 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={resetState === "sending"}
                  className="
                    w-full
                    h-[62px]
                    rounded-2xl
                    bg-gradient-to-r
                    from-[#2387b7]
                    to-[#5da11e]
                    text-white
                    text-[18px]
                    font-semibold
                    shadow-lg
                    hover:scale-[1.01]
                    active:scale-[0.99]
                    transition-all
                    disabled:opacity-50
                  "
                >
                  {resetState === "sending"
                    ? "Sending..."
                    : "Send Reset Link"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-center text-[14px] text-[#4aa0d8] hover:underline"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07142d] px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,70,180,0.35),_transparent_55%)]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#f7f7f7] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-10 py-12">
        {/* Brand Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={wastelessLogo}
            alt="Wasteless logo"
            className="h-20 w-20 object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-center text-[40px] font-bold text-[#114d27] mb-12">
          Admin Login
        </h1>

        {/* EMAIL NOT CONFIRMED NOTICE */}
        {emailNotConfirmed && (
          <div className="-mt-4 mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <MailWarning size={22} className="text-amber-500 shrink-0 mt-0.5" />

              <div className="flex-1">
                <p className="font-semibold text-amber-800">
                  Email not confirmed yet
                </p>

                <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                  A <strong>6-digit confirmation code</strong> was emailed to{" "}
                  <strong>{email}</strong>. Open the email and click{" "}
                  <strong>Confirm your mail</strong>, or ask the administrator
                  who created your account to verify the code in the admin
                  panel. Didn't get the email?
                </p>

                {/* RESEND */}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState !== "idle"}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-amber-800 transition"
                >
                  <MailCheck size={13} />
                  {resendState === "sending"
                    ? "Resending..."
                    : resendState === "sent"
                      ? "Confirmation email sent ✓"
                      : "Resend confirmation email"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GENERAL LOGIN ERROR */}
        {loginError && !emailNotConfirmed && (
          <div className="-mt-4 mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-semibold text-red-600">{loginError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-8">
          {/* EMAIL */}
          <div>
            <label className="block text-[15px] font-semibold text-[#1f4d2f] mb-3">
              Email Address
            </label>

            <div className="relative">
              <Mail
                size={20}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-[62px] rounded-2xl border border-gray-300 bg-white pl-14 pr-5 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20 transition-all"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[15px] font-semibold text-[#1f4d2f]">
                Password
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setResetError("");
                  setResetState("idle");
                  setShowForgotPassword(true);
                }}
                className="text-[14px] text-[#4aa0d8] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <div className="relative">
              <Lock
                size={20}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-[62px] rounded-2xl border border-gray-300 bg-white pl-14 pr-14 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20 transition-all"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
              w-full
              h-[62px]
              rounded-2xl
              bg-gradient-to-r
              from-[#2387b7]
              to-[#5da11e]
              text-white
              text-[18px]
              font-semibold
              shadow-lg
              hover:scale-[1.01]
              active:scale-[0.99]
              transition-all
              disabled:opacity-50
            "
          >
            {loading ? "Signing In..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;