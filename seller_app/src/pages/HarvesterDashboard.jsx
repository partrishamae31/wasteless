import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import HarvesterAlerts from "./HarvesterAlerts";
import UrbanMineMap from "./UrbanMineMap";
import InventoryView from "./InventoryView";
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
} from "lucide-react";

const HarvesterDashboard = ({ session, onLogout }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedListing, setSelectedListing] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "Loading...",
    initials: "??",
  });
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const isVerified = verificationStatus === "verified";
  const [rejectionReason, setRejectionReason] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [transactions, setTransactions] = useState([]);

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const handleCompleteHandover = async (transactionId) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "completed" })
        .eq("id", transactionId);

      if (error) throw error;

      const updatedTime = new Date().toISOString();

      // 1. Update the main list
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId
            ? { ...tx, status: "completed", updated_at: updatedTime }
            : tx,
        ),
      );

      // 2. Update the currently viewed transaction explicitly
      setSelectedTransaction((prev) => {
        if (prev?.id === transactionId) {
          return { ...prev, status: "completed", updated_at: updatedTime };
        }
        return prev;
      });

      setShowRatingModal(true);
    } catch (err) {
      console.error("Update failed:", err.message);
      alert("Error updating status: " + err.message);
    }
  };
  const fetchTransactions = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("transactions") // Query transactions table directly
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
          // When a bid status changes, refresh the list
          fetchMyBids();
          // Also refresh transactions if the status became 'accepted'
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
        profiles:seller_id (full_name)
      )
    `,
      )
      .eq("bidder_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) setMyBids(data);
  };

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
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const listingsChannel = supabase
      .channel("realtime-listings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        (payload) => {
          console.log("Change received!", payload); // <-- Check your browser console!

          // const newNotif = {
          //   id: payload.new.id,
          //   title: "New Listing Available",
          //   content: `${payload.new.device_model} was just posted!`,
          //   created_at: new Date().toISOString(),
          //   is_read: false,
          // };

          // setNotifications((prev) => [newNotif, ...prev]);

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
          .map((n) => n)
          .join("")
          .toUpperCase()
          .slice(0, 2);

        setProfileData({
          full_name: name,
          initials: initials,
        });
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
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data);
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
    <div className="min-h-screen bg-[#f8fafc] p-8 font-sans">
      {/* --- TOP HEADER SECTION --- */}
      <div className="flex justify-end items-center mb-8 gap-6">
        <div className="relative cursor-pointer">
          <Bell
            className="text-slate-400 hover:text-slate-600 transition-colors"
            size={22}
            onClick={() => setShowNotifications(!showNotifications)}
          />
          {notifications.filter((n) => !n.is_read).length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#f8fafc]">
              {notifications.filter((n) => !n.is_read).length}
            </span>
          )}

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-800 text-xs uppercase">
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
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.is_read ? "bg-lime-50/30" : ""}`}
                    >
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-lime-100 rounded-xl flex items-center justify-center text-[#769c2d]">
                          <Package size={14} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-800">
                            {n.title}
                          </p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-1">
                            {n.content}
                          </p>
                          <p className="text-[8px] text-slate-300 font-bold mt-2 uppercase">
                            {new Date(n.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                    No new alerts
                  </div>
                )}
              </div>
              <button className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors bg-slate-50/50">
                View All Notifications
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <div
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all"
          >
            <div className="text-right hidden sm:block">
              {/* REMOVED TECH SOLUTIONS SHOP - NOW USING DATABASE NAME */}
              <p className="font-bold text-slate-700 text-[11px] leading-tight">
                {profileData.full_name}
              </p>
              {verificationStatus === "verified" ? (
                <p className="text-[#769c2d] text-[9px] font-bold flex items-center justify-end gap-1">
                  <CheckCircle2 size={10} /> Verified
                </p>
              ) : verificationStatus === "rejected" ? (
                <p className="text-red-500 text-[9px] font-bold flex items-center justify-end gap-1">
                  <XCircle size={10} /> Rejected
                </p>
              ) : (
                <p className="text-orange-400 text-[9px] font-bold flex items-center justify-end gap-1">
                  <Clock size={10} /> Pending
                </p>
              )}
            </div>
            <div className="w-9 h-9 bg-[#4a7c59] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner">
              {profileData.initials}
            </div>
          </div>

          {isProfileOpen && (
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
                  <MenuLink icon={<User size={15} />} label="View Profile" />
                  <MenuLink icon={<Settings size={15} />} label="Settings" />
                  <div className="h-[1px] bg-slate-50 my-2 mx-2"></div>
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors text-xs font-bold"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
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
          value={notifications
            .filter((n) => n.type === "alert_match")
            .length.toString()}
        />
        <StatCard label="Pending Bids" value="0" />
        <StatCard label="Acquired Parts" value="0" />
        <StatCard label="Total Spent" value="0" isPrice />
      </div>

      {/* --- NAVIGATION --- */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white/50 p-2 rounded-[2rem] border border-white/50 backdrop-blur-sm">
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
          label="Barangay Leaderboard"
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
        <NavBtn
          active={activeTab === "inventory"}
          onClick={() => setActiveTab("inventory")}
          icon={<Package size={16} />}
          label="Inventory"
        />
      </div>

      {/* --- TAB CONTENT --- */}
      {activeTab === "browse" ? (
        <div className="grid grid-cols-2 gap-8">
          {listings.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              onBid={() => setSelectedListing(item)}
              isVerified={isVerified}
            />
          ))}
        </div>
      ) : activeTab === "bids" ? (
        <MyBidsView bids={myBids} />
      ) : activeTab === "transactions" ? (
        <TransactionsView
          transactions={transactions}
          selectedTransaction={selectedTransaction}
          onSelect={setSelectedTransaction}
          handleCompleteHandover={handleCompleteHandover} // Add this prop
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

  return (
    <div className="space-y-6">
      {/* Mini Stats Bar matching image_f1901c.png */}
      <div className="grid grid-cols-3 gap-6">
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
      <div className="space-y-4">
        {bids.map((bid) => (
          <div
            key={bid.id}
            className={`bg-white rounded-[2.5rem] border-2 p-8 transition-all ${
              bid.status === "accepted"
                ? "border-emerald-100"
                : bid.status === "countered"
                  ? "border-blue-100"
                  : "border-orange-50"
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-black text-xl text-slate-800">
                    {bid.listings?.device_model}
                  </h3>
                  <span
                    className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${
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
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Seller: {bid.listings?.profiles?.full_name} • Barangay Marulas
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

            <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[1.5rem] mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase mb-2 tracking-widest">
                  Your Bid
                </p>
                <p className="text-2xl font-black text-slate-700">
                  ₱{bid.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase mb-2 tracking-widest">
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

            <div className="flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              <span>
                Submitted {new Date(bid.created_at).toLocaleDateString()}
              </span>
              {bid.status === "accepted" && (
                <button className="flex items-center gap-2 text-[#769c2d] hover:underline">
                  <MessageSquare size={14} /> Contact Seller
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TransactionsView = ({
  transactions = [],
  selectedTransaction,
  onSelect,
  handleCompleteHandover,
}) => {
  return (
    <div className="flex gap-8 h-[700px]">
      {/* Left Sidebar: Active Transactions List */}
      <div className="w-1/3 space-y-4 overflow-y-auto pr-2">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
          Active Transactions
        </h2>
        {transactions.map((tx) => {
          const isCancelled = tx.status === "cancelled";
          return (
            <button
              key={tx.id}
              onClick={() => onSelect(tx)}
              className={`w-full text-left p-6 rounded-3xl border-2 transition-all ${
                selectedTransaction?.id === tx.id
                  ? isCancelled
                    ? "border-red-200 bg-white shadow-md"
                    : "border-[#769c2d] bg-white shadow-md"
                  : "border-slate-50 bg-slate-50/50 hover:bg-white"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-sm text-slate-800">
                  {tx.listings?.device_model}
                </h3>
                <span
                  className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${
                    isCancelled
                      ? "bg-red-100 text-red-500"
                      : "bg-purple-100 text-purple-600"
                  }`}
                >
                  {isCancelled ? "Cancelled" : "Meetup Scheduled"}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mb-2">
                Seller: {tx.listings?.profiles?.full_name}
              </p>
              <p
                className={`text-lg font-black ${isCancelled ? "text-[#3285a1]" : "text-[#3285a1]"}`}
              >
                ₱{tx.amount?.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-3 text-[9px] font-bold text-slate-300">
                <MessageSquare size={10} /> 3 messages
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Content: Transaction Details & Timeline */}
      {selectedTransaction ? (
        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm">
          {/* Header */}
          <div className="bg-[#3285a1] p-8 text-white flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black">
                {selectedTransaction.listings?.device_model}
              </h2>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">
                ID: {selectedTransaction.id?.slice(0, 8)}
              </p>
            </div>
            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase">
              {selectedTransaction.status === "cancelled"
                ? "Cancelled"
                : "Meetup Scheduled"}
            </span>
          </div>

          <div className="p-8 space-y-8 flex-1 overflow-y-auto">
            {/* Stepper Timeline */}
            <div className="flex items-center justify-between px-10 relative">
              <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
              {[
                { label: "Matched", status: selectedTransaction.status },
                {
                  label: "Meetup Scheduled",
                  status: selectedTransaction.status,
                },
                {
                  label: "Handover Complete",
                  status: selectedTransaction.status,
                },
              ].map((step, i) => {
                const isCompleted = selectedTransaction.status === "completed";
                const isCancelled = selectedTransaction.status === "cancelled";
                const stepFinished = isCompleted || (!isCancelled && i < 2);

                return (
                  <div
                    key={i}
                    className="relative z-10 flex flex-col items-center gap-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isCancelled
                          ? "bg-white border-red-400 text-red-500"
                          : stepFinished
                            ? "bg-[#769c2d] border-[#769c2d] text-white"
                            : "bg-white border-slate-200 text-slate-300"
                      }`}
                    >
                      {isCancelled ? (
                        <XCircle size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                    </div>
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest ${
                        isCancelled
                          ? "text-red-800"
                          : isCompleted
                            ? "text-[#769c2d]"
                            : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {selectedTransaction.status === "completed" ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4">
                <div className="p-2 bg-white rounded-full text-[#769c2d] border border-emerald-100">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-800">
                    Transaction Completed
                  </h4>
                  <p className="text-[10px] font-bold text-emerald-400 mt-1">
                    Finished on{" "}
                    {new Date(
                      selectedTransaction.updated_at,
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs font-medium text-emerald-600 mt-2">
                    The handover was successful. Thank you for using Wasteless
                    to manage your e-waste!
                  </p>
                </div>
              </div>
            ) : selectedTransaction.status === "cancelled" ? (
              <>
                {/* Cancelled Indicator Badge */}
                <div className="flex justify-center">
                  <span className="bg-red-100 text-red-500 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                    Cancelled
                  </span>
                </div>

                {/* Seller & Amount Info */}
                <div className="grid grid-cols-2 gap-8 px-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Seller
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">
                        {selectedTransaction.listings?.profiles?.full_name}
                      </span>
                      <span className="flex items-center gap-1 text-[#769c2d] text-[10px] font-bold border border-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle size={10} /> Verified
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 text-right">
                      Amount
                    </p>
                    <p className="text-xl font-black text-[#3285a1] text-right">
                      ₱{selectedTransaction.amount?.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Red Alert Box */}
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-2 bg-white rounded-full text-red-500 border border-red-100">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-red-800">
                      Transaction Cancelled
                    </h4>
                    <p className="text-[10px] font-bold text-red-400 mt-1">
                      Cancelled on{" "}
                      {selectedTransaction.updated_at
                        ? new Date(
                            selectedTransaction.updated_at,
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Recent Date"}
                    </p>
                    <p className="text-xs font-medium text-red-500 mt-2">
                      The seller cancelled this transaction. You can browse for
                      other listings.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Standard Meetup Card */}
                {/* Standard Meetup Card */}
                <div className="bg-purple-50/50 border border-purple-100 rounded-[2rem] p-8">
                  <div className="flex items-center gap-3 text-purple-600 font-black text-xs uppercase mb-6">
                    <Calendar size={18} /> Meetup Scheduled
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <MapPin size={16} className="text-slate-400 mt-1" />
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Location
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                          {selectedTransaction.barangay}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Clock size={16} className="text-slate-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Date & Time
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                          {selectedTransaction.meetup_date} at{" "}
                          {selectedTransaction.meetup_time}
                        </p>

                        {/* ADD THIS BUTTON HERE */}
                        {selectedTransaction.meetup_time === "To be agreed" && (
                          <button
                            onClick={() => onSelect(selectedTransaction)} // Or navigate to your Chat tab
                            className="mt-2 text-[10px] bg-white border border-purple-200 text-purple-600 px-3 py-1 rounded-lg font-black uppercase hover:bg-purple-50 transition-colors"
                          >
                            Chat Seller to Finalize Time
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      handleCompleteHandover(selectedTransaction.id)
                    }
                    className="flex-1 bg-[#3285a1] hover:bg-[#2a6f87] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} /> Confirm Handover Complete
                  </button>
                  <button className="px-8 border border-red-200 text-red-400 hover:bg-red-50 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Messages Placeholder */}
            <div className="pt-4 border-t border-slate-50">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">
                Messages
              </h3>
              <div className="bg-slate-50/50 h-32 rounded-2xl border border-dashed border-slate-200"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
          <Calendar size={48} className="text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold">
            Select a transaction to view details
          </p>
        </div>
      )}
    </div>
  );
};
const AlertsView = ({ notifications }) => {
  return (
    <div className="bg-white rounded-[3rem] shadow-sm border border-white p-8 min-h-[500px]">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-800">My Alerts</h2>
        <span className="bg-lime-100 text-[#769c2d] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          {notifications.length} Total
        </span>
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((n) => (
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
                  <h4 className="font-bold text-slate-800 text-sm">
                    {n.title}
                  </h4>
                  {n.type === "alert_match" && (
                    <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">
                      Match
                    </span>
                  )}
                </div>
                {/* FIX: Use description first, then content as a fallback */}
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
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Bell size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-xs uppercase tracking-widest text-center">
              No matches found yet.
              <br />
              <span className="text-[9px] font-medium opacity-50">
                We'll notify you when items match your criteria.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
// --- MESSAGES VIEW COMPONENT ---

const MessagesView = ({ session }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
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
          profiles:seller_id (full_name) 
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
        <div className="space-y-1">
          {conversations.map((chat) => (
            <div
              key={chat.listing_id}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 rounded-[1.5rem] cursor-pointer transition-all flex items-start gap-4 ${
                selectedChat?.listing_id === chat.listing_id
                  ? "bg-[#f0f9ff]"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-700 text-xs truncate">
                  {/* Displays the Seller Name instead of "Conversation" */}
                  {chat.listings?.profiles?.full_name || "Unknown Seller"}
                </h4>
                <p className="text-[10px] font-bold text-[#3285a1]">
                  {chat.listings?.device_model}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="col-span-8 flex flex-col bg-slate-50/30">
        {selectedChat ? (
          <>
            <div className="p-6 bg-white border-b border-slate-50">
              <h3 className="font-black text-slate-800 text-sm">
                {selectedChat.listings?.profiles?.full_name}
                <span className="font-medium text-slate-400 ml-2">
                  ({selectedChat.listings?.device_model})
                </span>
              </h3>
            </div>

            <div className="flex-1 p-8 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === session.user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-4 rounded-2xl max-w-[70%] text-xs font-medium shadow-sm ${
                      msg.sender_id === session.user.id
                        ? "bg-[#769c2d] text-white rounded-tr-none"
                        : "bg-white text-slate-600 rounded-tl-none border border-slate-100"
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
  // A listing is locked if its status is NOT "active"
  const isLocked = item.status !== "active";
  const displayImage =
    item.images && item.images.length > 0 ? item.images : null;
  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-white relative group flex flex-col">
      <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.device_model}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <Package size={40} strokeWidth={1} />
            <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">
              No Image Provided
            </p>
          </div>
        )}
      </div>
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-xl text-slate-800 tracking-tight">
              {item.device_model}
            </h3>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">
              ID: {item.id?.slice(0, 8)}
            </p>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl">
            <LayoutGrid size={18} className="text-slate-400" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-6 font-medium line-clamp-2">
          {item.description ||
            "Verified local resource available for harvesting."}
        </p>
        <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-6 font-bold">
          <span className="flex items-center gap-1.5">
            <MapPin size={16} className="text-[#769c2d]" /> Barangay Marulas
          </span>
        </div>
        <div className="flex justify-between items-end pt-6 border-t border-slate-50 mt-auto">
          <div>
            <p className="text-[9px] font-black text-slate-200 uppercase mb-1">
              Asking Price
            </p>
            <p className="text-2xl font-black text-[#3285a1]">
              ₱{item.asking_price?.toLocaleString() || "0"}
            </p>
          </div>
          <button
            onClick={onBid}
            disabled={!isVerified || isLocked}
            // Use flex to align icon and text
            className={`${
              isVerified && !isLocked
                ? "bg-[#769c2d] text-white hover:scale-105"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            } px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2`}
          >
            {!isVerified ? (
              // Add icon and updated text
              <>
                {" "}
                <MessageSquare size={14} /> Pending Verification
              </>
            ) : isLocked ? (
              <>
                {" "}
                <MessageSquare size={14} /> Bidding Closed
              </>
            ) : (
              // The main button state
              <>
                {" "}
                <MessageSquare size={14} /> Bid or Message
              </>
            )}
          </button>
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
