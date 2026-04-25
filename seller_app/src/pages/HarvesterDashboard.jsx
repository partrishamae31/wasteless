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
} from "lucide-react";

const HarvesterDashboard = ({ session, onLogout }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse"); // Switch to "messages" to see the update
  const [selectedListing, setSelectedListing] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
    try {
      // 1. Insert the Bid
      const { data: bidData, error: bidError } = await supabase
        .from("bids")
        .insert([{
          listing_id: listingId,
          bidder_id: session.user.id,
          amount: amount,
        }])
        .select();

      if (bidError) throw bidError;

      // 2. If there's a message, start the conversation thread
      if (message.trim()) {
        await supabase.from("messages").insert([{
          listing_id: listingId,
          sender_id: session.user.id,
          content: message,
        }]);
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
          <Bell className="text-slate-400 hover:text-slate-600 transition-colors" size={22} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#f8fafc]">3</span>
        </div>

        <div className="relative">
          <div
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="font-bold text-slate-700 text-[11px] leading-tight">Tech Solutions Shop</p>
              <p className="text-[#769c2d] text-[9px] font-bold flex items-center justify-end gap-1">
                <CheckCircle2 size={10} /> Verified
              </p>
            </div>
            <div className="w-9 h-9 bg-[#4a7c59] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner">TS</div>
          </div>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)}></div>
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-50 z-20 overflow-hidden">
                <div className="bg-gradient-to-br from-[#4a7c59] to-[#769c2d] p-5 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-sm">TS</div>
                    <div>
                      <p className="font-bold text-xs">Tech Solutions Shop</p>
                      <p className="text-[9px] text-white/80">{session?.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-center">
                    <div className="flex-1 bg-white/10 py-1.5 rounded-lg font-bold text-[10px]">⭐ 4.8 Rating</div>
                    <div className="flex-1 bg-white/10 py-1.5 rounded-lg font-bold text-[10px]">📦 32 Buys</div>
                  </div>
                </div>
                <div className="p-3">
                  <MenuLink icon={<User size={15} />} label="View Profile" />
                  <MenuLink icon={<Settings size={15} />} label="Settings" />
                  <MenuLink icon={<Award size={15} />} label="Achievements" />
                  <div className="h-[1px] bg-slate-50 my-2 mx-2"></div>
                  <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors text-xs font-bold">
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <StatCard label="Active Alerts" value="0" />
        <StatCard label="Pending Bids" value="0" />
        <StatCard label="Acquired Parts" value="0" />
        <StatCard label="Total Spent" value="0" isPrice />
      </div>

      {/* --- NAVIGATION --- */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white/50 p-2 rounded-[2rem] border border-white/50 backdrop-blur-sm">
        <NavBtn active={activeTab === "browse"} onClick={() => setActiveTab("browse")} icon={<Search size={16} />} label="Browse Listings" />
        <NavBtn active={activeTab === "map"} onClick={() => setActiveTab("map")} icon={<Map size={16} />} label="Urban Mine Map" />
        <NavBtn active={activeTab === "leaderboard"} onClick={() => setActiveTab("leaderboard")} icon={<Trophy size={16} />} label="Barangay Leaderboard" />
        <NavBtn active={activeTab === "alerts"} onClick={() => setActiveTab("alerts")} icon={<Bell size={16} />} label="My Alerts" />
        <NavBtn active={activeTab === "messages"} onClick={() => setActiveTab("messages")} icon={<MessageSquare size={16} />} label="Messages" />
        <NavBtn active={activeTab === "inventory"} onClick={() => setActiveTab("inventory")} icon={<Box size={16} />} label="Inventory" />
      </div>

      {/* --- TAB CONTENT --- */}
      {activeTab === "browse" ? (
        <div className="grid grid-cols-2 gap-8">
          {listings.map((item) => (
            <ListingCard key={item.id} item={item} onBid={() => setSelectedListing(item)} />
          ))}
        </div>
      ) : activeTab === "messages" ? (
        <MessagesView session={session} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
           <LayoutGrid size={48} className="mb-4 opacity-20" />
           <p className="font-bold text-sm uppercase tracking-widest">Section Coming Soon</p>
        </div>
      )}

      {selectedListing && (
        <PlaceBidModal listing={selectedListing} onClose={() => setSelectedListing(null)} onSubmit={handlePlaceBid} />
      )}
    </div>
  );
};

// --- MESSAGES VIEW COMPONENT ---

const MessagesView = ({ session }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState("");

  // Sample data for UI preview - Replace with real Supabase query later
  useEffect(() => {
    // We use selectedChat?.listing_id to ensure we only listen 
    // to messages for the item currently on screen
    if (!selectedChat?.listing_id) return;

    const channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${selectedChat.listing_id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const { error } = await supabase
      .from('messages')
      .insert([
        {
          content: messageText,
          sender_id: session.user.id,
          // If you are Harvester, receiver is listing owner. 
          // If you are Seller, receiver is the bidder.
          receiver_id: selectedChat.other_party_id, 
          listing_id: selectedChat.listing_id,
        },
      ]);

    if (error) {
      console.error("Error sending message:", error.message);
    } else {
      setMessageText(""); // Clear input after sending
    }
  };

  return (
    <div className="grid grid-cols-12 gap-8 bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden min-h-[600px]">
      {/* Sidebar: Message List */}
      <div className="col-span-4 border-r border-slate-50 p-6">
        <div className="mb-6 px-2">
          <h2 className="text-xl font-black text-slate-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 text-xs font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-[#769c2d]/20 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          {conversations.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChat(chat.id)}
              className={`p-4 rounded-[1.5rem] cursor-pointer transition-all flex items-start gap-4 ${selectedChat === chat.id ? 'bg-[#f0f9ff] border border-[#e0f2fe]' : 'hover:bg-slate-50'}`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-400">
                <User size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h4 className="font-bold text-slate-700 text-xs truncate">{chat.name}</h4>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 bg-[#769c2d] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{chat.unread}</span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-[#3285a1] mb-1">{chat.item}</p>
                <p className="text-[10px] text-slate-400 truncate leading-relaxed">{chat.lastMsg}</p>
                <p className="text-[9px] text-slate-300 mt-2 font-bold uppercase">{chat.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="col-span-8 flex flex-col bg-slate-50/30">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-6 bg-white border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-sm">Maria Santos</h3>
                <p className="text-[10px] font-bold text-slate-300 flex items-center gap-2">
                  <Box size={12} /> iPhone 11
                </p>
              </div>
              <div className="bg-orange-50 px-4 py-2 rounded-xl flex flex-col items-end">
                <p className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter">Your Bid</p>
                <p className="text-sm font-black text-orange-600">₱3,200 <span className="text-[9px] opacity-60 ml-1">Pending</span></p>
              </div>
            </div>

            {/* Chat Bubbles */}
            <div className="flex-1 p-8 overflow-y-auto space-y-6">
              <div className="flex justify-end">
                <div className="bg-[#769c2d] text-white p-4 rounded-2xl rounded-tr-none max-w-[70%] shadow-md shadow-lime-900/10">
                  <p className="text-xs font-medium">Hi! I'm interested in the iPhone 11. Can you confirm the battery health percentage?</p>
                  <p className="text-[9px] opacity-70 text-right mt-2">2:15 PM</p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 text-slate-600 p-4 rounded-2xl rounded-tl-none max-w-[70%] shadow-sm">
                  <p className="text-xs font-medium">Hello! The battery health is at 85%. The device has been well-maintained.</p>
                  <p className="text-[9px] text-slate-300 mt-2">2:22 PM</p>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-[#769c2d] text-white p-4 rounded-2xl rounded-tr-none max-w-[70%] shadow-md shadow-lime-900/10">
                  <p className="text-xs font-medium">Great! What about the camera modules?</p>
                  <p className="text-[9px] opacity-70 text-right mt-2">2:28 PM</p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 text-slate-600 p-4 rounded-2xl rounded-tl-none max-w-[70%] shadow-sm">
                  <p className="text-xs font-medium">Yes, the battery is still in good condition</p>
                  <p className="text-[9px] text-slate-300 mt-2">2:30 PM</p>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-50">
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-6 text-xs font-medium placeholder:text-slate-300"
                />
                <button className="bg-[#769c2d] text-white p-4 rounded-2xl shadow-lg shadow-lime-900/20 hover:scale-105 active:scale-95 transition-all">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
             <MessageSquare size={40} strokeWidth={1} />
             <p className="text-xs font-bold uppercase tracking-widest">Select a conversation to start</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- REMAINING HELPER COMPONENTS (StatCard, NavBtn, etc.) ---
const StatCard = ({ label, value, isPrice }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-white flex flex-col items-center justify-center">
    <span className={`text-3xl font-black text-slate-800 tracking-tighter ${isPrice ? "text-slate-900" : ""}`}>
      {isPrice ? `₱${value}` : value}
    </span>
    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1">{label}</span>
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

const ListingCard = ({ item, onBid }) => {
  const displayImage = item.images && item.images.length > 0 ? item.images : null;
  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-white relative group flex flex-col">
      <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
        {displayImage ? (
          <img src={displayImage} alt={item.device_model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <Package size={40} strokeWidth={1} />
            <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">No Image Provided</p>
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
            <h3 className="font-bold text-xl text-slate-800 tracking-tight">{item.device_model}</h3>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">ID: {item.id?.slice(0, 8)}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl">
            <LayoutGrid size={18} className="text-slate-400" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-6 font-medium line-clamp-2">
          {item.description || "Verified local resource available for harvesting."}
        </p>
        <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-6 font-bold">
          <span className="flex items-center gap-1.5">
            <MapPin size={16} className="text-[#769c2d]" /> Barangay Marulas
          </span>
        </div>
        <div className="flex justify-between items-end pt-6 border-t border-slate-50 mt-auto">
          <div>
            <p className="text-[9px] font-black text-slate-200 uppercase mb-1">Asking Price</p>
            <p className="text-2xl font-black text-[#3285a1]">₱{item.asking_price?.toLocaleString() || "0"}</p>
          </div>
          <button 
            onClick={onBid} 
            className="bg-[#769c2d] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-lime-900/10 hover:scale-105 transition-transform"
          >
            Place Bid
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
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">{listing.device_model}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600">✕</button>
        </div>
        <div className="p-8 space-y-8">
          <div className="bg-emerald-50/50 p-5 rounded-3xl flex justify-between items-center border border-emerald-100/30">
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter">Asking Price</span>
            <span className="text-xl font-black text-emerald-800">₱{listing.asking_price?.toLocaleString()}</span>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-[0.15em]">Your Bid Amount</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">₱</span>
              <input 
                type="number" 
                value={bidAmount} 
                onChange={(e) => setBidAmount(Number(e.target.value))} 
                className="w-full pl-10 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black text-2xl text-[#3285a1]" 
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleQuickSelect(-0.1)} className="py-3 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50">-10%</button>
            <button onClick={() => handleQuickSelect(0)} className="py-3 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50">Asking</button>
            <button onClick={() => handleQuickSelect(0.05)} className="py-3 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50">+5%</button>
          </div>
          <textarea 
            placeholder="Message to Seller..." 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-xs font-medium h-32 resize-none" 
          />
        </div>
        <div className="p-8 pt-0 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 font-black text-xs text-slate-400">Cancel</button>
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