import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  ArrowLeft,
  MapPin,
  Package,
  Clock,
  X,
  Gavel,
  MessageSquareText,
  XCircle,
} from "lucide-react";

const MatchingListingsView = ({ alerts, onBack }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [activeTab, setActiveTab] = useState("bid");
  const [successMessage, setSuccessMessage] = useState("");

  const [bidAmount, setBidAmount] = useState(0);
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const quickQuestions = [
    "Is the battery still functional?",
    "Can you provide more photos?",
    "Are all parts original?",
    "Is meetup available today?",
  ];

  const handleQuickSelect = (modifier) => {
    if (!selectedListing) return;

    const amount =
      selectedListing.asking_price + selectedListing.asking_price * modifier;

    setBidAmount(Math.round(amount));
  };
  const handleFormSubmit = async () => {
    if (!selectedListing) return;

    try {
      setSubmitting(true);

      // GET CURRENT USER
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You must be logged in.");
        return;
      }

      // PLACE BID
      if (activeTab === "bid") {
        const { error } = await supabase.from("bids").insert([
          {
            listing_id: selectedListing.id,
            seller_id: selectedListing.seller_id,
            harvester_id: user.id, // FIXED
            bid_amount: Number(bidAmount),
            message,
            status: "pending",
          },
        ]);

        if (error) {
          console.error("BID ERROR:", error);
          alert(error.message);
          return;
        }

        setSuccessMessage("Bid submitted successfully!");
      }

      // SEND MESSAGE
      if (activeTab === "question") {
        const { error } = await supabase.from("messages").insert([
          {
            listing_id: selectedListing.id,
            sender_id: user.id, // FIXED
            receiver_id: selectedListing.seller_id,
            content: question,
          },
        ]);

        if (error) {
          console.error(error);
          alert(error.message);
          return;
        }

        setSuccessMessage("Message sent successfully!");
      }

      setSelectedListing(null);
      setBidAmount(0);
      setMessage("");
      setQuestion("");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  console.log("SELECTED LISTING:", selectedListing);

  useEffect(() => {
    if (!alerts) return;

    const fetchMatches = async () => {
      setLoading(true);

      let query = supabase.from("listings").select("*").eq("status", "active");

      // DEVICE MODEL
      if (alerts?.device_model?.trim()) {
        query = query.ilike("device_model", `%${alerts.device_model.trim()}%`);
      }

      // PRICE
      if (
        alerts?.max_price !== null &&
        alerts?.max_price !== undefined &&
        alerts?.max_price !== ""
      ) {
        query = query.lte("asking_price", Number(alerts.max_price));
      }

      // CONDITION
      if (alerts?.condition && alerts.condition !== "Any Condition") {
        query = query.eq("condition", alerts.condition);
      }

      // BARANGAY
      if (
        alerts?.preferred_barangay &&
        alerts.preferred_barangay.trim() !== ""
      ) {
        query = query.ilike(
          "barangay",
          `%${alerts.preferred_barangay.trim()}%`,
        );
      }

      const { data, error } = await query;

      console.log("MATCH VIEW DATA:", data);
      console.log("MATCH VIEW ERROR:", error);

      setMatches(data || []);
      setLoading(false);
    };

    fetchMatches();
  }, [alerts]);

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
            Matches for "{alerts?.device_model || "Unknown Device"}"
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
                    {item.barangay || "Valenzuela"}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Clock size={12} /> Just now
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedListing(item);
                    setBidAmount(item.asking_price || 0);
                  }}
                  className="mt-4 w-full py-3 bg-[#769c2d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  View Listing
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
      {selectedListing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#f8fafc] w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-8 py-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#769c2d]">
                  MATCHED LISTING
                </p>

                <h2 className="text-3xl font-black text-slate-800 leading-tight">
                  {selectedListing.device_model}
                </h2>
              </div>

              <button
                onClick={() => setSelectedListing(null)}
                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            {successMessage && (
              <div className="mx-8 mt-6 animate-in slide-in-from-top fade-in duration-300">
                <div className="bg-emerald-500 text-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <MessageSquareText size={18} />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-widest opacity-80">
                      Success
                    </p>

                    <p className="font-bold text-sm">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8 p-8">
              {/* LEFT SIDE */}
              <div>
                {/* IMAGE */}
                <div className="aspect-square rounded-[2rem] overflow-hidden bg-white border border-slate-100">
                  {selectedListing.images &&
                  selectedListing.images.length > 0 ? (
                    <img
                      src={selectedListing.images[0]}
                      alt={selectedListing.device_model}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Package size={64} strokeWidth={1.5} />
                      <p className="mt-4 text-xs font-black uppercase tracking-widest">
                        No Image
                      </p>
                    </div>
                  )}
                </div>

                {/* EXTRA IMAGES */}
                {selectedListing.images &&
                  selectedListing.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      {selectedListing.images.map((img, idx) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-2xl overflow-hidden border border-slate-100"
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* RIGHT SIDE */}
              <div className="space-y-6">
                {/* PRICE */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Asking Price
                  </p>

                  <h1 className="text-5xl font-black text-[#3285a1] mt-2">
                    ₱{selectedListing.asking_price}
                  </h1>
                </div>

                {/* BADGES */}
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 rounded-2xl bg-[#769c2d]/10 text-[#769c2d] text-xs font-black uppercase tracking-widest">
                    {selectedListing.condition}
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-[#3285a1]/10 text-[#3285a1] text-xs font-black uppercase tracking-widest">
                    {selectedListing.category}
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-orange-100 text-orange-600 text-xs font-black uppercase tracking-widest">
                    {selectedListing.status}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 space-y-5">
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={18}
                      className="text-[#769c2d] mt-0.5 shrink-0"
                    />

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Barangay
                      </p>

                      <p className="font-bold text-slate-700">
                        {selectedListing.barangay || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock
                      size={18}
                      className="text-slate-400 mt-0.5 shrink-0"
                    />

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Listed On
                      </p>

                      <p className="font-bold text-slate-700">
                        {new Date(
                          selectedListing.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Scrap Value
                      </p>

                      <p className="text-xl font-black text-slate-700 mt-1">
                        ₱{selectedListing.scrap_value || 0}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Reusable Parts
                      </p>

                      <p className="text-xl font-black text-slate-700 mt-1">
                        ₱{selectedListing.reusable_part_value || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                    Description
                  </p>

                  <p className="text-sm leading-relaxed text-slate-600">
                    {selectedListing.description || "No description provided."}
                  </p>
                </div>

                {/* TABS */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab("bid")}
                    className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      activeTab === "bid"
                        ? "bg-[#769c2d] text-white shadow-lg"
                        : "bg-white text-slate-500 border border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Gavel size={14} />
                      Place Bid
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("question")}
                    className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      activeTab === "question"
                        ? "bg-[#3285a1] text-white shadow-lg"
                        : "bg-white text-slate-500 border border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <MessageSquareText size={14} />
                      Ask Seller
                    </div>
                  </button>
                </div>

                {/* BID TAB */}
                {activeTab === "bid" && (
                  <div className="bg-white rounded-[2rem] p-6 border border-slate-100 space-y-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        Quick Bid
                      </p>

                      <div className="grid grid-cols-3 gap-3">
                        {[0, 0.05, 0.1].map((modifier) => (
                          <button
                            key={modifier}
                            onClick={() => handleQuickSelect(modifier)}
                            className="py-3 rounded-2xl bg-slate-100 hover:bg-[#769c2d] hover:text-white transition-all text-xs font-black"
                          >
                            {modifier === 0 ? "Base" : `+${modifier * 100}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Bid Amount
                      </label>

                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 p-4 font-bold focus:outline-none focus:ring-2 focus:ring-[#769c2d]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Message
                      </label>

                      <textarea
                        placeholder="Add an optional message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 p-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-[#769c2d]"
                      />
                    </div>

                    <button
                      onClick={handleFormSubmit}
                      disabled={submitting}
                      className="w-full py-4 rounded-2xl bg-[#769c2d] hover:opacity-90 text-white text-xs font-black uppercase tracking-widest transition-all"
                    >
                      {submitting ? "Submitting..." : "Submit Bid"}
                    </button>
                  </div>
                )}

                {/* QUESTION TAB */}
                {activeTab === "question" && (
                  <div className="bg-white rounded-[2rem] p-6 border border-slate-100 space-y-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        Quick Questions
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {quickQuestions.map((q) => (
                          <button
                            key={q}
                            onClick={() => setQuestion(q)}
                            className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-[#3285a1] hover:text-white transition-all text-xs font-bold"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      placeholder="Ask seller something..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 p-4 h-36 resize-none focus:outline-none focus:ring-2 focus:ring-[#3285a1]"
                    />

                    <button
                      onClick={handleFormSubmit}
                      disabled={submitting}
                      className="w-full py-4 rounded-2xl bg-[#3285a1] hover:opacity-90 text-white text-xs font-black uppercase tracking-widest transition-all"
                    >
                      {submitting ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingListingsView;
