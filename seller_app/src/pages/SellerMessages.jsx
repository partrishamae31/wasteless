import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Search,
  Send,
  ShieldAlert,
  CheckCheck,
  Check,
  Calendar,
  User,
  X,
  MapPin,
  Clock,
  Navigation,
  Star,
} from "lucide-react";

const SellerMessages = ({ userId, onTabChange }) => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  // NEW: State for Modal and Form Data
  const [acceptedBidAmount, setAcceptedBidAmount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meetupData, setMeetupData] = useState({
    date: "",
    time: "",
    location: "",
    drop_off_point_id: "",
    notes: "",
  });

  const [dropOffPoints, setDropOffPoints] = useState([]);

  const fetchAcceptedBidAmount = async () => {
    if (!activeChat) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("amount")
      .eq("listing_id", activeChat.listing_id)
      .eq("harvester_id", activeChat.other_party_id)
      .single();

    if (!error && data) {
      setAcceptedBidAmount(data.amount);
    }
  };

  const handleScheduleMeetup = async () => {
    if (!meetupData.date || !meetupData.time || !meetupData.drop_off_point_id) {
      alert("Please select a date, time, and drop-off point.");
      return;
    }

    try {
      // 🔥 1. GET THE EXISTING PENDING TRANSACTION FIRST
      const { data: existingTx, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("listing_id", activeChat.listing_id)
        .eq("harvester_id", activeChat.other_party_id)
        .eq("status", "pending")
        .single(); // ensures ONLY ONE

      if (fetchError || !existingTx) {
        throw new Error("Pending transaction not found.");
      }

      // 🔥 2. UPDATE THAT EXACT ROW
      const { error: scheduleError } = await supabase
        .from("transactions")
        .update({
          drop_off_point_id: meetupData.drop_off_point_id,
          barangay: meetupData.location,
          meetup_date: meetupData.date,
          meetup_time: meetupData.time,
          notes: meetupData.notes,
          status: "meetup_scheduled",
        })
        .eq("id", existingTx.id); // ✅ precise update

      if (scheduleError) throw scheduleError;

      const finalPrice = existingTx.amount;

      // 3. Update Listing Status for UI consistency
      await supabase
        .from("listings")
        .update({ status: "Meetup Scheduled" })
        .eq("id", activeChat.listing_id);

      // 4. Automated Message
      await supabase.from("messages").insert([
        {
          listing_id: activeChat.listing_id,
          sender_id: userId,
          receiver_id: activeChat.other_party_id,
          content: `Meetup Scheduled! 
Final Price: ₱${finalPrice.toLocaleString()} 
Location: ${meetupData.location} 
Date: ${meetupData.date} at ${meetupData.time}`,
        },
      ]);

      alert(`Meetup Scheduled for ₱${finalPrice.toLocaleString()}`);
      setIsModalOpen(false);
      if (onTabChange) onTabChange("transactions");
    } catch (err) {
      console.error("Error:", err.message);
      alert("Transaction failed: " + err.message);
    }
  };
  const [error, setError] = useState("");

  // 1. Fetch Conversations Sidebar (Grouping by Listing)
  useEffect(() => {
    const fetchConversations = async () => {
      const { data } = await supabase
        .from("messages")
        .select(
          `
    listing_id,
    content,
    created_at,
    sender_id,
    receiver_id,
    listings (device_model)
  `,
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (data) {
        // Get unique user IDs
        const userIds = [
          ...new Set(data.flatMap((msg) => [msg.sender_id, msg.receiver_id])),
        ];

        // Fetch profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select(
            `
  id,
  full_name,
  business_name,
  role,
  average_rating,
  total_reviews
`,
          )
          .in("id", userIds);

        const profileMap = {};
        profiles?.forEach((p) => {
          const normalizedRole = p.role?.toLowerCase();

          const isRepairShop =
            normalizedRole === "repair_shop" ||
            normalizedRole === "repair shop";

          profileMap[p.id] = {
            name: isRepairShop
              ? p.business_name || "Repair Shop"
              : p.full_name || "Tech Harvester",

            role: isRepairShop ? "Repair Shop" : "Tech Harvester",

            roleType: isRepairShop ? "repair_shop" : "harvester",

            rating: Number(p.average_rating) || 0,

            reviewCount: Number(p.total_reviews) || 0,
          };
        });

        const uniqueConversations = data.reduce((acc, current) => {
          if (!acc.find((item) => item.listing_id === current.listing_id)) {
            const isSender = current.sender_id === userId;

            const otherPartyId = isSender
              ? current.receiver_id
              : current.sender_id;

            const otherPartyInfo = profileMap[otherPartyId] || {
              name: "Unknown Harvester",
              rating: 0,
              reviewCount: 0,
            };

            acc.push({
              ...current,

              other_party_id: otherPartyId,
              other_party_name: otherPartyInfo.name,
              other_party_role: otherPartyInfo.role,
              other_party_role_type: otherPartyInfo.roleType,
              other_party_rating: otherPartyInfo.rating,
              other_party_review_count: otherPartyInfo.reviewCount,
            });
          }
          return acc;
        }, []);

        setConversations(uniqueConversations);
      }
    };
    fetchConversations();
  }, [userId]);

  useEffect(() => {
    const fetchDropOffPoints = async () => {
      const { data, error } = await supabase
        .from("drop_off_points")
        .select(
          `
        id,
        name,
        barangay,
        city,
        address,
        latitude,
        longitude,
        is_active
      `,
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading drop-off points:", error);
        return;
      }

      setDropOffPoints(data || []);
    };

    fetchDropOffPoints();
  }, []);

  useEffect(() => {
    if (!activeChat) return;

    const fetchChatMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("listing_id", activeChat.listing_id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };

    fetchChatMessages();

    // Real-time Subscription
    const channel = supabase
      .channel(`chat-${activeChat.listing_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${activeChat.listing_id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const restrictedWords = ["viber", "personal", "number"];
    if (
      restrictedWords.some((word) => newMessage.toLowerCase().includes(word))
    ) {
      setError("Message blocked: Avoid sharing personal contact info.");
      return;
    }

    const { error: sendError } = await supabase.from("messages").insert([
      {
        listing_id: activeChat.listing_id,
        sender_id: userId,
        receiver_id: activeChat.other_party_id,
        content: newMessage,
      },
    ]);

    if (!sendError) {
      setNewMessage("");
      setError("");
    }
  };

  const renderStars = (average_rating = 0) => {
    const stars = [1, 2, 3, 4, 5];

    return (
      <div className="flex items-center gap-0.5">
        {stars.map((star) => (
          <Star
            key={star}
            size={10}
            className={
              star <= Math.round(Number(average_rating))
                ? "text-yellow-400 fill-yellow-400"
                : "text-slate-200 fill-slate-200"
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-[600px] bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-50 flex flex-col">
        <div className="p-6 border-b border-slate-50">
          <h3 className="font-bold text-slate-800 mb-4">Messages</h3>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
              size={16}
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.listing_id}
              onClick={() => setActiveChat(conv)}
              className={`p-4 cursor-pointer transition-all ${activeChat?.listing_id === conv.listing_id ? "bg-teal-50 border-l-4 border-[#2d7a7f]" : "hover:bg-slate-50"}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-700">
                    {conv.other_party_name || "Unknown User"}
                  </span>

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      conv.other_party_role_type === "repair_shop"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {conv.other_party_role}
                  </span>
                </div>

                <span className="text-[10px] text-slate-400">
                  {new Date(conv.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1 mb-1.5">
                {renderStars(conv.other_party_rating)}
                <span className="text-[9px] text-slate-500 font-medium">
                  {Number(conv.other_party_rating || 0).toFixed(1)} (
                  {conv.other_party_review_count || 0})
                </span>
              </div>

              <p className="text-[10px] text-teal-600 font-bold mb-1">
                Re: {conv.listings?.device_model}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {conv.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-slate-700">
                      {activeChat.other_party_name || "Unknown User"}
                    </p>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        activeChat.other_party_role_type === "repair_shop"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {activeChat.other_party_role}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Active Conversation
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {renderStars(activeChat.other_party_rating)}
                    <span className="text-[10px] text-slate-500 font-medium">
                      {Number(activeChat.other_party_rating || 0).toFixed(1)} (
                      {activeChat.other_party_review_count || 0})
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  await fetchAcceptedBidAmount();
                  setIsModalOpen(true);
                }} // Open modal on click
                className="flex items-center gap-2 bg-[#2d7a7f] text-white px-4 py-2 rounded-xl text-[10px] font-bold"
              >
                <Calendar size={14} /> Schedule Meetup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
              {messages.map((msg) => {
                const isMe = msg.sender_id === userId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end ml-auto" : "items-start"} max-w-[80%]`}
                  >
                    <div
                      className={`p-4 rounded-2xl shadow-sm text-xs ${isMe ? "bg-[#2d7a7f] text-white rounded-tr-none" : "bg-white border border-slate-100 text-slate-600 rounded-tl-none"}`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-2">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-6 border-t border-slate-50"
            >
              {error && (
                <div className="mb-2 text-red-500 text-[10px] font-bold flex items-center gap-1">
                  <ShieldAlert size={12} /> {error}
                </div>
              )}
              <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none px-4 text-xs outline-none"
                />
                <button
                  type="submit"
                  className="p-3 bg-[#2d7a7f] text-white rounded-xl"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">
            Select a chat to begin
          </div>
        )}
      </div>
      {/* MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[1.5rem] w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-8 pb-4 flex justify-between items-start">
              <div>
                <h2 className="font-bold text-[#2d3748] text-xl">
                  Schedule Meetup
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  With {activeChat.shop_name || "Shop"} for{" "}
                  {activeChat.listings?.device_model}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Accepted Bid Card */}
              <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-emerald-100 rounded-2xl p-6 flex justify-between items-center">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-700/70 uppercase tracking-wider">
                    Accepted Bid Amount
                  </p>
                  <p className="text-2xl font-bold text-[#2d7a7f] mt-1">
                    ₱{acceptedBidAmount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-500 rounded-full p-1">
                  <Check size={20} className="text-white" />
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-[#2d7a7f]" /> Select Date
                </label>
                <input
                  type="date"
                  className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  onChange={(e) =>
                    setMeetupData({ ...meetupData, date: e.target.value })
                  }
                />
              </div>

              {/* Time Selection */}
              <div>
                <label className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-[#2d7a7f]" /> Select Time
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    "09:00 AM",
                    "10:00 AM",
                    "11:00 AM",
                    "02:00 PM",
                    "03:00 PM",
                    "04:00 PM",
                  ].map((t) => (
                    <button
                      key={t}
                      onClick={() => setMeetupData({ ...meetupData, time: t })}
                      className={`p-3 text-xs rounded-xl border transition-all duration-200 ${
                        meetupData.time === t
                          ? "bg-[#9bc2c9] border-[#9bc2c9] text-white font-bold"
                          : "border-slate-200 text-slate-600 hover:border-teal-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  placeholder="--:-- --"
                  className="w-full mt-3 p-4 border border-slate-200 rounded-xl text-sm outline-none"
                  onChange={(e) =>
                    setMeetupData({ ...meetupData, time: e.target.value })
                  }
                />
              </div>

              {/* Location Selection */}
              <div>
                <label className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-[#2d7a7f]" />
                  Meeting Location
                </label>

                <div className="space-y-2">
                  {dropOffPoints.length === 0 ? (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
                      No active drop-off points available.
                    </div>
                  ) : (
                    dropOffPoints.map((point) => (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() =>
                          setMeetupData({
                            ...meetupData,
                            location: point.name,
                            drop_off_point_id: point.id,
                          })
                        }
                        className={`w-full p-4 flex items-start gap-3 text-left rounded-xl border transition-all ${
                          meetupData.drop_off_point_id === point.id
                            ? "border-[#2d7a7f] bg-teal-50/30 text-[#2d7a7f] font-medium"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Navigation
                          size={14}
                          className={
                            meetupData.drop_off_point_id === point.id
                              ? "text-[#2d7a7f] mt-1"
                              : "text-slate-400 mt-1"
                          }
                        />

                        <div>
                          <p className="text-sm font-semibold">{point.name}</p>

                          <p className="text-[11px] text-slate-400 mt-1">
                            {point.address}
                          </p>

                          <p className="text-[10px] text-slate-400 mt-1">
                            {point.barangay}, {point.city}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block">
                  Additional Notes (Optional)
                </label>
                <textarea
                  placeholder="e.g., I'll be wearing a blue jacket, bring the device in original packaging..."
                  className="w-full p-4 border border-slate-200 rounded-xl text-sm outline-none h-28 resize-none focus:ring-2 focus:ring-teal-500/20"
                  onChange={(e) =>
                    setMeetupData({ ...meetupData, notes: e.target.value })
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 px-6 border border-slate-200 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleMeetup}
                  className="flex-1 py-4 px-6 bg-[#9bc2c9] hover:bg-[#8ab1b8] text-white rounded-xl text-sm font-bold transition-colors shadow-md"
                >
                  Schedule Meetup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerMessages;
