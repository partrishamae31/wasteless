import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
// 1. Add this import at the top of the file
import CreateListingModal from "./CreateListingModal"; // Adjust path as needed
import SellerMessages from "./SellerMessages"; // Ensure the filename matches

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
  const [transactions, setTransactions] = useState([]);
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
  // Automatically select the first transaction if none is selected
  useEffect(() => {
    if (transactions.length > 0 && !selectedTxId) {
      setSelectedTxId(transactions.id);
    }
  }, [transactions]);
  const handleAcceptBid = async (bid) => {
    try {
      // 1. Update the bid status to 'accepted'
      const { error: bidUpdateError } = await supabase
        .from("bids")
        .update({ status: "accepted" })
        .eq("id", bid.id);

      if (bidUpdateError) throw bidUpdateError;

      // 2. LOCK THE LISTING: Update listing status to 'closed'
      // This is the step that prevents further bidding
      const { error: listingUpdateError } = await supabase
        .from("listings")
        .update({ status: "closed" })
        .eq("id", selectedListing.id);

      if (listingUpdateError) throw listingUpdateError;

      // 3. Insert the auto-message
      const { error: messageError } = await supabase.from("messages").insert([
        {
          listing_id: selectedListing.id,
          sender_id: session.user.id,
          receiver_id: bid.bidder_id,
          content: `Hello! I've accepted your bid of ₱${bid.amount.toLocaleString()} for the ${selectedListing.device_model}`,
          is_read: false,
        },
      ]);

      if (messageError) throw messageError;

      alert("Bid accepted! The listing is now closed to further bidding.");

      // 4. Refresh listings to show the 'closed' status in the UI
      if (typeof fetchListings === "function") fetchListings();

      setActiveTab("messages");
    } catch (error) {
      console.error("Error in bid acceptance:", error.message);
      alert(`Error: ${error.message}`);
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
          harvester:harvester_id (full_name),
          listing:listing_id (device_model, asking_price)
        `,
          )
          .eq("seller_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
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
      profiles:bidder_id (full_name) 
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800 relative">
      {/* Header Area */}
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
            <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Notifications
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {notifications.filter((n) => !n.is_read).length} unread
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  <button className="text-[10px] text-[#3285a1] font-bold hover:underline">
                    Mark all read
                  </button>
                  <X
                    className="text-slate-400 cursor-pointer hover:text-slate-600"
                    size={16}
                    onClick={() => setShowNotifications(false)}
                  />
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      icon={
                        notif.type === "bid" ? (
                          <Plus className="text-emerald-500" size={14} />
                        ) : notif.type === "message" ? (
                          <MessageSquare className="text-blue-500" size={14} />
                        ) : (
                          <ArrowLeftRight
                            className="text-purple-500"
                            size={14}
                          />
                        )
                      }
                      bg={
                        notif.type === "bid"
                          ? "bg-emerald-50"
                          : notif.type === "message"
                            ? "bg-blue-50"
                            : "bg-purple-50"
                      }
                      title={notif.title}
                      desc={notif.description}
                      time={new Date(notif.created_at).toLocaleDateString()}
                      unread={!notif.is_read}
                      // Add the delete prop here
                      onDelete={() => deleteNotification(notif.id)}
                    />
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-400 text-[10px] font-medium">
                    No new notifications
                  </div>
                )}
              </div>

              <button className="w-full py-3 text-center text-[#3285a1] text-[11px] font-bold border-t border-slate-50 hover:bg-slate-50 transition">
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
            <div className="text-[10px] text-emerald-500 flex items-center gap-1 justify-end">
              <CheckCircle size={10} /> Verified
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
                  <div className="text-xs font-bold">0.0</div>
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
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Listings", val: listings.length },
          { label: "Total Bids", val: totalBidsCount },
          { label: "Messages", val: "0" },
          { label: "Rating", val: "0.0" },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center"
          >
            <div className="text-2xl font-bold mb-1">{stat.val}</div>
            <div className="text-xs text-slate-400">{stat.label}</div>
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">My Listings</h2>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#3285a1] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition"
                >
                  <Plus size={18} /> Create Listing
                </button>
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
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">
                              {item.device_model}
                            </span>
                            <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase">
                              {item.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mb-2">
                            {item.condition}
                          </div>
                        </div>
                        <Package className="text-slate-200" size={32} />
                      </div>
                      {/* ... inside listings.map((item) => ( ... */}
                      <div className="flex justify-between items-center border-t border-slate-50 pt-4 mt-4">
                        <div className="flex gap-6 items-center">
                          {/* Asking Price Section */}
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                              Asking Price
                            </span>
                            <div className="text-sm font-bold text-slate-400">
                              ₱ {item.asking_price?.toLocaleString() || "0.00"}
                            </div>
                          </div>
                          <div className="flex flex-col border-l border-slate-100 pl-6">
                            <span className="text-[10px] text-[#3285a1] uppercase font-black tracking-widest mb-1">
                              Current Highest Bid
                            </span>
                            <div className="text-sm font-bold text-[#3285a1]">
                              {item.bids && item.bids.length > 0 ? (
                                <>
                                  ₱{" "}
                                  {Math.max(
                                    ...item.bids.map((b) => b.amount),
                                  ).toLocaleString()}
                                </>
                              ) : (
                                <span className="text-slate-300 font-medium">
                                  No bids yet
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bids Count Section */}
                          <div className="flex flex-col border-l border-slate-100 pl-6">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                              Bids Received
                            </span>
                            <div className="text-sm font-bold text-slate-700">
                              {item.bids?.length || 0}{" "}
                              {item.bids?.length === 1 ? "Bid" : "Bids"}
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-emerald-500 flex items-center gap-1 font-bold bg-emerald-50 px-2 py-1 rounded-md">
                          <CheckCircle size={10} /> Verified
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-10 rounded-2xl text-center border-2 border-dashed border-slate-200">
                    <p className="text-slate-400">No active listings found.</p>
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
                      <h3 className="font-bold text-slate-800 text-sm">Bids</h3>
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
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {listingBids.map((bid) => (
                      <div
                        key={bid.id}
                        className="p-4 rounded-xl border border-slate-50 bg-slate-50/30"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            {/* Displays the Harvester's Name instead of ID */}
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Bidder
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              {bid.profiles?.full_name || "Anonymous Harvester"}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-[#3285a1]">
                            ₱{bid.amount.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleAcceptBid(bid)}
                            className="flex-1 bg-[#3285a1] text-white py-2 rounded-lg text-[10px] font-bold hover:bg-[#2a6f87] transition-colors"
                          >
                            Accept
                          </button>
                          <button className="flex-1 border border-slate-200 text-slate-400 py-2 rounded-lg text-[10px] font-bold">
                            Decline
                          </button>
                        </div>
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
          <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
            {/* 1. TOP SELECTION BAR (The cards at the top) */}
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {transactions.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className={`flex-shrink-0 w-64 p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedTxId === tx.id
                      ? "border-[#2d7a7f] bg-teal-50/30 ring-4 ring-teal-50"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-xs truncate w-32">
                      {tx.listing?.device_model}
                    </h4>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        tx.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {tx.status === "completed"
                        ? "Completed"
                        : "Meetup Scheduled"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    ID: {tx.id.slice(0, 8)}
                  </p>
                  <p className="text-sm font-black text-[#2d7a7f] mt-1">
                    ₱{tx.amount?.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>

            {/* 2. DETAILED VIEW (The one-by-one section) */}
            {transactions.find((t) => t.id === selectedTxId) ? (
              (() => {
                const tx = transactions.find((t) => t.id === selectedTxId);
                return (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    {/* Header matches Mockup */}
                    <div className="bg-gradient-to-r from-[#2d7a7f] to-[#16A34A] p-8 text-white flex justify-between items-end">
                      <div>
                        <h2 className="text-3xl font-black mb-1">
                          {tx.listing?.device_model}
                        </h2>
                        <p className="text-xs opacity-70 font-mono tracking-tighter">
                          TRANSACTION ID: {tx.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          Status: {tx.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-10">
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em] mb-10">
                        Transaction Progress
                      </h3>

                      {/* Vertical Progress Tracker */}
                      <div className="relative space-y-10 mb-16 ml-2">
                        <div className="flex items-start">
                          <div className="relative z-10 p-2 rounded-full border-2 bg-blue-50 border-blue-500 text-blue-500">
                            <CheckCheck size={18} />
                          </div>
                          <div className="ml-8">
                            <p className="text-sm font-bold text-slate-800">
                              Matched with Buyer
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="relative z-10 p-2 rounded-full border-2 bg-white border-slate-200 text-slate-300">
                            <Clock size={18} />
                          </div>
                          <div className="ml-8">
                            <p className="text-sm font-bold text-slate-400">
                              Handover Confirmed
                            </p>
                            <p className="text-xs text-slate-300 italic">
                              In Progress
                            </p>
                          </div>
                        </div>
                        {/* Connector */}
                        <div className="absolute left-[17px] top-[34px] w-0.5 h-[40px] bg-slate-100"></div>
                      </div>

                      {/* Grid Information */}
                      <div className="grid grid-cols-2 gap-16 pt-10 border-t border-slate-50">
                        <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            Transaction Details
                          </h4>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Buyer</span>
                            <span className="font-bold text-slate-700">
                              {tx.harvester?.full_name}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                            <span className="text-slate-400 font-bold">
                              Total Amount
                            </span>
                            <span className="text-2xl font-black text-[#2d7a7f]">
                              ₱{tx.amount?.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            Meetup Information
                          </h4>
                          <div className="flex items-start">
                            <MapPin
                              className="text-[#2d7a7f] mr-4 mt-1"
                              size={20}
                            />
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">
                                Location
                              </p>
                              <p className="text-sm font-bold text-slate-700">
                                {tx.barangay}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Calendar
                              className="text-[#2d7a7f] mr-4 mt-1"
                              size={20}
                            />
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">
                                Scheduled Time
                              </p>
                              <p className="text-sm font-bold text-slate-700">
                                {new Date(tx.meetup_date).toLocaleDateString()}{" "}
                                @ {tx.meetup_time}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Confirm Button */}
                      <div className="mt-12">
                        <button className="w-full bg-[#16A34A] text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#15803d] transition-all shadow-lg shadow-green-100">
                          Confirm Handover
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="bg-white p-20 rounded-[2rem] border border-dashed border-slate-200 text-center text-slate-400">
                Select a transaction listing from above to view details.
              </div>
            )}
          </div>
        )}
      </div>
      {/* Profile Modal Overlay */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[24px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 relative">
            {/* Modal Header Gradient */}
            <div className="bg-gradient-to-br from-[#38A3A5] to-[#57CC99] p-10 text-white relative">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-6 right-6 hover:opacity-70 transition-opacity z-10"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-5 mb-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-semibold border-2 border-white/30">
                    {session.user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full text-slate-600 shadow-md border border-slate-100">
                    <Camera
                      size={12}
                      fill="currentColor"
                      className="text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold">
                    {profileData?.full_name || session.user.email.split("@")[0]}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-white/20 px-3 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider">
                      <CheckCircle size={10} /> Verified Seller
                    </span>
                    <span className="text-[11px] opacity-90">
                      Active since{" "}
                      {formatDate(
                        profileData?.created_at || session.user?.created_at,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-sm">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="font-bold">0.0</span>
                <span className="opacity-80 text-xs">(0 reviews)</span>
              </div>
            </div>

            <div className="p-8">
              <div className="flex justify-end mb-6 -mt-2">
                <button className="flex items-center gap-2 bg-[#3285a1] hover:bg-[#2a6f87] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                  <Pencil size={14} /> Edit Profile
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 mb-10">
                {[
                  { label: "Total Listings", val: listings.length },
                  {
                    label: "Items Sold",
                    val: listings.filter(
                      (item) =>
                        item.status?.toLowerCase() === "meetup scheduled",
                    ).length,
                  },
                  { label: "Rating", val: "0.0" },
                  { label: "Reviews", val: "0" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="bg-[#F2FFF9] p-4 rounded-xl text-center border border-[#E8F5EE]"
                  >
                    <div className="text-xl font-black text-slate-800">
                      {s.val}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mt-1">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 text-base">
                  Personal Information
                </h3>

                <div className="space-y-5">
                  <InfoItem
                    icon={<User size={18} className="text-slate-400" />}
                    label="Full Name"
                    val={profileData?.full_name || "Maria Santos"}
                  />
                  <InfoItem
                    icon={<Mail size={18} className="text-slate-400" />}
                    label="Email Address"
                    val={session.user.email}
                  />
                  <InfoItem
                    icon={<Phone size={18} className="text-slate-400" />}
                    label="Phone Number"
                    val={profileData?.contact_number || "+63 917 123 4567"}
                  />
                  <InfoItem
                    icon={<MapPin size={18} className="text-slate-400" />}
                    label="Barangay"
                    val={profileData?.barangay || "Barangay Karuhatan"}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <CreateListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={session.user.id} // use this instead
      />
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
    className={`p-4 flex gap-3 hover:bg-slate-50 transition cursor-pointer relative ${
      unread ? "bg-blue-50/30" : "bg-transparent"
    }`}
  >
    <div
      className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center shrink-0`}
    >
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <h4
          className={`text-[11px] font-bold ${unread ? "text-slate-900" : "text-slate-600"}`}
        >
          {title}
        </h4>
        {unread && (
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></div>
        )}
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed my-1">{desc}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-[9px] text-slate-400">{time}</span>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent clicking the notification itself
            onDelete();
          }}
          className="text-[9px] text-slate-400 hover:text-red-500 font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);
export default SellerDashboard;
