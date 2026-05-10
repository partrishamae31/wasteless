import React from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Info,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const stats = [
  {
    title: "Total Items",
    value: "1248",
    color: "text-cyan-500",
    icon: Activity,
  },
  {
    title: "Active Listings",
    value: "342",
    color: "text-emerald-500",
    icon: Activity,
  },
  {
    title: "Verified Specs",
    value: "87",
    color: "text-violet-500",
    icon: Sparkles,
  },
  {
    title: "Device Catalogue",
    value: "456",
    color: "text-orange-500",
    icon: BarChart3,
  },
];

const valuationFactors = [
  {
    title: "Device Age",
    subtitle: "Age-based depreciation curve",
    value: 25,
  },
  {
    title: "Physical Condition",
    subtitle: "Visual and functional state",
    value: 30,
  },
  {
    title: "Component Functionality",
    subtitle: "Working components checklist",
    value: 25,
  },
  {
    title: "Market Demand",
    subtitle: "Current demand & parts",
    value: 15,
  },
  {
    title: "Recyclability",
    subtitle: "Recovery of component parts",
    value: 5,
  },
];

const recentValuations = [
  {
    name: "iPhone 13",
    condition: "Good · 2023-09-12",
    market: "₱3,200",
    scrap: "₱450",
  },
  {
    name: "Samsung Galaxy S10",
    condition: "Fair · 2023-08-10",
    market: "₱2,900",
    scrap: "₱320",
  },
  {
    name: "Dell Latitude 5400",
    condition: "Poor · 2023-08-01",
    market: "₱1,800",
    scrap: "₱850",
  },
];

const StatCard = ({ item }) => {
  const Icon = item.icon;

  return (
    <div className="bg-white border border-[#ECEEF3] rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-lg bg-[#F7F8FC] flex items-center justify-center ${item.color}`}
        >
          <Icon size={18} />
        </div>

        <span className="text-[11px] font-semibold text-emerald-500">
          +12%
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-[28px] leading-none font-bold text-[#111827]">
          {item.value}
        </h3>

        <p className="text-sm text-[#9CA3AF] mt-2">{item.title}</p>
      </div>
    </div>
  );
};

const ValuationModel = () => {
  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[#111827]">
          Valuation Models
        </h1>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {stats.map((item) => (
          <StatCard key={item.title} item={item} />
        ))}
      </div>

      {/* MAIN CARD */}
      <div className="bg-white border border-[#ECEEF3] rounded-2xl overflow-hidden">
        {/* CARD HEADER */}
        <div className="px-6 py-5 border-b border-[#F1F3F7]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[#111827]">
                Automated Valuation Models
              </h2>

              <p className="text-sm text-[#9CA3AF] mt-1">
                Configure algorithmic valuation rules and scrap value formulas
              </p>
            </div>

            <button className="w-9 h-9 rounded-lg bg-[#F7F8FC] flex items-center justify-center text-violet-600">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="grid grid-cols-2 border-b border-[#F1F3F7]">
          <button className="py-4 bg-[#ECFDF3] text-[#16A34A] font-semibold text-sm border-r border-[#F1F3F7]">
            Market Value Model
          </button>

          <button className="py-4 text-[#6B7280] text-sm font-medium hover:bg-[#FAFBFD]">
            Scrap Value Model
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          {/* INFO */}
          <div className="flex items-start gap-3 bg-[#F4F8FF] border border-[#DCE7FF] rounded-xl px-4 py-3 mb-7">
            <Info
              size={16}
              className="text-[#4F46E5] mt-0.5 shrink-0"
            />

            <p className="text-[13px] text-[#4B5563] leading-relaxed">
              Market Value is calculated for devices with functional
              components that can be reused in repairs. Higher value for
              working parts in good condition.
            </p>
          </div>

          {/* TITLE */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-semibold text-[#111827]">
              Valuation Factors
            </h3>

            <p className="text-[13px] text-[#6B7280]">
              Total Weight:
              <span className="font-semibold text-emerald-600 ml-1">
                100%
              </span>
            </p>
          </div>

          {/* FACTORS */}
          <div className="space-y-6">
            {valuationFactors.map((factor) => (
              <div key={factor.title}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-[14px] font-medium text-[#111827]">
                      {factor.title}
                    </h4>

                    <p className="text-[12px] text-[#9CA3AF] mt-1">
                      {factor.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={factor.value}
                      readOnly
                      className="w-14 h-9 rounded-lg border border-[#E5E7EB] bg-white text-center text-sm font-medium text-[#111827]"
                    />

                    <span className="text-sm text-[#9CA3AF]">%</span>
                  </div>
                </div>

                <div className="w-full h-[6px] rounded-full bg-[#ECEEF3] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    style={{ width: `${factor.value * 3}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* BUTTON */}
          <button className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium text-sm mt-8 flex items-center justify-center gap-2 hover:opacity-95 transition-all">
            <Save size={16} />
            Save Configuration
          </button>

          {/* FORMULA */}
          <div className="mt-8">
            <h3 className="text-[14px] font-semibold text-[#111827] mb-4">
              Algorithm Formula
            </h3>

            <div className="bg-[#F0FDF4] border border-[#D1FADF] rounded-xl p-4">
              <p className="text-[12px] text-[#166534] font-medium">
                Market Value Formula
              </p>

              <p className="text-[12px] text-[#15803D] mt-2 leading-relaxed">
                Final Value = (Base Market × 0.25 + Condition Score ×
                0.3 + Functionality Score × 0.25 + Market Demand × 0.15
                + Recyclability Factor × 0.05)
              </p>
            </div>

            {/* EXTRA INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div className="border border-[#ECEEF3] rounded-xl p-4">
                <h4 className="text-[13px] font-semibold text-[#111827] mb-3">
                  Age Depreciation
                </h4>

                <ul className="space-y-2 text-[12px] text-[#6B7280]">
                  <li>• Less than 1 year value</li>
                  <li>• 1–2 years 80% of base value</li>
                  <li>• 3–5 years 60% of base value</li>
                  <li>• 5+ years 25% of base value</li>
                </ul>
              </div>

              <div className="border border-[#ECEEF3] rounded-xl p-4">
                <h4 className="text-[13px] font-semibold text-[#111827] mb-3">
                  Condition Multipliers
                </h4>

                <ul className="space-y-2 text-[12px] text-[#6B7280]">
                  <li>• Like New (+15%)</li>
                  <li>• Good (+5%)</li>
                  <li>• Fair (0%)</li>
                  <li>• Poor (-20%)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* RECENT VALUATIONS */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[#111827]">
                Recent Valuations
              </h3>

              <button className="text-violet-600 text-sm font-medium flex items-center gap-1">
                View All
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="border border-[#ECEEF3] rounded-xl overflow-hidden">
              {recentValuations.map((item, index) => (
                <div
                  key={item.name}
                  className={`px-5 py-4 flex items-center justify-between ${
                    index !== recentValuations.length - 1
                      ? "border-b border-[#F1F3F7]"
                      : ""
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-medium text-[#111827]">
                      {item.name}
                    </h4>

                    <p className="text-[12px] text-[#9CA3AF] mt-1">
                      Condition: {item.condition}
                    </p>
                  </div>

                  <div className="flex items-center gap-10">
                    <div className="text-right">
                      <p className="text-[11px] text-[#9CA3AF]">
                        Market
                      </p>

                      <p className="text-sm font-semibold text-emerald-600">
                        {item.market}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] text-[#9CA3AF]">
                        Scrap
                      </p>

                      <p className="text-sm font-semibold text-orange-500">
                        {item.scrap}
                      </p>
                    </div>

                    <button className="text-[#9CA3AF] hover:text-violet-600">
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValuationModel;