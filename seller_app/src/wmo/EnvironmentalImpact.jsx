import React from "react";
import {
  Leaf,
  Zap,
  Droplets,
  Trees,
  Trash2,
  Car,
  Smartphone,
  Lightbulb,
  Download,
  Info,
  Users,
  Activity,
  RefreshCcw,
  MapPin,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  BarChart3,
  Package,
  LogOut,
} from "lucide-react";

const EnvironmentalImpact = () => {
  // const topStats = [
  //   {
  //     icon: Users,
  //     label: "Total Platform Users",
  //     value: "1,248",
  //     trend: "+12%",
  //     color: "text-emerald-500",
  //   },
  //   {
  //     icon: Activity,
  //     label: "Active Transactions",
  //     value: "87",
  //     trend: "+5%",
  //     color: "text-emerald-500",
  //   },
  //   {
  //     icon: RefreshCcw,
  //     label: "System Uptime",
  //     value: "99.8%",
  //     trend: "+0.2%",
  //     color: "text-emerald-500",
  //   },
  //   {
  //     icon: MapPin,
  //     label: "Active Barangays",
  //     value: "18/33",
  //     trend: "55%",
  //     color: "text-blue-500",
  //   },
  // ];

  const impactCards = [
    {
      icon: Leaf,
      title: "CO₂ Saved",
      value: "25310.1 kg",
      sub: "Prevented greenhouse gas emissions",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-500",
      text: "text-emerald-700",
    },
    {
      icon: Zap,
      title: "Energy Saved",
      value: "55619.4 kWh",
      sub: "Electricity conservation",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-500",
      text: "text-amber-700",
    },
    {
      icon: Droplets,
      title: "Water Saved",
      value: "466713 L",
      sub: "Freshwater conservation",
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-500",
      text: "text-blue-700",
    },
    {
      icon: Trees,
      title: "Trees Equivalent",
      value: "1205.2 trees",
      sub: "Annual CO₂ absorption equivalent",
      bg: "bg-teal-50",
      border: "border-teal-200",
      iconBg: "bg-teal-600",
      text: "text-teal-700",
    },
  ];

  const sidebarItems = [
    {
      icon: LayoutDashboard,
      label: "System Overview",
    },
    {
      icon: Leaf,
      label: "Environmental Impact",
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
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-slate-800">
            Environmental Impact
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Centralized monitoring dashboard for Valenzuela City
            E-waste Platform
          </p>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {/* {topStats.map((stat, idx) => {
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
          })} */}
        </div>

        {/* REPORT BAR */}
        {/* <div className="bg-[#eef7ff] border border-[#dbeafe] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              System Monitoring Report
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Generate comprehensive platform performance and
              compliance report
            </p>
          </div>

          <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md">
            <Download size={16} />
            Generate Report
          </button>
        </div> */}

        {/* MAIN CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          {/* TITLE */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Leaf size={20} fill="currentColor" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Platform-Wide Environmental Impact
                </h2>

                <p className="text-xs text-slate-400">
                  CO₂ savings and resource conservation
                </p>
              </div>
            </div>

            <button className="text-sky-600 text-xs font-medium flex items-center gap-1">
              <Info size={14} />
              How it works
            </button>
          </div>

          {/* IMPACT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            {impactCards.map((card, idx) => {
              const Icon = card.icon;

              return (
                <div
                  key={idx}
                  className={`${card.bg} ${card.border} border rounded-2xl p-5`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${card.iconBg} text-white flex items-center justify-center mb-4`}
                  >
                    <Icon size={18} />
                  </div>

                  <p
                    className={`text-[11px] uppercase font-bold ${card.text}`}
                  >
                    {card.title}
                  </p>

                  <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    {card.value}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2">
                    {card.sub}
                  </p>
                </div>
              );
            })}
          </div>

          {/* LANDFILL */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <Trash2 size={20} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Landfill Waste Avoided
              </p>

              <h3 className="text-lg font-bold text-slate-800 mt-1">
                1140.15 kg of e-waste diverted from landfills
              </h3>
            </div>
          </div>

          {/* REAL WORLD IMPACT */}
          <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Leaf size={14} fill="currentColor" />
              </div>

              <h3 className="text-sm font-bold text-slate-800">
                Real-World Impact Comparison
              </h3>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              By recovering this e-waste, you've saved 25310.1 kg of
              CO₂ emissions — equivalent to driving 63275 miles in a
              car or planting 1205.2 trees.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CARD */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <Car size={20} className="text-slate-400 mb-3" />

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Same CO₂ as driving
                </p>

                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  63275 miles
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  in a gasoline car
                </p>
              </div>

              {/* CARD */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <Smartphone
                  size={20}
                  className="text-slate-400 mb-3"
                />

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Equivalent to
                </p>

                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  3062522 charges
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  smartphone full charges
                </p>
              </div>

              {/* CARD */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <Lightbulb
                  size={20}
                  className="text-slate-400 mb-3"
                />

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Same as running
                </p>

                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  2885351 hours
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  LED bulb operation
                </p>
              </div>
            </div>
          </div>

          {/* FOOTER CTA */}
          <div className="bg-[#eef7ff] border border-sky-300 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-slate-800">
              You're making a difference!
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Every device recycled contributes to a healthier
              planet. Thank you for participating in sustainable
              e-waste recovery.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EnvironmentalImpact;