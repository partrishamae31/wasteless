import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import AdminLogin from "./AdminLogin";
import EnvOfficerLogin from "./EnvOfficerLogin";
import AdminSignup from "./AdminSignup";
import wastelessLogo from "./assets/wasteless-logo.png";

import {
  Recycle,
  Shield,
  Mail,
  Lock,
  ArrowRight,
} from "lucide-react";

const Login = ({ onSignUpClick, onEnvClick, setIsRoleChecking }) => {
  const [role, setRole] = useState("");
  const [isAdminView, setIsAdminView] = useState(false);
  const [isOfficerView, setIsOfficerView] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSignupView, setIsSignupView] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

    if (!role) {
      setErrorMsg("Please select your role before signing in.");
      return;
    }

    if (!email || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setLoading(true);

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

      console.log("Selected role:", role);
      console.log("Database role:", profile?.role);

      // Check whether selected role matches database role

      // Check whether selected role matches database role
      const roleNames = {
        seller: "Seller",
        harvester: "Tech-Owner/Dealer",
        repair_shop: "Repair Shop",
      };

      if (!profile || profile.role !== role) {
        const selectedRole = roleNames[role] || role;
        const registeredRole =
          roleNames[profile?.role] || "another role";

        setErrorMsg(
          `Wrong Role Selected: You selected ${selectedRole}, but this account is registered as a ${registeredRole}. Please select the correct role to sign in.`
        );

        await supabase.auth.signOut();
        return;
      }

      console.log("Auth and Role match success!");

      if (setIsRoleChecking) {
        setIsRoleChecking(false);
      }

      window.location.reload();
    } catch (error) {
      console.error("Login error:", error);

      if (error.message === "Invalid login credentials") {
        setErrorMsg(
          "Authentication failed. Please check your email or password."
        );
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
      if (!role) {
        setErrorMsg("Please select your role before continuing.");
        return;
      }

      setErrorMsg("");
      // Remember the selected role for the OAuth callback
localStorage.setItem("wasteless_login_role", role);

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

  // =========================
  // ROLE OPTIONS
  // =========================
  const roles = [
    {
      id: "harvester",
      title: "Tech-Owner/Dealer",
      desc: "Buy and sell electronic items.",
      icon: <Recycle size={20} />,
    },
    {
      id: "repair_shop",
      title: "Repair Shop",
      desc: "Browse and bid on components",
      icon: <Shield size={20} />,
    },
  ];

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
            <h2 className="text-white text-4xl xl:text-5xl font-bold tracking-tight text-center">
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

          {/* HEADER */}
          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-[#182033] tracking-tight">
              Welcome Back
            </h2>

            <p className="text-[#7c8494] text-sm mt-1">
              Sign in to access your dashboard
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

          {/* ROLE LABEL */}
          <label className="text-[11px] font-bold text-[#4d5667] mb-3 block">
            Select Your Role
          </label>

          {/* ROLE CARDS */}
          <div className="grid grid-cols-2 gap-3 mb-7">

            {roles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setRole(item.id);
                  setErrorMsg("");
                }}
                className={`
                  min-h-[104px]
                  p-4
                  rounded-xl
                  border
                  text-left
                  transition-all
                  duration-200
                  ${role === item.id
                    ? "border-[#238ba5] bg-[#f4fbfc] ring-1 ring-[#238ba5]"
                    : "border-[#dfe3e8] bg-white hover:border-[#bfc6cf]"
                  }
                `}
              >

                <div
                  className={`
                    mb-3
                    ${role === item.id
                      ? "text-[#238ba5]"
                      : "text-[#9ca3af]"
                    }
                  `}
                >
                  {item.icon}
                </div>

                <p className="text-[12px] font-bold text-[#182033] leading-tight">
                  {item.title}
                </p>

                <p className="text-[12px] text-[#7c8494] leading-tight mt-1">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleEmailLogin} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label className="text-[11px] font-semibold text-[#4d5667] block mb-2">
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

                <label className="text-[11px] font-semibold text-[#4d5667]">
                  Password
                </label>

                <button
  type="button"
  className="text-[10px] font-medium text-[#2587a2] hover:underline"
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
          <p className="text-center text-[11px] text-[#8b93a0] mt-6">
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