import React, { useEffect, useMemo, useState } from "react";
import {
  Leaf,
  Zap,
  Droplets,
  Trees,
  Trash2,
  Car,
  Smartphone,
  Lightbulb,
  Info,
  Loader2,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const EnvironmentalImpact = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     ENVIRONMENTAL CONSTANTS
  ========================================================= */

  // Based on the environmental calculations already used
  // in your WASTELESS dashboard.
  const CO2_PER_DEVICE = 4.2;
  const ENERGY_PER_DEVICE = 78;
  const WATER_PER_DEVICE = 3800;
  const WEIGHT_PER_DEVICE = 2.3;

  // Approximate annual CO2 absorption per tree.
  const CO2_PER_TREE = 21;

  // Approximate gasoline car emissions.
  const CO2_PER_MILE = 0.4;

  // Approximate CO2 represented by one smartphone charge.
  const CO2_PER_CHARGE = 0.00826;

  // Approximate LED bulb consumption.
  const LED_KWH_PER_HOUR = 0.02;

  /* =========================================================
     LOAD COMPLETED TRANSACTIONS
  ========================================================= */

  const loadEnvironmentalData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          created_at,
          status,
          listing_id,
          amount,
          barangay,
          listings (
            id,
            device_model,
            category,
            condition,
            status,
            barangay
          )
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(
          `Unable to load environmental data: ${error.message}`,
        );
      }

      setTransactions(data || []);
    } catch (err) {
      console.error("Environmental impact error:", err);
      setError(
        err.message || "Unable to load environmental impact data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =========================================================
     INITIAL LOAD + REALTIME
  ========================================================= */

  useEffect(() => {
    loadEnvironmentalData();

    const channel = supabase
      .channel("environmental-impact-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          loadEnvironmentalData(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* =========================================================
     RECOVERED DEVICES
  ========================================================= */

  const recoveredDevices = transactions.length;

  /* =========================================================
     ENVIRONMENTAL CALCULATIONS
  ========================================================= */

  const environmentalImpact = useMemo(() => {
    const co2Saved = recoveredDevices * CO2_PER_DEVICE;

    const energySaved =
      recoveredDevices * ENERGY_PER_DEVICE;

    const waterSaved =
      recoveredDevices * WATER_PER_DEVICE;

    const weightDiverted =
      recoveredDevices * WEIGHT_PER_DEVICE;

    const treesEquivalent =
      co2Saved / CO2_PER_TREE;

    const drivingMiles =
      co2Saved / CO2_PER_MILE;

    const smartphoneCharges =
      co2Saved / CO2_PER_CHARGE;

    const ledHours =
      energySaved / LED_KWH_PER_HOUR;

    return {
      co2Saved,
      energySaved,
      waterSaved,
      weightDiverted,
      treesEquivalent,
      drivingMiles,
      smartphoneCharges,
      ledHours,
    };
  }, [recoveredDevices]);

  /* =========================================================
     FORMATTERS
  ========================================================= */

  const formatNumber = (value, decimals = 1) => {
    return Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatWholeNumber = (value) => {
    return Math.round(value || 0).toLocaleString("en-US");
  };

  /* =========================================================
     IMPACT CARDS
  ========================================================= */

  const impactCards = [
    {
      icon: Leaf,
      title: "CO₂ Saved",
      value: `${formatNumber(environmentalImpact.co2Saved)} kg`,
      sub: "Prevented greenhouse gas emissions",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-500",
      text: "text-emerald-700",
    },
    {
      icon: Zap,
      title: "Energy Saved",
      value: `${formatNumber(environmentalImpact.energySaved)} kWh`,
      sub: "Electricity conservation",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-500",
      text: "text-amber-700",
    },
    {
      icon: Droplets,
      title: "Water Saved",
      value: `${formatWholeNumber(environmentalImpact.waterSaved)} L`,
      sub: "Freshwater conservation",
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-500",
      text: "text-blue-700",
    },
    {
      icon: Trees,
      title: "Trees Equivalent",
      value: `${formatNumber(environmentalImpact.treesEquivalent)} trees`,
      sub: "Annual CO₂ absorption equivalent",
      bg: "bg-teal-50",
      border: "border-teal-200",
      iconBg: "bg-teal-600",
      text: "text-teal-700",
    },
  ];

  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2
            size={35}
            className="animate-spin text-emerald-500"
          />

          <p className="text-sm font-medium">
            Loading environmental impact...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#f4f7fb] font-sans">
      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-slate-800">
              Environmental Impact
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Centralized monitoring dashboard for Valenzuela City
              E-waste Platform
            </p>
          </div>

          <button
            onClick={() => loadEnvironmentalData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-60"
          >
            <RefreshCcw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh Data"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle
              size={20}
              className="text-red-500 mt-0.5"
            />

            <div>
              <p className="font-semibold text-red-700">
                Environmental data error
              </p>

              <p className="text-sm text-red-600 mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* RECOVERED DEVICES SUMMARY */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Smartphone size={21} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Recovered Devices
              </p>

              <h2 className="text-2xl font-bold text-slate-800">
                {recoveredDevices.toLocaleString()}
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Based on completed transactions
              </p>
            </div>
          </div>
        </div>

        {/* MAIN CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">

          {/* TITLE */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Leaf
                  size={20}
                  fill="currentColor"
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Platform-Wide Environmental Impact
                </h2>

                <p className="text-xs text-slate-400">
                  Calculated from completed e-waste recovery transactions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-sky-600 text-xs font-medium">
              <Info size={14} />
              <span>
                Based on recovery estimates
              </span>
            </div>
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
                {formatNumber(environmentalImpact.weightDiverted)} kg
                {" "}
                of e-waste diverted from landfills
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Estimated from {recoveredDevices} recovered device
                {recoveredDevices === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          {/* REAL WORLD IMPACT */}
          <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-5 mb-5">

            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Leaf
                  size={14}
                  fill="currentColor"
                />
              </div>

              <h3 className="text-sm font-bold text-slate-800">
                Real-World Impact Comparison
              </h3>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              By recovering{" "}
              <strong>
                {recoveredDevices.toLocaleString()}
              </strong>{" "}
              devices, the platform has prevented approximately{" "}
              <strong>
                {formatNumber(environmentalImpact.co2Saved)} kg
              </strong>{" "}
              of CO₂ emissions — equivalent to driving about{" "}
              <strong>
                {formatWholeNumber(
                  environmentalImpact.drivingMiles,
                )}{" "}
                miles
              </strong>{" "}
              or planting approximately{" "}
              <strong>
                {formatNumber(
                  environmentalImpact.treesEquivalent,
                )}{" "}
                trees
              </strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* CAR */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <Car
                  size={20}
                  className="text-slate-400 mb-3"
                />

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Same CO₂ as driving
                </p>

                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {formatWholeNumber(
                    environmentalImpact.drivingMiles,
                  )}{" "}
                  miles
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  in a gasoline car
                </p>
              </div>

              {/* SMARTPHONE */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <Smartphone
                  size={20}
                  className="text-slate-400 mb-3"
                />

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Equivalent to
                </p>

                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {formatWholeNumber(
                    environmentalImpact.smartphoneCharges,
                  )}
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  smartphone full charges
                </p>
              </div>

              {/* LED */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <Lightbulb
                  size={20}
                  className="text-slate-400 mb-3"
                />

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Same as running
                </p>

                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {formatWholeNumber(
                    environmentalImpact.ledHours,
                  )}{" "}
                  hours
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  LED bulb operation
                </p>
              </div>

            </div>
          </div>

          {/* CALCULATION INFORMATION */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5">
            <div className="flex items-start gap-3">
              <Info
                size={18}
                className="text-slate-500 mt-0.5 shrink-0"
              />

              <div>
                <h4 className="text-sm font-semibold text-slate-700">
                  Environmental Calculation Basis
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3 text-xs text-slate-500">
                  <p>
                    CO₂ savings:
                    <strong className="ml-1 text-slate-700">
                      {CO2_PER_DEVICE} kg/device
                    </strong>
                  </p>

                  <p>
                    Energy savings:
                    <strong className="ml-1 text-slate-700">
                      {ENERGY_PER_DEVICE} kWh/device
                    </strong>
                  </p>

                  <p>
                    Water savings:
                    <strong className="ml-1 text-slate-700">
                      {WATER_PER_DEVICE.toLocaleString()} L/device
                    </strong>
                  </p>

                  <p>
                    Landfill diversion:
                    <strong className="ml-1 text-slate-700">
                      {WEIGHT_PER_DEVICE} kg/device
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER CTA */}
          <div className="bg-[#eef7ff] border border-sky-300 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-slate-800">
              You're making a difference!
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Every completed e-waste recovery contributes to a
              healthier planet. Thank you for participating in
              sustainable e-waste recovery.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default EnvironmentalImpact;