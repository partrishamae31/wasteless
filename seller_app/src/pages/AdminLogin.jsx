import React, { useState } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Shield
} from "lucide-react";

const AdminLogin = ({ onBackToUserLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // Add your admin login logic here
    console.log("Admin login attempt:", email);
  };

  return (
    <div className="min-h-screen bg-[#1a0b2e] bg-gradient-to-br from-[#1a0b2e] via-[#4a148c] to-[#1a0b2e] flex flex-col items-center justify-center p-4 font-sans">
    
      {/* MAIN LOGIN CARD */}
      <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        
        {/* RED RESTRICTED BANNER */}
        <div className="bg-[#ff0000] py-2 px-4 flex items-center justify-center gap-2">
          <ShieldAlert size={14} className="text-white" />
          <span className="text-white text-[10px] font-black uppercase tracking-[0.15em]">
            Restricted Access - Administrators Only
          </span>
        </div>

        <div className="p-10 pt-8 flex flex-col items-center">
          {/* PURPLE SHIELD ICON */}
          <div className="w-16 h-16 bg-gradient-to-br from-[#a855f7] to-[#7c3aed] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-6">
            <Shield size={32} className="text-white" />
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-1">Admin Portal</h1>
          <p className="text-slate-400 text-sm mb-8">Secure administrator login</p>

          <form onSubmit={handleLogin} className="w-full space-y-5">
            {/* EMAIL FIELD */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block ml-1">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="email"
                  placeholder="admin@wasteless.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            {/* PASSWORD FIELD */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* SECURITY NOTICE BOX */}
            <div className="bg-[#fdfaff] border border-[#f3e8ff] rounded-xl p-4 flex gap-3">
              <ShieldCheck className="text-purple-500 shrink-0" size={18} />
              <div>
                <h4 className="text-[11px] font-bold text-purple-900 uppercase tracking-wide">Security Notice</h4>
                <p className="text-[10px] text-purple-600/80 leading-relaxed mt-0.5">
                  This portal is exclusively for authorized system administrators. All login attempts are logged and monitored.
                </p>
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="w-full bg-[#8b22eb] hover:bg-[#7a1dd1] text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98]"
            >
              Access Admin Portal
            </button>
          </form>          
          {/* BACK TO LOGIN */}
          <button
            onClick={onBackToUserLogin}
            className="mt-6 flex items-center gap-2 text-purple-600 hover:text-purple-700 text-xs font-bold transition-colors"
          >
            <ArrowLeft size={14} />
            Back to User Login
          </button>
        </div>
      </div>

      {/* BOTTOM WARNING BOX */}
      <div className="mt-6 w-full max-w-[420px] bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-3 text-center shadow-sm">
        <p className="text-[10px] text-[#92400e] leading-tight">
          <span className="font-bold">Warning:</span> Unauthorized access attempts will be reported to system security.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;