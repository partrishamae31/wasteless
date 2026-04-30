import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Search,
  Send,
  ShieldAlert,
  CheckCheck,
  Calendar,
  User,
  X,
  MapPin,
  Clock,
} from "lucide-react";

const SellerMessages = ({ userId, onTabChange }) => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  // NEW: State for Modal and Form Data
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meetupData, setMeetupData] = useState({
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  // NEW: Logic to save the meetup to Supabase
  const handleScheduleMeetup = async () => {
    if (!meetupData.date || !meetupData.location || !meetupData.time) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // 1. Fetch the bid records
      const { data: bidRecords, error: fetchError } = await supabase
        .from("bids")
        .select("amount") // Based on your table screenshot
        .eq("listing_id", activeChat.listing_id)
        .eq("bidder_id", activeChat.other_party_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      // 2. Logic Fix: Extract the value safely
      let calculatedPrice = 0;

      // Check if bidRecords is an array with at least one item
      if (bidRecords && bidRecords.length > 0) {
        // Access the first item in the array
        calculatedPrice = bidRecords[0].amount;
      } else {
        // Fallback: If no bid found, use the asking price from the listing
        calculatedPrice = activeChat.listings?.asking_price || 0;
      }

      // 3. Insert into transactions
      const { error: scheduleError } = await supabase
        .from("transactions")
        .insert([
          {
            listing_id: activeChat.listing_id,
            seller_id: userId,
            harvester_id: activeChat.other_party_id,
            amount: Number(calculatedPrice), // Ensure it's a number, not null
            barangay: meetupData.location,
            meetup_date: meetupData.date,
            meetup_time: meetupData.time,
            notes: meetupData.notes,
            status: "pending",
          },
        ]);

      if (scheduleError) throw scheduleError;

      // 4. Update Listing Status
      await supabase
        .from("listings")
        .update({ status: "Meetup Scheduled" })
        .eq("id", activeChat.listing_id);

      // 5. Automated Message
      await supabase.from("messages").insert([
        {
          listing_id: activeChat.listing_id,
          sender_id: userId,
          receiver_id: activeChat.other_party_id,
          content: `Meetup Scheduled! \nFinal Price: ₱${calculatedPrice.toLocaleString()} \nLocation: ${meetupData.location} \nDate: ${meetupData.date} @ ${meetupData.time}`,
        },
      ]);

      alert(`Meetup Scheduled for ₱${calculatedPrice.toLocaleString()}`);
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
        const uniqueConversations = data.reduce((acc, current) => {
          if (!acc.find((item) => item.listing_id === current.listing_id)) {
            const otherPartyId =
              current.sender_id === userId
                ? current.receiver_id
                : current.sender_id;
            acc.push({ ...current, other_party_id: otherPartyId });
          }
          return acc;
        }, []);
        setConversations(uniqueConversations);
      }
    };
    fetchConversations();
  }, [userId]);

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
                <span className="font-bold text-xs text-slate-700">
                  Harvester ID: {conv.other_party_id.slice(0, 5)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(conv.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
                  <p className="font-bold text-xs text-slate-700">
                    {activeChat.listings?.device_model}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Active Conversation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(true)} // Open modal on click
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">
                  Schedule Meetup
                </h2>
                <p className="text-[10px] text-slate-400">
                  Re: {activeChat.listings?.device_model}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-2 mb-2">
                  <Calendar size={12} /> Select Date
                </label>
                <input
                  type="date"
                  className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs outline-none"
                  onChange={(e) =>
                    setMeetupData({ ...meetupData, date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-2 mb-2">
                  <Clock size={12} /> Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "09:00 AM",
                    "11:00 AM",
                    "01:00 PM",
                    "03:00 PM",
                    "05:00 PM",
                  ].map((t) => (
                    <button
                      key={t}
                      onClick={() => setMeetupData({ ...meetupData, time: t })}
                      className={`p-2 text-[9px] rounded-lg border transition-all ${meetupData.time === t ? "bg-teal-50 border-[#2d7a7f] text-[#2d7a7f] font-bold" : "border-slate-100 text-slate-500"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-2 mb-2">
                  <MapPin size={12} /> Meeting Location
                </label>
                <select
                  className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs outline-none"
                  onChange={(e) =>
                    setMeetupData({ ...meetupData, location: e.target.value })
                  }
                >
                  <option value="">Choose a location...</option>
                  <option value="Valenzuela City Hall">
                    Valenzuela City Hall - Main Entrance
                  </option>
                  <option value="SM City Valenzuela">
                    SM City Valenzuela - Main Entrance
                  </option>
                  <option value="Barangay Hall">
                    Barangay Hall - Nearest Hall
                  </option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-2 block">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="e.g. I'll be at the lobby wearing a white cap"
                  className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs outline-none h-20 resize-none"
                  onChange={(e) =>
                    setMeetupData({ ...meetupData, notes: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-[11px] font-bold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleMeetup}
                className="flex-1 py-3 bg-[#2d7a7f] text-white rounded-xl text-[11px] font-bold"
              >
                Schedule Meetup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerMessages;
