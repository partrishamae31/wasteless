import React, { useState } from "react";
import { supabase } from "../supabaseClient";

import { User, Phone, Mail, Lock, Eye, EyeOff, Upload, X } from "lucide-react";

const CreateWMOAccount = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [idFile, setIdFile] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      contact_number: "",
      password: "",
      confirmPassword: "",
    });

    setIdFile(null);
  };

  const handleCreateAccount = async () => {
    try {
      setLoading(true);

      if (
        !formData.full_name ||
        !formData.email ||
        !formData.contact_number ||
        !formData.password
      ) {
        alert("Please complete all required fields.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      // CHECK EXISTING EMAIL
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingProfile) {
        alert("Email already exists.");
        return;
      }

      // CREATE AUTH ACCOUNT
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: "env_officer",
          },
        },
      });

      if (authError) {
        alert(authError.message);
        return;
      }

      const userId = authData.user.id;

      // WAIT A BIT FOR TRIGGER PROFILE CREATION
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // UPLOAD ID
      let uploadedFileUrl = "";

      if (idFile) {
        const fileExt = idFile.name.split(".").pop();

        const filePath = `wmo_ids/${userId}/id.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("verifications")
          .upload(filePath, idFile, {
            upsert: true,
          });

        if (uploadError) {
          console.error(uploadError);
        } else {
          const { data } = supabase.storage
            .from("verifications")
            .getPublicUrl(filePath);

          uploadedFileUrl = data.publicUrl;
        }
      }

      // UPDATE EXISTING PROFILE
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          contact_number: formData.contact_number,

          // IMPORTANT
          role: "env_officer",

          is_verified: true,
          verification_status: "verified",
          status: "active",

          business_permit_url: uploadedFileUrl,

          average_rating: 0,
          total_reviews: 0,
        })
        .eq("id", userId);

      if (profileError) {
        console.error(profileError);
        alert(profileError.message);
        return;
      }

      alert("WMO account created successfully.");

      resetForm();
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-end mb-6">
        <button className="bg-[#2387A5] hover:bg-[#1f7690] transition-all text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg">
          Create New Admin
        </button>
      </div>

      <div className="bg-white border border-violet-200 rounded-[28px] p-8 shadow-sm relative max-w-6xl mx-auto">
        <button className="absolute top-6 right-6 text-slate-400 hover:text-slate-700">
          <X size={20} />
        </button>

        <h2 className="text-3xl font-bold text-slate-900 mb-8">
          Create Waste Management Officer Account
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FULL NAME */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Full Name
            </label>

            <div className="relative">
              <User
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Juan Dela Cruz"
                className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter secure password"
                className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-12 outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* CONTACT */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Contact Number
            </label>

            <div className="relative">
              <Phone
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                placeholder="+63 917 123 4567"
                className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Confirm Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-12 outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Email Address
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="wmo@valenzuela.gov.ph"
                className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* FILE */}
        <div className="mt-8 max-w-xl">
          <label className="border-2 border-dashed border-slate-300 rounded-3xl h-44 flex flex-col items-center justify-center text-center cursor-pointer hover:border-cyan-400 transition-all">
            <Upload size={38} className="text-slate-400 mb-3" />

            <p className="font-semibold text-slate-700">Click to upload ID</p>

            <span className="text-sm text-slate-400 mt-1">
              PNG, JPG, or PDF (Max 5MB)
            </span>

            <input
              type="file"
              hidden
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={(e) => setIdFile(e.target.files[0])}
            />
          </label>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
          <button
            onClick={resetForm}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all font-semibold text-slate-700"
          >
            Cancel
          </button>

          <button
            onClick={handleCreateAccount}
            disabled={loading}
            className="h-14 rounded-2xl bg-[#2387A5] hover:bg-[#1f7690] transition-all text-white font-semibold shadow-lg disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWMOAccount;
