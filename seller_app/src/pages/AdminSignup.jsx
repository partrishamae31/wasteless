import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { 
  Shield, Mail, Lock, User, Building2, 
  ChevronRight, ChevronLeft, Fingerprint, 
  BadgeCheck, MapPin 
} from "lucide-react";

const AdminSignup = ({ onBackToLogin }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    employeeId: "",
    role: "env_officer", // Default role
    barangay: "Karuhatan",
  });

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // 2. Create Profile with the correct Enum role
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user.id,
          full_name: formData.fullName,
          role: formData.role,
          employee_id: formData.employeeId,
          barangay: formData.barangay,
          verification_status: "pending",
        },
      ]);

      if (profileError) throw profileError;
      alert("Registration successful! Wait for system approval.");
      onBackToLogin();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#056B4F] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-green-400/10 blur-3xl rounded-full right-[-100px] bottom-[-100px]" />
      
      <div className="w-full max-w-[500px] relative z-10">
        <div className="bg-[#F8F8F8] rounded-3xl overflow-hidden shadow-2xl border border-white/20">
          
          {/* STEP INDICATOR */}
          <div className="flex">
            <div className={`h-1.5 flex-1 ${step >= 1 ? "bg-[#07A63D]" : "bg-slate-200"}`} />
            <div className={`h-1.5 flex-1 ${step >= 2 ? "bg-[#07A63D]" : "bg-slate-200"}`} />
          </div>

          <div className="px-10 py-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#07A63D] flex items-center justify-center shadow-lg shadow-green-900/40">
                <Shield className="text-white" size={32} />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-800 text-center tracking-tight">Official Registration</h1>
            <p className="text-center text-slate-500 text-sm mt-2 mb-8">Access the LGU Valenzuela Compliance Portal</p>

            <form onSubmit={handleSignup} className="space-y-5">
              {step === 1 ? (
                <>
                  {/* ROLE SELECTION */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {['env_officer', 'admin'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({...formData, role: r})}
                        className={`p-4 rounded-2xl border-2 transition-all text-center ${
                          formData.role === r 
                          ? "border-[#07A63D] bg-green-50 shadow-inner" 
                          : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-widest ${formData.role === r ? "text-[#07A63D]" : "text-slate-400"}`}>
                          {r.replace('_', ' ')}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <div className="relative mt-1">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          required
                          className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20"
                          placeholder="e.g. Juan Dela Cruz"
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee ID / Badge No.</label>
                      <div className="relative mt-1">
                        <BadgeCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          required
                          className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20"
                          placeholder="e.g. VAL-2026-7721"
                          onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full h-12 bg-slate-800 text-white rounded-xl font-bold text-sm mt-4 flex items-center justify-center gap-2"
                  >
                    Next Step <ChevronRight size={18} />
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                      <div className="relative mt-1">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="email" 
                          required
                          className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20"
                          placeholder="officer@valenzuela.gov.ph"
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
                      <div className="relative mt-1">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="password" 
                          required
                          className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20"
                          placeholder="••••••••"
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Barangay</label>
                      <div className="relative mt-1">
                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select 
                          className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl outline-none appearance-none"
                          onChange={(e) => setFormData({...formData, barangay: e.target.value})}
                        >
                          <option value="Karuhatan">Karuhatan</option>
                          <option value="Maysan">Maysan</option>
                          <option value="Marulas">Marulas</option>
                          <option value="Ugong">Ugong</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 h-12 border-2 border-slate-200 text-slate-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex- h-12 bg-[#07A63D] text-white rounded-xl font-bold text-sm shadow-lg shadow-green-900/20"
                    >
                      {loading ? "Registering..." : "Complete Registration"}
                    </button>
                  </div>
                </>
              )}
            </form>

            <button 
              onClick={onBackToLogin}
              className="w-full text-center text-xs text-slate-400 font-bold uppercase tracking-widest mt-8 hover:text-green-600 transition-colors"
            >
              Already have access? Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;