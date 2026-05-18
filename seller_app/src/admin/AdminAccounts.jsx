// src/AdminAccounts.jsx
import { supabase } from "../supabaseClient";
import React, { useState } from "react";
import {
  Shield,
  Plus,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  X,
  Upload,
} from "lucide-react";

const AdminAccounts = () => {
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    barangay: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateAdmin = async () => {
    try {
      setLoading(true);

      // VALIDATION
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

      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      if (!idFile) {
        alert("Please upload a valid ID.");
        return;
      }

      // CREATE AUTH ACCOUNT
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        console.error(authError);
        alert(authError.message);
        return;
      }

      if (!authData?.user) {
        alert("Failed to create user.");
        return;
      }

      const userId = authData.user.id;

      // =========================
      // UPLOAD ID FILE
      // =========================
      let uploadedFileUrl = "";

      const fileExt = idFile.name.split(".").pop();

      const filePath = `admin_ids/${userId}/id.${fileExt}`;

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
      // INSERT PROFILE
      // =========================
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          contact_number: formData.contact_number,
          barangay: formData.barangay,

          role: "admin",

          status: "Pending",
          verification_status: "pending",
          is_verified: false,

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

      // SUCCESS
      setSuccess(true);
      setShowForm(false);

      // OPTIONAL RESET
      setFormData({
        full_name: "",
        email: "",
        contact_number: "",
        barangay: "",
        password: "",
        confirmPassword: "",
      });

      setIdFile(null);
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const [idFile, setIdFile] = useState(null);

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
  if (success) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-[#F8FAFC]">
        <div className="bg-white rounded-[32px] shadow-xl p-10 max-w-2xl w-full">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
              <Shield className="text-yellow-600" size={36} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-slate-900 mb-4">
            Registration Pending WMO Approval
          </h1>

          <p className="text-center text-slate-500 mb-8">
            Your administrator registration has been submitted successfully and
            is now awaiting approval.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 mb-6">
            <p className="font-semibold mb-2">Account Not Yet Active</p>

            <p className="text-sm">
              You will not be able to log in until your account has been
              reviewed and approved by the Waste Management Officer (WMO).
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-4">
              What happens next?
            </h3>

            <ul className="space-y-3 text-slate-600 text-sm">
              <li>1. WMO reviews your credentials and documents</li>
              <li>2. Department head authorization is verified</li>
              <li>3. You will receive an email once approved</li>
              <li>4. After approval, you can log in normally</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
      {/* HEADER STATS */}
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

      {/* SECTION HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Administrator Accounts
          </h1>

          <p className="text-slate-500 mt-1">
            Create new administrator accounts for the platform
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-[#2387A5] hover:bg-[#1f7690] transition-all text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} />
          Create New Admin
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-white border border-violet-200 rounded-3xl p-8 shadow-sm relative">
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
                  placeholder="admin@valenzuela.gov.ph"
                  className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-cyan-500"
                />
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

            {/* BARANGAY */}
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
                  className="
        w-full
        h-14
        rounded-2xl
        border
        border-slate-300
        bg-white
        pl-12
        pr-4
        outline-none
        focus:ring-2
        focus:ring-cyan-500
        appearance-none
        text-slate-700
      "
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
                  <Eye size={18} />
                </button>
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
                  <Eye size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* FILE UPLOAD */}
          <div className="mt-8">
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

          {/* ACTION BUTTONS */}
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

export default AdminAccounts;
