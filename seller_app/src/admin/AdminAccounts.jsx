// src/AdminAccounts.jsx

import React, { useState } from "react";
import { supabase } from "../supabaseClient";

import {
  Shield,
  Plus,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  X,
  Upload,
  CheckCircle2,
} from "lucide-react";

const AdminAccounts = () => {
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [idFile, setIdFile] = useState(null);

  const valenzuelaBarangays = [
    "Arkong Bato",
    "Bagbaguin",
    "Balangkas",
    "Bignay",
    "Bisig",
    "Canumay East",
    "Canumay West",
    "Coloong",
    "Dalandanan",
    "Gen. T. de Leon",
    "Isla",
    "Karuhatan",
    "Lawang Bato",
    "Lingunan",
    "Mabolo",
    "Malanday",
    "Malinta",
    "Mapulang Lupa",
    "Marulas",
    "Maysan",
    "Palasan",
    "Pariancillo Villa",
    "Paso de Blas",
    "Pasolo",
    "Poblacion",
    "Pulo",
    "Punturin",
    "Rincon",
    "Tagalag",
    "Ugong",
    "Viente Reales",
    "Wawang Pulo",
  ];

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    barangay: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      contact_number: "",
      barangay: "",
      password: "",
      confirmPassword: "",
    });

    setIdFile(null);
  };

  const handleCreateAdmin = async () => {
    try {
      setLoading(true);

      // =========================
      // VALIDATION
      // =========================
      if (
        !formData.full_name ||
        !formData.email ||
        !formData.contact_number ||
        !formData.barangay ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        alert("Please complete all fields.");
        return;
      }

      if (formData.password.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      if (!idFile) {
        alert("Please upload a valid ID.");
        return;
      }

      // =========================
      // SAVE CURRENT SESSION
      // IMPORTANT:
      // Prevent admin logout after signup
      // =========================
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      // =========================
      // CREATE AUTH USER
      // =========================
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,

        options: {
          data: {
            role: "admin",
          },
        },
      });

      if (authError) {
        console.error(authError);
        alert(authError.message);
        return;
      }

      if (!authData?.user) {
        alert("Failed to create admin account.");
        return;
      }

      const userId = authData.user.id;

      // =========================
      // RESTORE CURRENT ADMIN SESSION
      // =========================
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      // =========================
      // UPLOAD FILE
      // =========================
      let uploadedFileUrl = "";

      const fileExt = idFile.name.split(".").pop();

      const filePath = `admin_ids/${userId}/id_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verifications")
        .upload(filePath, idFile, {
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        alert("Failed to upload ID.");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("verifications")
        .getPublicUrl(filePath);

      uploadedFileUrl = publicUrlData.publicUrl;

      // =========================
      // UPDATE PROFILE
      // =========================
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          contact_number: formData.contact_number,
          barangay: formData.barangay,

          role: "admin",

          // CHANGE THESE IF YOU WANT
          // AUTO VERIFIED ADMINS
          status: "Active",
          verification_status: "verified",
          is_verified: true,

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

      // =========================
      // SUCCESS
      // =========================
      setSuccess(true);
      setShowForm(false);

      resetForm();
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      label: "Total Users",
      value: "1,248",
    },
    {
      label: "Active Listing",
      value: "342",
    },
    {
      label: "Verified Shops",
      value: "87",
    },
    {
      label: "Devices Cataloged",
      value: "456",
    },
  ];

  // =========================
  // SUCCESS SCREEN
  // =========================
  if (success) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-[#F8FAFC]">
        <div className="bg-white rounded-[32px] shadow-xl p-10 max-w-2xl w-full border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600" size={40} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-slate-900 mb-4">
            Administrator Created Successfully
          </h1>

          <p className="text-center text-slate-500 mb-8">
            The new administrator account has been created and activated.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-700 mb-6">
            <p className="font-semibold mb-2">Account Activated</p>

            <p className="text-sm">
              The administrator can now log in using the registered email and
              password.
            </p>
          </div>

          <button
            onClick={() => {
              setSuccess(false);
              setShowForm(true);
            }}
            className="w-full h-14 rounded-2xl bg-[#2387A5] hover:bg-[#1f7690] text-white font-semibold transition-all"
          >
            Create Another Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
          >
            <h2 className="text-5xl font-black text-slate-900 text-center">
              {item.value}
            </h2>

            <p className="text-center text-slate-500 text-sm mt-2">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Administrator Accounts
          </h1>

          <p className="text-slate-500 mt-1">
            Create and manage platform administrator accounts
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#2387A5] hover:bg-[#1f7690] transition-all text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg"
          >
            <Plus size={18} />
            Create New Admin
          </button>
        )}
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative">
          {/* CLOSE */}
          <button
            onClick={() => setShowForm(false)}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-700"
          >
            <X size={20} />
          </button>

          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Create Administrator Account
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FULL NAME */}
            <InputField
              icon={<User size={18} />}
              label="Full Name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Juan Dela Cruz"
            />

            {/* EMAIL */}
            <InputField
              icon={<Mail size={18} />}
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@valenzuela.gov.ph"
            />

            {/* CONTACT */}
            <InputField
              icon={<Phone size={18} />}
              label="Contact Number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              placeholder="+63 917 123 4567"
            />

            {/* BARANGAY */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Barangay Assignment
              </label>

              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10"
                />

                <select
                  name="barangay"
                  value={formData.barangay}
                  onChange={handleChange}
                  className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-cyan-500 appearance-none text-slate-700"
                >
                  <option value="">Select barangay</option>

                  {valenzuelaBarangays.map((barangay) => (
                    <option key={barangay} value={barangay}>
                      {barangay}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PASSWORD */}
            <PasswordField
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              show={showPassword}
              toggle={() => setShowPassword(!showPassword)}
            />

            {/* CONFIRM PASSWORD */}
            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              show={showConfirmPassword}
              toggle={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>

          {/* FILE */}
          <div className="mt-8">
            <label className="border-2 border-dashed border-slate-300 rounded-3xl h-44 flex flex-col items-center justify-center text-center cursor-pointer hover:border-cyan-400 transition-all">
              <Upload size={38} className="text-slate-400 mb-3" />

              <p className="font-semibold text-slate-700">
                {idFile ? idFile.name : "Click to upload ID"}
              </p>

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

          {/* BUTTONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            <button
              onClick={() => setShowForm(false)}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              onClick={handleCreateAdmin}
              disabled={loading}
              className="h-14 rounded-2xl bg-[#2387A5] hover:bg-[#1f7690] transition-all text-white font-semibold shadow-lg disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Admin Account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================
// REUSABLE INPUT
// =========================
const InputField = ({ icon, label, type = "text", ...props }) => {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-2">
        {label}
      </label>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>

        <input
          type={type}
          className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-cyan-500"
          {...props}
        />
      </div>
    </div>
  );
};

// =========================
// PASSWORD FIELD
// =========================
const PasswordField = ({ label, show, toggle, ...props }) => {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-2">
        {label}
      </label>

      <div className="relative">
        <Lock
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type={show ? "text" : "password"}
          className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-12 outline-none focus:ring-2 focus:ring-cyan-500"
          {...props}
        />

        <button
          type="button"
          onClick={toggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

export default AdminAccounts;
