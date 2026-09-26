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

const AdminLogin = ({
  onBackToUserLogin,
  onSignUpClick,
  onLoginSuccess,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // EMAIL CONFIRMATION: Supabase blocks password login until the user opens
  // the "Confirm your email" link. We surface that case clearly here.
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent
  const [loginError, setLoginError] = useState("");

  const handleResend = async () => {
    if (!email || resendState !== "idle") return;

    try {
      setResendState("sending");

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
        const message = (error.message || "").toLowerCase();

        // Supabase rejects password login until the email is confirmed.
        if (
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

      // FETCH PROFILE
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        alert("Profile not found.");
        await supabase.auth.signOut();
        return;
      }

      // CHECK IF ADMIN
      if (profile.role !== "admin") {
        alert("Access denied. Not an admin account.");
        await supabase.auth.signOut();
        return;
      }

      // CHECK APPROVAL
      if (!profile.is_verified) {
        alert(
          "Your admin account is still pending approval by WMO."
        );

        await supabase.auth.signOut();
        return;
      }

      // SAVE ADMIN SESSION
      localStorage.setItem("adminAuthenticated", "true");

      // SUCCESS
      onLoginSuccess();

    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07142d] px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,70,180,0.35),_transparent_55%)]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#f7f7f7] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-10 py-12">
        {/* Title */}
        <h1 className="text-center text-[40px] font-bold text-[#114d27] mb-12">
          Admin Login
        </h1>

        {/* EMAIL NOT CONFIRMED NOTICE */}
        {emailNotConfirmed && (
          <div className="-mt-4 mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <MailWarning size={22} className="text-amber-500 shrink-0 mt-0.5" />

              <div>
                <p className="font-semibold text-amber-800">
                  Confirm your email first
                </p>

                <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                  Supabase sent a confirmation link to <strong>{email}</strong>.
                  Open it, then sign in here. Didn't get it?
                </p>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState !== "idle"}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-100 hover:bg-amber-200 disabled:opacity-60 px-4 py-2 text-xs font-semibold text-amber-800 transition"
                >
                  <MailCheck size={14} />
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