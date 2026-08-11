import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import CreateListingModal from "./CreateListingModal"; // Adjust path as needed
import SellerMessages from "./SellerMessages"; // Ensure the filename matches
import DonationModal from "./DonationModal";
import RateBuyerModal from "./RateBuyerModal";
import banner from "./assets/banner.jpeg";

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
} from "lucide-react";

const SellerDashboard = ({ session }) => {
  const [activeTab, setActiveTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null); // Assuming you have user data for the ID
  const [bids, setBids] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
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
  const nextTierGoal = 10;
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [listingToDonate, setListingToDonate] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
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
      setListings((prev) =>
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

  const progressPercent = Math.min(
    (profileData?.total_reviews / nextTierGoal) * 100,
    100,
  );
  const handleCompleteTransaction = async (txId) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "completed" })
        .eq("id", txId);

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, status: "completed" } : t)),
      );
      alert("Transaction marked as completed!");
    } catch (err) {
      alert("Failed to update database: " + err.message);
    }
  };

  const handleCancelTransaction = async (txId) => {
    try {
      const txToCancel = transactions.find((t) => t.id === txId);

      const { error: txError } = await supabase
        .from("transactions")
        .update({
          status: "cancelled",
          cancel_reason: cancelReason,
        })
        .eq("id", txId);

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

  const handleAcceptBid = async (bid) => {
    try {
      // 1. Update the bid status to 'accepted'
      const { error: bidError } = await supabase
        .from("bids")
        .update({
          status: "accepted",
        })
        .eq("id", bid.id);

      if (bidError) throw bidError;

      // 2. LOCK THE LISTING
      const { error: listingUpdateError } = await supabase
        .from("listings")
        .update({
          status: "inactive",
        })
        .eq("id", bid.listing_id);

      if (listingUpdateError) throw listingUpdateError;

      // 🔥 3. CHECK IF TRANSACTION ALREADY EXISTS
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("listing_id", selectedListing.id)
        .eq("harvester_id", bid.bidder_id)
        .maybeSingle();

      if (!existingTx) {
        // 4. CREATE TRANSACTION ONLY IF NOT EXISTS
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert([
            {
              listing_id: selectedListing.id,
              seller_id: session.user.id,
              harvester_id: bid.bidder_id,
              amount: bid.amount,
              status: "pending",
              barangay: "Pending Discussion",
            },
          ]);

        if (transactionError) throw transactionError;
      }

      // 5. AUTO-MESSAGE
      const { error: messageError } = await supabase.from("messages").insert([
        {
          listing_id: selectedListing.id,
          sender_id: session.user.id,
          receiver_id: bid.bidder_id,
          content: `Hello! I've accepted your bid of ₱${bid.amount.toLocaleString()} for the ${selectedListing.device_model}. Let's coordinate the meetup!`,
          is_read: false,
        },
      ]);

      if (messageError) throw messageError;

      alert("Bid accepted! The listing is now closed.");
      if (typeof fetchListings === "function") fetchListings();
      setActiveTab("messages");
    } catch (error) {
      console.error("Error in bid acceptance:", error.message);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeclineBid = async (bid) => {
    try {
      const { error } = await supabase
        .from("bids")
        .update({
          status: "declined",
        })
        .eq("id", bid.id);

      if (error) throw error;

      // Refresh local state
      setListingBids((prev) =>
        prev.map((b) => (b.id === bid.id ? { ...b, status: "declined" } : b)),
      );

      alert("Bid declined successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to decline bid.");
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
          harvester:harvester_id (
  full_name,
  business_name,
  role
),
          listing:listing_id (device_model, asking_price)
        `,
          )
          .eq("seller_id", session.user.id)
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
      if (dbRole !== "seller") {
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
    if (!listings || listings.length === 0) {
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
    const eligibleListings = listings
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
  }, [listings]);

  useEffect(() => {
    const fetchListings = async () => {
      if (!isAuthorized) return; // Exit early if not authorized
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(`*, bids (*)`)
          .eq("seller_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setListings(data || []);
      } catch (err) {
        console.error("Error fetching listings:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [session.user.id, isAuthorized]);
  if (checkingRole || !isAuthorized) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center">
        Loading
      </div>
    );
  }
  const handleSelectListing = async (listing) => {
    setSelectedListing(listing);
    setLoading(true);

    const { data, error } = await supabase
      .from("bids")
      .select(
        `
    *,
    profiles:bidder_id (
      full_name,
      business_name,
      role
    )
  `,
      )
      .eq("listing_id", listing.id)
      .order("amount", { ascending: false });

    if (!error) setListingBids(data);

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
      if (profileData?.role === "seller") {
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
                  {/* 1. Static System Notification (from Mockup) */}
                  <NotificationItem
                    icon={<AlertCircle />}
                    bg="bg-[#f97316]" // Orange
                    title="Listing Expiring Soon"
                    desc="Your iPhone 11 listing will expire in 2 days. Convert to donation now to get tax credits!"
                    time="2m ago"
                    unread={true}
                    onDelete={() => console.log("Static delete")}
                  />

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
                className={`text-[10px] flex items-center gap-1 justify-end font-semibold ${
                  profileData?.verification_status === "verified"
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
            { label: "Active Listings", val: listings.length },
            { label: "Total Bids", val: totalBidsCount },
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
          {["listings", "messages", "transactions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition capitalize ${
                activeTab === tab
                  ? "bg-[#3285a1] text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab === "listings" && <Package size={18} />}
              {tab === "messages" && <MessageSquare size={18} />}
              {tab === "transactions" && <ArrowLeftRight size={18} />}
              {tab === "listings" ? "My Listings" : tab}
            </button>
          ))}
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="min-h-[600px]">
          {activeTab === "listings" && (
            <div className="grid grid-cols-3 gap-6">
              {/* Listings Section */}
              <div className="col-span-2">
                {/* DONATION REMINDER */}
                {donationReminder && (
                  <div className="bg-[#FFF8F1] border border-[#FFE4C4] rounded-2xl p-5 mb-8 flex items-start justify-between relative overflow-hidden">
                    <div className="flex gap-4">
                      <div className="bg-[#FF9F43] p-2 rounded-xl text-white mt-1">
                        <AlertCircle size={20} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[#854d0e]">
                            {donationReminder.isStrongSuggestion
                              ? "Donation Recommended"
                              : "Listing Needs Attention"}
                          </h3>

                          <span className="bg-[#FF9F43]/10 text-[#FF9F43] text-[10px] px-2 py-0.5 rounded-md font-bold">
                            {donationReminder.ageInDays} days
                          </span>
                        </div>

                        <p className="text-xs text-[#a16207]">
                          Your listing{" "}
                          <span className="font-bold">
                            "{donationReminder.device_model}"
                          </span>{" "}
                          has not received any inquiries or bids for{" "}
                          {donationReminder.ageInDays} days.
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-[#a16207] py-2">
                          <span className="opacity-60">
                            📅 Listed on{" "}
                            {new Date(
                              donationReminder.created_at,
                            ).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>

                          {donationReminder.asking_price && (
                            <span className="opacity-60">
                              Est. Value: ₱
                              {Number(
                                donationReminder.asking_price,
                              ).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#854d0e] flex items-center gap-1 mt-2">
                          <span className="font-bold">
                            {donationReminder.isStrongSuggestion
                              ? "Consider donating:"
                              : "No inquiries yet:"}
                          </span>

                          {donationReminder.isStrongSuggestion
                            ? " Donate this device to help reduce e-waste and support your local community."
                            : " If it remains inactive, consider donating it instead."}
                        </p>

                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => handleOpenDonation(donationReminder)}
                            className="bg-[#FF9F43] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#f28c25] transition"
                          >
                            <Gift size={14} className="inline mr-1" />
                            Convert to Donation
                          </button>

                          <button
                            onClick={() => {
                              setDonationReminder(null);
                            }}
                            className="bg-white border border-[#FFE4C4] text-[#a16207] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#FFF3E0] transition"
                          >
                            Remind Me Later
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setDonationReminder(null)}
                      className="text-[#a16207] opacity-50 hover:opacity-100"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">My Listings</h2>
                  <button
                    onClick={() => {
                      if (profileData?.verification_status !== "verified") {
                        alert(
                          "Your account is still pending admin verification. You cannot create listings yet.",
                        );
                        return;
                      }

                      setIsModalOpen(true);
                    }}
                    disabled={profileData?.verification_status !== "verified"}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                      profileData?.verification_status === "verified"
                        ? "bg-[#3285a1] text-white hover:opacity-90"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <Plus size={18} />

                    {profileData?.verification_status === "verified"
                      ? "Create Listing"
                      : "Verification Required"}
                  </button>
                </div>
                <div className="mt-8">
                  <h2 className="font-bold text-lg mb-4">My Donations</h2>

                  {listings
                    .filter((listing) => listing.status === "donated")
                    .map((listing) => (
                      <div
                        key={listing.id}
                        className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-3"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">
                              {listing.device_model}
                            </h3>

                            <p className="text-sm text-slate-500">
                              {listing.category}
                            </p>
                          </div>

                          <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">
                            DONATED
                          </span>
                        </div>

                        <div className="mt-3 text-sm text-slate-600">
                          <p>
                            **Status:** Waiting for admin to assign a drop-off
                            point.
                          </p>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <p className="text-center text-slate-400 py-10">
                      Syncing with Wasteless database...
                    </p>
                  ) : listings.length > 0 ? (
                    listings.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectListing(item)}
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedListing?.id === item.id
                            ? "border-[#3285a1] ring-2 ring-[#3285a1]/10 bg-slate-50/30"
                            : "border-slate-100 bg-white hover:border-[#3285a1]/50"
                        } p-6 rounded-2xl border shadow-sm relative overflow-hidden`}
                      >
                        {/* ... listing card content ... */}
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
                            <Package className="text-slate-300" size={24} />
                          </div>
                        </div>
                        {/* ... inside listings.map((item) => ( ... */}
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50">
                          <div className="flex gap-8">
                            {/* Asking Price Section */}
                            <div className="flex items-center gap-2">
                              <span className="text-[#3285a1] font-bold text-sm">
                                ₱{item.asking_price?.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <MessageSquare size={14} />
                              <span className="text-xs font-bold">
                                {item.bids?.filter(
                                  (bid) => bid.status !== "declined",
                                ).length || 0}{" "}
                                bids
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                            <CheckCircle2 size={12} /> Data cleared
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-10 rounded-2xl text-center border-2 border-dashed border-slate-200">
                      <p className="text-slate-400">
                        No active listings found.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Bids Sidebar (Only for Listings Tab) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[600px] sticky top-6 z-10">
                {selectedListing ? (
                  <>
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          Bids
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          {selectedListing.device_model}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedListing(null)}
                        className="text-slate-300"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {listingBids
                        .filter((bid) => bid.status !== "declined")
                        .map((bid) => (
                          <div
                            key={bid.id}
                            className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#3285a1] rounded-lg flex items-center justify-center text-white">
                                  <User size={16} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-slate-800">
                                    {getBuyerDisplayName(bid.profiles)}
                                  </p>

                                  <span
                                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                      bid.profiles?.role === "repair_shop"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {getBuyerRoleLabel(bid.profiles?.role)}
                                  </span>
                                </div>
                              </div>
                              <span className="text-sm font-black text-[#3285a1]">
                                ₱{bid.amount.toLocaleString()}
                              </span>
                            </div>

                            {/* <p className="text-[11px] text-slate-500 mb-4 bg-slate-50 p-2 rounded-lg italic">
                          "Interested in the battery and camera module"
                        </p> */}

                            {bid.status === "accepted" ? (
                              <div className="space-y-2">
                                <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-center mb-1">
                                  Bid Accepted <CheckCircle size={10} />
                                </div>
                                <button className="w-full bg-[#3285a1] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                  <Calendar size={14} /> Schedule Meetup
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptBid(bid)}
                                  className="flex-1 bg-[#3285a1] text-white py-2 rounded-lg text-[10px] font-bold hover:bg-[#2a6f87] transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDeclineBid(bid)}
                                  className="flex-1 border border-red-200 text-red-500 py-2 rounded-lg text-[10px] font-bold hover:bg-red-50 transition-colors"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full py-20 px-6">
                    <MessageSquare className="text-slate-200 mb-4" size={32} />
                    <h3 className="font-bold text-slate-800 mb-2">
                      Bids & Messages
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select a listing to view active bids
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- MESSAGES TAB (Section 9) --- */}
          {activeTab === "messages" && (
            <div className="animate-in fade-in duration-500">
              <SellerMessages
                userId={session.user.id}
                onTabChange={setActiveTab}
              />
            </div>
          )}

          {/* --- TRANSACTIONS TAB --- */}
          {/* --- TRANSACTIONS TAB --- */}
          {activeTab === "transactions" && (
            <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
              <h3 className="text-sm font-bold text-slate-700 mb-4">
                Active Transactions
              </h3>

              <div className="grid grid-cols-12 gap-6">
                {/* 1. LEFT SIDEBAR SELECTION */}
                <div className="col-span-4 space-y-3 overflow-y-auto max-h-[600px] pr-2 no-scrollbar">
                  {transactions.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => setSelectedTxId(tx.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                        selectedTxId === tx.id
                          ? "border-[#2d7a7f] bg-blue-50/50 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-slate-800">
                          {tx.listing?.device_model}
                        </h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            tx.status === "completed"
                              ? "bg-green-50 text-green-600 border-green-200"
                              : tx.status === "cancelled"
                                ? "bg-red-50 text-red-600 border-red-200"
                                : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          }`}
                        >
                          {tx.status.charAt(0).toUpperCase() +
                            tx.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        Buyer: {tx.harvester?.full_name}
                      </p>
                      <p className="text-sm font-black text-[#2d7a7f]">
                        ₱{tx.amount?.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                        <MessageSquare size={12} />
                        <span>{tx.messages?.length || 0} messages</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* 2. RIGHT DETAILED VIEW */}
                <div className="col-span-8">
                  {transactions.find((t) => t.id === selectedTxId) ? (
                    (() => {
                      const tx = transactions.find(
                        (t) => t.id === selectedTxId,
                      );
                      const isCompleted = tx.status === "completed";

                      return (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                          {/* Header Section */}
                          <div className="bg-[#2d7a7f] p-6 text-white flex justify-between items-start">
                            <div>
                              <h2 className="text-xl font-bold">
                                {tx.listing?.device_model}
                              </h2>
                              <p className="text-xs opacity-80 uppercase tracking-wider mt-1">
                                ID: {tx.id.slice(0, 8)}
                              </p>
                            </div>
                            <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                              {isCompleted ? "Completed" : "Matched"}
                            </span>
                          </div>

                          {/* Horizontal Progress Tracker */}
                          <div className="p-10 border-b border-slate-50">
                            <div className="relative flex justify-between items-center max-w-lg mx-auto">
                              {/* Background Line */}
                              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2"></div>
                              {/* Active Line */}
                              <div
                                className={`absolute top-1/2 left-0 h-1 transition-all duration-700 -translate-y-1/2 ${
                                  isCompleted
                                    ? "bg-green-500 w-full"
                                    : "bg-blue-500 w-1/2"
                                }`}
                              ></div>

                              {/* Step 1 */}
                              <div className="relative z-10 flex flex-col items-center">
                                <div
                                  className={`bg-white p-1 rounded-full border-2 ${isCompleted ? "border-green-500 text-green-500" : "border-blue-500 text-blue-500"}`}
                                >
                                  <Check size={14} strokeWidth={3} />
                                </div>
                                <span className="absolute -bottom-7 text-[10px] font-bold text-slate-500">
                                  Matched
                                </span>
                              </div>

                              {/* Step 2 */}
                              <div className="relative z-10 flex flex-col items-center">
                                <div
                                  className={`bg-white p-1 rounded-full border-2 ${isCompleted ? "border-green-500 text-green-500" : tx.status !== "pending" ? "border-blue-500 text-blue-500" : "border-slate-200 text-slate-300"}`}
                                >
                                  {isCompleted ? (
                                    <Check size={14} strokeWidth={3} />
                                  ) : (
                                    <Clock size={14} />
                                  )}
                                </div>
                                <span className="absolute -bottom-7 text-[10px] font-bold text-slate-500">
                                  Meetup Scheduled
                                </span>
                              </div>

                              {/* Step 3 */}
                              <div className="relative z-10 flex flex-col items-center">
                                <div
                                  className={`bg-white p-1 rounded-full border-2 ${isCompleted ? "border-green-500 text-green-500" : "border-slate-200 text-slate-300"}`}
                                >
                                  <Check
                                    size={14}
                                    strokeWidth={3}
                                    className={
                                      isCompleted ? "opacity-100" : "opacity-0"
                                    }
                                  />
                                </div>
                                <span className="absolute -bottom-7 text-[10px] font-bold text-slate-500">
                                  Handover Complete
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Details Section */}
                          <div className="p-8">
                            <div className="grid grid-cols-2 gap-8 mb-8">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                  Buyer
                                </p>
                                <p className="text-sm font-bold text-slate-700">
                                  {tx.harvester?.full_name}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                  Amount
                                </p>
                                <p className="text-xl font-black text-[#2d7a7f]">
                                  ₱{tx.amount?.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {isCompleted ? (
                              <div className="space-y-4">
                                {/* Completed Status Banner */}
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-4 relative">
                                  <div className="bg-white p-2 rounded-full shadow-sm text-green-500 border border-green-100">
                                    <Check size={20} strokeWidth={3} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-green-800">
                                      Transaction Completed
                                    </p>
                                    <p className="text-xs text-green-600">
                                      Completed on{" "}
                                      {new Date(
                                        tx.updated_at,
                                      ).toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </p>
                                  </div>
                                  {/* Mock Avatar Bubble */}
                                </div>

                                {/* Rate Button */}
                                <button
                                  onClick={() => setShowRateModal(true)}
                                  className="w-full bg-[#FF4D2D] hover:bg-[#e64528] text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-200"
                                >
                                  <Star size={18} fill="currentColor" /> Rate
                                  Buyer
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <button className="w-full bg-[#2d7a7f] text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#246367] transition-colors">
                                  <Calendar size={18} /> Schedule Meetup
                                </button>
                                <button
                                  onClick={() => setShowCancelModal(true)}
                                  className="w-full bg-white text-red-500 border border-red-200 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                                >
                                  <XCircle size={18} /> Cancel Transaction
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-full flex items-center justify-center bg-white rounded-xl border-2 border-dashed border-slate-100 text-slate-400">
                      Select a transaction to view details
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Profile Modal Overlay */}
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
              {/* Modal Header - Gradient matching the mockup */}
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
                        className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          profileData?.verification_status === "approved"
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

              {/* Modal Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
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
                      val: listings.length,
                      icon: <Package size={16} />,
                      color: "text-blue-500",
                      bg: "bg-blue-50",
                    },
                    {
                      label: "Items Sold",
                      val: listings.filter(
                        (item) =>
                          item.status?.toLowerCase() === "meetup scheduled",
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
              </div>
            </div>
          </div>
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
          {profileData?.role === "harvester" && (
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
          )}
        </div>
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
                {profileData?.role === "seller" && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-2">
                      Upload Valid Government ID
                    </label>

                    <div
                      onClick={() => permitRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
                        verificationFiles.businessPermit
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
    className={`p-4 flex gap-4 hover:bg-slate-50 transition cursor-pointer relative group border-b border-slate-50 last:border-0 ${
      unread ? "bg-blue-50/10" : "bg-transparent"
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
          className={`text-[11px] font-black uppercase tracking-tight truncate pr-2 ${
            unread ? "text-slate-900" : "text-slate-500"
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
