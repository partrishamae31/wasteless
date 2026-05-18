import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import HarvesterAlerts from "./HarvesterAlerts";
import UrbanMineMap from "./UrbanMineMap";
import InventoryView from "./InventoryView";
import TransactionsView from "./TransactionsView";
import BarangayLeaderboard from "./BarangayLeaderboard"; // Ensure path is correct

import {
  Search,
  Bell,
  Map,
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
} from "lucide-react";

const HarvesterDashboard = ({ session, onLogout }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedListing, setSelectedListing] = useState(null);
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
    phone: "",
    role: "Harvester",
    joined_date: "",
    // Harvester metrics
    completed_pickups: 0,
    active_bids: 0,
    eco_points: 0,
  });
  const [verificationStatus, setVerificationStatus] = useState("verified");
  const isVerified = verificationStatus === "verified";
  const [rejectionReason, setRejectionReason] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
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
        const { count: pickupsCount } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("harvester_id", session.user.id)
          .eq("status", "completed");

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
          phone: profile?.contact_number || "",
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
          setListings((prev) => [payload.new, ...prev]);
        },
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
  profiles:bidder_id (
    full_name
  )
),
    profiles:seller_id (
      full_name,
      barangay
    )
  `,
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = data.map((listing) => {
        const highestBid =
          listing.bids && listing.bids.length > 0
            ? listing.bids.reduce((max, bid) =>
                bid.amount > max.amount ? bid : max,
              )
            : null;

        return {
          ...listing,
          highest_bid: highestBid ? highestBid.amount : null,
          highest_bidder: highestBid?.profiles?.full_name || null,
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
        .select("status, seller_id, device_model")
        .eq("id", listingId)
        .single();

      // Check if the listing is locked (not active)
      if (statusError || currentListing.status !== "active") {
        alert("This listing is no longer accepting bids (Closed or Expired).");
        setSelectedListing(null);
        fetchActiveListings(); // Refresh the UI to reflect the change
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
  return (
    <div className="min-h-screen bg-[#f1f5f9] p-6 font-sans text-slate-900">
      {/* --- TOP HEADER SECTION --- */}
      <div className="flex justify-end items-center mb-6 gap-4">
        {/* Notification Bell Container */}
        <div className="relative">
          <div
            onClick={() => setShowNotifications(!showNotifications)}
            className="bg-white p-2.5 rounded-full shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all text-slate-600"
          >
            <Bell size={20} />
          </div>

          {notifications.filter((n) => !n.is_read).length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-[#f1f5f9]">
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
                    // Dynamic icon and color logic based on notification type
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
                        className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                          !n.is_read ? "bg-lime-50/30" : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          <div
                            className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
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
                              {new Date(n.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
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
            className="flex items-center gap-3 bg-white p-1 pr-4 rounded-full shadow-sm border border-slate-200 cursor-pointer hover:border-slate-300 transition-all"
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
            <div className="w-8 h-8 bg-[#4a7c59] rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-sm border border-white/20">
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
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-sm">
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
                  <MenuLink icon={<Settings size={15} />} label="Settings" />
                  {/* Added Achievements to match mockup */}
                  <MenuLink icon={<Award size={15} />} label="Achievements" />

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
                    val: Number(profileData?.average_rating || 0).toFixed(1),
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

              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                <Award
                  className="absolute right-4 top-4 opacity-10"
                  size={60}
                />

                <div className="relative z-10">
                  <h3 className="font-bold text-lg">Community Reputation</h3>

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
              <div className="space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
                  Personal Information
                </h3>

                <div className="grid gap-4">
                  {/* FULL NAME */}
                  <div className="flex items-start gap-3">
                    <User size={14} className="text-slate-400 mt-1" />

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Full Name
                      </p>

                      <p className="text-sm font-semibold text-slate-700">
                        {profileData?.full_name}
                      </p>
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div className="flex items-start gap-3">
                    <Mail size={14} className="text-slate-400 mt-1" />

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Email Address
                      </p>

                      <p className="text-sm font-semibold text-slate-700">
                        {profileData?.email}
                      </p>
                    </div>
                  </div>

                  {/* PHONE */}
                  <div className="flex items-start gap-3">
                    <Phone size={14} className="text-slate-400 mt-1" />

                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Phone Number
                      </p>

                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={profileData.phone}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              phone: e.target.value,
                            })
                          }
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-700">
                          {profileData?.phone || "No phone number"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* LOCATION */}
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-slate-400 mt-1" />

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Assigned Area
                      </p>

                      <p className="text-sm font-semibold text-slate-700">
                        {profileData?.assigned_area ||
                          profileData?.barangay ||
                          "Not assigned"}
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
                      const { error } = await supabase
                        .from("profiles")
                        .update({
                          phone: profileData.phone,
                        })
                        .eq("id", session.user.id);

                      if (error) throw error;

                      setIsEditingProfile(false);
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                  className="flex-1 bg-[#769c2d] text-white py-3 rounded-xl font-black text-xs uppercase"
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
          <button className="px-6 py-2 bg-red-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-700 transition-colors">
            Update Profile
          </button>
        </div>
      )}

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-4 gap-6 mb-10">
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
      <div className="flex gap-10 mb-7 items-center">
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
          icon={<Map size={16} className={!isVerified ? "opacity-50" : ""} />}
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
          active={activeTab === "messages"}
          onClick={() => setActiveTab("messages")}
          icon={<MessageSquare size={16} />}
          label="Messages"
        />
        {/* <NavBtn
          active={activeTab === "inventory"}
          onClick={() => setActiveTab("inventory")}
          icon={<Package size={16} />}
          label="Inventory"
        /> */}
      </div>
      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by device name or model..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/20"
          />
        </div>
        <select className="bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium">
          <option>All Conditions</option>
        </select>
        <button className="p-3 bg-white border border-slate-200 rounded-xl">
          <LayoutGrid size={18} />
        </button>
      </div>

      <p className="text-xs font-bold text-slate-400 mb-6 flex justify-between">
        <span>{listings.length} listings found</span>
        <span>Sorted by: Nearest</span>
      </p>

      {/* --- TAB CONTENT --- */}
      {activeTab === "browse" ? (
        <div className="grid grid-cols-2 gap-8 pb-20">
          {listings.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              onBid={() => setSelectedListing(item)}
              isVerified={isVerified}
            />
          ))}
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
            className={`group bg-white rounded-[2.5rem] border-2 p-8 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 ${
              bid.status === "accepted"
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
                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      bid.status === "accepted"
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
              <div className="mb-6 p-4 bg-white border border-slate-100 rounded-xl flex items-start gap-3">
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
                  <button className="px-8 py-3 bg-[#769c2d] text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:scale-105 transition-transform">
                    Accept
                  </button>
                  <button className="px-8 py-3 bg-white border border-blue-100 text-blue-400 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-blue-50 transition-colors">
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
                <button className="px-6 py-2.5 bg-[#769c2d] text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-lime-100 flex items-center gap-2 hover:scale-105 transition-transform">
                  <MessageSquare size={12} /> Contact Seller
                </button>
              ) : (
                <button className="px-6 py-2.5 bg-white border border-slate-100 text-slate-400 text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-50 transition-colors">
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
          className={`p-6 rounded-[2rem] border transition-all flex items-center gap-6 ${
            !n.is_read
              ? n.type === "alert_match"
                ? "bg-amber-50/50 border-amber-100" // Distinct color for matches
                : "bg-lime-50/50 border-lime-100"
              : "bg-slate-50/30 border-slate-50"
          }`}
        >
          {/* Dynamic Icon based on type */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              n.type === "alert_match"
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
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const renderStars = (rating = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-[1px]">
        {/* Full Stars */}
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400 text-xs">
            ★
          </span>
        ))}

        {/* Half Star */}
        {hasHalfStar && (
          <span className="text-yellow-400 text-xs opacity-60">★</span>
        )}

        {/* Empty Stars */}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-slate-300 text-xs">
            ★
          </span>
        ))}
      </div>
    );
  };

  useEffect(() => {
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
        listing_id,
        listings (
          device_model, 
          asking_price,
          seller_id,
          profiles:seller_id (
  full_name,
  average_rating,
  total_reviews
)
        ),
        sender_id,
        receiver_id
      `,
        )
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      if (data) {
        const uniqueChats = data.reduce((acc, current) => {
          const x = acc.find((item) => item.listing_id === current.listing_id);
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);
        setConversations(uniqueChats);
      }
    };

    fetchConversations();
  }, [session.user.id]);
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("listing_id", selectedChat.listing_id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    // Real-time subscription for new messages
    const channel = supabase
      .channel(`chat-${selectedChat.listing_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${selectedChat.listing_id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);
  const RatingModal = ({ transaction, onClose }) => {
    const [ratings, setRatings] = useState({
      communication: 0,
      punctuality: 0,
      item_condition: 0,
      overall: 0,
    });
    const [feedback, setFeedback] = useState("");

    // Check if all categories are filled as per the warning in image_e54af2.png
    const isComplete = Object.values(ratings).every((r) => r > 0);

    const handleSubmit = async () => {
      const { error } = await supabase.from("reviews").insert([
        {
          transaction_id: transaction.id,
          reviewer_id: session.user.id,
          reviewee_id: transaction.listings.seller_id,
          ...ratings,
          comment: feedback,
        },
      ]);

      if (!error) {
        alert("Thank you for your feedback!");
        onClose();
      }
    };

    return (
      // ... Modal Backdrop and Container from image_e54af2.png
      <div className="p-8">
        {/* Map through categories: Communication, Punctuality, etc. */}
        <StarRating
          label="Communication"
          value={ratings.communication}
          onChange={(v) => setRatings({ ...ratings, communication: v })}
        />

        {/* Validation Message from image_e54af2.png */}
        {!isComplete && (
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl text-[10px] font-bold text-center mb-4">
            Please rate all categories before submitting
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={onClose} className="...">
            Cancel
          </button>
          <button
            disabled={!isComplete}
            onClick={handleSubmit}
            className="bg-[#769c2d] disabled:opacity-50 ..."
          >
            Submit Rating
          </button>
        </div>
      </div>
    );
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    // Determine who the receiver is (the person who isn't the current user)
    const receiverId =
      selectedChat.sender_id === session.user.id
        ? selectedChat.receiver_id
        : selectedChat.sender_id;

    const { error } = await supabase.from("messages").insert([
      {
        content: messageText,
        sender_id: session.user.id,
        receiver_id: receiverId,
        listing_id: selectedChat.listing_id,
        is_read: false,
      },
    ]);

    if (!error) setMessageText("");
  };

  return (
    <div className="grid grid-cols-12 gap-8 bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden min-h-[600px]">
      {/* Sidebar: Message List */}
      <div className="col-span-4 border-r border-slate-50 p-6">
        <h2 className="text-xl font-black text-slate-800 mb-4">Messages</h2>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs outline-none"
          />
        </div>
        <div className="space-y-1">
          {conversations.map((chat) => (
            <div
              key={chat.listing_id}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 border-b border-slate-100 cursor-pointer transition ${
                selectedChat?.listing_id === chat.listing_id
                  ? "bg-slate-100"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  {/* Seller Name */}
                  <h3 className="font-semibold text-slate-800 text-sm truncate">
                    {chat.listings?.profiles?.full_name || "Unknown Seller"}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(chat.listings?.profiles?.average_rating)}

                    <span className="text-xs text-slate-500">
                      {Number(
                        chat.listings?.profiles?.average_rating || 0,
                      ).toFixed(1)}{" "}
                      ({chat.listings?.profiles?.total_reviews || 0})
                    </span>
                  </div>

                  {/* Product */}
                  <p className="text-xs text-slate-600 mt-1">
                    Re: {chat.listings?.device_model}
                  </p>

                  {/* Last Message Preview */}
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    Tap to view conversation
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] text-slate-400">Recent</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="col-span-8 flex flex-col bg-slate-50/30">
        {selectedChat ? (
          <>
            <div className="p-6 bg-white border-b border-slate-100">
              {/* Seller Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedChat.listings?.profiles?.full_name}
                  </h2>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(
                      selectedChat.listings?.profiles?.average_rating,
                    )}

                    <span className="text-sm text-slate-500">
                      {Number(
                        selectedChat.listings?.profiles?.average_rating || 0,
                      ).toFixed(1)}{" "}
                      ({selectedChat.listings?.profiles?.total_reviews || 0})
                    </span>
                  </div>

                  {/* Product */}
                  <p className="text-sm text-slate-500 mt-2">
                    {selectedChat.listings?.device_model}
                  </p>
                </div>
              </div>

              {/* Bid Card */}
              <div className="mt-4 bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Your Bid</p>

                  <p className="text-2xl font-bold text-slate-800">
                    ₱{selectedChat.listings?.asking_price?.toLocaleString()}
                  </p>
                </div>

                <span className="px-4 py-2 rounded-full text-sm font-semibold bg-orange-100 text-orange-600">
                  Bid Pending
                </span>
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === session.user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-5 py-3 rounded-2xl max-w-[70%] text-sm shadow-sm ${
                      msg.sender_id === session.user.id
                        ? "bg-[#769c2d] text-white rounded-br-md"
                        : "bg-white text-slate-600 rounded-bl-md border border-slate-100"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-white border-t border-slate-50 flex gap-4">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-6 text-xs"
              />
              <button
                onClick={handleSendMessage}
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
              Select a chat to view messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, isPrice }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-white flex flex-col items-center justify-center">
    <span
      className={`text-3xl font-black text-slate-800 tracking-tighter ${isPrice ? "text-slate-900" : ""}`}
    >
      {isPrice ? `₱${value}` : value}
    </span>
    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1">
      {label}
    </span>
  </div>
);

const NavBtn = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-[11px] transition-all ${
      active
        ? "bg-[#769c2d] text-white shadow-lg shadow-lime-900/20"
        : "text-slate-400 hover:bg-white hover:text-slate-600"
    }`}
  >
    {icon} {label}
  </button>
);

const MenuLink = ({ icon, label }) => (
  <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors text-xs font-bold">
    <span className="text-slate-400">{icon}</span> {label}
  </button>
);

const ListingCard = ({ item, onBid, isVerified }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const getConditionStyles = (cond) => {
    switch (cond?.toLowerCase()) {
      case "defective":
        return "bg-blue-50 text-blue-600";
      case "working":
        return "bg-emerald-50 text-emerald-600";
      case "parts only":
        return "bg-orange-50 text-orange-600";
      default:
        return "bg-slate-50 text-slate-600";
    }
  };

  // FIXED MEDIA HANDLING
  const listingMedia = Array.isArray(item.images)
    ? item.images
    : item.images
      ? [item.images]
      : [];

  const currentMedia = listingMedia[activeIndex] || null;

  const isVideoFile = (url) => {
    if (!url || typeof url !== "string") return false;

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

    setActiveIndex((prev) => (prev === listingMedia.length - 1 ? 0 : prev + 1));
  };

  const prevMedia = (e) => {
    e.stopPropagation();

    setActiveIndex((prev) => (prev === 0 ? listingMedia.length - 1 : prev - 1));
  };

  return (
    <div
      onClick={onBid}
      className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group cursor-pointer"
    >
      {/* MEDIA SECTION */}
      <div className="relative h-64 bg-slate-100 overflow-hidden">
        {currentMedia ? (
          isVideoFile(currentMedia) ? (
            <video
              src={currentMedia}
              className="w-full h-full object-cover"
              controls
              muted
            />
          ) : (
            <img
              src={currentMedia}
              alt={item.device_model}
              onError={(e) => {
                e.target.src = "https://placehold.co/600x400?text=No+Image";
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <Box size={42} />

            <p className="text-[10px] font-bold uppercase tracking-widest mt-3">
              No Media Uploaded
            </p>
          </div>
        )}

        {/* CONDITION */}
        <div className="absolute top-4 left-4 z-20">
          <span
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm ${getConditionStyles(item.condition)}`}
          >
            {item.condition || "Condition"}
          </span>
        </div>

        {/* MEDIA COUNT */}
        {listingMedia.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 z-20">
            <Camera size={11} />
            {activeIndex + 1}/{listingMedia.length}
          </div>
        )}

        {/* LEFT BUTTON */}
        {listingMedia.length > 1 && (
          <button
            onClick={prevMedia}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition"
          >
            ←
          </button>
        )}

        {/* RIGHT BUTTON */}
        {listingMedia.length > 1 && (
          <button
            onClick={nextMedia}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition"
          >
            →
          </button>
        )}

        {/* DOT INDICATORS */}
        {listingMedia.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {listingMedia.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeIndex === index ? "bg-white scale-125" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-8">
        {/* ICON */}
        <div className="absolute top-[18.5rem] right-8 z-10">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-md border border-slate-100 group-hover:text-[#769c2d] transition-colors">
            <Box size={28} />
          </div>
        </div>

        {/* TITLE */}
        <div className="mb-5 pr-16">
          <h3 className="text-xl font-black text-slate-800 leading-tight">
            {item.device_model || "Device Name"}
          </h3>

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {item.device_type || item.category || "Generic Model"}
          </p>
        </div>

        {/* DESCRIPTION */}
        <p className="text-xs text-slate-500 mb-5 leading-relaxed line-clamp-2 min-h-[40px]">
          {item.description || "Description not available for this listing."}
        </p>

        {/* LOCATION */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mb-6">
          <MapPin size={13} className="text-slate-300" />

          <span>Barangay {item.profiles?.barangay || "Unknown"}</span>
        </div>

        {/* PRICE */}
        <div className="bg-[#f0f9ff] rounded-[2rem] p-5 border border-blue-100/50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Asking Price
              </p>

              <p className="text-2xl font-black text-[#769c2d]">
                ₱{Number(item.asking_price || 0).toLocaleString()}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onBid();
              }}
              disabled={!isVerified}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isVerified
                  ? "bg-[#769c2d] hover:bg-lime-700 text-white shadow-lg"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isVerified ? "Place Bid" : "Locked"}
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
  const [activeTab, setActiveTab] = useState("bid"); // 'bid' or 'question'
  const [bidAmount, setBidAmount] = useState(listing.asking_price || 0);
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleQuickSelect = (modifier) => {
    if (modifier === 0) setBidAmount(listing.asking_price);
    else {
      const adjustment = listing.asking_price * modifier;
      setBidAmount(Math.round(listing.asking_price + adjustment));
    }
  };

  const handleFormSubmit = async () => {
    setSubmitting(true);
    try {
      if (activeTab === "bid") {
        await onSubmit(listing.id, bidAmount, message);
      } else if (activeTab === "question") {
        await onSendMessage(listing.id, question);
      }
    } finally {
      setSubmitting(false);
    }
  };
  const quickQuestions = [
    "What specific parts are still functional?",
    "Can you provide more photos?",
    "Is pickup available today?",
    "Has the data been fully sanitized?",
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-8 border-b border-slate-50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              Contact Seller
            </h2>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">
              {listing.device_model} - ID: {listing.id?.slice(0, 8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-50 px-8 flex flex-shrink-0">
          {[
            { id: "bid", label: "Place Bid", icon: <Gavel size={16} /> },
            {
              id: "question",
              label: "Ask Question",
              icon: <MessageSquareText size={16} />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 py-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "border-[#769c2d] text-[#769c2d]"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-100"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="bg-emerald-50/50 p-5 rounded-3xl flex justify-between items-center border border-emerald-100/30">
            <div>
              <span className="text-[9px] font-black text-emerald-700 uppercase mb-1 block">
                Asking Price
              </span>
              <span className="text-xl font-black text-emerald-800">
                ₱{listing.asking_price?.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold bg-white/70 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-inner">
              <MapPin size={12} /> Barangay Marulas
            </span>
          </div>

          {activeTab === "bid" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* --- BIDDING FORM --- */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-[0.15em]">
                  Your Bid Amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">
                    ₱
                  </span>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                    className="w-full pl-10 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black text-2xl text-[#3285a1] focus:ring-2 focus:ring-[#3285a1]/20 focus:border-[#3285a1]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { modifier: 0, label: "Asking" },
                  { modifier: 0.05, label: "+5%" },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => handleQuickSelect(option.modifier)}
                    className="py-3.5 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Message to Seller (Optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-xs font-medium h-32 resize-none focus:ring-2 focus:ring-lime-100 focus:border-lime-200"
              />
              <div className="bg-lime-50/70 border border-lime-100/50 p-4 rounded-xl text-center text-lime-700 text-[11px] font-medium">
                <span className="font-bold">
                  Competitive bid - higher chance of acceptance
                </span>
              </div>
            </div>
          )}

          {activeTab === "question" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* --- QUESTION FORM --- */}
              <div className="bg-emerald-50 border border-emerald-100/50 p-4 rounded-xl text-emerald-800 text-[11px] font-medium flex items-center gap-3">
                <XCircle size={16} className="shrink-0" />
                <div>
                  <span className="font-bold block">
                    Have questions before bidding?
                  </span>
                  <span className="opacity-80">
                    Ask the seller about device condition, specific parts,
                    availability, or pickup arrangements.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-[0.15em]">
                  Your Message
                </label>
                <textarea
                  placeholder="Example: Is the battery still functional? Can you provide more photos of the device?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-xs font-medium h-48 resize-none focus:ring-2 focus:ring-lime-100 focus:border-lime-200"
                />
              </div>

              {/* Quick Questions Grid */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-[0.15em]">
                  Quick Questions:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuestion(q)}
                      className="text-left text-xs font-semibold text-slate-700 bg-white border border-slate-100 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- FOOTER BUTTONS --- */}
        <div className="p-8 pt-4 flex gap-6 border-t border-slate-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-4 font-black text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleFormSubmit}
            disabled={
              submitting || (activeTab === "question" && !question.trim())
            }
            className="flex-1 bg-[#769c2d] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-lime-900/20 disabled:opacity-50"
          >
            {submitting
              ? "Processing..."
              : activeTab === "bid"
                ? "Place Bid"
                : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HarvesterDashboard;
