import React from "react";
import {
  AlertTriangle,
  Eye,
  CheckCircle2,
  Clock3,
  Flag,
  Search,
  ShieldAlert,
  Users,
  Activity,
  BadgeCheck,
  Database,
} from "lucide-react";

const TransactionReview = () => {
  const flaggedTransactions = [
    {
      id: "TX-flag-demo-001",
      title: "Handover Timeout",
      issue: "Buyer Failed To Confirm",
      description:
        "Buyer TechRepair Manila failed to confirm handover within 48 hours after scheduled meetup.",
      listing: "Samsung Galaxy S10",
      seller: "Juan Cruz",
      date: "April 27, 2026",
      status: "pending",
    },
    {
      id: "TX-flag-demo-002",
      title: "Dispute",
      issue: "Buyer Claims Wrong Item",
      description:
        "Seller reported no-show at scheduled meetup. Buyer claims incorrect item received.",
      listing: "iPhone XR",
      seller: "Maria Santos",
      date: "April 25, 2026",
      status: "pending",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fb] p-6 lg:p-8">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-slate-800">
          Transaction Review
        </h1>
      </div>

      {/* TOP STATS */}
      {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value="1,248"
          icon={<Users size={18} />}
          color="text-blue-500"
        />

        <StatCard
          title="Active Listings"
          value="342"
          icon={<Activity size={18} />}
          color="text-emerald-500"
        />

        <StatCard
          title="Verified Shops"
          value="87"
          icon={<BadgeCheck size={18} />}
          color="text-violet-500"
        />

        <StatCard
          title="Devices Cataloged"
          value="456"
          icon={<Database size={18} />}
          color="text-orange-500"
        />
      </div> */}

      {/* STATUS CARDS */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStatusCard
          title="Pending Review"
          value="2"
          color="orange"
          icon={<AlertTriangle size={16} />}
        />

        <MiniStatusCard
          title="Under Review"
          value="1"
          color="blue"
          icon={<Eye size={16} />}
        />

        <MiniStatusCard
          title="Resolved"
          value="1"
          color="green"
          icon={<CheckCircle2 size={16} />}
        />

        <MiniStatusCard
          title="Timeout Flags"
          value="2"
          color="violet"
          icon={<Clock3 size={16} />}
        />
      </div>

      {/* FILTER TABS */}
      <div className="mt-5 flex overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button className="flex-1 border-b-2 border-[#2f8ca3] bg-[#2f8ca3] py-3 text-xs font-semibold text-white">
          Pending
        </button>

        <button className="flex-1 py-3 text-xs font-medium text-slate-500 hover:bg-slate-50">
          Under Review
        </button>

        <button className="flex-1 py-3 text-xs font-medium text-slate-500 hover:bg-slate-50">
          Resolved
        </button>

        <button className="flex-1 py-3 text-xs font-medium text-slate-500 hover:bg-slate-50">
          All
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* LEFT PANEL */}
        <div className="xl:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Flagged Transactions (2)
              </h2>

              <button className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
                <Search size={14} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {flaggedTransactions.map((item, index) => (
                <div
                  key={index}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    index === 0
                      ? "border-[#2f8ca3] bg-[#f0fbff]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div
                        className={`mt-1 rounded-lg p-2 ${
                          index === 0
                            ? "bg-orange-100 text-orange-500"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <AlertTriangle size={15} />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Buyer TechRepair Manila failed to
                          confirm handover within 48 hours.
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold uppercase text-orange-600">
                            pending
                          </span>

                          <span className="text-[10px] text-slate-400">
                            4/30/2026
                          </span>
                        </div>
                      </div>
                    </div>

                    <button className="text-slate-400 hover:text-slate-600">
                      •••
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="xl:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} />

                    <h2 className="text-sm font-semibold">
                      Flagged Transaction Review
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-orange-100">
                    ID: tx-flag-demo-001
                  </p>
                </div>

                <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
                  pending
                </span>
              </div>
            </div>

            {/* BODY */}
            <div className="space-y-6 p-6">
              {/* REASON */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reason
                </p>

                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <AlertTriangle
                    size={15}
                    className="text-orange-500"
                  />
                  Handover Timeout - Buyer Failed To Confirm
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  Buyer "TechRepair Manila" failed to
                  confirm handover within 48 hours after
                  scheduled meetup (April 27, 2026 at
                  2:00 PM). Listing: Samsung Galaxy S10.
                  Seller: Juan Cruz.
                </div>
              </div>

              {/* META */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Flagged By
                  </p>

                  <p className="mt-2 text-sm font-medium text-slate-700">
                    System
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Flagged On
                  </p>

                  <p className="mt-2 text-sm font-medium text-slate-700">
                    April 30, 2026 at 9:43 PM
                  </p>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]">
                <Flag size={16} />
                Assign to Me & Start Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   TOP STAT CARD
========================= */
const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-800">
            {value}
          </h2>
        </div>

        <div
          className={`rounded-xl bg-slate-50 p-3 ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

/* =========================
   MINI STATUS CARD
========================= */
const MiniStatusCard = ({
  title,
  value,
  color,
  icon,
}) => {
  const styles = {
    orange:
      "border-orange-200 text-orange-500 bg-orange-50",
    blue: "border-blue-200 text-blue-500 bg-blue-50",
    green:
      "border-emerald-200 text-emerald-500 bg-emerald-50",
    violet:
      "border-violet-200 text-violet-500 bg-violet-50",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div
            className={`mb-3 inline-flex rounded-lg border p-2 ${styles[color]}`}
          >
            {icon}
          </div>

          <p className="text-sm text-slate-500">{title}</p>
        </div>

        <h2 className="text-2xl font-semibold text-slate-800">
          {value}
        </h2>
      </div>
    </div>
  );
};

export default TransactionReview;