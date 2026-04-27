import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
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
} from "lucide-react";

const HarvesterDashboard = ({ session, onLogout }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse"); // Switch to "messages" to see the update
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
  const handleReverify = () => {
    setActiveTab("settings");
  };
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5);
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

          const newNotif = {
            id: payload.new.id,
            title: "New Listing Available",
            content: `${payload.new.device_model} was just posted!`,
            created_at: new Date().toISOString(),
            is_read: false,
          };

          setNotifications((prev) => [newNotif, ...prev]);

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
      alert(
        "REQ-2: Only verified harvesters can place bids. Please wait for admin approval.",
      );
      return;
    }
    try {
      const { data: bidData, error: bidError } = await supabase
        .from("bids")
        .insert([
          {
            listing_id: listingId,
            bidder_id: session.user.id,
            amount: amount,
          },
        ])
        .select();

      if (bidError) throw bidError;

      if (message.trim()) {
        await supabase.from("messages").insert([
          {
            listing_id: listingId,
            sender_id: session.user.id,
            content: message,
          },
        ]);
      }

      alert("Bid placed successfully!");
      setSelectedListing(null);
    } catch (err) {
      console.error("ERROR:", err);
      alert("Error placing bid: " + err.message);
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
                <button className="text-[10px] font-bold text-[#769c2d]">
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
                            Just now
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
        <StatCard label="Active Alerts" value="0" />
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
          icon={<Box size={16} />}
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
              isVerified={isVerified} // --- ADD THIS PROP HERE ---
            />
          ))}
        </div>
      ) : activeTab === "messages" ? (
        <MessagesView session={session} />
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
          onSubmit={handlePlaceBid}
        />
      )}
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

  useEffect(() => {
    if (!selectedChat?.listing_id) return;

    const channel = supabase
      .channel("chat-room")
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

// --- REMAINING HELPER COMPONENTS (StatCard, NavBtn, etc.) ---
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
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[#3285a1] text-[9px] font-black uppercase tracking-widest shadow-sm">
            {item.condition || "Defective"}
          </span>
        </div>
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
            disabled={!isVerified} // Pass isVerified as a prop to ListingCard
            className={`${
              isVerified
                ? "bg-[#769c2d] text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            } px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-transform`}
          >
            {isVerified ? "Place Bid" : "Pending Verification"}
          </button>
        </div>
      </div>
    </div>
  );
};

const PlaceBidModal = ({ listing, onClose, onSubmit }) => {
  const [bidAmount, setBidAmount] = useState(listing.asking_price || 0);
  const [message, setMessage] = useState("");
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
      await onSubmit(listing.id, bidAmount, message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 border-b border-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800">Place Bid</h2>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">
              {listing.device_model}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="p-8 space-y-8">
          <div className="bg-emerald-50/50 p-5 rounded-3xl flex justify-between items-center border border-emerald-100/30">
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter">
              Asking Price
            </span>
            <span className="text-xl font-black text-emerald-800">
              ₱{listing.asking_price?.toLocaleString()}
            </span>
          </div>
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
                className="w-full pl-10 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black text-2xl text-[#3285a1]"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleQuickSelect(-0.1)}
              className="py-3 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50"
            >
              -10%
            </button>
            <button
              onClick={() => handleQuickSelect(0)}
              className="py-3 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50"
            >
              Asking
            </button>
            <button
              onClick={() => handleQuickSelect(0.05)}
              className="py-3 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50"
            >
              +5%
            </button>
          </div>
          <textarea
            placeholder="Message to Seller..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-xs font-medium h-32 resize-none"
          />
        </div>
        <div className="p-8 pt-0 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 font-black text-xs text-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={handleFormSubmit}
            disabled={submitting}
            className="flex-1 bg-[#769c2d] text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-lime-900/20 disabled:opacity-50"
          >
            {submitting ? "Processing..." : "Place Bid"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HarvesterDashboard;
