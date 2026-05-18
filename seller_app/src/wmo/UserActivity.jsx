import React from "react";
import { 
  Users, 
  Activity, 
  RefreshCcw, 
  MapPin, 
  Download,
  ShieldAlert,
  Clock,
  ExternalLink,
  Store,
  Hammer,
  UserCheck
} from "lucide-react";

const UserActivity = () => {
  // Mini Stat Card (Top Row)
  const MiniStat = ({ icon: Icon, label, value, trend, color }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex-1">
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
          <Icon size={18} />
        </div>
        <span className={`text-[10px] font-bold ${color}`}>{trend}</span>
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <h3 className="text-lg font-black text-slate-800">{value}</h3>
    </div>
  );

  // Statistics Bar for Roles
  const RoleStatBar = ({ icon: Icon, role, total, verified, pending, suspended, color }) => (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-700">{role}</span>
        </div>
        <span className="text-xs font-black text-slate-800">{total}</span>
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
          <p className="text-[9px] font-bold text-emerald-600 uppercase">Verified</p>
          <p className="text-sm font-black text-emerald-700">{verified}</p>
        </div>
        <div className="bg-orange-50/50 p-2 rounded-lg border border-orange-100">
          <p className="text-[9px] font-bold text-orange-600 uppercase">Pending</p>
          <p className="text-sm font-black text-orange-700">{pending}</p>
        </div>
        <div className="bg-red-50/50 p-2 rounded-lg border border-red-100">
          <p className="text-[9px] font-bold text-red-600 uppercase">Suspended</p>
          <p className="text-sm font-black text-red-700">{suspended}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">User Activity</h1>
        <p className="text-sm text-slate-500 font-medium">Centralized monitoring dashboard for Valenzuela City E-waste Platform</p>
      </div>

      {/* TOP MINI STATS */}
      {/* <div className="flex gap-4">
        <MiniStat icon={Users} label="Total Platform Users" value="1,248" trend="+12%" color="text-emerald-500" />
        <MiniStat icon={Activity} label="Active Transactions" value="87" trend="+3%" color="text-emerald-500" />
        <MiniStat icon={RefreshCcw} label="System Uptime" value="99.8%" trend="+0.2%" color="text-emerald-500" />
        <MiniStat icon={MapPin} label="Active Barangays" value="18/33" trend="55%" color="text-blue-500" />
      </div> */}

      {/* GENERATE REPORT BAR */}
      {/* <div className="bg-[#F0F7FF] p-4 rounded-xl border border-blue-100 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800">System Monitoring Report</h4>
          <p className="text-xs text-slate-500">Generate comprehensive platform performance and compliance report</p>
        </div>
        <button className="bg-[#1E293B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
          <Download size={14} /> Generate Report
        </button>
      </div> */}

      {/* USER STATISTICS BY ROLE */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">User Statistics by Role</h2>
        <div className="space-y-3">
          <RoleStatBar icon={UserCheck} role="Sellers" total="1064" verified="962" pending="72" suspended="12" />
          <RoleStatBar icon={Hammer} role="Repair Shops" total="87" verified="75" pending="8" suspended="4" />
          <RoleStatBar icon={Store} role="Tech Harvesters" total="107" verified="94" pending="11" suspended="2" />
        </div>
        <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
          <Activity size={14} className="text-blue-500" />
          <p className="text-[10px] font-bold text-blue-700">Total platform users: 1,248 / Verification rate: <span className="text-blue-500">92.1%</span></p>
        </div>
      </div>

      {/* RECENT USER ACTIVITY */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Recent User Activity</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { name: "Maria Santos", role: "Seller", action: "Created new listing: iPhone 12", time: "4 min ago", status: "New" },
            { name: "Tech Repair Valenzuela", role: "Repair Shop", action: "Placed bid: Dell XPS 13", time: "12 min ago", status: "Active" },
            { name: "Juan Cruz", role: "Seller", action: "Accepted bid: Samsung Galaxy S21", time: "18 min ago", status: "Finished" },
            { name: "E-Waste Hub", role: "Tech Harvester", action: "Completed transaction: Westbase, Mar 2026", time: "25 min ago", status: "Success" },
            { name: "Ana Reyes", role: "Seller", action: "Cancelled listing: iPad Air", time: "45 min ago", status: "Cancelled" },
          ].map((item, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{item.name} <span className="text-[9px] font-medium text-slate-400 ml-1">({item.role})</span></p>
                  <p className="text-[10px] text-slate-500">{item.action}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 mb-1 flex items-center justify-end gap-1"><Clock size={10} /> {item.time}</p>
                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SUSPICIOUS ACTIVITY ALERTS */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-red-50/30 border-b border-red-50 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-500" />
          <h2 className="text-xs font-black text-red-700 uppercase tracking-widest">Suspicious Activity Alerts</h2>
        </div>
        <div className="p-2 space-y-2">
          {[
            { id: "User #1248", type: "High Gravity", desc: "Multiple failed transactions", color: "bg-red-500" },
            { id: "Quick Fix Shop", type: "Unusual activity", desc: "Unverified credentials", color: "bg-orange-500" },
            { id: "User #7283", type: "Monitoring", desc: "Rapid account creation", color: "bg-yellow-500" },
          ].map((alert, idx) => (
            <div key={idx} className="bg-orange-50/30 border border-orange-100/50 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">{alert.id} <span className={`text-[8px] px-1.5 py-0.5 rounded text-white ml-2 uppercase ${alert.color}`}>{alert.type}</span></p>
                <p className="text-[10px] text-slate-500 mt-0.5">{alert.desc}</p>
              </div>
              <button className="bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-lg hover:bg-orange-600 transition-colors uppercase">Review</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserActivity;