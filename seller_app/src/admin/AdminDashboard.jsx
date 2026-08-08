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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedDate, setSelectedDate] = useState("7days");

  const [deviceStats, setDeviceStats] = useState([]);
  const [recoveryStats, setRecoveryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);

  const metrics = [
    {
      label: "Total Users",
      val: stats.users,
      icon: <Users size={20} />,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Active Listings",
      val: stats.listings,
      icon: <Package size={20} />,
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      label: "Verified Shops",
      val: stats.verifiedShops,
      icon: <ShieldCheck size={20} />,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      label: "Devices Cataloged",
      val: stats.listings,
      icon: <Database size={20} />,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
  ];
  const exportAnalytics = async () => {
    try {
      const { data, error } = await supabase.from("transactions").select(`
        id,
        created_at,
        amount,
        barangay,
        status,
        listings!transactions_listing_id_fkey (
          device_model,
          category,
          condition,
          asking_price
        )
      `);

      if (error) throw error;

      const rows = data.map((item) => ({
        Transaction_ID: item.id,
        Date: new Date(item.created_at).toLocaleString(),
        Status: item.status,
        Barangay: item.barangay,
        Category: item.listings?.category || "N/A",
        Device: item.listings?.device_model || "N/A",
        Condition: item.listings?.condition || "N/A",
        Asking_Price: item.listings?.asking_price || "N/A",
        Amount: item.amount,
      }));

      const headers = Object.keys(rows[0]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map(
              (header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`,
            )
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Recovery_Analytics_${
        new Date().toISOString().split("T")[0]
      }.csv`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export analytics.");
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // COUNTS
        const { count: userCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        const { count: listCount } = await supabase
          .from("listings")
          .select("*", { count: "exact", head: true });

        const { data, error } = await supabase.from("transactions").select("*");

        const { count: verifiedCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "repair_shop")
          .eq("is_verified", true);

        // PENDING REQUESTS
        const { data: pendingData } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "repair_shop")
          .eq("is_verified", false)
          .limit(3);

        setPendingRequests(pendingData || []);

        setStats({
          users: userCount || 0,
          listings: listCount || 0,
          transactions: data?.length || 0,
          verifiedShops: verifiedCount || 0,
        });

        // LOAD LOCATIONS (Completed Transactions Only)
        const { data: locationData, error: locationError } = await supabase
          .from("transactions")
          .select("barangay")
          .eq("status", "completed");

        if (locationError) throw locationError;

        const uniqueLocations = [
          ...new Set(
            (locationData || [])
              .map((item) => item.barangay?.trim())
              .filter(
                (barangay) =>
                  barangay !== null &&
                  barangay !== undefined &&
                  barangay !== "",
              ),
          ),
        ].sort((a, b) => a.localeCompare(b));

        setLocations(uniqueLocations);

        // TRANSACTION CHART
        const { data: transactionItems } = await supabase
          .from("transactions")
          .select("created_at");

        const monthlyTransactions = {};

        (transactionItems || []).forEach((item) => {
          const month = new Date(item.created_at).toLocaleString("en-US", {
            month: "short",
          });

          monthlyTransactions[month] = (monthlyTransactions[month] || 0) + 1;
        });

        const monthOrder = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        setChartData(
          Object.entries(monthlyTransactions)
            .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
            .map(([month, value]) => ({
              month,
              value,
            })),
        );

        // RECOVERY QUERY
        let recoveryQuery = supabase
          .from("transactions")
          .select(
            `
  *,
  listings!transactions_listing_id_fkey (
    category
  )
`,
          )
          .eq("status", "completed");

        // DATE FILTER
        if (selectedDate === "7days") {
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);

          recoveryQuery = recoveryQuery.gte(
            "created_at",
            lastWeek.toISOString(),
          );
        }

        if (selectedDate === "30days") {
          const lastMonth = new Date();
          lastMonth.setDate(lastMonth.getDate() - 30);

          recoveryQuery = recoveryQuery.gte(
            "created_at",
            lastMonth.toISOString(),
          );
        }

        if (selectedDate === "year") {
          const startYear = new Date(new Date().getFullYear(), 0, 1);

          recoveryQuery = recoveryQuery.gte(
            "created_at",
            startYear.toISOString(),
          );
        }

        // LOCATION FILTER
        if (selectedLocation && selectedLocation !== "all") {
          recoveryQuery = recoveryQuery.eq("barangay", selectedLocation.trim());
        }

        // Execute the quer
        // Execute the filtered query
        const { data: recoveryItems, error: recoveryError } =
          await recoveryQuery;

        if (recoveryError) throw recoveryError;

        // Start with all completed transactions
        let filteredItems = recoveryItems || [];

        if (selectedCategory !== "all") {
          filteredItems = filteredItems.filter(
            (item) => item.listings?.category === selectedCategory,
          );
        }

        const totalRecovered = filteredItems.length;

        // RECOVERY TREND GRAPH
        const grouped = {};

        filteredItems.forEach((item) => {
          const date = new Date(item.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          grouped[date] = (grouped[date] || 0) + 1;
        });

        const formattedTrend = Object.entries(grouped)
          .sort(([a], [b]) => new Date(a) - new Date(b))
          .map(([day, recovered]) => ({
            day,
            recovered,
          }));

        setRecoveryData(formattedTrend);

        // DEVICE CATEGORY STATS
        const categories = {};

        filteredItems.forEach((item) => {
          const category = item.listings?.category || "Unknown";

          categories[category] = (categories[category] || 0) + 1;
        });

        const formattedCategories = Object.entries(categories).map(
          ([name, recovered]) => ({
            name,
            recovered,
            percentage:
              totalRecovered > 0
                ? Math.round((recovered / totalRecovered) * 100)
                : 0,
          }),
        );

        setDeviceStats(formattedCategories);

        // ENVIRONMENTAL IMPACT CALCULATIONS
        const co2Saved = totalRecovered * 4.2;
        const energySaved = totalRecovered * 78;
        const waterSaved = totalRecovered * 3800;
        const totalWeight = totalRecovered * 2.3;

        setRecoveryStats([
          {
            label: "CO₂ Emissions Saved",
            val: `${co2Saved.toLocaleString()} kg`,
            sub: "Reduced environmental pollution",
            icon: <Leaf />,
            color: "bg-[#10B981]",
          },
          {
            label: "Energy Saved",
            val: `${energySaved.toLocaleString()} kWh`,
            sub: "Estimated energy conservation",
            icon: <Zap />,
            color: "bg-[#3B82F6]",
          },
          {
            label: "Water Saved",
            val: `${waterSaved.toLocaleString()} L`,
            sub: "Water preserved through recycling",
            icon: <Droplets />,
            color: "bg-[#06B6D4]",
          },
          {
            label: "Total Weight Recovered",
            val: `${totalWeight.toFixed(1)} kg`,
            sub: "Recovered electronic waste",
            icon: <Box />,
            color: "bg-[#8B5CF6]",
          },
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory, selectedLocation, selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-slate-600">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      {/* HEADER */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Recovery Analytics Dashboard
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Monitor e-waste recovery performance, environmental impact, and
            platform activity in real-time
          </p>
        </div>

        <button
          onClick={exportAnalytics}
          className="flex items-center gap-2 px-4 py-3 bg-[#2D7A7F] text-white rounded-2xl text-sm font-semibold hover:opacity-90 shadow-sm"
        >
          <Download size={16} />
          Export Analytics
        </button>
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

      {/* FILTERS */}
      <div className="bg-white rounded-[1.8rem] border border-slate-100 shadow-sm p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-500" />

          <h3 className="font-bold text-slate-800">
            Recovery Analytics Filters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* DATE */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="year">This Year</option>
          </select>

          {/* LOCATION */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]"
          >
            <option value="all">All Locations</option>

            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          {/* CATEGORY */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7A7F]"
          >
            <option value="all">All Categories</option>
            <option value="Laptop">Laptop</option>
            <option value="Monitor">Monitor</option>
            <option value="Smartphone">Smartphone</option>
            <option value="Tablet">Tablet</option>
          </select>
        </div>
      </div>

      {/* ENVIRONMENTAL IMPACT */}
      <section className="mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Environmental Impact Metrics
          </h2>

          <p className="text-sm text-slate-500">
            Real-time sustainability and recovery performance indicators
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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

              <p className="text-[11px] opacity-80 mt-3 italic">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-[1.8rem] p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <h4 className="font-bold text-slate-800">Devices Recovered</h4>

              <p className="text-xs text-slate-500">
                Successfully processed devices
              </p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            {deviceStats.reduce((acc, item) => acc + item.recovered, 0)}
          </h2>

          <div className="space-y-2 text-sm">
            {deviceStats.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-slate-500">{item.name}</span>

                <span className="font-semibold text-slate-700">
                  {item.recovered}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[1.8rem] p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Database size={18} />
            </div>

            <div>
              <h4 className="font-bold text-slate-800">Total Transactions</h4>

              <p className="text-xs text-slate-500">
                Donations and completed sales
              </p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-slate-800">
            {stats.transactions}
          </h2>
        </div>

        <div className="bg-white rounded-[1.8rem] p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Users size={18} />
            </div>

            <div>
              <h4 className="font-bold text-slate-800">
                Community Participation
              </h4>

              <p className="text-xs text-slate-500">Verified repair shops</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-slate-800">
            {stats.verifiedShops}
          </h2>
        </div>
      </div>

      {/* ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* DEVICE CATEGORY */}
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
            {deviceStats.map((item, index) => (
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
                Recovery Trend
              </h3>

              <p className="text-xs text-slate-500">
                Real-time e-waste recovery activity
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
              <Recycle size={18} />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
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
    </div>
  );
};

export default AdminDashboard;
