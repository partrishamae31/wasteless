import React, { useState } from "react";
import {
  Users,
  Activity,
  BadgeCheck,
  Cpu,
  MapPin,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

const DropOffPoints = () => {
    const [isModalOpen, setIsModalOpen] = useState(false); // State for the form modal
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

  const points = [
    {
      name: "Barangay 1 E-Waste Collection Center",
      barangay: "Barangay 1",
      address: "125 Main Street, Barangay 1",
      contact: "+63 912 345 6789",
      ngo: "Green Earth Foundation",
      hours: "Mon-Fri 8:00 AM - 5:00 PM",
      devices: "Smartphone, Laptop, Tablet, Monitor",
    },
    {
      name: "Marulas Green Hub",
      barangay: "Barangay Marulas",
      address: "456 Eco Avenue, Barangay Marulas",
      contact: "+63 923 456 6799",
      ngo: "EcoWaste Coalition",
      hours: "Mon-Sat 9:00 AM - 6:00 PM",
      devices: "Smartphone, Laptop, Tablet, Monitor",
    },
    {
      name: "Barangay 2 Recovery Center",
      barangay: "Barangay 2",
      address: "789 Recovery Road, Barangay 2",
      contact: "+63 934 567 6791",
      ngo: "Recycle PH",
      hours: "Tue-Sat 10:00 AM - 7:00 PM",
      devices: "Smartphone, Laptop, Tablet",
    },
    {
      name: "Karuhatan E-Waste Drop-off Center",
      barangay: "Karuhatan",
      address: "McArthur Highway, Karuhatan, Valenzuela City",
      contact: "+63 917 123 4567",
      ngo: "Valenzuela Green Initiative",
      hours: "Mon-Sat 8:00 AM - 6:00 PM",
      devices: "Smartphone, Laptop, Tablet, Monitor",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* PAGE TITLE */}
        <div className="mb-5">
          <h1 className="text-[26px] font-semibold text-slate-700">
            Drop-off Points
          </h1>
        </div>

        {/* STATS */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {stats.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="bg-white border border-[#E8EDF5] rounded-2xl px-5 py-4 shadow-sm"
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
        </div> */}

        {/* MAIN CARD */}
        <div className="bg-white border border-[#E8EDF5] rounded-3xl shadow-sm overflow-hidden">
          {/* HEADER */}
          <div className="px-6 py-5 border-b border-[#EEF2F7] flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <MapPin size={20} />
              </div>

              <div>
                <h2 className="text-[22px] font-semibold text-slate-700">
                  Drop-off Point Management
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Manage barangay-specific e-waste drop-off locations
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D7A7F] text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-lg shadow-teal-900/10 transition-all"
            >
              <Plus size={16} /> Add Drop-off Point
            </button>
          </div>
          {/* --- MODAL OVERLAY --- */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 pt-8 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">
                      Add New Drop-off
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Location Registration
                    </p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <form
                  className="p-8 space-y-5"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">
                      Drop-off Point Name
                    </label>
                    <div className="relative">
                      <Building2
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="e.g. SM City North EDSA"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">
                        City/Region
                      </label>
                      <div className="relative">
                        <MapPin
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                          size={16}
                        />
                        <input
                          type="text"
                          placeholder="Valenzuela"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">
                        Operating Hours
                      </label>
                      <div className="relative">
                        <Clock
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                          size={16}
                        />
                        <input
                          type="text"
                          placeholder="08:00 - 20:00"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">
                      Detailed Address
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Street name, Building, Landmark..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#2D7A7F] hover:bg-[#246165] text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-teal-900/10 transition-all active:scale-[0.98]"
                    >
                      Confirm & Add Point
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full mt-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                      Cancel Registration
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CONTENT */}
          <div className="p-6">
            {/* TITLE */}
            <div className="mb-5">
              <h3 className="text-[15px] font-semibold text-slate-700">
                All Drop-off Points ({points.length})
              </h3>
            </div>

            {/* LIST */}
            <div className="space-y-4">
              {points.map((point, index) => (
                <div
                  key={index}
                  className="bg-[#FCFDFE] border border-[#E8EDF5] rounded-2xl p-5 hover:shadow-sm transition"
                >
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                    {/* LEFT SIDE */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-[15px] font-semibold text-slate-700">
                            {point.name}
                          </h4>

                          <p className="text-sm text-slate-400 mt-1">
                            {point.barangay}
                          </p>
                        </div>

                        {/* ACTIONS MOBILE */}
                        <div className="flex xl:hidden items-center gap-2">
                          <button className="text-slate-400 hover:text-blue-500 transition">
                            <Pencil size={15} />
                          </button>

                          <button className="text-slate-400 hover:text-red-500 transition">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                        {/* COLUMN 1 */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase mb-1">
                              Address
                            </p>

                            <p className="text-sm text-slate-700">
                              {point.address}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase mb-1">
                              Contact
                            </p>

                            <p className="text-sm text-slate-700">
                              {point.contact}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase mb-1">
                              NGO Partner
                            </p>

                            <p className="text-sm text-slate-700">
                              {point.ngo}
                            </p>
                          </div>
                        </div>

                        {/* COLUMN 2 */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase mb-1">
                              Operating Hours
                            </p>

                            <p className="text-sm text-slate-700">
                              {point.hours}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase mb-1">
                              Accepted Devices
                            </p>

                            <p className="text-sm text-slate-700">
                              {point.devices}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS DESKTOP */}
                    <div className="hidden xl:flex items-center gap-3 pt-1">
                      <button className="text-slate-400 hover:text-blue-500 transition">
                        <Pencil size={16} />
                      </button>

                      <button className="text-slate-400 hover:text-red-500 transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropOffPoints;
