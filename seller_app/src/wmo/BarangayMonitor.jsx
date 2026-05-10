import React from "react";
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  MapPin, 
  Download, 
  Users, 
  Package, 
  BarChart3,
  ChevronRight
} from "lucide-react";

const BarangayMonitor = () => {
  // Podium Card Component
  const PodiumCard = ({ rank, name, items, growth, households, color, icon: Icon }) => (
    <div className={`${color} p-6 rounded-2xl text-white shadow-lg relative overflow-hidden flex-1`}>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-white/20 p-2 rounded-lg"><Icon size={20} /></div>
          <span className="text-2xl font-black opacity-40">#{rank}</span>
        </div>
        <h3 className="text-lg font-black leading-tight mb-4">{name}</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-end border-b border-white/10 pb-2">
            <p className="text-[10px] font-bold uppercase opacity-70">Total Items Collected</p>
            <p className="text-lg font-black">{items}</p>
          </div>
          <div className="flex justify-between items-end border-b border-white/10 pb-2">
            <p className="text-[10px] font-bold uppercase opacity-70">Growth Rate</p>
            <p className="text-xs font-black">+{growth}%</p>
          </div>
          <div className="flex justify-between items-end">
            <p className="text-[10px] font-bold uppercase opacity-70">Active Households</p>
            <p className="text-xs font-black">{households}</p>
          </div>
        </div>
      </div>
      <Icon size={120} className="absolute -right-8 -bottom-8 opacity-10 rotate-12" />
    </div>
  );

  const rankings = [
    { rank: 1, name: "Barangay Karuhatan", total: "342 Items", stock: "High Stock", stockColor: "bg-emerald-500", households: "1,248", badge: "Top Contributor", badgeColor: "bg-orange-100 text-orange-600 border-orange-200" },
    { rank: 2, name: "Barangay Marulas", total: "298 Items", stock: "High Stock", stockColor: "bg-emerald-500", households: "1,120", badge: "2nd Place", badgeColor: "bg-slate-100 text-slate-600 border-slate-200" },
    { rank: 3, name: "Barangay Veinte Reales", total: "267 Items", stock: "High Stock", stockColor: "bg-emerald-500", households: "1,100", badge: "3rd Place", badgeColor: "bg-orange-50 text-orange-700 border-orange-100" },
    { rank: 4, name: "Barangay Maysan", total: "215 Items", stock: "Medium Stock", stockColor: "bg-blue-500", households: "942", badge: null },
    { rank: 5, name: "Barangay Ugong", total: "182 Items", stock: "Medium Stock", stockColor: "bg-blue-500", households: "720", badge: null },
    { rank: 6, name: "Barangay Malinta", total: "176 Items", stock: "Medium Stock", stockColor: "bg-blue-500", households: "850", badge: null },
    { rank: 7, name: "Barangay Paso de Blas", total: "154 Items", stock: "Medium Stock", stockColor: "bg-blue-500", households: "642", badge: null },
    { rank: 8, name: "Barangay Lingunan", total: "142 Items", stock: "Low Stock", stockColor: "bg-orange-500", households: "512", badge: null },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Barangay Monitor</h1>
        <p className="text-sm text-slate-500 font-medium">Centralized monitoring dashboard for Valenzuela City E-waste Platform</p>
      </div>

      {/* TOP STATS BAR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
        {[
          { label: "Total Users", value: "5,480" },
          { label: "Active Users", value: "3,456" },
          { label: "Total Transactions", value: "35,678" },
          { label: "Active Listings", value: "25,876" },
          { label: "Verified Shops", value: "507" },
          { label: "Devices Cataloged", value: "78,765" },
          { label: "Active Barangays", value: "18/33" },
        ].map((stat, i) => (
          <div key={i} className="text-center px-4 border-r border-slate-100 last:border-0">
            <h3 className="text-lg font-black text-slate-800">{stat.value}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* REPORT BAR */}
      <div className="bg-[#FEFCE8] p-4 rounded-xl border border-yellow-100 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800">System Monitoring Report</h4>
          <p className="text-[11px] text-slate-500">Generate comprehensive platform performance and compliance report</p>
        </div>
        <button className="bg-[#1E293B] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
          <Download size={14} /> Generate Report
        </button>
      </div>

      {/* LEADERBOARD HEADER */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 rounded-xl text-white flex items-center gap-3 shadow-md">
        <Trophy size={20} />
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">Barangay E-waste Leaderboard</h3>
          <p className="text-[10px] opacity-80 italic">Ranking based on community participation and e-waste reduction activity</p>
        </div>
      </div>

      {/* PODIUM */}
      <div className="flex gap-6">
        <PodiumCard rank={1} name="Barangay Karuhatan" items="342" growth="20" households="1,248" color="bg-orange-500" icon={Trophy} />
        <PodiumCard rank={2} name="Barangay Marulas" items="298" growth="24" households="960" color="bg-slate-400" icon={Medal} />
        <PodiumCard rank={3} name="Barangay Veinte Reales" items="267" growth="18" households="890" color="bg-orange-700" icon={Medal} />
      </div>

      {/* DETAILED RANKINGS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Complete Rankings</h3>
          <p className="text-[10px] text-slate-400">Clear stock indicators help identify high-activity locations</p>
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-4 text-left">Rank</th>
              <th className="px-6 py-4 text-left">Barangay Name</th>
              <th className="px-6 py-4 text-left">Total Items Donated</th>
              <th className="px-6 py-4 text-left">Stock Level</th>
              <th className="px-6 py-4 text-left">Active Households</th>
              <th className="px-6 py-4 text-left">Badge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rankings.map((item) => (
              <tr key={item.rank} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${item.rank <= 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                    {item.rank}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-slate-300" />
                    <span className="text-xs font-bold text-slate-700">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">{item.total}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.stockColor}`}></div>
                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${item.stockColor.replace('bg-', 'text-')}`}>
                      {item.stock}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-700">{item.households}</td>
                <td className="px-6 py-4">
                  {item.badge && (
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER TOTALS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 text-center shadow-sm">
          <h4 className="text-xl font-black text-slate-800">1,783</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Items Collected</p>
          <p className="text-[8px] text-blue-500 mt-1 italic font-medium">Across all participating barangays</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 text-center shadow-sm">
          <h4 className="text-xl font-black text-slate-800">8</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Participating Barangays</p>
          <p className="text-[8px] text-blue-500 mt-1 italic font-medium">Active in this period</p>
        </div>
      </div>
    </div>
  );
};

export default BarangayMonitor;