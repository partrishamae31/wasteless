import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { containsRestrictedContent } from "../utils/restrictedContentFilter";
import CreateListingModal from "./CreateListingModal"; // Adjust path as needed
import SellerMessages from "./SellerMessages"; // Ensure the filename matches
import DonationModal from "./DonationModal";
import SellerDonationTab from "./SellerDonationTab";
import SellerRepairShopsTab from "./SellerRepairShopsTab";
import banner from "./assets/banner.png";
import PlaceBidModal from "./PlaceBidModal";
import { jsPDF } from "jspdf";
import SiteFooter from "./SiteFooter";

import {
  X,
  Camera,
  Pencil,
  Mail,
  Phone,
  CheckCircle,
  Package,
  MessageSquare,
  ArrowLeftRight,
  CheckCheck,
  Plus,
  Clock,
  MapPin,
  Bell,
  User,
  Settings,
  Award,
  LogOut,
  Star,
  Calendar,
  Edit3,
  TrendingUp,
  Shield,
  ArrowUpRight,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Send,
  Check,
  Upload,
  Leaf,
  Gift,
  Wrench,
  Link2,
  Gavel,
  Download,
  Lock,
} from "lucide-react";
const isRepairTransaction = (transaction) => {
  const type = String(transaction?.transaction_type || "").trim().toLowerCase();
  return type === "repair" || (!type && Boolean(transaction?.repair_appointment_id));
};

const getRepairField = (transaction, field, fallback = "") => {
  if (!isRepairTransaction(transaction)) return fallback;
  const notes = transaction.notes || "";
  const regex = new RegExp(`(?:^|\\n)${field}\\s*:\\s*(.+?)(?=\\n[A-Za-z ]+\\s*:|$)`, "i");
  const match = notes.match(regex);
  return match?.[1]?.trim() || fallback;
};

const getRepairDevice = (transaction) =>
  getRepairField(transaction, "Device", transaction.device_model || "Electronic Device");

const getRepairCategory = (transaction) =>
  getRepairField(transaction, "Category", "Electronic Device");

const getRepairIssue = (transaction) =>
  getRepairField(transaction, "Issue", "Repair service requested");

const getRepairNotes = (transaction) =>
  getRepairField(transaction, "Notes", "");

// Marketplace reputation is intentionally kept separate from Repair Service
// reputation. `profiles.average_rating` / `total_reviews` are the marketplace
// participant score used by Trust Tier and marketplace seller displays.
// Repair Service ratings live in `repair_reviews` and are displayed separately.
const syncUserReputation = async (userId) => {
  if (!userId) return null;

  const { data: marketplaceReviews, error: marketplaceError } = await supabase
    .from("reviews")
    .select("overall_rating")
    .eq("seller_id", userId);

  if (marketplaceError) throw marketplaceError;

  const eligibleRatings = (marketplaceReviews || [])
    .map((review) => Number(review?.overall_rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);

  const totalReviews = eligibleRatings.length;
  const averageRating = totalReviews
    ? eligibleRatings.reduce((sum, rating) => sum + rating, 0) / totalReviews
    : 0;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      average_rating: Number(averageRating.toFixed(2)),
      total_reviews: totalReviews,
    })
    .eq("id", userId);

  if (profileError) throw profileError;

  return { averageRating, totalReviews };
};

const RepairReviewModal = ({ isOpen, transaction, currentUserId, onClose, onSubmitted }) => {
  const [communication, setCommunication] = useState(0);
  const [service, setService] = useState(0);
  const [overall, setOverall] = useState(0);
  const [recommend, setRecommend] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCommunication(0);
      setService(0);
      setOverall(0);
      setRecommend(true);
      setComment("");
      setSubmitting(false);
    }
  }, [isOpen, transaction?.id]);

  if (!isOpen || !transaction) return null;

  const repairShop =
    transaction.harvester?.business_name ||
    transaction.harvester?.full_name ||
    "Repair Shop";
  const device = getRepairDevice(transaction);

  const renderStars = (value, setValue) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setValue(star)}
          className="p-1 transition-transform hover:scale-110"
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            size={28}
            fill={star <= value ? "currentColor" : "none"}
            className={star <= value ? "text-yellow-400" : "text-slate-300"}
          />
        </button>
      ))}
    </div>
  );

  const handleSubmit = async () => {
    if (!currentUserId) {
      alert("Your account information is missing. Please log in again.");
      return;
    }

    if (!transaction.repair_appointment_id) {
      alert("Repair appointment information is missing.");
      return;
    }

    if (!transaction.harvester_id) {
      alert("Repair shop information is missing.");
      return;
    }

    if (!communication || !service || !overall) {
      alert("Please provide all three ratings before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      // Re-check the transaction from Supabase immediately before inserting.
      // This prevents a stale open modal from submitting a rating after the
      // transaction has been cancelled/reverted since the dashboard loaded.
      const { data: latestTransaction, error: latestTransactionError } = await supabase
        .from("transactions")
        .select("id,status,repair_appointment_id,harvester_id")
        .eq("id", transaction.id)
        .maybeSingle();

      if (latestTransactionError) throw latestTransactionError;

      if (!latestTransaction || String(latestTransaction.status || "").trim().toLowerCase() !== "completed") {
        alert("This repair service is no longer eligible for rating because the transaction is not completed.");
        onClose();
        return;
      }

      if (latestTransaction.repair_appointment_id !== transaction.repair_appointment_id) {
        alert("The repair appointment information has changed. Please refresh and try again.");
        onClose();
        return;
      }

      if (latestTransaction.harvester_id !== transaction.harvester_id) {
        alert("The repair shop information has changed. Please refresh and try again.");
        onClose();
        return;
      }

      const { data: existingReview, error: existingError } = await supabase
        .from("repair_reviews")
        .select("id")
        .eq("appointment_id", transaction.repair_appointment_id)
        .eq("reviewer_id", currentUserId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingReview) {
        alert("You have already reviewed this repair service.");
        onClose();
        return;
      }

      const { data, error } = await supabase
        .from("repair_reviews")
        .insert({
          appointment_id: transaction.repair_appointment_id,
          repair_shop_id: transaction.harvester_id,
          reviewer_id: currentUserId,
          communication_rating: communication,
          service_rating: service,
          overall_rating: overall,
          recommend,
          comment: comment.trim() || null,
        })
        .select()
        .single();

      if (error) {
        // TC_RATE_06: also handle the database uniqueness constraint when two
        // submissions race each other or the modal was opened in two tabs.
        if (error.code === "23505") {
          alert("You have already reviewed this repair service.");
          onSubmitted?.(data);
          onClose();
          return;
        }
        throw error;
      }

      // Keep marketplace profile reputation fields synchronized with
      // marketplace reviews only. Repair Service reviews must never change
      // profiles.average_rating / profiles.total_reviews because TC_RATE_09
      // and TC_RATE_10 require separate Purchase and Repair Service scores.
      await syncUserReputation(transaction.harvester_id);

      onSubmitted?.(data);
      alert("Repair shop rated successfully!");
      onClose();
    } catch (error) {
      console.error("Repair review error:", error);
      alert(`Failed to submit repair review: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 pt-100">
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest">
                <Wrench size={14} /> Repair Service Review
              </div>
              <h2 className="text-2xl font-black mt-2">Rate Repair Shop</h2>
              <p className="text-xs text-white/75 mt-1">
                Share your experience with {repairShop}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
            <p className="text-xs font-black text-purple-500 uppercase tracking-widest">
              Repair Shop
            </p>
            <p className="text-sm font-black text-slate-800 mt-1">{repairShop}</p>
            <p className="text-xs text-slate-500 mt-1">{device}</p>
          </div>

          <div>
            <p className="text-sm font-black text-slate-700">Communication</p>
            <p className="text-xs text-slate-400 mb-2">
              How well did the repair shop communicate with you?
            </p>
            {renderStars(communication, setCommunication)}
          </div>

          <div>
            <p className="text-sm font-black text-slate-700">Service Quality</p>
            <p className="text-xs text-slate-400 mb-2">
              How satisfied are you with the repair service?
            </p>
            {renderStars(service, setService)}
          </div>

          <div>
            <p className="text-sm font-black text-slate-700">Overall Experience</p>
            <p className="text-xs text-slate-400 mb-2">
              Overall, how would you rate this repair shop?
            </p>
            {renderStars(overall, setOverall)}
          </div>

          <div>
            <p className="text-sm font-black text-slate-700 mb-2">
              Would you recommend this repair shop?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecommend(true)}
                className={`py-3 rounded-xl text-xs font-black border ${
                  recommend
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                Yes, I recommend
              </button>
              <button
                type="button"
                onClick={() => setRecommend(false)}
                className={`py-3 rounded-xl text-xs font-black border ${
                  !recommend
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                No
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700">Write a review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Tell us about your repair experience..."
              className="w-full mt-2 rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none"
            />
            <p className="text-xs text-slate-400 text-right mt-1">
              {comment.length}/1000
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2 transition"
          >
            <Star size={18} fill="currentColor" />
            {submitting ? "Submitting Review..." : "Submit Repair Review"}
          </button>
        </div>
      </div>
    </div>
  );
};


const MarketplaceRatingModal = ({
  isOpen,
  transaction,
  currentUserId,
  ratingRole,
  onClose,
  onSubmitted,
}) => {
  const [communication, setCommunication] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [condition, setCondition] = useState(0);
  const [overall, setOverall] = useState(0);
  const [recommend, setRecommend] = useState("yes");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCommunication(0);
      setPunctuality(0);
      setCondition(0);
      setOverall(0);
      setRecommend("yes");
      setFeedback("");
      setSubmitting(false);
    }
  }, [isOpen, transaction?.id, ratingRole]);

  if (!isOpen || !transaction) return null;

  const isRatingBuyer = ratingRole === "buyer";
  const ratedProfile = isRatingBuyer ? transaction.harvester : transaction.seller;
  const ratedName =
    ratedProfile?.business_name ||
    ratedProfile?.full_name ||
    (isRatingBuyer ? "Buyer" : "Seller");

  const renderStars = (value, setValue) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setValue(star)}
          className="p-1 transition-transform hover:scale-110"
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            size={26}
            fill={star <= value ? "currentColor" : "none"}
            className={star <= value ? "text-yellow-400" : "text-slate-300"}
          />
        </button>
      ))}
    </div>
  );

  const handleSubmit = async () => {
    const ratedUserId = isRatingBuyer
      ? transaction.harvester_id
      : transaction.seller_id;

    if (!currentUserId || !transaction?.id || !ratedUserId) {
      alert("The transaction or account information is missing.");
      return;
    }

    if (ratedUserId === currentUserId) {
      alert("You cannot rate yourself.");
      return;
    }

    if (!communication || !punctuality || !condition || !overall) {
      alert("Please provide all four ratings before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: existingReview, error: existingError } = await supabase
        .from("reviews")
        .select("id")
        .eq("transaction_id", transaction.id)
        .eq("reviewer_id", currentUserId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingReview) {
        onSubmitted?.(transaction.id);
        alert(`You have already rated this ${isRatingBuyer ? "buyer" : "seller"}.`);
        onClose();
        return;
      }

      const { data: insertedReview, error: insertError } = await supabase
        .from("reviews")
        .insert([{
          transaction_id: transaction.id,
          // Existing schema uses seller_id as the rated-user column.
          seller_id: ratedUserId,
          reviewer_id: currentUserId,
          communication_rating: communication,
          punctuality_rating: punctuality,
          condition_rating: condition,
          overall_rating: overall,
          recommend: recommend === "yes",
          comment: feedback.trim() || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Recalculate reputation from all eligible review sources.
      await syncUserReputation(ratedUserId);

      onSubmitted?.(transaction.id, insertedReview);
      alert(`${isRatingBuyer ? "Buyer" : "Seller"} rated successfully!`);
      onClose();
    } catch (error) {
      console.error("Marketplace rating error:", error);
      alert(`Failed to submit rating: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#2d7a7f] to-[#3285a1] p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest">
                 Marketplace Review
              </div>
              <h2 className="text-2xl font-black mt-2">
                Rate {isRatingBuyer ? "Buyer" : "Seller"}
              </h2>
              <p className="text-xs text-white/75 mt-1">
                Share your experience with {ratedName}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              aria-label="Close rating modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {isRatingBuyer ? "Buyer" : "Seller"}
            </p>
            <p className="text-sm font-black text-slate-800 mt-1">{ratedName}</p>
            <p className="text-xs text-slate-500 mt-1">
              {transaction.listing?.device_model || "Electronic Item"}
            </p>
          </div>

          {[
            ["Communication", "How well did they communicate with you?", communication, setCommunication],
            ["Punctuality", "How well did they follow the agreed meetup schedule?", punctuality, setPunctuality],
            ["Transaction / Item Condition", "How would you rate the transaction and item condition?", condition, setCondition],
            ["Overall Experience", `Overall, how would you rate this ${isRatingBuyer ? "buyer" : "seller"}?`, overall, setOverall],
          ].map(([label, description, value, setter]) => (
            <div key={label}>
              <p className="text-sm font-black text-slate-700">{label}</p>
              <p className="text-xs text-slate-400 mb-2">{description}</p>
              {renderStars(value, setter)}
            </div>
          ))}

          <div>
            <p className="text-sm font-black text-slate-700 mb-2">
              Would you recommend this {isRatingBuyer ? "buyer" : "seller"}?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["yes", "Yes, I recommend", "bg-emerald-50 border-emerald-300 text-emerald-700"],
                ["no", "No", "bg-red-50 border-red-300 text-red-700"],
              ].map(([value, label, activeClass]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecommend(value)}
                  className={`py-3 rounded-xl text-xs font-black border ${
                    recommend === value
                      ? activeClass
                      : "bg-white border-slate-200 text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700">Write a review</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder={`Tell us about your experience with this ${isRatingBuyer ? "buyer" : "seller"}...`}
              className="w-full mt-2 rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-[#2d7a7f] focus:ring-2 focus:ring-blue-100 resize-none"
            />
            <p className="text-xs text-slate-400 text-right mt-1">
              {feedback.length}/1000
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-[#2d7a7f] hover:bg-[#246367] disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2 transition"
          >
            <Star size={18} fill="currentColor" />
            {submitting ? "Submitting Rating..." : `Submit ${isRatingBuyer ? "Buyer" : "Seller"} Rating`}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReceiptModal = ({ transaction, currentUserId, onClose }) => {
  if (!transaction) return null;

  const isRepair = isRepairTransaction(transaction);
  const itemName = isRepair
    ? getRepairDevice(transaction)
    : transaction.listing?.device_model || transaction.device_model || "Electronic Device";

  const sellerName =
    transaction.seller?.full_name || transaction.seller_name || "Seller";

  const buyerName =
    transaction.harvester?.full_name ||
    transaction.buyer?.full_name ||
    transaction.buyer_name ||
    "Buyer";

  const repairShopName =
    transaction.harvester?.business_name ||
    transaction.harvester?.full_name ||
    "Repair Shop";

  const amount = Number(transaction.amount || 0);
  const completedDate = transaction.completed_at
    ? new Date(transaction.completed_at)
    : transaction.updated_at
      ? new Date(transaction.updated_at)
      : new Date();

  const referenceNumber = `${isRepair ? "EWS-R" : "EWM-"}${String(transaction.id || "TRANSACTION")
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

  const isSeller = transaction.seller_id === currentUserId;
  const yourRole = isRepair ? "Customer" : isSeller ? "Seller" : "Buyer";
  const carbonSaved = transaction.carbon_saved ?? 0;
  const repairCategory = getRepairCategory(transaction);
  const repairIssue = getRepairIssue(transaction);
  const repairNotes = getRepairNotes(transaction);

  const handleSaveReceipt = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(50, 133, 161);
      doc.rect(0, 0, pageWidth, 48, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("WASTELESS", pageWidth / 2, 15, { align: "center" });
      doc.setFontSize(21);
      doc.setFont("helvetica", "bold");
      doc.text(isRepair ? "Repair Service Record" : "Transaction Receipt", pageWidth / 2, 29, {
        align: "center",
      });
      doc.setFontSize(10);
      doc.text(isRepair ? "Repair Service Completed" : "Transaction Successful", pageWidth / 2, 40, {
        align: "center",
      });

      doc.setTextColor(30, 41, 59);
      let y = 67;
      const addRow = (label, value) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(label, 25, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        const safeValue = String(value || "-");
        const maxWidth = pageWidth - 90;
        const wrapped = doc.splitTextToSize(safeValue, maxWidth);
        doc.text(wrapped, pageWidth - 25, y, { align: "right" });
        const rowHeight = Math.max(18, wrapped.length * 5 + 8);
        doc.setDrawColor(226, 232, 240);
        doc.line(25, y + rowHeight - 4, pageWidth - 25, y + rowHeight - 4);
        y += rowHeight;
      };

      addRow("Reference No.", referenceNumber);
      addRow("Date", formattedDate);
      addRow("Time", formattedTime);

      if (isRepair) {
        addRow("Device", itemName);
        addRow("Category", repairCategory);
        addRow("Customer", sellerName);
        addRow("Repair Shop", repairShopName);
        addRow("Issue", repairIssue);
        addRow("Appointment Date", transaction.meetup_date || "Not set");
        addRow("Appointment Time", transaction.meetup_time || "Not set");
        if (repairNotes) addRow("Service Notes", repairNotes);
        addRow("Payment", "No payment required");
      } else {
        addRow("Item", itemName);
        addRow("Seller", sellerName);
        addRow("Buyer", buyerName);
        addRow("Your Role", yourRole);
        addRow("Amount", `PHP ${amount.toLocaleString()}`);
      }

      if (!isRepair && carbonSaved > 0) {
        y += 8;
        doc.setFillColor(89, 203, 163);
        doc.roundedRect(25, y, pageWidth - 50, 35, 5, 5, "F");
        doc.setTextColor(20, 83, 45);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`${carbonSaved} kg CO₂ saved`, 35, y + 15);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Thank you for helping extend the useful life of electronics.", 35, y + 25);
      }

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        isRepair
          ? "WasteLess - Official Repair Service Record"
          : "WasteLess Marketplace - Official Transaction Record",
        pageWidth / 2,
        280,
        { align: "center" }
      );
      doc.save(`WasteLess-${isRepair ? "Repair-Record" : "Receipt"}-${referenceNumber}.pdf`);
    } catch (error) {
      console.error("Failed to generate record:", error);
      alert("Unable to generate the record. Please try again.");
    }
  };

  const rows = isRepair
    ? [
        ["Reference No.", referenceNumber],
        ["Date", formattedDate],
        ["Time", formattedTime],
        ["Device", itemName],
        ["Category", repairCategory],
        ["Customer", sellerName],
        ["Repair Shop", repairShopName],
        ["Issue", repairIssue],
        ["Appointment Date", transaction.meetup_date || "Not set"],
        ["Appointment Time", transaction.meetup_time || "Not set"],
        ...(repairNotes ? [["Service Notes", repairNotes]] : []),
        ["Payment", "No payment required"],
      ]
    : [
        ["Reference No.", referenceNumber],
        ["Date", formattedDate],
        ["Time", formattedTime],
        ["Item", itemName],
        ["Seller", sellerName],
        ["Buyer", buyerName],
        ["Your Role", yourRole],
      ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl">
        <div className="flex items-center justify-between p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#eaf4df] flex items-center justify-center">
              <CheckCircle size={25} className="text-[#769c2d]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-700">
                {isRepair ? "Repair Service Record" : "Transaction Receipt"}
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Official {isRepair ? "repair service" : "transaction"} record
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

        <div className="px-6 md:px-8 pb-6">
          <div className="rounded-[1.5rem] overflow-hidden border border-slate-100 shadow-lg">
            <div className="bg-gradient-to-r from-[#3285a1] to-[#14516d] text-white text-center p-8">
              <p className="text-xs tracking-[0.3em] text-white/70 font-medium">
                WASTELESS {isRepair ? "REPAIR SERVICE" : "MARKETPLACE"}
              </p>
              <h3 className="text-2xl md:text-3xl font-black mt-2">
                {isRepair ? "Repair Service Completed" : "Transaction Successful"}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-3 text-[#a8d129]">
                <CheckCircle size={20} />
                <span className="font-bold">Completed</span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 py-4 border-b border-dashed border-slate-200">
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="text-sm font-bold text-slate-700 text-right max-w-[65%]">{value}</span>
                </div>
              ))}

              {!isRepair && (
                <div className="flex justify-between gap-6 py-5">
                  <span className="text-sm text-slate-400">Amount</span>
                  <span className="text-xl font-black text-[#3285a1] text-right">₱{amount.toLocaleString()}</span>
                </div>
              )}

              {!isRepair && carbonSaved > 0 && (
                <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Leaf size={18} />
                    <span className="font-black text-sm">{carbonSaved} kg CO₂ saved</span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-2">Thank you for helping extend the useful life of electronics.</p>
                </div>
              )}

              {isRepair && (
                <div className="mt-4 bg-purple-50 border border-purple-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-purple-800">
                    <Wrench size={18} />
                    <span className="font-black text-sm">Repair service completed</span>
                  </div>
                  <p className="text-xs text-purple-700 mt-2">
                    This record confirms the completed repair appointment. No marketplace payment was required.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button onClick={onClose} className="py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition">
              Close
            </button>
            <button onClick={handleSaveReceipt} className="py-3 bg-[#3285a1] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#276b82] transition">
              <Download size={15} /> {isRepair ? "Save Service Record" : "Save Receipt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
const SellerDashboard = ({ session }) => {
  const [activeTab, setActiveTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("profile");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handleChangePassword = async (event) => {
    event?.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.next.length < 6) return setPasswordError("Your new password must contain at least 6 characters.");
    if (passwordForm.next !== passwordForm.confirm) return setPasswordError("The new passwords do not match.");
    if (passwordForm.current === passwordForm.next) return setPasswordError("Your new password must be different from your current password.");
    const email = session?.user?.email;
    if (!email) return setPasswordError("Unable to identify your account. Please sign in again.");
    setPasswordSaving(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: passwordForm.current });
      if (verifyError) return setPasswordError("Your current password is incorrect.");
      const { error: updateError } = await supabase.auth.updateUser({ password: passwordForm.next });
      if (updateError) throw updateError;
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPasswordSuccess("Your password has been changed successfully.");
    } catch (error) {
      console.error("Change password error:", error);
      setPasswordError(error.message || "Unable to change your password. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const [profileData, setProfileData] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [editProfile, setEditProfile] = useState({ full_name: "", contact_number: "", barangay: "" });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null); // Assuming you have user data for the ID
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState("");
  const [placingBid, setPlacingBid] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [bidMessage, setBidMessage] = useState("");
  const [listingBids, setListingBids] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [donationReminder, setDonationReminder] = useState(null);
  const [expiredListingAction, setExpiredListingAction] = useState(null);
  const [processingExpiredListing, setProcessingExpiredListing] = useState(false);
  const [donationConfig, setDonationConfig] = useState({
    firstReminder: 7,
    secondReminder: 3,
    autoSuggest: 14,
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [selectedReceiptTransaction, setSelectedReceiptTransaction] = useState(null);

  // Trust Tier data is loaded from the same trust_tiers table used by Admin.
  const [trustTiers, setTrustTiers] = useState([]);
  const [sellerTrustTiers, setSellerTrustTiers] = useState({});
  const [trustTierLoading, setTrustTierLoading] = useState(true);
  const [trustTierError, setTrustTierError] = useState("");
  const [userTrustStats, setUserTrustStats] = useState({
    completedTransactions: 0,
    averageRating: 0,
    totalReviews: 0,
    trustTierId: null,
  });
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [listingToDonate, setListingToDonate] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingRole, setRatingRole] = useState(null); // "buyer" or "seller"
  const [reviewedMarketplaceTransactions, setReviewedMarketplaceTransactions] = useState(new Set());
  const [showRepairReviewModal, setShowRepairReviewModal] = useState(false);
  const [selectedRepairReviewTransaction, setSelectedRepairReviewTransaction] = useState(null);
  const [reviewedRepairAppointments, setReviewedRepairAppointments] = useState(new Set());
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedBidder, setSelectedBidder] = useState(null);
  const [listingSubTab, setListingSubTab] = useState("all");
  const [selectedBidListing, setSelectedBidListing] = useState(null);
  const [selectedListingDetails, setSelectedListingDetails] = useState(null);
  const isRepairShop = user?.role === "repair_shop";
  const isHarvester = user?.role === "harvester";

  // Profile display values must come from the profiles table because
  // Edit Profile saves changes there. Auth user_metadata can be stale.
  const currentProfileName =
    profileData?.full_name ||
    session?.user?.user_metadata?.full_name ||
    "User Name";

  const currentProfilePhone =
    profileData?.contact_number ||
    session?.user?.user_metadata?.contact_number ||
    "Not set";

  const currentProfileBarangay =
    profileData?.barangay ||
    session?.user?.user_metadata?.barangay ||
    "Not set";

  const displayName =
    isRepairShop
      ? profileData?.business_name || user?.business_name || currentProfileName
      : currentProfileName;

  const displayRole = isRepairShop ? "Repair Shop" : "Tech Harvester";

  useEffect(() => {
    if (isVerificationModalOpen && profileData) {
      setVerificationForm({
        full_name: profileData.full_name || "",
        contact_number: profileData.contact_number || "",
        barangay: profileData.barangay || "",
        business_name: profileData.business_name || "",
      });
    }
  }, [isVerificationModalOpen, profileData]);

  const valenzuelaBarangays = [
    "Arkong Bato",
    "Bagbaguin",
    "Balangkas",
    "Bignay",
    "Bisig",
    "Canumay East",
    "Canumay West",
    "Coloong",
    "Dalandanan",
    "Gen. T. de Leon",
    "Isla",
    "Karuhatan",
    "Lawang Bato",
    "Lingunan",
    "Mabolo",
    "Malanday",
    "Malinta",
    "Mapulang Lupa",
    "Marulas",
    "Maysan",
    "Palasan",
    "Pariancillo Villa",
    "Paso de Blas",
    "Pasolo",
    "Poblacion",
    "Pulo",
    "Punturin",
    "Rincon",
    "Tagalag",
    "Ugong",
    "Viente Reales",
    "Wawang Pulo",
  ];

  const [verificationFiles, setVerificationFiles] = useState({
    businessPermit: null,
    techCert: null,
  });

  const permitRef = React.useRef();
  const techRef = React.useRef();

  const [verificationLoading, setVerificationLoading] = useState(false);

  const [verificationForm, setVerificationForm] = useState({
    full_name: "",
    contact_number: "",
    barangay: "",
    business_name: "",
  });

  const handleOpenMarketplaceRating = async (transaction, role) => {
    if (!transaction?.id) {
      alert("Transaction information is missing.");
      return;
    }

    if (transaction.status !== "completed") {
      alert("You can rate the other party only after the transaction is completed.");
      return;
    }

    const ratedUserId =
      role === "buyer" ? transaction.harvester_id : transaction.seller_id;

    if (!ratedUserId || ratedUserId === session.user.id) {
      alert("The account information for the person being rated is missing.");
      return;
    }

    if (reviewedMarketplaceTransactions.has(transaction.id)) {
      alert(`You have already rated this ${role}.`);
      return;
    }

    try {
      const { data: existingReview, error } = await supabase
        .from("reviews")
        .select("id")
        .eq("transaction_id", transaction.id)
        .eq("reviewer_id", session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (existingReview) {
        setReviewedMarketplaceTransactions((prev) => {
          const next = new Set(prev);
          next.add(transaction.id);
          return next;
        });
        alert(`You have already rated this ${role}.`);
        return;
      }

      setSelectedTxId(transaction.id);
      setRatingRole(role);
      setShowRateModal(true);
    } catch (error) {
      console.error("Error checking marketplace review:", error);
      alert(`Unable to check the existing rating: ${error.message}`);
    }
  };


  const handleListingCreated = (newListing) => {
    if (!newListing) return;

    // Keep the newly-created listing visible immediately without requiring
    // a full page refresh. The database remains the source of truth.
    setMyListings((prev) => [
      newListing,
      ...prev.filter((item) => item.id !== newListing.id),
    ]);

    if (String(newListing.status || "").toLowerCase() === "active") {
      setListings((prev) => [
        newListing,
        ...prev.filter((item) => item.id !== newListing.id),
      ]);
    }
  };

  const handleOpenDonation = (listing) => {
    setListingToDonate(listing);
    setIsDonationModalOpen(true);
  };

  // Hazardous/Not Working and Parts listings cannot remain bid-eligible after
  // their safe-storage period. Once expired, the owner must resolve the listing
  // by donating it or unlisting it.
  const handleUnlistExpiredListing = async (listing) => {
    if (!listing?.id || !session?.user?.id) return;

    setProcessingExpiredListing(true);
    try {
      const { data, error } = await supabase
        .from("listings")
        .update({ status: "inactive" })
        .eq("id", listing.id)
        .eq("seller_id", session.user.id)
        .in("status", ["expired", "active"])
        .select("id,status,device_model,category,condition")
        .single();

      if (error) throw error;

      // Pending offers must no longer be actionable once the listing is removed.
      const { error: bidError } = await supabase
        .from("bids")
        .update({ status: "declined" })
        .eq("listing_id", listing.id)
        .eq("status", "pending");

      if (bidError) {
        console.warn("Unable to close pending bids for unlisted item:", bidError.message);
      }

      setMyListings((prev) =>
        prev.map((item) =>
          item.id === listing.id ? { ...item, ...(data || {}), status: "inactive" } : item
        )
      );
      setListings((prev) => prev.filter((item) => item.id !== listing.id));
      setDonationReminder((prev) => (prev?.id === listing.id ? null : prev));
      setExpiredListingAction(null);

      alert("The expired listing has been unlisted and bidding is disabled.");
    } catch (error) {
      console.error("Unlist expired listing error:", error);
      alert(`Failed to unlist the expired listing: ${error.message}`);
    } finally {
      setProcessingExpiredListing(false);
    }
  };

  const handleConfirmDonation = async (
  listingId,
  dropOffPointId = null,
  savedListing = null
) => {
  try {
    if (!listingId) {
      alert("No listing selected for donation.");
      return;
    }

    // If SellerDonationTab already selected a drop-off point,
    // preserve that exact point instead of resetting it to null.
    const selectedDropOffPointId =
      dropOffPointId ||
      savedListing?.drop_off_point_id ||
      null;

    if (!selectedDropOffPointId) {
      alert(
        "Please select a drop-off point before confirming the donation."
      );
      return;
    }

    const { data, error } = await supabase
      .from("listings")
      .update({
        status: "donated",
        drop_off_point_id: selectedDropOffPointId,
      })
      .eq("id", listingId)
      .eq("seller_id", session.user.id)
      .select(`
        id,
        seller_id,
        status,
        drop_off_point_id,
        device_model,
        category,
        created_at,
        asking_price
      `)
      .single();

    if (error) throw error;

    if (!data?.drop_off_point_id) {
      throw new Error(
        "The donation was saved, but the drop-off point was not returned by the database."
      );
    }

    console.log("Donation saved successfully:", data);

    // Preserve the complete listing information in local state.
    setMyListings((prev) =>
      prev.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              ...data,
              status: "donated",
              drop_off_point_id: data.drop_off_point_id,
            }
          : listing
      )
    );

    // Update donation history without losing the drop-off point.
    setMyDonations((prev) => {
      const existing = prev.find((item) => item.id === listingId);

      const updatedDonation = {
        ...(existing || listingToDonate || {}),
        ...data,
        status: "donated",
        drop_off_point_id: data.drop_off_point_id,
      };

      const filtered = prev.filter((item) => item.id !== listingId);

      return [updatedDonation, ...filtered];
    });

    // Close donation modal if it is open.
    setIsDonationModalOpen(false);
    setListingToDonate(null);

    alert(
      "Thank you for donating! Your selected drop-off point has been saved."
    );
  } catch (err) {
    console.error("Donation error:", err);
    alert(`Failed to process donation: ${err.message}`);
  }
};

  const handleOpenRepairReview = async (transaction) => {
    if (!transaction?.id) {
      alert("Transaction information is missing.");
      return;
    }

    // TC_RATE_04 / TC_RATE_08 / TC_RATE_09: a repair-service rating is
    // available only after the corresponding transaction is actually completed.
    if (String(transaction.status || "").trim().toLowerCase() !== "completed") {
      alert("You can rate the Repair Shop only after the repair transaction is completed.");
      return;
    }

    if (!transaction?.repair_appointment_id) {
      alert("Repair appointment information is missing.");
      return;
    }

    if (!session?.user?.id) {
      alert("Your account information is missing. Please log in again.");
      return;
    }

    try {
      // TC_RATE_06: check the unique reviewer + appointment pair before
      // opening the form. The database check inside RepairReviewModal remains
      // the final duplicate guard for concurrent/repeated submissions.
      const { data, error } = await supabase
        .from("repair_reviews")
        .select("id")
        .eq("appointment_id", transaction.repair_appointment_id)
        .eq("reviewer_id", session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setReviewedRepairAppointments((prev) =>
          new Set(prev).add(transaction.repair_appointment_id),
        );
        alert("You have already reviewed this repair service.");
        return;
      }

      setSelectedRepairReviewTransaction(transaction);
      setShowRepairReviewModal(true);
    } catch (error) {
      console.error("Error checking repair review:", error);
      alert(`Unable to check the repair review: ${error.message}`);
    }
  };

  const handlePlaceBid = async () => {
    try {
      if (!selectedListing) {
        alert("Please select a listing first.");
        return;
      }

      if (!bidAmount || Number(bidAmount) <= 0) {
        alert("Please enter a valid offer amount.");
        return;
      }

      const offerAmount = Number(bidAmount);
      const askingPrice = Number(
        selectedListing.asking_price || 0
      );

      if (offerAmount > askingPrice) {
        alert("Your offer cannot be higher than the asking price.");
        return;
      }

      if (selectedListing.seller_id === session.user.id) {
        alert("You cannot place an offer on your own listing.");
        return;
      }

      // REQ-4: the optional offer message is sent as an in-app message, so it
      // must pass the restricted-content filter before the offer is placed.
      const bidMessageViolation = containsRestrictedContent(bidMessage);

      if (bidMessageViolation.blocked) {
        alert(bidMessageViolation.message);
        return;
      }

      if (
        selectedListing.status?.toLowerCase() !== "active"
      ) {
        alert("This listing is no longer active.");
        return;
      }

      setPlacingBid(true);

      // ==========================================
      // INSERT BID
      // ==========================================
      //
      // A bidder may place multiple offers on the same listing.
      // Each new offer must simply be lower than the current
      // lowest active bid.
      //

      const {
        data: newBid,
        error: bidError,
      } = await supabase
        .from("bids")
        .insert([
          {
            listing_id: selectedListing.id,
            bidder_id: session.user.id,
            amount: offerAmount,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (bidError) {
        throw bidError;
      }

      // ==========================================
      // NOTIFY SELLER
      // ==========================================

      const {
        error: notificationError,
      } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: selectedListing.seller_id,
            title: "New Offer Received",
            description: `Someone offered ₱${offerAmount.toLocaleString()} for your ${selectedListing.device_model} listing.`,
            type: "bid",
            is_read: false,
          },
        ]);

      if (notificationError) {
        console.error(
          "Offer notification failed:",
          notificationError.message
        );
      }

      // ==========================================
      // OPTIONAL MESSAGE TO SELLER
      // ==========================================

      if (bidMessage.trim()) {
        const { error: messageError } = await supabase
          .from("messages")
          .insert([
            {
              listing_id: selectedListing.id,
              sender_id: session.user.id,
              receiver_id: selectedListing.seller_id,
              content: bidMessage.trim(),
              is_read: false,
            },
          ]);

        if (messageError) {
          console.error(
            "Message failed:",
            messageError.message
          );
        }
      }

      // ==========================================
      // UPDATE LOCAL STATE
      // ==========================================

      setListingBids([newBid]);

      // IMPORTANT:
      // Add the newly placed bid to the listing in local state.
      // This makes the "My Bids" panel update immediately.
      setListings((prev) =>
        prev.map((listing) =>
          listing.id === selectedListing.id
            ? {
              ...listing,
              bids: [
                ...(listing.bids || []),
                newBid,
              ],
            }
            : listing
        )
      );

      setBidAmount("");
      setBidMessage("");

      alert("Offer sent successfully!");

      // Close modal
      setSelectedListing(null);
    } catch (error) {
      console.error("Error placing offer:", error);

      alert(
        `Failed to send offer: ${error.message}`
      );
    } finally {
      setPlacingBid(false);
    }
  };

  // Load Trust Tier requirements and calculate this user's current tier.
  // This is intentionally derived from transactions/reviews instead of a profiles.tier column,
  // so Admin changes in trust_tiers are reflected on the user side automatically.
  useEffect(() => {
    const fetchTrustTierData = async () => {
      const userId = session?.user?.id;
      if (!userId || !isAuthorized) return;

      setTrustTierLoading(true);
      setTrustTierError("");

      try {
        const [tiersResult, txResult, trustResult, marketplaceReviewsResult] =
          await Promise.all([
            supabase
              .from("trust_tiers")
              .select("id,name,min_transactions,min_rating,privileges")
              .order("min_transactions", { ascending: true }),
            supabase
              .from("transactions")
              .select("id,seller_id,harvester_id,status,carbon_saved")
              .or(`seller_id.eq.${userId},harvester_id.eq.${userId}`)
              .eq("status", "completed"),
            supabase
              .from("user_trust_tiers")
              .select("trust_tier_id,completed_transactions,average_rating,total_reviews")
              .eq("user_id", userId)
              .maybeSingle(),
            supabase
              .from("reviews")
              .select("overall_rating")
              .eq("seller_id", userId)
              .eq("moderation_status", "approved"),
          ]);

        if (tiersResult.error) throw tiersResult.error;
        if (txResult.error) throw txResult.error;
        if (trustResult.error) throw trustResult.error;
        if (marketplaceReviewsResult.error) throw marketplaceReviewsResult.error;

        const tiers = (tiersResult.data || []).map((tier) => ({
          ...tier,
          min_transactions: Number(tier.min_transactions || 0),
          min_rating: Number(tier.min_rating || 0),
          privileges: Array.isArray(tier.privileges) ? tier.privileges : [],
        }));

        // Owner/Dealer trust tiers use marketplace reviews only. Repair-shop
        // reviews remain separate and continue to use the existing repair
        // review flow elsewhere in this dashboard. The database evaluator is
        // the source of truth when a user_trust_tiers row exists; the fallback
        // keeps the dashboard working while that row is being initialized.
        const completedTransactionsData = txResult.data || [];
        const calculatedCompletedTransactions = completedTransactionsData.length;
        const eligibleRatings = (marketplaceReviewsResult.data || [])
          .map((review) => Number(review.overall_rating))
          .filter((rating) => Number.isFinite(rating) && rating > 0);
        const calculatedTotalReviews = eligibleRatings.length;
        const calculatedAverageRating = calculatedTotalReviews
          ? eligibleRatings.reduce((sum, rating) => sum + rating, 0) / calculatedTotalReviews
          : 0;

        const trustRow = trustResult.data || null;
        const completedTransactions = trustRow
          ? Number(trustRow.completed_transactions || 0)
          : calculatedCompletedTransactions;
        const totalReviews = trustRow
          ? Number(trustRow.total_reviews || 0)
          : calculatedTotalReviews;
        const averageRating = trustRow
          ? Number(trustRow.average_rating || 0)
          : calculatedAverageRating;

        // CO₂ recovery is earned from completed transactions where this
        // account is the harvester/buyer. Do not count completed sales made
        // by the account as recovered devices.
        const completedHarvestingTransactions = completedTransactionsData.filter(
          (transaction) =>
            transaction.harvester_id === userId &&
            transaction.status === "completed",
        );

        const recoveredDevices = completedHarvestingTransactions.length;
        const co2RecoveredKg = completedHarvestingTransactions.reduce(
          (sum, transaction) => sum + Number(transaction.carbon_saved || 0),
          0,
        );

        setTrustTiers(tiers);
        setUserTrustStats({
          completedTransactions,
          averageRating,
          totalReviews,
          trustTierId: trustRow?.trust_tier_id || null,
          recoveredDevices,
          co2RecoveredKg: Number(co2RecoveredKg.toFixed(2)),
        });

        // Keep the profile drawer synchronized with the same source used by
        // the Trust Tier calculation.
        setProfileData((prev) => ({
          ...(prev || {}),
          recovered_devices: recoveredDevices,
          completed_pickups: recoveredDevices,
          co2_recovered_kg: Number(co2RecoveredKg.toFixed(2)),
        }));
      } catch (error) {
        console.error("Error loading trust tier:", error);
        setTrustTierError(error.message || "Unable to load trust tier.");
        setTrustTiers([]);
        setUserTrustStats({
          completedTransactions: 0,
          averageRating: 0,
          totalReviews: 0,
          trustTierId: null,
          recoveredDevices: 0,
          co2RecoveredKg: 0,
        });
      } finally {
        setTrustTierLoading(false);
      }
    };

    fetchTrustTierData();
  }, [session?.user?.id, isAuthorized]);

  const sortedTrustTiers = [...trustTiers].sort(
    (a, b) => Number(a.min_transactions) - Number(b.min_transactions)
  );

  // Recovery values shown in the Trust Tier panel are derived from
  // completed harvesting transactions, not from the profile row.
  const trustRecoveryCo2 = Number(userTrustStats?.co2RecoveredKg ?? 0);
  const trustRecoveredDevices = Number(userTrustStats?.recoveredDevices ?? 0);

  const currentTrustTier =
    sortedTrustTiers.find((tier) => tier.id === userTrustStats.trustTierId) ||
    sortedTrustTiers
      .filter(
        (tier) =>
          userTrustStats.completedTransactions >= Number(tier.min_transactions) &&
          userTrustStats.averageRating >= Number(tier.min_rating)
      )
      .at(-1) ||
    sortedTrustTiers.find((tier) => tier.name === "NEWCOMER") ||
    {
      name: "NEWCOMER",
      min_transactions: 0,
      min_rating: 0,
      privileges: ["Basic Listings", "Basic Messaging"],
    };

  const currentTierIndex = sortedTrustTiers.findIndex((tier) => tier.id === currentTrustTier.id);
  const nextTrustTier =
    currentTierIndex >= 0 ? sortedTrustTiers[currentTierIndex + 1] || null : null;

  const transactionProgress = nextTrustTier
    ? Math.min(
        (userTrustStats.completedTransactions / Math.max(Number(nextTrustTier.min_transactions), 1)) * 100,
        100
      )
    : 100;
  const ratingProgress = nextTrustTier
    ? Math.min(
        (userTrustStats.averageRating / Math.max(Number(nextTrustTier.min_rating), 0.1)) * 100,
        100
      )
    : 100;
  const progressPercent = nextTrustTier
    ? Math.round(Math.min(transactionProgress, ratingProgress))
    : 100;

  const normalizePrivilege = (privilege) =>
    String(privilege || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ");

  const hasTrustPrivilege = (privilegeNames = []) => {
    const currentPrivileges = (currentTrustTier?.privileges || []).map(normalizePrivilege);
    if (!currentPrivileges.length) return true;
    const requested = privilegeNames.map(normalizePrivilege);
    return requested.some((name) =>
      currentPrivileges.some(
        (available) =>
          available === name ||
          (available.includes(name) && !/(premium|advanced|priority|featured|exclusive)/i.test(available))
      )
    );
  };

  const getTrustTierBadgeText = (tier) =>
    tier?.name ? `${getTrustTierLabel(tier.name)} Trust Tier` : "Trust Tier";

  // Reputation status changes are persisted as in-app notifications. Local
  // storage is used only as a deduplication marker; the database remains the
  // source of truth for the actual notification.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || trustTierLoading || !trustTiers.length) return;

    const runReputationNotifications = async () => {
      try {
        // Trust-tier elevation/downgrade notifications are now created by
        // evaluate_user_trust_tier() in Supabase. This effect keeps the
        // existing proximity notification functionality without creating
        // duplicate tier-change notifications from the browser.

        if (nextTrustTier) {
          const transactionRequirement = Math.max(Number(nextTrustTier.min_transactions || 0), 1);
          const ratingRequirement = Math.max(Number(nextTrustTier.min_rating || 0), 0.1);
          const transactionRatio = userTrustStats.completedTransactions / transactionRequirement;
          const ratingRatio = userTrustStats.averageRating / ratingRequirement;
          const proximityThreshold = 0.90;
          const isNearNextTier =
            (transactionRatio >= proximityThreshold && userTrustStats.averageRating > 0) ||
            (ratingRatio >= proximityThreshold && userTrustStats.completedTransactions > 0);

          if (isNearNextTier) {
            const proximityKey = `tier-proximity:${nextTrustTier.name}`;
            const proximityStorageKey = `wasteless-reputation-notification:${userId}:${proximityKey}`;
            if (!window.localStorage.getItem(proximityStorageKey)) {
              const missingTransactions = Math.max(0, transactionRequirement - userTrustStats.completedTransactions);
              const missingRating = Math.max(0, ratingRequirement - userTrustStats.averageRating);
              const content = `You are close to ${getTrustTierBadgeText(nextTrustTier)}. ${missingTransactions > 0 ? `${missingTransactions} more completed transaction${missingTransactions === 1 ? "" : "s"}` : "Your transaction requirement is met"} and ${missingRating > 0 ? `an average rating of ${ratingRequirement.toFixed(1)} is still needed` : "your rating requirement is met"}.`;
              const { error } = await supabase.from("notifications").insert({
                user_id: userId,
                type: "trust_tier_proximity",
                title: `Almost ${getTrustTierLabel(nextTrustTier.name)}!`,
                content,
                description: content,
                is_read: false,
              });
              if (!error) window.localStorage.setItem(proximityStorageKey, "1");
            }
          }
        }
      } catch (error) {
        console.warn("Reputation notification check failed:", error);
      }
    };

    runReputationNotifications();
  }, [
    session?.user?.id,
    trustTierLoading,
    trustTiers,
    currentTrustTier?.name,
    nextTrustTier?.name,
    userTrustStats.completedTransactions,
    userTrustStats.averageRating,
  ]);

  useEffect(() => {
    const loadMarketplaceSellerTiers = async () => {
      const userId = session?.user?.id;
      if (!userId || !trustTiers.length || !listings.length) return;

      try {
        const sellerIds = [...new Set(listings.map((listing) => listing.seller_id).filter(Boolean))];
        if (!sellerIds.length) return;

        const [{ data: sellerTransactions, error: txError }, { data: sellerReviews, error: reviewError }] = await Promise.all([
          supabase
            .from("transactions")
            .select("seller_id,harvester_id,status")
            .eq("status", "completed")
            .or(sellerIds.map((id) => `seller_id.eq.${id}`).join(",") + "," + sellerIds.map((id) => `harvester_id.eq.${id}`).join(",")),
          supabase
            .from("reviews")
            .select("seller_id,overall_rating")
            .in("seller_id", sellerIds)
            .eq("moderation_status", "approved"),
        ]);

        if (txError) throw txError;
        if (reviewError) throw reviewError;

        const next = {};
        sellerIds.forEach((sellerId) => {
          const completed = (sellerTransactions || []).filter(
            (tx) => tx.seller_id === sellerId || tx.harvester_id === sellerId
          ).length;
          const ratings = (sellerReviews || [])
            .filter((review) => review.seller_id === sellerId)
            .map((review) => Number(review.overall_rating))
            .filter((rating) => Number.isFinite(rating) && rating > 0);
          const average = ratings.length
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;
          const tier = [...trustTiers]
            .sort((a, b) => Number(a.min_transactions) - Number(b.min_transactions))
            .filter(
              (candidate) =>
                completed >= Number(candidate.min_transactions) &&
                average >= Number(candidate.min_rating)
            )
            .at(-1);
          next[sellerId] = tier || trustTiers.find((candidate) => candidate.name === "NEWCOMER") || null;
        });
        setSellerTrustTiers(next);
      } catch (error) {
        console.warn("Unable to calculate marketplace seller trust tiers:", error);
      }
    };

    loadMarketplaceSellerTiers();
  }, [listings, trustTiers, session?.user?.id]);

  const getTrustTierLabel = (name) => {
    const labels = {
      NEWCOMER: "Newcomer",
      BRONZE: "Bronze",
      SILVER: "Silver",
      GOLD: "Gold",
      PLATINUM: "Platinum",
    };
    return labels[name] || name || "Newcomer";
  };

  // Requirement 7 / REQ-3:
  // Record every status change made from this dashboard. The helper is
  // idempotent for the same transaction/status transition so it will not
  // create duplicate rows if a database trigger has already recorded it.
  const recordTransactionStatusHistory = async ({
    transactionId,
    oldStatus,
    newStatus,
    transaction,
    notes = null,
  }) => {
    if (!transactionId || !newStatus) return;

    const changedAt = new Date().toISOString();

    try {
      const { data: existing, error: lookupError } = await supabase
        .from("transaction_status_history")
        .select("id")
        .eq("transaction_id", transactionId)
        .eq("old_status", oldStatus || "")
        .eq("new_status", newStatus)
        .gte("changed_at", new Date(Date.now() - 15_000).toISOString())
        .limit(1);

      // A missing history table/migration should not make an otherwise valid
      // transaction update fail. The transaction itself remains authoritative.
      if (lookupError) {
        console.warn(
          "Transaction status history could not be checked:",
          lookupError.message
        );
        return;
      }

      if (existing?.length) return;

      const { error: historyError } = await supabase
        .from("transaction_status_history")
        .insert({
          transaction_id: transactionId,
          old_status: oldStatus || null,
          new_status: newStatus,
          changed_at: changedAt,
          meetup_date: transaction?.meetup_date || null,
          meetup_time: transaction?.meetup_time || null,
          meeting_location: transaction?.meeting_location || null,
          notes: notes || transaction?.notes || null,
        });

      if (historyError) {
        console.warn(
          "Transaction was updated, but status history could not be recorded:",
          historyError.message
        );
      }
    } catch (historyError) {
      console.warn("Unexpected transaction history error:", historyError);
    }
  };

  const handleCompleteTransaction = async (txId) => {
    try {
      const txToComplete = transactions.find((t) => t.id === txId);

      if (!txToComplete) {
        alert("Transaction not found.");
        return;
      }

      if (txToComplete.repair_appointment_id) {
        alert(
          "This is a repair service. The repair shop will mark the service as completed."
        );
        return;
      }

      if (txToComplete.harvester_id !== session.user.id) {
        alert("Only the buyer can confirm the handover.");
        return;
      }

      if (txToComplete.status !== "meetup_scheduled") {
        alert(
          "The meetup must be scheduled before the handover can be completed."
        );
        return;
      }

      // Required transaction-coordination data must exist before completion.
      if (!String(txToComplete.meetup_date || "").trim()) {
        alert("This transaction has no meetup date. Please ask the seller to schedule it.");
        return;
      }

      if (!String(txToComplete.meetup_time || "").trim()) {
        alert("This transaction has no meetup time. Please ask the seller to schedule it.");
        return;
      }

      // Older rows stored the location in barangay; accept either.
      if (
        !String(
          txToComplete.meeting_location || txToComplete.barangay || ""
        ).trim()
      ) {
        alert(
          "This transaction has no meeting location. Please ask the seller to schedule it."
        );
        return;
      }

      const oldStatus = txToComplete.status;
      const completedAt = new Date().toISOString();

      const { data: updatedTx, error } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          transaction_type: "purchase",
          completed_at: completedAt,
          cancelled_at: null,
          pending_review_at: null,
          updated_at: completedAt,
        })
        .eq("id", txId)
        .eq("harvester_id", session.user.id)
        .eq("status", "meetup_scheduled")
        .select(`
          *,
          seller:seller_id (full_name, business_name, role),
          harvester:harvester_id (full_name, business_name, role),
          listing:listing_id (device_model, asking_price)
        `)
        .single();

      if (error) throw error;

      await recordTransactionStatusHistory({
        transactionId: txId,
        oldStatus,
        newStatus: "completed",
        transaction: updatedTx || txToComplete,
        notes: "Buyer confirmed handover completion.",
      });

      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, ...updatedTx } : t))
      );

      if (selectedTxId === txId) {
        setTransactionStatusHistory((prev) => [
          ...prev,
          {
            id: `local-${txId}-${Date.now()}`,
            old_status: oldStatus,
            new_status: "completed",
            changed_at: completedAt,
            meetup_date: updatedTx?.meetup_date || txToComplete.meetup_date,
            meetup_time: updatedTx?.meetup_time || txToComplete.meetup_time,
            meeting_location:
              updatedTx?.meeting_location || txToComplete.meeting_location,
            notes: "Buyer confirmed handover completion.",
          },
        ]);
      }

      alert("Handover confirmed. Transaction completed!");
    } catch (err) {
      console.error("Error completing transaction:", err);
      alert("Failed to complete transaction: " + err.message);
    }
  };

  const handleCancelTransaction = async (txId) => {
    try {
      const txToCancel = transactions.find((t) => t.id === txId);

      if (!txToCancel) {
        alert("Transaction not found.");
        return;
      }

      if (txToCancel.seller_id !== session.user.id) {
        alert("Only the seller can cancel this transaction.");
        return;
      }

      const cancelableStatuses = ["pending", "matched"];
      const currentCancelStatus = String(txToCancel.status || "").trim().toLowerCase();

      // FR #9.2.2.1: cancellation is allowed only before meetup confirmation.
      // Once a meetup is scheduled, the transaction must proceed to handover,
      // completion, or automatic Pending Review instead.
      if (!cancelableStatuses.includes(currentCancelStatus)) {
        alert(
          currentCancelStatus === "meetup_scheduled"
            ? "This transaction cannot be cancelled because the meetup has already been scheduled."
            : currentCancelStatus === "pending_review"
              ? "This transaction is already Pending Review and can only be resolved by an Administrator."
              : "This transaction is already closed or is not eligible for cancellation."
        );
        return;
      }

      const reason = String(cancelReason || "").trim();
      if (!reason) {
        alert(
          "Please select a cancellation reason before updating the transaction."
        );
        return;
      }

      const oldStatus = txToCancel.status;
      const changedAt = new Date().toISOString();

      const { data: updatedTx, error: txError } = await supabase
        .from("transactions")
        .update({
          status: "cancelled",
          transaction_type: txToCancel.repair_appointment_id ? "repair" : "purchase",
          cancel_reason: reason,
          cancelled_at: changedAt,
          pending_review_at: null,
          updated_at: changedAt,
        })
        .eq("id", txId)
        .eq("seller_id", session.user.id)
        .not("status", "in", "(completed,cancelled)")
        .select("*")
        .single();

      if (txError) throw txError;

      if (txToCancel?.listing_id) {
        const { error: listingError } = await supabase
          .from("listings")
          .update({ status: "active" })
          .eq("id", txToCancel.listing_id);

        if (listingError) throw listingError;
      }

      await recordTransactionStatusHistory({
        transactionId: txId,
        oldStatus,
        newStatus: "cancelled",
        transaction: updatedTx || txToCancel,
        notes: `Transaction cancelled by seller. Reason: ${reason}`,
      });

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? { ...t, ...(updatedTx || {}), status: "cancelled" }
            : t
        )
      );

      if (selectedTxId === txId) {
        setTransactionStatusHistory((prev) => [
          ...prev,
          {
            id: `local-${txId}-${Date.now()}`,
            old_status: oldStatus,
            new_status: "cancelled",
            changed_at: changedAt,
            meetup_date: updatedTx?.meetup_date || txToCancel.meetup_date,
            meetup_time: updatedTx?.meetup_time || txToCancel.meetup_time,
            meeting_location:
              updatedTx?.meeting_location || txToCancel.meeting_location,
            notes: `Transaction cancelled by seller. Reason: ${reason}`,
          },
        ]);
      }

      setShowCancelModal(false);
      setCancelReason("");
      alert("Transaction cancelled successfully.");
    } catch (err) {
      console.error("Error cancelling:", err);
      alert(`Failed to cancel: ${err.message}`);
    }
  };

  const totalBidsCount = listings.reduce(
    (sum, item) => sum + (item.bids?.length || 0),
    0,
  );
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [transactionStatusHistory, setTransactionStatusHistory] = useState([]);
  const [loadingTransactionStatusHistory, setLoadingTransactionStatusHistory] = useState(false);
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };
  const [messageUserCount, setMessageUserCount] = useState(0);

  const getBuyerDisplayName = (profile) => {
    if (!profile) return "Unknown User";

    return profile.role === "repair_shop"
      ? profile.business_name || "Repair Shop"
      : profile.full_name || "Tech Harvester";
  };
  const getBuyerRoleLabel = (role) => {
    if (role === "repair_shop") return "Repair Shop";
    if (role === "harvester") return "Tech Harvester";

    return "User";
  };
  useEffect(() => {
    const fetchMessageUserCount = async () => {
      if (!session?.user) return;

      // We fetch all messages sent TO the seller
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", session.user.id);

      if (!error && data) {
        // We use a Set to get only UNIQUE sender_ids
        const uniqueSenders = new Set(data.map((msg) => msg.sender_id));
        setMessageUserCount(uniqueSenders.size);
      }
    };

    fetchMessageUserCount();
  }, [session]);
  const deleteNotification = async (id) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Delete notification error:", error);
      alert(`Failed to delete notification: ${error.message}`);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications
      .filter((notification) => !notification.is_read)
      .map((notification) => notification.id);

    if (unreadIds.length === 0) return;

    // Update the UI immediately so the badge and unread styling disappear
    // without waiting for another fetch.
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true })),
    );

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .in("id", unreadIds);

      if (error) throw error;
    } catch (error) {
      console.error("Mark all notifications read error:", error);

      // Re-fetch if the database update failed so the UI matches the DB.
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setNotifications(
          data.map((notification) => ({
            ...notification,
            description:
              notification.description ||
              notification.content ||
              "New Wasteless notification.",
          })),
        );
      }

      alert(`Failed to mark notifications as read: ${error.message}`);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!session?.user?.id) return;

    const previousNotifications = notifications;
    const previousDonationReminder = donationReminder;

    // Clear immediately for a responsive UI.
    setNotifications([]);
    setDonationReminder(null);

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", session.user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Clear all notifications error:", error);

      // Restore the previous state if the database operation failed.
      setNotifications(previousNotifications);
      setDonationReminder(previousDonationReminder);
      alert(`Failed to clear notifications: ${error.message}`);
    }
  };
  {
    /* Helper component for consistent info rows */
  }
  function InfoRow({ label, value, icon }) {
    return (
      <div className="flex items-start gap-3">
        <div className="mt-1 text-slate-400">{icon}</div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
            {label}
          </p>
          <p className="text-xs font-semibold text-slate-700">{value}</p>
        </div>
      </div>
    );
  }
  // Automatically select the first transaction if none is selected
  useEffect(() => {
    if (transactions.length > 0 && !selectedTxId) {
      setSelectedTxId(transactions[0].id);
    }
  }, [transactions, selectedTxId]);

  const handleAcceptBid = async (bid, listing) => {
    try {
      if (!bid?.id || !listing?.id) {
        throw new Error("Missing bid or listing information.");
      }

      // Accept is ONLY for the logged-in user's own listing.
      if (listing.seller_id !== session.user.id) {
        throw new Error("You can only accept bids on your own listings.");
      }

      if (profileData?.verification_status !== "verified") {
        throw new Error("Your account is not verified. Marketplace actions are disabled.");
      }

      // Re-read the listing before matching so we do not match a stale card.
      const { data: currentListing, error: currentListingError } = await supabase
        .from("listings")
        .select("id, seller_id, device_model, status, expires_at")
        .eq("id", listing.id)
        .single();
      if (currentListingError) throw currentListingError;

      if (currentListing.seller_id !== session.user.id) {
        throw new Error("You can only accept bids on your own listing.");
      }

      if (String(currentListing.status || "").toLowerCase() !== "active") {
        throw new Error("This listing is no longer active and cannot be matched.");
      }

      if (currentListing.expires_at && new Date(currentListing.expires_at).getTime() <= Date.now()) {
        await supabase
          .from("listings")
          .update({ status: "expired" })
          .eq("id", listing.id)
          .eq("status", "active");
        throw new Error("This listing has expired and can no longer be matched.");
      }

      // Accept the winning bid.
      const { error: bidError } = await supabase
        .from("bids")
        .update({ status: "accepted" })
        .eq("id", bid.id)
        .eq("listing_id", listing.id)
        .eq("status", "pending");
      if (bidError) throw bidError;

      // All other pending bids are no longer active after a match.
      const { error: otherBidsError } = await supabase
        .from("bids")
        .update({ status: "declined" })
        .eq("listing_id", listing.id)
        .eq("status", "pending")
        .neq("id", bid.id);
      if (otherBidsError) throw otherBidsError;

      // IMPORTANT: the listing MUST become Matched, not merely inactive.
      // This keeps the marketplace and transaction state consistent.
      const { error: listingError } = await supabase
        .from("listings")
        .update({ status: "matched" })
        .eq("id", listing.id)
        .eq("seller_id", session.user.id);
      if (listingError) throw listingError;

      // Create or synchronize the transaction as Matched.
      // `harvester_id` is the legacy column name for the winning bidder;
      // it can be another seller in a seller-to-seller transaction.
      const { data: existingTx, error: txLookupError } = await supabase
        .from("transactions")
        .select("id, status, transaction_type")
        .eq("listing_id", listing.id)
        .eq("harvester_id", bid.bidder_id)
        .maybeSingle();
      if (txLookupError) throw txLookupError;

      let transactionId = existingTx?.id || null;

      if (existingTx) {
        const { error: transactionUpdateError } = await supabase
          .from("transactions")
          .update({
            seller_id: session.user.id,
            harvester_id: bid.bidder_id,
            amount: bid.amount,
            status: "Matched",
            transaction_type: "purchase",
            matched_at: new Date().toISOString(),
            cancelled_at: null,
            pending_review_at: null,
          })
          .eq("id", existingTx.id);
        if (transactionUpdateError) throw transactionUpdateError;
      } else {
        const { data: createdTx, error: transactionError } = await supabase
          .from("transactions")
          .insert([
            {
              listing_id: listing.id,
              seller_id: session.user.id,
              harvester_id: bid.bidder_id,
              amount: bid.amount,
              status: "Matched",
              transaction_type: "purchase",
              matched_at: new Date().toISOString(),
              cancelled_at: null,
              pending_review_at: null,
              barangay: "Pending Discussion",
            },
          ])
          .select("id")
          .single();
        if (transactionError) throw transactionError;
        transactionId = createdTx?.id || null;
      }

      // The database trigger should create both Phase 9 notifications.
      // The explicit checks below make this workflow reliable even if the
      // trigger was not installed in the current Supabase project.
      const listingModel = currentListing.device_model || listing.device_model || "Electronic Device";
      const matchNotificationTime = new Date().toISOString();

      const ensureMatchNotification = async ({ userId, title, content, description }) => {
        if (!userId) return;

        const { data: existingNotification, error: notificationLookupError } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("related_listing_id", listing.id)
          .eq("type", "transaction_update")
          .eq("title", title)
          .limit(1)
          .maybeSingle();

        if (notificationLookupError) throw notificationLookupError;

        if (!existingNotification) {
          const { error: notificationInsertError } = await supabase
            .from("notifications")
            .insert([
              {
                user_id: userId,
                type: "transaction_update",
                title,
                content,
                description,
                related_listing_id: listing.id,
                is_read: false,
                created_at: matchNotificationTime,
              },
            ]);

          if (notificationInsertError) throw notificationInsertError;
        }
      };

      // Seller/listing owner MUST receive a match notification.
      await ensureMatchNotification({
        userId: session.user.id,
        title: "Listing Matched",
        content: `${listingModel} is now Matched with the accepted bidder.`,
        description: `Your listing has been matched at ₱${Number(bid.amount).toLocaleString()}.`,
      });

      // Winning bidder MUST receive an acceptance notification.
      await ensureMatchNotification({
        userId: bid.bidder_id,
        title: "Bid Accepted",
        content: `Your bid of ₱${Number(bid.amount).toLocaleString()} for ${listingModel} was accepted by the seller.`,
        description: `Your bid was accepted. The ${listingModel} listing is now Matched with you.`,
      });

      // Send the normal coordination message after the match succeeds.
      const { error: messageError } = await supabase.from("messages").insert([
        {
          listing_id: listing.id,
          sender_id: session.user.id,
          receiver_id: bid.bidder_id,
          content: `Hello! I've accepted your bid of ₱${Number(bid.amount).toLocaleString()} for the ${listingModel}. Let's coordinate the meetup!`,
          is_read: false,
        },
      ]);
      if (messageError) throw messageError;

      setMyListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? {
                ...item,
                status: "matched",
                bids: (item.bids || []).map((b) =>
                  b.id === bid.id
                    ? { ...b, status: "accepted" }
                    : String(b.status || "").toLowerCase() === "pending"
                      ? { ...b, status: "declined" }
                      : b,
                ),
              }
            : item,
        ),
      );

      // Refresh notifications immediately so the seller's own notification
      // appears without requiring a page reload.
      if (typeof fetchNotifications === "function") {
        await fetchNotifications();
      }

      alert("Bid accepted! Both parties have been notified and the listing is now Matched.");
    } catch (error) {
      console.error("Error in bid acceptance:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeclineBid = async (bid, listing) => {
    try {
      if (!bid?.id || !listing?.id) {
        throw new Error("Missing bid or listing information.");
      }
      if (listing.seller_id !== session.user.id) {
        throw new Error("You can only decline bids on your own listings.");
      }

      const { error } = await supabase
        .from("bids")
        .update({ status: "declined" })
        .eq("id", bid.id)
        .eq("listing_id", listing.id);
      if (error) throw error;

      setMyListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? {
              ...item,
              bids: (item.bids || []).map((b) =>
                b.id === bid.id ? { ...b, status: "declined" } : b,
              ),
            }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error declining bid:", err);
      alert(`Failed to decline bid: ${err.message}`);
    }
  };

  useEffect(() => {
    const loadTransactionStatusHistory = async () => {
      if (!selectedTxId) {
        setTransactionStatusHistory([]);
        return;
      }

      setLoadingTransactionStatusHistory(true);
      try {
        const { data, error } = await supabase
          .from("transaction_status_history")
          .select("id,old_status,new_status,changed_at,meetup_date,meetup_time,meeting_location,notes")
          .eq("transaction_id", selectedTxId)
          .order("changed_at", { ascending: true });

        if (error) {
          console.warn("Transaction history unavailable until Phase 7 migration is applied:", error.message);
          setTransactionStatusHistory([]);
          return;
        }
        setTransactionStatusHistory(data || []);
      } finally {
        setLoadingTransactionStatusHistory(false);
      }
    };

    loadTransactionStatusHistory();
  }, [selectedTxId, transactions.find((tx) => tx.id === selectedTxId)?.status]);

  // Requirement 7 / REQ-1:
  // One authoritative transaction loader is reused after realtime changes.
  const fetchUserTransactions = async () => {
    if (!isAuthorized || !session?.user?.id) return [];

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        seller:seller_id (
          full_name,
          business_name,
          role
        ),
        harvester:harvester_id (
          full_name,
          business_name,
          role
        ),
        listing:listing_id (device_model, asking_price)
      `)
      .or(`seller_id.eq.${session.user.id},harvester_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    setTransactions(data || []);
    return data || [];
  };

  useEffect(() => {
    if (!isAuthorized || !session?.user?.id) return;

    if (activeTab === "transactions") {
      fetchUserTransactions().catch((err) => {
        console.error("Error fetching transactions:", err);
      });
    }
  }, [session?.user?.id, activeTab, isAuthorized]);

  // Requirement 7 / REQ-2:
  // Keep both transaction participants synchronized in real time.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !isAuthorized) return;

    let disposed = false;

    const refreshTransactions = async () => {
      try {
        const fresh = await fetchUserTransactions();

        if (disposed) return;

        // If the selected transaction disappeared, fall back to the first one.
        setSelectedTxId((currentId) =>
          currentId && fresh.some((tx) => tx.id === currentId)
            ? currentId
            : fresh[0]?.id || null
        );
      } catch (error) {
        console.error("Realtime transaction refresh failed:", error);
      }
    };

    const channel = supabase
      .channel(`seller-dashboard-transactions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          const row = payload.new || payload.old;
          if (!row) return;

          const belongsToUser =
            row.seller_id === userId || row.harvester_id === userId;

          if (belongsToUser) {
            refreshTransactions();
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Transaction realtime subscription failed.");
        }
      });

    return () => {
      disposed = true;
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, isAuthorized, selectedTxId]);

  // Requirement 7 / REQ-3:
  // Refresh the selected transaction's complete status history whenever
  // the database history table changes.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !selectedTxId || !isAuthorized) return;

    const historyChannel = supabase
      .channel(`seller-dashboard-history-${selectedTxId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transaction_status_history",
          filter: `transaction_id=eq.${selectedTxId}`,
        },
        async () => {
          try {
            const { data, error } = await supabase
              .from("transaction_status_history")
              .select(
                "id,old_status,new_status,changed_at,meetup_date,meetup_time,meeting_location,notes"
              )
              .eq("transaction_id", selectedTxId)
              .order("changed_at", { ascending: true });

            if (error) throw error;
            setTransactionStatusHistory(data || []);
          } catch (error) {
            console.warn(
              "Unable to refresh transaction status history:",
              error.message
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(historyChannel);
    };
  }, [session?.user?.id, selectedTxId, isAuthorized]);
  useEffect(() => {
    const verifyRole = async () => {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      console.log("ROLE CHECK DEBUG:", data, error); // 👈 ADD THIS

      if (error || !data) {
        alert("Profile not found in database.");
        await supabase.auth.signOut();
        return;
      }

      const dbRole = data.role?.toLowerCase().trim();
      if (!["harvester"].includes(dbRole)) {
        console.error("Role Mismatch. Found:", dbRole);
        alert(`Access Denied: Your account is registered as a ${dbRole}.`);
        await supabase.auth.signOut();
        return;
      }

      setIsAuthorized(true);
      setCheckingRole(false);
    };
    verifyRole();
  }, [session]);
  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      if (!isMounted) return;

      // Support both description and content so notifications created by
      // different parts of the app (including bid notifications) render.
      const normalizedNotifications = (data || []).map((notification) => ({
        ...notification,
        description:
          notification.description ||
          notification.content ||
          "New Wasteless notification.",
      }));

      setNotifications(normalizedNotifications);
    };

    fetchNotifications();

    // Keep the notification bell current even when a bid is submitted from
    // another dashboard/session. Realtime can be enabled separately, but the
    // polling fallback does not depend on Realtime publication settings.
    const refreshTimer = window.setInterval(fetchNotifications, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [session?.user?.id]);
  // Load profile data together with the user's completed harvesting
  // transactions so the Trust Tier CO₂ card always reflects the database.
  // carbon_saved is stored on transactions and is the source of truth for
  // the recovery contribution.
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id || !isAuthorized) return;

      try {
        const userId = session.user.id;

        const [{ data: profile, error: profileError }, { data: recoveryTransactions, error: recoveryError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .single(),
            supabase
              .from("transactions")
              .select("id, harvester_id, status, carbon_saved")
              .eq("harvester_id", userId)
              .eq("status", "completed"),
          ]);

        if (profileError) throw profileError;

        if (recoveryError) {
          console.error("Error loading CO₂ recovery data:", recoveryError);
        }

        const completedRecoveryTransactions = recoveryTransactions || [];
        const recoveredDevices = completedRecoveryTransactions.length;
        const co2RecoveredKg = completedRecoveryTransactions.reduce(
          (sum, transaction) => sum + Number(transaction.carbon_saved || 0),
          0,
        );

        setProfileData({
          ...profile,
          recovered_devices: recoveredDevices,
          completed_pickups: recoveredDevices,
          co2_recovered_kg: Number(co2RecoveredKg.toFixed(2)),
        });
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    fetchProfile();
  }, [session?.user?.id, isAuthorized]);

  useEffect(() => {
    if (!myListings || myListings.length === 0) return;

    const now = Date.now();
    const SAFE_STORAGE_DAYS = 60;
    const safeStorageMs = SAFE_STORAGE_DAYS * 24 * 60 * 60 * 1000;

    const getSafeStorageExpiry = (listing) => {
      const condition = String(listing?.condition || "").trim().toLowerCase();
      const category = String(listing?.category || "").trim().toLowerCase();

      // TC_HAZ_03 applies to Not Working / For Parts inventory.
      const isNotWorkingOrParts =
        condition === "not working" ||
        condition.includes("not working") ||
        category === "parts" ||
        category.includes("for parts");

      if (!isNotWorkingOrParts) return null;

      if (listing?.expires_at) {
        const expiry = new Date(listing.expires_at);
        if (!Number.isNaN(expiry.getTime())) return expiry;
      }

      const baseDateValue = listing?.last_working_date || listing?.created_at;
      const baseDate = new Date(baseDateValue);
      if (Number.isNaN(baseDate.getTime())) return null;

      return new Date(baseDate.getTime() + safeStorageMs);
    };

    const expiredActiveListings = myListings.filter((listing) => {
      const status = String(listing?.status || "").toLowerCase();
      const expiry = getSafeStorageExpiry(listing);
      return status === "active" && expiry && expiry.getTime() <= now;
    });

    if (expiredActiveListings.length === 0) return;

    let cancelled = false;

    const expireListings = async () => {
      const expiredIds = [];

      for (const listing of expiredActiveListings) {
        try {
          const { data, error } = await supabase
            .from("listings")
            .update({ status: "expired" })
            .eq("id", listing.id)
            .eq("seller_id", session.user.id)
            .eq("status", "active")
            .select("id,status,device_model,category,condition,created_at,expires_at,asking_price,drop_off_point_id")
            .maybeSingle();

          if (error) throw error;

          if (data) {
            expiredIds.push(listing.id);

            // Expired listings cannot retain actionable pending bids.
            const { error: bidError } = await supabase
              .from("bids")
              .update({ status: "declined" })
              .eq("listing_id", listing.id)
              .eq("status", "pending");

            if (bidError) {
              console.warn("Unable to close pending bids for expired listing:", bidError.message);
            }

            const { error: notificationError } = await supabase
              .from("notifications")
              .insert({
                user_id: session.user.id,
                type: "listing_expired",
                title: "Listing Expired — Action Required",
                description: `Your ${listing.device_model || "device"} listing exceeded its safe-storage period. Choose Donate or Unlist to resolve it.`,
                related_listing_id: listing.id,
                is_read: false,
              });

            if (notificationError) {
              console.warn("Expired-listing notification failed:", notificationError.message);
            }
          }
        } catch (error) {
          console.error("Failed to expire listing:", listing.id, error);
        }
      }

      if (cancelled || expiredIds.length === 0) return;

      const expiredMap = new Map(
        expiredActiveListings
          .filter((listing) => expiredIds.includes(listing.id))
          .map((listing) => [listing.id, { ...listing, status: "expired" }])
      );

      setMyListings((prev) =>
        prev.map((listing) => expiredMap.get(listing.id) || listing)
      );
      setListings((prev) =>
        prev.filter((listing) => !expiredIds.includes(listing.id))
      );

      const firstExpired = expiredActiveListings.find((listing) =>
        expiredIds.includes(listing.id)
      );

      if (firstExpired) {
        const promptListing = { ...firstExpired, status: "expired", isExpired: true };
        setDonationReminder(promptListing);
        setExpiredListingAction(promptListing);
      }
    };

    expireListings();

    return () => {
      cancelled = true;
    };
  }, [myListings, session?.user?.id]);

  useEffect(() => {
    if (!myListings || myListings.length === 0) {
      setDonationReminder(null);
      return;
    }

    // Load the same configuration used by Donation Management
    const savedConfig = localStorage.getItem(
      "wasteless_donation_configuration",
    );

    let config = {
      firstReminder: 7,
      secondReminder: 3,
      autoSuggest: 14,
    };

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);

        config = {
          firstReminder: Number(parsed.firstReminder) || 7,
          secondReminder: Number(parsed.secondReminder) || 3,
          autoSuggest: Number(parsed.autoSuggest) || 14,
        };
      } catch (error) {
        console.error("Failed to read donation configuration:", error);
      }
    }

    setDonationConfig(config);

    const now = new Date();

    // Expired listings immediately surface the Donate action/reminder.
    // This is based on the database status so the owner is prompted as soon
    // as the database expiration worker marks the listing expired.
    const expiredListings = myListings
      .filter((listing) => {
        const status = String(listing.status || "").toLowerCase();
        return status === "expired";
      })
      .map((listing) => {
        const createdDate = new Date(listing.created_at);
        const ageInDays = Number.isNaN(createdDate.getTime())
          ? 0
          : Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...listing, ageInDays, isExpired: true, isStrongSuggestion: true };
      });

    if (expiredListings.length > 0) {
      setDonationReminder(expiredListings[0]);
      setExpiredListingAction(expiredListings[0]);
      return;
    }

    // Normal donation reminders continue to use the existing configuration.
    const eligibleListings = myListings
      .filter((listing) => {
        const status = String(listing.status || "").toLowerCase();
        if (["donated", "drop_off_assigned", "processed", "expired"].includes(status)) return false;
        if (["inactive", "sold", "completed", "cancelled"].includes(status)) return false;

        const createdDate = new Date(listing.created_at);
        if (Number.isNaN(createdDate.getTime())) return false;

        const ageInDays =
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < config.firstReminder) return false;

        const activeBids =
          listing.bids?.filter((bid) => bid.status !== "declined") || [];
        return activeBids.length === 0;
      })
      .map((listing) => {
        const createdDate = new Date(listing.created_at);
        const ageInDays = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        return { ...listing, ageInDays, isExpired: false, isStrongSuggestion: ageInDays >= config.autoSuggest };
      })
      .sort((a, b) => b.ageInDays - a.ageInDays);

    // Show the oldest eligible listing
    setDonationReminder(eligibleListings[0] || null);
  }, [myListings]);

  useEffect(() => {
    const fetchListings = async () => {
      if (!isAuthorized || !session?.user?.id) return;

      try {
        setLoading(true);

        // ==========================================
        // OTHER USERS' ACTIVE LISTINGS
        // ==========================================
        const { data: otherListings, error: otherError } = await supabase
          .from("listings")
          .select(`*, seller:seller_id (full_name, business_name, role, barangay), bids (*)`)
          .neq("seller_id", session.user.id)
          .eq("status", "active")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("created_at", { ascending: false });

        if (otherError) throw otherError;

        setListings(otherListings || []);

        // ==========================================
        // LOGGED-IN USER'S OWN LISTINGS
        // ==========================================
        const { data: ownListings, error: ownError } = await supabase
          .from("listings")
          .select(
            `
            *,
            seller:seller_id (
              full_name,
              business_name,
              role,
              barangay
            ),
            bids (
              *,
              profiles:bidder_id (
                full_name,
                business_name,
                role
              )
            )
          `,
          )
          .eq("seller_id", session.user.id)
          .order("created_at", { ascending: false });

        if (ownError) throw ownError;

        setMyListings(ownListings || []);

        // ==========================================
        // LOGGED-IN USER'S DONATED ITEMS
        // ==========================================
        const donations = (ownListings || []).filter(
          (listing) => listing.status?.toLowerCase() === "donated",
        );

        setMyDonations(donations);
      } catch (err) {
        console.error("Error fetching listings:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [session?.user?.id, isAuthorized]);

  // Keep the dashboard automatically synchronized with listing changes.
  // This makes newly-created listings appear without a browser refresh.
  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId || !isAuthorized) return;

    const refreshListings = async () => {
      try {
        const { data: ownListings, error: ownError } = await supabase
          .from("listings")
          .select(
            `
            *,
            bids (
              *,
              profiles:bidder_id (
                full_name,
                business_name,
                role
              )
            )
          `
          )
          .eq("seller_id", userId)
          .order("created_at", { ascending: false });

        if (ownError) throw ownError;

        setMyListings(ownListings || []);

        const donations = (ownListings || []).filter(
          (listing) => listing.status?.toLowerCase() === "donated"
        );
        setMyDonations(donations);

        const { data: otherListings, error: otherError } = await supabase
          .from("listings")
          .select(`*, seller:seller_id (full_name, business_name, role, barangay), bids (*)`)
          .neq("seller_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (otherError) throw otherError;

        setListings(otherListings || []);
      } catch (err) {
        console.error("Realtime listing refresh error:", err.message);
      }
    };

    const channel = supabase
      .channel(`seller-dashboard-listings-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
          filter: `seller_id=eq.${userId}`,
        },
        () => {
          refreshListings();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
        },
        () => {
          refreshListings();
        }
      )
      .subscribe((status) => {
        console.log("Seller listings realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, isAuthorized]);

  if (checkingRole || !isAuthorized) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center">
        Loading
      </div>
    );
  }
  const handleSelectListing = async (listing) => {
    setBidAmount("");
    setBidMessage("");
    setLoading(true);

    try {
      // Load every bid so the bidder always sees the real current
      // lowest active price before placing another offer.
      const { data: allBids, error: bidsError } = await supabase
        .from("bids")
        .select("id, amount, status, created_at, bidder_id")
        .eq("listing_id", listing.id)
        .order("created_at", { ascending: false });

      if (bidsError) throw bidsError;

      const bids = allBids || [];
      const activeBids = bids.filter(
        (bid) => String(bid.status || "pending").toLowerCase() === "pending"
      );

      const askingPrice = Number(listing.asking_price || 0);
      const validAmounts = activeBids
        .map((bid) => Number(bid.amount || 0))
        .filter((amount) => amount > 0);

      const lowestActiveBid =
        validAmounts.length > 0
          ? Math.min(...validAmounts)
          : askingPrice;

      const selectedWithCurrentPrice = {
        ...listing,
        bids,
        lowest_active_bid: lowestActiveBid,
        current_displayed_price: lowestActiveBid,
      };

      setSelectedListing(selectedWithCurrentPrice);
      setListingBids(
        bids.filter((bid) => bid.bidder_id === session.user.id)
      );
    } catch (error) {
      console.error("Error loading listing bids:", error);
      const askingPrice = Number(listing.asking_price || 0);
      setSelectedListing({
        ...listing,
        bids: listing.bids || [],
        lowest_active_bid: askingPrice,
        current_displayed_price: askingPrice,
      });
      setListingBids([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditProfile = () => {
    setEditProfile({
      full_name: profileData?.full_name || session?.user?.user_metadata?.full_name || "",
      contact_number: profileData?.contact_number || "",
      barangay: profileData?.barangay || "",
    });
    setShowEditProfile(true);
  };

  const handleSaveProfile = async (event) => {
    event?.preventDefault?.();
    if (!session?.user?.id) return alert("Please log in again.");
    if (!editProfile.full_name.trim()) return alert("Please enter your full name.");
    setProfileSaving(true);
    try {
      const updates = {
        full_name: editProfile.full_name.trim(),
        contact_number: editProfile.contact_number.trim() || null,
        barangay: editProfile.barangay || null,
      };
      const { data, error } = await supabase.from("profiles")
        .update(updates).eq("id", session.user.id).select("*").single();
      if (error) throw error;

      // Keep Supabase Auth metadata synchronized for any other component
      // that may still read session.user.user_metadata.
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          contact_number: updates.contact_number,
          barangay: updates.barangay,
        },
      });

      if (authUpdateError) {
        // The profiles table update is already successful, so do not fail
        // the profile save just because Auth metadata could not be synced.
        console.warn("Auth metadata sync failed:", authUpdateError.message);
      }

      setProfileData(data);
      setUser((prev) => prev ? { ...prev, ...data, displayName: data.full_name } : data);
      setShowEditProfile(false);
      alert("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update failed:", error);
      alert(`Could not update profile: ${error.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!window.confirm("Deactivate your account? You will be signed out. Contact support to reactivate it.")) return;
    try {
      const { error } = await supabase.from("profiles")
        .update({ status: "deactivated" }).eq("id", session.user.id);
      if (error) throw error;
      await supabase.auth.signOut();
      alert("Your account has been deactivated.");
    } catch (error) {
      console.error("Account deactivation failed:", error);
      alert(`Could not deactivate account: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    setShowProfileMenu(false); // Close the menu first
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error logging out:", error.message);
  };

  const handleVerificationFileChange = (e, field) => {
    const file = e.target.files[0];

    if (file) {
      setVerificationFiles((prev) => ({
        ...prev,
        [field]: file,
      }));
    }
  };
  const handleVerificationUpdate = async () => {
    try {
      setVerificationLoading(true);

      const updates = {
        full_name: verificationForm.full_name,
        contact_number: verificationForm.contact_number,
        barangay: verificationForm.barangay,
        business_name: verificationForm.business_name,

        verification_status: "pending",
        rejection_reason: null,
        status: "Pending",
      };

      // SELLER VALID ID
      if (profileData?.role === "harvester") {
        if (!verificationFiles.businessPermit) {
          alert("Please upload your valid ID.");
          return;
        }

        const file = verificationFiles.businessPermit;

        const fileExt = file.name.split(".").pop();

        const fileName = `${session.user.id}/permit_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("verifications")
          .upload(`permits/${fileName}`, file, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("verifications")
          .getPublicUrl(`permits/${fileName}`);

        updates.business_permit_url = data.publicUrl;
      }

      // HARVESTER FILES
      if (profileData?.role === "harvester") {
        if (!verificationFiles.businessPermit || !verificationFiles.techCert) {
          alert("Please upload all required files.");
          return;
        }

        // Permit Upload
        const permit = verificationFiles.businessPermit;

        const permitExt = permit.name.split(".").pop();

        const permitName = `${session.user.id}/permit_${Date.now()}.${permitExt}`;

        const { error: permitError } = await supabase.storage
          .from("verifications")
          .upload(`permits/${permitName}`, permit, {
            upsert: true,
          });

        if (permitError) throw permitError;

        const { data: permitData } = supabase.storage
          .from("verifications")
          .getPublicUrl(`permits/${permitName}`);

        updates.business_permit_url = permitData.publicUrl;

        // Tech Cert Upload
        const cert = verificationFiles.techCert;

        const certExt = cert.name.split(".").pop();

        const certName = `${session.user.id}/cert_${Date.now()}.${certExt}`;

        const { error: certError } = await supabase.storage
          .from("verifications")
          .upload(`certs/${certName}`, cert, {
            upsert: true,
          });

        if (certError) throw certError;

        const { data: certData } = supabase.storage
          .from("verifications")
          .getPublicUrl(`certs/${certName}`);

        updates.tech_cert_url = certData.publicUrl;
      }

      // UPDATE PROFILE
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", session.user.id);

      if (profileError) throw profileError;

      // REFRESH LOCAL STATE
      setProfileData((prev) => ({
        ...prev,
        ...updates,
      }));

      setIsVerificationModalOpen(false);

      alert(
        "Documents updated successfully. Your account is now pending verification again.",
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">
      {/* Reference-style gradient banner behind the dashboard header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-r from-cyan-300 via-emerald-200 to-lime-300"
      />
      {/* Header Area */}
      <div className="relative z-10 p-6">
        <div className="flex justify-end items-center gap-4 mb-8 relative z-40">
          

          {/* Message Icon */}
          <div className="relative">
            <button
              type="button"
              aria-label="Open messages"
              onClick={() => {
                setShowMessages(true);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }}
              className="relative flex items-center justify-center text-slate-400 hover:text-[#3285a1] transition-colors"
            >
              <MessageSquare size={24} />
              {messageUserCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full min-w-4 h-4 px-1 flex items-center justify-center border-2 border-white">
                  {messageUserCount > 99 ? "99+" : messageUserCount}
                </span>
              )}
            </button>
          </div>

          {/* Notification Bell with Toggle */}
          <div className="relative">
            <Bell
              className="text-slate-400 cursor-pointer hover:text-[#3285a1] transition-colors"
              size={24}
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false); // Close profile if notification is opened
              }}
            />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
              {notifications.filter((n) => !n.is_read).length}
            </span>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                {/* Invisible full-screen click target. Clicking anywhere outside
                    the notification panel closes it, so the bell does not have
                    to be clicked again. */}
                <button
                  type="button"
                  aria-label="Close notifications"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowNotifications(false)}
                />

                <div
                  className="absolute top-14 right-0 w-85 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  onClick={(event) => event.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                        Notifications
                      </h3>
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        disabled={notifications.filter((n) => !n.is_read).length === 0}
                        className="text-xs text-blue-500 font-bold hover:underline mt-0.5 disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        Mark all read (
                        {notifications.filter((n) => !n.is_read).length})
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllNotifications}
                      disabled={notifications.length === 0 && !donationReminder}
                      className="text-xs bg-slate-50 text-slate-500 px-4 py-2 rounded-full font-black uppercase tracking-tighter hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Clear All
                    </button>
                  </div>
                {donationReminder && (
                  <NotificationItem
                    icon={<Gift />}
                    bg="bg-[#f97316]"
                    title={
                      donationReminder.isExpired
                        ? "Listing Expired — Donate"
                        : donationReminder.isStrongSuggestion
                          ? "Donation Recommended"
                          : "Listing Needs Attention"
                    }
                    desc={
                      donationReminder.isExpired
                        ? `Your ${donationReminder.device_model} listing has expired. It is no longer available in the buyer marketplace. Please donate or resolve the listing.`
                        : `Your ${donationReminder.device_model} listing has received no inquiries for ${donationReminder.ageInDays} days. Consider donating it.`
                    }
                    time={donationReminder.isExpired ? "Expired" : `${donationReminder.ageInDays} days old`}
                    unread={true}
                    onClick={() => {
                      setShowNotifications(false);
                      if (donationReminder.isExpired) {
                        setExpiredListingAction(donationReminder);
                      } else {
                        handleOpenDonation(donationReminder);
                      }
                    }}
                    onDelete={() => setDonationReminder(null)}
                  />
                )}

                {/* Scrollable List */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {/* 2. Dynamic Notifications (Bids, Messages, etc.) */}
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        icon={
                          notif.type === "bid" ? (
                            <TrendingUp />
                          ) : notif.type === "message" ? (
                            <MessageSquare />
                          ) : (
                            <CheckCircle2 />
                          )
                        }
                        onClick={() => {
                          if (notif.type === "listing_expired") {
                            const expiredListing = (myListings || []).find(
                              (listing) => listing.id === notif.related_listing_id,
                            );
                            if (expiredListing) {
                              setShowNotifications(false);
                              setExpiredListingAction({
                                ...expiredListing,
                                isExpired: true,
                              });
                            }
                          }
                        }}
                        bg={
                          notif.type === "bid"
                            ? "bg-[#3b82f6]" // Blue for Bids
                            : notif.type === "message"
                              ? "bg-purple-500" // Purple for Messages
                              : "bg-[#10b981]" // Green for Donations/Success
                        }
                        title={notif.title}
                        desc={notif.description}
                        time={new Date(notif.created_at).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                        unread={!notif.is_read}
                        onDelete={() => deleteNotification(notif.id)}
                      />
                    ))
                  ) : (
                    <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                      No new activities
                    </div>
                  )}
                </div>

                {/* Footer */}
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="w-full py-4 text-xs font-black text-slate-400 bg-slate-50/30 hover:bg-slate-50 transition uppercase tracking-[0.2em] border-t border-slate-50"
                >
                  Close Notifications
                </button>
                </div>
              </>
            )}
          </div>

          {/* Profile Trigger */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="text-right">
              <div className="text-sm font-bold truncate max-w-[120px]">
                {currentProfileName}
              </div>
              <div
                className={`text-xs flex items-center gap-1 justify-end font-semibold ${profileData?.verification_status === "verified"
                  ? "text-emerald-500"
                  : profileData?.verification_status === "pending"
                    ? "text-amber-500"
                    : profileData?.verification_status === "rejected"
                      ? "text-red-500"
                      : "text-slate-400"
                  }`}
              >
                <CheckCircle size={10} />

                {profileData?.verification_status === "verified"
                  ? "Verified"
                  : profileData?.verification_status === "pending"
                    ? "Pending Verification"
                    : profileData?.verification_status === "rejected"
                      ? "Verification Rejected"
                      : "Not Submitted"}
              </div>
            </div>
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
              {currentProfileName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Dropdown Header */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
                    {currentProfileName.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-bold truncate">
                      {currentProfileName}
                    </div>
                    <div className="text-xs opacity-80 truncate">
                      {session.user.email}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/10 rounded-lg p-1.5 text-center">
                    <div className="text-xs opacity-70 flex items-center justify-center gap-1">
                      <Star size={10} /> Rating
                    </div>
                    <div className="text-xs font-bold">
                      {profileData?.average_rating
                        ? Number(profileData.average_rating).toFixed(1)
                        : "0.0"}
                    </div>
                  </div>
                  <div className="flex-1 bg-white/10 rounded-lg p-1.5 text-center">
                    <div className="text-xs opacity-70 flex items-center justify-center gap-1">
                      <Package size={10} /> Listings
                    </div>
                    <div className="text-xs font-bold">{listings.length}</div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={() => {
                    setProfileModalTab("profile");
                    setShowProfileModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition"
                >
                  <User size={18} className="text-slate-400" /> View Profile
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition">
                  <Settings size={18} className="text-slate-400" /> Settings
                </button>
                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAchievementsModal(true);
                                    setShowProfileMenu(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition"
                                >
                                  <Award size={18} className="text-slate-400" /> Achievements
                                </button>

                {showAchievements && (
                  <div className="mx-1 mb-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-white text-emerald-700 flex items-center justify-center">
                        <Award size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Current Trust Tier
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          {getTrustTierLabel(currentTrustTier?.name)}
                        </p>
                      </div>
                    </div>

                    {trustTierLoading ? (
                      <p className="text-xs text-slate-500">Loading achievements…</p>
                    ) : trustTierError ? (
                      <p className="text-xs text-red-600">{trustTierError}</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-white p-2">
                            <p className="text-xs text-slate-500">Completed transactions</p>
                            <p className="text-sm font-black text-slate-800">
                              {userTrustStats.completedTransactions}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white p-2">
                            <p className="text-xs text-slate-500">Average rating</p>
                            <p className="text-sm font-black text-slate-800">
                              {Number(userTrustStats.averageRating || 0).toFixed(1)} / 5
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between gap-2 text-xs text-slate-500 mb-1">
                            <span>Progress to {nextTrustTier ? getTrustTierLabel(nextTrustTier.name) : "top tier"}</span>
                            <span className="font-bold">{progressPercent}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                            Tier privileges
                          </p>
                          {currentTrustTier?.privileges?.length ? (
                            <ul className="space-y-1">
                              {currentTrustTier.privileges.map((privilege, index) => (
                                <li key={`${privilege}-${index}`} className="text-xs text-slate-600 flex gap-2">
                                  <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{privilege}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-500">No privileges listed for this tier.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <hr className="my-2 border-slate-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition font-medium"
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards & Main Dashboard Content (Keep existing code below here) */}

        {profileData?.verification_status === "rejected" && (
          <div className="mb-8 flex items-center gap-6 rounded-[2rem] border-2 border-red-100 bg-red-50 p-6 animate-in slide-in-from-top duration-500">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <XCircle size={24} />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-black uppercase tracking-tight text-red-800">
                Account Verification Rejected
              </h3>

              <p className="mt-1 text-xs font-medium text-red-600">
                Reason:{" "}
                <span className="font-bold">
                  "
                  {profileData?.rejection_reason ||
                    "No specific reason provided."}
                  "
                </span>
              </p>

              <p className="mt-2 text-xs text-red-400">
                Please update your documents and re-submit for approval.
              </p>
            </div>

            <button
              onClick={() => setIsVerificationModalOpen(true)}
              className="rounded-xl bg-red-600 px-6 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-red-700"
            >
              Update Profile
            </button>
          </div>
        )}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "My Active Listings",
              val: myListings.filter(
                (item) => item.status?.toLowerCase() === "active",
              ).length,
            },
            {
              label: "Bids Received",
              val: myListings.reduce(
                (sum, item) =>
                  sum +
                  (item.bids?.filter((bid) => bid.status !== "declined")
                    .length || 0),
                0,
              ),
            },
            { label: "Messages", val: messageUserCount },
            {
              label: "Rating",
              val: profileData?.average_rating?.toFixed(1) || "4.8",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white py-8 rounded-2xl shadow-sm border border-slate-100 text-center"
            >
              <div className="text-3xl font-black mb-1 text-slate-800">
                {stat.val}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-1 flex mb-8">
          {[
            "listings",
            "transactions",
            "repair-shops",
            "donation",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition capitalize ${activeTab === tab
                ? "bg-[#3285a1] text-white"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              {tab === "listings" && <Package size={18} />}
              {tab === "transactions" && <ArrowLeftRight size={18} />}
              {tab === "repair-shops" && <Wrench size={18} />}
              {tab === "donation" && <Gift size={18} />}
              

              {tab === "listings"
                ? "Listings"
                : tab === "repair-shops"
                  ? "Repair Shop"
                  : tab === "donation"
                    ? "Donation"
                    : "Transactions"}
            </button>
          ))}
        </div>

        {/* --- MESSAGES OVERLAY --- */}
        {showMessages && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
              <button
                type="button"
                aria-label="Close messages"
                onClick={() => setShowMessages(false)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:text-slate-800 transition shadow-sm"
              >
                <X size={18} />
              </button>

              <div className="h-full overflow-y-auto">
                <SellerMessages
                  userId={session.user.id}
                  onTabChange={(tab) => {
                    setShowMessages(false);
                    if (tab && tab !== "messages") setActiveTab(tab);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        <div className="min-h-[600px]">
          {activeTab === "listings" && (() => {
            const normalizeCondition = (condition) =>
              String(condition || "").toLowerCase() === "working"
                ? "Working"
                : "Not Working";

            const formatStatus = (status) => {
              const value = String(status || "active").toLowerCase();
              if (value === "inactive") return "Sold";
              if (value === "donated") return "For Donation";
              if (value === "drop_off_assigned") return "Drop-off Assigned";
              if (value === "processed") return "Processed";
              if (value === "matched") return "Matched";
              return value.charAt(0).toUpperCase() + value.slice(1);
            };

            const getListingOwner = (item) => {
              if (item.seller_id === session.user.id) {
                return displayName || currentProfileName || "You";
              }
              return (
                item.seller?.business_name ||
                item.seller?.full_name ||
                item.owner_name ||
                "Seller"
              );
            };

            const getListingBarangay = (item) =>
              item.barangay || item.seller?.barangay ||
              (item.seller_id === session.user.id ? currentProfileBarangay : "Barangay not set");

            const getVisibleBids = (item) =>
              (item.bids || []).filter((bid) => bid.status !== "declined");

            // The marketplace view includes every active listing, regardless of
            // condition, and includes the current user's active listings too.
            const allMarketplaceListings = Array.from(
              new Map(
                [
                  ...listings,
                  ...myListings.filter(
                    (item) => String(item.status || "").toLowerCase() === "active"
                  ),
                ]
                  // Listings tab should display ONLY Working items.
                  .filter(
                    (item) =>
                      String(item.condition || "").trim().toLowerCase() === "working"
                  )
                  .map((item) => [item.id, item])
              ).values()
            ).sort((a, b) => {
              // Higher trust tiers are intentionally prioritized for marketplace
              // visibility. Creation date remains the tie-breaker.
              const aTier = sellerTrustTiers[a.seller_id];
              const bTier = sellerTrustTiers[b.seller_id];
              const aRank = aTier ? Number(aTier.min_transactions || 0) : 0;
              const bRank = bTier ? Number(bTier.min_transactions || 0) : 0;
              if (bRank !== aRank) return bRank - aRank;
              return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            // Keep the Listings tab restricted to Working items only.
            // Non-working / defective listings remain in the database but are
            // intentionally not rendered in this tab.
            const myCreatedListings = myListings.filter(
              (item) => String(item.condition || "").trim().toLowerCase() === "working"
            );
            const receivedBids = myCreatedListings
              .flatMap((listing) =>
                getVisibleBids(listing).map((bid) => ({ ...bid, listing }))
              )
              .sort(
                (a, b) =>
                  new Date(b.created_at || 0).getTime() -
                  new Date(a.created_at || 0).getTime()
              );
            const myBids = allMarketplaceListings
              .filter((listing) => listing.seller_id !== session.user.id)
              .flatMap((listing) =>
                getVisibleBids(listing)
                  .filter((bid) => bid.bidder_id === session.user.id)
                  .map((bid) => ({ ...bid, listing }))
              )
              .sort(
                (a, b) =>
                  new Date(b.created_at || 0).getTime() -
                  new Date(a.created_at || 0).getTime()
              );

            const tabs = [
              { key: "all", label: "All Marketplace Listings", count: allMarketplaceListings.length },
              { key: "created", label: "My Created Listings", count: myCreatedListings.length },
              { key: "received", label: "Bids Received", count: receivedBids.length },
              { key: "my-bids", label: "My Bids", count: myBids.length },
            ];

            const activeItems =
              listingSubTab === "all"
                ? allMarketplaceListings
                : listingSubTab === "created"
                  ? myCreatedListings
                  : listingSubTab === "received"
                    ? receivedBids
                    : myBids;

            const openNewListing = () => {
              if (profileData?.verification_status !== "verified") {
                alert("Your account is still pending admin verification. You cannot create listings yet.");
                return;
              }
              if (!hasTrustPrivilege(["basic listings", "listings"])) {
                alert(`This action is restricted to your current trust tier (${getTrustTierLabel(currentTrustTier.name)}). Requirements and available privileges are shown in your Trust Tier section.`);
                return;
              }
              setIsModalOpen(true);
            };

            const renderListingCard = (item, mode = "listing") => {
              const bidsForItem = getVisibleBids(item);
              const isMine = item.seller_id === session.user.id;
              const status = String(item.status || "active").toLowerCase();
              const isActive = status === "active";
              const condition = normalizeCondition(item.condition);
              const statusLabel = formatStatus(item.status);
              const owner = getListingOwner(item);
              const barangay = getListingBarangay(item);
              const deviceId = item.device_id || item.model_number || item.serial_number || "Electronic Device";
              const firstBid = bidsForItem[0];
              const pendingBids = bidsForItem.filter(
                (bid) => String(bid.status || "").toLowerCase() === "pending"
              );
              const pendingAmounts = pendingBids
                .map((bid) => Number(bid.amount || 0))
                .filter((amount) => amount > 0);
              const lowestActiveBid =
                pendingAmounts.length > 0
                  ? Math.min(...pendingAmounts)
                  : Number(item.asking_price || 0);

              if (mode === "bid") {
                const bid = item;
                const listing = item.listing;
                const asking = Number(listing?.asking_price || 0);
                const amount = Number(bid.amount || 0);
                const percentage = asking > 0 ? Math.round((amount / asking) * 100) : 0;
                return (
                  <article key={`my-bid-${bid.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#3285a1]/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef7fa] text-[#3285a1]">
                          <Package size={22} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black text-slate-800">{listing?.device_model || "Electronic Device"}</h3>
                          <p className="mt-1 text-xs text-slate-400">{listing?.device_id || listing?.model_number || "Device"}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${bid.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {bid.status === "accepted" ? "Accepted" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                        <p className="text-[11px] text-slate-400">Asking</p>
                        <p className="mt-1 text-sm font-black text-slate-800">₱{asking.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-[#eef7fa] px-3 py-3 text-center">
                        <p className="text-[11px] text-slate-400">Your Bid</p>
                        <p className="mt-1 text-sm font-black text-[#3285a1]">₱{amount.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                        <p className="text-[11px] text-slate-400">Share</p>
                        <p className="mt-1 text-sm font-black text-slate-800">{percentage}%</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                      <MapPin size={14} /> {getListingBarangay(listing)} <span>·</span> {getListingOwner(listing)}
                    </div>
                    <button type="button" onClick={() => handleSelectListing(listing)} className="mt-4 w-full rounded-xl bg-[#3285a1] py-3 text-sm font-bold text-white hover:bg-[#2a7189] transition">
                      View Listing
                    </button>
                  </article>
                );
              }

              return (
                <article key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition ${isMine ? "border-[#a9d9e7] ring-1 ring-[#dff2f7]" : "border-slate-200 hover:border-[#a9d9e7]"}`}>
                  {isMine && mode === "all" && (
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#eef7fa] px-2.5 py-1 text-[10px] font-bold text-[#3285a1]">
                      <User size={12} /> Your Listing
                    </div>
                  )}
                  {!isMine && mode === "all" && sellerTrustTiers[item.seller_id] &&
                    Number(sellerTrustTiers[item.seller_id].min_transactions || 0) > 0 && (
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 border border-amber-100">
                      <Award size={12} /> Recommended Seller · {getTrustTierLabel(sellerTrustTiers[item.seller_id].name)}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f0f8f3] to-[#edf7fa] text-[#3285a1]">
                        <Package size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-800">{item.device_model || "Electronic Device"}</h3>
                        <p className="mt-1 truncate text-xs text-slate-400">{deviceId}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${status === "active" ? "bg-emerald-100 text-emerald-700" : status === "donated" ? "bg-purple-100 text-purple-700" : status === "inactive" ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700"}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                      <p className="text-[11px] text-slate-400">Asking</p>
                      <p className="mt-1 text-sm font-black text-slate-800">₱{Number(item.asking_price || 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-[#eef5ff] px-3 py-3 text-center">
                      <p className="text-[11px] text-slate-400">Current Lowest</p>
                      <p className="mt-1 text-sm font-black text-[#3285a1]">₱{lowestActiveBid.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                      <p className="text-[11px] text-slate-400">Condition</p>
                      <p className={`mt-1 text-sm font-semibold ${condition === "Working" ? "text-emerald-600" : "text-orange-500"}`}>{condition}</p>
                    </div>
                    <div className={`rounded-xl px-3 py-3 text-center ${bidsForItem.length > 0 ? "bg-[#eef5ff]" : "bg-slate-50"}`}>
                      <p className="text-[11px] text-slate-400">Bids</p>
                      <p className="mt-1 text-sm font-black text-[#3285a1]">{bidsForItem.length}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 truncate text-xs text-slate-400">
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">{barangay}</span>
                    <span>·</span>
                    <span className="truncate">{owner}</span>
                  </div>

                  {mode === "all" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isMine) {
                          if (firstBid) setSelectedBidListing(item);
                          else setSelectedListingDetails(item);
                        } else {
                          setSelectedListingDetails(item);
                        }
                      }}
                      className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold transition ${isMine && firstBid ? "bg-[#3285a1] text-white hover:bg-[#2a7189]" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                    >
                      {isMine ? (firstBid ? `View ${bidsForItem.length} Bid${bidsForItem.length === 1 ? "" : "s"}` : "Manage Listing") : "Marketplace Listing"}
                    </button>
                  ) : mode === "created" ? (
                    <button
                      type="button"
                      onClick={() => firstBid ? setSelectedBidListing(item) : setSelectedListingDetails(item)}
                      className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold transition ${firstBid ? "bg-[#3285a1] text-white hover:bg-[#2a7189]" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                    >
                      {firstBid ? `View ${bidsForItem.length} Bid${bidsForItem.length === 1 ? "" : "s"}` : "View Details"}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setSelectedListingDetails(item)} className="mt-4 w-full rounded-xl bg-slate-50 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
                      View Details
                    </button>
                  )}
                </article>
              );
            };

            return (
              <div className="animate-in fade-in duration-300 pt-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-black text-slate-900">Listings</h2>
                  <button type="button" onClick={openNewListing} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3285a1] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#2a7189] transition">
                    <Plus size={18} /> New Listing
                  </button>
                </div>

                <div className="mb-7 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setListingSubTab(tab.key)}
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition ${listingSubTab === tab.key ? "border-[#3285a1] bg-[#3285a1] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {tab.label}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${listingSubTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
                    <Package size={28} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-500">Loading listings...</p>
                  </div>
                ) : activeItems.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                    <Package size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-600">
                      {listingSubTab === "created" ? "You haven't created any listings yet." : listingSubTab === "received" ? "No bids received yet." : listingSubTab === "my-bids" ? "You haven't placed any bids yet." : "No marketplace listings available."}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {listingSubTab === "created" ? "Create a listing to make your item available in the marketplace." : "Your listing activity will appear here when available."}
                    </p>
                    {listingSubTab === "created" && (
                      <button type="button" onClick={openNewListing} className="mt-5 rounded-xl bg-[#3285a1] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#2a7189]">Create Listing</button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {listingSubTab === "received"
                      ? receivedBids.map(({ listing, ...bid }) => {
                          const bidderName = getBuyerDisplayName(bid.profiles);
                          const initials = bidderName.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TH";
                          return (
                            <article key={bid.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef7fa] text-sm font-black text-[#3285a1]">{initials}</div>
                                  <div className="min-w-0">
                                    <button type="button" onClick={() => setSelectedBidder({ ...(bid.profiles || {}), id: bid.bidder_id })} className="block truncate text-left text-base font-black text-slate-800 hover:text-[#3285a1]">{bidderName}</button>
                                    <p className="mt-1 truncate text-xs text-slate-500">{listing.device_model || "Your listing"}</p>
                                  </div>
                                </div>
                                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${bid.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{bid.status === "accepted" ? "Accepted" : "Pending"}</span>
                              </div>
                              <div className="mt-5 grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center"><p className="text-[11px] text-slate-400">Asking</p><p className="mt-1 text-sm font-black text-slate-800">₱{Number(listing.asking_price || 0).toLocaleString()}</p></div>
                                <div className="rounded-xl bg-[#eef5ff] px-3 py-3 text-center"><p className="text-[11px] text-slate-400">Offer</p><p className="mt-1 text-sm font-black text-[#3285a1]">₱{Number(bid.amount || 0).toLocaleString()}</p></div>
                                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center"><p className="text-[11px] text-slate-400">Bids</p><p className="mt-1 text-sm font-black text-slate-800">{getVisibleBids(listing).length}</p></div>
                              </div>
                              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><MapPin size={14} /> {getListingBarangay(listing)} <span>·</span> {getListingOwner(listing)}</div>
                              {bid.status === "pending" && (
                                <div className="mt-4 flex gap-2">
                                  <button type="button" onClick={() => handleAcceptBid(bid, listing)} className="flex-1 rounded-xl bg-[#3285a1] py-3 text-xs font-black text-white hover:bg-[#2a7189]"><Check size={14} className="mr-1 inline" /> Accept</button>
                                  <button type="button" onClick={() => handleDeclineBid(bid, listing)} className="flex-1 rounded-xl border border-red-200 py-3 text-xs font-black text-red-600 hover:bg-red-50"><X size={14} className="mr-1 inline" /> Decline</button>
                                </div>
                              )}
                            </article>
                          );
                        })
                      : listingSubTab === "my-bids"
                        ? myBids.map((item) => renderListingCard(item, "bid"))
                        : activeItems.map((item) => renderListingCard(item, listingSubTab))}
                  </div>
                )}

                {selectedBidListing && (
                  <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                        <div>
                          <h3 className="text-lg font-black text-slate-800">Bids for {selectedBidListing.device_model || "Listing"}</h3>
                          <p className="mt-1 text-xs text-slate-400">Review offers and manage the listing.</p>
                        </div>
                        <button type="button" onClick={() => setSelectedBidListing(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
                      </div>
                      <div className="max-h-[65vh] space-y-3 overflow-y-auto p-6">
                        {getVisibleBids(selectedBidListing).length === 0 ? (
                          <div className="py-10 text-center text-sm text-slate-400">No active bids on this listing.</div>
                        ) : getVisibleBids(selectedBidListing).map((bid) => {
                          const bidderName = getBuyerDisplayName(bid.profiles);
                          return (
                            <div key={bid.id} className="rounded-2xl border border-slate-200 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <button type="button" onClick={() => setSelectedBidder({ ...(bid.profiles || {}), id: bid.bidder_id })} className="text-sm font-black text-slate-800 hover:text-[#3285a1]">{bidderName}</button>
                                  <p className="mt-1 text-xs text-slate-400">Offer for {selectedBidListing.device_model}</p>
                                </div>
                                <span className="text-lg font-black text-[#3285a1]">₱{Number(bid.amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${bid.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{bid.status === "accepted" ? "Accepted" : "Pending"}</span>
                                {bid.status === "pending" && selectedBidListing.seller_id === session.user.id && (
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => { handleAcceptBid(bid, selectedBidListing); setSelectedBidListing(null); }} className="rounded-lg bg-[#3285a1] px-3 py-2 text-xs font-bold text-white">Accept</button>
                                    <button type="button" onClick={() => handleDeclineBid(bid, selectedBidListing)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600">Decline</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {selectedListingDetails && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7fa] text-[#3285a1]"><Package size={22} /></div>
                          <div>
                            <h3 className="text-lg font-black text-slate-800">{selectedListingDetails.device_model || "Electronic Device"}</h3>
                            <p className="mt-1 text-xs text-slate-400">{selectedListingDetails.device_id || selectedListingDetails.model_number || "Device"}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setSelectedListingDetails(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X size={18} /></button>
                      </div>
                      <div className="space-y-4 p-6">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 p-4"><p className="text-[11px] text-slate-400">Asking Price</p><p className="mt-1 text-lg font-black text-slate-800">₱{Number(selectedListingDetails.asking_price || 0).toLocaleString()}</p></div>
                          <div className="rounded-xl bg-slate-50 p-4"><p className="text-[11px] text-slate-400">Condition</p><p className={`mt-1 text-lg font-bold ${normalizeCondition(selectedListingDetails.condition) === "Working" ? "text-emerald-600" : "text-orange-500"}`}>{normalizeCondition(selectedListingDetails.condition)}</p></div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{selectedListingDetails.description || "No additional description provided."}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={14} /> {getListingBarangay(selectedListingDetails)} <span>·</span> {getListingOwner(selectedListingDetails)}</div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setSelectedListingDetails(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
                          {selectedListingDetails.seller_id !== session.user.id && String(selectedListingDetails.status).toLowerCase() === "active" && (
                            <button type="button" onClick={() => { setSelectedListingDetails(null); handleSelectListing(selectedListingDetails); }} className="flex-1 rounded-xl bg-[#3285a1] py-3 text-sm font-bold text-white hover:bg-[#2a7189]">Place Bid</button>
                          )}
                          {selectedListingDetails.seller_id === session.user.id && getVisibleBids(selectedListingDetails).length > 0 && (
                            <button type="button" onClick={() => { setSelectedListingDetails(null); setSelectedBidListing(selectedListingDetails); }} className="flex-1 rounded-xl bg-[#3285a1] py-3 text-sm font-bold text-white hover:bg-[#2a7189]">View Bids</button>
                          )}
                          {selectedListingDetails.seller_id === session.user.id && ["active", "expired"].includes(String(selectedListingDetails.status).toLowerCase()) && getVisibleBids(selectedListingDetails).length === 0 && (
                            <button type="button" onClick={() => {
                              setSelectedListingDetails(null);
                              if (String(selectedListingDetails.status).toLowerCase() === "expired") {
                                setExpiredListingAction({ ...selectedListingDetails, isExpired: true });
                              } else {
                                handleOpenDonation(selectedListingDetails);
                              }
                            }} className="flex-1 rounded-xl border border-purple-200 bg-purple-50 py-3 text-sm font-bold text-purple-700 hover:bg-purple-100">
                              {String(selectedListingDetails.status).toLowerCase() === "expired" ? "Resolve Listing" : "Donate"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* --- TRANSACTIONS TAB --- */}
          {activeTab === "transactions" && (
            <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
              <div className="flex items-center mt-16 justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">
                    Active Transactions
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Transactions where you are either the seller or the buyer.
                  </p>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="bg-white rounded-xl border-2 mt-7border-dashed border-slate-100 p-12 text-center">
                  <ArrowLeftRight size={30} className="mx-auto text-slate-300" />
                  <p className="text-sm mt-7 font-bold text-slate-500 mt-3">
                    No active transactions
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepted bids and purchases will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-6">
                  {/* LEFT: TRANSACTION LIST */}
                  <div className="col-span-4 space-y-3 overflow-y-auto max-h-[600px] pr-2 no-scrollbar">
                    {transactions.map((tx) => {
                      const isSeller = tx.seller_id === session.user.id;
                      const isBuyer = tx.harvester_id === session.user.id;
                      const isCompleted = tx.status === "completed";
                      const isRepair = isRepairTransaction(tx);

                      const otherParty = isSeller ? tx.harvester : tx.seller;
                      const otherPartyName =
                        otherParty?.business_name ||
                        otherParty?.full_name ||
                        "Unknown User";

                      return (
                        <button
                          key={tx.id}
                          onClick={() => setSelectedTxId(tx.id)}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                            selectedTxId === tx.id
                              ? "border-[#2d7a7f] bg-blue-50/50 shadow-sm"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h4 className="font-bold text-sm text-slate-800 truncate">
                              {isRepair ? getRepairDevice(tx) : tx.listing?.device_model || "Electronic Item"}
                            </h4>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${
                                isCompleted
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : tx.status === "cancelled"
                                    ? "bg-red-50 text-red-600 border-red-200"
                                    : tx.status === "pending_review"
                                    ? "bg-amber-100 text-amber-700 border-amber-300"
                                    : tx.status === "meetup_scheduled"
                                      ? "bg-blue-50 text-blue-600 border-blue-200"
                                      : "bg-amber-50 text-amber-600 border-amber-200"
                              }`}
                            >
                              {isRepair
                                ? isCompleted
                                  ? "Repair Completed"
                                  : tx.status === "meetup_scheduled"
                                    ? "Repair Scheduled"
                                    : tx.status === "cancelled"
                                      ? "Cancelled"
                                      : "Repair Pending"
                                : isCompleted
                                  ? "Completed"
                                  : tx.status === "pending_review"
                                    ? "Pending Review"
                                    : tx.status === "meetup_scheduled"
                                      ? "Meetup Scheduled"
                                      : tx.status === "cancelled"
                                        ? "Cancelled"
                                        : "Pending"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mb-2">
                            {isRepair ? "Repair Shop" : isSeller ? "Buyer" : "Seller"}: {otherPartyName}
                          </p>

                          <div className="flex items-center justify-between">
                            {/* <p className="text-sm font-black text-[#2d7a7f]">
                              {isRepair ? "No payment" : `₱${Number(tx.amount || 0).toLocaleString()}`}
                            </p> */}
                            <span
                              className={`text-xs font-black px-2 py-1 rounded-full ${
                                isSeller
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {isRepair ? "REPAIR" : isSeller ? "SELLING" : "BUYING"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* RIGHT: DETAILS */}
                  <div className="col-span-8">
                    {transactions.find((t) => t.id === selectedTxId) ? (
                      (() => {
                        const tx = transactions.find((t) => t.id === selectedTxId);
                        const isSeller = tx.seller_id === session.user.id;
                        const isBuyer = tx.harvester_id === session.user.id;
                        const isCompleted = tx.status === "completed";
                        const isMeetupScheduled = tx.status === "meetup_scheduled";
                        const isPendingReview = tx.status === "pending_review";
                        const isRepair = isRepairTransaction(tx);
                        const repairDevice = getRepairDevice(tx);
                        const repairCategory = getRepairCategory(tx);
                        const repairIssue = getRepairIssue(tx);
                        const repairNotes = getRepairNotes(tx);

                        const sellerName =
                          tx.seller?.business_name ||
                          tx.seller?.full_name ||
                          "Unknown Seller";
                        const buyerName =
                          tx.harvester?.business_name ||
                          tx.harvester?.full_name ||
                          "Unknown Buyer";

                        return (
                          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                            <div className="bg-[#2d7a7f] p-6 text-white flex justify-between items-start">
                              <div>
                                <h2 className="text-xl font-bold">
                                  {isRepair ? repairDevice : tx.listing?.device_model || "Electronic Item"}
                                </h2>
                                <p className="text-xs opacity-80 uppercase tracking-wider mt-1">
                                  Transaction ID: {tx.id.slice(0, 8)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                                  {isRepair
                                    ? isCompleted
                                      ? "Repair Completed"
                                      : isMeetupScheduled
                                        ? "Repair Scheduled"
                                        : "Repair Matched"
                                    : isCompleted
                                      ? "Completed"
                                      : isPendingReview
                                        ? "Pending Review"
                                        : isMeetupScheduled
                                          ? "Meetup Scheduled"
                                          : "Matched"}
                                </span>
                                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-black uppercase">
                                  {isSeller ? "You are selling" : "You are buying"}
                                </span>
                              </div>
                            </div>

                            {/* FR #9.2.2.2 / REQ-6: timeout review state */}
                            {isPendingReview && (
                              <div className="mx-8 mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                <div className="flex items-start gap-3">
                                  <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                                  <div>
                                    <p className="text-sm font-black text-amber-800">Transaction Pending Review</p>
                                    <p className="mt-1 text-xs leading-relaxed text-amber-700">
                                      The scheduled handover was not confirmed within the allowed period. The transaction has been flagged for Administrator review.
                                    </p>
                                    {tx.pending_review_at && (
                                      <p className="mt-2 text-[11px] font-bold text-amber-600">
                                        Flagged: {new Date(tx.pending_review_at).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* PROGRESS */}
                            <div className="p-10 border-b border-slate-50">
                              {isRepair ? (
                                <div className="relative flex justify-between items-center max-w-lg mx-auto">
                                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
                                  <div
                                    className={`absolute top-1/2 left-0 h-1 transition-all duration-700 -translate-y-1/2 ${
                                      isCompleted ? "bg-green-500 w-full" : isMeetupScheduled ? "bg-purple-500 w-1/2" : "bg-purple-500 w-0"
                                    }`}
                                  />
                                  {[
                                    ["Matched", true],
                                    ["Appointment Confirmed", isMeetupScheduled || isCompleted],
                                    ["Repair Completed", isCompleted],
                                  ].map(([label, active]) => (
                                    <div key={label} className="relative z-10 flex flex-col items-center">
                                      <div className={`bg-white p-1 rounded-full border-2 ${active ? "border-green-500 text-green-500" : "border-slate-200 text-slate-300"}`}>
                                        {active ? <Check size={14} strokeWidth={3} /> : <Clock size={14} />}
                                      </div>
                                      <span className="absolute -bottom-7 text-xs font-bold text-slate-500 whitespace-nowrap">{label}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="relative flex justify-between items-center max-w-lg mx-auto">
                                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
                                  <div className={`absolute top-1/2 left-0 h-1 transition-all duration-700 -translate-y-1/2 ${isCompleted ? "bg-green-500 w-full" : isPendingReview ? "bg-amber-500 w-1/2" : isMeetupScheduled ? "bg-blue-500 w-1/2" : "bg-blue-500 w-0"}`} />
                                  <div className="relative z-10 flex flex-col items-center"><div className="bg-white p-1 rounded-full border-2 border-green-500 text-green-500"><Check size={14} strokeWidth={3} /></div><span className="absolute -bottom-7 text-xs font-bold text-slate-500 whitespace-nowrap">Matched</span></div>
                                  <div className="relative z-10 flex flex-col items-center"><div className={`bg-white p-1 rounded-full border-2 ${isCompleted ? "border-blue-500 text-blue-500" : isPendingReview || isMeetupScheduled ? "border-amber-500 text-amber-500" : "border-slate-200 text-slate-300"}`}>{isCompleted || isPendingReview || isMeetupScheduled ? <Check size={14} strokeWidth={3} /> : <Clock size={14} />}</div><span className="absolute -bottom-7 text-xs font-bold text-slate-500 whitespace-nowrap">Meetup Scheduled</span></div>
                                  <div className="relative z-10 flex flex-col items-center"><div className={`bg-white p-1 rounded-full border-2 ${isCompleted ? "border-green-500 text-green-500" : "border-slate-200 text-slate-300"}`}><Check size={14} strokeWidth={3} className={isCompleted ? "opacity-100" : "opacity-0"} /></div><span className="absolute -bottom-7 text-xs font-bold text-slate-500 whitespace-nowrap">Handover Complete</span></div>
                                </div>
                              )}
                            </div>

                            <div className="p-8">
                              <div className={`grid ${isRepair ? "grid-cols-2" : "grid-cols-3"} gap-6 mb-8`}>
                                <div>
                                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">
                                    {isRepair ? "Customer" : "Seller"}
                                  </p>
                                  <p className="text-sm font-bold text-slate-700">
                                    {sellerName}
                                  </p>
                                  {isSeller && !isRepair && <span className="text-xs text-emerald-600 font-bold">You</span>}
                                  {isRepair && <span className="text-xs text-blue-600 font-bold">You</span>}
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">
                                    {isRepair ? "Repair Shop" : "Buyer"}
                                  </p>
                                  <p className="text-sm font-bold text-slate-700">
                                    {isRepair ? (tx.harvester?.business_name || tx.harvester?.full_name || "Repair Shop") : buyerName}
                                  </p>
                                </div>
                                {!isRepair && (
                                  <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Amount</p>
                                    <p className="text-xl font-black text-[#2d7a7f]">₱{Number(tx.amount || 0).toLocaleString()}</p>
                                  </div>
                                )}
                              </div>

                              {/* COMPLETE TRANSACTION HISTORY */}
                              <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Transaction History</p>
                                    <p className="mt-1 text-xs text-slate-500">Status changes are preserved for reference and tracking.</p>
                                  </div>
                                  <ArrowLeftRight size={17} className="text-slate-400" />
                                </div>
                                <div className="mt-4">
                                  {loadingTransactionStatusHistory ? (
                                    <p className="text-xs text-slate-400">Loading history...</p>
                                  ) : transactionStatusHistory.length === 0 ? (
                                    <p className="text-xs text-slate-400">No status history is available yet. Apply the Phase 7 migration to enable the permanent history log.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {transactionStatusHistory.map((entry, index) => (
                                        <div key={entry.id || `${entry.changed_at}-${index}`} className="flex gap-3">
                                          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#3285a1] shrink-0" />
                                          <div>
                                            <p className="text-xs font-black text-slate-700">{entry.old_status ? `${String(entry.old_status).replaceAll("_", " ")} → ` : ""}{String(entry.new_status || "updated").replaceAll("_", " ")}</p>
                                            <p className="mt-1 text-[11px] text-slate-400">{new Date(entry.changed_at).toLocaleString()}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* REPAIR / MARKETPLACE DETAILS AND ACTIONS */}
                              {isRepair ? (
                                <>
                                  {(isMeetupScheduled || isCompleted) && (
                                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 mb-6">
                                      <div className="flex items-center gap-2 mb-4">
                                        <Calendar size={17} className="text-purple-600" />
                                        <p className="text-sm font-bold text-purple-800">Repair Appointment</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-xs uppercase font-bold text-purple-400">Date</p><p className="text-sm font-bold text-slate-700 mt-1">{tx.meetup_date ? new Date(`${tx.meetup_date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not set"}</p></div>
                                        <div><p className="text-xs uppercase font-bold text-purple-400">Time</p><p className="text-sm font-bold text-slate-700 mt-1">{tx.meetup_time || "Not set"}</p></div>
                                        <div className="col-span-2"><p className="text-xs uppercase font-bold text-purple-400">Category</p><p className="text-sm font-bold text-slate-700 mt-1">{repairCategory}</p></div>
                                        <div className="col-span-2"><p className="text-xs uppercase font-bold text-purple-400">Reported Issue</p><p className="text-sm text-slate-600 mt-1">{repairIssue}</p></div>
                                        {repairNotes && <div className="col-span-2"><p className="text-xs uppercase font-bold text-purple-400">Service Notes</p><p className="text-xs text-slate-600 mt-1">{repairNotes}</p></div>}
                                      </div>
                                    </div>
                                  )}

                                  {isCompleted ? (
                                    <div className="space-y-4">
                                      <div className="bg-green-50 border border-green-100 rounded-xl p-5 flex items-center gap-4">
                                        <div className="bg-white p-2 rounded-full shadow-sm text-green-500 border border-green-100"><Check size={20} strokeWidth={3} /></div>
                                        <div><p className="text-sm font-bold text-green-800">Repair Service Completed</p><p className="text-xs text-green-600 mt-1">The repair shop has marked your repair service as completed.</p></div>
                                      </div>
                                      <button onClick={() => setSelectedReceiptTransaction(tx)} className="w-full bg-[#3285a1] hover:bg-[#276b82] text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100">
                                        <Download size={18} /> View Repair Service Record
                                      </button>
                                      <button
                                        onClick={() => handleOpenRepairReview(tx)}
                                        disabled={reviewedRepairAppointments.has(tx.repair_appointment_id)}
                                        className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                                          reviewedRepairAppointments.has(tx.repair_appointment_id)
                                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                            : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-100"
                                        }`}
                                      >
                                        <Star size={18} fill="currentColor" />
                                        {reviewedRepairAppointments.has(tx.repair_appointment_id)
                                          ? "Repair Shop Already Rated"
                                          : "Rate Repair Shop"}
                                      </button>
                                    </div>
                                  ) : isMeetupScheduled ? (
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                                      <div className="flex items-center gap-3"><Calendar className="text-purple-600" size={20} /><div><p className="text-sm font-bold text-purple-800">Repair Appointment Scheduled</p><p className="text-xs text-purple-600 mt-1">Your repair appointment has been confirmed. The repair shop will mark the service as completed after the repair is finished.</p></div></div>
                                      <div className="grid grid-cols-2 gap-3 mt-4"><div className="bg-white rounded-xl p-3 border border-purple-100"><p className="text-xs font-black uppercase text-slate-400">Date</p><p className="text-xs font-bold text-slate-700 mt-1">{tx.meetup_date || "Not scheduled"}</p></div><div className="bg-white rounded-xl p-3 border border-purple-100"><p className="text-xs font-black uppercase text-slate-400">Time</p><p className="text-xs font-bold text-slate-700 mt-1">{tx.meetup_time || "Not scheduled"}</p></div></div>
                                    </div>
                                  ) : (
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-5"><div className="flex items-center gap-3"><Wrench className="text-purple-600" size={20}/><div><p className="text-sm font-bold text-purple-800">Repair Service Request</p><p className="text-xs text-purple-600 mt-1">Your repair request is being processed. The repair shop will confirm the appointment before the service begins.</p></div></div></div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* NORMAL MARKETPLACE MEETUP */}
                                  {isMeetupScheduled || isCompleted ? (
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
                                      <div className="flex items-center gap-2 mb-4"><Calendar size={17} className="text-blue-600" /><p className="text-sm font-bold text-blue-800">Meetup Details</p></div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-xs uppercase font-bold text-blue-400">Date</p><p className="text-sm font-bold text-slate-700 mt-1">{tx.meetup_date ? new Date(`${tx.meetup_date}T00:00:00`).toLocaleDateString("en-US", {month:"long",day:"numeric",year:"numeric"}) : "Not set"}</p></div>
                                        <div><p className="text-xs uppercase font-bold text-blue-400">Time</p><p className="text-sm font-bold text-slate-700 mt-1">{tx.meetup_time || "Not set"}</p></div>
                                        <div className="col-span-2"><p className="text-xs uppercase font-bold text-blue-400">Location</p><p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-1"><MapPin size={14} className="text-blue-500" />{tx.barangay || "Not set"}</p></div>
                                        {tx.notes && <div className="col-span-2"><p className="text-xs uppercase font-bold text-blue-400">Notes</p><p className="text-xs text-slate-600 mt-1">{tx.notes}</p></div>}
                                      </div>
                                    </div>
                                  ) : null}

                                  {isCompleted ? (
                                    <div className="space-y-4">
                                      <div className={`border rounded-xl p-5 flex items-center gap-4 ${isRepair ? "bg-purple-50 border-purple-100" : "bg-green-50 border-green-100"}`}>
                                        <div className={`bg-white p-2 rounded-full shadow-sm border ${isRepair ? "text-purple-600 border-purple-100" : "text-green-500 border-green-100"}`}>{isRepair ? <Wrench size={20}/> : <Check size={20} strokeWidth={3}/>}</div>
                                        <div><p className={`text-sm font-bold ${isRepair ? "text-purple-800" : "text-green-800"}`}>{isRepair ? "Repair Service Completed" : "Transaction Completed"}</p><p className={`text-xs mt-1 ${isRepair ? "text-purple-600" : "text-green-600"}`}>{isRepair ? "The repair shop has marked your repair service as completed." : <>The handover has been confirmed by the buyer.{tx.updated_at && <> Completed on {new Date(tx.updated_at).toLocaleDateString("en-US", {month:"long",day:"numeric",year:"numeric"})}.</>}</>}</p></div>
                                      </div>
                                      <button onClick={() => setSelectedReceiptTransaction(tx)} className="w-full bg-[#3285a1] hover:bg-[#276b82] text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"><Download size={18}/>{isRepair ? "View Repair Service Record" : "View Transaction Receipt"}</button>
                                      {isRepair ? (
                                        <button onClick={() => handleOpenRepairReview(tx)} disabled={reviewedRepairAppointments.has(tx.repair_appointment_id)} className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${reviewedRepairAppointments.has(tx.repair_appointment_id) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-100"}`}><Star size={18} fill="currentColor"/>{reviewedRepairAppointments.has(tx.repair_appointment_id) ? "Repair Shop Already Rated" : "Rate Repair Shop"}</button>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                                          {isSeller && (
                                            <button
                                              onClick={() => handleOpenMarketplaceRating(tx, "buyer")}
                                              disabled={reviewedMarketplaceTransactions.has(tx.id)}
                                              className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                reviewedMarketplaceTransactions.has(tx.id)
                                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                  : "bg-[#FF4D2D] hover:bg-[#e64528] text-white shadow-orange-200"
                                              }`}
                                            >
                                              <Star size={18} fill="currentColor" />
                                              {reviewedMarketplaceTransactions.has(tx.id) ? "Buyer Already Rated" : "Rate Buyer"}
                                            </button>
                                          )}
                                          {isBuyer && (
                                            <button
                                              onClick={() => handleOpenMarketplaceRating(tx, "seller")}
                                              disabled={reviewedMarketplaceTransactions.has(tx.id)}
                                              className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                reviewedMarketplaceTransactions.has(tx.id)
                                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                  : "bg-[#2d7a7f] hover:bg-[#246367] text-white shadow-blue-200"
                                              }`}
                                            >
                                              <Star size={18} fill="currentColor" />
                                              {reviewedMarketplaceTransactions.has(tx.id) ? "Seller Already Rated" : "Rate Seller"}
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : isRepair ? (
                                    <div className="space-y-3"><div className="bg-purple-50 border border-purple-100 rounded-xl p-4"><p className="text-sm font-bold text-purple-800">Repair Appointment Scheduled</p><p className="text-xs text-purple-600 mt-1">The repair shop will mark the repair service as completed after the device has been repaired.</p></div></div>
                                  ) : isBuyer && isMeetupScheduled ? (
                                    <div className="space-y-3"><div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-sm font-bold text-amber-800">Handover Pending</p><p className="text-xs text-amber-600 mt-1">After you receive the item at the scheduled meetup, confirm the handover below.</p></div><button onClick={() => handleCompleteTransaction(tx.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"><CheckCheck size={18}/> Confirm Handover Complete</button></div>
                                  ) : isPendingReview ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-sm font-bold text-amber-800">Awaiting Administrator Review</p><p className="text-xs text-amber-700 mt-1">No further participant action is available while this transaction is under review.</p></div>
                                  ) : isSeller && !isMeetupScheduled ? (
                                    <div className="space-y-3"><button onClick={() => {setShowMessages(true);setActiveTab("listings");}} className="w-full bg-[#2d7a7f] text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#246367] transition-colors"><Calendar size={18}/> Schedule Meetup via Messages</button><button onClick={() => setShowCancelModal(true)} className="w-full bg-white text-red-500 border border-red-200 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"><XCircle size={18}/> Cancel Transaction</button></div>
                                  ) : isSeller && isMeetupScheduled ? (
                                    <div className="space-y-3"><div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-sm font-bold text-blue-800">Meetup Scheduled</p><p className="text-xs text-blue-600 mt-1">The buyer can confirm the handover after the scheduled meetup.</p></div></div>
                                  ) : (
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4"><p className="text-sm font-bold text-slate-600">Waiting for seller to schedule the meetup.</p><p className="text-xs text-slate-400 mt-1">You will see the meetup details here once the seller schedules it.</p></div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="h-full min-h-[400px] flex items-center justify-center bg-white rounded-xl border-2 border-dashed border-slate-100 text-slate-400">
                        Select a transaction to view details
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "donation" && (
            <SellerDonationTab
              listings={myListings}
              donationConfig={donationConfig}
              onDonate={handleConfirmDonation}
              onBackToListings={() => setActiveTab("listings")}
            />
          )}
          {activeTab === "repair-shops" && (
            <SellerRepairShopsTab
              session={session}
              sellerBarangay={currentProfileBarangay === "Not set" ? "" : currentProfileBarangay}
            />
          )}
        </div>
        {showEditProfile && (
          <div className="fixed inset-0 z-[220] bg-slate-900/60 flex items-center justify-center p-4">
            <form onSubmit={handleSaveProfile} className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800">Edit Profile</h2>
                <button type="button" onClick={() => setShowEditProfile(false)} className="p-2 rounded-full hover:bg-slate-100" aria-label="Close"><X size={18}/></button>
              </div>
              <label className="block text-sm font-bold text-slate-700">Full name
                <input required maxLength={120} value={editProfile.full_name} onChange={(e) => setEditProfile(p => ({...p, full_name:e.target.value}))} className="mt-1 w-full border rounded-xl px-3 py-2 font-normal" />
              </label>
              <label className="block text-sm font-bold text-slate-700">Email
                <input disabled value={session?.user?.email || ""} className="mt-1 w-full border rounded-xl px-3 py-2 bg-slate-100 font-normal" />
                <span className="text-xs text-slate-500">Email changes require a separate authentication flow.</span>
              </label>
              <label className="block text-sm font-bold text-slate-700">Contact number
                <input type="tel" maxLength={30} value={editProfile.contact_number} onChange={(e) => setEditProfile(p => ({...p, contact_number:e.target.value}))} className="mt-1 w-full border rounded-xl px-3 py-2 font-normal" />
              </label>
              <label className="block text-sm font-bold text-slate-700">Barangay
                <select value={editProfile.barangay} onChange={(e) => setEditProfile(p => ({...p, barangay:e.target.value}))} className="mt-1 w-full border rounded-xl px-3 py-2 font-normal">
                  <option value="">Select barangay</option>
                  {valenzuelaBarangays.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditProfile(false)} className="flex-1 border rounded-xl py-3 font-bold">Cancel</button>
                <button disabled={profileSaving} type="submit" className="flex-1 bg-[#2d7a7f] text-white rounded-xl py-3 font-bold disabled:opacity-50">{profileSaving ? "Saving..." : "Save changes"}</button>
              </div>
              {/* <div className="border-t border-slate-200 pt-4 mt-2 space-y-2">
                <h3 className="text-sm font-bold text-slate-700">Account actions</h3>
                <p className="text-xs text-slate-500">Deactivate to disable your account, or request permanent deletion.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" onClick={() => { if (window.confirm("Are you sure you want to deactivate your account? You will be signed out.")) { setShowEditProfile(false); handleDeactivateAccount(); } }} className="flex-1 border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl py-2.5 text-sm font-bold">Deactivate account</button>
                  <button type="button" onClick={() => alert("Permanent account deletion is not available here yet. It must be implemented securely using a Supabase Edge Function and the Admin API.")} className="flex-1 border border-red-300 text-red-700 hover:bg-red-50 rounded-xl py-2.5 text-sm font-bold">Delete account</button>
                </div>
              </div> */}
            </form>
          </div>
        )}
        {/* Profile Modal / Side Drawer */}
        {showProfileModal && (
          <div
            className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-[2px]"
            onClick={() => setShowProfileModal(false)}
          >
            <aside
              className="absolute right-0 top-0 h-full w-full max-w-[390px] bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden flex flex-col"
              onClick={(event) => event.stopPropagation()}
              aria-label="Profile"
            >
              {/* Seller profile header */}
              <div className="relative shrink-0 bg-[#287f95] px-5 pt-5 pb-4 text-white">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Close profile"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 pr-10">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-emerald-400 to-green-600 text-lg font-black shadow-sm">
                    {currentProfileName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-black">{currentProfileName}</h2>
                      {profileData?.verification_status === "approved" || profileData?.verification_status === "verified" ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">
                          <CheckCircle size={10} /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">
                          <CheckCircle size={10} /> {profileData?.verification_status === "pending" ? "Pending" : "Not Verified"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/80">
                      Tech Harvester · {currentProfileBarangay || "Not assigned"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile tabs */}
              <div className="shrink-0 border-b border-slate-100 bg-white px-4 pt-3">
                <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-0.5">
                  {[
                    { id: "profile", label: "View Profile" },
                    { id: "security", label: "Account & Security" },
                    { id: "trust", label: "Trust Tier" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProfileModalTab(tab.id)}
                      className={`rounded-lg px-2 py-2 text-[10px] font-bold transition ${
                        profileModalTab === tab.id
                          ? "bg-white text-[#287f95] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drawer content */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                {/* ================= VIEW PROFILE ================= */}
                {profileModalTab === "profile" && (
                  <div className="px-4 pb-8 pt-5">
                    <section>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Personal Information
                      </p>

                      <div className="space-y-2">
                        <InfoRow label="Full Name" value={currentProfileName} icon={<User size={14} />} />
                        <InfoRow label="Email" value={session?.user?.email || "No email provided"} icon={<Mail size={14} />} />
                        <InfoRow label="Phone Number" value={currentProfilePhone || "No phone number"} icon={<Phone size={14} />} />
                        <InfoRow label="Barangay" value={currentProfileBarangay || "Not assigned"} icon={<MapPin size={14} />} />
                      </div>
                    </section>

                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d8da6] px-4 py-3 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#26798e]"
                    >
                      <Edit3 size={14} /> Edit Profile
                    </button>
                  </div>
                )}

                {/* ================= ACCOUNT & SECURITY ================= */}
                {profileModalTab === "security" && (
                  <div className="px-4 pb-8 pt-6">
                    <section>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Change Password
                      </p>

                      <div className="space-y-3">
                        {[
                          ["Current Password", "current", passwordForm.current],
                          ["New Password", "next", passwordForm.next],
                          ["Confirm New Password", "confirm", passwordForm.confirm],
                        ].map(([label, key, value]) => (
                          <label key={key} className="block">
                            <span className="text-[10px] font-medium text-slate-500">{label}</span>
                            <input
                              type="password"
                              value={value}
                              onChange={(e) => {
                                setPasswordForm((prev) => ({ ...prev, [key]: e.target.value }));
                                setPasswordError("");
                                setPasswordSuccess("");
                              }}
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#2d8da6] focus:ring-2 focus:ring-cyan-100"
                            />
                          </label>
                        ))}

                        {passwordError && (
                          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] text-red-700">
                            {passwordError}
                          </p>
                        )}
                        {passwordSuccess && (
                          <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-2.5 text-[10px] text-green-700">
                            {passwordSuccess}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={handleChangePassword}
                          disabled={passwordSaving}
                          className="w-full rounded-xl bg-[#2d8da6] py-2.5 text-[10px] font-black text-white transition hover:bg-[#26798e] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {passwordSaving ? "Updating Password..." : "Update Password"}
                        </button>
                      </div>
                    </section>

                    <div className="my-6 border-t border-slate-100" />

                    <section>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Danger Zone
                      </p>
                      <button
                        type="button"
                        onClick={handleDeactivateAccount}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 py-3 text-[10px] font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <XCircle size={13} /> Deactivate Account
                      </button>
                    </section>
                  </div>
                )}

                {/* ================= TRUST TIER ================= */}
                {profileModalTab === "trust" && (
                  <div className="px-4 pb-8 pt-5">
                    {/* Stats */}
                    <div className="mb-4 grid grid-cols-4 gap-2">
                      {[
                        { label: "Total Listings", value: myListings.length },
                        {
                          label: "Items Sold",
                          value: myListings.filter((item) => ["meetup scheduled", "sold", "completed"].includes(item.status?.toLowerCase())).length,
                        },
                        { label: "Rating", value: Number(userTrustStats.averageRating || 0).toFixed(1) },
                        { label: "Reviews", value: userTrustStats.totalReviews || 0 },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl bg-slate-50 px-2 py-3 text-center">
                          <p className="text-sm font-black text-slate-800">{stat.value}</p>
                          <p className="mt-1 text-[8px] leading-tight text-slate-400">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Current tier */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Current Tier</p>
                          <h3 className="mt-1 text-lg font-black text-slate-700">
                            {trustTierLoading ? "Loading..." : getTrustTierLabel(currentTrustTier?.name)}
                          </h3>
                        </div>
                        <div className="text-right text-[9px] text-slate-400">
                          {nextTrustTier ? (
                            <>
                              <p>{Number(userTrustStats.completedTransactions || 0)} transactions</p>
                              <p>{Math.max(0, Number(nextTrustTier.min_transactions || 0) - Number(userTrustStats.completedTransactions || 0))} more to {getTrustTierLabel(nextTrustTier.name)}</p>
                            </>
                          ) : (
                            <p>Highest tier reached</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[8px] text-slate-400">
                        <span>{getTrustTierLabel(currentTrustTier?.name)}</span>
                        <span>{nextTrustTier ? getTrustTierLabel(nextTrustTier.name) : getTrustTierLabel(currentTrustTier?.name)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#2d8da6] transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-1 text-right text-[8px] text-slate-400">{progressPercent}% to next tier</div>
                    </section>

                    {/* CO2 */}
                    <section className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Leaf size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-[#145374]">CO₂ Recovery Contribution</p>
                            <p className="text-[8px] text-[#3b91ad]">from harvesting & processing e-waste</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-[#145374]">
                            {trustRecoveryCo2.toFixed(2)} <span className="text-[9px]">kg</span>
                          </p>
                          <p className="text-[8px] text-[#3b91ad]">CO₂ recovered</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 border-t border-emerald-100 pt-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                          <Package size={13} />
                        </div>
                        <p className="text-[9px] text-[#145374]">
                          <span className="font-black">{trustRecoveredDevices} devices</span> recovered & processed
                        </p>
                      </div>
                    </section>

                    {/* Privileges */}
                    <section className="mt-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Current Privileges</p>
                      <div className="space-y-1.5">
                        {(() => {
                          const privileges = currentTrustTier?.privileges || [];
                          const nextPrivileges = nextTrustTier?.privileges || [];
                          const allPrivileges = [...new Set([...privileges, ...nextPrivileges])];
                          if (!allPrivileges.length) {
                            return <div className="rounded-xl bg-slate-50 p-3 text-[10px] text-slate-500">No privileges configured for this tier.</div>;
                          }
                          return allPrivileges.map((privilege, index) => {
                            const active = privileges.some((p) => String(p).trim().toLowerCase() === String(privilege).trim().toLowerCase());
                            return (
                              <div key={`${privilege}-${index}`} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${active ? "bg-emerald-50" : "bg-slate-50"}`}>
                                <span className={active ? "text-emerald-500" : "text-slate-300"}>
                                  {active ? <CheckCircle size={13} /> : <Lock size={11} />}
                                </span>
                                <span className={`text-[10px] font-semibold ${active ? "text-slate-700" : "text-slate-400"}`}>{privilege}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
        {selectedReceiptTransaction && (
          <ReceiptModal
            transaction={selectedReceiptTransaction}
            currentUserId={session.user.id}
            onClose={() => setSelectedReceiptTransaction(null)}
          />
        )}

        <CancelTransactionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelTransaction}
          transaction={transactions.find((t) => t.id === selectedTxId)}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
        />

        <CreateListingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={session.user.id}
          onCreated={handleListingCreated}
        />
        <RepairReviewModal
          isOpen={showRepairReviewModal}
          transaction={selectedRepairReviewTransaction}
          currentUserId={session.user.id}
          onClose={() => { setShowRepairReviewModal(false); setSelectedRepairReviewTransaction(null); }}
          onSubmitted={(review) => {
            const appointmentId = review?.appointment_id || selectedRepairReviewTransaction?.repair_appointment_id;
            if (appointmentId) setReviewedRepairAppointments((prev) => new Set(prev).add(appointmentId));
          }}
        />
        <MarketplaceRatingModal
          isOpen={showRateModal}
          transaction={transactions.find((t) => t.id === selectedTxId)}
          currentUserId={session.user.id}
          ratingRole={ratingRole}
          onClose={() => {
            setShowRateModal(false);
            setRatingRole(null);
          }}
          onSubmitted={(transactionId) => {
            if (transactionId) {
              setReviewedMarketplaceTransactions((prev) => {
                const next = new Set(prev);
                next.add(transactionId);
                return next;
              });
            }
          }}
        />
        {expiredListingAction && (
          <div className="fixed inset-0 z-[380] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-[2rem] bg-white shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/80">
                      Safe-Storage Period Exceeded
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Action Required</h2>
                    <p className="mt-2 text-sm text-white/85">
                      This Not Working / For Parts listing has exceeded its maximum
                      safe-storage period. Bidding and bid acceptance are disabled.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpiredListingAction(null)}
                    disabled={processingExpiredListing}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                    aria-label="Close expired listing prompt"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-orange-500">
                    Listing
                  </p>
                  <p className="mt-1 text-base font-black text-slate-800">
                    {expiredListingAction.device_model || "Electronic Device"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {expiredListingAction.category || "Electronic Device"} ·{" "}
                    {expiredListingAction.condition || "Not Working"}
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-slate-600">
                  To comply with safe-storage requirements, resolve this listing
                  by choosing one of the following actions.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setExpiredListingAction(null);
                      handleOpenDonation(expiredListingAction);
                    }}
                    disabled={processingExpiredListing}
                    className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-5 py-4 text-left hover:bg-purple-100 disabled:opacity-50"
                  >
                    <Gift size={20} className="text-purple-600 mb-2" />
                    <span className="block text-sm font-black text-purple-700">Donate</span>
                    <span className="block mt-1 text-xs text-purple-600">
                      Select a drop-off point and donate the device.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnlistExpiredListing(expiredListingAction)}
                    disabled={processingExpiredListing}
                    className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-left hover:bg-slate-100 disabled:opacity-50"
                  >
                    <XCircle size={20} className="text-slate-600 mb-2" />
                    <span className="block text-sm font-black text-slate-700">
                      {processingExpiredListing ? "Unlisting..." : "Unlist"}
                    </span>
                    <span className="block mt-1 text-xs text-slate-500">
                      Remove the listing from the marketplace and close its pending bids.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <DonationModal
          isOpen={isDonationModalOpen}
          onClose={() => {
            setIsDonationModalOpen(false);
            setListingToDonate(null);
          }}
          onConfirm={handleConfirmDonation}
          listing={listingToDonate}
          barangay={currentProfileBarangay === "Not set" ? "" : currentProfileBarangay}
        />
        <div className="space-y-4">
          {/* FULL NAME */}
          {/* <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Full Name
          </label>

          <input
            type="text"
            value={verificationForm.full_name}
            onChange={(e) =>
              setVerificationForm((prev) => ({
                ...prev,
                full_name: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-red-400"
          />
        </div> */}

          {/* CONTACT */}
          {/* <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Contact Number
          </label>

          <input
            type="text"
            value={verificationForm.contact_number}
            onChange={(e) =>
              setVerificationForm((prev) => ({
                ...prev,
                contact_number: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-red-400"
          />
        </div> */}

          {/* BARANGAY */}
          {/* <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Barangay
          </label>

          <select
            value={verificationForm.barangay}
            onChange={(e) =>
              setVerificationForm((prev) => ({
                ...prev,
                barangay: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-red-400"
          >
            <option value="">Select Barangay</option>

            {valenzuelaBarangays.map((brgy) => (
              <option key={brgy} value={brgy}>
                {brgy}
              </option>
            ))}
          </select>
        </div> */}

          {/* BUSINESS NAME */}
          {/* {profileData?.role === "harvester" && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Business Name
              </label>

              <input
                type="text"
                value={verificationForm.business_name}
                onChange={(e) =>
                  setVerificationForm((prev) => ({
                    ...prev,
                    business_name: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-red-400"
              />
            </div>
          )} */}
        </div>

        {
          selectedListing && (
            <PlaceBidModal
              listing={selectedListing}
              existingBid={listingBids[0] || null}
              placingBid={placingBid}
              bidAmount={bidAmount}
              setBidAmount={setBidAmount}
              bidMessage={bidMessage}
              setBidMessage={setBidMessage}
              onClose={() => {
                setSelectedListing(null);
                setBidAmount("");
                setBidMessage("");
                setListingBids([]);
              }}
              onSubmit={handlePlaceBid}
            />
          )
        }
        {selectedBidder && (
          <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

              {/* HEADER */}
              <div className="bg-gradient-to-br from-[#3285a1] to-[#6da43a] px-6 py-7 text-white relative">

                <button
                  type="button"
                  onClick={() => setSelectedBidder(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-4">

                  <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-black">
                    {(selectedBidder.full_name || "TH")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h2 className="text-xl font-black">
                      {selectedBidder.full_name || "Tech Harvester"}
                    </h2>

                    <div className="flex flex-wrap gap-2 mt-2">

                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                        Tech Harvester
                      </span>

                      {selectedBidder.verification_status === "approved" && (
                        <span className="bg-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          Verified
                        </span>
                      )}

                    </div>

                    {selectedBidder.barangay && (
                      <div className="flex items-center gap-1 mt-3 text-xs text-white/80">
                        <MapPin size={12} />
                        {selectedBidder.barangay}, Valenzuela City
                      </div>
                    )}

                  </div>
                </div>
              </div>

              {/* PROFILE CONTENT */}
              <div className="p-6 space-y-5">

                {/* REPUTATION */}
                <div className="grid grid-cols-2 gap-3">

                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Star size={18} fill="currentColor" />

                      <span className="text-xs uppercase font-black">
                        Rating
                      </span>
                    </div>

                    <p className="text-2xl font-black text-slate-800 mt-2">
                      {Number(
                        selectedBidder.average_rating || 0,
                      ).toFixed(1)}
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      {selectedBidder.total_reviews || 0} reviews
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Leaf size={18} />

                      <span className="text-xs uppercase font-black">
                        Eco Points
                      </span>
                    </div>

                    <p className="text-2xl font-black text-slate-800 mt-2">
                      {Number(
                        selectedBidder.eco_points || 0,
                      ).toLocaleString()}
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      Environmental contribution
                    </p>
                  </div>

                </div>

                {/* ACTIVITY */}
                <div>
                  <h3 className="text-sm font-black text-slate-800 mb-3">
                    Harvester Activity
                  </h3>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="border border-slate-100 rounded-2xl p-4">
                      <p className="text-xs uppercase font-bold text-slate-400">
                        Recovered Devices
                      </p>

                      <p className="text-xl font-black text-[#3285a1] mt-1">
                        {Number(
                          selectedBidder.recovered_devices || 0,
                        )}
                      </p>
                    </div>

                    <div className="border border-slate-100 rounded-2xl p-4">
                      <p className="text-xs uppercase font-bold text-slate-400">
                        Completed Pickups
                      </p>

                      <p className="text-xl font-black text-[#6da43a] mt-1">
                        {Number(
                          selectedBidder.completed_pickups || 0,
                        )}
                      </p>
                    </div>

                  </div>
                </div>

                {/* INFORMATION */}
                <div className="border border-slate-100 rounded-2xl p-5">

                  <h3 className="text-sm font-black text-slate-800 mb-4">
                    Profile Information
                  </h3>

                  <div className="space-y-4">

                    {selectedBidder.full_name && (
                      <div className="flex gap-3">
                        <User
                          size={17}
                          className="text-slate-400 mt-0.5"
                        />

                        <div>
                          <p className="text-xs uppercase font-bold text-slate-400">
                            Full Name
                          </p>

                          <p className="text-sm font-semibold text-slate-700">
                            {selectedBidder.full_name}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedBidder.barangay && (
                      <div className="flex gap-3">
                        <MapPin
                          size={17}
                          className="text-slate-400 mt-0.5"
                        />

                        <div>
                          <p className="text-xs uppercase font-bold text-slate-400">
                            Location
                          </p>

                          <p className="text-sm font-semibold text-slate-700">
                            {selectedBidder.barangay}, Valenzuela City
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedBidder.contact_number && (
                      <div className="flex gap-3">
                        <Phone
                          size={17}
                          className="text-slate-400 mt-0.5"
                        />

                        <div>
                          <p className="text-xs uppercase font-bold text-slate-400">
                            Contact Number
                          </p>

                          <p className="text-sm font-semibold text-slate-700">
                            {selectedBidder.contact_number}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* VERIFICATION */}
                <div className="bg-[#3285a1]/5 border border-[#3285a1]/10 rounded-2xl p-4 flex gap-3">

                  <Shield
                    size={20}
                    className="text-[#3285a1] shrink-0"
                  />

                  <div>
                    <p className="text-xs font-black text-slate-700">
                      Harvester Verification
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {selectedBidder.verification_status === "approved"
                        ? "This harvester has completed account verification."
                        : "This harvester has not completed verification."}
                    </p>
                  </div>

                </div>

              </div>

              {/* FOOTER */}
              <div className="px-6 py-5 bg-slate-50 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() => setSelectedBidder(null)}
                  className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition"
                >
                  Close Profile
                </button>

              </div>

            </div>
          </div>
        )}
        {isVerificationModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
              {/* HEADER */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
                <h2 className="text-lg font-black">
                  Update Verification Documents
                </h2>

                <p className="text-xs opacity-90 mt-1">
                  Re-submit your documents for admin review
                </p>
              </div>

              {/* BODY */}
              <div className="p-6 space-y-6">
                {/* SELLER */}
                {profileData?.role === "harvester" && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">
                      Upload Valid Government ID
                    </label>

                    <div
                      onClick={() => permitRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${verificationFiles.businessPermit
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 hover:border-red-300"
                        }`}
                    >
                      <input
                        type="file"
                        ref={permitRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleVerificationFileChange(e, "businessPermit")
                        }
                      />

                      <Upload
                        size={28}
                        className={
                          verificationFiles.businessPermit
                            ? "text-emerald-500"
                            : "text-slate-400"
                        }
                      />

                      <p className="text-xs font-bold mt-3">
                        {verificationFiles.businessPermit
                          ? "File uploaded successfully!"
                          : "Click to upload"}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        {verificationFiles.businessPermit
                          ? verificationFiles.businessPermit.name
                          : "PNG, JPG, or PDF"}
                      </p>
                    </div>
                  </div>
                )}

                {/* HARVESTER */}
                {profileData?.role === "harvester" && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-2">
                        Business Permit / DTI
                      </label>

                      <div
                        onClick={() => permitRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer"
                      >
                        <input
                          type="file"
                          ref={permitRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleVerificationFileChange(e, "businessPermit")
                          }
                        />

                        <Upload className="mx-auto mb-2 text-slate-400" />

                        <p className="text-xs font-bold">
                          {verificationFiles.businessPermit
                            ? verificationFiles.businessPermit.name
                            : "Upload Permit"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-2">
                        Technical Certification
                      </label>

                      <div
                        onClick={() => techRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer"
                      >
                        <input
                          type="file"
                          ref={techRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleVerificationFileChange(e, "techCert")
                          }
                        />

                        <Upload className="mx-auto mb-2 text-slate-400" />

                        <p className="text-xs font-bold">
                          {verificationFiles.techCert
                            ? verificationFiles.techCert.name
                            : "Upload Certification"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* FOOTER */}
              <div className="p-6 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  onClick={handleVerificationUpdate}
                  disabled={verificationLoading}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
                >
                  {verificationLoading
                    ? "Submitting..."
                    : "Re-submit Verification"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
      {/* Achievements modal */}
            {showAchievementsModal && (
              <div
                className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="seller-achievements-title"
                onClick={(event) => {
                  if (event.target === event.currentTarget) setShowAchievementsModal(false);
                }}
              >
                <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                  <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-white/80">
                        <Award size={18} />
                        <span className="text-xs font-bold uppercase tracking-[0.18em]">Your achievements</span>
                      </div>
                      <h2 id="seller-achievements-title" className="text-2xl font-black">
                        {trustTierLoading ? "Loading your progress…" : getTrustTierLabel(currentTrustTier.name)}
                      </h2>
                      <p className="mt-1 text-xs text-white/80">
                        Keep completing transactions and earning positive reviews to progress.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close achievements"
                      onClick={() => setShowAchievementsModal(false)}
                      className="rounded-full p-2 text-white/90 hover:bg-white/15"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-5 p-6">
                    {trustTierError ? (
                      <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                        Could not load achievements: {trustTierError}
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-xl font-black text-slate-800">{userTrustStats.completedTransactions}</p>
                            <p className="text-xs text-slate-500">Completed</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-xl font-black text-slate-800">{userTrustStats.averageRating.toFixed(1)} ★</p>
                            <p className="text-xs text-slate-500">Average rating</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-xl font-black text-slate-800">{userTrustStats.totalReviews}</p>
                            <p className="text-xs text-slate-500">Reviews</p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-bold text-emerald-900">
                              Next: {nextTrustTier ? getTrustTierLabel(nextTrustTier.name) : "Highest tier reached"}
                            </span>
                            <span className="font-bold text-emerald-800">{progressPercent}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progressPercent}%` }} />
                          </div>
                          {nextTrustTier && (
                            <p className="mt-2 text-xs text-emerald-800">
                              {userTrustStats.completedTransactions}/{Number(nextTrustTier.min_transactions)} transactions · Rating {userTrustStats.averageRating.toFixed(1)}/{Number(nextTrustTier.min_rating).toFixed(1)}
                            </p>
                          )}
                        </div>
                        <div>
                          <h3 className="mb-2 text-sm font-bold text-slate-800">Current tier privileges</h3>
                          {currentTrustTier.privileges?.length ? (
                            <ul className="space-y-2">
                              {currentTrustTier.privileges.map((privilege, index) => (
                                <li key={`${privilege}-${index}`} className="flex items-start gap-2 text-sm text-slate-600">
                                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                                  <span>{privilege}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-500">No privileges are configured for this tier yet.</p>
                          )}
                        </div>
                        <div>
                          <h3 className="mb-2 text-sm font-bold text-slate-800">Trust tier milestones</h3>
                          <div className="space-y-2">
                            {sortedTrustTiers.map((tier) => {
                              const achieved =
                                userTrustStats.completedTransactions >= Number(tier.min_transactions) &&
                                userTrustStats.averageRating >= Number(tier.min_rating);
                              return (
                                <div key={tier.id || tier.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-700">{getTrustTierLabel(tier.name)}</p>
                                    <p className="text-xs text-slate-500">
                                      {Number(tier.min_transactions)}+ transactions · {Number(tier.min_rating).toFixed(1)}+ rating
                                    </p>
                                  </div>
                                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${achieved ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                    {achieved ? "Unlocked" : "Locked"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAchievementsModal(false)}
                      className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
    </div>
  );
};

const CancelTransactionModal = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  // Add these to the destructuring:
  cancelReason,
  setCancelReason,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-full text-red-500">
              <XCircle size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Cancel Transaction
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={18} />
            <div>
              <p className="text-xs font-bold text-amber-800">
                Warning:{" "}
                <span className="font-normal">
                  Cancelling this transaction cannot be undone.
                </span>
              </p>
              <p className="text-xs text-amber-700 mt-1">
                The buyer ({transaction?.harvester?.full_name}) will be notified
                immediately.
              </p>
            </div>
          </div>

          {/* Reason Select */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 block">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 transition-all appearance-none cursor-pointer"
              required
            >
              <option value="" disabled>
                Select a reason...
              </option>
              <option value="Item no longer available">
                Item no longer available
              </option>
              <option value="Device condition changed">
                Device condition changed
              </option>
              <option value="Cannot meet at scheduled time">
                Cannot meet at scheduled time
              </option>
              <option value="Buyer unresponsive">Buyer unresponsive</option>
              <option value="Safety concerns">Safety concerns</option>
              <option value="Other">Other (please specify)</option>
            </select>

            {/* Optional: Add this if "Other" is selected */}
            {cancelReason === "Other" && (
              <textarea
                placeholder="Please describe your reason for cancelling..."
                className="w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 transition-all min-h-[80px]"
                onChange={(e) => setCancelReason(`Other: ${e.target.value}`)}
              />
            )}
          </div>

          {/* Details Card */}
          <div className="bg-red-50/30 border border-red-50 p-4 rounded-2xl">
            <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-3">
              Transaction Details:
            </p>
            <ul className="space-y-1.5">
              <li className="text-xs text-red-700 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full" />
                Device: {transaction?.listing?.device_model}
              </li>
              <li className="text-xs text-red-700 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full" />
                Buyer: {transaction?.harvester?.full_name}
              </li>
              <li className="text-xs text-red-700 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full" />
                Amount: ₱{transaction?.amount?.toLocaleString()}
              </li>
              <li className="text-xs text-red-700 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full" />
                Status: {transaction?.status}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
          >
            Keep Transaction
          </button>

          {/* Update this button below */}
          <button
            type="button" // Explicitly set type to button
            onClick={() => {
              console.log("Cancel button clicked"); // Debugging line
              if (!cancelReason) {
                alert("Please select a reason for cancellation.");
                return;
              }
              onConfirm(transaction.id);
            }}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-700 active:scale-95 transition-all shadow-lg cursor-pointer relative z-[10000]"
          >
            <XCircle size={14} /> Cancel Transaction
          </button>
        </div>
      </div>
    </div>
  );
};



const InfoItem = ({ icon, label, val }) => (
  <div className="flex items-start gap-3">
    <div className="text-slate-300 mt-1">{icon}</div>
    <div>
      <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
        {label}
      </div>
      <div className="text-sm text-slate-700 font-medium">{val}</div>
    </div>
  </div>
);
const NotificationItem = ({
  icon,
  bg,
  title,
  desc,
  time,
  unread,
  onClick,
  onDelete,
}) => (
  <div
    onClick={onClick}
    className={`p-4 flex gap-4 hover:bg-slate-50 transition cursor-pointer relative group border-b border-slate-50 last:border-0 ${unread ? "bg-blue-50/10" : "bg-transparent"
      }`}
  >
    <div
      className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-black/5`}
    >
      {React.cloneElement(icon, { size: 18, className: "text-white" })}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start mb-0.5">
        <h4
          className={`text-xs font-black uppercase tracking-tight truncate pr-2 ${unread ? "text-slate-900" : "text-slate-500"
            }`}
        >
          {title}
        </h4>
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap pt-0.5">
          {time}
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-snug line-clamp-2 font-medium">
        {desc}
      </p>
    </div>

    <div className="flex flex-col items-center justify-between py-0.5">
      {unread ? (
        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_0_4px_rgba(59,130,246,0.15)]" />
      ) : (
        <div className="w-2 h-2" />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all mt-2"
      >
        <X size={14} />
      </button>
    </div>

  </div>
);
export default SellerDashboard;