import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, Package, ShieldCheck, Database, Leaf, Zap, Droplets, Box,
  Filter, Download, CheckCircle2, Recycle,
} from "lucide-react";
import { scopeQuery, scopeTransactionsQuery } from "./barangayScope";

const COMPLETED_STATUSES = ["completed", "complete"];
const EMPTY_IMPACT = [
  { label: "CO₂ Emissions Saved", val: "0 kg", sub: "Estimated reduction", icon: <Leaf />, color: "bg-[#10B981]" },
  { label: "Energy Saved", val: "0 kWh", sub: "Estimated energy conservation", icon: <Zap />, color: "bg-[#3B82F6]" },
  { label: "Water Saved", val: "0 L", sub: "Estimated water conservation", icon: <Droplets />, color: "bg-[#06B6D4]" },
  { label: "Total Weight Recovered", val: "0.0 kg", sub: "Estimated recovered e-waste", icon: <Box />, color: "bg-[#8B5CF6]" },
];

const getRangeStart = (range) => {
  const now = new Date();
  if (range === "7days") now.setDate(now.getDate() - 6);
  else if (range === "30days") now.setDate(now.getDate() - 29);
  else if (range === "year") return new Date(now.getFullYear(), 0, 1);
  else return null;
  now.setHours(0, 0, 0, 0);
  return now;
};

const getRecoveryDate = (tx) => tx.completed_at || tx.updated_at || tx.created_at;

const AdminDashboard = ({ adminBarangay }) => {
  const [stats, setStats] = useState({ users: 0, listings: 0, transactions: 0, verifiedShops: 0 });
  const [recoveryData, setRecoveryData] = useState([]);
  const [deviceStats, setDeviceStats] = useState([]);
  const [recoveryStats, setRecoveryStats] = useState(EMPTY_IMPACT);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedDate, setSelectedDate] = useState("7days");
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const exportAnalytics = async () => {
    try {
      let query = supabase.from("transactions").select("id,created_at,completed_at,amount,barangay,status,listing_id");
      query = await scopeTransactionsQuery(query, adminBarangay);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []).map((tx) => ({
        Transaction_ID: tx.id,
        Date: getRecoveryDate(tx) ? new Date(getRecoveryDate(tx)).toLocaleString() : "",
        Status: tx.status || "",
        Barangay: tx.barangay || "",
        Amount: tx.amount ?? "",
      }));
      if (!rows.length) {
        window.alert("There are no transactions to export.");
        return;
      }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(","), ...rows.map((row) =>
        headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
      )].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Recovery_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Analytics export failed:", err);
      window.alert(err?.message || "Failed to export analytics.");
    }
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      let profilesQuery = supabase.from("profiles").select("*", { count: "exact", head: true });
      profilesQuery = scopeQuery(profilesQuery, adminBarangay);
      const { count: userCount, error: usersError } = await profilesQuery;
      if (usersError) throw usersError;

      let sellerIds = null;
      if (adminBarangay) {
        const { data: sellers, error: sellerError } = await supabase
          .from("profiles").select("id").ilike("barangay", adminBarangay);
        if (sellerError) throw sellerError;
        sellerIds = (sellers || []).map((x) => x.id);
      }

      let listingsQuery = supabase.from("listings").select("*", { count: "exact", head: true });
      if (sellerIds !== null) {
        listingsQuery = sellerIds.length
          ? listingsQuery.in("seller_id", sellerIds)
          : listingsQuery.eq("seller_id", "00000000-0000-0000-0000-000000000000");
      }
      const { count: listingsCount, error: listingsError } = await listingsQuery;
      if (listingsError) throw listingsError;

      let txCountQuery = supabase.from("transactions").select("id", { count: "exact", head: true });
      txCountQuery = await scopeTransactionsQuery(txCountQuery, adminBarangay);
      const { count: transactionCount, error: txCountError } = await txCountQuery;
      if (txCountError) throw txCountError;

      let shopsQuery = supabase.from("profiles").select("*", { count: "exact", head: true })
        .eq("role", "repair_shop").eq("is_verified", true);
      shopsQuery = scopeQuery(shopsQuery, adminBarangay);
      const { count: shopCount, error: shopsError } = await shopsQuery;
      if (shopsError) throw shopsError;

      let pendingQuery = supabase.from("profiles").select("*")
        .eq("role", "repair_shop").eq("is_verified", false).limit(3);
      pendingQuery = scopeQuery(pendingQuery, adminBarangay);
      const { data: pending, error: pendingError } = await pendingQuery;
      if (pendingError) throw pendingError;

      setStats({
        users: userCount || 0,
        listings: listingsCount || 0,
        transactions: transactionCount || 0,
        verifiedShops: shopCount || 0,
      });
      setPendingRequests(pending || []);

      // Load completed transactions. Both values are supported because existing
      // records may use either "complete" or "completed".
      let completedQuery = supabase.from("transactions")
        .select("id,created_at,updated_at,completed_at,status,barangay,drop_off_point_id,listing_id,amount,listings!transactions_listing_id_fkey(category,device_model)")
        .in("status", COMPLETED_STATUSES);
      completedQuery = await scopeTransactionsQuery(completedQuery, adminBarangay);
      const { data: completedRows, error: completedError } = await completedQuery;
      if (completedError) throw completedError;
      const completed = completedRows || [];

      const locs = [...new Set(completed.map((tx) => tx.barangay?.trim()).filter(Boolean))].sort();
      setLocations(locs);

      const start = getRangeStart(selectedDate);
      let filtered = completed.filter((tx) => {
        const dateValue = getRecoveryDate(tx);
        if (!dateValue) return false;
        if (start && new Date(dateValue) < start) return false;
        if (selectedLocation !== "all" && (tx.barangay || "").trim().toLowerCase() !== selectedLocation.trim().toLowerCase()) return false;
        if (selectedCategory !== "all" && tx.listings?.category !== selectedCategory) return false;
        return true;
      });

      const categoryCounts = {};
      filtered.forEach((tx) => {
        const name = tx.listings?.category || "Uncategorized";
        categoryCounts[name] = (categoryCounts[name] || 0) + 1;
      });
      const total = filtered.length;
      setDeviceStats(Object.entries(categoryCounts)
        .map(([name, recovered]) => ({ name, recovered, percentage: total ? Math.round(recovered / total * 100) : 0 }))
        .sort((a, b) => b.recovered - a.recovered));

      // Build a continuous daily series so the chart remains visible even when
      // there are no recoveries on particular days.
      const days = selectedDate === "7days" ? 7 : selectedDate === "30days" ? 30 : selectedDate === "year" ? 12 : 30;
      const grouped = {};
      if (selectedDate === "year") {
        const year = new Date().getFullYear();
        for (let m = 0; m < 12; m++) {
          grouped[`${year}-${String(m + 1).padStart(2, "0")}`] = 0;
        }
        filtered.forEach((tx) => {
          const d = new Date(getRecoveryDate(tx));
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (key in grouped) grouped[key] += 1;
        });
        setRecoveryData(Object.entries(grouped).map(([key, recovered]) => ({
          day: new Date(`${key}-01T12:00:00`).toLocaleDateString("en-US", { month: "short" }),
          recovered,
        })));
      } else {
        const base = start || getRangeStart("30days");
        for (let i = 0; i < days; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          grouped[d.toISOString().slice(0, 10)] = 0;
        }
        filtered.forEach((tx) => {
          const key = new Date(getRecoveryDate(tx)).toISOString().slice(0, 10);
          if (key in grouped) grouped[key] += 1;
        });
        setRecoveryData(Object.entries(grouped).map(([key, recovered]) => ({
          day: new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          recovered,
        })));
      }

      // Estimates are illustrative per-device averages, not measured values.
      setRecoveryStats([
        { label: "CO₂ Emissions Saved", val: `${(total * 4.2).toLocaleString()} kg`, sub: "Estimated reduction", icon: <Leaf />, color: "bg-[#10B981]" },
        { label: "Energy Saved", val: `${(total * 78).toLocaleString()} kWh`, sub: "Estimated energy conservation", icon: <Zap />, color: "bg-[#3B82F6]" },
        { label: "Water Saved", val: `${(total * 3800).toLocaleString()} L`, sub: "Estimated water conservation", icon: <Droplets />, color: "bg-[#06B6D4]" },
        { label: "Total Weight Recovered", val: `${(total * 2.3).toFixed(1)} kg`, sub: "Estimated recovered e-waste", icon: <Box />, color: "bg-[#8B5CF6]" },
      ]);
    } catch (err) {
      console.error("Admin dashboard load failed:", err);
      setErrorMessage(err?.message || "Unable to load dashboard data. Check your connection and Supabase permissions.");
    } finally {
      setLoading(false);
    }
  }, [adminBarangay, selectedCategory, selectedLocation, selectedDate]);

  useEffect(() => {
    fetchStats();
    const channel = supabase.channel(`dashboard-transactions-${adminBarangay || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats, adminBarangay]);

  const metrics = useMemo(() => [
    { label: "Total Users", val: stats.users, icon: <Users size={20} />, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Listings", val: stats.listings, icon: <Package size={20} />, color: "text-green-500", bg: "bg-green-50" },
    { label: "Verified Shops", val: stats.verifiedShops, icon: <ShieldCheck size={20} />, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Devices Cataloged", val: stats.listings, icon: <Database size={20} />, color: "text-orange-500", bg: "bg-orange-50" },
  ], [stats]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-600 font-semibold">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-5 md:p-8">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Recovery Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor e-waste recovery and platform activity.</p>
          <p className="mt-2 text-xs font-medium text-blue-600">
            {adminBarangay ? `Scoped to Barangay ${adminBarangay}.` : "City-wide view (no barangay assigned)."}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStats} className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh</button>
          <button onClick={exportAnalytics} className="flex items-center gap-2 rounded-2xl bg-[#2D7A7F] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"><Download size={16} />Export Analytics</button>
        </div>
      </header>

      {errorMessage && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => <div key={item.label} className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}>{item.icon}</div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-800">{item.val.toLocaleString()}</h2>
        </div>)}
      </div>

      <div className="mb-8 rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800"><Filter size={18} />Recovery Analytics Filters</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="7days">Last 7 Days</option><option value="30days">Last 30 Days</option><option value="year">This Year</option><option value="all">All Time</option>
          </select>
          <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="all">All Locations</option>{locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="all">All Categories</option>{["Smartphone", "Laptop", "Tablet", "Monitor", "Desktop", "Others", "Parts"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-xl font-bold text-slate-800">Environmental Impact Metrics</h2>
        <p className="mb-6 text-sm text-slate-500">Estimated impact based on completed transactions in the selected filters.</p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {recoveryStats.map((item) => <div key={item.label} className={`${item.color} relative overflow-hidden rounded-[1.8rem] p-6 text-white shadow-lg`}>
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">{React.cloneElement(item.icon, { size: 20 })}</div>
            <p className="text-xs uppercase tracking-widest opacity-80">{item.label}</p><h3 className="mt-2 text-3xl font-bold">{item.val}</h3>
            <p className="mt-3 text-xs opacity-80">{item.sub}</p>
          </div>)}
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><CheckCircle2 className="text-green-600" /><div><h4 className="font-bold text-slate-800">Devices Recovered</h4><p className="text-xs text-slate-500">Completed transactions matching filters</p></div></div>
          <h2 className="mb-4 text-4xl font-bold text-slate-800">{deviceStats.reduce((sum, item) => sum + item.recovered, 0).toLocaleString()}</h2>
          <div className="space-y-2 text-sm">{deviceStats.slice(0, 4).map((item) => <div key={item.name} className="flex justify-between"><span className="text-slate-500">{item.name}</span><b className="text-slate-700">{item.recovered}</b></div>)}
            {!deviceStats.length && <p className="text-sm text-slate-400">No completed devices match the selected filters.</p>}
          </div>
        </div>
        <div className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><Database className="text-blue-600" /><h4 className="font-bold text-slate-800">Total Transactions</h4></div><h2 className="text-4xl font-bold text-slate-800">{stats.transactions.toLocaleString()}</h2><p className="mt-2 text-xs text-slate-500">All transaction statuses in your scope.</p></div>
        <div className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><Users className="text-purple-600" /><h4 className="font-bold text-slate-800">Verified Repair Shops</h4></div><h2 className="text-4xl font-bold text-slate-800">{stats.verifiedShops.toLocaleString()}</h2></div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-lg font-bold text-slate-800">Recovery by Device Category</h3><p className="mb-6 text-xs text-slate-500">Completed devices grouped by category.</p>
          {deviceStats.length ? <div className="space-y-6">{deviceStats.map((item) => <div key={item.name}>
            <div className="mb-2 flex items-center justify-between"><div><h4 className="text-sm font-semibold text-slate-700">{item.name}</h4><p className="text-xs text-slate-400">{item.percentage}% of recovered devices</p></div><span className="text-sm font-bold text-slate-700">{item.recovered} devices</span></div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#10B981]" style={{ width: `${item.percentage}%` }} /></div>
          </div>)}</div> : <div className="py-12 text-center text-sm text-slate-400">No recovery data for the selected filters.</div>}
        </div>
        <div className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><Recycle className="text-green-600" /><div><h3 className="text-lg font-bold text-slate-800">Recovery Trend</h3><p className="text-xs text-slate-500">Completed transactions by completion date.</p></div></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recoveryData} margin={{ top: 5, right: 12, left: -12, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="recovered" name="Devices recovered" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
