// Fixed ValuationModel.jsx
// Key fixes:
// 1. Removed reference to listing.valuation_acknowledged because it was not selected.
// 2. Fixed "Working" matching so "Not Working" is not treated as working.
// 3. Fixed age calculation so displayed rules match the calculation.
// 4. Added reset functionality.
// 5. Added Supabase load error feedback.
// 6. Kept valuation configuration in localStorage.
// 7. Made factor loading robust against malformed saved data.

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Info,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";

const DEFAULT_FACTORS = [
  { title: "Device Age", subtitle: "Age-based depreciation curve", value: 25 },
  { title: "Physical Condition", subtitle: "Visual and functional state", value: 30 },
  { title: "Component Functionality", subtitle: "Working components checklist", value: 25 },
  { title: "Market Demand", subtitle: "Current demand & parts", value: 15 },
  { title: "Recyclability", subtitle: "Recovery of component parts", value: 5 },
];

const getConditionMultiplier = (condition) => {
  const value = String(condition || "").toLowerCase().trim();

  if (
    value.includes("not working") ||
    value.includes("broken") ||
    value.includes("defective")
  ) return 0.6;

  if (value.includes("like new") || value.includes("excellent")) return 1.15;
  if (value === "working" || value.includes("good") || value.includes("functional")) return 1.05;
  if (value.includes("poor")) return 0.8;

  return 1;
};

const getAgeScore = (createdAt) => {
  if (!createdAt) return 100;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 100;

  const ageYears =
    (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  if (ageYears < 1) return 100;
  if (ageYears < 2) return 80;
  if (ageYears <= 5) return 60;
  return 25;
};

const getFunctionalityScore = (condition) => {
  const value = String(condition || "").toLowerCase().trim();

  if (
    value.includes("not working") ||
    value.includes("broken") ||
    value.includes("defective")
  ) return 25;

  if (
    value === "working" ||
    value.includes("functional") ||
    value.includes("good") ||
    value.includes("like new") ||
    value.includes("excellent")
  ) return 100;

  return 60;
};

const getDemandScore = (listing) => (listing.category ? 80 : 60);

const getRecyclabilityScore = (listing) => {
  if (Number(listing.reusable_part_value || 0) > 0) return 100;
  if (Number(listing.scrap_value || 0) > 0) return 80;
  return 50;
};

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;

const ValuationModel = () => {
  const [listings, setListings] = useState([]);
  const [factors, setFactors] = useState(DEFAULT_FACTORS);
  const [activeTab, setActiveTab] = useState("market");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wasteless_valuation_factors");
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;

      setFactors(
        DEFAULT_FACTORS.map((defaultFactor) => {
          const savedFactor = parsed.find(
            (factor) => factor.title === defaultFactor.title
          );

          return savedFactor
            ? {
                ...defaultFactor,
                value: Math.max(
                  0,
                  Math.min(100, Number(savedFactor.value) || 0)
                ),
              }
            : { ...defaultFactor };
        })
      );
    } catch (error) {
      console.error("Invalid saved valuation configuration:", error);
      localStorage.removeItem("wasteless_valuation_factors");
    }
  }, []);

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          device_model,
          condition,
          scrap_value,
          asking_price,
          reusable_part_value,
          created_at,
          category,
          status
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading listings:", error);
        setListings([]);
        setLoadError(`Unable to load listings: ${error.message}`);
      } else {
        setListings(data || []);
      }

      setLoading(false);
    };

    loadListings();
  }, []);

  const totalWeight = useMemo(
    () => factors.reduce((sum, factor) => sum + Number(factor.value || 0), 0),
    [factors]
  );

  const updateFactor = (index, value) => {
    const numericValue = Math.max(0, Math.min(100, Number(value) || 0));

    setFactors((prev) =>
      prev.map((factor, i) =>
        i === index ? { ...factor, value: numericValue } : factor
      )
    );
  };

  const resetConfiguration = () => {
    setFactors(DEFAULT_FACTORS.map((factor) => ({ ...factor })));
    localStorage.removeItem("wasteless_valuation_factors");
    setMessage("Valuation configuration reset to defaults.");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleSaveConfiguration = () => {
    if (totalWeight !== 100) {
      setMessage(
        `Cannot save. Total weight must equal 100%. Current total: ${totalWeight}%`
      );
      return;
    }

    setSaving(true);

    try {
      localStorage.setItem(
        "wasteless_valuation_factors",
        JSON.stringify(factors)
      );
      setMessage("Valuation configuration saved successfully.");
    } catch (error) {
      console.error("Unable to save valuation configuration:", error);
      setMessage("Unable to save valuation configuration.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const calculateValuation = (listing) => {
    const askingPrice = Math.max(0, Number(listing.asking_price || 0));

    const scores = {
      "Device Age": getAgeScore(listing.created_at),
      "Physical Condition": getConditionMultiplier(listing.condition) * 100,
      "Component Functionality": getFunctionalityScore(listing.condition),
      "Market Demand": getDemandScore(listing),
      "Recyclability": getRecyclabilityScore(listing),
    };

    const weightedScore = factors.reduce((sum, factor) => {
      const weight = Number(factor.value || 0) / 100;
      return sum + (scores[factor.title] || 0) * weight;
    }, 0);

    const marketValue = askingPrice * (weightedScore / 100);

    const scrapValue = Math.max(
      0,
      Number(
        listing.scrap_value ||
          listing.reusable_part_value ||
          askingPrice * 0.2
      )
    );

    return {
      marketValue: Math.round(marketValue),
      scrapValue: Math.round(scrapValue),
      weightedScore: Math.round(weightedScore),
    };
  };

  const recentValuations = useMemo(
    () =>
      listings.slice(0, 10).map((listing) => ({
        ...listing,
        ...calculateValuation(listing),
      })),
    [listings, factors]
  );

  const totalItems = listings.length;

  const activeListings = listings.filter((listing) => {
    const status = String(listing.status || "").toLowerCase().trim();
    return !["sold", "completed", "cancelled", "canceled"].includes(status);
  }).length;

  // The original code checked valuation_acknowledged, but that column was
  // neither selected nor established in the supplied listings schema.
  // Count listings with the fields required by the valuation model instead.
  const verifiedSpecs = listings.filter(
    (listing) =>
      Number(listing.asking_price || 0) > 0 &&
      Boolean(listing.device_model) &&
      Boolean(listing.category) &&
      Boolean(listing.condition)
  ).length;

  const deviceCatalogue = new Set(
    listings.map((listing) => listing.category).filter(Boolean)
  ).size;

  const stats = [
    { title: "Total Items", value: totalItems, color: "text-cyan-500", icon: Activity },
    { title: "Active Listings", value: activeListings, color: "text-emerald-500", icon: Activity },
    { title: "Verified Specs", value: verifiedSpecs, color: "text-violet-500", icon: Sparkles },
    { title: "Device Catalogue", value: deviceCatalogue, color: "text-orange-500", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[#111827]">Valuation Models</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure and manage automated e-waste device valuation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-white border border-[#ECEEF3] rounded-xl p-5">
              <div className={`w-10 h-10 rounded-lg bg-[#F7F8FC] flex items-center justify-center ${item.color}`}>
                <Icon size={18} />
              </div>
              <div className="mt-5">
                <h3 className="text-[28px] leading-none font-bold text-[#111827]">
                  {loading ? "..." : item.value}
                </h3>
                <p className="text-sm text-[#9CA3AF] mt-2">{item.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-[#ECEEF3] rounded-2xl overflow-hidden">
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

            <button
              onClick={resetConfiguration}
              type="button"
              className="w-9 h-9 rounded-lg bg-[#F7F8FC] flex items-center justify-center text-violet-600 hover:bg-violet-50"
              title="Reset configuration"
            >
              <RotateCcw size={17} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-[#F1F3F7]">
          <button
            onClick={() => setActiveTab("market")}
            type="button"
            className={`py-4 font-semibold text-sm border-r border-[#F1F3F7] ${
              activeTab === "market"
                ? "bg-[#ECFDF3] text-[#16A34A]"
                : "text-[#6B7280] hover:bg-[#FAFBFD]"
            }`}
          >
            Market Value Model
          </button>

          <button
            onClick={() => setActiveTab("scrap")}
            type="button"
            className={`py-4 font-semibold text-sm ${
              activeTab === "scrap"
                ? "bg-orange-50 text-orange-600"
                : "text-[#6B7280] hover:bg-[#FAFBFD]"
            }`}
          >
            Scrap Value Model
          </button>
        </div>

        <div className="p-6">
          {loadError && (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {loadError}
            </div>
          )}

          <div className="flex items-start gap-3 bg-[#F4F8FF] border border-[#DCE7FF] rounded-xl px-4 py-3 mb-7">
            <Info size={16} className="text-[#4F46E5] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#4B5563] leading-relaxed">
              {activeTab === "market"
                ? "Market Value is calculated from asking price and the configured scores for device age, physical condition, functionality, market demand, and recyclability."
                : "Scrap Value uses scrap_value first, then reusable_part_value, then 20% of asking price as the final fallback."}
            </p>
          </div>

          {activeTab === "market" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[14px] font-semibold text-[#111827]">
                  Valuation Factors
                </h3>
                <p className="text-[13px] text-[#6B7280]">
                  Total Weight:
                  <span className={`font-semibold ml-1 ${totalWeight === 100 ? "text-emerald-600" : "text-red-500"}`}>
                    {totalWeight}%
                  </span>
                </p>
              </div>

              <div className="space-y-6">
                {factors.map((factor, index) => (
                  <div key={factor.title}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-[14px] font-medium text-[#111827]">{factor.title}</h4>
                        <p className="text-[12px] text-[#9CA3AF] mt-1">{factor.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={factor.value}
                          onChange={(e) => updateFactor(index, e.target.value)}
                          className="w-14 h-9 rounded-lg border border-[#E5E7EB] bg-white text-center text-sm font-medium text-[#111827]"
                        />
                        <span className="text-sm text-[#9CA3AF]">%</span>
                      </div>
                    </div>

                    <div className="w-full h-[6px] rounded-full bg-[#ECEEF3] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                        style={{ width: `${Math.min(Number(factor.value) || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveConfiguration}
                disabled={saving || totalWeight !== 100}
                type="button"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm mt-8 flex items-center justify-center gap-2 hover:opacity-95 transition-all"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Configuration"}
              </button>

              {message && (
                <div className={`mt-3 text-sm text-center ${message.includes("Cannot") || message.includes("Unable") ? "text-red-500" : "text-emerald-600"}`}>
                  {message}
                </div>
              )}
            </>
          )}

          {activeTab === "scrap" && (
            <div>
              <h3 className="text-[14px] font-semibold text-[#111827] mb-4">Scrap Value Calculation</h3>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                <p className="text-sm font-semibold text-orange-700">Scrap Value Priority</p>
                <ol className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>1. Use the listing&apos;s <strong>scrap_value</strong></li>
                  <li>2. If unavailable, use <strong>reusable_part_value</strong></li>
                  <li>3. If both are unavailable, estimate <strong>20% of asking price</strong></li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === "market" && (
            <div className="mt-8">
              <h3 className="text-[14px] font-semibold text-[#111827] mb-4">Algorithm Formula</h3>
              <div className="bg-[#F0FDF4] border border-[#D1FADF] rounded-xl p-4">
                <p className="text-[12px] text-[#166534] font-medium">Market Value Formula</p>
                <p className="text-[12px] text-[#15803D] mt-2 leading-relaxed">
                  Final Value = Asking Price × (Weighted Valuation Score ÷ 100)
                </p>
                <p className="text-[11px] text-[#15803D] mt-2">
                  Weighted Score = Σ (Factor Score × Factor Weight)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <div className="border border-[#ECEEF3] rounded-xl p-4">
                  <h4 className="text-[13px] font-semibold text-[#111827] mb-3">Age Depreciation</h4>
                  <ul className="space-y-2 text-[12px] text-[#6B7280]">
                    <li>• Less than 1 year: 100%</li>
                    <li>• 1–2 years: 80%</li>
                    <li>• 3–5 years: 60%</li>
                    <li>• 5+ years: 25%</li>
                  </ul>
                </div>

                <div className="border border-[#ECEEF3] rounded-xl p-4">
                  <h4 className="text-[13px] font-semibold text-[#111827] mb-3">Condition Multipliers</h4>
                  <ul className="space-y-2 text-[12px] text-[#6B7280]">
                    <li>• Like New: +15%</li>
                    <li>• Good / Working: +5%</li>
                    <li>• Fair: 0%</li>
                    <li>• Poor: -20%</li>
                    <li>• Not Working: -40%</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[#111827]">Recent Valuations</h3>
              <span className="text-violet-600 text-sm font-medium">{listings.length} listings</span>
            </div>

            <div className="border border-[#ECEEF3] rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-400">Loading listings...</div>
              ) : recentValuations.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No listings found.</div>
              ) : (
                recentValuations.map((item, index) => (
                  <div
                    key={item.id}
                    className={`px-5 py-4 flex items-center justify-between gap-4 ${
                      index !== recentValuations.length - 1 ? "border-b border-[#F1F3F7]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-[#111827] truncate">
                        {item.device_model || "Unknown Device"}
                      </h4>
                      <p className="text-[12px] text-[#9CA3AF] mt-1">
                        {item.category || "Uncategorized"} · {item.condition || "Unknown"}
                      </p>
                    </div>

                    <div className="flex items-center gap-10 shrink-0">
                      <div className="text-right">
                        <p className="text-[11px] text-[#9CA3AF]">Market</p>
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(item.marketValue)}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-[#9CA3AF]">Scrap</p>
                        <p className="text-sm font-semibold text-orange-500">{formatCurrency(item.scrapValue)}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-[#9CA3AF]">Score</p>
                        <p className="text-sm font-semibold text-violet-600">{item.weightedScore}%</p>
                      </div>

                      <button
                        type="button"
                        className="text-[#9CA3AF] hover:text-violet-600"
                        title="Valuation calculated from current model"
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValuationModel;
