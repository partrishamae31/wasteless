import React from "react";
import {
  Download,
  CheckCircle2,
  FileText,
  CalendarDays,
} from "lucide-react";

const ComplianceReport = () => {
  const stats = [
    { label: "Total Users", value: "1,248" },
    { label: "Active Users", value: "390" },
    { label: "Total Transactions", value: "285" },
    { label: "Active Listings", value: "342" },
    { label: "Verified Shops", value: "87" },
    { label: "Devices Cataloged", value: "456" },
  ];

  const submittedReports = [
    {
      title: "Monthly E-Waste Recovery Report",
      period: "Period: May 2025",
      submitted: "Submitted on June 1, 2025",
      status: "APPROVED",
    },
    {
      title: "Quarterly DENR Compliance Report",
      period: "Period: Q1 2025",
      submitted: "Submitted on April 5, 2025",
      status: "APPROVED",
    },
    {
      title: "Extended Producer Responsibility (EPR) Report",
      period: "Period: January - March 2025",
      submitted: "Submitted on April 1, 2025",
      status: "APPROVED",
    },
  ];

  const deadlines = [
    {
      title: "June Monthly Report",
      due: "Due Jul 1, 2025",
      days: "20 days left",
    },
    {
      title: "Q2 Quarterly Report",
      due: "Due Jul 5, 2025",
      days: "30 days left",
    },
    {
      title: "Semi-annual Sustainability Report",
      due: "Due Jul 15, 2025",
      days: "40 days left",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6 md:p-8">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">
          Compliance Reports
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Centralized monitoring dashboard for Valenzuela City E-waste Platform
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-slate-200 px-5 py-6 shadow-sm"
          >
            <h2 className="text-3xl font-bold text-[#111827]">
              {item.value}
            </h2>
            <p className="text-xs text-slate-500 mt-2">{item.label}</p>
          </div>
        ))}
      </div>

      {/* SYSTEM MONITORING */}
      <div className="bg-[#F2FAF5] border border-[#DCEFE2] rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h3 className="font-semibold text-[#1E293B]">
            System Monitoring Report
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Generate comprehensive platform performance and compliance report
          </p>
        </div>

        <button className="mt-4 md:mt-0 inline-flex items-center justify-center gap-2 bg-[#2387A0] hover:bg-[#1f7489] text-white text-sm font-medium px-5 py-3 rounded-xl transition-all">
          <Download size={16} />
          Generate Report
        </button>
      </div>

      {/* MINI STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="text-green-600" size={18} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Compliance Rate</p>
            </div>
          </div>

          <span className="text-2xl font-bold text-[#111827]">100%</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="text-blue-600" size={18} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Reports Submitted</p>
            </div>
          </div>

          <span className="text-2xl font-bold text-[#111827]">12</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <CalendarDays className="text-purple-600" size={18} />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Upcoming Deadlines
              </p>
            </div>
          </div>

          <span className="text-2xl font-bold text-[#111827]">3</span>
        </div>
      </div>

      {/* SUBMITTED REPORTS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[#1E293B] mb-5">
          Submitted Reports
        </h3>

        <div className="space-y-4">
          {submittedReports.map((report, index) => (
            <div
              key={index}
              className="border border-slate-200 rounded-xl px-5 py-4 flex items-start justify-between hover:bg-slate-50 transition"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FileText size={18} className="text-slate-600" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-[#1E293B] text-sm">
                      {report.title}
                    </h4>

                    <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {report.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    {report.period}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    {report.submitted}
                  </p>
                </div>
              </div>

              <button className="text-sm text-[#2387A0] hover:underline font-medium">
                Download
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* UPCOMING DEADLINES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[#1E293B] mb-5">
          Upcoming Reporting Deadlines
        </h3>

        <div className="space-y-4">
          {deadlines.map((deadline, index) => (
            <div
              key={index}
              className="border border-slate-200 rounded-xl px-5 py-4 flex items-start justify-between hover:bg-slate-50 transition"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <CalendarDays size={18} className="text-purple-600" />
                </div>

                <div>
                  <h4 className="font-medium text-[#1E293B] text-sm">
                    {deadline.title}
                  </h4>

                  <p className="text-xs text-slate-500 mt-2">
                    {deadline.due}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400 mb-2">
                  {deadline.days}
                </p>

                <button className="text-sm text-[#2387A0] hover:underline font-medium">
                  Prepare Report →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComplianceReport;