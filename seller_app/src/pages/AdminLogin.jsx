import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Mail, Lock, Eye, EyeOff, MailCheck, MailWarning } from "lucide-react";
import wastelessLogo from "./assets/wasteless-logo.png";

const AdminLogin = ({ onBackToUserLogin, onSignUpClick, onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendState, setResendState] = useState("idle");
  const [loginError, setLoginError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetState, setResetState] = useState("idle");
  const [resetError, setResetError] = useState("");

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const normalizedEmail = forgotEmail.trim().toLowerCase();
    setResetError("");
    if (!normalizedEmail) {
      setResetError("Please enter your email address.");
      return;
    }
    try {
      setResetState("sending");
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: "https://wasteless.online/reset-password",
      });
      if (error) throw error;
      setResetState("sent");
    } catch (err) {
      console.error("Admin password reset error:", err);
      setResetError(err.message || "Unable to send the password reset email.");
      setResetState("idle");
    }
  };

  const handleResend = async () => {
    if (!email || resendState !== "idle") return;
    try {
      setResendState("sending");
      setLoginError("");
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
      if (error) throw error;
      setResendState("sent");
    } catch (err) {
      console.error(err);
      setLoginError(err.message || "Unable to resend confirmation email.");
      setResendState("idle");
    }
  };

  const completeLogin = async (user) => {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileError || !profile) { await supabase.auth.signOut(); throw new Error("Profile not found."); }
    if (String(profile.role || "").trim().toLowerCase() !== "admin") { await supabase.auth.signOut(); throw new Error("Access denied. Not an admin account."); }
    if (!profile.is_verified) { await supabase.auth.signOut(); throw new Error("Your admin account is still pending approval by WMO."); }
    localStorage.setItem("adminAuthenticated", "true");
    onLoginSuccess(profile);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setEmailNotConfirmed(false);
    setLoginError("");
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const message = (error.message || "").toLowerCase();
        if (error.code === "email_not_confirmed" || message.includes("email not confirmed") || message.includes("not confirmed")) {
          setEmailNotConfirmed(true); setResendState("idle"); return;
        }
        throw error;
      }
      await completeLogin(data.user);
    } catch (err) {
      console.error("Admin login failed:", err);
      setLoginError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07142d] px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,70,180,0.35),_transparent_55%)]" />
        <div className="relative z-10 w-full max-w-2xl bg-[#f7f7f7] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-10 py-12">
          <div className="flex justify-center mb-6"><img src={wastelessLogo} alt="Wasteless logo" className="h-20 w-20 object-contain" /></div>
          <h1 className="text-center text-[40px] font-bold text-[#114d27] mb-6">Reset Password</h1>
          <p className="text-center text-[15px] text-gray-600 mb-10 leading-relaxed">Enter the email linked to your admin account and we'll send a password reset link.</p>
          {resetState === "sent" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-start gap-3"><MailCheck size={22} className="text-emerald-600 shrink-0 mt-0.5" /><div className="flex-1"><p className="font-semibold text-emerald-800">Reset link sent</p><p className="text-sm text-emerald-700 mt-1 leading-relaxed">If an account exists for <strong>{forgotEmail}</strong>, a password reset link was sent. Check your inbox and spam folder.</p><button type="button" onClick={() => { setShowForgotPassword(false); setResetState("idle"); }} className="mt-4 rounded-lg bg-emerald-100 hover:bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800">Back to login</button></div></div></div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-8">
              {resetError && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">{resetError}</div>}
              <div><label className="block text-[15px] font-semibold text-[#1f4d2f] mb-3">Email Address</label><div className="relative"><Mail size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" placeholder="Enter email address" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required autoComplete="email" className="w-full h-[62px] rounded-2xl border border-gray-300 bg-white pl-14 pr-5 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20" /></div></div>
              <div className="space-y-4"><button type="submit" disabled={resetState === "sending"} className="w-full h-[62px] rounded-2xl bg-gradient-to-r from-[#2387b7] to-[#5da11e] text-white text-[18px] font-semibold shadow-lg disabled:opacity-50">{resetState === "sending" ? "Sending..." : "Send Reset Link"}</button><button type="button" onClick={() => { setShowForgotPassword(false); setResetError(""); }} className="w-full text-center text-[14px] text-[#4aa0d8] hover:underline">Back to login</button></div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07142d] px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,70,180,0.35),_transparent_55%)]" />
      <div className="relative z-10 w-full max-w-2xl bg-[#f7f7f7] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-10 py-12">
        <div className="flex justify-center mb-6"><img src={wastelessLogo} alt="Wasteless logo" className="h-20 w-20 object-contain" /></div>
        <h1 className="text-center text-[40px] font-bold text-[#114d27] mb-12">Admin Login</h1>
        {emailNotConfirmed && <div className="-mt-4 mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5"><div className="flex items-start gap-3"><MailWarning size={22} className="text-amber-500 shrink-0 mt-0.5" /><div className="flex-1"><p className="font-semibold text-amber-800">Email not confirmed yet</p><p className="text-sm text-amber-700 mt-1 leading-relaxed">A confirmation email was sent to <strong>{email}</strong>. Confirm it before logging in.</p><button type="button" onClick={handleResend} disabled={resendState !== "idle"} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-amber-800"><MailCheck size={13} />{resendState === "sending" ? "Resending..." : resendState === "sent" ? "Confirmation email sent ✓" : "Resend confirmation email"}</button></div></div></div>}
        {loginError && !emailNotConfirmed && <div className="-mt-4 mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4"><p className="text-sm font-semibold text-red-600">{loginError}</p></div>}
        <form onSubmit={handleLogin} className="space-y-8">
          <div><label className="block text-[15px] font-semibold text-[#1f4d2f] mb-3">Email Address</label><div className="relative"><Mail size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" placeholder="Enter email address" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full h-[62px] rounded-2xl border border-gray-300 bg-white pl-14 pr-5 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20" /></div></div>
          <div><div className="flex items-center justify-between mb-3"><label className="text-[15px] font-semibold text-[#1f4d2f]">Password</label><button type="button" onClick={() => { setForgotEmail(email); setResetError(""); setResetState("idle"); setShowForgotPassword(true); }} className="text-[14px] text-[#4aa0d8] hover:underline">Forgot Password?</button></div><div className="relative"><Lock size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" /><input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="w-full h-[62px] rounded-2xl border border-gray-300 bg-white pl-14 pr-14 text-[15px] outline-none focus:border-[#2f8f46] focus:ring-2 focus:ring-[#2f8f46]/20" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
          <button type="submit" disabled={loading} className="w-full h-[62px] rounded-2xl bg-gradient-to-r from-[#2387b7] to-[#5da11e] text-white text-[18px] font-semibold shadow-lg disabled:opacity-50">{loading ? "Signing In..." : "Login"}</button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
