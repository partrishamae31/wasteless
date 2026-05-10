import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Shield,
  Mail,
  Lock,
  Eye,
  Leaf,
  ChevronLeft,
  Fingerprint,
} from "lucide-react";

const EnvOfficerLogin = ({ onBackToUserLogin, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // REAL LOGIN FUNCTION
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "env_officer") {
        await supabase.auth.signOut();
        throw new Error(
          "Access denied. Environmental Officer credentials required."
        );
      }

      // If successful, trigger the dashboard view
      onLoginSuccess();
    } catch (err) {
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
    <div className="min-h-screen bg-[#056B4F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* BACKGROUND GLOW */}
      <div className="absolute w-[500px] h-[500px] bg-green-400/10 blur-3xl rounded-full left-[-150px] top-[50px]" />

      <div className="w-full max-w-[430px] relative z-10">
        {/* CARD */}
        <div className="bg-[#F8F8F8] rounded-2xl overflow-hidden shadow-2xl">
          
          {/* TOP BANNER */}
          <div className="bg-[#07A63D] text-white text-[11px] tracking-wide font-medium py-3 flex items-center justify-center gap-2">
            <Shield size={13} />
            ENVIRONMENTAL OFFICER ACCESS ONLY
          </div>

          {/* CONTENT */}
          <div className="px-8 py-10">
            
            {/* ICON */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#07A63D] flex items-center justify-center shadow-lg shadow-green-700/30">
                <Leaf className="text-white" size={28} />
              </div>
            </div>

            {/* TITLE */}
            <div className="text-center mb-8">
              <h1 className="text-[38px] leading-none font-semibold text-[#1E293B]">
                Environmental Portal
              </h1>

              <p className="text-sm text-slate-500 mt-3">
                Monitoring & compliance system
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* EMAIL */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Officer Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@valenzuela.gov.ph"
                    className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Access Key
                </label>

                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-11 pr-11 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3 font-medium">
                  {error}
                </div>
              )}

              {/* AUTHORIZED BOX */}
              <div className="bg-[#F2FBF4] border border-[#BDE5C8] rounded-xl p-4 flex gap-3">
                <div className="mt-1">
                  <Shield size={16} className="text-[#07A63D]" />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#0D7A37] uppercase tracking-wide">
                    Authorized Personnel Only
                  </h3>

                  <p className="text-[10px] text-[#4B7A58] mt-1 leading-relaxed">
                    This portal is reserved for designated environmental officers. Access is monitored.
                  </p>
                </div>
              </div>

              {/* LOGIN BUTTON */}
              <button
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#079245] hover:bg-[#067A3A] text-white font-bold text-sm shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Authenticating..." : "Access Environmental Portal"}
              </button>
            </form>

            {/* QUICK BYPASS FOR DEMO */}
            <div className="mt-4">
              <button
                onClick={handleBypass}
                disabled={loading}
                className="w-full py-3 border-2 border-dashed border-green-200 rounded-xl text-green-700 text-[10px] font-black uppercase tracking-widest hover:bg-green-50 transition-all flex items-center justify-center gap-2"
              >
                <Fingerprint size={14} /> 
                {loading ? "Processing..." : "Bypass Authorization (Demo Mode)"}
              </button>
            </div>

            {/* BACK BUTTON */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={onBackToUserLogin}
                className="flex items-center gap-2 text-[#07A63D] text-xs font-bold uppercase tracking-widest hover:underline"
              >
                <ChevronLeft size={14} />
                Back to User Portal
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER NOTICE */}
        <div className="mt-4 bg-[#EAF1FF]/80 backdrop-blur-sm text-[#4162A6] text-[10px] font-medium text-center rounded-xl px-5 py-3 shadow-sm border border-blue-100/50 uppercase tracking-wider">
          LGU Valenzuela Compliance Management System
        </div>
      </div>
    </div>
  );
};

export default EnvOfficerLogin;