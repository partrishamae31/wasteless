import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  MessageSquare,
  XCircle,
  Check,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  Star,
  Send,
} from "lucide-react";

const TransactionsView = ({
  transactions = [],
  selectedTransaction,
  onSelect,
  handleCompleteHandover,
  session,
}) => {
  // Helper to determine status styling
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [comment, setComment] = useState("");

  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
        return {
          label: "Completed",
          color: "bg-emerald-100 text-emerald-600",
          theme: "#769c2d",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: "bg-red-100 text-red-500",
          theme: "#ef4444",
        };
      case "meetup_scheduled":
        return {
          label: "Scheduled Meetup",
          color: "bg-purple-100 text-purple-600",
          theme: "#3285a1",
        };
      case "pending":
      default:
        return {
          label: "Pending",
          color: "bg-orange-100 text-orange-500",
          theme: "#f97316",
        };
    }
  };
  const handleRatingSubmit = async (ratingData) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase.from("reviews").insert([
        {
          transaction_id: selectedTransaction.id,
          seller_id: selectedTransaction.seller_id,
          reviewer_id: session.user.id,
          communication_rating: ratingData.communication,
          punctuality_rating: ratingData.punctuality,
          condition_rating: ratingData.condition,
          overall_rating: ratingData.overall,
          recommend: ratingData.recommend,
          comment: comment,
        },
      ]);
      if (error) throw error;
      setIsRatingModalOpen(false);
    } catch (err) {
      console.error(err.message);
    }
  };
  const RatingModal = ({ transaction, onClose }) => {
    const [ratings, setRatings] = useState({
      communication: 0,
      punctuality: 0,
      condition: 0,
      overall: 0,
    });
    const [recommend, setRecommend] = useState(null);

    const StarRow = ({ label, sublabel, category }) => (
      <div className="space-y-1">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm font-bold text-slate-700">{label}</p>
            <p className="text-[10px] text-slate-400 font-medium">{sublabel}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() =>
                setRatings((prev) => ({ ...prev, [category]: star }))
              }
              className={`transition-all ${ratings[category] >= star ? "text-amber-400" : "text-slate-200"}`}
            >
              <Star
                size={24}
                fill={ratings[category] >= star ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
      </div>
    );

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="p-6">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="bg-[#3285a1] p-8 text-white relative text-center">
            <button
              onClick={onClose}
              className="absolute right-6 top-6 hover:bg-white/20 rounded-full p-1"
            >
              <XCircle size={20} />
            </button>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Rate Your Experience
            </h2>
            <p className="text-white/80 text-[10px] font-bold uppercase mt-1">
              How was your transaction with{" "}
              {transaction.seller?.full_name || "the seller"}?
            </p>
          </div>

          <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
            <StarRow
              label="Communication"
              sublabel="Responsiveness and clarity"
              category="communication"
            />
            <StarRow
              label="Punctuality"
              sublabel="On-time for meetup"
              category="punctuality"
            />
            <StarRow
              label="Item Condition"
              sublabel="Item matched description"
              category="condition"
            />
            <StarRow
              label="Overall Experience"
              sublabel="Overall satisfaction"
              category="overall"
            />

            <div className="space-y-3 pt-2">
              <p className="text-xs font-black text-slate-700 uppercase">
                Would you recommend this seller?{" "}
                <span className="text-red-500">*</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRecommend(true)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${recommend === true ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400"}`}
                >
                  <Check size={14} /> Yes, Recommend
                </button>
                <button
                  onClick={() => setRecommend(false)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${recommend === false ? "border-red-500 bg-red-50 text-red-700" : "border-slate-100 text-slate-400"}`}
                >
                  <XCircle size={14} /> No, Don't
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black text-slate-700 uppercase">
                Additional Feedback (Optional)
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3285a1]/20"
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 font-black text-slate-400 text-[10px] uppercase"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRatingSubmit({ ...ratings, recommend })}
              disabled={recommend === null || ratings.overall === 0}
              className="flex- py-4 bg-[#769c2d] disabled:bg-slate-300 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
            >
              Submit Rating
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  };
  return (
    <div className="flex gap-8 h-[800px] animate-in fade-in duration-500 bg-transparent">
      
      {/* Left Sidebar */}
      <div className="w-1/3 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
          Active Transactions
        </h2>
        {transactions.map((tx) => (
          <button
            key={tx.id}
            onClick={() => onSelect(tx)}
            className={`w-full text-left p-6 rounded-[1.5rem] border-2 transition-all duration-300 ${
              selectedTransaction?.id === tx.id
                ? "border-[#769c2d] bg-white shadow-xl scale-[1.02]"
                : "border-transparent bg-white hover:border-slate-100 shadow-sm"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-sm text-slate-800">
                {tx.listing?.device_model || "MacBook Pro 2019"}
              </h3>
              <span className="text-[8px] font-black px-2 py-1 rounded-lg uppercase bg-purple-100 text-purple-600">
                Completed
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-1">
              Seller: {tx.seller?.full_name || "Pedro Garcia"}
            </p>
            <p className="text-lg font-black text-[#3285a1]">
              ₱{tx.amount?.toLocaleString() || "24,000"}
            </p>
            <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
              <MessageSquare size={10} /> {tx.message_count || 4} messages
            </p>
          </button>
        ))}
      </div>

      {/* Right Content: Details */}
      {selectedTransaction ? (
        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm">
          {/* Header Area */}
          <div className="bg-[#1a4f63] p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black">
                  {selectedTransaction.listing?.device_model ||
                    "MacBook Pro 2019"}
                </h2>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">
                  ID: T00{selectedTransaction.id?.slice(0, 4) || "1"}
                </p>
              </div>
              <span
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${getStatusConfig(selectedTransaction.status).color}`}
              >
                {getStatusConfig(selectedTransaction.status).label}
              </span>
            </div>
          </div>

          <div className="p-10 space-y-8 overflow-y-auto flex-1">
            {/* Stepper Timeline */}
            <div className="relative px-4 pb-4">
              <div className="absolute top-4 left-10 right-10 h-[2px] bg-slate-100"></div>
              <div
                className="absolute top-4 left-10 h-[2px] bg-[#769c2d] transition-all duration-500"
                style={{
                  width:
                    selectedTransaction.status === "completed" ? "100%" : "50%",
                }}
              ></div>

              <div className="flex justify-between relative z-10">
                {["Bid Accepted", "Meetup Scheduled", "Meetup Scheduled"].map(
                  (step, i) => {
                    const isPast =
                      i <= (selectedTransaction.status === "completed" ? 2 : 1);
                    return (
                      <div key={i} className="flex flex-col items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${isPast ? "border-[#769c2d] text-[#769c2d]" : "border-slate-200"}`}
                        >
                          {isPast ? (
                            <Check size={16} strokeWidth={3} />
                          ) : (
                            <div className="w-2 h-2 bg-slate-200 rounded-full" />
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase tracking-tighter ${isPast ? "text-green-700" : "text-slate-300"}`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                  Seller
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {selectedTransaction.seller?.full_name || "Pedro Garcia"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                  Amount
                </p>
                <p className="text-xl font-black text-[#3285a1]">
                  ₱{selectedTransaction.amount?.toLocaleString() || "24,000"}
                </p>
              </div>
            </div>

            {/* Status Specific Cards */}
            {selectedTransaction.status === "meetup_scheduled" && (
              <div className="bg-[#f3e8ff] border border-purple-100 rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase">
                  <Calendar size={16} /> Meetup Scheduled
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex gap-3">
                    <MapPin className="text-slate-400" size={18} />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Location
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedTransaction.barangay ||
                          "Barangay Veinte Reales Hall"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="text-slate-400" size={18} />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Date & Time
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedTransaction.meetup_date
                          ? `${new Date(selectedTransaction.meetup_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${selectedTransaction.meetup_time}`
                          : "Thursday, April 30, 2026 at 14:00"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase">
                    Notes
                  </p>
                  <p className="text-xs text-slate-600">
                    Meet near the entrance
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() =>
                      handleCompleteHandover(selectedTransaction.id)
                    }
                    className="flex-1 bg-[#3285a1] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20"
                  >
                    Confirm Handover Complete
                  </button>
                  <button className="px-8 border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {selectedTransaction.status === "completed" && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-2 bg-white rounded-full text-[#769c2d]">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-800">
                      Transaction Completed
                    </h4>
                    <p className="text-xs font-bold text-emerald-600/70">
                      Completed on April 20, 2026
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRatingModalOpen(true)} // Trigger modal
                  className="w-full bg-[#ff4f38] hover:bg-[#e64430] transition-colors text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Star size={16} fill="white" /> Rate Seller
                </button>
              </div>
            )}

            {/* <div className="pt-6">
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-6">
                Messages
              </h4>
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-bold text-slate-400">
                    Accepted bid of ₱
                    {selectedTransaction.amount?.toLocaleString() || "24,000"}
                  </p>
                  <p className="text-[9px] text-slate-300">
                    Meetup scheduled at Barangay Veinte Reales Hall on April 30,
                    2026 at 14:00
                  </p>
                </div>

                <div className="flex flex-col items-start">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[80%]">
                    <p className="text-xs font-medium text-slate-700">
                      I have the display and keyboard ready for pickup
                    </p>
                  </div>
                  <span className="text-[9px] text-slate-300 mt-2 ml-1">
                    10:15 AM
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <div className="bg-[#769c2d] text-white p-4 rounded-2xl rounded-tr-none shadow-sm max-w-[80%]">
                    <p className="text-xs font-bold">
                      Great! See you on the 30th
                    </p>
                  </div>
                  <span className="text-[9px] text-slate-300 mt-2 mr-1">
                    11:02 AM
                  </span>
                </div>

                <div className="text-center pt-4">
                  <p className="text-[10px] text-slate-300 uppercase font-black">
                    Transaction is Completed
                  </p>
                  <button
                    onClick={() => setIsRatingModalOpen(true)}
                    className="text-[10px] text-[#3285a1] font-black uppercase mt-1 hover:underline"
                  >
                    Rate Seller Pedro Garcia
                  </button>
                </div>
              </div>
            </div> */}
          </div>

          {/* Message Input */}
          {/* <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3285a1]/20"
            />
            <button className="bg-slate-200 p-3 rounded-xl text-slate-400 hover:bg-slate-300 transition-colors">
              <Send size={20} />
            </button>
          </div> */}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 rounded-[2.5rem] border-2 border-dashed border-slate-100">
          <MessageSquare size={48} className="text-slate-100 mb-4" />
          <p className="text-slate-300 font-bold text-sm uppercase tracking-widest">
            Select a transaction
          </p>
        </div>
      )}

      {isRatingModalOpen && (
        <RatingModal
          transaction={selectedTransaction}
          onClose={() => setIsRatingModalOpen(false)}
        />
      )}
    </div>
  );
};

export default TransactionsView;
