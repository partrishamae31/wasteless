import React from "react";
import {
  Users,
  Activity,
  Cpu,
  BadgeCheck,
  Gift,
  Settings2,
  History,
  Save,
} from "lucide-react";

const DonationManagement = () => {
  const stats = [
    {
      title: "Total Users",
      value: "1,248",
      growth: "+12%",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Active Listings",
      value: "342",
      growth: "+8%",
      icon: Activity,
      color: "text-green-500",
    },
    {
      title: "Verified Shops",
      value: "87",
      growth: "+18%",
      icon: BadgeCheck,
      color: "text-violet-500",
    },
    {
      title: "Devices Cataloged",
      value: "456",
      growth: "+22%",
      icon: Cpu,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* PAGE TITLE */}
        <div className="mb-5">
          <h1 className="text-[26px] font-semibold text-slate-700">
            Donation Management
          </h1>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {stats.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="bg-white border border-[#E7ECF3] rounded-2xl px-5 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] text-slate-400 mb-2">
                      {item.title}
                    </p>

                    <h2 className="text-3xl font-semibold text-slate-700">
                      {item.value}
                    </h2>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] font-medium text-emerald-500 mb-3">
                      {item.growth}
                    </p>

                    <div
                      className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${item.color}`}
                    >
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MAIN CARD */}
        <div className="bg-white border border-[#E8EDF5] rounded-3xl shadow-sm overflow-hidden">
          {/* HEADER */}
          <div className="px-6 py-5 border-b border-[#EEF2F7]">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Gift size={20} />
              </div>

              <div>
                <h2 className="text-[22px] font-semibold text-slate-700">
                  Donation Management
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Configure automatic donation reminders and view donation
                  history
                </p>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-[#EEF2F7] bg-[#FBFCFD]">
            <button className="flex-1 py-4 text-sm font-medium text-sky-600 border-b-2 border-sky-500 flex items-center justify-center gap-2">
              <Settings2 size={15} />
              Configuration
            </button>

            <button className="flex-1 py-4 text-sm text-slate-400 flex items-center justify-center gap-2">
              <History size={15} />
              Donation History (0)
            </button>
          </div>

          {/* CONTENT */}
          <div className="p-6">
            {/* SECTION TITLE */}
            <h3 className="text-[15px] font-semibold text-slate-700 mb-5">
              Reminder Thresholds
            </h3>

            {/* FORM */}
            <div className="space-y-5">
              {/* INPUT 1 */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  First Reminder (days after listing with no bids)
                </label>

                <input
                  type="text"
                  defaultValue="7"
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  Sellers will receive a donation reminder after this many days
                  without bids
                </p>
              </div>

              {/* INPUT 2 */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  Second Reminder (days after first reminder if dismissed)
                </label>

                <input
                  type="text"
                  defaultValue="3"
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  If seller dismisses first reminder, send another after this
                  many days
                </p>
              </div>

              {/* INPUT 3 */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  Auto-suggest Donation (total days)
                </label>

                <input
                  type="text"
                  defaultValue="14"
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  Total days before strongly suggesting donation as the best
                  option
                </p>
              </div>

              {/* TIMELINE PREVIEW */}
              <div className="bg-[#F3F8FF] border border-[#D8E8FF] rounded-2xl p-5">
                <h4 className="text-sm font-medium text-slate-700 mb-4">
                  Timeline Preview
                </h4>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600">
                      Day 0: Listing created
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span className="text-slate-600">
                      Day 7: First donation reminder sent
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-slate-600">
                      Day 10: Second reminder (if first dismissed)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span className="text-slate-600">
                      Day 14: Strong donation suggestion
                    </span>
                  </div>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex items-center gap-4 pt-2">
                <button className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition">
                  Reset
                </button>

                <button className="flex-1 h-11 rounded-xl bg-[#2C8CA3] hover:bg-[#257A8F] text-white text-sm font-medium transition flex items-center justify-center gap-2 shadow-sm">
                  <Save size={15} />
                  Save Configuration
                </button>
              </div>
            </div>
          </div>

          {/* FOOTER STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 pt-0">
            {[
              ["Total Donations", "0"],
              ["Pending Drop-off", "0"],
              ["Processed", "0"],
            ].map((item, index) => (
              <div
                key={index}
                className="bg-[#FCFDFE] border border-[#E9EEF5] rounded-2xl px-5 py-4"
              >
                <p className="text-[12px] text-slate-400 mb-2">{item[0]}</p>

                <h3 className="text-3xl font-semibold text-slate-700">
                  {item[1]}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationManagement;