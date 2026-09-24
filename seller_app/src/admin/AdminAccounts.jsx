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
  CheckCircle2,
  ChevronDown,
  Building2,
  BadgeCheck,
} from "lucide-react";

const AdminAccounts = () => {
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [toast, setToast] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const departments = [
    "City Environment and Natural Resources Office (CENRO)",
    "General Services Office (GSO)",
    "Information and Communications Technology Office (ICTO)",
    "City Planning and Development Office (CPDO)",
    "Public Order and Safety Office (POSO)",
    "City Health Office (CHO)",
  ];

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    department: "",
    employee_id: "",
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
      department: "",
      employee_id: "",
      barangay: "",
      password: "",
      confirmPassword: "",
    });
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
        !formData.department ||
        !formData.employee_id ||
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
      // UPDATE PROFILE
      // =========================
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          contact_number: formData.contact_number,
          barangay: formData.barangay,

          department: formData.department,
          employee_id: formData.employee_id,

          role: "admin",

          // CHANGE THESE IF YOU WANT
          // AUTO VERIFIED ADMINS
          status: "Active",
          verification_status: "verified",
          is_verified: true,

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
      setToast("Administrator account created and activated successfully.");
      setTimeout(() => setToast(""), 5000);

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
            Create new administrator accounts for the platform
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-700 transition-all text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-200"
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
            {/* ROW 1: FULL NAME | EMAIL */}
            <InputField
              icon={<User size={18} />}
              label="Full Name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Juan Dela Cruz"
            />

            <InputField
              icon={<Mail size={18} />}
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@valenzuela.gov.ph"
            />

            {/* ROW 2: CONTACT | DEPARTMENT */}
            <InputField
              icon={<Phone size={18} />}
              label="Contact Number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              placeholder="+63 917 123 4567"
            />

            <SelectField
              icon={<Building2 size={18} />}
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Select Department"
              options={departments}
            />

            {/* ROW 3: EMPLOYEE ID | BARANGAY */}
            <InputField
              icon={<BadgeCheck size={18} />}
              label="Employee ID"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              placeholder="EMP-2026-12345"
            />

            <SelectField
              icon={<MapPin size={18} />}
              label="Barangay Assignment"
              name="barangay"
              value={formData.barangay}
              onChange={handleChange}
              placeholder="Select Barangay"
              options={valenzuelaBarangays}
            />

            {/* ROW 4: PASSWORD | CONFIRM PASSWORD */}
            <PasswordField
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              show={showPassword}
              toggle={() => setShowPassword(!showPassword)}
            />

            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              show={showConfirmPassword}
              toggle={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>

          {/* IMMEDIATE ACCESS NOTICE */}
          <div className="mt-8 bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-4">
            <Shield
              size={22}
              className="text-purple-600 shrink-0 mt-0.5"
            />

            <div>
              <p className="font-bold text-purple-700">
                Immediate Access
              </p>

              <p className="text-purple-600 text-sm mt-1">
                This account will be created immediately with full
                administrator privileges. No approval required.
              </p>
            </div>
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
              className="h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all text-white font-semibold shadow-lg shadow-purple-200 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Admin Account"}
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={20} />
          <span className="font-semibold text-sm">{toast}</span>
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
          className="w-full h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-slate-400 text-slate-700 transition"
          {...props}
        />
      </div>
    </div>
  );
};

// =========================
// REUSABLE SELECT
// =========================
const SelectField = ({
  icon,
  label,
  options = [],
  ...props
}) => {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-2">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
            {icon}
          </div>
        )}

        <select
          className="w-full h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-11 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none text-slate-700 transition"
          {...props}
        >
          <option value="">{props.placeholder || "Select an option"}</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          size={18}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
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
          className="w-full h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-12 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-slate-400 text-slate-700 transition"
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