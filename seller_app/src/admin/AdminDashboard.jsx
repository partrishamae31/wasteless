import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import UserManagement from "./UserManagement";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";

import {
  Users,
  Package,
  ShieldCheck,
  Database,
  Leaf,
  Zap,
  Droplets,
  Box,
  Filter,
  Download,
  ArrowUpRight,
  CheckCircle2,
  Recycle,
  AlertTriangle,
  Building2,
} from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    transactions: 0,
    verifiedShops: 0,
  });

  const [chartData, setChartData] = useState([]);
  const [recoveryData, setRecoveryData] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const metrics = [
    {
      label: "Total Users",
      val: stats.users,
      trend: "+12%",
      icon: <Users size={20} />,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Active Listings",
      val: stats.listings,
      trend: "+8%",
      icon: <Package size={20} />,
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      label: "Verified Shops",
      val: stats.verifiedShops,
      trend: "+15%",
      icon: <ShieldCheck size={20} />,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      label: "Devices Cataloged",
      val: stats.listings,
      trend: "+22%",
      icon: <Database size={20} />,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
  ];

  const recoveryStats = [
    {
      label: "CO₂ Emissions Saved",
      val: "6,671 kg",
      sub: "Equivalent to 312 trees planted",
      icon: <Leaf />,
      color: "bg-[#10B981]",
    },
    {
      label: "Energy Saved",
      val: "12,250 kWh",
      sub: "Powers 428 homes for a month",
      icon: <Zap />,
      color: "bg-[#3B82F6]",
    },
    {
      label: "Water Saved",
      val: "594.0k L",
      sub: "Equivalent to 11,880 showers",
      icon: <Droplets />,
      color: "bg-[#06B6D4]",
    },
    {
      label: "Total Weight Recovered",
      val: "156 kg",
      sub: "E-waste diverted from landfills",
      icon: <Box />,
      color: "bg-[#8B5CF6]",
    },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: userCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        const { count: listCount } = await supabase
          .from("listings")
          .select("*", { count: "exact", head: true });

        const { count: transactionCount } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true });

        // VERIFIED SHOPS
        const { count: verifiedCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "repairshop")
          .eq("verified", true);

        // PENDING VERIFICATION REQUESTS
        const { data: pendingData } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "repairshop")
          .eq("verified", false)
          .limit(3);

        setPendingRequests(pendingData || []);

        setStats({
          users: userCount || 0,
          listings: listCount || 0,
          transactions: transactionCount || 0,
          verifiedShops: verifiedCount || 0,
        });

        // TRANSACTION CHART
        setChartData([
          { month: "Jan", value: 42 },
          { month: "Feb", value: 51 },
          { month: "Mar", value: 60 },
          { month: "Apr", value: 74 },
          { month: "May", value: 68 },
          { month: "Jun", value: 90 },
        ]);

        // RECOVERY TREND
        setRecoveryData([
          { day: "Apr 26", recovered: 8 },
          { day: "Apr 27", recovered: 12 },
          { day: "Apr 28", recovered: 10 },
          { day: "Apr 29", recovered: 18 },
          { day: "Apr 30", recovered: 9 },
          { day: "May 1", recovered: 14 },
          { day: "May 2", recovered: 16 },
        ]);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      {/* HEADER */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Platform Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Monitor system performance and user activity
          </p>
        </div>
      </header>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {metrics.map((item, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-[1.8rem] border border-slate-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.bg} ${item.color}`}
              >
                {item.icon}
              </div>

              <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                <ArrowUpRight size={12} />
                {item.trend}
              </div>
            </div>

            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              {item.label}
            </p>

            <h2 className="text-3xl font-bold text-slate-800 mt-2">
              {item.val.toLocaleString()}
            </h2>
          </div>
        ))}
      </div>

      {/* VERIFICATION REQUESTS */}
      <div className="bg-orange-50 border border-orange-100 rounded-[1.5rem] p-5 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-orange-900">
              {pendingRequests.length} Pending Verification Requests
            </h3>

            <p className="text-xs text-orange-700">
              Repair shops are waiting for admin verification
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {pendingRequests.map((shop, i) => (
            <div
              key={i}
              className="bg-white border border-orange-100 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <Building2 size={18} />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {shop.shop_name || "Repair Shop"}
                  </h4>

                  <p className="text-xs text-slate-500">
                    {shop.email || "No email provided"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-[#2D7A7F] text-white text-xs font-semibold hover:opacity-90">
                  Review
                </button>

                <button className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECOVERY ANALYTICS */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Recovery Analytics Dashboard
            </h2>

            <p className="text-sm text-slate-500 italic">
              Monitor e-waste recovery performance and environmental impact
            </p>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Filter size={14} />
              Filters
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-[#2D7A7F] text-white rounded-xl text-xs font-bold hover:opacity-90">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* IMPACT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {recoveryStats.map((item, i) => (
            <div
              key={i}
              className={`${item.color} p-6 rounded-[1.8rem] text-white relative overflow-hidden shadow-lg`}
            >
              <div className="absolute right-[-10px] top-[-10px] opacity-10">
                {React.cloneElement(item.icon, { size: 90 })}
              </div>

              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-5">
                {React.cloneElement(item.icon, { size: 20 })}
              </div>

              <p className="text-[10px] uppercase tracking-widest opacity-80">
                {item.label}
              </p>

              <h3 className="text-3xl font-bold mt-2">{item.val}</h3>

              <p className="text-[11px] opacity-70 mt-3 italic">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <h4 className="font-bold text-slate-800">Devices Recovered</h4>

                <p className="text-xs text-slate-500">Successfully processed</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-800">70</h2>

            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Refurbished</span>
                <span className="font-semibold text-slate-700">36</span>
              </div>

              <div className="flex justify-between">
                <span>Recycled</span>
                <span className="font-semibold text-slate-700">20</span>
              </div>

              <div className="flex justify-between">
                <span>Disposed</span>
                <span className="font-semibold text-slate-700">14</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Database size={18} />
              </div>

              <div>
                <h4 className="font-bold text-slate-800">Total Transactions</h4>

                <p className="text-xs text-slate-500">Donations & sales</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-800">
              {stats.transactions}
            </h2>
          </div>

          <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Users size={18} />
              </div>

              <div>
                <h4 className="font-bold text-slate-800">
                  Community Participation
                </h4>

                <p className="text-xs text-slate-500">Verified repair shops</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-800">
              {stats.verifiedShops}
            </h2>
          </div>
        </div>
        {/* BOTTOM ANALYTICS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* RECOVERY BY DEVICE CATEGORY */}
          <div className="bg-white rounded-[1.8rem] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Recovery by Device Category
                </h3>

                <p className="text-xs text-slate-500">
                  Categorized recovered electronic devices
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <Database size={18} />
              </div>
            </div>

            <div className="space-y-6">
              {[
                {
                  name: "Monitor",
                  recovered: 16,
                  percentage: 32,
                },
                {
                  name: "Smartphone",
                  recovered: 14,
                  percentage: 28,
                },
                {
                  name: "Laptop",
                  recovered: 11,
                  percentage: 22,
                },
                {
                  name: "Tablet",
                  recovered: 9,
                  percentage: 18,
                },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700">
                        {item.name}
                      </h4>

                      <p className="text-[11px] text-slate-400">
                        {item.percentage}% recovered
                      </p>
                    </div>

                    <span className="text-sm font-bold text-slate-700">
                      {item.recovered} devices
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RECOVERY TREND */}
          <div className="bg-white rounded-[1.8rem] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Recovery Trend (Last 7 Days)
                </h3>

                <p className="text-xs text-slate-500">
                  E-waste recovery activity
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                <Recycle size={18} />
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={recoveryData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#E2E8F0"
                />

                <XAxis type="number" hide />

                <YAxis
                  type="category"
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip />

                <Bar
                  dataKey="recovered"
                  radius={[0, 12, 12, 0]}
                  fill="#10B981"
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
