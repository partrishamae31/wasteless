
import React, { useEffect, useState } from "react";
import OfficerDashboard from "./OfficerDashboard";
import EwasteHotspots from "./EwasteHotspots";
import UserActivity from "./UserActivity";
import SystemHealth from "./SystemHealth";
import CreateWMOAccount from "./CreateWMOAccount";
import BarangayMonitor from "./BarangayMonitor";
import EnvironmentalImpact from "./EnvironmentalImpact";
import AdminManagement from "./AdminManagement";

import {
  LayoutDashboard,
  ShieldCheck,
  Map,
  Activity,
  BarChart3,
  LogOut,
  Leaf,
  User,
  Mail,
  Phone,
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// IMPORTANT:
// Keep this import path the same as the Supabase client used
// in the rest of your project.
// If your project uses a different path, change only this line.
import { supabase } from "../supabaseClient";

const EnvOfficerPanel = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Profile states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const menuItems = [
    {
      id: "dashboard",
      label: "System Overview",
      icon: <LayoutDashboard size={16} />,
    },
    {
      id: "impact",
      label: "Environmental Impact",
      icon: <Leaf size={18} />,
    },
    {
      id: "hotspots",
      label: "E-Waste Hotspots",
      icon: <Map size={16} />,
    },
    {
      id: "activity",
      label: "User Activity",
      icon: <BarChart3 size={16} />,
    },
    // {
    //   id: "create_account",
    //   label: "Create Account",
    //   icon: <ShieldCheck size={16} />,
    // },
    {
      id: "admin_management",
      label: "Admin Management",
      icon: <ShieldCheck size={16} />,
    },
    {
      id: "health",
      label: "System Health",
      icon: <Activity size={16} />,
    },
    {
      id: "barangay",
      label: "Barangay Monitor",
      icon: <ShieldCheck size={16} />,
    },
  ];

  /*
   * ============================================================
   * LOAD ENVIRONMENTAL OFFICER PROFILE
   * ============================================================
   *
   * Your profiles table contains:
   *
   * id:
   * 3cfe0d4b-ef11-4ce8-ae6e-7ad52b83040c
   *
   * full_name:
   * WMO
   *
   * role:
   * env_officer
   *
   * barangay:
   * Marulas
   *
   * email:
   * officer@wasteless.com
   *
   * contact_number:
   * 09859990866
   *
   * status:
   * active
   *
   * verification_status:
   * verified
   *
   * The query uses the authenticated user's ID.
   */
  const loadOfficerProfile = async () => {
    if (!user?.id) {
      console.warn(
        "EnvOfficerPanel: No authenticated user ID was provided."
      );
      return;
    }

    setProfileLoading(true);
    setProfileError("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          role,
          barangay,
          email,
          contact_number,
          status,
          is_verified,
          verification_status,
          created_at
        `)
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Error loading environmental officer profile:",
          error
        );

        setProfileError(
          "Unable to load your profile information."
        );

        return;
      }

      if (!data) {
        console.warn(
          "No profile record was found for authenticated user:",
          user.id
        );

        setProfileError(
          "No profile information was found for this account."
        );

        return;
      }

      setProfile(data);
    } catch (error) {
      console.error(
        "Unexpected error loading officer profile:",
        error
      );

      setProfileError(
        "An unexpected error occurred while loading your profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  /*
   * Load profile when the authenticated user changes.
   */
  useEffect(() => {
    if (user?.id) {
      loadOfficerProfile();
    }
  }, [user?.id]);

  /*
   * ============================================================
   * OPEN PROFILE
   * ============================================================
   */
  const handleOpenProfile = async () => {
    setShowProfileModal(true);

    // Refresh profile information whenever the modal opens.
    await loadOfficerProfile();
  };

  /*
   * ============================================================
   * DISPLAY VALUES
   * ============================================================
   *
   * These fallback values are only used if the profile hasn't
   * loaded yet. Once Supabase returns the record, the actual
   * profile data is displayed.
   */
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "WMO";

  const displayEmail =
    profile?.email ||
    user?.email ||
    "Not provided";

  const displayPhone =
    profile?.contact_number ||
    "Not provided";

  const displayBarangay =
    profile?.barangay ||
    "Not provided";

  const displayRole =
    profile?.role === "env_officer"
      ? "Environmental Officer"
      : profile?.role || "Environmental Officer";

  const displayStatus =
    profile?.status
      ? String(profile.status)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())
      : "Active";

  const displayVerification =
    profile?.verification_status
      ? String(profile.verification_status)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())
      : profile?.is_verified
      ? "Verified"
      : "Pending";

  const profileInitial =
    displayName?.trim()?.charAt(0)?.toUpperCase() || "W";

  return (
    <div className="flex h-screen bg-[#F4F6F9] overflow-hidden">
      {/* ======================================================
          SIDEBAR
      ====================================================== */}
      <aside className="w-[250px] bg-gradient-to-b from-[#0F172A] via-[#111827] to-[#0B1120] text-white flex flex-col border-r border-slate-800">
        {/* ====================================================
            LOGO
        ==================================================== */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E90B6] flex items-center justify-center shadow-lg shadow-cyan-900/30">
              <Leaf size={18} className="text-white" />
            </div>

            <div>
              <h1 className="text-sm font-semibold leading-none">
                Wasteless
              </h1>

              <p className="text-[10px] text-slate-400 mt-1">
                Monitoring Center
              </p>
            </div>
          </div>
        </div>

        {/* ====================================================
            NAVIGATION
        ==================================================== */}
        <div className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const active = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  active
                    ? "bg-[#1E90B6] text-white shadow-lg shadow-cyan-950/20"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <span
                  className={
                    active
                      ? "text-white"
                      : "text-slate-500"
                  }
                >
                  {item.icon}
                </span>

                <span className="font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ====================================================
            FOOTER
        ==================================================== */}
        <div className="px-3 pb-4">
          {/* ==================================================
              CLICKABLE PROFILE CARD
          ================================================== */}
          <button
            type="button"
            onClick={handleOpenProfile}
            className="w-full text-left bg-slate-800/70 border border-slate-700 rounded-xl p-3 flex items-center gap-3 mb-3 hover:bg-slate-700/80 hover:border-slate-600 transition-all duration-200 group"
            title="View Profile"
          >
            {/* PROFILE AVATAR */}
            <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold group-hover:bg-[#1E90B6] group-hover:text-white transition-colors">
              {profileInitial}
            </div>

            {/* PROFILE NAME */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {displayName}
              </p>

              <p className="text-[10px] text-slate-400 truncate">
                {displayRole}
              </p>
            </div>

            <User
              size={14}
              className="text-slate-500 group-hover:text-slate-300 transition-colors"
            />
          </button>

          {/* ==================================================
              LOGOUT
          ================================================== */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut size={16} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}
      <main className="flex-1 overflow-y-auto bg-[#F4F6F9]">
        <div className="h-full">
          {activeTab === "dashboard" && <OfficerDashboard />}

          {activeTab === "impact" && <EnvironmentalImpact />}

          {activeTab === "hotspots" && <EwasteHotspots />}

          {activeTab === "activity" && <UserActivity />}

          {activeTab === "create_account" && <CreateWMOAccount />}

          {activeTab === "admin_management" && <AdminManagement />}

          {activeTab === "health" && <SystemHealth />}

          {activeTab === "barangay" && <BarangayMonitor />}

          {![
            "dashboard",
            "impact",
            "hotspots",
            "activity",
            "create_account",
            "health",
            "barangay",
            "admin_management",
          ].includes(activeTab) && (
            <div className="flex items-center justify-center h-full text-slate-300">
              <div className="text-center">
                <LayoutDashboard
                  size={48}
                  className="mx-auto mb-4 opacity-20"
                />

                <p className="text-sm font-medium">
                  Select a module from the sidebar
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ======================================================
          PROFILE MODAL
      ====================================================== */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            {/* ==================================================
                MODAL HEADER
            ================================================== */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E90B6] px-6 py-5 text-white relative">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close profile"
              >
                <X size={18} />
              </button>

              <p className="text-xs text-white/70 mb-1">
                Account Profile
              </p>

              <h2 className="text-xl font-semibold">
                Environmental Officer
              </h2>
            </div>

            {/* ==================================================
                PROFILE CONTENT
            ================================================== */}
            <div className="px-6 py-6">
              {/* LOADING */}
              {profileLoading && (
                <div className="py-10 text-center">
                  <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-slate-200 border-t-[#1E90B6] animate-spin" />

                  <p className="text-sm text-slate-500">
                    Loading profile...
                  </p>
                </div>
              )}

              {/* ERROR */}
              {!profileLoading && profileError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="text-red-500 mt-0.5 shrink-0"
                    />

                    <div>
                      <p className="text-sm font-medium text-red-700">
                        Unable to load profile
                      </p>

                      <p className="text-xs text-red-600 mt-1">
                        {profileError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PROFILE */}
              {!profileLoading && !profileError && profile && (
                <>
                  {/* PROFILE AVATAR */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-[#1E90B6] flex items-center justify-center text-white text-2xl font-semibold shadow-lg shadow-cyan-900/20">
                      {profileInitial}
                    </div>

                    <h3 className="mt-3 text-lg font-semibold text-slate-800">
                      {displayName}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {displayRole}
                    </p>

                    {/* VERIFIED BADGE */}
                    {profile.is_verified && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                        <CheckCircle2
                          size={13}
                          className="text-emerald-600"
                        />

                        <span className="text-[11px] font-medium text-emerald-700">
                          Verified Account
                        </span>
                      </div>
                    )}
                  </div>

                  {/* INFORMATION */}
                  <div className="space-y-3">
                    {/* FULL NAME */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <User
                          size={16}
                          className="text-[#1E90B6]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Full Name
                        </p>

                        <p className="text-sm font-medium text-slate-700 truncate">
                          {displayName}
                        </p>
                      </div>
                    </div>

                    {/* EMAIL */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <Mail
                          size={16}
                          className="text-[#1E90B6]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Email
                        </p>

                        <p className="text-sm font-medium text-slate-700 truncate">
                          {displayEmail}
                        </p>
                      </div>
                    </div>

                    {/* CONTACT NUMBER */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <Phone
                          size={16}
                          className="text-[#1E90B6]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Contact Number
                        </p>

                        <p className="text-sm font-medium text-slate-700 truncate">
                          {displayPhone}
                        </p>
                      </div>
                    </div>

                    {/* BARANGAY */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <MapPin
                          size={16}
                          className="text-[#1E90B6]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Barangay
                        </p>

                        <p className="text-sm font-medium text-slate-700 truncate">
                          {displayBarangay}
                        </p>
                      </div>
                    </div>

                    {/* ROLE */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <ShieldCheck
                          size={16}
                          className="text-[#1E90B6]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Role
                        </p>

                        <p className="text-sm font-medium text-slate-700">
                          {displayRole}
                        </p>
                      </div>
                    </div>

                    {/* STATUS */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                          <Activity
                            size={16}
                            className="text-[#1E90B6]"
                          />
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Account Status
                          </p>

                          <p className="text-sm font-medium text-slate-700">
                            {displayStatus}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          String(profile.status).toLowerCase() ===
                          "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    {/* VERIFICATION */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                          <CheckCircle2
                            size={16}
                            className="text-[#1E90B6]"
                          />
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Verification
                          </p>

                          <p className="text-sm font-medium text-slate-700">
                            {displayVerification}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {displayVerification}
                      </span>
                    </div>
                  </div>

                  {/* CLOSE */}
                  <button
                    type="button"
                    onClick={() =>
                      setShowProfileModal(false)
                    }
                    className="w-full mt-6 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvOfficerPanel;
