import React, { useState } from "react";
import { supabase } from "../supabaseClient";

const Login = ({ onSignUpClick }) => {
  const [role, setRole] = useState("seller");
  // 1. ADD THESE STATES
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 2. ADD THIS LOGIN FUNCTION
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Authenticate the user
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

      // 3. ROLE VALIDATION: Compare DB role with the UI selection
      if (profile.role !== role) {
        // Force sign out because the user chose the wrong role card
        await supabase.auth.signOut();
        alert(
          `Access Denied: This account is registered as a ${profile.role}. Please select the correct role above.`,
        );
        return;
      }

      console.log("Auth and Role match success!");
    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
  localStorage.setItem("pendingRole", role);

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
  } catch (error) {
    console.error("Login error:", error.message);
    alert("Error: " + error.message);
  }
};

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      {/* LEFT SIDE: Gradient */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-[#1a4567] via-[#2d7a7f] to-[#6da43a] items-center justify-center relative">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/20 rounded-full blur-3xl"></div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-12 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-400 text-sm mb-6">
            Sign in to access your dashboard
          </p>

          <label className="text-xs font-semibold text-gray-600 mb-2 block">
            Select Your Role
          </label>
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole("seller")}
              className={`flex-1 p-4 border rounded-xl text-left transition ${role === "seller" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}
            >
              <p className="text-sm font-bold text-teal-700">E-waste Seller</p>
              <p className="text-[10px] text-gray-400 leading-tight">
                List and sell electronic devices
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRole("harvester")}
              className={`flex-1 p-4 border rounded-xl text-left transition ${role === "harvester" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}
            >
              <p className="text-sm font-bold text-gray-700">
                Repair Shop / Tech-Harvester
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">
                Browse and bid on components
              </p>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-teal-500"
                value={email} // Link to state
                onChange={(e) => setEmail(e.target.value)} // Update state
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-teal-500"
                value={password} // Link to state
                onChange={(e) => setPassword(e.target.value)} // Update state
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleEmailLogin}
            disabled={loading}
            className="w-full mt-6 py-3 bg-gradient-to-r from-[#3e8ca3] to-[#689d38] text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"} <span>→</span>
          </button>

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
                src="https://www.svgrepo.com/show/303114/facebook-3.svg"
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
        </div>
      </div>
    </div>
  );
};

export default Login;
