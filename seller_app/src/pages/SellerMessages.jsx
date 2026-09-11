import React, { useEffect, useState } from "react";
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
  const [repairAppointments, setRepairAppointments] = useState([]);

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
  const [activeTransaction, setActiveTransaction] = useState(null);
  const [error, setError] = useState("");

  // ============================================================
  // HELPERS
  // ============================================================

  const isRepairShopChat = (chat) =>
    chat?.other_party_role_type === "repair_shop";

  const getConversationKey = ({
    listingId,
    otherPartyId,
    roleType,
  }) => {
    if (roleType === "repair_shop") {
      return `repair-shop-${otherPartyId}`;
    }

    if (listingId) {
      return `listing-${listingId}-${otherPartyId}`;
    }

    return `user-${otherPartyId}`;
  };

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  // ============================================================
  // FETCH CONVERSATIONS
  // ============================================================

  const fetchConversations = async () => {
    if (!userId) {
      setConversations([]);
      return;
    }

    try {
      // ----------------------------------------------------------
      // 1. FETCH NORMAL MESSAGES
      // ----------------------------------------------------------

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select(`
          id,
          listing_id,
          content,
          created_at,
          sender_id,
          receiver_id,
          listings (
            device_model
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (messageError) {
        console.error(
          "Error fetching conversations:",
          messageError.message
        );
      }

      // ----------------------------------------------------------
      // 2. FETCH REPAIR APPOINTMENTS
      // ----------------------------------------------------------

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
          .or(
            `harvester_id.eq.${userId},repair_shop_id.eq.${userId}`
          )
          .order("created_at", { ascending: false });

      if (appointmentError) {
        console.error(
          "Error fetching repair appointments:",
          appointmentError.message
        );
      }

      const messagesList = messageData || [];
      const appointmentsList = appointmentData || [];

      // ----------------------------------------------------------
      // 3. COLLECT OTHER USER IDS
      // ----------------------------------------------------------

      const otherPartyIds = new Set();

      messagesList.forEach((msg) => {
        const otherPartyId =
          msg.sender_id === userId
            ? msg.receiver_id
            : msg.sender_id;

        if (otherPartyId) {
          otherPartyIds.add(otherPartyId);
        }
      });

      appointmentsList.forEach((appointment) => {
        if (appointment.harvester_id === userId) {
          if (appointment.repair_shop_id) {
            otherPartyIds.add(appointment.repair_shop_id);
          }
        }

        if (appointment.repair_shop_id === userId) {
          if (appointment.harvester_id) {
            otherPartyIds.add(appointment.harvester_id);
          }
        }
      });

      // ----------------------------------------------------------
      // 4. FETCH PROFILES
      // ----------------------------------------------------------

      let profiles = [];

      if (otherPartyIds.size > 0) {
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              business_name,
              role,
              average_rating,
              total_reviews
            `)
            .in("id", [...otherPartyIds]);

        if (profileError) {
          console.error(
            "Error fetching profiles:",
            profileError.message
          );
        }

        profiles = profileData || [];
      }

      const profileMap = {};

      profiles.forEach((profile) => {
        const normalizedRole =
          profile.role?.toLowerCase().replace(/[\s-]+/g, "_");

        const isRepairShop =
          normalizedRole === "repair_shop";

        profileMap[profile.id] = {
          name: isRepairShop
            ? profile.business_name || "Repair Shop"
            : profile.full_name || "Tech Harvester",

          role: isRepairShop
            ? "Repair Shop"
            : "Tech Harvester",

          roleType: isRepairShop
            ? "repair_shop"
            : "harvester",

          rating: Number(profile.average_rating) || 0,

          reviewCount:
            Number(profile.total_reviews) || 0,
        };
      });

      // ----------------------------------------------------------
      // 5. BUILD CONVERSATIONS
      // ----------------------------------------------------------

      const conversationMap = new Map();

      // ----------------------------------------------------------
      // NORMAL MESSAGE CONVERSATIONS
      // ----------------------------------------------------------

      messagesList.forEach((msg) => {
        const isSender = msg.sender_id === userId;

        const otherPartyId = isSender
          ? msg.receiver_id
          : msg.sender_id;

        if (!otherPartyId) return;

        const otherPartyInfo =
          profileMap[otherPartyId] || {
            name: "Unknown User",
            role: "Tech Harvester",
            roleType: "harvester",
            rating: 0,
            reviewCount: 0,
          };

        const key = getConversationKey({
          listingId: msg.listing_id,
          otherPartyId,
          roleType: otherPartyInfo.roleType,
        });

        // For repair shops, keep the repair conversation separate
        // from marketplace listings.
        if (otherPartyInfo.roleType === "repair_shop") {
          const existing = conversationMap.get(key);

          if (
            !existing ||
            new Date(msg.created_at) >
              new Date(existing.created_at)
          ) {
            conversationMap.set(key, {
              ...msg,

              conversation_key: key,

              listing_id: null,

              other_party_id: otherPartyId,

              other_party_name: otherPartyInfo.name,

              other_party_role: otherPartyInfo.role,

              other_party_role_type:
                otherPartyInfo.roleType,

              other_party_rating:
                otherPartyInfo.rating,

              other_party_review_count:
                otherPartyInfo.reviewCount,

              repair_device_model:
                existing?.repair_device_model || null,
            });
          }

          return;
        }

        // Marketplace conversation
        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            ...msg,

            conversation_key: key,

            other_party_id: otherPartyId,

            other_party_name: otherPartyInfo.name,

            other_party_role: otherPartyInfo.role,

            other_party_role_type:
              otherPartyInfo.roleType,

            other_party_rating:
              otherPartyInfo.rating,

            other_party_review_count:
              otherPartyInfo.reviewCount,
          });
        }
      });

      // ----------------------------------------------------------
      // REPAIR APPOINTMENT CONVERSATIONS
      // ----------------------------------------------------------

      appointmentsList.forEach((appointment) => {
        const isHarvester =
          appointment.harvester_id === userId;

        const otherPartyId = isHarvester
          ? appointment.repair_shop_id
          : appointment.harvester_id;

        if (!otherPartyId) return;

        const otherPartyInfo =
          profileMap[otherPartyId] || {
            name: isHarvester
              ? "Repair Shop"
              : "Tech Harvester",

            role: isHarvester
              ? "Repair Shop"
              : "Tech Harvester",

            roleType: isHarvester
              ? "repair_shop"
              : "harvester",

            rating: 0,
            reviewCount: 0,
          };

        // We only treat these as repair-shop conversations
        // when the other party is the repair shop.
        const key = getConversationKey({
          listingId: null,
          otherPartyId,
          roleType: "repair_shop",
        });

        const existing = conversationMap.get(key);

        const appointmentPreview =
          `Repair Appointment Request: ${appointment.device_model || "Device"}`;

        const appointmentConversation = {
          ...(existing || {}),

          id:
            existing?.id ||
            `repair-appointment-${appointment.id}`,

          conversation_key: key,

          listing_id: null,

          content:
            existing?.content || appointmentPreview,

          created_at:
            existing?.created_at &&
            new Date(existing.created_at) >
              new Date(appointment.created_at)
              ? existing.created_at
              : appointment.created_at,

          sender_id:
            existing?.sender_id || appointment.harvester_id,

          receiver_id:
            existing?.receiver_id ||
            appointment.repair_shop_id,

          other_party_id: otherPartyId,

          other_party_name:
            otherPartyInfo.name,

          other_party_role:
            "Repair Shop",

          other_party_role_type:
            "repair_shop",

          other_party_rating:
            otherPartyInfo.rating,

          other_party_review_count:
            otherPartyInfo.reviewCount,

          repair_device_model:
            appointment.device_model,

          repair_category:
            appointment.category,

          repair_appointment_id:
            appointment.id,

          repair_appointment_status:
            appointment.status,
        };

        conversationMap.set(
          key,
          appointmentConversation
        );
      });

      // ----------------------------------------------------------
      // 6. SORT NEWEST FIRST
      // ----------------------------------------------------------

      const sortedConversations = [
        ...conversationMap.values(),
      ].sort(
        (a, b) =>
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
      );

      setConversations(sortedConversations);
    } catch (err) {
      console.error(
        "Unexpected error fetching conversations:",
        err
      );
    }
  };

  // Initial conversation fetch + realtime updates
  useEffect(() => {
    if (!userId) return;

    fetchConversations();

    const channel = supabase
      .channel(`messages-sidebar-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
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
        () => {
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
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ============================================================
  // FETCH DROP-OFF POINTS
  // ============================================================

  useEffect(() => {
    const fetchDropOffPoints = async () => {
      const { data, error } = await supabase
        .from("drop_off_points")
        .select(`
          id,
          name,
          barangay,
          city,
          address,
          latitude,
          longitude,
          is_active
        `)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error(
          "Error loading drop-off points:",
          error
        );
        return;
      }

      setDropOffPoints(data || []);
    };

    fetchDropOffPoints();
  }, []);

  // ============================================================
  // FETCH ACTIVE MARKETPLACE TRANSACTION
  // ============================================================

  const fetchActiveTransaction = async () => {
    // Repair Shop conversations do not use transactions.
    if (
      !activeChat ||
      !userId ||
      !activeChat.listing_id ||
      isRepairShopChat(activeChat)
    ) {
      setActiveTransaction(null);
      return null;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("listing_id", activeChat.listing_id)
      .or(
        `seller_id.eq.${userId},harvester_id.eq.${userId}`
      )
      .in("status", [
        "pending",
        "meetup_scheduled",
      ])
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Error fetching active transaction:",
        error.message
      );

      setActiveTransaction(null);
      return null;
    }

    setActiveTransaction(data || null);

    if (data) {
      setAcceptedBidAmount(
        Number(data.amount || 0)
      );
    }

    return data || null;
  };

  const fetchAcceptedBidAmount = async () => {
    const tx = await fetchActiveTransaction();

    if (tx) {
      setAcceptedBidAmount(
        Number(tx.amount || 0)
      );
    }
  };

  useEffect(() => {
    if (!activeChat) {
      setActiveTransaction(null);
      return;
    }

    fetchActiveTransaction();
  }, [activeChat, userId]);

  // ============================================================
  // FETCH ACTIVE CHAT
  // ============================================================

  useEffect(() => {
    if (!activeChat || !userId) {
      setMessages([]);
      setRepairAppointments([]);
      return;
    }

    const isRepairShop =
      activeChat.other_party_role_type ===
      "repair_shop";

    const fetchChatData = async () => {
      // --------------------------------------------------------
      // FETCH NORMAL CHAT MESSAGES
      // --------------------------------------------------------

      let messageQuery = supabase
        .from("messages")
        .select("*")
        .order("created_at", {
          ascending: true,
        });

      if (isRepairShop) {
        // Repair Shop chats are based on participants.
        // They DO NOT depend on listing_id.
        messageQuery = messageQuery.or(
          `and(sender_id.eq.${userId},receiver_id.eq.${activeChat.other_party_id}),and(sender_id.eq.${activeChat.other_party_id},receiver_id.eq.${userId})`
        );
      } else {
        // Marketplace chats use both:
        // 1. listing_id
        // 2. participants
        messageQuery = messageQuery
          .eq(
            "listing_id",
            activeChat.listing_id
          )
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${activeChat.other_party_id}),and(sender_id.eq.${activeChat.other_party_id},receiver_id.eq.${userId})`
          );
      }

      const {
        data: messageData,
        error: messageError,
      } = await messageQuery;

      if (messageError) {
        console.error(
          "Error fetching chat messages:",
          messageError.message
        );

        setMessages([]);
      } else {
        setMessages(messageData || []);
      }

      // --------------------------------------------------------
      // FETCH REPAIR APPOINTMENTS
      // --------------------------------------------------------

      if (isRepairShop) {
        const {
          data: appointmentData,
          error: appointmentError,
        } = await supabase
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
          .or(
            `and(harvester_id.eq.${userId},repair_shop_id.eq.${activeChat.other_party_id}),and(harvester_id.eq.${activeChat.other_party_id},repair_shop_id.eq.${userId})`
          )
          .order("created_at", {
            ascending: true,
          });

        if (appointmentError) {
          console.error(
            "Error fetching repair appointments:",
            appointmentError.message
          );

          setRepairAppointments([]);
        } else {
          setRepairAppointments(
            appointmentData || []
          );
        }
      } else {
        setRepairAppointments([]);
      }
    };

    fetchChatData();

    // ==========================================================
    // REALTIME CHANNEL
    // ==========================================================

    const channel = supabase
      .channel(
        `chat-${userId}-${activeChat.other_party_id}-${activeChat.listing_id || "repair"}`
      )

      // --------------------------------------------------------
      // REALTIME NORMAL MESSAGES
      // --------------------------------------------------------

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new;

          const belongsToChat =
            (msg.sender_id === userId &&
              msg.receiver_id ===
                activeChat.other_party_id) ||
            (msg.sender_id ===
                activeChat.other_party_id &&
              msg.receiver_id === userId);

          if (!belongsToChat) return;

          // Marketplace chat must match listing.
          if (
            !isRepairShop &&
            msg.listing_id !==
              activeChat.listing_id
          ) {
            return;
          }

          // Repair Shop chat should not accidentally
          // receive marketplace messages.
          if (
            isRepairShop &&
            msg.listing_id
          ) {
            return;
          }

          setMessages((prev) => {
            if (
              prev.some(
                (item) => item.id === msg.id
              )
            ) {
              return prev;
            }

            return [...prev, msg];
          });

          // Refresh sidebar timestamp/content.
          fetchConversations();
        }
      )

      // --------------------------------------------------------
      // REALTIME REPAIR APPOINTMENTS
      // --------------------------------------------------------

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "repair_appointments",
        },
        (payload) => {
          const appointment =
            payload.new;

          if (
            !isRepairShop
          ) {
            return;
          }

          const belongsToChat =
            (appointment.harvester_id ===
              userId &&
              appointment.repair_shop_id ===
                activeChat.other_party_id) ||
            (appointment.harvester_id ===
              activeChat.other_party_id &&
              appointment.repair_shop_id ===
                userId);

          if (!belongsToChat) return;

          setRepairAppointments(
            (prev) => {
              if (
                prev.some(
                  (item) =>
                    item.id ===
                    appointment.id
                )
              ) {
                return prev;
              }

              return [
                ...prev,
                appointment,
              ];
            }
          );

          fetchConversations();
        }
      )

      // --------------------------------------------------------
      // REALTIME APPOINTMENT UPDATES
      // --------------------------------------------------------

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "repair_appointments",
        },
        (payload) => {
          const appointment =
            payload.new;

          if (
            !isRepairShop
          ) {
            return;
          }

          const belongsToChat =
            (appointment.harvester_id ===
              userId &&
              appointment.repair_shop_id ===
                activeChat.other_party_id) ||
            (appointment.harvester_id ===
              activeChat.other_party_id &&
              appointment.repair_shop_id ===
                userId);

          if (!belongsToChat) return;

          setRepairAppointments(
            (prev) =>
              prev.map((item) =>
                item.id ===
                appointment.id
                  ? appointment
                  : item
              )
          );

          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [activeChat, userId]);

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (
      !newMessage.trim() ||
      !activeChat
    ) {
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

    const isRepairShop =
      activeChat.other_party_role_type ===
      "repair_shop";

    const { error: sendError } =
      await supabase
        .from("messages")
        .insert([
          {
            // Repair Shop messages are independent
            // of marketplace listings.
            listing_id: isRepairShop
              ? null
              : activeChat.listing_id,

            sender_id: userId,

            receiver_id:
              activeChat.other_party_id,

            content:
              newMessage.trim(),
          },
        ]);

    if (sendError) {
      console.error(
        "Error sending message:",
        sendError.message
      );

      setError(
        "Unable to send message. Please try again."
      );

      return;
    }

    setNewMessage("");
  };

  // ============================================================
  // SCHEDULE MARKETPLACE MEETUP
  // ============================================================

  const handleScheduleMeetup = async () => {
    // Repair Shops do not use marketplace meetup scheduling.
    if (
      !activeChat ||
      isRepairShopChat(activeChat) ||
      !activeChat.listing_id
    ) {
      alert(
        "Meetup scheduling is only available for marketplace transactions."
      );

      return;
    }

    if (
      !meetupData.date ||
      !meetupData.time ||
      !meetupData.drop_off_point_id
    ) {
      alert(
        "Please select a date, time, and drop-off point."
      );

      return;
    }

    try {
      // Only the listing owner may schedule.
      const {
        data: existingTx,
        error: fetchError,
      } = await supabase
        .from("transactions")
        .select("*")
        .eq(
          "listing_id",
          activeChat.listing_id
        )
        .eq(
          "seller_id",
          userId
        )
        .eq(
          "harvester_id",
          activeChat.other_party_id
        )
        .eq(
          "status",
          "pending"
        )
        .maybeSingle();

      if (
        fetchError ||
        !existingTx
      ) {
        throw new Error(
          "Pending seller transaction not found. Only the listing owner can schedule the meetup."
        );
      }

      // --------------------------------------------------------
      // UPDATE TRANSACTION
      // --------------------------------------------------------

      const {
        error: scheduleError,
      } = await supabase
        .from("transactions")
        .update({
          drop_off_point_id:
            meetupData.drop_off_point_id,

          barangay:
            meetupData.location,

          meetup_date:
            meetupData.date,

          meetup_time:
            meetupData.time,

          notes:
            meetupData.notes,

          status:
            "meetup_scheduled",
        })
        .eq(
          "id",
          existingTx.id
        );

      if (scheduleError) {
        throw scheduleError;
      }

      const finalPrice =
        Number(existingTx.amount || 0);

      // --------------------------------------------------------
      // UPDATE LISTING
      // --------------------------------------------------------

      const {
        error: listingError,
      } = await supabase
        .from("listings")
        .update({
          status:
            "Meetup Scheduled",
        })
        .eq(
          "id",
          activeChat.listing_id
        );

      if (listingError) {
        console.error(
          "Listing status update failed:",
          listingError.message
        );
      }

      // --------------------------------------------------------
      // AUTOMATED MESSAGE
      // --------------------------------------------------------

      const meetupMessage = `Meetup Scheduled!
Final Price: ₱${finalPrice.toLocaleString()}
Location: ${meetupData.location}
Date: ${meetupData.date} at ${meetupData.time}${
        meetupData.notes
          ? `\nNotes: ${meetupData.notes}`
          : ""
      }`;

      const {
        error: messageError,
      } = await supabase
        .from("messages")
        .insert([
          {
            listing_id:
              activeChat.listing_id,

            sender_id:
              userId,

            receiver_id:
              activeChat.other_party_id,

            content:
              meetupMessage,
          },
        ]);

      if (messageError) {
        console.error(
          "Automated meetup message failed:",
          messageError.message
        );
      }

      alert(
        `Meetup Scheduled for ₱${finalPrice.toLocaleString()}`
      );

      setIsModalOpen(false);

      setMeetupData({
        date: "",
        time: "",
        location: "",
        drop_off_point_id: "",
        notes: "",
      });

      await fetchActiveTransaction();

      await fetchConversations();

      if (onTabChange) {
        onTabChange("transactions");
      }
    } catch (err) {
      console.error(
        "Error scheduling meetup:",
        err
      );

      alert(
        "Transaction failed: " +
          (err.message ||
            "Unknown error")
      );
    }
  };

  // ============================================================
  // SELECT CONVERSATION
  // ============================================================

  const handleSelectConversation = (
    conversation
  ) => {
    setActiveChat(conversation);
    setMessages([]);
    setRepairAppointments([]);
    setError("");
    setNewMessage("");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex h-[600px] bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden font-sans">

      {/* ======================================================
          SIDEBAR
      ======================================================= */}

      <div className="w-80 border-r border-slate-50 flex flex-col">

        <div className="p-6 border-b border-slate-50">
          <h3 className="font-bold text-slate-800 mb-4">
            Messages
          </h3>

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

          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[11px] text-slate-400">
                No conversations yet.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {

              const isActive =
                activeChat?.conversation_key ===
                conv.conversation_key;

              const isRepairShop =
                conv.other_party_role_type ===
                "repair_shop";

              return (
                <div
                  key={
                    conv.conversation_key
                  }
                  onClick={() =>
                    handleSelectConversation(
                      conv
                    )
                  }
                  className={`p-4 cursor-pointer transition-all ${
                    isActive
                      ? "bg-teal-50 border-l-4 border-[#2d7a7f]"
                      : "hover:bg-slate-50"
                  }`}
                >

                  <div className="flex justify-between items-start mb-1">

                    <div className="flex items-center gap-2 min-w-0">

                      <span className="font-bold text-xs text-slate-700 truncate">
                        {conv.other_party_name ||
                          "Unknown User"}
                      </span>

                      <span
                        className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isRepairShop
                            ? "bg-violet-100 text-violet-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {conv.other_party_role ||
                          "Tech Harvester"}
                      </span>

                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {formatTime(
                        conv.created_at
                      )}
                    </span>

                  </div>

                  <div className="flex items-center gap-1 mb-1.5">
                    {renderStars(
                      conv.other_party_rating
                    )}

                    <span className="text-[9px] text-slate-500 font-medium">
                      {Number(
                        conv.other_party_rating ||
                          0
                      ).toFixed(1)}{" "}
                      (
                      {conv.other_party_review_count ||
                        0}
                      )
                    </span>
                  </div>

                  <p className="text-[10px] text-teal-600 font-bold mb-1">

                    {isRepairShop
                      ? `Repair: ${
                          conv.repair_device_model ||
                          "Appointment"
                        }`
                      : `Re: ${
                          conv.listings
                            ?.device_model ||
                          "Item"
                        }`}

                  </p>

                  <p className="text-[11px] text-slate-500 truncate">
                    {conv.content ||
                      "No messages yet."}
                  </p>

                </div>
              );
            })
          )}

        </div>
      </div>

      {/* ======================================================
          MAIN CHAT
      ======================================================= */}

      <div className="flex-1 flex flex-col">

        {activeChat ? (
          <>

            {/* ==================================================
                CHAT HEADER
            =================================================== */}

            <div className="p-6 border-b border-slate-50 flex justify-between items-center">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>

                <div>

                  <div className="flex items-center gap-2">

                    <p className="font-bold text-xs text-slate-700">
                      {activeChat.other_party_name ||
                        "Unknown User"}
                    </p>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        activeChat.other_party_role_type ===
                        "repair_shop"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {activeChat.other_party_role ||
                        "Tech Harvester"}
                    </span>

                  </div>

                  <p className="text-[10px] text-slate-400">
                    {activeChat.other_party_role_type ===
                    "repair_shop"
                      ? "Repair Shop Conversation"
                      : "Marketplace Conversation"}
                  </p>

                  <div className="flex items-center gap-1 mt-0.5">

                    {renderStars(
                      activeChat.other_party_rating
                    )}

                    <span className="text-[10px] text-slate-500 font-medium">
                      {Number(
                        activeChat.other_party_rating ||
                          0
                      ).toFixed(1)}{" "}
                      (
                      {activeChat.other_party_review_count ||
                        0}
                      )
                    </span>

                  </div>

                </div>
              </div>

              {/* ------------------------------------------------
                  MARKETPLACE MEETUP BUTTON
              ------------------------------------------------- */}

              {activeChat.other_party_role_type !==
                "repair_shop" &&
                activeTransaction?.seller_id ===
                  userId &&
                activeTransaction?.status ===
                  "pending" && (
                  <button
                    onClick={async () => {
                      await fetchAcceptedBidAmount();
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-[#2d7a7f] text-white px-4 py-2 rounded-xl text-[10px] font-bold"
                  >
                    <Calendar size={14} />
                    Schedule Meetup
                  </button>
                )}

              {activeChat.other_party_role_type !==
                "repair_shop" &&
                activeTransaction?.harvester_id ===
                  userId &&
                activeTransaction?.status ===
                  "meetup_scheduled" && (
                  <span className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-bold border border-emerald-100">
                    <CheckCheck size={14} />
                    Meetup Scheduled
                  </span>
                )}

            </div>

            {/* ==================================================
                CHAT CONTENT
            =================================================== */}

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">

              {/* ------------------------------------------------
                  MARKETPLACE ITEM INFO
              ------------------------------------------------- */}

              {activeChat.other_party_role_type !==
                "repair_shop" &&
                activeChat.listings?.device_model && (
                  <div className="bg-white border border-emerald-100 rounded-2xl p-4">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-emerald-600">
                      Marketplace Item
                    </p>

                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {
                        activeChat.listings
                          .device_model
                      }
                    </p>
                  </div>
                )}

              {/* ------------------------------------------------
                  REPAIR APPOINTMENTS
              ------------------------------------------------- */}

              {activeChat.other_party_role_type ===
                "repair_shop" &&
                repairAppointments.length > 0 && (
                  <div className="space-y-4">

                    {repairAppointments.map(
                      (appointment) => (
                        <div
                          key={
                            appointment.id
                          }
                          className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm"
                        >

                          <div className="flex items-center justify-between mb-3">

                            <div className="flex items-center gap-2">

                              <Calendar
                                size={16}
                                className="text-violet-600"
                              />

                              <span className="text-xs font-bold text-violet-700">
                                Repair Appointment
                              </span>

                            </div>

                            <span className="text-[9px] px-2 py-1 rounded-full bg-violet-50 text-violet-600 font-bold uppercase">
                              {appointment.status ||
                                "pending"}
                            </span>

                          </div>

                          <div className="space-y-2 text-[11px] text-slate-600">

                            <p>
                              <span className="font-bold">
                                Device:
                              </span>{" "}
                              {appointment.device_model ||
                                "Not specified"}
                            </p>

                            <p>
                              <span className="font-bold">
                                Category:
                              </span>{" "}
                              {appointment.category ||
                                "Not specified"}
                            </p>

                            <p>
                              <span className="font-bold">
                                Issue:
                              </span>{" "}
                              {appointment.issue_description ||
                                "Not specified"}
                            </p>

                            <p className="flex items-center gap-2">
                              <Calendar
                                size={13}
                              />

                              <span>
                                {formatDate(
                                  appointment.preferred_date
                                )}
                              </span>
                            </p>

                            <p className="flex items-center gap-2">
                              <Clock
                                size={13}
                              />

                              <span>
                                {appointment.preferred_time ||
                                  "Not specified"}
                              </span>
                            </p>

                            {appointment.notes && (
                              <p>
                                <span className="font-bold">
                                  Notes:
                                </span>{" "}
                                {
                                  appointment.notes
                                }
                              </p>
                            )}

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              {/* ------------------------------------------------
                  NO APPOINTMENT MESSAGE
              ------------------------------------------------- */}

              {activeChat.other_party_role_type ===
                "repair_shop" &&
                repairAppointments.length ===
                  0 && (
                  <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                    <p className="text-[10px] text-violet-600">
                      No repair appointment has
                      been submitted in this
                      conversation yet.
                    </p>
                  </div>
                )}

              {/* ------------------------------------------------
                  NORMAL MESSAGES
              ------------------------------------------------- */}

              {messages.map((msg) => {

                const isMe =
                  msg.sender_id ===
                  userId;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMe
                        ? "items-end ml-auto"
                        : "items-start"
                    } max-w-[80%]`}
                  >

                    <div
                      className={`p-4 rounded-2xl shadow-sm text-xs ${
                        isMe
                          ? "bg-[#2d7a7f] text-white rounded-tr-none"
                          : "bg-white border border-slate-100 text-slate-600 rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>

                    <span className="text-[9px] font-bold text-slate-400 mt-2">
                      {formatTime(
                        msg.created_at
                      )}
                    </span>

                  </div>
                );
              })}

            </div>

            {/* ==================================================
                MESSAGE INPUT
            =================================================== */}

            <form
              onSubmit={
                handleSendMessage
              }
              className="p-6 border-t border-slate-50"
            >

              {error && (
                <div className="mb-2 text-red-500 text-[10px] font-bold flex items-center gap-1">
                  <ShieldAlert
                    size={12}
                  />

                  {error}
                </div>
              )}

              <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl">

                <input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(
                      e.target.value
                    );

                    if (error) {
                      setError("");
                    }
                  }}
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

      {/* ========================================================
          MARKETPLACE MEETUP MODAL
      ========================================================= */}

      {isModalOpen &&
        activeChat &&
        activeChat.other_party_role_type !==
          "repair_shop" && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">

            <div className="bg-white rounded-[1.5rem] w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">

              {/* ------------------------------------------------
                  HEADER
              ------------------------------------------------- */}

              <div className="p-8 pb-4 flex justify-between items-start">

                <div>

                  <h2 className="font-bold text-[#2d3748] text-xl">
                    Schedule Meetup
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    With{" "}
                    {activeChat.other_party_name ||
                      "User"}{" "}
                    for{" "}
                    {activeChat.listings
                      ?.device_model ||
                      "Item"}
                  </p>

                </div>

                <button
                  onClick={() =>
                    setIsModalOpen(
                      false
                    )
                  }
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>

              </div>

              <div className="px-8 pb-8 space-y-6 max-h-[80vh] overflow-y-auto">

                {/* ------------------------------------------------
                    ACCEPTED BID
                ------------------------------------------------- */}

                <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-emerald-100 rounded-2xl p-6 flex justify-between items-center">

                  <div>

                    <p className="text-[11px] font-semibold text-emerald-700/70 uppercase tracking-wider">
                      Accepted Bid Amount
                    </p>

                    <p className="text-2xl font-bold text-[#2d7a7f] mt-1">
                      ₱
                      {Number(
                        acceptedBidAmount || 0
                      ).toLocaleString()}
                    </p>

                  </div>

                  <div className="bg-emerald-500 rounded-full p-1">
                    <Check
                      size={20}
                      className="text-white"
                    />
                  </div>

                </div>

                {/* ------------------------------------------------
                    DATE
                ------------------------------------------------- */}

                <div>

                  <label className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-3">
                    <Calendar
                      size={16}
                      className="text-[#2d7a7f]"
                    />

                    Select Date
                  </label>

                  <input
                    type="date"
                    value={
                      meetupData.date
                    }
                    min={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    onChange={(e) =>
                      setMeetupData({
                        ...meetupData,
                        date: e.target.value,
                      })
                    }
                  />

                </div>

                {/* ------------------------------------------------
                    TIME
                ------------------------------------------------- */}

                <div>

                  <label className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-3">
                    <Clock
                      size={16}
                      className="text-[#2d7a7f]"
                    />

                    Select Time
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
                        type="button"
                        onClick={() =>
                          setMeetupData({
                            ...meetupData,
                            time: t,
                          })
                        }
                        className={`p-3 text-xs rounded-xl border transition-all duration-200 ${
                          meetupData.time ===
                          t
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
                    value={
                      meetupData.time
                    }
                    className="w-full mt-3 p-4 border border-slate-200 rounded-xl text-sm outline-none"
                    onChange={(e) =>
                      setMeetupData({
                        ...meetupData,
                        time: e.target.value,
                      })
                    }
                  />

                </div>

                {/* ------------------------------------------------
                    LOCATION
                ------------------------------------------------- */}

                <div>

                  <label className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-3">
                    <MapPin
                      size={16}
                      className="text-[#2d7a7f]"
                    />

                    Meeting Location
                  </label>

                  <div className="space-y-2">

                    {dropOffPoints.length ===
                    0 ? (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
                        No active drop-off
                        points available.
                      </div>
                    ) : (
                      dropOffPoints.map(
                        (point) => (
                          <button
                            key={
                              point.id
                            }
                            type="button"
                            onClick={() =>
                              setMeetupData({
                                ...meetupData,
                                location:
                                  point.name,
                                drop_off_point_id:
                                  point.id,
                              })
                            }
                            className={`w-full p-4 flex items-start gap-3 text-left rounded-xl border transition-all ${
                              meetupData.drop_off_point_id ===
                              point.id
                                ? "border-[#2d7a7f] bg-teal-50/30 text-[#2d7a7f] font-medium"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >

                            <Navigation
                              size={14}
                              className={
                                meetupData.drop_off_point_id ===
                                point.id
                                  ? "text-[#2d7a7f] mt-1"
                                  : "text-slate-400 mt-1"
                              }
                            />

                            <div>

                              <p className="text-sm font-semibold">
                                {
                                  point.name
                                }
                              </p>

                              <p className="text-[11px] text-slate-400 mt-1">
                                {
                                  point.address
                                }
                              </p>

                              <p className="text-[10px] text-slate-400 mt-1">
                                {
                                  point.barangay
                                }
                                ,{" "}
                                {
                                  point.city
                                }
                              </p>

                            </div>

                          </button>
                        )
                      )
                    )}

                  </div>

                </div>

                {/* ------------------------------------------------
                    NOTES
                ------------------------------------------------- */}

                <div>

                  <label className="text-xs font-bold text-slate-600 mb-3 block">
                    Additional Notes
                    (Optional)
                  </label>

                  <textarea
                    value={
                      meetupData.notes
                    }
                    placeholder="e.g., I'll be wearing a blue jacket, bring the device in original packaging..."
                    className="w-full p-4 border border-slate-200 rounded-xl text-sm outline-none h-28 resize-none focus:ring-2 focus:ring-teal-500/20"
                    onChange={(e) =>
                      setMeetupData({
                        ...meetupData,
                        notes: e.target.value,
                      })
                    }
                  />

                </div>

                {/* ------------------------------------------------
                    BUTTONS
                ------------------------------------------------- */}

                <div className="flex gap-4 pt-4">

                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(
                        false
                      );

                      setMeetupData({
                        date: "",
                        time: "",
                        location: "",
                        drop_off_point_id:
                          "",
                        notes: "",
                      });
                    }}
                    className="flex-1 py-4 px-6 border border-slate-200 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleScheduleMeetup
                    }
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