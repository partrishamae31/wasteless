import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Search,
  Filter,
  Package,
  Database,
  ArrowUpRight,
  ChevronDown,
  Clock,
  Tag,
  X,
  Trash2,
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

const HAZARDOUS_KEYWORDS = [
  "lead",
  "mercury",
  "lithium",
  "cadmium",
  "battery",
  "crt",
  "monitor",
];

const InventoryView = ({ userId }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // Track selected item for mockup

  useEffect(() => {
    fetchAcquiredItems();
  }, [userId]);

  const fetchAcquiredItems = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        id,
        amount,
        status,
        updated_at,
        listing:listing_id (
          device_model,
          condition,
          description
        ),
        seller:seller_id (full_name),
        buyer:harvester_id (full_name) 
      `,
      ) // Added join for buyer information
      .eq("harvester_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error.message);
    } else {
      setInventory(data || []);
    }
    setLoading(false);
  };

  const isHazardous = (item) => {
    const text =
      `${item.listing?.device_model} ${item.listing?.description} ${item.listing?.category}`.toLowerCase();
    return HAZARDOUS_KEYWORDS.some((keyword) => text.includes(keyword));
  };

  const handleDispose = async (item) => {
    const { error } = await supabase
      .from("disposal_logs") // New table for compliance tracking
      .insert([
        {
          harvester_id: userId,
          item_id: item.id,
          disposal_date: new Date().toISOString(),
          material_type: item.listing?.category,
          compliance_status: "verified",
        },
      ]);

    if (!error) {
      alert("Disposal activity logged successfully for compliance tracking.");
      setSelectedItem(null);
      fetchAcquiredItems();
    }
  };

  const ItemDetailModal = ({ item, onClose }) => {
    if (!item) return null;
    const hazardous = isHazardous(item);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div
            className={`p-8 text-white relative ${hazardous ? "bg-gradient-to-r from-orange-500 to-red-600" : "bg-gradient-to-r from-blue-500 to-purple-600"}`}
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold">
                {item.listing?.device_model}
              </h2>
              {hazardous && (
                <AlertTriangle size={20} className="animate-pulse" />
              )}
            </div>
            <p className="text-white/70 text-xs font-mono">
              ID: inv-{item.id.slice(0, 8)}
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* REQ-3: Dynamic Handling Guidelines for Hazardous Materials */}
            {hazardous && (
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                  <ShieldCheck size={16} /> Safe Handling Guidelines
                </div>
                <ul className="text-[11px] text-orange-600 space-y-1 list-disc pl-4">
                  <li>Do not puncture or incinerate this component.</li>
                  <li>
                    Store in a cool, dry place away from flammable materials.
                  </li>
                  <li>
                    Must be transported to a Valenzuela-certified TSD facility.
                  </li>
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Category
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-slate-700 font-medium">
                    {item.listing?.category || "Uncategorized"}
                  </p>
                  {hazardous && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Condition
                </p>
                <p className="text-slate-700 font-medium capitalize">
                  {item.listing?.condition || "Used"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Acquisition Value
              </p>
              <p className="text-xl font-bold text-slate-800">
                ₱{item.amount?.toLocaleString()}
              </p>
            </div>

            {/* Transaction Card */}
            <div
              className={`border rounded-2xl p-6 space-y-4 ${hazardous ? "bg-orange-50/30 border-orange-100" : "bg-blue-50/50 border-blue-100"}`}
            >
              <h4
                className={`font-bold text-sm ${hazardous ? "text-orange-900" : "text-blue-900"}`}
              >
                Transaction Details
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID</span>
                  <span className="font-mono font-bold text-slate-700">
                    T-{item.id.slice(0, 5).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Seller Source</span>
                  <span className="font-bold text-slate-700">
                    {item.seller?.full_name || "Unknown Seller"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Acquired Date</span>
                  <span className="font-bold text-slate-700">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 pt-4">
              {/* REQ-4: Log Disposal Action for Compliance Tracking */}
              <button
                onClick={() => handleDispose(item)}
                className="flex-[2] py-3 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-shadow shadow-lg shadow-emerald-200"
              >
                <ClipboardList size={14} /> Log Disposal Activity
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto p-4">
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Top Stats - Compliance Aware */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Active Inventory
            </p>
            <h3 className="text-3xl font-black text-slate-700">
              {inventory.length}
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
            <Package size={24} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-red-50 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
              Hazardous Flags
            </p>
            <h3 className="text-3xl font-black text-red-600">
              {/* REQ-2: Dynamic filtering for hazardous count */}
              {inventory.filter((item) => isHazardous(item)).length}
            </h3>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by device name, model, or toxins..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#769c2d]/10"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="px-5 py-3.5 bg-white border border-slate-200 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
          <Clock size={16} /> Newest First <ChevronDown size={14} />
        </button>

        <button className="px-5 py-3.5 bg-[#769c2d] text-white rounded-xl flex items-center gap-2 text-xs font-bold shadow-lg shadow-[#769c2d]/20">
          <Filter size={16} /> Hazardous Only
        </button>
      </div>

      {/* Inventory List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="font-bold text-slate-700 text-sm">
            Inventory Items{" "}
            <span className="text-slate-400 ml-1">({inventory.length})</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            Monitoring e-waste compliance
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {inventory.map((item) => {
            const hazardous = isHazardous(item); //
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-8 hover:bg-slate-50/40 transition-all flex justify-between items-start cursor-pointer group border-l-4 ${
                  hazardous
                    ? "border-orange-500 bg-orange-50/20"
                    : "border-transparent"
                }`}
              >
                <div className="flex gap-6">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      hazardous
                        ? "bg-orange-100 text-orange-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {hazardous ? (
                      <AlertTriangle size={20} />
                    ) : (
                      <Package size={20} />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-slate-800 text-base">
                        {item.listing?.device_model}
                      </h4>
                      {hazardous && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black rounded uppercase tracking-tighter animate-pulse">
                          Hazardous material
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-bold text-slate-400">
                      {item.listing?.category} • ₱
                      {item.amount?.toLocaleString()}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-500">
                      <ArrowUpRight size={12} />
                      Source: {item.seller?.full_name}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <span className="flex items-center gap-1.5 px-3 py-1 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-white">
                        <Tag size={10} /> {item.listing?.category}
                      </span>
                      {hazardous ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 border border-orange-200 rounded-lg text-[9px] font-bold text-orange-600 uppercase tracking-tighter bg-orange-50">
                          <ShieldCheck size={10} /> Safety Protocol Req.
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-white">
                          <Clock size={10} /> {item.listing?.condition}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-black text-slate-700">
                    ₱{item.amount?.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Acquisition Price
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
