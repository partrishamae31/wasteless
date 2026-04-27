import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ArrowLeft, MapPin, Package, Clock } from "lucide-react";

const MatchingListingsView = ({ alert, onBack }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .ilike("device_model", `%${alert.device_model}%`)
        .lte("asking_price", alert.max_price)
        .eq("condition", alert.condition);

      setMatches(data || []);
      setLoading(false);
    };

    fetchMatches();
  }, [alert]);

  return (
    <div className="animate-in fade-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Matches for "{alert.device_model}"
          </h2>
          <p className="text-[10px] font-black text-[#769c2d] uppercase tracking-widest">
            {matches.length} Results Found
          </p>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#769c2d]"></div>
        </div>
      ) : matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-white flex gap-6 hover:shadow-md transition-shadow"
            >
              {/* Image Placeholder */}
              <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 shrink-0">
                <Package size={32} strokeWidth={1.5} />
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-lg">
                    {item.device_model}
                  </h3>
                  <span className="text-[#3285a1] font-black text-lg">
                    ₱{item.asking_price}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <MapPin size={12} className="text-[#769c2d]" />{" "}
                    {item.location || "Valenzuela"}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Clock size={12} /> Just now
                  </span>
                </div>

                <button className="mt-4 w-full py-3 bg-[#f8fafc] text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#769c2d] hover:text-white transition-all">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100">
          <Package size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">
            No matching listings yet
          </p>
        </div>
      )}
    </div>
  );
};

export default MatchingListingsView;
