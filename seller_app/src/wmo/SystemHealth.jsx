import React from "react";
import {
  Activity,
  Wifi,
  Database,
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Users,
  MapPinned,
  Server,
  Cpu,
} from "lucide-react";

const stats = [
  {
    title: "Total Users",
    value: "1,248",
    icon: Users,
    status: "+12",
    color: "text-emerald-500",
  },
  {
    title: "Active Sessions",
    value: "87",
    icon: Activity,
    status: "Live",
    color: "text-sky-500",
  },
  {
    title: "System Uptime",
    value: "99.8%",
    icon: ShieldCheck,
    status: "Healthy",
    color: "text-violet-500",
  },
  {
    title: "Transactions",
    value: "10,877",
    icon: Database,
    status: "+8%",
    color: "text-orange-500",
  },
];

const performance = [
  {
    label: "API Response Time",
    value: "245 ms",
    width: "72%",
    color: "bg-sky-500",
  },
  {
    label: "Page Load Speed",
    value: "1.2 s",
    width: "63%",
    color: "bg-emerald-500",
  },
  {
    label: "Database Query",
    value: "85 ms",
    width: "58%",
    color: "bg-emerald-500",
  },
  {
    label: "Error Rate",
    value: "0.2%",
    width: "24%",
    color: "bg-slate-400",
  },
];

const activityLogs = [
  {
    title: "Brief connection timeout",
    subtitle: "Automatically recovered",
    status: "Resolved",
    icon: Wifi,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    title: "Slow query performance",
    subtitle: "Database optimized successfully",
    status: "Fixed",
    icon: Database,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
];

const barangays = [
  {
    name: "Barangay Karuhatan",
    users: "156 active users",
  },
  {
    name: "Barangay Marulas",
    users: "124 active users",
  },
  {
    name: "Barangay Veinte Reales",
    users: "88 active users",
  },
  {
    name: "Barangay Maysan",
    users: "67 active users",
  },
];

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}
  >
    {children}
  </div>
);

const SystemHealth = () => {
  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="space-y-5">
        {/* HEADER */}
        <div>
          <h1 className="text-[22px] font-semibold text-slate-800">
            System Health
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized monitoring dashboard overview
          </p>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((item, index) => (
            <Card key={index} className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center ${item.color}`}
                  >
                    <item.icon size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 font-medium">
                      {item.title}
                    </p>

                    <h2 className="text-2xl font-semibold text-slate-800 mt-1">
                      {item.value}
                    </h2>
                  </div>
                </div>

                <span
                  className={`text-xs font-semibold ${item.color} bg-slate-50 px-2 py-1 rounded-lg`}
                >
                  {item.status}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* REPORT */}
        <Card className="p-4 bg-[#EEF6FF] border-[#D8E9FF]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                System Monitoring Report
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Generate a comprehensive performance and monitoring report.
              </p>
            </div>

            <button className="bg-sky-600 hover:bg-sky-700 transition-all text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
              <Download size={14} />
              Generate Report
            </button>
          </div>
        </Card>

        {/* STATUS OVERVIEW */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {[
            {
              title: "Platform Uptime",
              value: "99.8%",
              icon: Server,
              color: "text-emerald-500",
              bg: "bg-emerald-50",
            },
            {
              title: "Response Time",
              value: "245ms",
              icon: Wifi,
              color: "text-sky-500",
              bg: "bg-sky-50",
            },
            {
              title: "Database Health",
              value: "Optimal",
              icon: Database,
              color: "text-emerald-500",
              bg: "bg-emerald-50",
            },
            {
              title: "Security Status",
              value: "Secure",
              icon: ShieldCheck,
              color: "text-emerald-500",
              bg: "bg-emerald-50",
            },
          ].map((item, index) => (
            <Card key={index} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}
                  >
                    <item.icon size={20} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 font-medium">
                      {item.title}
                    </p>

                    <h3 className="text-lg font-semibold text-slate-800 mt-1">
                      {item.value}
                    </h3>
                  </div>
                </div>

                <CheckCircle2
                  size={18}
                  className="text-emerald-500"
                />
              </div>
            </Card>
          ))}
        </div>

        {/* PERFORMANCE */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Cpu size={17} className="text-sky-500" />

            <h2 className="text-sm font-semibold text-slate-800">
              Performance Metrics
            </h2>
          </div>

          <div className="space-y-5">
            {performance.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600 font-medium">
                    {item.label}
                  </p>

                  <span className="text-sm font-semibold text-slate-800">
                    {item.value}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ISSUES + CONNECTIVITY */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* ISSUES */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle size={16} className="text-amber-500" />

              <h2 className="text-sm font-semibold text-slate-800">
                Recent System Issues
              </h2>
            </div>

            <div className="space-y-4">
              {activityLogs.map((item, index) => (
                <div
                  key={index}
                  className="border border-slate-100 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}
                    >
                      <item.icon size={16} />
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-800">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-400 mt-1">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* CONNECTIVITY */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <MapPinned size={16} className="text-sky-500" />

              <h2 className="text-sm font-semibold text-slate-800">
                Barangay Platform Connectivity
              </h2>
            </div>

            <div>
              {barangays.map((item, index) => (
                <div
                  key={index}
                  className="px-5 py-4 border-b border-slate-100 last:border-none flex items-center justify-between hover:bg-slate-50 transition-all"
                >
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">
                      {item.name}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      {item.users}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

                    <span className="text-xs text-emerald-600 font-medium">
                      Online
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* FOOTER */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">
                Overall Health Score
              </p>

              <h2 className="text-3xl font-semibold text-emerald-700 mt-2">
                98.5%
              </h2>
            </div>

            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">
                Uptime This Month
              </p>

              <h2 className="text-3xl font-semibold text-emerald-700 mt-2">
                99.8%
              </h2>
            </div>

            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">
                Active Monitoring
              </p>

              <h2 className="text-3xl font-semibold text-emerald-700 mt-2">
                24/7
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;