import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import CreateListingModal from "./CreateListingModal"; // Adjust path as needed
import SellerMessages from "./SellerMessages"; // Ensure the filename matches
import DonationModal from "./DonationModal";
import RateBuyerModal from "./RateBuyerModal";
import SellerDonationTab from "./SellerDonationTab";
import SellerRepairShopsTab from "./SellerRepairShopsTab";
import banner from "./assets/banner.png";
import PlaceBidModal from "./PlaceBidModal";
import { jsPDF } from "jspdf";

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
} from "lucide-react";
const isRepairTransaction = (transaction) => Boolean(transaction?.repair_appointment_id);

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
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
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
              <p className="text-[11px] tracking-[0.3em] text-white/70 font-medium">
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
                  <p className="text-[11px] text-emerald-700 mt-2">Thank you for helping extend the useful life of electronics.</p>
                </div>
              )}

              {isRepair && (
                <div className="mt-4 bg-purple-50 border border-purple-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-purple-800">
                    <Wrench size={18} />
                    <span className="font-black text-sm">Repair service completed</span>
                  </div>
                  <p className="text-[11px] text-purple-700 mt-2">
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
  const [profileData, setProfileData] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
  const [donationConfig, setDonationConfig] = useState({
    firstReminder: 7,
    secondReminder: 3,
    autoSuggest: 14,
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [selectedReceiptTransaction, setSelectedReceiptTransaction] = useState(null);
  const nextTierGoal = 10;
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [listingToDonate, setListingToDonate] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedBidder, setSelectedBidder] = useState(null);
  const isRepairShop = user?.role === "repair_shop";
  const isHarvester = user?.role === "harvester";

  const displayName = isRepairShop ? user?.business_name : user?.displayName;

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

  const handleSubmitRating = async ({ ratings, recommend, feedback }) => {
    try {
      const selectedTransaction = transactions.find(
        (t) => t.id === selectedTxId,
      );

      if (!selectedTransaction) {
        throw new Error("Transaction not found.");
      }

      const buyerId = selectedTransaction.harvester_id;

      const averageScore =
        (ratings.communication +
          ratings.punctuality +
          ratings.payment +
          ratings.overall) /
        4;

      const { error: insertError } = await supabase.from("reviews").insert([
        {
          transaction_id: selectedTransaction.id,

          seller_id: buyerId,

          reviewer_id: session.user.id,

          communication_rating: ratings.communication,

          punctuality_rating: ratings.punctuality,

          condition_rating: ratings.payment,

          overall_rating: ratings.overall,

          recommend: recommend === "yes",

          comment: feedback,
        },
      ]);

      if (insertError) throw insertError;

      const { data: allReviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("overall_rating")
        .eq("seller_id", buyerId);

      if (reviewsError) throw reviewsError;

      const totalReviews = allReviews.length;

      const averageRating =
        totalReviews > 0
          ? allReviews.reduce(
            (sum, review) => sum + Number(review.overall_rating),
            0,
          ) / totalReviews
          : 0;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          average_rating: averageRating,
          total_reviews: totalReviews,
        })
        .eq("id", buyerId);

      if (profileError) throw profileError;

      setShowRateModal(false);

      alert("Buyer rated successfully!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleOpenDonation = (listing) => {
    setListingToDonate(listing);
    setIsDonationModalOpen(true);
  };

  const handleConfirmDonation = async (listingId) => {
    try {
      if (!listingId) {
        alert("No listing selected for donation.");
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .update({
          status: "donated",
          drop_off_point_id: null,
        })
        .eq("id", listingId)
        .eq("seller_id", session.user.id)
        .select()
        .single();

      if (error) throw error;

      console.log("Donation saved:", data);

      // Update the listing in the UI
      setMyListings((prev) =>
        prev.map((listing) =>
          listing.id === listingId
            ? {
              ...listing,
              status: "donated",
              drop_off_point_id: null,
            }
            : listing,
        ),
      );

      setMyDonations((prev) => [
        ...prev,
        {
          ...listingToDonate,
          status: "donated",
          drop_off_point_id: null,
        },
      ]);

      // Close modal
      setIsDonationModalOpen(false);
      setListingToDonate(null);

      alert(
        "Thank you for donating! Your device is now waiting for an admin to assign a drop-off point.",
      );
    } catch (err) {
      console.error("Donation error:", err);
      alert(`Failed to process donation: ${err.message}`);
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

      if (
        selectedListing.status?.toLowerCase() !== "active"
      ) {
        alert("This listing is no longer active.");
        return;
      }

      setPlacingBid(true);

      // ==========================================
      // CHECK EXISTING BID
      // ==========================================

      const {
        data: existingBid,
        error: existingBidError,
      } = await supabase
        .from("bids")
        .select("id, status")
        .eq("listing_id", selectedListing.id)
        .eq("bidder_id", session.user.id)
        .maybeSingle();

      if (existingBidError) {
        throw existingBidError;
      }

      if (existingBid) {
        alert("You already placed an offer on this listing.");
        return;
      }

      // ==========================================
      // INSERT BID
      // ==========================================

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
                ...(listing.bids || []).filter(
                  (bid) => bid.bidder_id !== session.user.id
                ),
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

  const progressPercent = Math.min(
    (profileData?.total_reviews / nextTierGoal) * 100,
    100,
  );
  const handleCompleteTransaction = async (txId) => {
    try {
      const txToComplete = transactions.find((t) => t.id === txId);

      if (!txToComplete) throw new Error("Transaction not found.");

      // Repair transactions are completed by the repair shop, not by the customer.
      if (txToComplete.repair_appointment_id) {
        alert("This is a repair service. The repair shop will mark the service as completed.");
        return;
      }

      // Only the buyer/harvester may confirm that the handover is complete.
      if (txToComplete.harvester_id !== session.user.id) {
        alert("Only the buyer can confirm the handover.");
        return;
      }

      if (txToComplete.status !== "meetup_scheduled") {
        alert("The meetup must be scheduled before the handover can be completed.");
        return;
      }

      const { data: updatedTx, error } = await supabase
        .from("transactions")
        .update({ status: "completed" })
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

      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, ...updatedTx } : t)),
      );
      alert("Handover confirmed. Transaction completed!");
    } catch (err) {
      console.error("Error completing transaction:", err);
      alert("Failed to complete transaction: " + err.message);
    }
  };

  const handleCancelTransaction = async (txId) => {
    try {
      const txToCancel = transactions.find((t) => t.id === txId);

      if (!txToCancel) throw new Error("Transaction not found.");
      if (txToCancel.seller_id !== session.user.id) {
        alert("Only the seller can cancel this transaction.");
        return;
      }
      if (txToCancel.status === "completed") {
        alert("A completed transaction cannot be cancelled.");
        return;
      }

      const { error: txError } = await supabase
        .from("transactions")
        .update({
          status: "cancelled",
          cancel_reason: cancelReason,
        })
        .eq("id", txId)
        .eq("seller_id", session.user.id);

      if (txError) throw txError;

      if (txToCancel?.listing_id) {
        const { error: listingError } = await supabase
          .from("listings")
          .update({ status: "active" })
          .eq("id", txToCancel.listing_id);

        if (listingError) throw listingError;
      }

      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, status: "cancelled" } : t)),
      );

      setShowCancelModal(false);
      alert("Transaction cancelled successfully.");
    } catch (err) {
      console.error("Error cancelling:", err.message);
      alert("Failed to cancel: Check your database permissions.");
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
    console.log("Deleting ID:", id);

    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .select(); // 👈 THIS IS KEY

    console.log("Delete response:", { data, error });

    if (error) {
      console.error(error);
      alert("Delete failed: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ No rows deleted — likely RLS issue");
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };
  {
    /* Helper component for consistent info rows */
  }
  function InfoRow({ label, value, icon }) {
    return (
      <div className="flex items-start gap-3">
        <div className="mt-1 text-slate-400">{icon}</div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
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

      // Accept/Decline is ONLY for the logged-in user's own listing.
      if (listing.seller_id !== session.user.id) {
        throw new Error("You can only accept bids on your own listings.");
      }

      const { error: bidError } = await supabase
        .from("bids")
        .update({ status: "accepted" })
        .eq("id", bid.id)
        .eq("listing_id", listing.id);
      if (bidError) throw bidError;

      const { error: listingError } = await supabase
        .from("listings")
        .update({ status: "inactive" })
        .eq("id", listing.id)
        .eq("seller_id", session.user.id);
      if (listingError) throw listingError;

      const { data: existingTx, error: txLookupError } = await supabase
        .from("transactions")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("harvester_id", bid.bidder_id)
        .maybeSingle();
      if (txLookupError) throw txLookupError;

      if (!existingTx) {
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert([
            {
              listing_id: listing.id,
              seller_id: session.user.id,
              harvester_id: bid.bidder_id,
              amount: bid.amount,
              status: "pending",
              barangay: "Pending Discussion",
            },
          ]);
        if (transactionError) throw transactionError;
      }

      const { error: messageError } = await supabase.from("messages").insert([
        {
          listing_id: listing.id,
          sender_id: session.user.id,
          receiver_id: bid.bidder_id,
          content: `Hello! I've accepted your bid of ₱${Number(bid.amount).toLocaleString()} for the ${listing.device_model}. Let's coordinate the meetup!`,
          is_read: false,
        },
      ]);
      if (messageError) throw messageError;

      setMyListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? {
              ...item,
              status: "inactive",
              bids: (item.bids || []).map((b) =>
                b.id === bid.id ? { ...b, status: "accepted" } : b,
              ),
            }
            : item,
        ),
      );

      alert("Bid accepted! The listing is now closed.");
      await fetchActiveListings();
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
    const fetchTransactions = async () => {
      if (!isAuthorized) return;
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select(
            `
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
        `,
          )
          .or(`seller_id.eq.${session.user.id},harvester_id.eq.${session.user.id}`)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // FIX: Ensure you are setting the fresh data,
        // not appending to an existing array.
        setTransactions(data || []);
      } catch (err) {
        console.error("Error fetching transactions:", err.message);
      }
    };

    if (activeTab === "transactions") {
      fetchTransactions();
    }
  }, [session.user.id, activeTab, isAuthorized]);
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
    let isMounted = true; // 1. Flag to track mounting

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Filter out the "empty" duplicates until the database is cleaned up
        const validNotifications = data.filter(
          (n) => n.description !== null && n.description !== "",
        );
        setNotifications(validNotifications);
      }
    };

    if (session?.user?.id) {
      fetchNotifications();
    }

    return () => {
      isMounted = false; // 3. Cleanup
    };
  }, [session]);
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfileData(data);
    };
    if (session && isAuthorized) fetchProfile(); // Added isAuthorized check inside
  }, [session, isAuthorized]);

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

    // Find listings that qualify for a donation reminder
    const eligibleListings = myListings
      .filter((listing) => {
        // Don't remind about donated listings
        if (
          listing.status?.toLowerCase() === "donated" ||
          listing.status?.toLowerCase() === "drop_off_assigned" ||
          listing.status?.toLowerCase() === "processed"
        ) {
          return false;
        }

        // Don't remind about inactive/sold listings
        if (
          ["inactive", "sold", "completed", "cancelled"].includes(
            listing.status?.toLowerCase(),
          )
        ) {
          return false;
        }

        // Calculate listing age
        const createdDate = new Date(listing.created_at);

        if (Number.isNaN(createdDate.getTime())) {
          return false;
        }

        const ageInDays =
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

        // Only listings old enough for the first reminder
        if (ageInDays < config.firstReminder) {
          return false;
        }

        // No inquiry/bid
        const activeBids =
          listing.bids?.filter((bid) => bid.status !== "declined") || [];

        if (activeBids.length > 0) {
          return false;
        }

        return true;
      })
      .map((listing) => {
        const createdDate = new Date(listing.created_at);

        const ageInDays = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          ...listing,
          ageInDays,
          isStrongSuggestion: ageInDays >= config.autoSuggest,
        };
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
          .select(`*, bids (*)`)
          .neq("seller_id", session.user.id)
          .eq("status", "active")
          .eq("condition", "Working")
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
          .select(`*, bids (*)`)
          .neq("seller_id", userId)
          .eq("status", "active")
          .eq("condition", "Working")
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
    setSelectedListing(listing);
    setBidAmount("");
    setBidMessage("");
    setLoading(true);

    const { data, error } = await supabase
      .from("bids")
      .select("id, amount, status, created_at")
      .eq("listing_id", listing.id)
      .eq("bidder_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error) {
      setListingBids(data || []);
    } else {
      console.error(
        "Error checking existing bid:",
        error.message
      );
      setListingBids([]);
    }

    setLoading(false);
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
      {/* Header Area */}
      <div className="p-6">
        <div className="flex justify-end items-center gap-4 mb-8 relative z-40">
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
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
              {notifications.filter((n) => !n.is_read).length}
            </span>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-14 right-0 w-85 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z- overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Notifications
                    </h3>
                    <button className="text-[10px] text-blue-500 font-bold hover:underline mt-0.5">
                      Mark all read (
                      {notifications.filter((n) => !n.is_read).length})
                    </button>
                  </div>
                  <button className="text-[10px] bg-slate-50 text-slate-500 px-4 py-2 rounded-full font-black uppercase tracking-tighter hover:bg-slate-100 transition">
                    Clear All
                  </button>
                </div>
                {donationReminder && (
                  <NotificationItem
                    icon={<Gift />}
                    bg="bg-[#f97316]"
                    title={
                      donationReminder.isStrongSuggestion
                        ? "Donation Recommended"
                        : "Listing Needs Attention"
                    }
                    desc={`Your ${donationReminder.device_model} listing has received no inquiries for ${donationReminder.ageInDays} days. Consider donating it.`}
                    time={`${donationReminder.ageInDays} days old`}
                    unread={true}
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
                    <div className="p-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      No new activities
                    </div>
                  )}
                </div>

                {/* Footer Link */}
                <button className="w-full py-4 text-[10px] font-black text-slate-400 bg-slate-50/30 hover:bg-slate-50 transition uppercase tracking-[0.2em] border-t border-slate-50">
                  View All Notifications
                </button>
              </div>
            )}
          </div>

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
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center border-2 border-white">
                  {messageUserCount > 99 ? "99+" : messageUserCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile Trigger */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="text-right">
              <div className="text-sm font-bold truncate max-w-[120px]">
                {session.user.user_metadata?.full_name || "User Name"}
              </div>
              <div
                className={`text-[10px] flex items-center gap-1 justify-end font-semibold ${profileData?.verification_status === "verified"
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
              {session.user.user_metadata?.full_name?.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Dropdown Header */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
                    {session.user.user_metadata?.full_name
                      ?.charAt(0)
                      .toUpperCase() ||
                      session.user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-bold truncate">
                      {session.user.user_metadata?.full_name || "User Name"}
                    </div>
                    <div className="text-[10px] opacity-80 truncate">
                      {session.user.email}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/10 rounded-lg p-1.5 text-center">
                    <div className="text-[10px] opacity-70 flex items-center justify-center gap-1">
                      <Star size={10} /> Rating
                    </div>
                    <div className="text-xs font-bold">
                      {profileData?.average_rating
                        ? Number(profileData.average_rating).toFixed(1)
                        : "0.0"}
                    </div>
                  </div>
                  <div className="flex-1 bg-white/10 rounded-lg p-1.5 text-center">
                    <div className="text-[10px] opacity-70 flex items-center justify-center gap-1">
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
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition">
                  <Award size={18} className="text-slate-400" /> Achievements
                </button>
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

              <p className="mt-2 text-[10px] text-red-400">
                Please update your documents and re-submit for approval.
              </p>
            </div>

            <button
              onClick={() => setIsVerificationModalOpen(true)}
              className="rounded-xl bg-red-600 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-red-700"
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
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
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
            "donation",
            "repair-shops",
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
              {tab === "donation" && <Gift size={18} />}
              {tab === "repair-shops" && <Wrench size={18} />}

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
          {activeTab === "listings" && (
            <div className="grid grid-cols-3 gap-6">

              {/* ==========================================
      LEFT SIDE — AVAILABLE LISTINGS
  =========================================== */}
              <div className="col-span-2">

                {/* Browse Banner */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-8 shadow-sm">
                  <div className="flex items-start gap-3">

                    <div className="bg-[#3285a1]/10 p-2 rounded-xl text-[#3285a1]">
                      <Package size={20} />
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-800">
                        Browse Available E-Waste Listings
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        These are active listings from other users. Select an item
                        to view its details and place your bid.
                      </p>
                    </div>

                  </div>
                </div>


                {/* HEADER */}
                <div className="flex justify-between items-center mb-4">

                  <h2 className="font-bold text-lg text-slate-800">
                    Available Listings
                  </h2>

                  <button
                    onClick={() => {
                      if (profileData?.verification_status !== "verified") {
                        alert(
                          "Your account is still pending admin verification. You cannot create listings yet."
                        );
                        return;
                      }

                      setIsModalOpen(true);
                    }}
                    className="bg-[#3285a1] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition"
                  >
                    <Plus size={18} />
                    Create Listing
                  </button>

                </div>


                {/* LISTINGS */}
                <div className="space-y-4">

                  {loading ? (

                    <p className="text-center text-slate-400 py-10">
                      Syncing with Wasteless database...
                    </p>

                  ) : listings.length > 0 ? (

                    listings.map((item) => {

                      // Find the currently logged-in user's bid
                      const myBid = (item.bids || []).find(
                        (bid) =>
                          bid.bidder_id === session.user.id &&
                          bid.status !== "declined"
                      );

                      return (
                        <div
                          key={item.id}
                          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-[#3285a1]/50 transition"
                        >

                          {/* LISTING HEADER */}
                          <div className="flex justify-between items-start">

                            <div className="space-y-1">

                              <div className="flex items-center gap-2">

                                <h3 className="font-bold text-slate-800 text-lg">
                                  {item.device_model}
                                </h3>

                                <span className="bg-emerald-100 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                  {item.status}
                                </span>

                              </div>

                              <p className="text-xs text-slate-400 font-medium">
                                {item.device_id || "A2111"} • {item.condition}
                              </p>

                              <p className="text-xs text-slate-500 mt-2">
                                {item.description ||
                                  "Screen not working, battery still good"}
                              </p>

                            </div>


                            <div className="bg-slate-50 p-3 rounded-xl">
                              <Package
                                className="text-slate-300"
                                size={24}
                              />
                            </div>

                          </div>


                          {/* FOOTER */}
                          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50">

                            <div className="flex gap-8">

                              {/* ASKING PRICE */}
                              <div className="flex items-center gap-2">

                                <span className="text-[#3285a1] font-bold text-sm">
                                  ₱
                                  {Number(
                                    item.asking_price || 0
                                  ).toLocaleString()}
                                </span>

                              </div>


                              {/* TOTAL BIDS */}
                              <div className="flex items-center gap-2 text-slate-400">

                                <MessageSquare size={14} />

                                <span className="text-xs font-bold">
                                  {
                                    (item.bids || []).filter(
                                      (bid) =>
                                        bid.status !== "declined"
                                    ).length
                                  }{" "}
                                  bids
                                </span>

                              </div>

                            </div>


                            {/* MAKE OFFER */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();

                                if (myBid) {
                                  alert(
                                    "You already placed an offer on this listing."
                                  );
                                  return;
                                }

                                handleSelectListing(item);
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${myBid
                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                : "bg-[#5b9e29] text-white hover:bg-[#4e8924]"
                                }`}
                            >

                              <Link2 size={15} />

                              {myBid
                                ? "Offer Placed"
                                : "Make Offer"}

                            </button>

                          </div>


                          {/* SHOW USER'S BID ON THIS LISTING */}
                          {myBid && (
                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">

                              <div className="flex justify-between items-center">

                                <div>

                                  <p className="text-[9px] uppercase tracking-wider font-black text-blue-400">
                                    Your Offer
                                  </p>

                                  <p className="text-xl font-black text-[#3285a1]">
                                    ₱
                                    {Number(
                                      myBid.amount || 0
                                    ).toLocaleString()}
                                  </p>

                                </div>


                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black ${myBid.status === "accepted"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                  {myBid.status === "accepted"
                                    ? "Accepted"
                                    : "Pending"}
                                </span>

                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })

                  ) : (

                    <div className="bg-white p-10 rounded-2xl text-center border-2 border-dashed border-slate-200">

                      <p className="text-slate-400">
                        No active listings found.
                      </p>

                    </div>

                  )}

                </div>

              </div>


              {/* ==========================================
      RIGHT SIDE — MY BIDS
  =========================================== */}
              <div className="col-span-1">

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm sticky top-6">

                  {/* HEADER */}
                  <div className="p-5 border-b border-slate-100">

                    <div className="flex items-center justify-between">

                      <div>

                        <h3 className="font-bold text-sm text-slate-800">
                          My Bids
                        </h3>

                        <p className="text-[10px] text-slate-400 mt-1">
                          Offers you have placed
                        </p>

                      </div>

                      <div className="bg-[#3285a1]/10 p-2.5 rounded-xl">

                        <TrendingUp
                          size={17}
                          className="text-[#3285a1]"
                        />

                      </div>

                    </div>

                  </div>


                  {/* MY BIDS */}
                  <div className="p-4 space-y-3 max-h-[650px] overflow-y-auto">

                    {(() => {

                      /*
                       * IMPORTANT:
                       * Only show bids where bidder_id is the
                       * currently logged-in user.
                       */
                      const myBids = listings.flatMap((listing) =>
                        (listing.bids || [])
                          .filter(
                            (bid) =>
                              bid.bidder_id === session.user.id &&
                              bid.status !== "declined"
                          )
                          .map((bid) => ({
                            ...bid,
                            listing,
                          }))
                      );


                      if (myBids.length === 0) {

                        return (
                          <div className="py-10 text-center">

                            <div className="w-12 h-12 mx-auto bg-slate-50 rounded-2xl flex items-center justify-center">

                              <Package
                                size={22}
                                className="text-slate-300"
                              />

                            </div>

                            <p className="text-xs font-bold text-slate-500 mt-3">
                              No bids placed yet
                            </p>

                            <p className="text-[10px] text-slate-400 mt-1">
                              Your offers will appear here.
                            </p>

                          </div>
                        );

                      }


                      return myBids.map((bid) => {

                        const listing = bid.listing;

                        const askingPrice = Number(
                          listing.asking_price || 0
                        );

                        const bidAmount = Number(
                          bid.amount || 0
                        );

                        const percentage =
                          askingPrice > 0
                            ? Math.round(
                              (bidAmount / askingPrice) * 100
                            )
                            : 0;


                        return (
                          <div
                            key={bid.id}
                            className="border border-slate-200 rounded-2xl p-4 hover:border-[#3285a1]/40 transition"
                          >

                            {/* DEVICE */}
                            <div className="flex justify-between items-start gap-3">

                              <div className="min-w-0">

                                <p className="text-sm font-black text-slate-800">
                                  {listing.device_model}
                                </p>

                                <p className="text-[10px] text-slate-400 mt-1">
                                  Asking Price: ₱
                                  {askingPrice.toLocaleString()}
                                </p>

                              </div>

                              <Package
                                size={17}
                                className="text-slate-300"
                              />

                            </div>


                            {/* YOUR BID */}
                            <div className="bg-blue-50 rounded-xl p-3 mt-3">

                              <p className="text-[9px] uppercase tracking-wider font-black text-blue-400">
                                Your Offer
                              </p>

                              <p className="text-xl font-black text-[#3285a1] mt-1">
                                ₱{bidAmount.toLocaleString()}
                              </p>

                              <p className="text-[9px] text-slate-400 mt-1">
                                {percentage}% of asking price
                              </p>

                            </div>


                            {/* STATUS */}
                            <div className="flex items-center justify-between mt-3">

                              <span
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black ${bid.status === "accepted"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                                  }`}
                              >
                                {bid.status === "accepted"
                                  ? "Accepted"
                                  : "Pending"}
                              </span>


                              {bid.created_at && (
                                <span className="text-[9px] text-slate-400">

                                  {new Date(
                                    bid.created_at
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}

                                </span>
                              )}

                            </div>


                            {/* VIEW LISTING */}
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectListing(listing)
                              }
                              className="w-full mt-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black hover:bg-slate-50 transition"
                            >
                              View Listing
                            </button>

                          </div>
                        );

                      });

                    })()}

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* --- TRANSACTIONS TAB --- */}
          {activeTab === "transactions" && (
            <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">
                    Active Transactions
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Transactions where you are either the seller or the buyer.
                  </p>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-100 p-12 text-center">
                  <ArrowLeftRight size={30} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-500 mt-3">
                    No active transactions
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
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
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${
                                isCompleted
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : tx.status === "cancelled"
                                    ? "bg-red-50 text-red-600 border-red-200"
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
                            <p className="text-sm font-black text-[#2d7a7f]">
                              {isRepair ? "No payment" : `₱${Number(tx.amount || 0).toLocaleString()}`}
                            </p>
                            <span
                              className={`text-[9px] font-black px-2 py-1 rounded-full ${
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
                                      : isMeetupScheduled
                                        ? "Meetup Scheduled"
                                        : "Matched"}
                                </span>
                                <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                                  {isSeller ? "You are selling" : "You are buying"}
                                </span>
                              </div>
                            </div>

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
                                      <span className="absolute -bottom-7 text-[10px] font-bold text-slate-500 whitespace-nowrap">{label}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="relative flex justify-between items-center max-w-lg mx-auto">
                                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
                                  <div className={`absolute top-1/2 left-0 h-1 transition-all duration-700 -translate-y-1/2 ${isCompleted ? "bg-green-500 w-full" : isMeetupScheduled ? "bg-blue-500 w-1/2" : "bg-blue-500 w-0"}`} />
                                  <div className="relative z-10 flex flex-col items-center"><div className="bg-white p-1 rounded-full border-2 border-green-500 text-green-500"><Check size={14} strokeWidth={3} /></div><span className="absolute -bottom-7 text-[10px] font-bold text-slate-500 whitespace-nowrap">Matched</span></div>
                                  <div className="relative z-10 flex flex-col items-center"><div className={`bg-white p-1 rounded-full border-2 ${isMeetupScheduled || isCompleted ? "border-blue-500 text-blue-500" : "border-slate-200 text-slate-300"}`}>{isMeetupScheduled || isCompleted ? <Check size={14} strokeWidth={3} /> : <Clock size={14} />}</div><span className="absolute -bottom-7 text-[10px] font-bold text-slate-500 whitespace-nowrap">Meetup Scheduled</span></div>
                                  <div className="relative z-10 flex flex-col items-center"><div className={`bg-white p-1 rounded-full border-2 ${isCompleted ? "border-green-500 text-green-500" : "border-slate-200 text-slate-300"}`}><Check size={14} strokeWidth={3} className={isCompleted ? "opacity-100" : "opacity-0"} /></div><span className="absolute -bottom-7 text-[10px] font-bold text-slate-500 whitespace-nowrap">Handover Complete</span></div>
                                </div>
                              )}
                            </div>

                            <div className="p-8">
                              <div className={`grid ${isRepair ? "grid-cols-2" : "grid-cols-3"} gap-6 mb-8`}>
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                    {isRepair ? "Customer" : "Seller"}
                                  </p>
                                  <p className="text-sm font-bold text-slate-700">
                                    {sellerName}
                                  </p>
                                  {isSeller && !isRepair && <span className="text-[9px] text-emerald-600 font-bold">You</span>}
                                  {isRepair && <span className="text-[9px] text-blue-600 font-bold">You</span>}
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                    {isRepair ? "Repair Shop" : "Buyer"}
                                  </p>
                                  <p className="text-sm font-bold text-slate-700">
                                    {isRepair ? (tx.harvester?.business_name || tx.harvester?.full_name || "Repair Shop") : buyerName}
                                  </p>
                                </div>
                                {!isRepair && (
                                  <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Amount</p>
                                    <p className="text-xl font-black text-[#2d7a7f]">₱{Number(tx.amount || 0).toLocaleString()}</p>
                                  </div>
                                )}
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
                                        <div><p className="text-[9px] uppercase font-bold text-purple-400">Date</p><p className="text-sm font-bold text-slate-700 mt-1">{tx.meetup_date ? new Date(`${tx.meetup_date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not set"}</p></div>
                                        <div><p className="text-[9px] uppercase font-bold text-purple-400">Time</p><p className="text-sm font-bold text-slate-700 mt-1">{tx.meetup_time || "Not set"}</p></div>
                                        <div className="col-span-2"><p className="text-[9px] uppercase font-bold text-purple-400">Category</p><p className="text-sm font-bold text-slate-700 mt-1">{repairCategory}</p></div>
                                        <div className="col-span-2"><p className="text-[9px] uppercase font-bold text-purple-400">Reported Issue</p><p className="text-sm text-slate-600 mt-1">{repairIssue}</p></div>
                                        {repairNotes && <div className="col-span-2"><p className="text-[9px] uppercase font-bold text-purple-400">Service Notes</p><p className="text-xs text-slate-600 mt-1">{repairNotes}</p></div>}
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
                                    </div>
                                  ) : isMeetupScheduled ? (
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                                      <div className="flex items-center gap-3"><Calendar className="text-purple-600" size={20} /><div><p className="text-sm font-bold text-purple-800">Repair Appointment Scheduled</p><p className="text-xs text-purple-600 mt-1">Your repair appointment has been confirmed. The repair shop will mark the service as completed after the repair is finished.</p></div></div>
                                      <div className="grid grid-cols-2 gap-3 mt-4"><div className="bg-white rounded-xl p-3 border border-purple-100"><p className="text-[9px] font-black uppercase text-slate-400">Date</p><p className="text-xs font-bold text-slate-700 mt-1">{tx.meetup_date || "Not scheduled"}</p></div><div className="bg-white rounded-xl p-3 border border-purple-100"><p className="text-[9px] font-black uppercase text-slate-400">Time</p><p className="text-xs font-bold text-slate-700 mt-1">{tx.meetup_time || "Not scheduled"}</p></div></div>
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
                                        <div><p className="text-[9px] uppercase font-bold text-blue-400">Date</p><p className="text-sm font-bold text-slate-700 mt-1">{tx.meetup_date ? new Date(`${tx.meetup_date}T00:00:00`).toLocaleDateString("en-US", {month:"long",day:"numeric",year:"numeric"}) : "Not set"}</p></div>
                                        <div><p className="text-[9px] uppercase font-bold text-blue-400">Time</p><p className="text-sm font-bold text-slate-700 mt-1">{tx.meetup_time || "Not set"}</p></div>
                                        <div className="col-span-2"><p className="text-[9px] uppercase font-bold text-blue-400">Location</p><p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-1"><MapPin size={14} className="text-blue-500" />{tx.barangay || "Not set"}</p></div>
                                        {tx.notes && <div className="col-span-2"><p className="text-[9px] uppercase font-bold text-blue-400">Notes</p><p className="text-xs text-slate-600 mt-1">{tx.notes}</p></div>}
                                      </div>
                                    </div>
                                  ) : null}

                                  {isCompleted ? (
                                    <div className="space-y-4">
                                      <div className="bg-green-50 border border-green-100 rounded-xl p-5 flex items-center gap-4"><div className="bg-white p-2 rounded-full shadow-sm text-green-500 border border-green-100"><Check size={20} strokeWidth={3}/></div><div><p className="text-sm font-bold text-green-800">Transaction Completed</p><p className="text-xs text-green-600">The handover has been confirmed by the buyer.{tx.updated_at && <> Completed on {new Date(tx.updated_at).toLocaleDateString("en-US", {month:"long",day:"numeric",year:"numeric"})}.</>}</p></div></div>
                                      <button onClick={() => setSelectedReceiptTransaction(tx)} className="w-full bg-[#3285a1] hover:bg-[#276b82] text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"><Download size={18}/> View Transaction Receipt</button>
                                      {isSeller && <button onClick={() => setShowRateModal(true)} className="w-full bg-[#FF4D2D] hover:bg-[#e64528] text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-200"><Star size={18} fill="currentColor"/> Rate Buyer</button>}
                                    </div>
                                  ) : isBuyer && isMeetupScheduled ? (
                                    <div className="space-y-3"><div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-sm font-bold text-amber-800">Handover Pending</p><p className="text-xs text-amber-600 mt-1">After you receive the item at the scheduled meetup, confirm the handover below.</p></div><button onClick={() => handleCompleteTransaction(tx.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"><CheckCheck size={18}/> Confirm Handover Complete</button></div>
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
              sellerBarangay={
                profileData?.barangay ||
                session?.user?.user_metadata?.barangay ||
                ""
              }
            />
          )}
        </div>
        {/* Profile Modal Overlay */}
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
            <div className="min-h-screen w-full flex flex-col">
              {/* Full-Screen Profile Header */}
              <div className="bg-gradient-to-br from-[#448b78] to-[#6da43a] p-6 text-white relative">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 hover:bg-white/20 p-1 rounded-full transition"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                      {session.user.user_metadata?.full_name
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>
                    <button className="absolute bottom-0 right-0 bg-white text-gray-700 p-1 rounded-full shadow-md hover:bg-gray-100 transition">
                      <Camera size={12} />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {session.user.user_metadata?.full_name || "User Name"}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${profileData?.verification_status === "approved"
                          ? "bg-emerald-500/20 text-white"
                          : profileData?.verification_status === "pending"
                            ? "bg-amber-500/20 text-white"
                            : profileData?.verification_status === "rejected"
                              ? "bg-red-500/20 text-white"
                              : "bg-slate-500/20 text-white"
                          }`}
                      >
                        <CheckCircle size={10} />

                        {profileData?.verification_status === "approved"
                          ? "Verified Seller"
                          : profileData?.verification_status === "pending"
                            ? "Verification Pending"
                            : profileData?.verification_status === "rejected"
                              ? "Verification Rejected"
                              : "Not Submitted"}
                      </span>
                      <span className="text-[10px] opacity-80">
                        Active since{" "}
                        {new Date(session.user.created_at).toLocaleDateString(
                          "en-US",
                          { month: "long", year: "numeric" },
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-yellow-300">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-bold text-white">
                        0.0{" "}
                        <span className="opacity-70 font-normal">
                          (0 reviews)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-Screen Profile Content */}
              <div className="flex-1 p-6 md:p-10 space-y-6 bg-slate-50/50">
                <div className="flex justify-end">
                  <button className="flex items-center gap-2 bg-[#2d7a7f] text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-[#246367] transition shadow-sm">
                    <Edit3 size={14} /> Edit Profile
                  </button>
                </div>
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {
                      label: "Total Listings",
                      val: myListings.length,
                      icon: <Package size={16} />,
                      color: "text-blue-500",
                      bg: "bg-blue-50",
                    },
                    {
                      label: "Items Sold",
                      val: myListings.filter((item) =>
                        ["meetup scheduled", "sold", "completed"].includes(
                          item.status?.toLowerCase(),
                        ),
                      ).length,
                      icon: <TrendingUp size={16} />,
                      color: "text-green-500",
                      bg: "bg-green-50",
                    },
                    {
                      label: "Rating",
                      val: profileData?.average_rating?.toFixed(1) || "0.0", // Dynamic data
                      icon: <Star size={16} />,
                      color: "text-yellow-500",
                      bg: "bg-yellow-50",
                    },
                    {
                      label: "Reviews",
                      val: profileData?.total_reviews || "0", // Dynamic data
                      icon: <MessageSquare size={16} />,
                      color: "text-purple-500",
                      bg: "bg-purple-50",
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className={`${stat.bg} p-3 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center`}
                    >
                      <div className={`${stat.color} mb-1`}>{stat.icon}</div>
                      <div className="text-sm font-black text-gray-800">
                        {stat.val}
                      </div>
                      <div className="text-[9px] text-gray-500 font-medium leading-tight">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Trust Tier Section - Matching the purple card in mockup */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                  <Shield
                    className="absolute right-4 top-4 opacity-20"
                    size={60}
                  />
                  <div className="relative z-10">
                    <h3 className="font-bold text-lg">
                      {session.user.user_metadata?.full_name}
                    </h3>
                    <p className="text-[10px] opacity-80 mb-3">
                      Member since{" "}
                      {new Date(session.user.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      {/* Badge/Award Icon */}
                      {/* <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1">
                      <Award size={10} /> */}
                      {/* Logic: Change label based on review count */}
                      {/* {profileData?.total_reviews > 5
                        ? "Top Seller"
                        : "Rising Star"}
                    </span> */}

                      {/* Star Rating & Review Count */}
                      <span className="text-xs font-bold flex items-center gap-1 text-white">
                        <span className="text-yellow-400">★</span>
                        {profileData?.average_rating
                          ? Number(profileData.average_rating).toFixed(1)
                          : "0.0"}
                        <span className="opacity-70 font-normal ml-0.5">
                          ({profileData?.total_reviews || 0})
                        </span>
                      </span>

                      {/* Dynamic Recommended Tag */}
                      {profileData?.average_rating >= 4.0 && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                          Recommended
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2 bg-white/10 p-3 rounded-xl border border-white/10">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="flex items-center gap-1 uppercase tracking-wider">
                          <ArrowUpRight size={10} /> Next Tier:{" "}
                          <span className="text-cyan-300">N/A</span>
                        </span>
                        {/* Updated text to 0% */}
                        <span>{Math.round(progressPercent)}% complete</span>
                      </div>
                      <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                        {/* Updated width to 0% */}
                        <div
                          style={{ width: `${progressPercent}%` }}
                          className="bg-gradient-to-r from-cyan-400 to-purple-400 h-full shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-500"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
                    Personal Information
                  </h3>
                  <div className="grid gap-4">
                    <InfoRow
                      label="Full Name"
                      value={session.user.user_metadata?.full_name}
                      icon={<User size={14} />}
                    />
                    <InfoRow
                      label="Email Address"
                      value={session.user.email}
                      icon={<Mail size={14} />}
                    />
                    <InfoRow
                      label="Phone Number"
                      value={
                        session.user.user_metadata?.contact_number ||
                        "+63 917 123 4567"
                      }
                      icon={<Phone size={14} />}
                    />
                    <InfoRow
                      label="Barangay"
                      value={session.user.user_metadata?.barangay || "Not set"}
                      icon={<MapPin size={14} />}
                    />
                  </div>
                </div>

                {/* MY LISTINGS + BIDS */}
                <div className="space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-gray-800 text-sm">
                      My Listings & Bids
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      {myListings.length} listings
                    </span>
                  </div>

                  {myListings.length > 0 ? (
                    <div className="space-y-5">
                      {myListings.map((item) => {
                        const activeBids = (item.bids || []).filter(
                          (bid) => bid.status !== "declined",
                        );

                        const askingPrice = Number(item.asking_price || 0);

                        return (
                          <div
                            key={item.id}
                            className="bg-white border border-slate-200 rounded-[1.75rem] p-5 sm:p-6 shadow-sm"
                          >
                            <div className="flex flex-col lg:flex-row gap-6">

                              {/* =========================
          LEFT — LISTING INFORMATION
      ========================== */}
                              <div className="flex-1 min-w-0">

                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-lg font-black text-slate-800">
                                      {item.device_model}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <span className="text-xs font-bold text-slate-500">
                                        Asking Price:
                                      </span>

                                      <span className="text-xs font-black text-[#3285a1]">
                                        ₱{askingPrice.toLocaleString()}
                                      </span>

                                      <span className="text-slate-300">•</span>

                                      <span className="text-xs text-slate-400">
                                        {item.status}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="bg-[#3285a1]/10 text-[#3285a1] px-3 py-2 rounded-full shrink-0">
                                    <span className="text-[10px] font-black">
                                      {activeBids.length}{" "}
                                      {activeBids.length === 1 ? "BID" : "BIDS"}
                                    </span>
                                  </div>
                                </div>

                                {/* LISTING DETAILS */}
                                <div className="grid grid-cols-2 gap-3 mt-5">

                                  <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[9px] uppercase font-bold text-slate-400">
                                      Condition
                                    </p>

                                    <p className="text-sm font-black text-slate-700 mt-1">
                                      {item.condition || "Not specified"}
                                    </p>
                                  </div>

                                  <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[9px] uppercase font-bold text-slate-400">
                                      Asking Price
                                    </p>

                                    <p className="text-sm font-black text-[#3285a1] mt-1">
                                      ₱{askingPrice.toLocaleString()}
                                    </p>
                                  </div>

                                </div>

                              </div>


                              {/* =========================
          RIGHT — BIDS RECEIVED
      ========================== */}
                              <div className="w-full lg:w-[390px] lg:border-l lg:border-slate-100 lg:pl-6">

                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                                      Bids Received
                                    </p>

                                    <p className="text-xs text-slate-500 mt-1">
                                      Offers from harvesters
                                    </p>
                                  </div>

                                  <div className="w-9 h-9 rounded-xl bg-[#3285a1]/10 flex items-center justify-center">
                                    <Gavel
                                      size={17}
                                      className="text-[#3285a1]"
                                    />
                                  </div>
                                </div>


                                {/* BIDS */}
                                {activeBids.length > 0 ? (
                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">

                                    {activeBids.map((bid) => {

                                      const bidAmount = Number(bid.amount || 0);

                                      const bidderName =
                                        getBuyerDisplayName(bid.profiles);

                                      const bidderRole =
                                        getBuyerRoleLabel(
                                          bid.profiles?.role
                                        );

                                      const initials =
                                        bidderName
                                          ?.split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)
                                          .toUpperCase() || "TH";

                                      return (
                                        <div
                                          key={bid.id}
                                          className="border border-slate-200 rounded-2xl p-4 bg-slate-50"
                                        >

                                          {/* BIDDER */}
                                          <div className="flex items-center justify-between gap-3">

                                            <div className="flex items-center gap-3 min-w-0">

                                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3285a1] to-[#6da43a] text-white flex items-center justify-center text-xs font-black shrink-0">
                                                {initials}
                                              </div>

                                              <div className="min-w-0">

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setSelectedBidder({
                                                      ...bid.profiles,
                                                      id: bid.bidder_id,
                                                    })
                                                  }
                                                  className="text-xs font-black text-slate-800 hover:text-[#3285a1] transition truncate block text-left"
                                                >
                                                  {bidderName}
                                                </button>

                                                <span className="text-[9px] font-bold text-[#3285a1]">
                                                  {bidderRole}
                                                </span>

                                              </div>

                                            </div>


                                            {/* OFFER AMOUNT */}
                                            <div className="text-right shrink-0">

                                              <p className="text-[9px] uppercase font-bold text-slate-400">
                                                Offer
                                              </p>

                                              <p className="text-lg font-black text-[#3285a1]">
                                                ₱{bidAmount.toLocaleString()}
                                              </p>

                                            </div>

                                          </div>


                                          {/* STATUS */}
                                          <div className="flex items-center justify-between mt-3">

                                            <span
                                              className={`px-2.5 py-1 rounded-full text-[9px] font-black ${bid.status === "accepted"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : bid.status === "declined"
                                                  ? "bg-red-100 text-red-600"
                                                  : "bg-amber-100 text-amber-700"
                                                }`}
                                            >
                                              {bid.status === "accepted"
                                                ? "Accepted"
                                                : bid.status === "declined"
                                                  ? "Declined"
                                                  : "Pending"}
                                            </span>

                                            {bid.created_at && (
                                              <span className="text-[9px] text-slate-400">
                                                {new Date(
                                                  bid.created_at
                                                ).toLocaleDateString("en-US", {
                                                  month: "short",
                                                  day: "numeric",
                                                  year: "numeric",
                                                })}
                                              </span>
                                            )}

                                          </div>


                                          {/* ACTIONS */}
                                          {bid.status === "pending" && (
                                            <div className="flex gap-2 mt-3">

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleAcceptBid(bid, item)
                                                }
                                                className="flex-1 bg-[#3285a1] text-white py-2.5 rounded-xl text-[10px] font-black hover:bg-[#2a7089] transition flex items-center justify-center gap-1.5"
                                              >
                                                <Check size={13} />
                                                Accept
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDeclineBid(bid, item)
                                                }
                                                className="flex-1 bg-white border border-red-200 text-red-500 py-2.5 rounded-xl text-[10px] font-black hover:bg-red-50 transition flex items-center justify-center gap-1.5"
                                              >
                                                <X size={13} />
                                                Decline
                                              </button>

                                            </div>
                                          )}

                                        </div>
                                      );
                                    })}

                                  </div>

                                ) : (

                                  /* NO BIDS */
                                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center">

                                    <Gavel
                                      size={25}
                                      className="mx-auto text-slate-300"
                                    />

                                    <p className="text-xs font-bold text-slate-500 mt-2">
                                      No bids received yet
                                    </p>

                                    <p className="text-[10px] text-slate-400 mt-1">
                                      Offers from verified harvesters will appear here.
                                    </p>

                                  </div>
                                )}

                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-6">
                      You have not created any listings yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
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
          userId={session.user.id} // use this instead
        />
        <RateBuyerModal
          isOpen={showRateModal}
          onClose={() => setShowRateModal(false)}
          buyerName={
            transactions.find((t) => t.id === selectedTxId)?.harvester
              ?.full_name
          }
          onConfirm={handleSubmitRating}
        />
        <DonationModal
          isOpen={isDonationModalOpen}
          onClose={() => {
            setIsDonationModalOpen(false);
            setListingToDonate(null);
          }}
          onConfirm={handleConfirmDonation}
          listing={listingToDonate}
          barangay={session?.user?.user_metadata?.barangay || "Karuhatan"}
        />
        <div className="space-y-4">
          {/* FULL NAME */}
          {/* <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-2">
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
          <label className="text-[11px] font-bold text-slate-700 block mb-2">
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
          <label className="text-[11px] font-bold text-slate-700 block mb-2">
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
              <label className="text-[11px] font-bold text-slate-700 block mb-2">
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

                      <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">
                        Tech Harvester
                      </span>

                      {selectedBidder.verification_status === "approved" && (
                        <span className="bg-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
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

                      <span className="text-[10px] uppercase font-black">
                        Rating
                      </span>
                    </div>

                    <p className="text-2xl font-black text-slate-800 mt-2">
                      {Number(
                        selectedBidder.average_rating || 0,
                      ).toFixed(1)}
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      {selectedBidder.total_reviews || 0} reviews
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Leaf size={18} />

                      <span className="text-[10px] uppercase font-black">
                        Eco Points
                      </span>
                    </div>

                    <p className="text-2xl font-black text-slate-800 mt-2">
                      {Number(
                        selectedBidder.eco_points || 0,
                      ).toLocaleString()}
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
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
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        Recovered Devices
                      </p>

                      <p className="text-xl font-black text-[#3285a1] mt-1">
                        {Number(
                          selectedBidder.recovered_devices || 0,
                        )}
                      </p>
                    </div>

                    <div className="border border-slate-100 rounded-2xl p-4">
                      <p className="text-[10px] uppercase font-bold text-slate-400">
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
                          <p className="text-[10px] uppercase font-bold text-slate-400">
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
                          <p className="text-[10px] uppercase font-bold text-slate-400">
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
                          <p className="text-[10px] uppercase font-bold text-slate-400">
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

                    <p className="text-[11px] text-slate-500 mt-1">
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
                    <label className="text-[11px] font-bold text-slate-700 block mb-2">
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

                      <p className="text-[10px] text-slate-400 mt-1">
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
                      <label className="text-[11px] font-bold text-slate-700 block mb-2">
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
                      <label className="text-[11px] font-bold text-slate-700 block mb-2">
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
      <footer className="mt-20 bg-[#07122b] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-10 py-16">
          <div className="grid grid-cols-4 gap-12">
            {/* LEFT */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <Leaf size={18} />
                </div>

                <h2 className="text-3xl font-bold">Wasteless</h2>
              </div>

              <p className="text-slate-400 leading-relaxed text-sm mb-6">
                Valenzuela City's official e-waste management platform promoting
                circular economy and sustainable electronics disposal.
              </p>

              <div className="flex gap-3">
                <span className="px-4 py-2 rounded-full border border-emerald-500 text-emerald-400 text-xs">
                  Eco-Certified
                </span>

                <span className="px-4 py-2 rounded-full border border-blue-500 text-blue-400 text-xs">
                  City Partner
                </span>
              </div>
            </div>

            {/* QUICK LINKS */}
            <div>
              <h3 className="text-xl font-semibold mb-6">Quick Links</h3>

              <div className="space-y-4 text-slate-400 text-sm">
                <p>About Wasteless</p>
                <p>How It Works</p>
                <p>Environmental Impact</p>
                <p>Partner Shops</p>
                <p>Help Center</p>
                <p>FAQs</p>
              </div>
            </div>

            {/* LEGAL */}
            <div>
              <h3 className="text-xl font-semibold mb-6">Legal</h3>

              <div className="space-y-4 text-slate-400 text-sm">
                <p>Terms of Service</p>
                <p>Privacy Policy</p>
                <p>Cookie Policy</p>
                <p>Data Protection</p>
                <p>E-Waste Guidelines</p>
                <p>Accessibility</p>
              </div>
            </div>

            {/* CONTACT */}
            <div>
              <h3 className="text-xl font-semibold mb-6">Contact Us</h3>

              <div className="space-y-5 text-slate-400 text-sm">
                <div className="flex gap-3">
                  <MapPin size={18} className="mt-1" />
                  <p>
                    Valenzuela City Hall
                    <br />
                    MacArthur Highway, Valenzuela City
                    <br />
                    Metro Manila, Philippines
                  </p>
                </div>

                <div className="flex gap-3 items-center">
                  <Phone size={16} />
                  <p>(02) 123-4567</p>
                </div>

                <div className="flex gap-3 items-center">
                  <Mail size={16} />
                  <p>wasteless@valenzuela.gov.ph</p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM */}
          <div className="border-t border-white/10 mt-16 pt-8 flex justify-between items-center text-slate-500 text-sm">
            <p>© 2026 Wasteless - Valenzuela City. All rights reserved.</p>

            <div className="flex gap-8">
              <p>Valenzuela City Government</p>
              <p>DENR</p>
            </div>
          </div>
        </div>
      </footer>
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
              <p className="text-[10px] text-amber-700 mt-1">
                The buyer ({transaction?.harvester?.full_name}) will be notified
                immediately.
              </p>
            </div>
          </div>

          {/* Reason Select */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
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
            <p className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-3">
              Transaction Details:
            </p>
            <ul className="space-y-1.5">
              <li className="text-[11px] text-red-700 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full" />
                Device: {transaction?.listing?.device_model}
              </li>
              <li className="text-[11px] text-red-700 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full" />
                Buyer: {transaction?.harvester?.full_name}
              </li>
              <li className="text-[11px] text-red-700 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full" />
                Amount: ₱{transaction?.amount?.toLocaleString()}
              </li>
              <li className="text-[11px] text-red-700 flex items-center gap-2">
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
      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
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
  onDelete,
}) => (
  <div
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
          className={`text-[11px] font-black uppercase tracking-tight truncate pr-2 ${unread ? "text-slate-900" : "text-slate-500"
            }`}
        >
          {title}
        </h4>
        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap pt-0.5">
          {time}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 font-medium">
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
