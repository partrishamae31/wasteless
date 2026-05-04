import React, { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import UserManagement from "./UserManagement";
import {
  LayoutDashboard,
  Users,
  Database,
  FileText,
  LogOut,
} from "lucide-react";

const AdminPanel = ({ onLogout }) => {
  // State to track which screen to show
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* --- PERSISTENT SIDEBAR --- */}
      <aside className="w-64 bg-[#1e293b] text-slate-300 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded-lg"></div>
          <span className="font-bold text-white text-lg">Wasteless</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "analytics"
                ? "bg-teal-600 text-white"
                : "hover:bg-slate-800"
            }`}
          >
            <LayoutDashboard size={20} />{" "}
            <span className="text-sm font-medium">Platform Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("user-management")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "user-management"
                ? "bg-teal-600 text-white"
                : "hover:bg-slate-800"
            }`}
          >
            <Users size={20} />{" "}
            <span className="text-sm font-medium">User Management</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onLogout} // Connect the click handler
            className="w-full flex items-center gap-3 px-4 py-3 hover:text-white transition"
          >
            <LogOut size={20} />{" "}
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* --- DYNAMIC MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "analytics" ? <AdminDashboard /> : <UserManagement />}
      </main>
    </div>
  );
};

export default AdminPanel;
