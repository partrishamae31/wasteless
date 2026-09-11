import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import HarvesterAlerts from "./HarvesterAlerts";
import UrbanMineMap from "./UrbanMineMap";
import InventoryView from "./InventoryView";
import TransactionsView from "./TransactionsView";
import BarangayLeaderboard from "./BarangayLeaderboard"; // Ensure path is correct
import bannerBg from "./assets/banner.png";
import DonationTab from "./DonationTab";
import SellerProfileModal from "./SellerProfileModal";
import RepairShopMessages from "./RepairShopMessages";

import {
  Search,
  Bell,
  Map as MapIcon,
  Trophy,
  Package,
  MapPin,
  Clock,
  LogOut,
  MessageSquare,
  Box,
  User,
  Settings,
  Award,
  CheckCircle2,
  LayoutGrid,
  Send,
  XCircle,
  Gavel,
  MessageSquareText,
  ArrowLeftRight,
  Check,
  Calendar,
  CheckCircle,
  Shield,
  Camera,
  Mail,
  Phone,
  Star,
  Gift,
  Leaf,
  CalendarDays,
} from "lucide-react";

const HAZARDOUS_DIAGNOSIS_KEYWORDS = [
  "Dead/Degraded Battery",
  "Won\'t Power On",
  "Water Damage/ Liquid Exposure",
];

const isHazardousListing = (listing) => {
  if (listing?.condition?.toLowerCase() !== "defective") return false;

  const description = String(listing?.description || "").toLowerCase();
  return HAZARDOUS_DIAGNOSIS_KEYWORDS.some((issue) =>
    description.includes(issue.toLowerCase()),
  );
};

const HarvesterDashboard = ({ session, onLogout }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse");
  const [searchTerm, setSearchTerm] = useState("");
  const [conditionFilter, setConditionFilter] = useState("All Conditions");
  const [sortOption, setSortOption] = useState("Newest");
  const [selectedListing, setSelectedListing] = useState(null);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    activeAlerts: 0,
    pendingBids: 0,
    acquiredParts: 0,
    totalSpent: 0,
  });

  const [profileData, setProfileData] = useState({
    full_name: "Loading...",
    initials: "??",
    email: "",
    contact_number: "",
    role: "Harvester",
    joined_date: "",

    // Harvester metrics
    completed_pickups: 0,
    active_bids: 0,
    eco_points: 0,

    // Recovery Contribution
    recovered_devices: 0,
    co2_recovered_kg: 0,

    assigned_area: "",
    average_rating: 0,
    total_reviews: 0,
  });
  const [verificationStatus, setVerificationStatus] = useState("verified");
  const isVerified = verificationStatus === "verified";
  const [rejectionReason, setRejectionReason] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Unread message badge for the top-right message icon
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const [transactions, setTransactions] = useState([]);

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const handleCompleteHandover = async (transactionId) => {
    try {
      const updatedTime = new Date().toISOString();

      // Use { count: 'exact' } to verify if the database actually changed
      const { data, error, count } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          updated_at: updatedTime,
        })
        .eq("id", transactionId)
        .select(); // Re-select to confirm update[cite: 7]

      if (error) throw error;

      // If count is 0, the transactionId didn't match anything in the DB[cite: 7]
      if (!data || data.length === 0) {
        alert("Database match failed: No transaction found with that ID.");
        return;
      }

      // 2. Update the Sidebar List (Local State)
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId
            ? { ...tx, status: "completed", updated_at: updatedTime }
            : tx,
        ),
      );

      // 3. Update the Detailed View (Local State)
      // Combined your two calls into one clean update
      setSelectedTransaction((prev) => {
        if (prev?.id === transactionId) {
          return { ...prev, status: "completed", updated_at: updatedTime };
        }
        return prev;
      });

      // 4. Trigger the Feedback UI
      setShowRatingModal(true);
    } catch (err) {
      console.error("Update failed:", err.message);
      alert("Error updating status: " + err.message);
    }
  };

  useEffect(() => {
    if (!session?.user) return;

    const fetchHarvesterProfile = async () => {
      try {
        // PROFILE DATA
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            `
  full_name,
  contact_number,
  role,
  created_at,
  verification_status,
  average_rating,
  total_reviews,
  barangay
`,
          )
          .eq("id", session.user.id)
          .single();

        if (profileError) throw profileError;

        // ACTIVE BIDS COUNT
        const { count: bidsCount } = await supabase
          .from("bids")
          .select("*", { count: "exact", head: true })
          .eq("bidder_id", session.user.id)
          .eq("status", "pending");

        // COMPLETED TRANSACTIONS COUNT
        // COMPLETED TRANSACTIONS + CO₂ RECOVERY
        const { data: recoveryData, error: recoveryError } = await supabase
          .from("transactions")
          .select("carbon_saved")
          .eq("harvester_id", session.user.id)
          .eq("status", "completed");

        if (recoveryError) {
          console.error(
            "Error fetching recovery contribution:",
            recoveryError.message,
          );
        }

        const pickupsCount = recoveryData?.length || 0;

        const totalCo2Recovered =
          recoveryData?.reduce(
            (total, transaction) =>
              total + Number(transaction.carbon_saved || 0),
            0,
          ) || 0;

        const name = profile?.full_name || "Harvester User";

        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        setProfileData({
          full_name: name,
          initials,
          email: session.user.email || "",
          contact_number: profile?.contact_number || "",
          role: profile?.role || "Harvester",

          joined_date: profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
            : "Recent Partner",

          // STATS
          active_bids: bidsCount || 0,
          completed_pickups: pickupsCount || 0,

          // RECOVERY CONTRIBUTION
          recovered_devices: pickupsCount || 0,
          co2_recovered_kg: Number(totalCo2Recovered.toFixed(2)),

          // RATINGS
          average_rating: Number(profile?.average_rating || 0),
          total_reviews: profile?.total_reviews || 0,

          // LOCATION
          assigned_area: profile?.barangay || "Not assigned",

          eco_points: (pickupsCount || 0) * 150,
        });

        if (profile?.verification_status) {
          setVerificationStatus(profile.verification_status);
        }
      } catch (error) {
        console.error("Error fetching harvester profile:", error.message);
      }
    };

    fetchHarvesterProfile();
  }, [session]);

  const fetchTransactions = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
      *,
      listing:listing_id (
        device_model,
        asking_price
      ),
      seller:seller_id (
        full_name
      )
    `,
      )
      .eq("harvester_id", session.user.id) // Filter by current Harvester
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error.message);
      return;
    }

    if (data) {
      setTransactions(data);
      if (data.length > 0 && !selectedTransaction) {
        setSelectedTransaction(data[0]);
      }
    }
  };

  // Keep the top-right message badge synced with Supabase.
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUnreadMessageCount = async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", session.user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error fetching unread messages:", error.message);
        return;
      }

      setUnreadMessageCount(count || 0);
    };

    fetchUnreadMessageCount();

    const messagesChannel = supabase
      .channel("harvester-message-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${session.user.id}`,
        },
        () => {
          setUnreadMessageCount((prev) => prev + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${session.user.id}`,
        },
        () => {
          fetchUnreadMessageCount();
        },
      )
      .subscribe();

    return () => supabase.removeChannel(messagesChannel);
  }, [session?.user?.id]);

  // Open Messages from the top-right icon and clear the unread badge.
  const handleOpenMessages = async () => {
    setActiveTab("messages");

    if (!session?.user?.id) return;

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", session.user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking messages as read:", error.message);
      return;
    }

    setUnreadMessageCount(0);
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    const bidsChannel = supabase
      .channel("my-bids-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bids",
          filter: `bidder_id=eq.${session.user.id}`,
        },
        (payload) => {
          fetchMyBids();
          // If the bid is accepted, the system logic (often via a DB Trigger)
          // should create a transaction with status 'pending'
          if (payload.new.status === "accepted") {
            fetchTransactions();
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(bidsChannel);
  }, [session?.user?.id]);
  useEffect(() => {
    if (activeTab === "transactions" && session?.user?.id) {
      fetchTransactions();
    }
  }, [activeTab, session?.user?.id]);

  const handleReverify = () => {
    setActiveTab("settings");
  };
  const [myBids, setMyBids] = useState([]);
  const fetchMyBids = async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("bids")
      .select(
        `
      *,
      listings (
        device_model,
        asking_price,
        seller_id,
        profiles:seller_id (
  full_name,
  barangay
)
      )
    `,
      )
      .eq("bidder_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) setMyBids(data);
  };

  const fetchDashboardStats = async () => {
    try {
      if (!session?.user?.id) return;

      // ACTIVE ALERTS
      const { count: alertsCount, error: alertsError } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("harvester_id", session.user.id)
        .eq("is_active", true);

      if (alertsError) console.error(alertsError);

      // PENDING BIDS
      const { count: bidsCount, error: bidsError } = await supabase
        .from("bids")
        .select("*", { count: "exact", head: true })
        .eq("bidder_id", session.user.id)
        .in("status", ["pending", "accepted"]);

      if (bidsError) console.error(bidsError);

      // ACQUIRED PARTS
      const { count: acquiredCount, error: acquiredError } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("harvester_id", session.user.id)
        .eq("status", "completed");

      if (acquiredError) console.error(acquiredError);

      // TOTAL SPENT
      const { data: spentData, error: spentError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("harvester_id", session.user.id)
        .eq("status", "completed");

      if (spentError) console.error(spentError);

      const totalSpent =
        spentData?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0;

      setDashboardStats({
        activeAlerts: alertsCount || 0,
        pendingBids: bidsCount || 0,
        acquiredParts: acquiredCount || 0,
        totalSpent,
      });
    } catch (err) {
      console.error("Dashboard stats error:", err);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardStats();
    }
  }, [session?.user?.id]);

  // Call fetchMyBids when the activeTab changes to 'bids'
  useEffect(() => {
    if (activeTab === "bids") fetchMyBids();
  }, [activeTab]);
  useEffect(() => {
    if (!session?.user?.id) return;

    const notifChannel = supabase
      .channel("personal-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          // Add the REAL notification from the database to your state
          setNotifications((prev) => [payload.new, ...prev]);

          // Show browser alert if matching
          if (payload.new.type === "alert_match") {
            console.log("Match Found!", payload.new);
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(notifChannel);
  }, [session?.user?.id]);
  useEffect(() => {
    if (!session?.user?.id) return;

    // 1. Fetch initial notifications from DB
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        // Keep the real data from DB, but prepend mock items to match the UI design
        const mockupItems = [
          {
            id: "mock-1",
            type: "bid_accepted",
            title: "Bid Accepted",
            content: "Your bid of ₱3,200 on iPhone 11 has been accepted",
            created_at: new Date(Date.now() - 3600000 * 7).toISOString(), // 7h ago
            is_read: false,
          },
          {
            id: "mock-2",
            type: "message",
            title: "New Message",
            content: "Maria Santos replied to your inquiry",
            created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            is_read: false,
          },
          {
            id: "mock-3",
            type: "meetup",
            title: "Meetup Confirmed",
            content:
              "Meetup scheduled for March 13 at 2:00 PM - SM City Valenzuela",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            is_read: true,
          },
          {
            id: "mock-4",
            type: "payment",
            title: "Payment Reminder",
            content:
              "Don't forget to bring exact payment for tomorrow's meetup",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            is_read: true,
          },
        ];

        // Combine mockups with actual database notifications
        setNotifications([...mockupItems, ...data]);
      }
    };

    fetchNotifications();

    const listingsChannel = supabase
      .channel("realtime-listings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        (payload) => {
          console.log("Change received!", payload);

          // Repair Shops can see active Working listings and
          // active, non-hazardous Defective listings.
          if (
            payload.new?.status === "active" &&
            ["working", "defective"].includes(
              payload.new?.condition?.toLowerCase(),
            ) &&
            !isHazardousListing(payload.new)
          ) {
            // Re-fetch so seller profile data and bid information stay complete.
            fetchActiveListings();
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status); // Should say 'SUBSCRIBED'
      });

    return () => {
      supabase.removeChannel(listingsChannel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, verification_status, rejection_reason")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setVerificationStatus(data.verification_status);
        setRejectionReason(data.rejection_reason);

        const name = data.full_name || "User";

        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        // KEEP existing profileData values
        setProfileData((prev) => ({
          ...prev,
          full_name: name,
          initials,
        }));
      }
    };

    fetchProfile();
    fetchActiveListings();
  }, [session?.user?.id]);

  useEffect(() => {
    const checkVerification = async () => {
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("verification_status, rejection_reason")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setVerificationStatus(data.verification_status);
        setRejectionReason(data.rejection_reason);
      }
    };
    checkVerification();
  }, [session?.user?.id]);
  useEffect(() => {
    fetchActiveListings();
  }, []);

  const fetchActiveListings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("listings")
        .select(
          `
    *,
    bids(
      amount,
      bidder_id,
      status,
      created_at,
      profiles:bidder_id (
        full_name
      )
    ),
    profiles:seller_id (
      id,
      full_name,
      barangay,
      average_rating
    )
  `
        )
        .eq("status", "active")
        .in("condition", ["Working", "Defective"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Final routing rule:
      // - Working -> visible to Repair Shops
      // - Defective + safe/reusable -> visible to Repair Shops
      // - Defective + hazardous -> NOT sellable and must never appear here
      const sellableListings = (data || []).filter(
        (listing) => !isHazardousListing(listing),
      );

      const formattedData = sellableListings.map((listing) => {
        const bids = Array.isArray(listing.bids) ? listing.bids : [];

        const highestBid =
          bids.length > 0
            ? bids.reduce((max, bid) =>
              Number(bid.amount || 0) > Number(max.amount || 0) ? bid : max,
            )
            : null;

        /*
         * IMPORTANT:
         * Seller information comes directly from profiles.
         */
        const sellerName = listing.profiles?.full_name?.trim() || "Seller";

        return {
          ...listing,

          seller_name: sellerName,

          seller_barangay: listing.profiles?.barangay || "Valenzuela",

          seller_rating: Number(listing.profiles?.average_rating || 0),

          highest_bid: highestBid ? Number(highestBid.amount) : null,

          highest_bidder: highestBid?.profiles?.full_name || null,

          bid_count: bids.length,
        };
      });

      setListings(formattedData);
    } catch (err) {
      console.error("Error fetching listings:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (listingId, amount, message) => {
    if (!isVerified) {
      alert("Only verified harvesters can place bids.");
      return;
    }

    try {
      // 1. Fetch current status & listing info in one go to save a database call
      const { data: currentListing, error: statusError } = await supabase
        .from("listings")
        .select("status, condition, description, seller_id, device_model")
        .eq("id", listingId)
        .single();

      // Check if the listing is locked, unsupported, or hazardous.
      if (
        statusError ||
        currentListing.status !== "active" ||
        !["working", "defective"].includes(
          currentListing.condition?.toLowerCase(),
        ) ||
        isHazardousListing(currentListing)
      ) {
        alert(
          isHazardousListing(currentListing)
            ? "This item is hazardous and is not available for sale."
            : "This listing is no longer accepting bids (Closed or Expired).",
        );
        setSelectedListing(null);
        fetchActiveListings();
        return;
      }

      // 2. Insert the bid
      const { error: bidError } = await supabase.from("bids").insert([
        {
          listing_id: listingId,
          bidder_id: session.user.id,
          amount: amount,
        },
      ]);

      if (bidError) throw bidError;

      // 3. Insert notification for seller (using info from step 1)
      const { error: notifError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: currentListing.seller_id,
            type: "bid",
            title: "New Bid Received",
            description: `Someone placed ₱${amount.toLocaleString()} on your ${currentListing.device_model}`,
            is_read: false,
          },
        ]);

      if (notifError) throw notifError;

      // 4. Handle optional message
      if (message.trim()) {
        await supabase.from("messages").insert([
          {
            listing_id: listingId,
            sender_id: session.user.id,
            receiver_id: currentListing.seller_id, // Ensure receiver is set
            content: message,
          },
        ]);
      }

      alert("Bid placed successfully!");
      setSelectedListing(null);

      // Optional: refresh local state if you track bids locally
      // fetchActiveListings();
    } catch (err) {
      console.error("ERROR:", err);
      alert("Error placing bid: " + err.message);
    }
  };
  const handleSendMessageOnly = async (listingId, message) => {
    if (!message.trim()) return;

    try {
      // Fetch seller_id
      const { data: listing, error } = await supabase
        .from("listings")
        .select("seller_id")
        .eq("id", listingId)
        .single();

      if (error) throw error;

      // Insert message
      const { error: messageError } = await supabase.from("messages").insert([
        {
          listing_id: listingId,
          sender_id: session.user.id,
          receiver_id: listing.seller_id,
          content: message,
          is_read: false,
        },
      ]);

      if (messageError) throw messageError;

      alert("Message sent to seller!");
      setSelectedListing(null);
    } catch (err) {
      console.error("ERROR SENDING MESSAGE:", err);
      alert("Error sending message: " + err.message);
    }
  };
  const handleMarkAllRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };
  const filteredListings = listings
    .filter((item) => {
      const search = searchTerm.toLowerCase().trim();

      if (!search) return true;

      return (
        item.device_model?.toLowerCase().includes(search) ||
        item.device_type?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search) ||
        item.seller_name?.toLowerCase().includes(search)
      );
    })
    .filter((item) => {
      if (conditionFilter === "All Conditions") {
        return true;
      }

      return item.condition?.toLowerCase() === conditionFilter.toLowerCase();
    })
    .sort((a, b) => {
      if (sortOption === "Price Low") {
        return Number(a.asking_price || 0) - Number(b.asking_price || 0);
      }

      if (sortOption === "Price High") {
        return Number(b.asking_price || 0) - Number(a.asking_price || 0);
      }

      if (sortOption === "Highest Bid") {
        return Number(b.highest_bid || 0) - Number(a.highest_bid || 0);
      }

      // Newest
      return new Date(b.created_at) - new Date(a.created_at);
    });
  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-slate-900">
      {/* ===== TOP BANNER ===== */}
      <div
        className="relative overflow-hidden min-h-[380px] px-6 pt-6 pb-10 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(
          rgba(255, 255, 255, 0.09),
          rgba(255, 255, 255, 0.29)
        ), url(${bannerBg})`,
        }}
      >
        {/* Soft overlay blur */}
        <div className="absolute inset-0 backdrop-[1px]"></div>

        {/* CONTENT */}
        <div className="relative z-10">
          {/* --- TOP HEADER SECTION --- */}
          <div className="flex justify-end items-center mb-10 gap-3">
            {/* Message Icon Container */}
            <div className="relative">
              <button
                type="button"
                onClick={handleOpenMessages}
                aria-label="Messages"
                title="Messages"
                className={`relative bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-sm border border-white/50 cursor-pointer hover:bg-white transition-all ${activeTab === "messages"
                  ? "text-[#769c2d] ring-2 ring-[#769c2d]/20"
                  : "text-slate-600"
                  }`}
              >
                <MessageSquare size={20} />
              </button>

              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white">
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              )}
            </div>

            {/* Notification Bell Container */}
            <div className="relative">
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-sm border border-white/50 cursor-pointer hover:bg-white transition-all text-slate-600"
              >
                <Bell size={20} />
              </div>

              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">
                  {notifications.filter((n) => !n.is_read).length}
                </span>
              )}

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-tight">
                      Notifications
                    </h3>

                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-[#769c2d] hover:text-[#5d7a24]"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => {
                        let icon = <Package size={14} />;
                        let iconBg = "bg-lime-100 text-[#769c2d]";

                        if (n.type === "bid_accepted" || n.type === "payment") {
                          icon = <CheckCircle size={14} />;
                          iconBg = "bg-emerald-100 text-emerald-600";
                        } else if (n.type === "message") {
                          icon = <MessageSquare size={14} />;
                          iconBg = "bg-blue-100 text-blue-600";
                        } else if (n.type === "meetup") {
                          icon = <Calendar size={14} />;
                          iconBg = "bg-purple-100 text-purple-600";
                        }

                        return (
                          <div
                            key={n.id}
                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.is_read ? "bg-lime-50/30" : ""
                              }`}
                          >
                            <div className="flex gap-3">
                              <div
                                className={`w-8 h-8 ${iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}
                              >
                                {icon}
                              </div>

                              <div className="flex-1">
                                <p className="text-[11px] font-black text-slate-800">
                                  {n.title}
                                </p>

                                <p className="text-[10px] text-slate-500 leading-tight mt-1">
                                  {n.content}
                                </p>

                                <p className="text-[8px] text-slate-300 font-bold mt-2 uppercase tracking-widest">
                                  {new Date(n.created_at).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>

                              {!n.is_read && (
                                <div className="w-1.5 h-1.5 bg-[#769c2d] rounded-full mt-1"></div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-10 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                        No new alerts
                      </div>
                    )}
                  </div>

                  <button className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors bg-slate-50/50 border-t border-slate-50">
                    View All Notifications
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <div
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-1 pr-4 rounded-full shadow-sm border border-white/50 cursor-pointer hover:border-slate-300 transition-all"
              >
                <div className="text-right hidden sm:block pl-3">
                  <p className="font-bold text-slate-800 text-[11px] leading-none mb-1">
                    {profileData.full_name}
                  </p>

                  {verificationStatus === "verified" ? (
                    <p className="text-[#769c2d] text-[9px] font-black flex items-center justify-end gap-1 uppercase tracking-tighter">
                      <CheckCircle2 size={10} /> Verified
                    </p>
                  ) : verificationStatus === "rejected" ? (
                    <p className="text-red-500 text-[9px] font-black flex items-center justify-end gap-1 uppercase tracking-tighter">
                      <XCircle size={10} /> Rejected
                    </p>
                  ) : (
                    <p className="text-orange-400 text-[9px] font-black flex items-center justify-end gap-1 uppercase tracking-tighter">
                      <Clock size={10} /> Pending
                    </p>
                  )}
                </div>

                <div className="w-9 h-9 bg-[#4a7c59] rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-sm border border-white/20">
                  {profileData.initials}
                </div>
              </div>

              {showProfileDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsProfileOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-50 z-20 overflow-hidden">
                    <div className="bg-gradient-to-br from-[#4a7c59] to-[#769c2d] p-5 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-sm">
                          {profileData.initials}
                        </div>
                        <div>
                          <p className="font-bold text-xs">
                            {profileData.full_name}
                          </p>
                          <p className="text-[9px] text-white/80">
                            {session?.user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors text-xs font-bold"
                      >
                        <span className="text-slate-400">
                          <User size={15} />
                        </span>
                        View Profile
                      </button>
                      <MenuLink
                        icon={<Settings size={15} />}
                        label="Settings"
                      />
                      {/* Added Achievements to match mockup */}
                      <MenuLink
                        icon={<Award size={15} />}
                        label="Achievements"
                      />

                      {/* Logout section with border-t and specific styling from image_085a5b.jpg */}
                      <div className="mt-2 pt-2 border-t border-slate-50">
                        <button
                          onClick={onLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors text-xs font-black uppercase tracking-widest"
                        >
                          <LogOut size={15} /> Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {selectedSellerId && (
            <SellerProfileModal
              sellerId={selectedSellerId}
              onClose={() => setSelectedSellerId(null)}
              onMessage={(seller) => {
                setSelectedSellerId(null);

                // Optional:
                // switch to your Messages tab here
                // if you want "Message Seller" to open
                // the messaging interface.
                console.log("Message seller:", seller.id);
              }}
            />
          )}
          {showProfileModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                {/* HEADER */}
                <div className="bg-gradient-to-br from-[#769c2d] to-lime-700 p-6 text-white relative">
                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      setIsEditingProfile(false);
                    }}
                    className="absolute top-4 right-4 hover:bg-white/20 p-1 rounded-full transition"
                  >
                    <XCircle size={20} />
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                        {profileData?.initials || "H"}
                      </div>

                      <button className="absolute bottom-0 right-0 bg-white text-gray-700 p-1 rounded-full shadow-md hover:bg-gray-100 transition">
                        <Camera size={12} />
                      </button>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold">
                        {profileData?.full_name || "Harvester"}
                      </h2>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield size={10} />
                          {verificationStatus === "verified"
                            ? "Verified Harvester"
                            : "Pending Verification"}
                        </span>

                        <span className="text-[10px] opacity-80">
                          Active since {profileData?.joined_date || "2026"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mt-2 text-yellow-300">
                        {/* <Award size={12} />
                    <span className="text-xs font-bold text-white">
                      Eco Partner
                    </span> */}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                  {/* EDIT BUTTON */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="flex items-center gap-2 bg-[#769c2d] text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-lime-700 transition shadow-sm"
                    >
                      <Settings size={14} />
                      {isEditingProfile ? "Cancel" : "Edit Profile"}
                    </button>
                  </div>

                  {/* STATS */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        label: "Active Bids",
                        val: profileData?.active_bids || 0,
                        icon: <Gavel size={16} />,
                        color: "text-blue-500",
                        bg: "bg-blue-50",
                      },
                      {
                        label: "Recovered",
                        val: profileData?.completed_pickups || 0,
                        icon: <Package size={16} />,
                        color: "text-green-500",
                        bg: "bg-green-50",
                      },
                      {
                        label: "Rating",
                        val: Number(profileData?.average_rating || 0).toFixed(
                          1,
                        ),
                        icon: <Star size={16} />,
                        color: "text-yellow-500",
                        bg: "bg-yellow-50",
                      },
                      {
                        label: "Reviews",
                        val: profileData?.total_reviews || 0,
                        icon: <MessageSquareText size={16} />,
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

                  {/* CO2 RECOVERY CONTRIBUTION */}
                  <div className="mt-5 w-full">
                    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-sky-50 p-5 shadow-sm">
                      {/* HEADER */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <Leaf size={21} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-black uppercase text-[#145374]">
                              CO₂ Recovery Contribution
                            </h3>

                            <p className="mt-1 text-[10px] text-[#3b91ad]">
                              From harvesting & processing e-waste
                            </p>
                          </div>
                        </div>

                        {/* TOTAL CO2 */}
                        <div className="shrink-0 text-right">
                          <div className="text-2xl font-black text-[#145374]">
                            {Number(profileData?.co2_recovered_kg || 0).toFixed(
                              2,
                            )}
                            <span className="ml-1 text-sm">kg</span>
                          </div>

                          <p className="text-[9px] text-[#3b91ad]">
                            CO₂e recovered
                          </p>
                        </div>
                      </div>

                      {/* DEVICE COUNT */}
                      <div className="mt-4 flex items-center gap-3 border-t border-emerald-200 pt-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                          <Package size={17} />
                        </div>

                        <div>
                          <span className="text-sm font-black text-[#145374]">
                            {profileData?.recovered_devices || 0} devices
                          </span>

                          <span className="ml-2 text-[10px] text-[#3b91ad]">
                            recovered & processed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                    <Award
                      className="absolute right-4 top-4 opacity-10"
                      size={60}
                    />

                    <div className="relative z-10">
                      <h3 className="font-bold text-lg">
                        Community Reputation
                      </h3>

                      <p className="text-[11px] opacity-70 mb-4">
                        Seller feedback and completed recovery performance
                      </p>

                      <div className="flex items-center gap-3 flex-wrap">
                        {/* VERIFIED */}
                        {verificationStatus === "verified" && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            VERIFIED
                          </span>
                        )}

                        {/* RATING */}
                        <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <Star size={10} />
                          {profileData?.average_rating
                            ? Number(profileData.average_rating).toFixed(1)
                            : "0.0"}{" "}
                          Rating
                        </span>

                        {/* REVIEW COUNT */}
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <MessageSquareText size={10} />
                          {profileData?.total_reviews || 0} Reviews
                        </span>

                        {/* TRUST LEVEL */}
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] font-bold">
                          {profileData?.total_reviews >= 10
                            ? "TOP HARVESTER"
                            : profileData?.total_reviews >= 5
                              ? "TRUSTED PARTNER"
                              : "NEW MEMBER"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PERSONAL INFO */}
                  {/* PERSONAL INFO */}
                  <div className="space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-gray-800 text-sm">
                        Personal Information
                      </h3>

                      {isEditingProfile && (
                        <span className="text-[9px] font-bold uppercase text-[#769c2d] bg-lime-50 px-2 py-1 rounded-full">
                          Editing
                        </span>
                      )}
                    </div>

                    <div className="grid gap-5">
                      {/* FULL NAME */}
                      <div className="flex items-start gap-3">
                        <User
                          size={14}
                          className="text-slate-400 mt-1 shrink-0"
                        />

                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Full Name
                          </p>

                          {isEditingProfile ? (
                            <input
                              type="text"
                              value={profileData?.full_name || ""}
                              onChange={(e) =>
                                setProfileData((prev) => ({
                                  ...prev,
                                  full_name: e.target.value,
                                }))
                              }
                              placeholder="Enter your full name"
                              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:border-[#769c2d] focus:ring-2 focus:ring-lime-100"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-slate-700">
                              {profileData?.full_name || "No name provided"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* EMAIL */}
                      <div className="flex items-start gap-3">
                        <Mail
                          size={14}
                          className="text-slate-400 mt-1 shrink-0"
                        />

                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Email Address
                          </p>

                          {isEditingProfile ? (
                            <input
                              type="email"
                              value={profileData?.email || ""}
                              onChange={(e) =>
                                setProfileData((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                              placeholder="Enter your email"
                              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:border-[#769c2d] focus:ring-2 focus:ring-lime-100"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-slate-700">
                              {profileData?.email || "No email provided"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* PHONE */}
                      <div className="flex items-start gap-3">
                        <Phone
                          size={14}
                          className="text-slate-400 mt-1 shrink-0"
                        />

                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Phone Number
                          </p>

                          {isEditingProfile ? (
                            <input
                              type="tel"
                              value={profileData?.contact_number || ""}
                              onChange={(e) =>
                                setProfileData((prev) => ({
                                  ...prev,
                                  contact_number: e.target.value,
                                }))
                              }
                              placeholder="Enter your phone number"
                              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:border-[#769c2d] focus:ring-2 focus:ring-lime-100"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-slate-700">
                              {profileData?.contact_number || "No phone number"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* BARANGAY / ASSIGNED AREA */}
                      <div className="flex items-start gap-3">
                        <MapPin
                          size={14}
                          className="text-slate-400 mt-1 shrink-0"
                        />

                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Assigned Area / Barangay
                          </p>

                          {isEditingProfile ? (
                            <input
                              type="text"
                              value={profileData?.assigned_area || ""}
                              onChange={(e) =>
                                setProfileData((prev) => ({
                                  ...prev,
                                  assigned_area: e.target.value,
                                }))
                              }
                              placeholder="Enter your barangay"
                              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:border-[#769c2d] focus:ring-2 focus:ring-lime-100"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-slate-700">
                              {profileData?.assigned_area || "Not assigned"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ROLE - DISPLAY ONLY */}
                      <div className="flex items-start gap-3">
                        <Shield
                          size={14}
                          className="text-slate-400 mt-1 shrink-0"
                        />

                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Account Role
                          </p>

                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 bg-lime-50 text-[#769c2d] px-3 py-1.5 rounded-full text-xs font-bold">
                              <Shield size={11} />
                              {profileData?.role || "Harvester"}
                            </span>

                            <p className="text-[9px] text-slate-400 mt-1">
                              Account role cannot be changed by the user.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* JOINED DATE - DISPLAY ONLY */}
                      <div className="flex items-start gap-3">
                        <CalendarDays
                          size={14}
                          className="text-slate-400 mt-1 shrink-0"
                        />

                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Active Since
                          </p>

                          <p className="text-sm font-semibold text-slate-700 mt-1">
                            {profileData?.joined_date || "2026"}
                          </p>

                          <p className="text-[9px] text-slate-400 mt-1">
                            Automatically based on your account creation date.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                {isEditingProfile && (
                  <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 py-3 text-xs font-black text-slate-400"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          if (!session?.user?.id) {
                            alert("User session not found.");
                            return;
                          }

                          console.log("Saving profile:", {
                            id: session.user.id,
                            full_name: profileData.full_name,
                            email: profileData.email,
                            contact_number: profileData.contact_number,
                            barangay: profileData.assigned_area,
                          });

                          const { data, error } = await supabase
                            .from("profiles")
                            .update({
                              full_name: profileData.full_name?.trim(),
                              email: profileData.email?.trim(),
                              contact_number: profileData.contact_number?.trim() || null,
                              barangay:
                                profileData.assigned_area?.trim() || null,
                            })
                            .eq("id", session.user.id)
                            .select()
                            .single();

                          if (error) {
                            console.error("PROFILE UPDATE ERROR:", error);
                            alert(`Failed to update profile: ${error.message}`);
                            return;
                          }

                          console.log("PROFILE UPDATED:", data);

                          // Update the displayed profile immediately
                          setProfileData((prev) => ({
                            ...prev,
                            full_name: data.full_name,
                            email: data.email,
                            contact_number: data.contact_number || "",
                            assigned_area: data.barangay || "",
                          }));

                          setIsEditingProfile(false);

                          alert("Profile updated successfully!");
                        } catch (err) {
                          console.error(
                            "Unexpected profile update error:",
                            err,
                          );
                          alert(`Error: ${err.message}`);
                        }
                      }}
                      className="flex-1 bg-[#769c2d] text-white py-3 rounded-2xl font-black text-xs uppercase"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {verificationStatus === "rejected" && (
            <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem] flex items-center gap-6 animate-in slide-in-from-top duration-500">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <XCircle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-red-800 uppercase tracking-tight">
                  Account Verification Rejected
                </h3>
                <p className="text-xs text-red-600 font-medium mt-1">
                  Reason:{" "}
                  <span className="font-bold">
                    "{rejectionReason || "No specific reason provided."}"
                  </span>
                </p>
                <p className="text-[10px] text-red-400 mt-2">
                  Please update your documents in Settings and re-submit for
                  approval.
                </p>
              </div>
              <button className="px-6 py-2 bg-red-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-red-700 transition-colors">
                Update Profile
              </button>
            </div>
          )}

          {/* --- STATS GRID --- */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Active Alerts"
              value={dashboardStats.activeAlerts.toString()}
            />

            <StatCard
              label="Pending Bids"
              value={dashboardStats.pendingBids.toString()}
            />

            <StatCard
              label="Acquired Parts"
              value={dashboardStats.acquiredParts.toString()}
            />

            <StatCard
              label="Total Spent"
              value={dashboardStats.totalSpent}
              isPrice
            />
          </div>

          {/* --- NAVIGATION --- */}
          <div className="bg-white/90 backdrop-blur-md rounded-[2rem] border border-white/50 shadow-lg px-9 py-6 flex flex-wrap gap-12 items-center">
            <NavBtn
              active={activeTab === "browse"}
              onClick={() => setActiveTab("browse")}
              icon={<Search size={16} />}
              label="Browse Listings"
            />

            <NavBtn
              active={activeTab === "bids"}
              onClick={() => setActiveTab("bids")}
              icon={<Gavel size={16} />}
              label="My Bids"
            />

            <NavBtn
              active={activeTab === "transactions"}
              onClick={() => setActiveTab("transactions")}
              icon={<Gavel size={16} />}
              label="Transactions"
            />

            <NavBtn
              active={activeTab === "map"}
              onClick={() => {
                if (!isVerified) {
                  alert(
                    "Access Denied: Urban Mine Map is restricted to Verified Professionals.",
                  );
                } else {
                  setActiveTab("map");
                }
              }}
              icon={
                <MapIcon size={16} className={!isVerified ? "opacity-50" : ""} />
              }
              label={isVerified ? "Urban Mine Map" : "Map (Locked)"}
              disabled={!isVerified}
            />

            <NavBtn
              active={activeTab === "leaderboard"}
              onClick={() => setActiveTab("leaderboard")}
              icon={<Trophy size={16} />}
              label="E-waste Tracker"
            />

            <NavBtn
              active={activeTab === "alerts"}
              onClick={() => setActiveTab("alerts")}
              icon={<Bell size={16} />}
              label="My Alerts"
            />

            <NavBtn
              active={activeTab === "donation"}
              onClick={() => setActiveTab("donation")}
              icon={<Gift size={16} />}
              label="Donation"
            />
          </div>
        </div>
      </div>

      <div className="bg-white  border border-slate-100 shadow-sm p-4 mb-8">
        {/* =========================================================
    SEARCH + FILTER
========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
          <div className="flex flex-col md:flex-row gap-3">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by device name or model..."
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#769c2d]/20 focus:border-[#769c2d]"
              />

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  ×
                </button>
              )}
            </div>

            {/* CONDITION */}
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="md:w-40 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#769c2d]/20"
            >
              <option>All Conditions</option>
              <option>Working</option>
              <option>Defective</option>
              <option>Parts Only</option>
            </select>

            {/* SORT */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="md:w-36 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#769c2d]/20"
            >
              <option value="Newest">Newest</option>
              <option value="Price Low">Price: Low</option>
              <option value="Price High">Price: High</option>
              <option value="Highest Bid">Highest Bid</option>
            </select>
          </div>
        </div>

        {/* RESULT COUNT */}
        <div className="flex justify-between items-center mb-4 px-1">
          <p className="text-[10px] font-bold text-slate-400">
            {filteredListings.length}{" "}
            {filteredListings.length === 1 ? "listing" : "listings"} found
          </p>

          <p className="text-[9px] font-bold text-slate-400">
            Sorted by: <span className="text-slate-600">{sortOption}</span>
          </p>
        </div>

        {/* <p className="text-xs font-bold text-slate-400 mb-6 flex justify-between">
          <span className=" rounded-full px-3 py-1 ">
            {listings.length} listings found
          </span>
          <span>Sorted by: Nearest</span>
        </p> */}

        {/* --- TAB CONTENT --- */}
        {activeTab === "browse" ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-20">
            {loading ? (
              <div className="xl:col-span-2 py-20 text-center">
                <div className="w-8 h-8 border-2 border-[#769c2d] border-t-transparent rounded-full animate-spin mx-auto" />

                <p className="text-xs font-bold text-slate-400 mt-3">
                  Loading listings...
                </p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 py-20 text-center">
                <Box size={36} className="mx-auto text-slate-200" />

                <p className="text-sm font-black text-slate-500 mt-4">
                  No listings found
                </p>

                <p className="text-[10px] text-slate-400 mt-1">
                  Try another search or condition.
                </p>
              </div>
            ) : (
              filteredListings.map((item) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  onBid={() => setSelectedListing(item)}
                  onSellerClick={() =>
                    setSelectedSellerId(item.seller_id || item.profiles?.id)
                  }
                  isVerified={isVerified}
                />
              ))
            )}
          </div>
        ) : activeTab === "leaderboard" ? (
          <BarangayLeaderboard />
        ) : activeTab === "bids" ? (
          <MyBidsView bids={myBids} />
        ) : activeTab === "transactions" ? (
          <TransactionsView
            transactions={transactions}
            selectedTransaction={selectedTransaction}
            onSelect={setSelectedTransaction}
            handleCompleteHandover={handleCompleteHandover}
            session={session} // Add this prop
          />
        ) : activeTab === "inventory" ? ( // ADD THIS
          <InventoryView userId={session?.user?.id} />
        ) : activeTab === "map" ? ( // ADD THIS BLOCK
          <UrbanMineMap isVerified={isVerified} />
        ) : activeTab === "messages" ? (
          <MessagesView session={session} />
        ) : activeTab === "alerts" ? (
          <div className="space-y-8">
            {/* This allows you to both manage alert settings AND see your matches */}
            <HarvesterAlerts session={session} isVerified={isVerified} />

            {/* ADD THIS LINE TO RENDER THE NOTIFICATIONS LIST */}
            <AlertsView
              notifications={notifications.filter(
                (n) => n.type === "alert_match",
              )}
            />
          </div>
        ) : activeTab === "donation" ? (
          <DonationTab
            profileData={profileData}
            onOpenDonationModal={() => setDonationModalOpen(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <LayoutGrid size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-sm uppercase tracking-widest">
              Section Coming Soon
            </p>
          </div>
        )}

        {selectedListing && (
          <PlaceBidModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            // Pass user id for the Ask Question functionality
            session={session}
            onSubmit={handlePlaceBid}
            // Pass the new function for sending just a message
            onSendMessage={handleSendMessageOnly}
          />
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
const MyBidsView = ({ bids }) => {
  const stats = {
    pending: bids.filter((b) => b.status === "pending").length,
    accepted: bids.filter((b) => b.status === "accepted").length,
    total: bids.length,
  };
  if (bids.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-100 rounded-[40px] p-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-lime-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
          <Gavel size={32} className="text-[#769c2d] opacity-50" />
        </div>
        <h3 className="text-lg font-black text-slate-800">
          No Bids Placed Yet
        </h3>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-[240px] mx-auto leading-relaxed">
          Browse the marketplace and start bidding on e-waste parts to see them
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mini Stats Bar matching image_f1901c.png */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          Track Your Bids
        </h2>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">
          Manage your active offers and pending approvals
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl">
              <Clock size={20} />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Pending Bids
            </span>
          </div>
          <span className="text-2xl font-black text-slate-700">
            {stats.pending}
          </span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Accepted Bids
            </span>
          </div>
          <span className="text-2xl font-black text-slate-700">
            {stats.accepted}
          </span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
              <ArrowLeftRight size={20} />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Total Bids
            </span>
          </div>
          <span className="text-2xl font-black text-slate-700">
            {stats.total}
          </span>
        </div>
      </div>

      {/* Bids List */}
      <div className="space-y-6">
        {bids.map((bid) => (
          <div
            key={bid.id}
            className={`group bg-white rounded-[2.5rem] border-2 p-8 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 ${bid.status === "accepted"
              ? "border-emerald-100"
              : bid.status === "countered"
                ? "border-blue-100"
                : "border-orange-50"
              }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-black text-xl text-slate-800">
                    {bid.listings?.device_model}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${bid.status === "accepted"
                      ? "bg-emerald-100 text-emerald-600"
                      : bid.status === "countered"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-orange-100 text-orange-600"
                      }`}
                  >
                    {bid.status || "Pending"}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  Seller: {bid.listings?.profiles?.full_name} • Barangay{" "}
                  {bid.listings?.profiles?.barangay || "Unknown"}
                </p>
              </div>
              <div
                className={
                  bid.status === "accepted"
                    ? "text-emerald-500"
                    : "text-orange-400"
                }
              >
                {bid.status === "accepted" ? (
                  <CheckCircle2 size={28} />
                ) : (
                  <Clock size={28} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-[2rem] mb-6 border border-slate-100/50">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
                  Your Bid
                </p>
                <p className="text-2xl font-black text-[#769c2d]">
                  ₱{bid.amount.toLocaleString()}
                </p>
              </div>
              <div className="border-l border-slate-100 pl-6">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
                  Asking Price
                </p>
                <p className="text-2xl font-black text-slate-400">
                  ₱{bid.listings?.asking_price?.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Seller Message/Note box from image_f1901c.png */}
            {bid.message && (
              <div className="mb-6 p-4 bg-white border border-slate-100 rounded-2xl flex items-start gap-3">
                <MessageSquare size={14} className="text-slate-300 mt-1" />
                <p className="text-xs text-slate-500 font-medium">
                  {bid.message}
                </p>
              </div>
            )}

            {/* Counter Offer Logic */}
            {bid.status === "countered" && (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-[1.5rem] mb-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">
                    Seller's Counter Offer
                  </p>
                  <p className="text-xl font-black text-blue-700">
                    ₱{bid.counter_amount?.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="px-8 py-3 bg-[#769c2d] text-white text-[10px] font-black rounded-2xl uppercase tracking-widest hover:scale-105 transition-transform">
                    Accept
                  </button>
                  <button className="px-8 py-3 bg-white border border-blue-100 text-blue-400 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-blue-50 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                <Calendar size={12} />
                Submitted {new Date(bid.created_at).toLocaleDateString()}
              </div>

              {bid.status === "accepted" ? (
                <button className="px-6 py-2.5 bg-[#769c2d] text-white text-[9px] font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-lime-100 flex items-center gap-2 hover:scale-105 transition-transform">
                  <MessageSquare size={12} /> Contact Seller
                </button>
              ) : (
                <button className="px-6 py-2.5 bg-white border border-slate-100 text-slate-400 text-[9px] font-black rounded-2xl uppercase tracking-widest hover:bg-slate-50 transition-colors">
                  View Listing
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AlertsView = ({ notifications }) => {
  return (
    <div className="space-y-4">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`p-6 rounded-[2rem] border transition-all flex items-center gap-6 ${!n.is_read
            ? n.type === "alert_match"
              ? "bg-amber-50/50 border-amber-100" // Distinct color for matches
              : "bg-lime-50/50 border-lime-100"
            : "bg-slate-50/30 border-slate-50"
            }`}
        >
          {/* Dynamic Icon based on type */}
          <div
            className={`w-8 h-8 rounded-2xl flex items-center justify-center ${n.type === "alert_match"
              ? "bg-amber-100 text-amber-600"
              : "bg-lime-100 text-[#769c2d]"
              }`}
          >
            {n.type === "alert_match" ? (
              <Search size={14} />
            ) : (
              <Package size={14} />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 text-sm">{n.title}</h4>
              {n.type === "alert_match" && (
                <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">
                  Match
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {n.description ||
                n.content ||
                "New e-waste listing matches your criteria."}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-300 uppercase">
              {new Date(n.created_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- MESSAGES VIEW COMPONENT ---

const MessagesView = ({ session }) => {
  const userId = session?.user?.id;

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Load every message where this repair shop is either sender OR receiver.
  // We intentionally use two simple queries instead of a PostgREST OR expression.
  const loadConversations = async () => {
    if (!userId) return;

    setLoading(true);
    setLoadError("");

    try {
      const [receivedResult, sentResult, appointmentResult] = await Promise.all([
        supabase
          .from("messages")
          .select("id,sender_id,receiver_id,listing_id,content,created_at,is_read")
          .eq("receiver_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("messages")
          .select("id,sender_id,receiver_id,listing_id,content,created_at,is_read")
          .eq("sender_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("repair_appointments")
          .select(
            "id,harvester_id,repair_shop_id,device_model,category,issue_description,preferred_date,preferred_time,notes,status,created_at,updated_at"
          )
          .eq("repair_shop_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (receivedResult.error) throw receivedResult.error;
      if (sentResult.error) throw sentResult.error;
      if (appointmentResult.error) throw appointmentResult.error;

      const msgs = [...(receivedResult.data || []), ...(sentResult.data || [])];
      const apps = appointmentResult.data || [];

      // Remove duplicates in case a message ever appears in both result sets.
      const uniqueMessages = Array.from(
        new Map(msgs.map((message) => [message.id, message])).values()
      );

      const otherIds = new Set();

      uniqueMessages.forEach((message) => {
        const otherId =
          message.sender_id === userId
            ? message.receiver_id
            : message.sender_id;

        if (otherId) otherIds.add(otherId);
      });

      apps.forEach((appointment) => {
        if (appointment.harvester_id) {
          otherIds.add(appointment.harvester_id);
        }
      });

      let profileMap = {};

      if (otherIds.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id,full_name,business_name,role,average_rating,total_reviews")
          .in("id", [...otherIds]);

        if (profileError) {
          console.error("REPAIR SHOP PROFILE ERROR:", profileError);
        } else {
          profileMap = Object.fromEntries(
            (profiles || []).map((profile) => [profile.id, profile])
          );
        }
      }

      const conversationMap = new Map();

      const addConversation = (
        otherId,
        lastMessage,
        lastAt,
        hasAppointment = false
      ) => {
        if (!otherId) return;

        const existing = conversationMap.get(otherId);

        if (!existing) {
          conversationMap.set(otherId, {
            id: `harvester-${otherId}`,
            other_party_id: otherId,
            profile: profileMap[otherId],
            last_message: lastMessage,
            last_at: lastAt,
            has_appointment: hasAppointment,
          });
          return;
        }

        if (hasAppointment) {
          existing.has_appointment = true;
        }

        if (
          lastAt &&
          (!existing.last_at ||
            new Date(lastAt).getTime() > new Date(existing.last_at).getTime())
        ) {
          existing.last_message = lastMessage;
          existing.last_at = lastAt;
        }
      };

      uniqueMessages.forEach((message) => {
        const otherId =
          message.sender_id === userId
            ? message.receiver_id
            : message.sender_id;

        addConversation(
          otherId,
          message.content || "Message",
          message.created_at,
          false
        );
      });

      apps.forEach((appointment) => {
        addConversation(
          appointment.harvester_id,
          "Repair appointment request",
          appointment.created_at,
          true
        );
      });

      setConversations(
        [...conversationMap.values()].sort(
          (a, b) =>
            new Date(b.last_at || 0).getTime() -
            new Date(a.last_at || 0).getTime()
        )
      );
    } catch (error) {
      console.error("REPAIR SHOP MESSAGE LOAD ERROR:", error);
      setLoadError(error?.message || "Unable to load messages.");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [userId]);

  // Load the selected Harvester's messages and repair appointments.
  useEffect(() => {
    if (!selectedChat || !userId) return;

    const otherId = selectedChat.other_party_id;
    let alive = true;

    const loadChat = async () => {
      setLoadError("");

      try {
        const [receivedResult, sentResult, appointmentResult] =
          await Promise.all([
            supabase
              .from("messages")
              .select("*")
              .eq("receiver_id", userId)
              .eq("sender_id", otherId)
              .order("created_at", { ascending: true }),

            supabase
              .from("messages")
              .select("*")
              .eq("receiver_id", otherId)
              .eq("sender_id", userId)
              .order("created_at", { ascending: true }),

            supabase
              .from("repair_appointments")
              .select(
                "id,harvester_id,repair_shop_id,device_model,category,issue_description,preferred_date,preferred_time,notes,status,created_at,updated_at"
              )
              .eq("harvester_id", otherId)
              .eq("repair_shop_id", userId)
              .order("created_at", { ascending: true }),
          ]);

        if (receivedResult.error) throw receivedResult.error;
        if (sentResult.error) throw sentResult.error;
        if (appointmentResult.error) throw appointmentResult.error;

        const chatMessages = [
          ...(receivedResult.data || []),
          ...(sentResult.data || []),
        ];

        const uniqueChatMessages = Array.from(
          new Map(chatMessages.map((message) => [message.id, message])).values()
        ).sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
        );

        if (alive) {
          setMessages(uniqueChatMessages);
          setAppointments(appointmentResult.data || []);
        }
      } catch (error) {
        console.error("REPAIR SHOP CHAT LOAD ERROR:", error);
        if (alive) {
          setMessages([]);
          setAppointments([]);
          setLoadError(error?.message || "Unable to load this conversation.");
        }
      }
    };

    loadChat();

    const channel = supabase
      .channel(`repair-shop-chat-${userId}-${otherId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new;

          const belongsToChat =
            (message.sender_id === userId &&
              message.receiver_id === otherId) ||
            (message.sender_id === otherId &&
              message.receiver_id === userId);

          if (!belongsToChat) return;

          setMessages((previous) =>
            previous.some((item) => item.id === message.id)
              ? previous
              : [...previous, message]
          );

          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "repair_appointments" },
        (payload) => {
          const appointment = payload.new;

          if (
            appointment.harvester_id !== otherId ||
            appointment.repair_shop_id !== userId
          ) {
            return;
          }

          setAppointments((previous) =>
            previous.some((item) => item.id === appointment.id)
              ? previous
              : [...previous, appointment]
          );

          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "repair_appointments" },
        (payload) => {
          const appointment = payload.new;

          if (
            appointment.harvester_id !== otherId ||
            appointment.repair_shop_id !== userId
          ) {
            return;
          }

          setAppointments((previous) =>
            previous.map((item) =>
              item.id === appointment.id ? appointment : item
            )
          );

          loadConversations();
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [selectedChat, userId]);

  const updateAppointment = async (id, status) => {
  if (!userId) return;

  try {
    // First, find the appointment
    const { data: appointment, error: appointmentFetchError } =
      await supabase
        .from("repair_appointments")
        .select("*")
        .eq("id", id)
        .eq("repair_shop_id", userId)
        .single();

    if (appointmentFetchError) throw appointmentFetchError;

    // ---------------------------------------------------------
    // CONFIRM APPOINTMENT
    // Create a transaction for the repair service.
    // No repair fee, so amount = 0.
    // ---------------------------------------------------------
    if (status === "confirmed") {
      // Get customer's profile for barangay
      const { data: customerProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, full_name, barangay")
          .eq("id", appointment.harvester_id)
          .single();

      if (profileError) throw profileError;

      // Check whether a transaction already exists.
      // This prevents duplicate transactions if Confirm is clicked
      // more than once or the function is triggered again.
      const { data: existingTransaction, error: existingError } =
        await supabase
          .from("transactions")
          .select("id")
          .eq("repair_appointment_id", appointment.id)
          .maybeSingle();

      if (existingError) throw existingError;

      let transaction = existingTransaction;

      // Create transaction only if one does not already exist
      if (!transaction) {
        const { data: newTransaction, error: transactionError } =
          await supabase
            .from("transactions")
            .insert({
              seller_id: appointment.harvester_id,
              harvester_id: appointment.repair_shop_id,

              // Repair service has no fee
              amount: 0,

              barangay: customerProfile?.barangay || "N/A",

              // Same transaction status used by the marketplace
              status: "meetup_scheduled",

              meetup_date: appointment.preferred_date,
              meetup_time: appointment.preferred_time
                ? String(appointment.preferred_time).slice(0, 5)
                : null,

              notes: [
                "Repair Service",
                `Device: ${appointment.device_model || "N/A"}`,
                `Category: ${appointment.category || "N/A"}`,
                `Issue: ${appointment.issue_description || "N/A"}`,
                appointment.notes
                  ? `Customer Notes: ${appointment.notes}`
                  : null,
              ]
                .filter(Boolean)
                .join("\n"),

              listing_id: null,

              // Links the transaction directly to this repair appointment
              repair_appointment_id: appointment.id,
            })
            .select("*")
            .single();

        if (transactionError) throw transactionError;

        transaction = newTransaction;
      }

      console.log("REPAIR TRANSACTION CREATED:", transaction);
    }

    // ---------------------------------------------------------
    // UPDATE APPOINTMENT STATUS
    // ---------------------------------------------------------
    const { data, error } = await supabase
      .from("repair_appointments")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("repair_shop_id", userId)
      .select("*")
      .single();

    if (error) throw error;

    setAppointments((previous) =>
      previous.map((appointment) =>
        appointment.id === id ? data : appointment
      )
    );

    // ---------------------------------------------------------
    // IF MARKED COMPLETED
    // Also complete the corresponding transaction.
    // ---------------------------------------------------------
    if (status === "completed") {
      const { data: completedTransaction, error: transactionError } =
        await supabase
          .from("transactions")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("repair_appointment_id", id)
          .select("*");

      if (transactionError) {
        console.error(
          "REPAIR TRANSACTION COMPLETION ERROR:",
          transactionError
        );
      } else {
        console.log(
          "REPAIR TRANSACTION COMPLETED:",
          completedTransaction
        );
      }
    }

    // ---------------------------------------------------------
    // SEND STATUS MESSAGE
    // ---------------------------------------------------------
    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: data.harvester_id,
      listing_id: null,
      content: `Repair appointment update\nStatus: ${status.replaceAll(
        "_",
        " "
      )}`,
      is_read: false,
    });

    await loadConversations();
  } catch (error) {
    console.error("UPDATE APPOINTMENT ERROR:", error);
    alert(error?.message || "Unable to update appointment.");
  }
};

  const sendMessage = async () => {
    const content = messageText.trim();

    if (!userId || !selectedChat || !content) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          receiver_id: selectedChat.other_party_id,
          listing_id: null,
          content,
          is_read: false,
        })
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setMessages((previous) =>
          previous.some((item) => item.id === data.id)
            ? previous
            : [...previous, data]
        );
      }

      setMessageText("");
      await loadConversations();
    } catch (error) {
      console.error("SEND REPAIR SHOP MESSAGE ERROR:", error);
      alert(error?.message || "Unable to send message.");
    }
  };

  const filtered = conversations.filter((conversation) => {
    const name =
      conversation.profile?.full_name ||
      conversation.profile?.business_name ||
      "Unknown Harvester";

    return name.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="flex-1">
        <div className="grid grid-cols-12 gap-8 bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden min-h-[600px]">
          <div className="col-span-4 border-r border-slate-50 p-6 overflow-y-auto">
            <h2 className="text-xl font-black text-slate-800 mb-4">
              Messages
            </h2>

            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search harvesters..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs outline-none mb-4"
            />

            {loadError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-[10px] text-red-600">
                <b>Message loading error:</b>
                <div className="mt-1 break-words">{loadError}</div>
              </div>
            )}

            {loading ? (
              <p className="text-xs text-slate-400 p-4">
                Loading conversations...
              </p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare
                  size={32}
                  className="mx-auto mb-3 opacity-40"
                />
                <p className="text-xs font-semibold">No messages yet</p>
                <p className="text-[10px] mt-1">
                  Harvester messages and repair requests will appear here.
                </p>
              </div>
            ) : (
              filtered.map((chat) => {
                const name =
                  chat.profile?.full_name ||
                  chat.profile?.business_name ||
                  "Unknown Harvester";

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-slate-100 cursor-pointer rounded-2xl ${
                      selectedChat?.id === chat.id
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 text-sm truncate">
                          {name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {chat.last_message}
                        </p>

                        {chat.has_appointment && (
                          <span className="inline-block mt-2 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[9px] font-bold">
                            Repair appointment
                          </span>
                        )}
                      </div>

                      <span className="text-[9px] text-slate-400 shrink-0">
                        {chat.last_at
                          ? new Date(chat.last_at).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="col-span-8 flex flex-col bg-slate-50/30">
            {selectedChat ? (
              <>
                <div className="p-6 bg-white border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedChat.profile?.full_name ||
                      selectedChat.profile?.business_name ||
                      "Harvester"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Tech Harvester
                  </p>
                </div>

                <div className="flex-1 p-8 overflow-y-auto space-y-5">
                  {appointments.map((appointment) => (
                    <div
                      key={`appointment-${appointment.id}`}
                      className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            Repair Appointment Request
                          </p>
                          <h3 className="text-base font-bold text-slate-800 mt-1">
                            {appointment.device_model || "Device"}
                          </h3>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold uppercase h-fit">
                          {appointment.status || "pending"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-slate-600">
                        <p>
                          <b>Category:</b> {appointment.category || "—"}
                        </p>
                        <p>
                          <b>Date:</b> {appointment.preferred_date || "—"}
                        </p>
                        <p>
                          <b>Time:</b> {appointment.preferred_time || "—"}
                        </p>
                        <p>
                          <b>Issue:</b> {appointment.issue_description || "—"}
                        </p>
                      </div>

                      {appointment.notes && (
                        <p className="text-xs text-slate-500 mt-3">
                          <b>Notes:</b> {appointment.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        {(appointment.status === "pending" ||
                          !appointment.status) && (
                          <>
                            <button
                              onClick={() =>
                                updateAppointment(appointment.id, "accepted")
                              }
                              className="px-4 py-2 rounded-xl bg-[#769c2d] text-white text-[10px] font-bold"
                            >
                              Accept Request
                            </button>

                            <button
                              onClick={() =>
                                updateAppointment(appointment.id, "declined")
                              }
                              className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-bold"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {appointment.status === "accepted" && (
                          <button
                            onClick={() =>
                              updateAppointment(appointment.id, "confirmed")
                            }
                            className="px-4 py-2 rounded-xl bg-[#769c2d] text-white text-[10px] font-bold"
                          >
                            Confirm Appointment
                          </button>
                        )}

                        {appointment.status === "confirmed" && (
                          <button
                            onClick={() =>
                              updateAppointment(appointment.id, "completed")
                            }
                            className="px-4 py-2 rounded-xl bg-[#769c2d] text-white text-[10px] font-bold"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === userId
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`px-5 py-3 rounded-2xl max-w-[70%] text-sm shadow-sm whitespace-pre-line ${
                          message.sender_id === userId
                            ? "bg-[#769c2d] text-white rounded-br-md"
                            : "bg-white text-slate-600 rounded-bl-md border border-slate-100"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {messages.length === 0 && appointments.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-10">
                      No messages in this conversation.
                    </p>
                  )}
                </div>

                <div className="p-6 bg-white border-t border-slate-50 flex gap-4">
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-50 rounded-2xl py-4 px-6 text-xs outline-none"
                  />

                  <button
                    onClick={sendMessage}
                    className="bg-[#769c2d] text-white p-4 rounded-2xl"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
                <MessageSquare size={40} />
                <p className="text-xs font-bold uppercase">
                  Select a Harvester to view messages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, isPrice }) => (
  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center min-h-[140px]">
    <span
      className={`text-3xl font-black text-slate-800 tracking-tighter ${isPrice ? "text-slate-900" : ""}`}
    >
      {isPrice ? `₱${value}` : value}
    </span>
    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">
      {label}
    </span>
  </div>
);

const NavBtn = ({ active, onClick, icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs transition-all ${active
      ? "bg-[#769c2d] text-white shadow-md"
      : "bg-white/70 text-slate-500 hover:bg-white hover:text-slate-700 border border-white/50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {icon}
    {label}
  </button>
);

const MenuLink = ({ icon, label }) => (
  <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors text-xs font-bold">
    <span className="text-slate-400">{icon}</span> {label}
  </button>
);

const ListingCard = ({ item, onBid, onSellerClick, isVerified }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const getConditionStyles = (condition) => {
    switch (condition?.toLowerCase()) {
      case "defective":
        return "bg-blue-50 text-blue-600 border-blue-100";

      case "working":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";

      case "parts only":
        return "bg-orange-50 text-orange-600 border-orange-100";

      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const listingMedia = Array.isArray(item.images)
    ? item.images
    : item.images
      ? [item.images]
      : [];

  const currentMedia = listingMedia[activeIndex] || null;

  const isVideoFile = (url) => {
    if (!url || typeof url !== "string") {
      return false;
    }

    return (
      url.includes(".mp4") ||
      url.includes(".mov") ||
      url.includes(".webm") ||
      url.includes(".m4v") ||
      url.includes("video")
    );
  };

  const nextMedia = (e) => {
    e.stopPropagation();

    if (listingMedia.length <= 1) return;

    setActiveIndex((prev) => (prev === listingMedia.length - 1 ? 0 : prev + 1));
  };

  const prevMedia = (e) => {
    e.stopPropagation();

    if (listingMedia.length <= 1) return;

    setActiveIndex((prev) => (prev === 0 ? listingMedia.length - 1 : prev - 1));
  };

  const highestBid = Number(item.highest_bid || 0);

  const askingPrice = Number(item.asking_price || 0);

  const bidCount = Number(item.bid_count || 0);

  const competition =
    bidCount >= 5
      ? "High Competition"
      : bidCount >= 2
        ? "Moderate Competition"
        : "No Competition";

  const competitionStyle =
    bidCount >= 5
      ? "bg-red-50 text-red-500"
      : bidCount >= 2
        ? "bg-orange-50 text-orange-500"
        : "bg-emerald-50 text-emerald-500";

  const sellerName = item.seller_name || item.profiles?.full_name || "Seller";

  const sellerBarangay =
    item.seller_barangay || item.profiles?.barangay || "Valenzuela";

  const postedDate = item.created_at
    ? new Date(item.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "Recently";

  const sellerRating = Number(
    item.seller_rating || item.profiles?.average_rating || 0,
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200">
      {/* =====================================================
          IMAGE
      ===================================================== */}
      <div
        className="relative h-[250px] bg-slate-100 overflow-hidden cursor-pointer group"
        onClick={onBid}
      >
        {currentMedia ? (
          isVideoFile(currentMedia) ? (
            <video
              src={currentMedia}
              className="w-full h-full object-cover"
              muted
              controls
            />
          ) : (
            <img
              src={currentMedia}
              alt={item.device_model || "E-waste listing"}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/700x500?text=No+Image";
              }}
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <Box size={38} />

            <p className="text-[9px] font-bold uppercase tracking-widest mt-2">
              No Image
            </p>
          </div>
        )}

        {/* CONDITION */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          <span
            className={`px-2.5 py-1 rounded-full border text-[8px] font-black uppercase ${getConditionStyles(
              item.condition,
            )}`}
          >
            {item.condition || "Unknown"}
          </span>

          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-slate-600 border border-white text-[7px] font-black uppercase shadow-sm">
            {item.condition?.toLowerCase() === "working"
              ? "Buyer + Repair Shop"
              : "Repair Shop"}
          </span>
        </div>

        {/* IMAGE COUNT */}
        {listingMedia.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-[8px] font-bold">
            {activeIndex + 1}/{listingMedia.length}
          </div>
        )}

        {/* LEFT */}
        {listingMedia.length > 1 && (
          <button
            onClick={prevMedia}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 text-slate-500 shadow-sm hover:bg-white"
          >
            ←
          </button>
        )}

        {/* RIGHT */}
        {listingMedia.length > 1 && (
          <button
            onClick={nextMedia}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 text-slate-500 shadow-sm hover:bg-white"
          >
            →
          </button>
        )}

        {/* DOTS */}
        {listingMedia.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {listingMedia.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full ${activeIndex === index ? "bg-white" : "bg-white/50"
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}
      <div className="p-4">
        {/* DEVICE TITLE */}
        <div className="mb-2">
          <h3 className="text-sm font-black text-slate-800">
            {item.device_model || "Device Name"}
          </h3>

          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            {item.device_type || item.category || "E-waste Device"}
          </p>
        </div>

        {/* RATING */}
        {sellerRating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400 text-[10px]">★</span>

            <span className="text-[9px] font-bold text-slate-500">
              {sellerRating.toFixed(1)}
            </span>
          </div>
        )}

        {/* DESCRIPTION */}
        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 min-h-[30px]">
          {item.description || "No description provided for this listing."}
        </p>

        {/* LOCATION */}
        <div className="flex items-center gap-1.5 mt-3">
          <MapPin size={11} className="text-slate-400" />

          <span className="text-[9px] font-bold text-slate-400">
            Barangay {sellerBarangay}
          </span>
        </div>

        {/* =================================================
            PRICE BOX
        ================================================= */}
        <div className="mt-3 bg-[#f5f8ff] border border-blue-100 rounded-xl p-3">
          <div className="grid grid-cols-2 gap-3">
            {/* ASKING */}
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">
                Asking Price
              </p>

              <p className="text-base font-black text-slate-800 mt-0.5">
                ₱{askingPrice.toLocaleString()}
              </p>
            </div>

            {/* HIGHEST BID */}
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">
                Current Highest Bid
              </p>

              <p className="text-base font-black text-[#769c2d] mt-0.5">
                {highestBid > 0
                  ? `₱${highestBid.toLocaleString()}`
                  : "No bids yet"}
              </p>
            </div>
          </div>

          <div className="border-t border-blue-100 mt-2 pt-2 flex items-center justify-between">
            <span className="text-[7px] text-slate-400">
              Total Bids: <strong className="text-slate-600">{bidCount}</strong>
            </span>

            <span
              className={`px-2 py-1 rounded-full text-[7px] font-black ${competitionStyle}`}
            >
              {competition}
            </span>
          </div>
        </div>

        {/* =================================================
            SELLER
        ================================================= */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            {/* SELLER PROFILE */}
            <div
              className="min-w-0 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSellerClick?.();
              }}
            >
              <p className="text-[7px] text-slate-400 uppercase font-bold">
                Seller
              </p>

              <div className="flex items-center gap-1.5 mt-1">
                {/* Seller Avatar */}
                <div className="w-6 h-6 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-[8px] font-black shrink-0">
                  {sellerName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                {/* Seller Name */}
                <span className="text-[9px] font-bold text-slate-700 truncate max-w-[150px] group-hover:text-[#769c2d] transition-colors">
                  {sellerName}
                </span>
              </div>

              {/* Click hint */}
              <p className="text-[7px] text-slate-300 mt-1 group-hover:text-[#769c2d] transition-colors">
                Click to view profile
              </p>
            </div>

            {/* BID BUTTON */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBid();
              }}
              disabled={!isVerified}
              className={`px-4 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all ${isVerified
                ? "bg-[#769c2d] text-white hover:bg-[#658724]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
              <MessageSquare size={11} />

              {isVerified ? "Bid or Message" : "Locked"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaceBidModal = ({
  listing,
  onClose,
  onSubmit,
  onSendMessage,
  session,
}) => {
  const [activeTab, setActiveTab] = useState("bid");
  const [bidAmount, setBidAmount] = useState(
    Number(listing.asking_price || 0),
  );
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // ==============================
  // LISTING IMAGES
  // ==============================
  const listingImages = Array.isArray(listing.images)
    ? listing.images
    : listing.images
      ? [listing.images]
      : [];

  const askingPrice = Number(listing.asking_price || 0);

  // ==============================
  // QUICK OFFER
  // ==============================
  const quickOffers = [
    {
      label: "Full Price",
      percentage: 100,
      amount: askingPrice,
    },
    {
      label: "90%",
      percentage: 90,
      amount: Math.round(askingPrice * 0.9),
    },
    {
      label: "80%",
      percentage: 80,
      amount: Math.round(askingPrice * 0.8),
    },
    {
      label: "70%",
      percentage: 70,
      amount: Math.round(askingPrice * 0.7),
    },
  ];

  const handleQuickOffer = (amount) => {
    setBidAmount(amount);
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleFormSubmit = async () => {
    if (activeTab === "bid") {
      const amount = Number(bidAmount);

      if (!amount || amount <= 0) {
        alert("Please enter a valid offer amount.");
        return;
      }

      if (amount > askingPrice) {
        alert("Your offer cannot exceed the maximum price.");
        return;
      }
    }

    if (activeTab === "question" && !question.trim()) {
      alert("Please enter your question.");
      return;
    }

    setSubmitting(true);

    try {
      if (activeTab === "bid") {
        await onSubmit(
          listing.id,
          Number(bidAmount),
          message,
        );
      } else {
        await onSendMessage(
          listing.id,
          question,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sellerName =
    listing.profiles?.full_name ||
    listing.seller_name ||
    "Seller";

  const sellerInitials = sellerName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-3xl h-full sm:h-auto sm:max-h-[95vh] overflow-hidden rounded-none sm:rounded-[2rem] shadow-2xl flex flex-col">

        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="px-6 sm:px-8 pt-6 pb-5 flex items-start justify-between border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-medium text-slate-800">
              Contact Seller
            </h2>

            <p className="text-sm sm:text-base text-slate-500 mt-1">
              {listing.device_model || "E-Waste Item"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition"
          >
            <XCircle size={30} strokeWidth={1.8} />
          </button>
        </div>

        {/* =====================================================
            IMAGE
        ===================================================== */}
        {listingImages.length > 0 && (
          <div className="relative h-[230px] sm:h-[300px] bg-slate-100 overflow-hidden">

            <img
              src={listingImages[activeImage]}
              alt={listing.device_model || "Listing"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/900x600?text=No+Image";
              }}
            />

            {/* Image counter */}
            {listingImages.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/75 text-white px-4 py-2 rounded-full text-sm">
                {activeImage + 1} / {listingImages.length}
              </div>
            )}

            {/* Previous */}
            {listingImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveImage((prev) =>
                    prev === 0
                      ? listingImages.length - 1
                      : prev - 1,
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center text-slate-600"
              >
                ←
              </button>
            )}

            {/* Next */}
            {listingImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveImage((prev) =>
                    prev === listingImages.length - 1
                      ? 0
                      : prev + 1,
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center text-slate-600"
              >
                →
              </button>
            )}

            {/* Dots */}
            {listingImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {listingImages.map((_, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={`w-2.5 h-2.5 rounded-full transition ${activeImage === index
                      ? "bg-white"
                      : "bg-white/50"
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            TABS
        ===================================================== */}
        <div className="flex border-b border-slate-200 px-6 sm:px-8">

          <button
            type="button"
            onClick={() => setActiveTab("bid")}
            className={`flex items-center gap-2 py-4 px-2 mr-8 border-b-2 text-base sm:text-lg transition ${activeTab === "bid"
              ? "border-[#5d9f26] text-[#5d9f26]"
              : "border-transparent text-slate-500"
              }`}
          >
            <Gavel size={21} />
            Make Offer
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("question")}
            className={`flex items-center gap-2 py-4 px-2 border-b-2 text-base sm:text-lg transition ${activeTab === "question"
              ? "border-[#5d9f26] text-[#5d9f26]"
              : "border-transparent text-slate-500"
              }`}
          >
            <MessageSquare size={21} />
            Ask Question
          </button>

        </div>

        {/* =====================================================
            CONTENT
        ===================================================== */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">

          {/* ===================================================
              MAKE OFFER
          =================================================== */}
          {activeTab === "bid" && (
            <div className="space-y-7">

              {/* MAXIMUM PRICE */}
              <div className="border border-slate-200 rounded-2xl p-5 sm:p-6">

                <div className="flex justify-between items-start">

                  <div>
                    <p className="text-sm sm:text-base uppercase tracking-wide text-slate-400">
                      Maximum Price
                    </p>

                    <p className="text-3xl sm:text-4xl font-medium text-slate-800 mt-1">
                      ₱{askingPrice.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm sm:text-base text-slate-400">
                      Seller
                    </p>

                    <div className="flex items-center justify-end gap-2 mt-1">

                      <div className="w-9 h-9 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-xs font-bold">
                        {sellerInitials}
                      </div>

                      <p className="text-sm sm:text-base text-slate-600">
                        {sellerName}
                      </p>

                    </div>
                  </div>

                </div>

                {/* INFO */}
                <div className="mt-5 bg-[#fffbea] border border-yellow-300 rounded-xl px-4 py-3">
                  <p className="text-sm sm:text-base text-[#a95d16]">
                    ↘ Offer at or below this price.
                  </p>
                </div>

              </div>

              {/* YOUR OFFER */}
              <div>
                <h3 className="text-xl sm:text-2xl text-slate-700 mb-3">
                  Your Offer
                </h3>

                <div className="relative">

                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    ₱
                  </span>

                  <input
                    type="number"
                    min="1"
                    max={askingPrice}
                    value={bidAmount}
                    onChange={(e) =>
                      setBidAmount(e.target.value)
                    }
                    className="w-full border-2 border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-xl sm:text-2xl text-slate-800 focus:outline-none focus:border-[#5d9f26]"
                    placeholder="Enter offer"
                  />

                </div>

                {/* OFFER INDICATOR */}
                {Number(bidAmount) > 0 && askingPrice > 0 && (
                  <div className="inline-block mt-3 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm">
                    {Math.round(
                      (Number(bidAmount) / askingPrice) * 100,
                    )}
                    % of asking price
                    {" · "}
                    {Number(bidAmount) >= askingPrice * 0.8
                      ? "Good offer"
                      : "Low offer"}
                  </div>
                )}
              </div>

              {/* QUICK SELECT */}
              <div>

                <h3 className="text-lg sm:text-xl text-slate-600 mb-3">
                  Quick select:
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  {quickOffers.map((offer) => {
                    const selected =
                      Number(bidAmount) === offer.amount;

                    return (
                      <button
                        type="button"
                        key={offer.label}
                        onClick={() =>
                          handleQuickOffer(offer.amount)
                        }
                        className={`p-3 sm:p-4 rounded-2xl border-2 transition ${selected
                          ? "border-[#5d9f26] bg-[#f2f8ec]"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <p className="text-sm text-slate-500">
                          {offer.label}
                        </p>

                        <p className="text-base sm:text-lg font-medium text-slate-800 mt-1">
                          ₱{offer.amount.toLocaleString()}
                        </p>
                      </button>
                    );
                  })}

                </div>
              </div>

              {/* MESSAGE */}
              <div>

                <h3 className="text-lg sm:text-xl text-slate-600 mb-3">
                  Message to Seller{" "}
                  <span className="text-slate-400">
                    (Optional)
                  </span>
                </h3>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  placeholder="Write a message to the seller..."
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 min-h-[130px] resize-none text-sm sm:text-base focus:outline-none focus:border-[#5d9f26]"
                />

              </div>

            </div>
          )}

          {/* ===================================================
              ASK QUESTION
          =================================================== */}
          {activeTab === "question" && (
            <div className="space-y-6">

              <div>
                <h3 className="text-xl text-slate-700 mb-2">
                  Ask the Seller
                </h3>

                <p className="text-sm text-slate-500">
                  Ask about the item's condition, functionality,
                  availability, or pickup arrangements.
                </p>
              </div>

              <textarea
                value={question}
                onChange={(e) =>
                  setQuestion(e.target.value)
                }
                placeholder="Example: Is the battery still functional? Can you provide more photos?"
                className="w-full border-2 border-slate-200 rounded-2xl p-5 min-h-[220px] resize-none text-sm sm:text-base focus:outline-none focus:border-[#5d9f26]"
              />

              <div>
                <p className="text-sm font-semibold text-slate-500 mb-3">
                  Quick questions
                </p>

                <div className="space-y-2">

                  {[
                    "What specific parts are still functional?",
                    "Can you provide more photos?",
                    "Is pickup available today?",
                    "Has the data been fully sanitized?",
                  ].map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setQuestion(q)}
                      className="w-full text-left px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
                    >
                      {q}
                    </button>
                  ))}

                </div>
              </div>

            </div>
          )}

        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}
        <div className="border-t border-slate-100 px-6 sm:px-8 py-5 flex gap-3">

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-4 border-2 border-slate-200 rounded-2xl text-lg text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={submitting}
            className="flex-1 py-4 bg-[#5d9f26] text-white rounded-2xl text-lg font-medium hover:bg-[#518b21] transition disabled:opacity-50"
          >
            {submitting
              ? "Sending..."
              : activeTab === "bid"
                ? "Send Offer"
                : "Send Question"}
          </button>

        </div>

      </div>
    </div>
  );
};

export default HarvesterDashboard;
