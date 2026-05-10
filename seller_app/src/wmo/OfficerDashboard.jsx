import React from "react";
import {
  Users,
  Activity,
  RefreshCcw,
  MapPin,
  Download,
  Package,
  CheckCircle,
  Store,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  BarChart3,
} from "lucide-react";

const OfficerDashboard = () => {
  const topStats = [
    {
      icon: Users,
      label: "Total Platform Users",
      value: "1,248",
      trend: "+12%",
      color: "text-emerald-500",
    },
    {
      icon: Activity,
      label: "Active Transactions",
      value: "87",
      trend: "+3%",
      color: "text-emerald-500",
    },
    {
      icon: RefreshCcw,
      label: "System Uptime",
      value: "99.8%",
      trend: "+0.2%",
      color: "text-emerald-500",
    },
    {
      icon: MapPin,
      label: "Active Barangays",
      value: "18/33",
      trend: "55%",
      color: "text-blue-500",
    },
  ];

  const summaryCards = [
    {
      icon: Package,
      title: "Total Listings",
      value: "342",
      sub: "+12% vs last month",
      bg: "from-sky-500 to-blue-600",
    },
    {
      icon: CheckCircle,
      title: "Completed Deals",
      value: "261",
      sub: "93.5% success rate",
      bg: "from-emerald-500 to-green-600",
    },
    {
      icon: Users,
      title: "Active Users",
      value: "1,248",
      sub: "Sellers & Buyers",
      bg: "from-fuchsia-500 to-violet-600",
    },
    {
      icon: Store,
      title: "Verified Shops",
      value: "87",
      sub: "Ready for retrieval",
      bg: "from-orange-500 to-red-500",
    },
  ];

  const metrics = [
    {
      label: "Total Transactions",
      value: "261",
      trend: "+15%",
      color: "text-emerald-500",
    },
    {
      label: "Pending Transactions",
      value: "87",
      trend: "+5%",
      color: "text-blue-500",
    },
    {
      label: "Failed/Cancelled",
      value: "18",
      trend: "-12%",
      color: "text-red-500",
    },
    {
      label: "Success Rate",
      value: "93.5%",
      trend: "+2.1%",
      color: "text-emerald-500",
    },
  ];

  const listings = [
    {
      label: "Active Listings",
      value: 124,
      total: 342,
      color: "bg-emerald-500",
    },
    {
      label: "Under Negotiation",
      value: 87,
      total: 342,
      color: "bg-sky-500",
    },
    {
      label: "Completed",
      value: 221,
      total: 342,
      color: "bg-violet-500",
    },
    {
      label: "Cancelled",
      value: 14,
      total: 342,
      color: "bg-red-400",
    },
  ];

  const sidebarItems = [
    {
      icon: LayoutDashboard,
      label: "System Overview",
      active: true,
    },
    {
      icon: Package,
      label: "E-Waste Hotspots",
    },
    {
      icon: Users,
      label: "User Activity",
    },
    {
      icon: BarChart3,
      label: "System Health",
    },
    {
      icon: ShieldCheck,
      label: "Barangay Monitor",
    },
    {
      icon: FileText,
      label: "Compliance Reports",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex font-sans">        

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* HEADER */}
        <div className="mb-7">
          <h1 className="text-3xl font-bold text-slate-800">
            System Overview
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Centralized monitoring dashboard for Valenzuela City E-waste
            Platform
          </p>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {topStats.map((stat, idx) => {
            const Icon = stat.icon;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    <Icon size={20} />
                  </div>

                  <span
                    className={`text-xs font-bold ${stat.color}`}
                  >
                    {stat.trend}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-500">
                  {stat.label}
                </p>

                <h2 className="text-2xl font-bold text-slate-800 mt-1">
                  {stat.value}
                </h2>
              </div>
            );
          })}
        </div>

        {/* REPORT BAR */}
        <div className="bg-[#eef7ff] border border-[#dbeafe] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              System Monitoring Report
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Generate comprehensive platform performance and compliance
              report
            </p>
          </div>

          <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md">
            <Download size={16} />
            Generate Report
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {summaryCards.map((card, idx) => {
            const Icon = card.icon;

            return (
              <div
                key={idx}
                className={`bg-gradient-to-br ${card.bg} rounded-2xl p-6 text-white relative overflow-hidden shadow-lg`}
              >
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-5">
                    <Icon size={22} />
                  </div>

                  <p className="text-xs uppercase tracking-widest opacity-80">
                    {card.title}
                  </p>

                  <h2 className="text-4xl font-bold mt-1">
                    {card.value}
                  </h2>

                  <p className="text-xs mt-2 opacity-80">
                    {card.sub}
                  </p>
                </div>

                <Icon
                  size={90}
                  className="absolute -bottom-5 -right-5 opacity-10"
                />
              </div>
            );
          })}
        </div>

        {/* TRANSACTION METRICS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-5">
            Transaction Status Metrics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {metrics.map((item, idx) => (
              <div
                key={idx}
                className="border border-slate-100 rounded-xl p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">
                      {item.label}
                    </p>

                    <h2 className="text-2xl font-bold text-slate-800 mt-2">
                      {item.value}
                    </h2>
                  </div>

                  <span
                    className={`text-xs font-bold ${item.color}`}
                  >
                    {item.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHART PLACEHOLDER */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-6">
            Platform Activity Trend
          </h3>

          <div className="h-[280px] flex items-end gap-6">
            {[40, 55, 70, 85, 78].map((height, idx) => (
              <div key={idx} className="flex-1 flex items-end gap-2">
                <div
                  className="w-full bg-emerald-500 rounded-t-md"
                  style={{ height: `${height}%` }}
                />

                <div
                  className="w-full bg-sky-500 rounded-t-md"
                  style={{ height: `${height - 10}%` }}
                />

                <div
                  className="w-full bg-violet-500 rounded-t-md"
                  style={{ height: `${height - 20}%` }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 mt-5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Listings Created
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-500" />
              Transactions
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              New Users
            </div>
          </div>
        </div>

        {/* LISTING STATUS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-6">
            Listing Status Distribution
          </h3>

          <div className="space-y-5">
            {listings.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs font-medium mb-2 text-slate-600">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`${item.color} h-full rounded-full`}
                    style={{
                      width: `${(item.value / item.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <Activity size={18} className="text-blue-500" />

            <p className="text-sm text-blue-700 font-medium">
              Total platform activity:
              <span className="font-bold ml-1">
                430 listings
              </span>{" "}
              processed since launch.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OfficerDashboard;