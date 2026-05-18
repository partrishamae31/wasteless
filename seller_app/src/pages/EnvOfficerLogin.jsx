import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const EnvOfficerLogin = ({
  onBackToUserLogin,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // REAL LOGIN FUNCTION
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // LOGIN
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (authError) {
        throw authError;
      }

      // FETCH PROFILE
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();

        throw new Error("Profile not found.");
      }

      // CHECK ROLE
      if (profile.role !== "env_officer") {
        await supabase.auth.signOut();

        throw new Error(
          "Access denied. Waste Management Officer account required.",
        );
      }

      // CHECK VERIFIED
      if (!profile.is_verified) {
        await supabase.auth.signOut();

        throw new Error("Your account is still pending approval.");
      }

      // SUCCESS
      onLoginSuccess();
    } catch (err) {
      console.error(err);

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // BYPASS LOGIN FUNCTION (Demo Mode)
  const handleBypass = () => {
    setLoading(true);
    // Simulate a loading state for a realistic feel
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07142d] px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,70,180,0.35),_transparent_55%)]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#f7f7f7] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-10 py-12">
        {/* Title */}
        <h1 className="text-center text-[40px] font-bold text-[#114d27] mb-12">
          Waste Management Officer Login
        </h1>

        {/* FORM */}
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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="
                w-full
                h-[62px]
                rounded-2xl
                border
                border-gray-300
                bg-white
                pl-14
                pr-5
                text-[15px]
                outline-none
                focus:border-[#2f8f46]
                focus:ring-2
                focus:ring-[#2f8f46]/20
                transition-all
              "
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="
                w-full
                h-[62px]
                rounded-2xl
                border
                border-gray-300
                bg-white
                pl-14
                pr-14
                text-[15px]
                outline-none
                focus:border-[#2f8f46]
                focus:ring-2
                focus:ring-[#2f8f46]/20
                transition-all
              "
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="
                absolute
                right-5
                top-1/2
                -translate-y-1/2
                text-gray-400
                hover:text-gray-600
              "
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
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
          "
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        {/* CREATE ACCOUNT */}
        {/* <div className="text-center mt-10 text-[15px] text-gray-600">
          Don’t have an account?{" "}
          <button
            onClick={onSignupClick}
            className="font-semibold text-[#1f4d2f] hover:underline"
          >
            Create Account
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default EnvOfficerLogin;
