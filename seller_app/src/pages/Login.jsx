import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import AdminLogin from "./AdminLogin";
import EnvOfficerLogin from "./EnvOfficerLogin";
import AdminSignup from "./AdminSignup";
import wastelessLogo from "./assets/wasteless-logo.png";

import {
  Mail,
  Lock,
  ArrowRight,
  Store,
  Wrench,
} from "lucide-react";

const Login = ({ onSignUpClick, onEnvClick, onBackToHome, setIsRoleChecking }) => {
  const [isAdminView, setIsAdminView] = useState(false);
  const [isOfficerView, setIsOfficerView] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSignupView, setIsSignupView] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Registration roles exposed to users. These labels intentionally match the
  // functional requirements; the stored Supabase enum values remain unchanged.
  const [selectedRole, setSelectedRole] = useState("harvester");
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
const [resetEmail, setResetEmail] = useState("");
const [resetLoading, setResetLoading] = useState(false);
const [resetMessage, setResetMessage] = useState("");
const [resetError, setResetError] = useState("");

const handleForgotPassword = async (e) => {
  e.preventDefault();

  setResetMessage("");
  setResetError("");

  const normalizedEmail = resetEmail.trim().toLowerCase();

  if (!normalizedEmail) {
    setResetError("Please enter your email address.");
    return;
  }

  setResetLoading(true);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) throw error;

    setResetMessage(
      "If an account exists for this email, a password reset link will be sent. Please check your inbox and spam folder."
    );
  } catch (error) {
    console.error("Password reset error:", error);

    setResetError(
      error.message || "Unable to send the password reset email."
    );
  } finally {
    setResetLoading(false);
  }
};

if (isForgotPasswordView) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 font-sans">
      <div className="w-full max-w-[420px]">

        <div className="mb-8 text-center">
          <img
            src={wastelessLogo}
            alt="Wasteless Logo"
            className="mx-auto mb-5 h-24 w-24 object-contain"
          />

          <h2 className="text-2xl font-bold text-[#182033]">
            Forgot Password?
          </h2>

          <p className="mt-2 text-sm text-[#7c8494]">
            Enter your registered email address and we'll send you a link
            to reset your password.
          </p>
        </div>

        {resetError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          >
            {resetError}
          </div>
        )}

        {resetMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {resetMessage}
          </div>
        )}

        <form onSubmit={handleForgotPassword} className="space-y-5">
          <div>
            <label
              htmlFor="reset-email"
              className="mb-2 block text-sm font-semibold text-[#4d5667]"
            >
              Email Address
            </label>

            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => {
                setResetEmail(e.target.value);
                setResetError("");
                setResetMessage("");
              }}
              placeholder="your@email.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-[#dce1e7] bg-[#f9fafb] px-4 py-3 text-sm text-[#182033] outline-none focus:border-[#3295aa] focus:ring-2 focus:ring-[#3295aa]/20"
            />
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full rounded-xl bg-gradient-to-r from-[#2d91a8] to-[#619d2d] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetLoading ? "Sending Reset Link..." : "Send Reset Link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsForgotPasswordView(false);
            setResetError("");
            setResetMessage("");
          }}
          className="mt-6 w-full text-center text-sm font-semibold text-[#2587a2] hover:underline"
        >
          ← Back to Login
        </button>

      </div>
    </div>
  );
}

  // =========================
  // ADMIN SIGNUP VIEW
  // =========================
  if (isSignupView) {
    return (
      <AdminSignup
        onBackToLogin={() => setIsSignupView(false)}
      />
    );
  }

  // =========================
  // OFFICER LOGIN VIEW
  // =========================
  if (isOfficerView) {
    return (
      <EnvOfficerLogin
        onBackToUserLogin={() => setIsOfficerView(false)}
      />
    );
  }

  // =========================
  // ADMIN LOGIN VIEW
  // =========================
  if (isAdminView) {
    return (
      <AdminLogin
        onBackToUserLogin={() => setIsAdminView(false)}
        onSignUpClick={() => setIsSignupView(true)}
      />
    );
  }

  // =========================
  // EMAIL LOGIN
  // =========================
  const handleEmailLogin = async (e) => {
    e.preventDefault();

    setErrorMsg("");

    if (!selectedRole) {
      setErrorMsg("Please select your account role.");
      return;
    }

    if (!email || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setLoading(true);

    // Persist the user's selected account type while authentication is in
    // progress. App.jsx also checks this value during its auth listener so
    // the wrong-role case cannot be bypassed by an auth-state race.
    localStorage.setItem("wasteless_login_role", selectedRole);

    try {
      // Authenticate user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("Unable to retrieve your account.");
      }

      // Fetch role from profiles table
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile || !profile.role) {
        await supabase.auth.signOut();
        setErrorMsg(
          "This account has no role assigned yet. Please complete your registration first."
        );
        return;
      }

      // The selected role is a UI/account-type check only. The authoritative
      // role is always read from Supabase, so a user cannot gain access to a
      // different dashboard by changing the selection.
      if (profile.role !== selectedRole) {
        const roleLabels = {
          harvester: "Second-Hand Electronics Owner/Dealer",
          repair_shop: "Repair Shop",
          admin: "Administrator",
          env_officer: "Waste Management Officer",
          seller: "Seller",
        };

        const selectedRoleLabel =
          roleLabels[selectedRole] || selectedRole;
        const registeredRoleLabel =
          roleLabels[profile.role] || profile.role;

        // End the authenticated session immediately. The selected role is
        // never allowed to override the role stored in profiles.
        await supabase.auth.signOut();
        localStorage.removeItem("wasteless_login_role");

        setErrorMsg(
          `Wrong role selected. You selected ${selectedRoleLabel}, but this account is registered as ${registeredRoleLabel}. Please select the correct role and sign in again.`
        );
        return;
      }

      // The role matched the account. Remove the temporary selection before
      // entering the dashboard so App.jsx does not treat it as a mismatch.
      localStorage.removeItem("wasteless_login_role");

      if (setIsRoleChecking) {
        setIsRoleChecking(false);
      }

      window.location.reload();
    } catch (error) {
      console.error("Login error:", error);

      if (error.message === "Invalid login credentials") {
        const message =
          "Authentication failed. Please check your email or password.";
        setErrorMsg(message);
        // TC_REG_11 requires an authentication error through a popup notification.
        alert(message);
      } else {
        setErrorMsg(
          error.message || "An unexpected error occurred."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // GOOGLE / FACEBOOK LOGIN
  // =========================
  const handleSocialLogin = async (provider) => {
    try {
      setErrorMsg("");
      // Keep the selected role so App.jsx can reject a social login when
      // the authenticated profile belongs to a different account type.
      localStorage.setItem("wasteless_login_role", selectedRole);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(error);
      localStorage.removeItem("wasteless_login_role");
      setErrorMsg("Authentication failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white font-sans overflow-hidden">

      {/* =====================================================
          LEFT SIDE
      ===================================================== */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-gradient-to-br from-[#1c6280] via-[#17627a] to-[#4f9630] relative overflow-hidden">

        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#207e9c]/40 via-transparent to-[#69a832]/30" />

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-24 px-16">

          {/* LOGO / ILLUSTRATION */}
          <div className="flex flex-col items-center justify-center flex-1">

            <img
              src={wastelessLogo}
              alt="Wasteless Logo"
              className="w-64 h-64 object-contain mb-8"
            />

            <h1 className="text-white text-5xl font-bold tracking-tight">
              Wasteless
            </h1>

          </div>

          {/* TAGLINE */}
          <div className="w-full">
            <h2 className="text-white text-4xl xl:text-5xl font-extrabold tracking-tight text-center">
              Recover More. Waste Less.
            </h2>
          </div>
        </div>
      </div>

      {/* =====================================================
          RIGHT SIDE
      ===================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center px-8 sm:px-12 lg:px-20 xl:px-28">

        <div className="w-full max-w-[500px]">

          {/* BACK TO LANDING PAGE */}
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="mb-6 text-sm font-medium text-[#2d91a8] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d91a8] rounded"
            >
              ← Back to home
            </button>
          )}

          {/* HEADER */}
          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-[#182033] tracking-tight">
              Welcome Back
            </h2>

            <p className="text-[#7c8494] text-sm mt-1">
              Select your account type and sign in to access your dashboard
            </p>
          </div>

          {/* ERROR MESSAGE */}
          {errorMsg && (

            <div
              role="alert"
              aria-live="assertive"
              className="mb-5 flex items-start justify-between bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm"
            >

              <div className="flex items-start gap-2">
                <span className="font-bold">✕</span>
                <span>{errorMsg}</span>
              </div>

              <button
                type="button"
                onClick={() => setErrorMsg("")}
                className="text-red-400 hover:text-red-600 font-bold ml-3"
              >
                ✕
              </button>
            </div>
          )}

          {/* ACCOUNT ROLE */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-[#4d5667] block mb-2">
              Select Your Role
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("harvester");
                  setErrorMsg("");
                }}
                aria-pressed={selectedRole === "harvester"}
                className={`min-h-[104px] rounded-xl border-2 px-4 py-4 text-left transition ${
                  selectedRole === "harvester"
                    ? "border-[#3295aa] bg-[#f1fbfc] shadow-sm"
                    : "border-[#dce1e7] bg-white hover:border-[#9ccbd5] hover:bg-[#f9fcfd]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      selectedRole === "harvester"
                        ? "bg-[#3295aa]/10 text-[#2587a2]"
                        : "bg-[#f3f5f7] text-[#6f7785]"
                    }`}
                  >
                    <Store size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold leading-5 text-[#182033]">
                      Second-Hand Electronics Owner/Dealer
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-[#7c8494]">
                      List and sell electronic devices
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole("repair_shop");
                  setErrorMsg("");
                }}
                aria-pressed={selectedRole === "repair_shop"}
                className={`min-h-[104px] rounded-xl border-2 px-4 py-4 text-left transition ${
                  selectedRole === "repair_shop"
                    ? "border-[#3295aa] bg-[#f1fbfc] shadow-sm"
                    : "border-[#dce1e7] bg-white hover:border-[#9ccbd5] hover:bg-[#f9fcfd]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      selectedRole === "repair_shop"
                        ? "bg-[#3295aa]/10 text-[#2587a2]"
                        : "bg-[#f3f5f7] text-[#6f7785]"
                    }`}
                  >
                    <Wrench size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold leading-5 text-[#182033]">
                      Repair Shop
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-[#7c8494]">
                      Browse and bid on eligible devices
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleEmailLogin} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label className="text-xs font-semibold text-[#4d5667] block mb-2">
                Email Address
              </label>

              <div className="relative">

                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9da5b2]"
                  size={17}
                />

                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    w-full
                    pl-11
                    pr-4
                    py-3
                    bg-[#f9fafb]
                    border
                    border-[#dce1e7]
                    rounded-xl
                    text-sm
                    text-[#182033]
                    placeholder:text-[#a4aab4]
                    focus:outline-none
                    focus:border-[#3295aa]
                    focus:ring-2
                    focus:ring-[#3295aa]/20
                    transition
                  "
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>

              <div className="flex items-center justify-between mb-2">

                <label className="text-xs font-semibold text-[#4d5667]">
                  Password
                </label>

                <button
  type="button"
  className="text-xs font-medium text-[#2587a2] hover:underline"
  onClick={() => {
    setResetEmail(email);
    setResetError("");
    setResetMessage("");
    setIsForgotPasswordView(true);
  }}
>
  Forgot Password?
</button>

              </div>

              <div className="relative">

                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9da5b2]"
                  size={17}
                />

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="
                    w-full
                    pl-11
                    pr-4
                    py-3
                    bg-[#f9fafb]
                    border
                    border-[#dce1e7]
                    rounded-xl
                    text-sm
                    text-[#182033]
                    placeholder:text-[#a4aab4]
                    focus:outline-none
                    focus:border-[#3295aa]
                    focus:ring-2
                    focus:ring-[#3295aa]/20
                    transition
                  "
                />
              </div>
            </div>
            {/* SIGN IN */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                mt-2
                py-3
                bg-gradient-to-r
                from-[#2d91a8]
                to-[#619d2d]
                text-white
                font-semibold
                rounded-xl
                text-sm
                flex
                items-center
                justify-center
                gap-2
                hover:opacity-90
                active:scale-[0.99]
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading ? "Signing In..." : "Sign In"}

              {!loading && (
                <ArrowRight size={17} />
              )}
            </button>
          </form>
          {/* CREATE ACCOUNT */}
          <p className="text-center text-xs text-[#8b93a0] mt-6">
            Don't have an account?{" "}
            <span
              onClick={onSignUpClick}
              className="text-[#2587a2] font-bold cursor-pointer hover:underline"
            >
              Create Account
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;