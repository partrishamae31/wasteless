import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Search,
  Send,
  ShieldAlert,
  CheckCheck,
  Calendar,
  User,
} from "lucide-react";

const SellerMessages = ({ userId }) => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");

  // 1. Fetch Conversations Sidebar (Grouping by Listing)
  useEffect(() => {
    const fetchConversations = async () => {
      const { data } = await supabase
        .from("messages")
        .select(`
          listing_id,
          content,
          created_at,
          sender_id,
          receiver_id,
          listings (device_model)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (data) {
        const uniqueConversations = data.reduce((acc, current) => {
          if (!acc.find((item) => item.listing_id === current.listing_id)) {
            // Determine who the "other person" is
            const otherPartyId = current.sender_id === userId ? current.receiver_id : current.sender_id;
            acc.push({ ...current, other_party_id: otherPartyId });
          }
          return acc;
        }, []);
        setConversations(uniqueConversations);
      }
    };
    fetchConversations();
  }, [userId]);

  // 2. Fetch Messages when a chat is selected
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
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const restrictedWords = ["viber", "personal", "number"];
    if (restrictedWords.some((word) => newMessage.toLowerCase().includes(word))) {
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none" />
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
                <span className="font-bold text-xs text-slate-700">Harvester ID: {conv.other_party_id.slice(0,5)}</span>
                <span className="text-[10px] text-slate-400">{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[10px] text-teal-600 font-bold mb-1">Re: {conv.listings?.device_model}</p>
              <p className="text-[11px] text-slate-500 truncate">{conv.content}</p>
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
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><User size={20} /></div>
                <div>
                  <p className="font-bold text-xs text-slate-700">{activeChat.listings?.device_model}</p>
                  <p className="text-[10px] text-slate-400">Active Conversation</p>
                </div>
              </div>
              <button className="flex items-center gap-2 bg-[#2d7a7f] text-white px-4 py-2 rounded-xl text-[10px] font-bold"><Calendar size={14} /> Schedule Meetup</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
              {messages.map((msg) => {
                const isMe = msg.sender_id === userId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end ml-auto" : "items-start"} max-w-[80%]`}>
                    <div className={`p-4 rounded-2xl shadow-sm text-xs ${isMe ? "bg-[#2d7a7f] text-white rounded-tr-none" : "bg-white border border-slate-100 text-slate-600 rounded-tl-none"}`}>
                      {msg.content}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-2">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-50">
              {error && <div className="mb-2 text-red-500 text-[10px] font-bold flex items-center gap-1"><ShieldAlert size={12}/> {error}</div>}
              <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} type="text" placeholder="Type a message..." className="flex-1 bg-transparent border-none px-4 text-xs outline-none" />
                <button type="submit" className="p-3 bg-[#2d7a7f] text-white rounded-xl"><Send size={18} /></button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">Select a chat to begin</div>
        )}
      </div>
    </div>
  );
};

export default SellerMessages;