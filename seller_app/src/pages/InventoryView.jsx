import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Search,
  Filter,
  Package,
  Database,
  MapPin,
  CheckCircle2,
} from "lucide-react";

const InventoryView = ({ userId }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcquiredItems();
  }, [userId]);

  const fetchAcquiredItems = async () => {
    // REQ-1: System logs items based on completed transactions
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
          category,
          condition,
          description
        ),
        seller:seller_id (full_name)
      `,
      )
      .eq("harvester_id", userId)
      .eq("status", "completed") // Only show finalized acquisitions
      .order("updated_at", { ascending: false });

    if (data) setInventory(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Stats matching image_df4c44.png */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Package size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Acquired Components
              </p>
              <h3 className="text-3xl font-black text-slate-800">
                {inventory.length}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-purple-100 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
              <Database size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Inventory Value
              </p>
              <h3 className="text-3xl font-black text-slate-800">
                ₱
                {(
                  inventory.reduce(
                    (acc, item) => acc + Number(item.amount),
                    0,
                  ) / 1000
                ).toFixed(1)}
                k
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - REQ-5: Data is validated by transaction integrity */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search your acquired components..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#769c2d]/20"
          />
        </div>
        <button className="px-6 py-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-2 text-sm font-bold text-slate-600">
          <Filter size={18} /> Filters
        </button>
      </div>

      {/* REQ-3: Categorized List based on Listing details */}
      <div className="bg-white rounded-[3rem] border border-slate-50 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 uppercase tracking-tight">
            Verified Inventory ({inventory.length})
          </h3>
          <span className="text-xs text-slate-400 font-bold italic">
            Automatically logged from completed bids
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {inventory.length > 0 ? (
            inventory.map((item) => (
              <div
                key={item.id}
                className="p-8 hover:bg-slate-50/50 transition-colors flex justify-between items-center"
              >
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-black text-slate-800">
                        {item.listing?.device_model}
                      </h4>
                      <span className="px-3 py-1 bg-blue-100 text-[#3285a1] rounded-full text-[9px] font-black uppercase">
                        {item.listing?.condition || "Acquired"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 mb-2">
                      {item.listing?.category} • Purchased from{" "}
                      {item.seller?.full_name}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <MapPin size={12} /> Logged on{" "}
                      {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-800">
                    ₱{item.amount?.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Acquisition Cost
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-20 text-center text-slate-300">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">
                No acquisitions found
              </p>
              <p className="text-[10px] mt-2">
                Complete a transaction to see items here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
