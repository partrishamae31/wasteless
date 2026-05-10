import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Trophy, Medal, Award, MapPin, BarChart3, Users, Box } from "lucide-react";

const BarangayLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    // In a real app, this would be a complex query or a RPC call aggregating data
    // For now, we'll use mock data that matches your provided UI image
    const mockData = [
      { id: 1, name: "Karuhatan", items: 342, growth: "+28%", households: 1240, stock: "High Stock", badge: "Top Contributor" },
      { id: 2, name: "Marulas", items: 298, growth: "+24%", households: 980, stock: "High Stock", badge: "2nd Place" },
      { id: 3, name: "Veinte Reales", items: 267, growth: "+19%", households: 1100, stock: "High Stock", badge: "3rd Place" },
      { id: 4, name: "Maysan", items: 215, growth: "+12%", households: 850, stock: "Medium Stock", badge: null },
      { id: 5, name: "Ugong", items: 189, growth: "+8%", households: 720, stock: "Medium Stock", badge: null },
      { id: 6, name: "Malinta", items: 176, growth: "+5%", households: 890, stock: "Medium Stock", badge: null },
      { id: 7, name: "Paso de Blas", items: 154, growth: "+3%", households: 650, stock: "Medium Stock", badge: null },
      { id: 8, name: "Lingunan", items: 142, growth: "+2%", households: 780, stock: "Low Stock", badge: null },
    ];
    
    setLeaderboardData(mockData);
    setLoading(false);
  };

  const topThree = leaderboardData.slice(0, 3);
  const remaining = leaderboardData.slice(3);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-8 rounded-[2rem] text-white shadow-xl">
        <div className="flex items-center gap-4 mb-2">
          <Trophy size={32} className="text-yellow-400" />
          <h2 className="text-2xl font-black uppercase tracking-tight">Barangay E-waste Leaderboard</h2>
        </div>
        <p className="text-blue-100 text-xs font-bold opacity-80 uppercase tracking-widest">
          Rankings based on community participation and e-waste reduction activity
        </p>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topThree.map((item, index) => (
          <div 
            key={item.id}
            className={`p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden transition-transform hover:scale-105 ${
              index === 0 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
              index === 1 ? 'bg-slate-200 text-slate-700' :
              'bg-gradient-to-br from-orange-700 to-orange-800 text-white'
            }`}
          >
            <div className="absolute top-6 right-8 opacity-20">
              {index === 0 ? <Trophy size={64} /> : index === 1 ? <Medal size={64} /> : <Award size={64} />}
            </div>
            <div className="relative z-10">
              <span className="text-4xl font-black opacity-40">#{index + 1}</span>
              <h3 className="text-xl font-black mt-2 mb-4">Barangay {item.name}</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="opacity-70">Total Items Donated</span>
                  <span>{item.items}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="opacity-70">Growth Rate</span>
                  <span className="text-lime-300">{item.growth}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="opacity-70">Active Households</span>
                  <span>{item.households.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Complete Rankings Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Complete Rankings</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1">Clear stock indicators help identify high-activity locations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">Rank</th>
                <th className="px-8 py-4">Barangay Name</th>
                <th className="px-8 py-4">Total Items</th>
                <th className="px-8 py-4">Stock Level</th>
                <th className="px-8 py-4">Households</th>
                <th className="px-8 py-4">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaderboardData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${
                      index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-700">Barangay {item.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-black text-slate-600">{item.items} items</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                      item.stock === 'High Stock' ? 'bg-emerald-100 text-emerald-600' :
                      item.stock === 'Medium Stock' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-500">{item.households.toLocaleString()}</td>
                  <td className="px-8 py-5">
                    {item.badge && (
                      <span className="px-3 py-1 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded-lg text-[8px] font-black uppercase tracking-tighter">
                        ⭐ {item.badge}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Bottom Summary Stats */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 text-center">
          <p className="text-3xl font-black text-slate-800">1,783</p>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Total Items Collected Across Valenzuela</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 text-center">
          <p className="text-3xl font-black text-slate-800">{leaderboardData.length}</p>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Participating Barangays</p>
        </div>
      </div>
    </div>
  );
};

export default BarangayLeaderboard;