import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Search,
  Send,
  ShieldAlert,
  Calendar,
  User,
  X,
  Clock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  FileText,
  Star,
} from "lucide-react";

const RepairShopMessages = ({ userId, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [repairAppointments, setRepairAppointments] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  const renderStars = (rating = 0) => {
    const stars = [1, 2, 3, 4, 5];

    return (
      <div className="flex items-center gap-0.5">
        {stars.map((star) => (
          <Star
            key={star}
            size={10}
            className={
              star <= Math.round(Number(rating))
                ? "text-yellow-400 fill-yellow-400"
                : "text-slate-200 fill-slate-200"
            }
          />
        ))}
      </div>
    );
  };

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "Not specified";

    // Handles database values such as 14:00:00
    if (/^\d{2}:\d{2}/.test(time)) {
      const [hour, minute] = time.split(":");

      const date = new Date();
      date.setHours(Number(hour));
      date.setMinutes(Number(minute));
      date.setSeconds(0);

      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return time;
  };

  const getAppointmentStatusClass = (status) => {
    switch ((status || "").toLowerCase()) {
      case "accepted":
      case "confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";

      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-100";

      case "cancelled":
      case "canceled":
      case "declined":
        return "bg-red-50 text-red-700 border-red-100";

      case "pending":
      default:
        return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  /*
   * ============================================================
   * FETCH PROFILE INFORMATION
   * ============================================================
   */

  const fetchProfiles = async (ids) => {
    if (!ids || ids.length === 0) return {};

    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (uniqueIds.length === 0) return {};

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        business_name,
        role,
        average_rating,
        total_reviews
      `)
      .in("id", uniqueIds);

    if (error) {
      console.error("Error fetching profiles:", error);
      return {};
    }

    const map = {};

    (data || []).forEach((profile) => {
      map[profile.id] = profile;
    });

    return map;
  };

  /*
   * ============================================================
   * FETCH REPAIR APPOINTMENTS
   *
   * IMPORTANT:
   * Repair shop uses repair_shop_id = userId.
   * The harvester is stored in harvester_id.
   * ============================================================
   */

  const fetchRepairAppointments = async () => {
    if (!userId) {
      setRepairAppointments([]);
      return [];
    }

    const { data, error } = await supabase
      .from("repair_appointments")
      .select(`
        id,
        harvester_id,
        repair_shop_id,
        device_model,
        category,
        issue_description,
        preferred_date,
        preferred_time,
        notes,
        status,
        created_at,
        updated_at
      `)
      .eq("repair_shop_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching repair appointments:", error);
      setRepairAppointments([]);
      return [];
    }

    setRepairAppointments(data || []);

    return data || [];
  };

  /*
   * ============================================================
   * FETCH ALL CONVERSATIONS
   *
   * Conversations are based on PARTICIPANTS.
   *
   * We do NOT use listing_id because repair appointments do not
   * belong to marketplace listings.
   * ============================================================
   */

  const fetchConversations = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      /*
       * --------------------------------------------------------
       * 1. FETCH MESSAGES INVOLVING THE REPAIR SHOP
       * --------------------------------------------------------
       */

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select(`
          id,
          listing_id,
          sender_id,
          receiver_id,
          content,
          created_at,
          listings (
            device_model
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (messageError) {
        console.error("Error fetching messages:", messageError);
      }

      /*
       * --------------------------------------------------------
       * 2. FETCH APPOINTMENTS
       * --------------------------------------------------------
       */

      const { data: appointmentData, error: appointmentError } =
        await supabase
          .from("repair_appointments")
          .select(`
            id,
            harvester_id,
            repair_shop_id,
            device_model,
            category,
            issue_description,
            preferred_date,
            preferred_time,
            notes,
            status,
            created_at,
            updated_at
          `)
          .eq("repair_shop_id", userId)
          .order("created_at", { ascending: false });

      if (appointmentError) {
        console.error(
          "Error fetching repair appointments:",
          appointmentError
        );
      }

      const messagesList = messageData || [];
      const appointmentsList = appointmentData || [];

      /*
       * --------------------------------------------------------
       * 3. GET ALL HARVESTER IDS
       * --------------------------------------------------------
       */

      const otherPartyIds = [
        ...new Set([
          ...messagesList
            .map((msg) =>
              msg.sender_id === userId
                ? msg.receiver_id
                : msg.sender_id
            )
            .filter(Boolean),

          ...appointmentsList
            .map((appointment) => appointment.harvester_id)
            .filter(Boolean),
        ]),
      ];

      /*
       * --------------------------------------------------------
       * 4. FETCH PROFILES
       * --------------------------------------------------------
       */

      const profileMap = await fetchProfiles(otherPartyIds);

      /*
       * --------------------------------------------------------
       * 5. BUILD CONVERSATIONS
       *
       * One conversation per Harvester.
       * --------------------------------------------------------
       */

      const conversationMap = {};

      /*
       * First add message conversations.
       */

      messagesList.forEach((message) => {
        const otherPartyId =
          message.sender_id === userId
            ? message.receiver_id
            : message.sender_id;

        if (!otherPartyId) return;

        const profile = profileMap[otherPartyId] || {};

        const existing = conversationMap[otherPartyId];

        if (!existing) {
          conversationMap[otherPartyId] = {
            conversation_key: `harvester-${otherPartyId}`,

            other_party_id: otherPartyId,

            other_party_name:
              profile.full_name || "Tech Harvester",

            other_party_role: "Tech Harvester",

            other_party_role_type: "harvester",

            other_party_rating:
              Number(profile.average_rating) || 0,

            other_party_review_count:
              Number(profile.total_reviews) || 0,

            listing_id: message.listing_id || null,

            listing_device_model:
              message.listings?.device_model || null,

            content: message.content || "",

            created_at: message.created_at,

            hasAppointment: false,
          };
        } else {
          /*
           * Keep the newest message as the preview.
           */
          if (
            new Date(message.created_at) >
            new Date(existing.created_at)
          ) {
            existing.content = message.content || "";
            existing.created_at = message.created_at;
            existing.listing_id = message.listing_id || null;
            existing.listing_device_model =
              message.listings?.device_model || null;
          }
        }
      });

      /*
       * --------------------------------------------------------
       * Add appointment conversations.
       *
       * This is the important part:
       * an appointment can create a conversation even if there
       * is no ordinary message yet.
       * --------------------------------------------------------
       */

      appointmentsList.forEach((appointment) => {
        const otherPartyId = appointment.harvester_id;

        if (!otherPartyId) return;

        const profile = profileMap[otherPartyId] || {};

        const existing = conversationMap[otherPartyId];

        if (!existing) {
          conversationMap[otherPartyId] = {
            conversation_key: `harvester-${otherPartyId}`,

            other_party_id: otherPartyId,

            other_party_name:
              profile.full_name || "Tech Harvester",

            other_party_role: "Tech Harvester",

            other_party_role_type: "harvester",

            other_party_rating:
              Number(profile.average_rating) || 0,

            other_party_review_count:
              Number(profile.total_reviews) || 0,

            listing_id: null,

            listing_device_model: null,

            content: `Repair appointment request for ${
              appointment.device_model || "device"
            }`,

            created_at: appointment.created_at,

            hasAppointment: true,

            repair_device_model: appointment.device_model,

            repair_category: appointment.category,

            appointment_status: appointment.status,
          };
        } else {
          existing.hasAppointment = true;

          /*
           * Use the appointment as the preview if it is newer.
           */
          if (
            new Date(appointment.created_at) >
            new Date(existing.created_at)
          ) {
            existing.content = `Repair appointment request for ${
              appointment.device_model || "device"
            }`;

            existing.created_at = appointment.created_at;
          }

          existing.repair_device_model = appointment.device_model;
          existing.repair_category = appointment.category;
          existing.appointment_status = appointment.status;
        }
      });

      /*
       * --------------------------------------------------------
       * Sort newest first.
       * --------------------------------------------------------
       */

      const finalConversations = Object.values(conversationMap).sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );

      setConversations(finalConversations);
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * INITIAL LOAD + REALTIME SIDEBAR UPDATES
   * ============================================================
   */

  useEffect(() => {
    if (!userId) return;

    fetchConversations();

    const channel = supabase
      .channel(`repair-shop-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const message = payload.new;

          const belongsToShop =
            message.sender_id === userId ||
            message.receiver_id === userId;

          if (belongsToShop) {
            fetchConversations();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "repair_appointments",
        },
        (payload) => {
          const appointment = payload.new;

          /*
           * Only appointments addressed to this repair shop.
           */
          if (appointment.repair_shop_id === userId) {
            fetchConversations();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "repair_appointments",
        },
        (payload) => {
          const appointment = payload.new;

          if (appointment.repair_shop_id === userId) {
            fetchConversations();

            /*
             * Also refresh the currently opened appointment.
             */
            if (
              activeChat?.other_party_id ===
              appointment.harvester_id
            ) {
              fetchRepairAppointments();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeChat?.other_party_id]);

  /*
   * ============================================================
   * FETCH ACTIVE CHAT
   * ============================================================
   */

  useEffect(() => {
    if (!activeChat || !userId) {
      setMessages([]);
      setRepairAppointments([]);
      return;
    }

    const harvesterId = activeChat.other_party_id;

    const fetchActiveChat = async () => {
      /*
       * --------------------------------------------------------
       * NORMAL MESSAGES
       *
       * IMPORTANT:
       * We match sender + receiver.
       *
       * We DO NOT require listing_id.
       * --------------------------------------------------------
       */

      const { data: messageData, error: messageError } =
        await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${harvesterId}),and(sender_id.eq.${harvesterId},receiver_id.eq.${userId})`
          )
          .order("created_at", { ascending: true });

      if (messageError) {
        console.error(
          "Error fetching active chat messages:",
          messageError
        );
        setMessages([]);
      } else {
        setMessages(messageData || []);
      }

      /*
       * --------------------------------------------------------
       * REPAIR APPOINTMENTS
       * --------------------------------------------------------
       */

      const { data: appointmentData, error: appointmentError } =
        await supabase
          .from("repair_appointments")
          .select(`
            id,
            harvester_id,
            repair_shop_id,
            device_model,
            category,
            issue_description,
            preferred_date,
            preferred_time,
            notes,
            status,
            created_at,
            updated_at
          `)
          .eq("repair_shop_id", userId)
          .eq("harvester_id", harvesterId)
          .order("created_at", { ascending: true });

      if (appointmentError) {
        console.error(
          "Error fetching active repair appointments:",
          appointmentError
        );
        setRepairAppointments([]);
      } else {
        setRepairAppointments(appointmentData || []);
      }
    };

    fetchActiveChat();

    /*
     * --------------------------------------------------------
     * REALTIME
     * --------------------------------------------------------
     */

    const channel = supabase
      .channel(
        `repair-chat-${userId}-${harvesterId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const message = payload.new;

          const belongsToChat =
            (message.sender_id === userId &&
              message.receiver_id === harvesterId) ||
            (message.sender_id === harvesterId &&
              message.receiver_id === userId);

          if (!belongsToChat) return;

          setMessages((previous) => {
            if (
              previous.some(
                (item) => item.id === message.id
              )
            ) {
              return previous;
            }

            return [...previous, message];
          });

          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "repair_appointments",
        },
        (payload) => {
          const appointment = payload.new;

          const belongsToChat =
            appointment.repair_shop_id === userId &&
            appointment.harvester_id === harvesterId;

          if (!belongsToChat) return;

          setRepairAppointments((previous) => {
            if (
              previous.some(
                (item) => item.id === appointment.id
              )
            ) {
              return previous;
            }

            return [...previous, appointment];
          });

          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "repair_appointments",
        },
        (payload) => {
          const appointment = payload.new;

          const belongsToChat =
            appointment.repair_shop_id === userId &&
            appointment.harvester_id === harvesterId;

          if (!belongsToChat) return;

          setRepairAppointments((previous) =>
            previous.map((item) =>
              item.id === appointment.id
                ? appointment
                : item
            )
          );

          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, userId]);

  /*
   * ============================================================
   * SEND MESSAGE
   * ============================================================
   */

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !activeChat || !userId) {
      return;
    }

    const restrictedWords = [
      "viber",
      "personal",
      "number",
    ];

    if (
      restrictedWords.some((word) =>
        newMessage
          .toLowerCase()
          .includes(word)
      )
    ) {
      setError(
        "Message blocked: Avoid sharing personal contact info."
      );
      return;
    }

    setError("");

    const { error: sendError } = await supabase
      .from("messages")
      .insert([
        {
          /*
           * Repair-shop conversations do not use listing_id.
           */
          listing_id: null,

          sender_id: userId,

          receiver_id:
            activeChat.other_party_id,

          content: newMessage.trim(),
        },
      ]);

    if (sendError) {
      console.error(
        "Error sending message:",
        sendError
      );

      setError(
        "Unable to send message. Please try again."
      );

      return;
    }

    setNewMessage("");
  };

  /*
   * ============================================================
   * FILTER SEARCH
   * ============================================================
   */

  const filteredConversations =
    conversations.filter((conversation) =>
      (
        conversation.other_party_name ||
        ""
      )
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="flex h-[600px] bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden font-sans">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <div className="w-80 border-r border-slate-50 flex flex-col">

        <div className="p-6 border-b border-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">
              Messages
            </h3>

            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
              size={16}
            />

            <input
              type="text"
              placeholder="Search harvester..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">

              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-50 flex items-center justify-center">
                <User
                  size={20}
                  className="text-slate-300"
                />
              </div>

              <p className="text-xs font-bold text-slate-400">
                No conversations yet
              </p>

              <p className="text-[10px] text-slate-300 mt-1">
                Messages and repair appointment requests from
                harvesters will appear here.
              </p>

            </div>
          ) : (
            filteredConversations.map((conversation) => {

              const isActive =
                activeChat?.conversation_key ===
                conversation.conversation_key;

              return (
                <div
                  key={conversation.conversation_key}
                  onClick={() =>
                    setActiveChat(conversation)
                  }
                  className={`p-4 cursor-pointer transition-all ${
                    isActive
                      ? "bg-teal-50 border-l-4 border-[#3285a1]"
                      : "hover:bg-slate-50"
                  }`}
                >

                  <div className="flex justify-between items-start mb-1">

                    <div className="flex items-center gap-2 min-w-0">

                      <span className="font-bold text-xs text-slate-700 truncate">
                        {conversation.other_party_name}
                      </span>

                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-700">
                        Harvester
                      </span>

                    </div>

                    <span className="text-[10px] text-slate-400 ml-2 whitespace-nowrap">
                      {conversation.created_at
                        ? new Date(
                            conversation.created_at
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>

                  </div>

                  <div className="flex items-center gap-1 mb-1.5">
                    {renderStars(
                      conversation.other_party_rating
                    )}

                    <span className="text-[9px] text-slate-500 font-medium">
                      {Number(
                        conversation.other_party_rating || 0
                      ).toFixed(1)}{" "}
                      (
                      {conversation.other_party_review_count ||
                        0}
                      )
                    </span>
                  </div>

                  {conversation.hasAppointment ? (
                    <p className="text-[10px] text-violet-600 font-bold mb-1">
                      Repair Appointment:{" "}
                      {conversation.repair_device_model ||
                        "Device"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-teal-600 font-bold mb-1">
                      Repair Shop Conversation
                    </p>
                  )}

                  <p className="text-[11px] text-slate-500 truncate">
                    {conversation.content}
                  </p>

                </div>
              );
            })
          )}

        </div>
      </div>

      {/* ======================================================
          MAIN CHAT
      ====================================================== */}

      <div className="flex-1 flex flex-col">

        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">

            <div className="text-center">

              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Wrench
                  size={28}
                  className="text-violet-400"
                />
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Select a conversation
              </p>

              <p className="text-[10px] text-slate-300 mt-2">
                Select a harvester to view messages and
                repair appointment requests.
              </p>

            </div>

          </div>
        ) : (
          <>
            {/* ==================================================
                CHAT HEADER
            ================================================== */}

            <div className="p-6 border-b border-slate-50 flex justify-between items-center">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                  <User size={20} />
                </div>

                <div>

                  <div className="flex items-center gap-2">

                    <p className="font-bold text-xs text-slate-700">
                      {activeChat.other_party_name ||
                        "Tech Harvester"}
                    </p>

                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-700">
                      Tech Harvester
                    </span>

                  </div>

                  <p className="text-[10px] text-slate-400">
                    Repair Shop Conversation
                  </p>

                  <div className="flex items-center gap-1 mt-0.5">
                    {renderStars(
                      activeChat.other_party_rating
                    )}

                    <span className="text-[10px] text-slate-500 font-medium">
                      {Number(
                        activeChat.other_party_rating || 0
                      ).toFixed(1)}{" "}
                      (
                      {activeChat.other_party_review_count ||
                        0}
                      )
                    </span>
                  </div>

                </div>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}

            </div>

            {/* ==================================================
                CHAT BODY
            ================================================== */}

            <div className="flex-1 overflow-y-auto p-8 space-y-5 bg-slate-50/30">

              {/* =================================================
                  REPAIR APPOINTMENTS
              ================================================= */}

              {repairAppointments.map(
                (appointment) => (
                  <div
                    key={`appointment-${appointment.id}`}
                    className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm"
                  >

                    <div className="flex items-center justify-between mb-4">

                      <div className="flex items-center gap-2">

                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                          <Calendar
                            size={16}
                            className="text-violet-600"
                          />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-violet-700">
                            Repair Appointment
                          </p>

                          <p className="text-[9px] text-slate-400">
                            Appointment Request
                          </p>
                        </div>

                      </div>

                      <span
                        className={`text-[9px] px-2 py-1 rounded-full border font-bold uppercase ${getAppointmentStatusClass(
                          appointment.status
                        )}`}
                      >
                        {appointment.status ||
                          "pending"}
                      </span>

                    </div>

                    <div className="grid grid-cols-2 gap-3">

                      <div className="bg-slate-50 rounded-xl p-3">

                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                          Device
                        </p>

                        <p className="text-[11px] font-bold text-slate-700">
                          {appointment.device_model ||
                            "Not specified"}
                        </p>

                      </div>

                      <div className="bg-slate-50 rounded-xl p-3">

                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                          Category
                        </p>

                        <p className="text-[11px] font-bold text-slate-700">
                          {appointment.category ||
                            "Not specified"}
                        </p>

                      </div>

                    </div>

                    <div className="mt-3 bg-slate-50 rounded-xl p-3">

                      <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1 flex items-center gap-1">
                        <FileText size={11} />
                        Issue Description
                      </p>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {appointment.issue_description ||
                          "No issue description provided."}
                      </p>

                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">

                      <div className="bg-slate-50 rounded-xl p-3">

                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <Calendar size={11} />
                          Preferred Date
                        </p>

                        <p className="text-[11px] font-bold text-slate-700">
                          {formatDate(
                            appointment.preferred_date
                          )}
                        </p>

                      </div>

                      <div className="bg-slate-50 rounded-xl p-3">

                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <Clock size={11} />
                          Preferred Time
                        </p>

                        <p className="text-[11px] font-bold text-slate-700">
                          {formatTime(
                            appointment.preferred_time
                          )}
                        </p>

                      </div>

                    </div>

                    {appointment.notes && (
                      <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">

                        <p className="text-[9px] uppercase tracking-wider font-bold text-amber-600 mb-1">
                          Additional Notes
                        </p>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {appointment.notes}
                        </p>

                      </div>
                    )}

                  </div>
                )
              )}

              {/* =================================================
                  NORMAL MESSAGES
              ================================================= */}

              {messages.length === 0 &&
              repairAppointments.length === 0 ? (
                <div className="flex items-center justify-center h-full">

                  <div className="text-center">

                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white border border-slate-100 flex items-center justify-center">
                      <Send
                        size={18}
                        className="text-slate-300"
                      />
                    </div>

                    <p className="text-xs font-bold text-slate-400">
                      No messages yet
                    </p>

                    <p className="text-[10px] text-slate-300 mt-1">
                      Send a message to this harvester.
                    </p>

                  </div>

                </div>
              ) : (
                messages.map((message) => {

                  const isMe =
                    message.sender_id === userId;

                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${
                        isMe
                          ? "items-end"
                          : "items-start"
                      } max-w-[80%] ${
                        isMe
                          ? "ml-auto"
                          : ""
                      }`}
                    >

                      <div
                        className={`p-4 rounded-2xl shadow-sm text-xs ${
                          isMe
                            ? "bg-[#3285a1] text-white rounded-tr-none"
                            : "bg-white border border-slate-100 text-slate-600 rounded-tl-none"
                        }`}
                      >
                        {message.content}
                      </div>

                      <span className="text-[9px] font-bold text-slate-400 mt-2">
                        {message.created_at
                          ? new Date(
                              message.created_at
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : ""}
                      </span>

                    </div>
                  );
                })
              )}

            </div>

            {/* ==================================================
                MESSAGE INPUT
            ================================================== */}

            <form
              onSubmit={handleSendMessage}
              className="p-6 border-t border-slate-50"
            >

              {error && (
                <div className="mb-2 text-red-500 text-[10px] font-bold flex items-center gap-1">
                  <ShieldAlert size={12} />
                  {error}
                </div>
              )}

              <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl">

                <input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setError("");
                  }}
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none px-4 text-xs outline-none"
                />

                <button
                  type="submit"
                  className="p-3 bg-[#3285a1] text-white rounded-xl hover:opacity-90 transition"
                >
                  <Send size={18} />
                </button>

              </div>

            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RepairShopMessages;