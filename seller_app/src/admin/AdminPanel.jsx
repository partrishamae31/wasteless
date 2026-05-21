import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

import AdminDashboard from "./AdminDashboard";
import UserManagement from "./UserManagement";
import EWasteHotspots from "./EWasteHotspots";
import DonationManagement from "./DonationManagement";
import DropOffPoints from "./DropOffPoints";
import TransactionReview from "./TransactionReview";
import DonatedDatabase from "./DonatedDatabase";
import DeviceDatabase from "./DeviceDatabase";
import ValuationModel from "./ValuationModel";
import TrustTierManagement from "./TrustTierManagement";
import ComplianceReport from "./ComplianceReport";
import AdminAccounts from "./AdminAccounts";

import {
  LayoutDashboard,
  Users,
  MapPin,
  HeartHandshake,
  Navigation,
  ShieldCheck,
  FileSearch,
  Database,
  BarChart3,
  LogOut,
  ChevronRight,
  FileText,
  Shield,
} from "lucide-react";

const AdminPanel = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("analytics");

  // NEW STATE
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  // FETCH PENDING USERS
  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_verified", false);

    if (error) {
      console.error("Error fetching pending count:", error.message);
    } else {
      setPendingVerificationCount(count || 0);
    }
  };

  const menuItems = [
    {
      id: "analytics",
      label: "Platform Analytics",
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: "hotspots",
      label: "E-Waste Hotspots",
      icon: <MapPin size={18} />,
    },
    {
      id: "donation",
      label: "Donation Management",
      icon: <HeartHandshake size={18} />,
    },
    // {
    //   id: "donated",
    //   label: "Donated Items Database",
    //   icon: <Database size={18} />,
    // },
    {
      id: "dropoff",
      label: "Drop-off Points",
      icon: <Navigation size={18} />,
    },

    // UPDATED
    {
      id: "user-management",
      label: "User Management",
      icon: <Users size={18} />,
      badge: pendingVerificationCount,
    },
    // {
    //   id: "admin-accounts",
    //   label: "Admin Accounts",
    //   icon: <Shield size={18} />,
    // },

    {
      id: "transaction",
      label: "Transaction Review",
      icon: <FileSearch size={18} />,
      badge: 2,
    },
    {
      id: "database",
      label: "Device Database",
      icon: <Database size={18} />,
    },
    {
      id: "valuation",
      label: "Valuation Model",
      icon: <BarChart3 size={18} />,
    },
    {
      id: "trust",
      label: "Trust Tiers",
      icon: <ShieldCheck size={18} />,
    },
    // {
    //   id: "compliance",
    //   label: "Compliance Report",
    //   icon: <FileText size={18} />,
    // },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#1E293B] text-slate-400 flex flex-col shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            {/* <ShieldCheck size={20} className="text-white" /> */}
          </div>

          <div>
            <span className="font-bold text-white text-lg block leading-none">
              Wasteless
            </span>

            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
              Admin Panel
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                  : "hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={
                    activeTab === item.id
                      ? "text-teal-400"
                      : "text-slate-500 group-hover:text-slate-300"
                  }
                >
                  {item.icon}
                </span>

                <span className="text-sm font-medium">{item.label}</span>
              </div>

              {/* UPDATED BADGE */}
              {item.badge > 0 ? (
                <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : (
                activeTab === item.id && <ChevronRight size={14} />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-3">
          {/* ADMIN ACCOUNT BUTTON */}
          <button
            onClick={() => setActiveTab("admin-accounts")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTab === "admin-accounts"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                : "bg-slate-800/40 hover:bg-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={
                  activeTab === "admin-accounts"
                    ? "text-teal-400"
                    : "text-slate-500 group-hover:text-slate-300"
                }
              >
                <Shield size={18} />
              </span>

              <span className="text-sm font-medium">Admin Accounts</span>
            </div>

            {activeTab === "admin-accounts" && <ChevronRight size={14} />}
          </button>

          {/* ADMIN PROFILE CARD */}
          <div className="bg-slate-800/40 rounded-2xl p-4 flex items-center gap-3 border border-slate-700/30">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              AU
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                Admin User
              </p>

              <p className="text-[10px] text-slate-500 truncate">
                administrator
              </p>
            </div>

            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
        {activeTab === "analytics" && <AdminDashboard />}
        {activeTab === "hotspots" && <EWasteHotspots />}
        {activeTab === "donation" && <DonationManagement />}
        {activeTab === "donated" && <DonatedDatabase />}
        {activeTab === "dropoff" && <DropOffPoints />}
        {activeTab === "user-management" && <UserManagement />}
        {activeTab === "admin-accounts" && <AdminAccounts />}
        {activeTab === "transaction" && <TransactionReview />}
        {activeTab === "database" && <DeviceDatabase />}
        {activeTab === "valuation" && <ValuationModel />}
        {activeTab === "trust" && <TrustTierManagement />}
        {/* {activeTab === "compliance" && <ComplianceReport />} */}
      </main>
    </div>
  );
};

export default AdminPanel;
