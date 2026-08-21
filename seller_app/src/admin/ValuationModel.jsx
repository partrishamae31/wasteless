import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Info,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";

const DEFAULT_FACTORS = [
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

const CONDITION_MULTIPLIERS = {
  "Like New": 1.15,
  Good: 1.05,
  Fair: 1.0,
  Poor: 0.8,
  Working: 1.05,
  "Not Working": 0.6,
};

const getConditionMultiplier = (condition) => {
  if (!condition) return 1;

  const normalized = condition.toLowerCase();

  if (normalized.includes("like new") || normalized.includes("excellent")) {
    return 1.15;
  }

  if (normalized.includes("good") || normalized.includes("working")) {
    return 1.05;
  }

  if (normalized.includes("poor")) {
    return 0.8;
  }

  if (normalized.includes("not working") || normalized.includes("broken")) {
    return 0.6;
  }

  return 1;
};

const getAgeMultiplier = (createdAt) => {
  if (!createdAt) return 1;

  const created = new Date(createdAt);
  const now = new Date();

  const ageYears =
    (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);

  if (ageYears < 1) return 1;
  if (ageYears < 2) return 0.8;
  if (ageYears <= 5) return 0.6;

  return 0.25;
};

const formatCurrency = (value) => {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
};

const ValuationModel = () => {
  const [listings, setListings] = useState([]);
  const [factors, setFactors] = useState(DEFAULT_FACTORS);
  const [activeTab, setActiveTab] = useState("market");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // --------------------------------------------------
  // LOAD CONFIGURATION
  // --------------------------------------------------

  useEffect(() => {
    const savedFactors = localStorage.getItem("wasteless_valuation_factors");

    if (savedFactors) {
      try {
        setFactors(JSON.parse(savedFactors));
      } catch (error) {
        console.error("Invalid saved valuation configuration:", error);
      }
    }
  }, []);

  // --------------------------------------------------
  // LOAD LISTINGS FROM SUPABASE
  // --------------------------------------------------

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          id,
          device_model,
          condition,
          scrap_value,
          asking_price,
          reusable_part_value,
          created_at,
          category,
          status
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading listings:", error);
        setLoading(false);
        return;
      }

      setListings(data || []);
      setLoading(false);
    };

    loadListings();
  }, []);

  // --------------------------------------------------
  // FACTOR WEIGHT
  // --------------------------------------------------

  const totalWeight = useMemo(() => {
    return factors.reduce((sum, factor) => sum + Number(factor.value || 0), 0);
  }, [factors]);

  const updateFactor = (index, value) => {
    const numericValue = Math.max(0, Math.min(100, Number(value) || 0));

    setFactors((prev) =>
      prev.map((factor, i) =>
        i === index
          ? {
              ...factor,
              value: numericValue,
            }
          : factor,
      ),
    );
  };

  // --------------------------------------------------
  // SAVE CONFIGURATION
  // --------------------------------------------------

  const handleSaveConfiguration = () => {
    if (totalWeight !== 100) {
      setMessage(
        `Cannot save. Total weight must equal 100%. Current total: ${totalWeight}%`,
      );
      return;
    }

    setSaving(true);

    localStorage.setItem(
      "wasteless_valuation_factors",
      JSON.stringify(factors),
    );

    setTimeout(() => {
      setSaving(false);
      setMessage("Valuation configuration saved successfully.");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    }, 500);
  };

  // --------------------------------------------------
  // VALUATION CALCULATION
  // --------------------------------------------------

  const calculateValuation = (listing) => {
    const baseMarket = Number(listing.asking_price || 0);

    const ageMultiplier = getAgeMultiplier(listing.created_at);
    const conditionMultiplier = getConditionMultiplier(listing.condition);

    /*
      These are normalized scores.

      100 = excellent
      50  = average
      25  = poor
    */

    const ageScore = ageMultiplier * 100;

    const conditionScore = conditionMultiplier * 100;

    const functionalityScore = listing.condition
      ?.toLowerCase()
      .includes("working")
      ? 100
      : 60;

    const demandScore = listing.category ? 80 : 60;

    const recyclabilityScore =
      Number(listing.reusable_part_value || 0) > 0 ? 100 : 50;

    const getWeight = (title) =>
      Number(factors.find((factor) => factor.title === title)?.value || 0) /
      100;

    const weightedScore =
      ageScore * getWeight("Device Age") +
      conditionScore * getWeight("Physical Condition") +
      functionalityScore * getWeight("Component Functionality") +
      demandScore * getWeight("Market Demand") +
      recyclabilityScore * getWeight("Recyclability");

    /*
      Convert the score into a multiplier.

      100 score = full asking price
      80 score  = 80% of asking price
      etc.
    */

    const marketValue = baseMarket * (weightedScore / 100);

    const scrapValue = Number(
      listing.scrap_value || listing.reusable_part_value || baseMarket * 0.2,
    );

    return {
      marketValue: Math.round(marketValue),
      scrapValue: Math.round(scrapValue),
      weightedScore: Math.round(weightedScore),
    };
  };

  // --------------------------------------------------
  // RECENT VALUATIONS
  // --------------------------------------------------

  const recentValuations = useMemo(() => {
    return listings.slice(0, 10).map((listing) => {
      const valuation = calculateValuation(listing);

      return {
        ...listing,
        ...valuation,
      };
    });
  }, [listings, factors]);

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const totalItems = listings.length;

  const activeListings = listings.filter(
    (listing) =>
      listing.status?.toLowerCase() !== "sold" &&
      listing.status?.toLowerCase() !== "completed",
  ).length;

  const verifiedSpecs = listings.filter(
    (listing) => listing.valuation_acknowledged === true,
  ).length;

  const deviceCatalogue = new Set(
    listings.map((listing) => listing.category).filter(Boolean),
  ).size;

  const stats = [
    {
      title: "Total Items",
      value: totalItems,
      color: "text-cyan-500",
      icon: Activity,
    },
    {
      title: "Active Listings",
      value: activeListings,
      color: "text-emerald-500",
      icon: Activity,
    },
    {
      title: "Verified Specs",
      value: verifiedSpecs,
      color: "text-violet-500",
      icon: Sparkles,
    },
    {
      title: "Device Catalogue",
      value: deviceCatalogue,
      color: "text-orange-500",
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[#111827]">
          Valuation Models
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Configure and manage automated e-waste device valuation.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="bg-white border border-[#ECEEF3] rounded-xl p-5"
            >
              <div
                className={`w-10 h-10 rounded-lg bg-[#F7F8FC] flex items-center justify-center ${item.color}`}
              >
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

            <button
              onClick={() => setFactors(DEFAULT_FACTORS)}
              className="w-9 h-9 rounded-lg bg-[#F7F8FC] flex items-center justify-center text-violet-600 hover:bg-violet-50"
              title="Reset configuration"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="grid grid-cols-2 border-b border-[#F1F3F7]">
          <button
            onClick={() => setActiveTab("market")}
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
            className={`py-4 font-semibold text-sm ${
              activeTab === "scrap"
                ? "bg-orange-50 text-orange-600"
                : "text-[#6B7280] hover:bg-[#FAFBFD]"
            }`}
          >
            Scrap Value Model
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          {/* INFO */}
          <div className="flex items-start gap-3 bg-[#F4F8FF] border border-[#DCE7FF] rounded-xl px-4 py-3 mb-7">
            <Info size={16} className="text-[#4F46E5] mt-0.5 shrink-0" />

            <p className="text-[13px] text-[#4B5563] leading-relaxed">
              {activeTab === "market"
                ? "Market Value is calculated using the configured valuation factors together with the listing's asking price, condition, device age, functionality, category, and reusable-part value."
                : "Scrap Value is taken from the listing's scrap value. If no scrap value is available, the system estimates it using the reusable-part value or a percentage of the asking price."}
            </p>
          </div>

          {/* FACTORS */}
          {activeTab === "market" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[14px] font-semibold text-[#111827]">
                  Valuation Factors
                </h3>

                <p className="text-[13px] text-[#6B7280]">
                  Total Weight:
                  <span
                    className={`font-semibold ml-1 ${
                      totalWeight === 100 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {totalWeight}%
                  </span>
                </p>
              </div>

              <div className="space-y-6">
                {factors.map((factor, index) => (
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
                        style={{
                          width: `${Math.min(factor.value, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* SAVE */}
              <button
                onClick={handleSaveConfiguration}
                disabled={saving || totalWeight !== 100}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm mt-8 flex items-center justify-center gap-2 hover:opacity-95 transition-all"
              >
                <Save size={16} />

                {saving ? "Saving..." : "Save Configuration"}
              </button>

              {message && (
                <div
                  className={`mt-3 text-sm text-center ${
                    message.includes("Cannot")
                      ? "text-red-500"
                      : "text-emerald-600"
                  }`}
                >
                  {message}
                </div>
              )}
            </>
          )}

          {/* SCRAP MODEL */}
          {activeTab === "scrap" && (
            <div>
              <h3 className="text-[14px] font-semibold text-[#111827] mb-4">
                Scrap Value Calculation
              </h3>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                <p className="text-sm font-semibold text-orange-700">
                  Scrap Value Priority
                </p>

                <ol className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>
                    1. Use the listing's <strong>scrap_value</strong>
                  </li>

                  <li>
                    2. If unavailable, use <strong>reusable_part_value</strong>
                  </li>

                  <li>
                    3. If both are unavailable, estimate{" "}
                    <strong>20% of asking price</strong>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* FORMULA */}
          {activeTab === "market" && (
            <div className="mt-8">
              <h3 className="text-[14px] font-semibold text-[#111827] mb-4">
                Algorithm Formula
              </h3>

              <div className="bg-[#F0FDF4] border border-[#D1FADF] rounded-xl p-4">
                <p className="text-[12px] text-[#166534] font-medium">
                  Market Value Formula
                </p>

                <p className="text-[12px] text-[#15803D] mt-2 leading-relaxed">
                  Final Value = Asking Price × Weighted Valuation Score
                </p>

                <p className="text-[11px] text-[#15803D] mt-2">
                  Weighted Score = Age + Condition + Functionality + Market
                  Demand + Recyclability
                </p>
              </div>

              {/* EXTRA INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <div className="border border-[#ECEEF3] rounded-xl p-4">
                  <h4 className="text-[13px] font-semibold text-[#111827] mb-3">
                    Age Depreciation
                  </h4>

                  <ul className="space-y-2 text-[12px] text-[#6B7280]">
                    <li>• Less than 1 year: 100%</li>
                    <li>• 1–2 years: 80%</li>
                    <li>• 3–5 years: 60%</li>
                    <li>• 5+ years: 25%</li>
                  </ul>
                </div>

                <div className="border border-[#ECEEF3] rounded-xl p-4">
                  <h4 className="text-[13px] font-semibold text-[#111827] mb-3">
                    Condition Multipliers
                  </h4>

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

          {/* RECENT VALUATIONS */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[#111827]">
                Recent Valuations
              </h3>

              <span className="text-violet-600 text-sm font-medium">
                {listings.length} listings
              </span>
            </div>

            <div className="border border-[#ECEEF3] rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  Loading listings...
                </div>
              ) : recentValuations.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  No listings found.
                </div>
              ) : (
                recentValuations.map((item, index) => (
                  <div
                    key={item.id}
                    className={`px-5 py-4 flex items-center justify-between ${
                      index !== recentValuations.length - 1
                        ? "border-b border-[#F1F3F7]"
                        : ""
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-medium text-[#111827]">
                        {item.device_model || "Unknown Device"}
                      </h4>

                      <p className="text-[12px] text-[#9CA3AF] mt-1">
                        {item.category || "Uncategorized"} ·{" "}
                        {item.condition || "Unknown"}
                      </p>
                    </div>

                    <div className="flex items-center gap-10">
                      <div className="text-right">
                        <p className="text-[11px] text-[#9CA3AF]">Market</p>

                        <p className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(item.marketValue)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-[#9CA3AF]">Scrap</p>

                        <p className="text-sm font-semibold text-orange-500">
                          {formatCurrency(item.scrapValue)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-[#9CA3AF]">Score</p>

                        <p className="text-sm font-semibold text-violet-600">
                          {item.weightedScore}%
                        </p>
                      </div>

                      <button className="text-[#9CA3AF] hover:text-violet-600">
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
