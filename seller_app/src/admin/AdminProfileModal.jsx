import React from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  BadgeCheck,
  Building2,
  Star,
} from "lucide-react";

/**
 * Admin Profile modal — shows the logged-in barangay coordinator's
 * account info when their profile card in the sidebar is clicked.
 */
const AdminProfileModal = ({ isOpen, onClose, adminProfile }) => {
  if (!isOpen) return null;

  const profile = adminProfile || {};

  const verified =
    Boolean(profile.is_verified) ||
    (profile.verification_status || "").toLowerCase() === "verified";

  const verificationStatus = (profile.verification_status || "pending").toLowerCase();

  const initials = (profile.full_name || "Admin User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">My Admin Profile</h2>

            <p className="text-xs text-slate-400 mt-1">
              Barangay coordinator account information
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 bg-slate-50/50 overflow-y-auto flex-1 custom-scrollbar">
          {/* Identity card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-lg font-bold text-teal-600 shrink-0">
                {initials || "AU"}
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-800 truncate">
                  {profile.full_name || "Admin User"}
                </h3>

                <p className="text-sm text-slate-500 truncate">
                  {profile.email || "No email on record"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
                    <Shield size={12} />
                    Barangay Coordinator
                  </span>

                  {profile.barangay ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <MapPin size={12} />
                      {profile.barangay}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                      <MapPin size={12} />
                      No barangay assigned
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <DetailItem
                label="Full Name"
                value={profile.full_name || "—"}
                icon={<User size={14} />}
              />

              <DetailItem
                label="Email"
                value={profile.email || "—"}
                icon={<Mail size={14} />}
              />

              <DetailItem
                label="Contact Number"
                value={profile.contact_number || "—"}
                icon={<Phone size={14} />}
              />

              <DetailItem
                label="Assigned Barangay"
                value={profile.barangay || "—"}
                icon={<MapPin size={14} />}
                valueColor={profile.barangay ? "text-blue-700 font-bold" : "text-orange-500 font-bold"}
              />

              <DetailItem
                label="Department"
                value={profile.department || "—"}
                icon={<Building2 size={14} />}
              />

              <DetailItem
                label="Employee ID"
                value={profile.employee_id || "—"}
                icon={<BadgeCheck size={14} />}
              />

              <DetailItem
                label="Date Registered"
                value={
                  profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"
                }
                icon={<Calendar size={14} />}
              />

              <DetailItem
                label="Account Status"
                value={(profile.status || "active").replace(/^./, (c) => c.toUpperCase())}
                valueColor={
                  (profile.status || "active").toLowerCase() === "active"
                    ? "text-emerald-600 font-bold"
                    : "text-red-500 font-bold"
                }
              />

              <DetailItem
                label="Approval / Verification"
                value={
                  verified
                    ? "Approved"
                    : verificationStatus === "rejected"
                      ? "Rejected"
                      : "Pending"
                }
                icon={
                  verified ? (
                    <ShieldCheck size={14} className="text-emerald-500" />
                  ) : (
                    <ShieldAlert size={14} className="text-orange-500" />
                  )
                }
                valueColor={
                  verified
                    ? "text-emerald-600 font-bold"
                    : verificationStatus === "rejected"
                      ? "text-red-500 font-bold"
                      : "text-orange-500 font-bold"
                }
              />

              <DetailItem
                label="Rating"
                value={
                  profile.average_rating != null
                    ? `${profile.average_rating} ★`
                    : "N/A"
                }
                icon={<Star size={14} />}
              />
            </div>

            {/* Scoping notice */}
            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 flex items-start gap-4">
              <MapPin size={20} className="text-blue-600 shrink-0 mt-0.5" />

              <div>
                <p className="font-bold text-blue-700 text-sm">
                  Barangay Coordinator Scope
                </p>

                <p className="text-blue-600 text-sm mt-1">
                  {profile.barangay
                    ? `You are assigned to Barangay ${profile.barangay}. All users, transactions, donations, drop-off points, and analytics shown in this panel are limited to your barangay.`
                    : "No barangay is assigned to this account yet. Contact the WMO office so your coordinator scope can be set. Tabs will show city-wide data until then."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, icon, valueColor = "text-slate-800" }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">
      {label}
    </span>

    <div className="flex items-center gap-2">
      {icon && <span className="text-slate-400">{icon}</span>}

      <span className={`text-sm font-semibold break-words ${valueColor}`}>
        {value ?? "—"}
      </span>
    </div>
  </div>
);

export default AdminProfileModal;