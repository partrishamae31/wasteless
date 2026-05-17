import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import AdminLogin from "./AdminLogin";
import EnvOfficerLogin from "./EnvOfficerLogin";
import AdminSignup from "./AdminSignup";

import {
  Recycle,
  Shield,
  BarChart3,
  MapPin,
  Building2,
  Mail,
  Lock,
  ArrowRight,
  Leaf,
  Zap,
} from "lucide-react";

const Login = ({ onSignUpClick, onEnvClick, setIsRoleChecking }) => {
  const [role, setRole] = useState("seller");
  const [isAdminView, setIsAdminView] = useState(false);
  const [isOfficerView, setIsOfficerView] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSignupView, setIsSignupView] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (isSignupView) {
    return <AdminSignup onBackToLogin={() => setIsSignupView(false)} />;
  }
  if (isOfficerView) {
    return (
      <EnvOfficerLogin onBackToUserLogin={() => setIsOfficerView(false)} />
    );
  }
  if (isAdminView) {
    return (
      <AdminLogin
        onBackToUserLogin={() => setIsAdminView(false)}
        onSignUpClick={() => setIsSignupView(true)} // This function is what was missing
      />
    );
  }

  // 2. ADD THIS LOGIN FUNCTION
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      // 2. Fetch the user's role from your database (e.g., 'profiles' or 'users' table)
      const { data: profile, error: profileError } = await supabase
        .from("profiles") // Ensure this table exists in your Supabase DB
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      console.log("Selected role:", role);
      console.log("Database role:", profile?.role);
      if (!profile || profile.role !== role) {
        setErrorMsg(
          `Access Denied: This account is registered as a ${profile?.role}. Please select the correct role above.`,
        );

        await supabase.auth.signOut();

        
        setLoading(false);

        return;
      }

      console.log("Auth and Role match success!");
      window.location.reload();
    } catch (error) {
      // 💡 TRANSLATION LAYER: Check if Supabase sent the credential error
      if (error.message === "Invalid login credentials") {
        setErrorMsg(
          "Authentication failed. Please check your email or password.",
        );
      } else {
        // Fallback for other errors (like network issues)
        setErrorMsg(error.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) {
        alert("Authentication failed. Please try again.");
        return;
      }

      if (error) throw error;

      // If Supabase returns a URL, we open it in a custom popup window
      if (data?.url) {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;

        window.open(
          data.url,
          "google-login",
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`,
        );
      }
    } catch (error) {
      // 2.2.2.1 Response: Display exact error message
      alert("Authentication failed. Please try again.");
    }
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      {/* LEFT SIDE: Gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a4567] via-[#2d7a7f] to-[#6da43a] p-12 flex-col justify-between text-white relative"></div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-12 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-400 text-sm mb-6">
            Sign in to access your dashboard
          </p>
          {/* 🔥 DYNAMIC AUTHENTICATION ERROR BANNER */}
          {errorMsg && (
            <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <span className="font-bold">✕</span>
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg("")}
                className="text-red-400 hover:text-red-600 font-bold ml-2 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          <label className="text-xs font-semibold text-gray-600 mb-2 block">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              {
                id: "seller",
                title: "E-waste Seller",
                desc: "List and sell electronic devices",
                icon: <Recycle size={18} />,
              },
              {
                id: "harvester",
                title: "Repair Shop / Tech-Harvester",
                desc: "Browse and bid on components",
                icon: <Shield size={18} />,
              },
              // {
              //   id: "admin",
              //   title: "Administrator",
              //   desc: "Manage platform operations",
              //   icon: <BarChart3 size={18} />,
              // },
              // {
              //   id: "environmental",
              //   title: "Environmental Officer",
              //   desc: "Monitor city metrics",
              //   icon: <MapPin size={18} />,
              // },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setRole(item.id);
                  setErrorMsg("");
                }}
                className={`p-3 border rounded-xl text-left transition-all ${
                  role === item.id
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`mb-2 ${role === item.id ? "text-blue-600" : "text-gray-400"}`}
                >
                  {item.icon}
                </div>
                <p className="text-[11px] font-bold text-gray-800 leading-tight">
                  {item.title}
                </p>
                <p className="text-[9px] text-gray-400 leading-tight mt-1">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-teal-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Password
              </label>

              <div className="relative">
                {" "}
                {/* Added relative wrapper here */}
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={password} // Link to state
                  onChange={(e) => setPassword(e.target.value)} // Update state
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 bg-gradient-to-r from-[#3e8ca3] to-[#689d38] text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"} <span>→</span>
            </button>
          </form>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-300 text-[10px] uppercase">
              Or continue with
            </span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <img
                src="https://www.svgrepo.com/show/355037/google.svg"
                className="w-4 h-4"
                alt="Google"
              />{" "}
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("facebook")}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <img
                src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                className="w-4 h-4"
                alt="Facebook"
              />{" "}
              Facebook
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Don't have an account?{" "}
            <span
              onClick={onSignUpClick}
              className="text-teal-600 font-bold cursor-pointer hover:underline"
            >
              Create Account
            </span>
          </p>
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
            {/* <button
              onClick={() => setIsAdminView(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all group"
            >
              <div className="w-6 h-6 bg-slate-200 group-hover:bg-purple-100 rounded-lg flex items-center justify-center transition-colors">
                <Shield
                  size={12}
                  className="text-slate-500 group-hover:text-purple-600"
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Admin Portal
              </span>
            </button>
            <button
              onClick={onEnvClick} // Change from () => setIsOfficerView(true)
              className="flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-full transition-all group w-max"
            >
              <Leaf size={12} className="text-teal-600" />
              <span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest">
                Officer Portal
              </span>
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
