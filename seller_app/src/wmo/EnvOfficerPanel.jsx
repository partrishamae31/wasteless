import React, { useState } from "react";
import OfficerDashboard from "./OfficerDashboard";
import EwasteHotspots from "./EwasteHotspots";
import UserActivity from "./UserActivity";
import SystemHealth from "./SystemHealth";
import BarangayMonitor from "./BarangayMonitor";
import ComplianceReport from "./ComplianceReport";
import EnvironmentalImpact from "./EnvironmentalImpact";
import AdminManagement from "./AdminManagement";
import CreateWMOAccount from "./CreateWMOAccount";

import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Map,
  Activity,
  BarChart3,
  LogOut,
  Leaf,
} from "lucide-react";

const EnvOfficerPanel = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const menuItems = [
    {
      id: "dashboard",
      label: "System Overview",
      icon: <LayoutDashboard size={16} />,
    },
    { id: "impact", label: "Environmental Impact", icon: <Leaf size={18} /> },
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
    {
      id: "create_account",
      label: "Create Account",
      icon: <ShieldCheck size={16} />,
    },
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
    // {
    //   id: "compliance",
    //   label: "Compliance Reports",
    //   icon: <FileText size={16} />,
    // },
  ];

  return (
    <div className="flex h-screen bg-[#F4F6F9] overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-[250px] bg-gradient-to-b from-[#0F172A] via-[#111827] to-[#0B1120] text-white flex flex-col border-r border-slate-800">
        {/* LOGO */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E90B6] flex items-center justify-center shadow-lg shadow-cyan-900/30">
              <Leaf size={18} className="text-white" />
            </div>

            <div>
              <h1 className="text-sm font-semibold leading-none">Wasteless</h1>

              <p className="text-[10px] text-slate-400 mt-1">
                Monitoring Center
              </p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 px-3 py-5 space-y-1">
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
                <span className={`${active ? "text-white" : "text-slate-500"}`}>
                  {item.icon}
                </span>

                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="px-3 pb-4">
          {/* USER CARD */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3 flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
              J
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                Juan Cruz
              </p>

              <p className="text-[10px] text-slate-400 truncate">
                Environmental Officer
              </p>
            </div>
          </div>

          {/* LOGOUT */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut size={16} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-[#F4F6F9]">
        <div className="h-full">
          {/* Render your pages here */}
          {activeTab === "dashboard" && <OfficerDashboard />}
          {activeTab === "impact" && <EnvironmentalImpact />}
          {activeTab === "hotspots" && <EwasteHotspots />}
          {activeTab === "activity" && <UserActivity />}
          {activeTab === "create_account" && <CreateWMOAccount />}
          {activeTab === "admin_management" && <AdminManagement />}
          {activeTab === "health" && <SystemHealth />}
          {activeTab === "barangay" && <BarangayMonitor />}
          {/* {activeTab === "compliance" && <ComplianceReport />} */}

          {/* {activeTab === "dashboard" && <OfficerDashboard />} */}
          {/* {activeTab === "compliance" && <ComplianceReport />} */}
          {/* {activeTab === "hotspots" && <EwasteHotspots />} */}

          {![
            "dashboard",
            "impact",
            "hotspots",
            "activity",
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
    </div>
  );
};

export default EnvOfficerPanel;
