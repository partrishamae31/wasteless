import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
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
  Download,
  Leaf,
  FileText,
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
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [reviewedTransactionIds, setReviewedTransactionIds] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    const loadSubmittedReviews = async () => {
      if (!session?.user?.id || !transactions?.length) {
        setReviewedTransactionIds([]);
        return;
      }

      const transactionIds = transactions.map((tx) => tx.id).filter(Boolean);

      if (transactionIds.length === 0) {
        setReviewedTransactionIds([]);
        return;
      }

      setIsLoadingReviews(true);

      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("transaction_id")
          .eq("reviewer_id", session.user.id)
          .in("transaction_id", transactionIds);

        if (error) {
          console.error("Error loading submitted reviews:", error);
          return;
        }

        const reviewedIds = (data || []).map((review) => review.transaction_id);

        setReviewedTransactionIds(reviewedIds);
      } catch (err) {
        console.error("Unexpected error loading reviews:", err);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    loadSubmittedReviews();
  }, [transactions, session?.user?.id]);

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
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleRatingSubmit = async (ratingData) => {
    if (!session?.user?.id) {
      alert("You must be logged in to submit a rating.");
      return;
    }

    if (!selectedTransaction?.id) {
      alert("No transaction was selected.");
      return;
    }

    // Validate all star ratings
    if (
      !ratingData.communication ||
      !ratingData.punctuality ||
      !ratingData.condition ||
      !ratingData.overall
    ) {
      alert("Please provide all four ratings before submitting.");
      return;
    }

    // Validate recommendation
    if (ratingData.recommend === null) {
      alert("Please tell us whether you recommend this seller.");
      return;
    }

    if (isSubmittingRating) return;

    setIsSubmittingRating(true);

    try {
      const review = {
        transaction_id: selectedTransaction.id,
        seller_id: selectedTransaction.seller_id,
        reviewer_id: session.user.id,
        communication_rating: Number(ratingData.communication),
        punctuality_rating: Number(ratingData.punctuality),
        condition_rating: Number(ratingData.condition),
        overall_rating: Number(ratingData.overall),
        recommend: Boolean(ratingData.recommend),
        comment: ratingData.comment?.trim() || null,
      };

      console.log("Submitting review:", review);

      const { data, error } = await supabase
        .from("reviews")
        .insert(review)
        .select()
        .single();

      if (error) {
        console.error("Supabase review error:", error);

        if (error.code === "23505") {
          alert("You have already submitted a rating for this transaction.");

          // Mark it as reviewed in the UI even if the database
          // says it already exists.
          setReviewedTransactionIds((prev) =>
            prev.includes(selectedTransaction.id)
              ? prev
              : [...prev, selectedTransaction.id],
          );

          setIsRatingModalOpen(false);
          return;
        }

        throw error;
      }

      // Immediately update the UI without requiring a refresh.
      setReviewedTransactionIds((prev) =>
        prev.includes(selectedTransaction.id)
          ? prev
          : [...prev, selectedTransaction.id],
      );

      setIsRatingModalOpen(false);

      alert("Rating submitted successfully!");
    } catch (err) {
      console.error("Unexpected rating submission error:", err);

      alert(
        `Something went wrong while submitting your rating.\n\n${
          err?.message || "Unknown error"
        }`,
      );
    } finally {
      setIsSubmittingRating(false);
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
    const [comment, setComment] = useState("");

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
                type="button"
                disabled={isSubmittingRating}
                onClick={() =>
                  handleRatingSubmit({
                    ...ratings,
                    recommend,
                    comment,
                  })
                }
                className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all text-white ${
                  isSubmittingRating
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-[#769c2d] hover:bg-[#668827] active:scale-[0.98]"
                }`}
              >
                {isSubmittingRating ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ReceiptModal = ({ transaction, onClose }) => {
    if (!transaction) return null;

    const itemName =
      transaction.listing?.device_model ||
      transaction.device_model ||
      "Electronic Device";

    const sellerName =
      transaction.seller?.full_name || transaction.seller_name || "Seller";

    const buyerName =
      transaction.buyer?.full_name ||
      transaction.buyer_name ||
      session?.user?.user_metadata?.full_name ||
      "Buyer";

    const amount = transaction.amount || 0;

    const completedDate = transaction.completed_at
      ? new Date(transaction.completed_at)
      : new Date();

    const referenceNumber = `EWM-${String(transaction.id || "TRANSACTION")
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()}`;

    const formattedDate = completedDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const formattedTime = completedDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Estimated digital transaction carbon reduction.
    // You can replace this with a value stored in Supabase later.
    const carbonSaved = transaction.carbon_saved || 165;

    const handleSaveReceipt = () => {
  try {
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(50, 133, 161);
    doc.rect(0, 0, pageWidth, 45, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("WASTELESS MARKETPLACE", pageWidth / 2, 15, {
      align: "center",
    });

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Transaction Receipt", pageWidth / 2, 28, {
      align: "center",
    });

    doc.setFontSize(11);
    doc.text("Transaction Successful", pageWidth / 2, 38, {
      align: "center",
    });

    // Reset text color
    doc.setTextColor(30, 41, 59);

    let y = 65;

    const addRow = (label, value) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(label, 25, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(String(value), pageWidth - 25, y, {
        align: "right",
      });

      doc.setDrawColor(226, 232, 240);
      doc.line(25, y + 6, pageWidth - 25, y + 6);

      y += 18;
    };

    addRow("Reference No.", referenceNumber);
    addRow("Date", formattedDate);
    addRow("Time", formattedTime);
    addRow("Item", itemName);
    addRow("Seller", sellerName);
    addRow("Buyer", buyerName);

    // Amount
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Amount", 25, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(50, 133, 161);
    doc.text(
      `PHP ${Number(amount).toLocaleString()}`,
      pageWidth - 25,
      y,
      { align: "right" }
    );

    y += 30;

    // Eco section
    doc.setFillColor(89, 203, 163);
    doc.roundedRect(25, y, pageWidth - 50, 45, 5, 5, "F");

    doc.setTextColor(20, 83, 45);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${carbonSaved}g (gCO2e)`, 35, y + 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const ecoText =
      "By going digital, you reduce your carbon footprint from transportation, paper, and plastic.";

    const lines = doc.splitTextToSize(ecoText, pageWidth - 70);

    doc.text(lines, 35, y + 25);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "WasteLess Marketplace - Official Transaction Record",
      pageWidth / 2,
      275,
      { align: "center" }
    );

    // ACTUAL DOWNLOAD
    doc.save(`WasteLess-Receipt-${referenceNumber}.pdf`);
  } catch (error) {
    console.error("Failed to generate receipt:", error);
    alert("Unable to download the receipt. Please try again.");
  }
};

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#eaf4df] flex items-center justify-center">
                <CheckCircle size={25} className="text-[#769c2d]" />
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-700">
                  Transaction Receipt
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Official transaction record
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Receipt */}
          <div className="px-6 md:px-8 pb-6">
            <div className="rounded-[1.5rem] overflow-hidden border border-slate-100 shadow-lg">
              {/* Receipt Brand Header */}
              <div className="bg-gradient-to-r from-[#3285a1] to-[#14516d] text-white text-center p-8">
                <p className="text-[11px] tracking-[0.3em] text-white/70 font-medium">
                  WASTELESS MARKETPLACE
                </p>

                <h3 className="text-2xl md:text-3xl font-black mt-2">
                  Transaction Successful
                </h3>

                <div className="flex items-center justify-center gap-2 mt-3 text-[#a8d129]">
                  <CheckCircle size={20} />
                  <span className="font-bold">Completed</span>
                </div>
              </div>

              {/* Receipt Information */}
              <div className="p-6 md:p-8">
                <div className="space-y-0">
                  <div className="flex justify-between gap-6 py-4 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-400">
                      Reference No.
                    </span>

                    <span className="text-sm font-black text-[#14516d] text-right">
                      {referenceNumber}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6 py-4 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-400">Date</span>

                    <span className="text-sm font-bold text-slate-700 text-right">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6 py-4 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-400">Time</span>

                    <span className="text-sm font-bold text-slate-700 text-right">
                      {formattedTime}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6 py-4 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-400">Item</span>

                    <span className="text-sm font-bold text-slate-700 text-right">
                      {itemName}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6 py-4 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-400">Seller</span>

                    <span className="text-sm font-bold text-slate-700 text-right">
                      {sellerName}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6 py-4 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-400">Buyer</span>

                    <span className="text-sm font-bold text-slate-700 text-right">
                      {buyerName}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6 py-5">
                    <span className="text-sm text-slate-400">Amount</span>

                    <span className="text-xl font-black text-[#3285a1]">
                      ₱{Number(amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Eco Section */}
                <div className="mt-5 rounded-2xl bg-[#59cba3] p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <Leaf
                      size={38}
                      className="text-emerald-800 flex-shrink-0"
                    />

                    <div>
                      <p className="text-xl font-black text-emerald-900">
                        {carbonSaved}g
                        <span className="text-sm font-medium ml-1">
                          (gCO₂e)
                        </span>
                      </p>

                      <p className="text-sm text-emerald-900/80 leading-relaxed mt-1">
                        By going digital, you reduce your carbon footprint from
                        transportation, paper, and plastic.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition"
              >
                Close
              </button>

              <button
                onClick={handleSaveReceipt}
                className="flex-1 py-4 rounded-2xl bg-[#3285a1] text-white font-black text-xs uppercase tracking-widest hover:bg-[#286f88] transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10"
              >
                <Download size={16} />
                Save Receipt
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
              <div className="space-y-5">
                {/* Completed Status */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-2 bg-white rounded-full text-[#769c2d]">
                    <CheckCircle size={24} />
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-emerald-800">
                      Transaction Completed
                    </h4>

                    <p className="text-xs font-bold text-emerald-600/70">
                      Completed on{" "}
                      {selectedTransaction.completed_at
                        ? new Date(
                            selectedTransaction.completed_at,
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "April 20, 2026"}
                    </p>
                  </div>
                </div>

                {/* Official Receipt Card */}
                <button
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="w-full text-left border-2 border-dashed border-[#3285a1]/30 rounded-2xl overflow-hidden bg-white hover:border-[#3285a1] hover:shadow-md transition-all group"
                >
                  {/* Receipt Header */}
                  <div className="bg-[#3285a1] px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <FileText size={15} />

                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Official Receipt
                      </span>
                    </div>

                    <span className="text-[9px] text-white/60 uppercase">
                      WasteLess Marketplace
                    </span>
                  </div>

                  {/* Receipt Preview */}
                  <div className="px-5 py-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[10px] text-slate-400">Item</span>

                      <span className="text-[10px] font-black text-slate-700 text-right">
                        {selectedTransaction.listing?.device_model ||
                          "Electronic Device"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-[10px] text-slate-400">Seller</span>

                      <span className="text-[10px] font-bold text-slate-600 text-right">
                        {selectedTransaction.seller?.full_name || "Seller"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">
                        Amount Paid
                      </span>

                      <span className="text-sm font-black text-[#3285a1]">
                        ₱{selectedTransaction.amount?.toLocaleString() || "0"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      <span className="text-[9px] font-bold text-[#3285a1]">
                        Tap to view full receipt
                      </span>

                      <span className="text-[#3285a1] text-lg group-hover:translate-x-1 transition-transform">
                        ›
                      </span>
                    </div>
                  </div>
                </button>

                {/* Rate Seller */}
                {reviewedTransactionIds.includes(selectedTransaction.id) ? (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-emerald-100 text-emerald-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-200 cursor-default"
                  >
                    <CheckCircle size={16} />
                    Rating Submitted
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsRatingModalOpen(true)}
                    disabled={isLoadingReviews}
                    className={`w-full transition-all text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg ${
                      isLoadingReviews
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-orange-500/10"
                    }`}
                  >
                    <Star size={16} fill="white" />
                    {isLoadingReviews ? "Checking Rating..." : "Rate Seller"}
                  </button>
                )}
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
      {isReceiptModalOpen && (
        <ReceiptModal
          transaction={selectedTransaction}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}
    </div>
  );
};

export default TransactionsView;
