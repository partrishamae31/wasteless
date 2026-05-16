import React from "react";
import {
  Activity,
  Edit3,
  Shield,
  Sparkles,
  Users,
  Database,
  Info,
} from "lucide-react";

const stats = [
  {
    title: "Total Users",
    value: "1,248",
    icon: Users,
    color: "text-cyan-500",
  },
  {
    title: "Active Listings",
    value: "342",
    icon: Activity,
    color: "text-emerald-500",
  },
  {
    title: "Verified Shops",
    value: "87",
    icon: Sparkles,
    color: "text-violet-500",
  },
  {
    title: "Devices Cataloged",
    value: "456",
    icon: Database,
    color: "text-orange-500",
  },
];

const tiers = [
  {
    name: "NEWCOMER",
    color: "bg-gray-100 text-gray-600",
    border: "bg-gray-300",
    transactions: "0",
    rating: "0.0",
    privileges: [
      "Basic Listings",
      "Basic Messaging",
    ],
  },
  {
    name: "BRONZE",
    color: "bg-orange-100 text-orange-600",
    border: "bg-orange-500",
    transactions: "3",
    rating: "3.5",
    privileges: [
      "Basic Listings",
      "Basic Messaging",
      "Priority Support",
    ],
  },
  {
    name: "SILVER",
    color: "bg-slate-100 text-slate-600",
    border: "bg-slate-400",
    transactions: "10",
    rating: "4.0",
    privileges: [
      "Basic Listings",
      "Basic Messaging",
      "Priority Support",
      "Featured Listings",
      "Extended Warranty",
    ],
  },
  {
    name: "GOLD",
    color: "bg-yellow-100 text-yellow-700",
    border: "bg-yellow-500",
    transactions: "25",
    rating: "4.5",
    privileges: [
      "Basic Listings",
      "Basic Messaging",
      "Priority Support",
      "Featured Listings",
      "Extended Warranty",
      "+2 more",
    ],
  },
  {
    name: "PLATINUM",
    color: "bg-violet-100 text-violet-600",
    border: "bg-violet-500",
    transactions: "50",
    rating: "4.8",
    privileges: [
      "Basic Listings",
      "Basic Messaging",
      "Priority Support",
      "Featured Listings",
      "Extended Warranty",
      "+5 more",
    ],
  },
];

const StatCard = ({ item }) => {
  const Icon = item.icon;

  return (
    <div className="bg-white border border-[#ECEEF3] rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-lg bg-[#F8FAFC] flex items-center justify-center ${item.color}`}
        >
          <Icon size={18} />
        </div>

        <span className="text-[11px] font-semibold text-emerald-500">
          +12%
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-[28px] font-bold text-[#111827] leading-none">
          {item.value}
        </h3>

        <p className="text-sm text-[#9CA3AF] mt-2">
          {item.title}
        </p>
      </div>
    </div>
  );
};

const TierCard = ({ tier }) => {
  return (
    <div className="relative bg-white border border-[#ECEEF3] rounded-xl overflow-hidden">
      {/* LEFT BORDER */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[4px] ${tier.border}`}
      />

      <div className="p-5">
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-semibold ${tier.color}`}
              >
                {tier.name}
              </span>

              <p className="text-[12px] text-[#9CA3AF]">
                {tier.transactions} transactions ·{" "}
                {tier.rating} rating ·{" "}
                {tier.privileges.length} privileges
              </p>
            </div>
          </div>

          <button className="h-8 px-3 rounded-lg border border-[#E5E7EB] text-[#6B7280] text-sm flex items-center gap-2 hover:bg-[#F9FAFB] transition-all">
            <Edit3 size={14} />
            Edit
          </button>
        </div>

        {/* PRIVILEGES */}
        <div className="mt-5">
          <p className="text-[11px] text-[#9CA3AF] mb-3">
            Current Privileges
          </p>

          <div className="flex flex-wrap gap-2">
            {tier.privileges.map((item) => (
              <span
                key={item}
                className="px-3 py-1 rounded-md bg-[#F8FAFC] border border-[#ECEEF3] text-[11px] text-[#6B7280]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TrustTierManagement = () => {
  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      {/* PAGE TITLE */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[#111827]">
          Trust Tier Management
        </h1>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {stats.map((item) => (
          <StatCard key={item.title} item={item} />
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-white border border-[#ECEEF3] rounded-2xl overflow-hidden">
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-[#F1F3F7]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-violet-600">
              <Shield size={18} />
            </div>

            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">
                Trust Tier Management
              </h2>

              <p className="text-sm text-[#9CA3AF] mt-1">
                Configure transaction and rating requirements for each
                trust tier. Changes apply immediately to all users.
              </p>
            </div>
          </div>
        </div>

        {/* TIERS */}
        <div className="p-6 space-y-4">
          {tiers.map((tier) => (
            <TierCard key={tier.name} tier={tier} />
          ))}

          {/* FOOTER NOTE */}
          <div className="mt-5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-5 flex items-start gap-3">
            <Info
              size={18}
              className="text-[#2563EB] mt-0.5 shrink-0"
            />

            <div>
              <h4 className="text-sm font-semibold text-[#1E3A8A] mb-2">
                Important Notes
              </h4>

              <ul className="space-y-1 text-[13px] text-[#2563EB]">
                <li>
                  • Changes to tier thresholds take effect immediately
                  for all users.
                </li>

                <li>
                  • Users will be automatically promoted or demoted
                  based on new requirements.
                </li>

                <li>
                  • Higher tiers must have stricter requirements than
                  lower tiers.
                </li>

                <li>
                  • Notifications will be sent to affected users when
                  tier changes occur.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustTierManagement;