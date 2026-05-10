import React from "react";
import {
  Search,
  Filter,
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  MapPin,
  Calendar,
  Users,
  Activity,
  BadgeCheck,
  Database,
  Bell,
} from "lucide-react";

const DonatedDatabase = () => {
  const donations = [
    {
      id: "DON-001",
      item: "Nokia 3310",
      model: "Classic",
      category: "Smartphone",
      condition: "Working",
      donor: "Roberto Diaz",
      location: "Barangay Paso de Blas",
      date: "May 1, 2026",
      status: "Pending Pickup",
    },
    {
      id: "DON-002",
      item: "Samsung Galaxy S7",
      model: "SM-G930",
      category: "Smartphone",
      condition: "Defective",
      donor: "Maria Lopez",
      location: "Barangay Marulas",
      date: "Apr 28, 2026",
      status: "Collected",
    },
    {
      id: "DON-003",
      item: "HP Pavilion 15",
      model: "P15-CS3000",
      category: "Laptop",
      condition: "Parts-Only",
      donor: "Juan Reyes",
      location: "Barangay Karuhatan",
      date: "Apr 25, 2026",
      status: "Collected",
    },
    {
      id: "DON-004",
      item: "iPhone 7",
      model: "A1778",
      category: "Smartphone",
      condition: "Defective",
      donor: "Ana Santos",
      location: "Barangay Maysan",
      date: "Apr 22, 2026",
      status: "Processed",
    },
    {
      id: "DON-005",
      item: "Dell Inspiron 14",
      model: "5406",
      category: "Laptop",
      condition: "Working",
      donor: "Pedro Garcia",
      location: "Barangay Veinte Reales",
      date: "Apr 20, 2026",
      status: "Processed",
    },
    {
      id: "DON-006",
      item: "iPad Air 2",
      model: "A1566",
      category: "Tablet",
      condition: "Defective",
      donor: "Sofia Martinez",
      location: "Barangay Malinta",
      date: "Apr 18, 2026",
      status: "Processed",
    },
    {
      id: "DON-007",
      item: 'LG Monitor 24"',
      model: "24MK430H",
      category: "Monitor",
      condition: "Working",
      donor: "Carlos Fernandez",
      location: "Barangay Paso de Blas",
      date: "Apr 15, 2026",
      status: "Collected",
    },
  ];

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Smartphone":
        return (
          <Smartphone
            size={14}
            className="text-violet-500"
          />
        );

      case "Laptop":
        return (
          <Laptop size={14} className="text-violet-500" />
        );

      case "Tablet":
        return (
          <Tablet size={14} className="text-violet-500" />
        );

      default:
        return (
          <Monitor size={14} className="text-violet-500" />
        );
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Pending Pickup":
        return "bg-orange-100 text-orange-600";

      case "Collected":
        return "bg-blue-100 text-blue-600";

      case "Processed":
        return "bg-emerald-100 text-emerald-600";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] p-6 lg:p-8">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-slate-800">
          Donated Items Database
        </h1>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      </div>

      {/* MAIN PANEL */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* PANEL HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Donated Items Database
            </h2>

            <p className="text-sm text-slate-500">
              Track and manage all donated e-waste items
              across barangay hubs
            </p>
          </div>

          <button className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700">
            <Bell size={16} />
            Configure Reminders
          </button>
        </div>

        {/* SEARCH */}
        <div className="mt-5">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />

            <input
              type="text"
              placeholder="Search by device, model, or donor name"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-violet-500 focus:bg-white"
            />
          </div>
        </div>

        {/* FILTERS */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            <Filter size={14} />
            Filters
          </button>

          <button className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            All Categories
          </button>

          <button className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            All Barangays
          </button>

          <button className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            All Statuses
          </button>

          <button className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            All Conditions
          </button>

          <button className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            Date: Newest First
          </button>
        </div>

        {/* SUMMARY */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-5 lg:grid-cols-4">
          <SummaryCard
            value="7"
            label="Total Donations"
            color="text-slate-800"
          />

          <SummaryCard
            value="7"
            label="Filtered Results"
            color="text-violet-500"
          />

          <SummaryCard
            value="1"
            label="Pending Pickup"
            color="text-orange-500"
          />

          <SummaryCard
            value="3"
            label="Processed"
            color="text-emerald-500"
          />
        </div>

        {/* TABLE */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-3 py-4 font-semibold">
                  Item ID
                </th>

                <th className="px-3 py-4 font-semibold">
                  Device
                </th>

                <th className="px-3 py-4 font-semibold">
                  Category
                </th>

                <th className="px-3 py-4 font-semibold">
                  Condition
                </th>

                <th className="px-3 py-4 font-semibold">
                  Donor
                </th>

                <th className="px-3 py-4 font-semibold">
                  Location
                </th>

                <th className="px-3 py-4 font-semibold">
                  Donation Date
                </th>

                <th className="px-3 py-4 font-semibold">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {donations.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-100 text-sm hover:bg-slate-50"
                >
                  {/* ITEM ID */}
                  <td className="px-3 py-4 font-medium text-slate-700">
                    {item.id}
                  </td>

                  {/* DEVICE */}
                  <td className="px-3 py-4">
                    <div>
                      <p className="font-medium text-slate-800">
                        {item.item}
                      </p>

                      <p className="text-xs text-slate-400">
                        {item.model}
                      </p>
                    </div>
                  </td>

                  {/* CATEGORY */}
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      {getCategoryIcon(item.category)}

                      <span>{item.category}</span>
                    </div>
                  </td>

                  {/* CONDITION */}
                  <td className="px-3 py-4 text-slate-600">
                    {item.condition}
                  </td>

                  {/* DONOR */}
                  <td className="px-3 py-4 text-slate-600">
                    {item.donor}
                  </td>

                  {/* LOCATION */}
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin size={13} />

                      <span>{item.location}</span>
                    </div>
                  </td>

                  {/* DATE */}
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar size={13} />

                      <span>{item.date}</span>
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
   SUMMARY CARD
========================= */
const SummaryCard = ({
  value,
  label,
  color,
}) => {
  return (
    <div>
      <h3 className={`text-2xl font-semibold ${color}`}>
        {value}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {label}
      </p>
    </div>
  );
};

export default DonatedDatabase;