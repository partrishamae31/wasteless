import React from "react";
import {
  Search,
  Bell,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Monitor,
  Wifi,
  ShieldCheck,
  Layers3,
} from "lucide-react";

const stats = [
  {
    title: "PCs",
    value: "1,248",
    color: "text-cyan-500",
    icon: Monitor,
  },
  {
    title: "Active Live",
    value: "342",
    color: "text-emerald-500",
    icon: Wifi,
  },
  {
    title: "Verified Nodes",
    value: "87",
    color: "text-violet-500",
    icon: ShieldCheck,
  },
  {
    title: "Queue Capacity",
    value: "456",
    color: "text-orange-500",
    icon: Layers3,
  },
];

const devices = [
  {
    name: "Apple iPhone 13",
    tag: "Verified",
    price: "$15,000",
    market: "$2,500",
    specs: [
      ["Display", "6.1 OLED"],
      ["Memory", "4GB"],
      ["Rear Camera", "12MP"],
      ["OS", "iOS 17"],
    ],
  },
  {
    name: "Samsung Galaxy S20",
    tag: "Verified",
    price: "$15,000",
    market: "$2,200",
    specs: [
      ["Processor", "Snapdragon 865"],
      ["RAM", "8GB"],
      ["Battery", "4500mAh"],
      ["OS", "Android 13"],
    ],
  },
  {
    name: "Dell Latitude 5400",
    tag: "Business",
    price: "$25,000",
    market: "$3,200",
    specs: [
      ["CPU", "Intel i5"],
      ["Memory", "16GB"],
      ["SSD", "512GB"],
      ["Display", "14 FHD"],
    ],
  },
  {
    name: "Apple iPhone 15",
    tag: "Premium",
    price: "$18,000",
    market: "$3,599",
    specs: [
      ["Processor", "A16"],
      ["Camera", "48MP"],
      ["Battery", "4200mAh"],
      ["OS", "iOS 18"],
    ],
  },
  {
    name: "HP EliteBook 840",
    tag: "Business",
    price: "$22,000",
    market: "$3,500",
    specs: [
      ["CPU", "Intel i7"],
      ["Memory", "16GB"],
      ["Display", "14 IPS"],
      ["Storage", "1TB SSD"],
    ],
  },
  {
    name: "Apple iPad Pro",
    tag: "Tablet",
    price: "$12,000",
    market: "$5,000",
    specs: [
      ["Chipset", "Apple M2"],
      ["Display", "11 Liquid Retina"],
      ["Storage", "256GB"],
      ["Battery", "7600mAh"],
    ],
  },
];

const DeviceCard = ({ device }) => {
  return (
    <div className="bg-white border border-[#EEF1F6] rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
      {/* HEADER */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[15px] text-[#111827]">
              {device.name}
            </h3>

            <span className="text-[10px] px-2 py-1 rounded-full bg-violet-100 text-violet-600 font-medium">
              {device.tag}
            </span>
          </div>

          <p className="text-[11px] text-[#9CA3AF] mt-1">
            Hardware Database
          </p>
        </div>

        <button className="text-[#9CA3AF] hover:text-[#111827]">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* PRICE */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#9CA3AF]">Price</p>
          <p className="font-bold text-[#22C55E] text-lg">{device.price}</p>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-[#9CA3AF]">Market Value</p>
          <p className="font-semibold text-[#F97316]">{device.market}</p>
        </div>
      </div>

      {/* SPECS */}
      <div className="space-y-3">
        {device.specs.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between text-[12px]"
          >
            <span className="text-[#9CA3AF]">{label}</span>

            <span className="font-medium text-[#111827]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DeviceDatabase = () => {
  return (
    <div className="min-h-screen bg-[#F4F7FC]">
      {/* TOPBAR */}
      <div className="bg-white border-b border-[#EEF1F6] px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#111827]">
            Device Database
          </h1>

          <p className="text-sm text-[#9CA3AF] mt-1">
            Manage your device inventory and hardware specifications
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* SEARCH */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              size={16}
            />

            <input
              placeholder="Search by brand or model..."
              className="w-[280px] h-11 bg-[#F8FAFC] border border-[#EEF1F6] rounded-xl pl-11 pr-4 text-sm outline-none focus:border-violet-500"
            />
          </div>

          <button className="w-11 h-11 rounded-xl border border-[#EEF1F6] bg-white flex items-center justify-center">
            <Bell size={18} className="text-[#6B7280]" />
          </button>

          <button className="bg-violet-600 hover:bg-violet-700 transition-all text-white h-11 px-5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-violet-500/20">
            <Plus size={16} />
            Add Device
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8">
        {/* STATS */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-[#EEF1F6] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center ${item.color}`}
                  >
                    <Icon size={20} />
                  </div>

                  <span className="text-[11px] text-emerald-500 font-semibold">
                    +12%
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-[#111827]">
                  {item.value}
                </h3>

                <p className="text-sm text-[#9CA3AF] mt-1">{item.title}</p>
              </div>
            );
          })}
        </div>

        {/* FILTERS */}
        <div className="bg-white border border-[#EEF1F6] rounded-2xl p-5 mb-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <button className="px-4 h-10 rounded-xl bg-violet-600 text-white text-sm font-medium">
                All Types
              </button>

              {["Smartphones", "Laptops", "Tablets", "Verified"].map(
                (item) => (
                  <button
                    key={item}
                    className="px-4 h-10 rounded-xl bg-[#F8FAFC] border border-[#EEF1F6] text-[#6B7280] text-sm hover:border-violet-300"
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            <button className="flex items-center gap-2 text-sm text-[#6B7280]">
              Category
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* DEVICE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {devices.map((device) => (
            <DeviceCard key={device.name} device={device} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeviceDatabase;