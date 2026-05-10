import React from "react";
import {
  FileText,
  Download,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Calendar,
  ChevronRight,
  BarChart3,
  Users,
  Activity,
  Database,
  ClipboardList,
} from "lucide-react";

const topStats = [
  {
    title: "Total Platform Users",
    value: "1,248",
    icon: Users,
    status: "+12",
    color: "text-emerald-500",
  },
  {
    title: "Active Transactions",
    value: "87",
    icon: Activity,
    status: "+3%",
    color: "text-emerald-500",
  },
  {
    title: "System Uptime",
    value: "99.8%",
    icon: ShieldCheck,
    status: "+0.2%",
    color: "text-violet-500",
  },
  {
    title: "Active Barangays",
    value: "18/33",
    icon: Database,
    status: "55%",
    color: "text-orange-500",
  },
];

const summaryCards = [
  {
    title: "Compliance Rate",
    value: "100%",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    title: "Reports Submitted",
    value: "12",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    title: "Upcoming Deadlines",
    value: "3",
    icon: Calendar,
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    title: "Audit Rating",
    value: "A+",
    icon: ShieldCheck,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
];

const reports = [
  {
    title: "Monthly E-waste Recovery Report",
    period: "Period: May 2026",
    status: "VERIFIED",
    stats: [
      { label: "Recovery", value: "555 kg" },
      { label: "Transactions", value: "63" },
      { label: "Outbound", value: "448 kg" },
    ],
  },
  {
    title: "Quarterly DENR Compliance Report",
    period: "Period: Q1 2026",
    status: "VERIFIED",
    stats: [
      { label: "Recovery", value: "1,250 kg" },
      { label: "Transactions", value: "156" },
      { label: "Outbound", value: "1,120 kg" },
    ],
  },
  {
    title: "Extended Producer Responsibility (EPR)",
    period: "Period: Jan-May 2026",
    status: "VERIFIED",
    stats: [
      { label: "Recovery", value: "1,850 kg" },
      { label: "Compliance", value: "100%" },
      { label: "Partners", value: "24 Shops" },
    ],
  },
];

const deadlines = [
  {
    title: "Annual Planning Report",
    due: "Due: May 30, 2026",
    left: "19 days left",
  },
  {
    title: "Q2 Quarterly Report",
    due: "Due: June 30, 2026",
    left: "49 days left",
  },
  {
    title: "Semi-annual Sustainability Report",
    due: "Due: July 15, 2026",
    left: "65 days left",
  },
];

const compliance = [
  {
    title: "Republic Act 9003",
    subtitle:
      "Ecological Solid Waste Management implementation and compliance.",
    progress: "100%",
  },
  {
    title: "Extended Producer Responsibility (EPR)",
    subtitle:
      "Electronic producer coordination and proper device disposal.",
    progress: "100%",
  },
  {
    title: "Data Privacy Act of 2012",
    subtitle:
      "Secure handling of user data and protected recovery operations.",
    progress: "98%",
  },
];

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}
  >
    {children}
  </div>
);

const ComplianceReport = () => {
  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="space-y-5">
        {/* HEADER */}
        <div>
          <h1 className="text-[22px] font-semibold text-slate-800">
            Compliance Reports
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Compliance monitoring and reporting dashboard overview
          </p>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {topStats.map((item, index) => (
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

        {/* REPORT ACTION */}
        <Card className="p-4 bg-[#EEF6FF] border-[#D8E9FF]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                System Monitoring Report
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Generate comprehensive compliance and monitoring reports.
              </p>
            </div>

            <button className="bg-sky-600 hover:bg-sky-700 transition-all text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
              <Download size={14} />
              Generate Report
            </button>
          </div>
        </Card>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {summaryCards.map((item, index) => (
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
              </div>
            </Card>
          ))}
        </div>

        {/* SUBMITTED REPORTS */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardList size={16} className="text-slate-500" />

            <h2 className="text-sm font-semibold text-slate-800">
              Submitted Reports
            </h2>
          </div>

          <div className="space-y-4">
            {reports.map((report, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <FileText size={18} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">
                          {report.title}
                        </h3>

                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">
                          {report.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1">
                        {report.period}
                      </p>
                    </div>
                  </div>

                  <button className="text-sky-600 text-xs font-medium flex items-center gap-1 hover:text-sky-700">
                    <Download size={14} />
                    Download
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
                  {report.stats.map((stat, idx) => (
                    <div key={idx}>
                      <p className="text-[11px] text-slate-400 font-medium uppercase">
                        {stat.label}
                      </p>

                      <h4 className="text-base font-semibold text-slate-800 mt-1">
                        {stat.value}
                      </h4>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* DEADLINES */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Clock3 size={16} className="text-violet-500" />

            <h2 className="text-sm font-semibold text-slate-800">
              Upcoming Reporting Deadlines
            </h2>
          </div>

          <div className="space-y-3">
            {deadlines.map((item, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                    <Calendar size={16} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-slate-800">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      {item.due}
                    </p>
                  </div>
                </div>

                <button className="text-xs text-sky-600 font-medium flex items-center gap-1">
                  {item.left}
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* COMPLIANCE */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={16} className="text-emerald-500" />

            <h2 className="text-sm font-semibold text-slate-800">
              National E-waste Policy Compliance
            </h2>
          </div>

          <div className="space-y-4">
            {compliance.map((item, index) => (
              <div
                key={index}
                className="border border-emerald-100 bg-emerald-50 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                      {item.subtitle}
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-emerald-600">
                    {item.progress}
                  </span>
                </div>

                <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden mt-4">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: item.progress }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* FOOTER */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>

            <div className="flex-1">
              <h2 className="text-sm font-semibold text-emerald-800">
                Community Program Impact
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
                <div>
                  <p className="text-xs text-emerald-600 uppercase font-medium">
                    Electronic Waste Collected
                  </p>

                  <h3 className="text-3xl font-semibold text-emerald-700 mt-2">
                    2.1 Tons
                  </h3>

                  <p className="text-xs text-emerald-500 mt-1">
                    Since project launch
                  </p>
                </div>

                <div>
                  <p className="text-xs text-emerald-600 uppercase font-medium">
                    Active Partner Retailers
                  </p>

                  <h3 className="text-3xl font-semibold text-emerald-700 mt-2">
                    3,420
                  </h3>

                  <p className="text-xs text-emerald-500 mt-1">
                    Verified recovery points
                  </p>
                </div>

                <div>
                  <p className="text-xs text-emerald-600 uppercase font-medium">
                    Participation Growth
                  </p>

                  <h3 className="text-3xl font-semibold text-emerald-700 mt-2">
                    +28%
                  </h3>

                  <p className="text-xs text-emerald-500 mt-1">
                    Compared to last quarter
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceReport;