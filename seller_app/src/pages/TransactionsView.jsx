import React, { useState } from "react";
import { supabase } from "../supabaseClient"; // Add this line
import {
  MessageSquare,
  XCircle,
  Check,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  Star,
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

  const handleRatingSubmit = async (ratingData) => {
    if (!session?.user) {
      alert("You must be logged in to submit a review.");
      return;
    }

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
          comment: comment, // Use the state variable
        },
      ]);

      if (error) throw error;

      alert("Thank you! Your review has been submitted.");
      setIsRatingModalOpen(false);
    } catch (err) {
      console.error("Error submitting review:", err.message);
      alert("Failed to submit rating: " + err.message);
    }
  };
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          {/* Purple Header verbatim from image_94e933.png */}
          <div className="bg-[#8b5cf6] p-8 text-white relative text-center">
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
              How was your transaction with {transaction.seller?.full_name}?
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

            {/* Recommendation Toggle */}
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
                className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20"
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
              onClick={() =>
                handleRatingSubmit({
                  ...ratings,
                  recommend,
                })
              }
              disabled={recommend === null || ratings.overall === 0}
              className="flex-[2] py-4 bg-[#3285a1] disabled:bg-slate-300 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
            >
              Submit Rating
            </button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="flex gap-8 h-[800px] animate-in fade-in duration-500">
      {/* Left Sidebar: Active Transactions List */}
      <div className="w-1/3 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
          Active Transactions
        </h2>
        {transactions.map((tx) => {
          const config = getStatusConfig(tx.status);
          const isActive = selectedTransaction?.id === tx.id;

          return (
            <button
              key={tx.id}
              onClick={() => onSelect(tx)}
              className={`w-full text-left p-5 rounded-[2rem] border-2 transition-all duration-200 ${
                isActive
                  ? "border-[#769c2d] bg-white shadow-xl shadow-slate-200/50 scale-[1.02]"
                  : "border-transparent bg-white hover:border-slate-100 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-sm text-slate-800 truncate pr-2">
                  {tx.listing?.device_model}
                </h3>
                <span
                  className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter ${config.color}`}
                >
                  {config.label}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mb-2">
                Seller: {tx.seller?.full_name || "Unverified Seller"}
              </p>
              <p className="text-base font-black text-[#3285a1]">
                ₱{tx.amount?.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-[9px] font-bold text-slate-300 uppercase">
                <MessageSquare size={10} /> 1 message
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Content: Details */}
      {selectedTransaction ? (
        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm">
          {/* Header Area */}
          <div className="bg-[#3285a1] p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black">
                  {selectedTransaction.listing?.device_model}
                </h2>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">
                  ID: T00{selectedTransaction.id?.slice(0, 4)}
                </p>
              </div>
              <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                {getStatusConfig(selectedTransaction.status).label}
              </span>
            </div>
          </div>

          <div className="p-10 space-y-10 overflow-y-auto flex-1">
            {/* Stepper Timeline - High Fidelity */}
            <div className="relative px-4">
              <div className="absolute top-4 left-10 right-10 h-[2px] bg-slate-100"></div>
              <div
                className="absolute top-4 left-10 h-[2px] bg-[#769c2d] transition-all duration-500"
                style={{
                  width:
                    selectedTransaction.status === "completed"
                      ? "100%"
                      : selectedTransaction.status === "meetup_scheduled"
                        ? "50%"
                        : "0%",
                }}
              ></div>

              <div className="flex justify-between relative z-10">
                {["Pending", "Scheduled Meetup", "Completed"].map((step, i) => {
                  // Logic to determine if step is past or current
                  const isPast =
                    i === 0 ||
                    (i === 1 && selectedTransaction.status !== "pending") ||
                    (i === 2 && selectedTransaction.status === "completed");

                  return (
                    <div
                      key={step}
                      className="flex flex-col items-center gap-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ...`}
                      >
                        {isPast ? (
                          <Check size={16} strokeWidth={3} />
                        ) : (
                          <div className="w-2 h-2 bg-slate-200 rounded-full" />
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase tracking-tighter ${isPast ? "text-slate-800" : "text-slate-300"}`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Specific Cards */}
            {selectedTransaction.status === "meetup_scheduled" && (
              <div className="bg-purple-50/50 border border-purple-100 rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase">
                  <Calendar size={16} /> Meetup Scheduled
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <MapPin className="text-slate-300" size={18} />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Location
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedTransaction.barangay || "Location not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="text-slate-300" size={18} />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Date & Time
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedTransaction.meetup_date
                          ? `${new Date(selectedTransaction.meetup_date).toLocaleDateString()} at ${selectedTransaction.meetup_time}`
                          : "TBA"}
                      </p>
                    </div>
                  </div>
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

            {/* Messages Feed Mockup */}
            <div className="pt-6 border-t border-slate-50">
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-6">
                Messages
              </h4>
              <div className="bg-slate-50/50 p-6 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400">
                  Accepted bid of ₱
                  {selectedTransaction.amount?.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-300 mt-1">
                  Transaction history and logs appear here
                </p>
              </div>
            </div>
          </div>
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
