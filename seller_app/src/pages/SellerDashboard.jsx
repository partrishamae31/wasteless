import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
// 1. Add this import at the top of the file
import CreateListingModal from "./CreateListingModal"; // Adjust path as needed

import {
  Package,
  MessageSquare,
  ArrowLeftRight,
  Plus,
  Bell,
  User,
  Settings,
  Award,
  LogOut,
  Star,
  CheckCircle,
} from "lucide-react";

const SellerDashboard = ({ session }) => {
  const [activeTab, setActiveTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // 2. Inside your SellerDashboard component:
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null); // Assuming you have user data for the ID
  const [bids, setBids] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingBids, setListingBids] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const totalBidsCount = listings.reduce(
    (sum, item) => sum + (item.bids?.length || 0),
    0,
  );
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  useEffect(() => {
    const verifyRole = async () => {
      if (!session?.user) return;

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (data?.role !== 'seller') {
        alert("Access Denied: You are not a seller.");
        await supabase.auth.signOut();
        // The screen stays empty because we haven't set checkingRole to false
      } else {
        setIsAuthorized(true);
        setCheckingRole(false);
      }
    };

    verifyRole();
  }, [session]);

  // CRITICAL: If still checking or not authorized, show NOTHING (blank or loader)
  if (checkingRole || !isAuthorized) {
    return <div className="h-screen w-full bg-white flex items-center justify-center">Loading</div>;
  }
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfileData(data);
    };
    if (session) fetchProfile();
  }, [session]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(
            `
          *,
          bids (*) 
        `,
          ) // 👈 This tells Supabase to join the bids table
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
  }, [session.user.id]);
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
      ) // This assumes you have a profiles table linked
      .eq("listing_id", listing.id)
      .order("created_at", { ascending: false });

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
            3
          </span>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">
                  Notifications
                </h3>
                <div className="flex gap-3 items-center">
                  <button className="text-[10px] text-[#3285a1] font-bold hover:underline">
                    Mark all read
                  </button>
                  <Plus
                    className="rotate-45 text-slate-400 cursor-pointer"
                    size={16}
                    onClick={() => setShowNotifications(false)}
                  />
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                <NotificationItem
                  icon={<Plus className="text-emerald-500" size={14} />}
                  bg="bg-emerald-50"
                  title="New Bid Received"
                  desc="Tech Solutions Shop placed a bid of ₱3,200 on your iPhone 11"
                  time="8h ago"
                  unread={true}
                />
                <NotificationItem
                  icon={<MessageSquare className="text-blue-500" size={14} />}
                  bg="bg-blue-50"
                  title="New Message"
                  desc="E-Parts Hub sent you a message about Samsung Galaxy S20"
                  time="9h ago"
                  unread={true}
                />
                <NotificationItem
                  icon={
                    <ArrowLeftRight className="text-purple-500" size={14} />
                  }
                  bg="bg-purple-50"
                  title="Meetup Reminder"
                  desc="Scheduled meetup with Tech Repair Valenzuela tomorrow at 2:00 PM"
                  time="Yesterday"
                  unread={true}
                />
                <NotificationItem
                  icon={<CheckCircle className="text-emerald-500" size={14} />}
                  bg="bg-emerald-50"
                  title="Transaction Completed"
                  desc="Your listing 'MacBook Pro 2019' has been successfully sold"
                  time="2d ago"
                />
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
              {session.user.email.split("@")}
            </div>
            <div className="text-[10px] text-emerald-500 flex items-center gap-1 justify-end">
              <CheckCircle size={10} /> Verified
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
            {session.user.email.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Profile Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Dropdown Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
                  {session.user.email.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-bold truncate">
                    {session.user.email.split("@")}
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
          { label: "Total Bids", val: totalBidsCount }, // 👈 Changed from bids.length to totalBidsCount
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
                  onClick={() => setSelectedListing(item)}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedListing?.id === item.id
                      ? "border-[#3285a1] ring-2 ring-[#3285a1]/10 bg-slate-50/30"
                      : "border-slate-100 bg-white hover:border-[#3285a1]/50"
                  } p-6 rounded-2xl border shadow-sm relative overflow-hidden`}
                >
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

                  <div className="flex justify-between items-center border-t border-slate-50 pt-4 mt-4">
                    <div className="flex gap-4 text-xs font-bold text-[#3285a1]">
                      <span>₱ {item.scrap_value?.toLocaleString()}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} /> {item.bids?.length || 0}{" "}
                        bids
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-500 flex items-center gap-1">
                      <span className="w-3 h-3 bg-emerald-100 rounded-full flex items-center justify-center">
                        ✓
                      </span>{" "}
                      Data cleared
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-10 rounded-2xl text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400">
                  No active listings found in the database.
                </p>
              </div>
            )}
          </div>
        </div>
        

        {/* Right Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[600px] sticky top-6 z-10">
          {selectedListing ? (
            <>
              {/* Sidebar Header */}
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

              {/* Bids List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedListing?.bids && selectedListing.bids.length > 0 ? (
                  selectedListing.bids.map((bid) => (
                    <div
                      key={bid.id}
                      className="p-4 rounded-xl border border-slate-50 bg-slate-50/30"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-[#3285a1]">
                          ₱{bid.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button className="flex-1 bg-[#3285a1] text-white py-2 rounded-lg text-[10px] font-bold hover:opacity-90">
                          Accept
                        </button>
                        <button className="flex-1 border border-slate-200 text-slate-400 py-2 rounded-lg text-[10px] font-bold hover:bg-slate-50">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p className="text-xs">No bids yet for this item.</p>
                  </div>
                )}
              </div>

              {/* Message Input at Bottom */}
              <div className="p-4 border-t border-slate-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Send a message..."
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <button className="bg-[#3285a1] text-white p-2 rounded-lg">
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* This is your original placeholder when nothing is selected */
            <div className="flex flex-col items-center justify-center text-center h-full py-20 px-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="text-slate-200" size={32} />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">Bids & Messages</h3>
              <p className="text-xs text-slate-400">
                Select a listing to view active bids or start a conversation
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Profile Modal Overlay */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z- flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            {/* Modal Header Gradient */}
            <div className="bg-gradient-to-br from-[#3285a1] to-emerald-500 p-8 text-white relative">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-6 right-6 hover:rotate-90 transition-transform"
              >
                <Plus className="rotate-45" size={24} />
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30 relative">
                  {session.user.email.charAt(0).toUpperCase()}
                  <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full text-slate-800 shadow-sm">
                    <Plus size={12} />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {profileData?.full_name || session.user.email.split("@")}
                  </h2>
                  <div className="flex items-center gap-2 text-xs opacity-90 mt-1">
                    <span className="bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} /> Verified Seller
                    </span>
                    <span>Active since Jan 2026</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="font-bold">4.8</span>
                <span className="opacity-75">(24 reviews)</span>
              </div>
            </div>

            <div className="p-8">
              <div className="flex justify-end mb-6">
                <button className="flex items-center gap-2 bg-[#3285a1] text-white px-4 py-2 rounded-xl text-sm font-medium">
                  <Plus size={16} /> Edit Profile
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                {[
                  {
                    label: "Total Listings",
                    val: listings.length,
                    color: "bg-emerald-50",
                  },
                  { label: "Items Sold", val: "0", color: "bg-blue-50" },
                  { label: "Rating", val: "0.0", color: "bg-emerald-50" },
                  { label: "Reviews", val: "0", color: "bg-slate-50" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`${s.color} p-4 rounded-2xl text-center border border-white`}
                  >
                    <div className="text-lg font-bold text-slate-800">
                      {s.val}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-1">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 text-sm">
                  Personal Information
                </h3>

                <div className="grid gap-4">
                  <InfoItem
                    icon={<User size={16} />}
                    label="Full Name"
                    val={profileData?.full_name || "Not set"}
                  />
                  <InfoItem
                    icon={<Bell size={16} />}
                    label="Email Address"
                    val={session.user.email}
                  />
                  <InfoItem
                    icon={<Plus size={16} />}
                    label="Phone Number"
                    val={profileData?.phone || "+63 9xx xxx xxxx"}
                  />
                  <InfoItem
                    icon={<Plus size={16} />}
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
const NotificationItem = ({ icon, bg, title, desc, time, unread }) => (
  <div
    className={`p-4 flex gap-3 hover:bg-slate-50 transition cursor-pointer relative ${unread ? "bg-slate-50/50" : ""}`}
  >
    <div
      className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center shrink-0`}
    >
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <h4 className="text-[11px] font-bold text-slate-800">{title}</h4>
        {unread && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed my-1">{desc}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-[9px] text-slate-400">{time}</span>
        <button className="text-[9px] text-slate-300 hover:text-red-400">
          Delete
        </button>
      </div>
    </div>
  </div>
);
export default SellerDashboard;
