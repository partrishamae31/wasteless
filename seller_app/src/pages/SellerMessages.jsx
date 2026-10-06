import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { containsRestrictedContent } from "../utils/restrictedContentFilter";
import { recordTransactionStatusHistory } from "../utils/transactionHistory";
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
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [error, setError] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState([]);
  const [recipientLoading, setRecipientLoading] = useState(false);

  // REQ-2: the signed-in user's own verification state. Pending
  // Verification accounts are view-only (receive and read, no reply).
  const [senderProfile, setSenderProfile] = useState(null);
  const [senderProfileLoaded, setSenderProfileLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSenderProfile = async () => {
      if (!userId) {
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, verification_status, status")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (profileError) {
        console.error(
          "Error loading sender profile:",
          profileError.message
        );
      }

      setSenderProfile(data || null);
      setSenderProfileLoaded(true);
    };

    loadSenderProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Mirrors the enforce_verified_message_sender database trigger.
  const senderRole = String(senderProfile?.role || "").toLowerCase();
  const senderVerification = String(
    senderProfile?.verification_status || ""
  ).toLowerCase();
  const senderStatus = String(senderProfile?.status || "").toLowerCase();

  const isSenderRestricted = [
    "blocked",
    "suspended",
    "inactive",
    "banned",
  ].includes(senderStatus);

  const isSenderAdmin = ["admin", "administrator"].includes(senderRole);

  const canSendMessages =
    senderProfileLoaded &&
    !isSenderRestricted &&
    (isSenderAdmin ||
      ["verified", "approved"].includes(senderVerification));

  const isViewOnly = senderProfileLoaded && !canSendMessages;

  // ============================================================
  // HELPERS
  // ============================================================

  const isRepairShopChat = (chat) =>
    chat?.other_party_role_type === "repair_shop" &&
    !chat?.listing_id;

  const getConversationKey = ({
    listingId,
    otherPartyId,
    roleType,
  }) => {
    // A marketplace conversation must always be scoped to its listing,
    // even when the bidder is a Repair Shop.
    if (listingId) {
      return `listing-${listingId}-${otherPartyId}`;
    }

    if (roleType === "repair_shop") {
      return `repair-shop-${otherPartyId}`;
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

  const normalizeTransactionStatus = (status) =>
    String(status || "").trim().toLowerCase();

  const formatTransactionStatus = (status) => {
    const normalized = normalizeTransactionStatus(status);
    const labels = { pending: "Pending", matched: "Matched", meetup_scheduled: "Meetup Scheduled", completed: "Completed", cancelled: "Cancelled" };
    return labels[normalized] || status || "Unknown";
  };

  const fetchTransactionHistory = async (transactionId) => {
    if (!transactionId) { setTransactionHistory([]); return; }
    const { data, error: historyError } = await supabase
      .from("transaction_status_history")
      .select("id, old_status, new_status, changed_at, meetup_date, meetup_time, meeting_location, notes")
      .eq("transaction_id", transactionId)
      .order("changed_at", { ascending: false });
    if (historyError) {
      console.warn("Transaction history could not be loaded:", historyError.message);
      setTransactionHistory([]);
      return;
    }
    setTransactionHistory(data || []);
  };

  const formatMeetupTime = (timeValue) => {
    if (!timeValue) return "";
    const [hours, minutes] = String(timeValue).split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeValue;

    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
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

        // Repair Shop users can participate in TWO different kinds of chat:
        // 1. marketplace chat -> has listing_id and must keep transaction context
        // 2. repair-service chat -> no listing_id and uses repair appointments
        if (
          otherPartyInfo.roleType === "repair_shop" &&
          !msg.listing_id
        ) {
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
              other_party_role_type: otherPartyInfo.roleType,
              other_party_rating: otherPartyInfo.rating,
              other_party_review_count: otherPartyInfo.reviewCount,
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "repair_appointments" }, () => fetchConversations())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "repair_appointments" }, () => fetchConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
        const row = payload?.new || {};
        if (row.seller_id === userId || row.harvester_id === userId) { fetchConversations(); fetchActiveTransaction(); }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "transactions" }, (payload) => {
        const row = payload?.new || {};
        if (row.seller_id === userId || row.harvester_id === userId) {
          fetchConversations();
          fetchActiveTransaction();
          if (activeTransaction?.id === row.id) fetchTransactionHistory(row.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, activeChat?.listing_id, activeTransaction?.id]);

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
    // Marketplace conversations use transactions regardless of
    // whether the accepted bidder is a normal harvester or a Repair Shop.
    // Only true repair-service chats (no listing_id) skip transactions.
    if (
      !activeChat ||
      !userId ||
      !activeChat.listing_id
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
        "matched",
        "Matched",
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
      await fetchTransactionHistory(data.id);
    } else {
      setTransactionHistory([]);
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
      setTransactionHistory([]);
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

    // Only a Repair Shop chat without listing_id is a repair-service chat.
    // A Repair Shop with listing_id is a marketplace transaction chat.
    const isRepairShop = isRepairShopChat(activeChat);

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
        const loadedMessages = messageData || [];

        // REQ-1/REQ-2: once the recipient actually loads the thread, mark
        // incoming messages as delivered. This is persisted in messages.delivered_at
        // through a secured RPC so clients cannot mark another user's messages.
        const incomingUndelivered = loadedMessages.filter(
          (message) =>
            message.receiver_id === userId &&
            !message.delivered_at
        );

        if (incomingUndelivered.length > 0) {
          await Promise.all(
            incomingUndelivered.map((message) =>
              supabase.rpc("mark_message_delivered", {
                p_message_id: message.id,
              })
            )
          );

          incomingUndelivered.forEach((message) => {
            message.delivered_at = new Date().toISOString();
          });
        }

        setMessages(loadedMessages);
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
      // REALTIME DELIVERY UPDATES
      // --------------------------------------------------------
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new;
          const belongsToChat =
            (updated.sender_id === userId && updated.receiver_id === activeChat.other_party_id) ||
            (updated.sender_id === activeChat.other_party_id && updated.receiver_id === userId);
          if (!belongsToChat) return;
          if (!isRepairShop && updated.listing_id !== activeChat.listing_id) return;
          if (isRepairShop && updated.listing_id) return;
          setMessages((prev) =>
            prev.map((item) => item.id === updated.id ? { ...item, ...updated } : item)
          );
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
  // NEW MESSAGE / RECIPIENT SEARCH
  // ============================================================

  const searchRecipients = async () => {
    if (!canSendMessages || !userId) return;
    const term = recipientSearch.trim();
    if (term.length < 2) {
      setRecipientResults([]);
      return;
    }

    setRecipientLoading(true);
    try {
      const { data, error: searchError } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, role, verification_status, status, average_rating, total_reviews")
        .neq("id", userId)
        .not("status", "in", "(blocked,suspended,inactive,banned)")
        .or(`full_name.ilike.%${term}%,business_name.ilike.%${term}%`)
        .limit(20);

      if (searchError) throw searchError;
      setRecipientResults(data || []);
    } catch (searchError) {
      console.error("Recipient search error:", searchError);
      setError("Unable to search for users right now.");
      setRecipientResults([]);
    } finally {
      setRecipientLoading(false);
    }
  };

  const startNewConversation = (profile) => {
    const role = String(profile.role || "").toLowerCase().replace(/[\s-]+/g, "_");
    const isRepairShop = role === "repair_shop";
    setActiveChat({
      conversation_key: `user-${profile.id}`,
      other_party_id: profile.id,
      other_party_name: profile.business_name || profile.full_name || "User",
      other_party_role: isRepairShop ? "Repair Shop" : "Tech Harvester",
      other_party_role_type: isRepairShop ? "repair_shop" : "harvester",
      other_party_rating: Number(profile.average_rating) || 0,
      other_party_review_count: Number(profile.total_reviews) || 0,
      listing_id: null,
      content: "",
      created_at: new Date().toISOString(),
      isNewConversation: true,
    });
    setMessages([]);
    setRepairAppointments([]);
    setError("");
    setNewMessage("");
    setShowNewMessage(false);
    setRecipientSearch("");
    setRecipientResults([]);
  };

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

    // REQ-2: Pending Verification accounts are view-only.
    if (!canSendMessages) {
      setError(
        isSenderRestricted
          ? "Message blocked: Your account is not allowed to send messages."
          : "Pending Verification accounts are view-only and cannot send messages."
      );
      return;
    }

    // TC_MSG_03: block transmission of restricted content and show
    // a content-violation warning instead of sending the message.
    const contentViolation = containsRestrictedContent(newMessage);

    if (contentViolation.blocked) {
      setError(contentViolation.message);
      return;
    }

    setError("");

    // TC_MSG_04: verify that the recipient is still allowed
    // to receive messages before attempting the insert.
    const { data: recipientProfile, error: recipientError } =
      await supabase
        .from("profiles")
        .select(
          "id, full_name, business_name, role, is_verified, verification_status, status"
        )
        .eq("id", activeChat.other_party_id)
        .maybeSingle();

    if (recipientError) {
      console.error(
        "Error checking recipient communication access:",
        recipientError.message
      );
      setError(
        "Unable to verify communication access. Please try again."
      );
      return;
    }

    const recipientStatus =
      String(recipientProfile?.status || "").toLowerCase();

    const isBlocked =
      ["blocked", "suspended", "inactive", "banned"].includes(
        recipientStatus
      );

    // REQ-1: a Verified sender may message Verified OR Pending
    // Verification users, so the recipient's verification status is
    // intentionally not checked here. Only missing or blocked
    // accounts are rejected.
    if (!recipientProfile || isBlocked) {
      setError(
        "Message blocked: This account is not currently eligible to receive messages."
      );
      return;
    }

    // Only a Repair Shop chat without listing_id is a repair-service chat.
    // A Repair Shop with listing_id is a marketplace transaction chat.
    const isRepairShop = isRepairShopChat(activeChat);

    const messagePayload = {
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
    };

    const {
      data: insertedMessage,
      error: sendError,
    } = await supabase
      .from("messages")
      .insert([messagePayload])
      .select("*")
      .single();

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

    // TC_MSG_01: create an in-app notification for the recipient.
    // Notification failure should not undo a successfully stored message.
    const senderName =
      isRepairShop
        ? "Repair Shop"
        : "Tech Owner/Dealer";

    const { error: notificationError } =
      await supabase
        .from("notifications")
        .insert([
          {
            user_id: activeChat.other_party_id,
            type: "message",
            title: "New Message",
            content: `${senderName} sent you a new message.`,
            related_listing_id:
              activeChat.listing_id || null,
            is_read: false,
            description:
              "You received a new in-app message.",
          },
        ]);

    if (notificationError) {
      console.warn(
        "Message notification could not be created:",
        notificationError.message
      );
    }

    // Add the inserted row immediately so the sender sees the
    // message without waiting for the realtime event.
    if (insertedMessage) {
      setActiveChat((prev) => prev ? { ...prev, isNewConversation: false } : prev);
      setMessages((prev) => {
        if (
          prev.some(
            (item) => item.id === insertedMessage.id
          )
        ) {
          return prev;
        }

        return [...prev, insertedMessage];
      });
    }

    setNewMessage("");
  };

  // ============================================================
  // SCHEDULE MARKETPLACE MEETUP
  // ============================================================

  const handleScheduleMeetup = async () => {
    // Marketplace meetup scheduling works for both normal harvesters
    // and Repair Shops when they are the accepted bidder.
    if (
      !activeChat ||
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

    // 7.2.2.1: reject an invalid or past schedule instead of saving it.
    const scheduledAt = new Date(
      `${meetupData.date}T${String(meetupData.time).slice(0, 5)}:00`
    );

    if (Number.isNaN(scheduledAt.getTime())) {
      alert("The meetup date or time is invalid. Please correct it.");
      return;
    }

    if (scheduledAt.getTime() <= Date.now()) {
      alert("The meetup must be scheduled for a future date and time.");
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
        .in("status", [
          "pending",
          "matched",
          "Matched",
        ])
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();
      if (existingTx.seller_id !== userId) {
        throw new Error("Only the listing owner can schedule the meetup.");
      }

      const currentStatus = normalizeTransactionStatus(existingTx.status);
      if (!["pending", "matched"].includes(currentStatus)) {
        throw new Error("This transaction is no longer available for meetup scheduling.");
      }

      // --------------------------------------------------------
      // UPDATE TRANSACTION
      // --------------------------------------------------------

      // Resolve the selected drop-off point so the transaction records the
      // point's canonical BARANGAY, not its display name. Admin dashboards
      // scope transactions with .eq("barangay", adminBarangay), so storing
      // the point name here would hide the transaction from every
      // barangay coordinator.
      const selectedPoint = dropOffPoints.find(
        (point) => point.id === meetupData.drop_off_point_id
      );

      const {
        data: scheduledTx,
        error: scheduleError,
      } = await supabase
        .from("transactions")
        .update({
          drop_off_point_id:
            meetupData.drop_off_point_id,

          updated_at:
            new Date().toISOString(),

          barangay:
            selectedPoint?.barangay ||
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
        )
        .in("status", [
          "pending",
          "matched",
          "Matched",
        ])
        .select("*")
        .maybeSingle();

      if (scheduleError) {
        throw scheduleError;
      }

      if (!scheduledTx) {
        throw new Error(
          "The transaction status changed before the meetup could be saved. Please refresh and try again."
        );
      }

      // REQ-3: record the status change in the transaction history.
      await recordTransactionStatusHistory({
        transactionId: existingTx.id,
        oldStatus: currentStatus,
        newStatus: "meetup_scheduled",
        transaction: scheduledTx,
        notes: meetupData.notes || "Meetup scheduled by the seller.",
      });

      await fetchTransactionHistory(existingTx.id);

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
Date: ${meetupData.date} at ${formatMeetupTime(meetupData.time)}${
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
    <>
      {showNewMessage && (
        <div className="fixed inset-0 z-[500] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-slate-800">New Message</h3>
                <p className="text-xs text-slate-400 mt-1">Search for a Verified or Pending Verification user.</p>
              </div>
              <button type="button" onClick={() => setShowNewMessage(false)} className="p-2 rounded-lg bg-slate-50 text-slate-500"><X size={16} /></button>
            </div>
            <div className="flex gap-2">
              <input value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") searchRecipients(); }} placeholder="Search name or business" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" autoFocus />
              <button type="button" onClick={searchRecipients} disabled={recipientLoading} className="rounded-xl bg-teal-600 text-white px-4 text-xs font-bold disabled:opacity-50">{recipientLoading ? "..." : "Search"}</button>
            </div>
            <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
              {recipientResults.map((profile) => (
                <button key={profile.id} type="button" onClick={() => startNewConversation(profile)} className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-700">{profile.business_name || profile.full_name || "User"}</span>
                    <span className="text-[10px] font-bold uppercase rounded-full px-2 py-1 bg-slate-100 text-slate-600">{String(profile.verification_status || "pending").replaceAll("_", " ")}</span>
                  </div>
                  <span className="text-xs text-slate-400">{String(profile.role || "user").replaceAll("_", " ")}</span>
                </button>
              ))}
              {!recipientLoading && recipientSearch.trim().length >= 2 && recipientResults.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No eligible users found.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[600px] bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden font-sans">

      {/* ======================================================
          SIDEBAR
      ======================================================= */}

      <div className="w-80 border-r border-slate-50 flex flex-col">

        <div className="p-6 border-b border-slate-50">
          <h3 className="font-bold text-slate-800 mb-4">
            Messages
          </h3>

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">Message any eligible user</span>
            {canSendMessages && (
              <button
                type="button"
                onClick={() => { setShowNewMessage(true); setError(""); }}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700"
              >
                + New Message
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
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-400">
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
              const isMarketplaceChat =
                Boolean(conv.listing_id);

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
                        className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          isRepairShop
                            ? "bg-violet-100 text-violet-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {conv.other_party_role ||
                          "Tech Harvester"}
                      </span>

                    </div>

                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                      {formatTime(
                        conv.created_at
                      )}
                    </span>

                  </div>

                  <div className="flex items-center gap-1 mb-1.5">
                    {renderStars(
                      conv.other_party_rating
                    )}

                    <span className="text-xs text-slate-500 font-medium">
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

                  <p className="text-xs text-teal-600 font-bold mb-1">

                    {isMarketplaceChat
                      ? `Re: ${
                          conv.listings
                            ?.device_model ||
                          "Item"
                        }`
                      : `Repair: ${
                          conv.repair_device_model ||
                          "Appointment"
                        }`}

                  </p>

                  <p className="text-xs text-slate-500 truncate">
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
                      className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
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

                  <p className="text-xs text-slate-400">
                    {activeChat.listing_id
                      ? "Marketplace Conversation"
                      : activeChat.other_party_role_type ===
                        "repair_shop"
                      ? "Repair Service Conversation"
                      : "Marketplace Conversation"}
                  </p>

                  <div className="flex items-center gap-1 mt-0.5">

                    {renderStars(
                      activeChat.other_party_rating
                    )}

                    <span className="text-xs text-slate-500 font-medium">
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

              {activeTransaction?.seller_id ===
                  userId &&
                ["pending", "matched"].includes(
                  normalizeTransactionStatus(activeTransaction?.status)
                ) && (
                  <button
                    onClick={async () => {
                      await fetchAcceptedBidAmount();
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-[#2d7a7f] text-white px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    <Calendar size={14} />
                    Schedule Meetup
                  </button>
                )}

              {activeTransaction?.harvester_id ===
                  userId &&
                normalizeTransactionStatus(activeTransaction?.status) ===
                  "meetup_scheduled" && (
                  <span className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-100">
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

              {activeChat.listing_id &&
                activeChat.listings?.device_model && (
                  <div className="bg-white border border-emerald-100 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-wider font-bold text-emerald-600">
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
                  MARKETPLACE TRANSACTION COORDINATION
              ------------------------------------------------- */}

              {activeChat.listing_id && activeTransaction && (
                <div className={`bg-white rounded-2xl p-5 shadow-sm border ${
                  normalizeTransactionStatus(activeTransaction.status) === "cancelled"
                    ? "border-red-200 bg-red-50/40"
                    : normalizeTransactionStatus(activeTransaction.status) === "completed"
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-teal-100"
                }`}>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2"><Calendar size={16} className="text-[#2d7a7f]" /><span className="text-xs font-bold text-slate-700">Transaction Coordination</span></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${normalizeTransactionStatus(activeTransaction.status) === "cancelled" ? "bg-red-100 text-red-700" : normalizeTransactionStatus(activeTransaction.status) === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-teal-50 text-teal-700"}`}>{formatTransactionStatus(activeTransaction.status)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                    <p><span className="font-bold">Amount:</span> ₱{Number(activeTransaction.amount || 0).toLocaleString()}</p>
                    {activeTransaction.meetup_date && <p className="flex items-center gap-2"><Calendar size={13} />{formatDate(activeTransaction.meetup_date)}</p>}
                    {activeTransaction.meetup_time && <p className="flex items-center gap-2"><Clock size={13} />{formatMeetupTime(activeTransaction.meetup_time)}</p>}
                    {activeTransaction.barangay && <p className="flex items-center gap-2"><MapPin size={13} />{activeTransaction.barangay}</p>}
                  </div>
                  {activeTransaction.cancel_reason && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700"><span className="font-bold">Cancellation reason:</span> {activeTransaction.cancel_reason}</div>}
                  {transactionHistory.length > 0 && <div className="mt-4 pt-4 border-t border-slate-100"><p className="text-xs font-bold text-slate-600 mb-3">Transaction History</p><div className="space-y-2 max-h-48 overflow-y-auto">{transactionHistory.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 text-xs"><div><p className="font-semibold text-slate-600">{entry.old_status ? `${formatTransactionStatus(entry.old_status)} → ` : ""}{formatTransactionStatus(entry.new_status)}</p>{(entry.meetup_date || entry.meetup_time || entry.meeting_location) && <p className="text-slate-400 mt-1">{[entry.meetup_date ? formatDate(entry.meetup_date) : null, entry.meetup_time ? formatMeetupTime(entry.meetup_time) : null, entry.meeting_location || null].filter(Boolean).join(" • ")}</p>}</div><span className="text-slate-400 whitespace-nowrap">{formatDate(entry.changed_at)}</span></div>)}</div></div>}
                </div>
              )}

              {/* ------------------------------------------------
                  REPAIR APPOINTMENTS
              ------------------------------------------------- */}

              {isRepairShopChat(activeChat) &&
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

                            <span className="text-xs px-2 py-1 rounded-full bg-violet-50 text-violet-600 font-bold uppercase">
                              {appointment.status ||
                                "pending"}
                            </span>

                          </div>

                          <div className="space-y-2 text-xs text-slate-600">

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

              {isRepairShopChat(activeChat) &&
                repairAppointments.length ===
                  0 && (
                  <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                    <p className="text-xs text-violet-600">
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

                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs font-bold text-slate-400">
                        {formatTime(
                          msg.created_at
                        )}
                      </span>
                      {isMe && msg.delivered_at && (
                        <span className="text-xs font-semibold text-emerald-500">
                          Delivered
                        </span>
                      )}
                    </div>

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

              {isViewOnly && (
                <div className="mb-2 text-amber-600 text-xs font-bold flex items-center gap-1">
                  <ShieldAlert
                    size={12}
                  />

                  {isSenderRestricted
                    ? "Your account is not allowed to send messages."
                    : "Your account is pending verification. You can read messages but cannot reply until you are verified."}
                </div>
              )}

              {error && (
                <div className="mb-2 text-red-500 text-xs font-bold flex items-center gap-1">
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
                  disabled={!canSendMessages}
                  placeholder={
                    isViewOnly
                      ? "View-only: replies are disabled"
                      : "Type a message..."
                  }
                  className="flex-1 bg-transparent border-none px-4 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={!canSendMessages}
                  className="p-3 bg-[#2d7a7f] text-white rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
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
        activeChat.listing_id && (
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

                    <p className="text-xs font-semibold text-emerald-700/70 uppercase tracking-wider">
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
                      { label: "09:00 AM", value: "09:00" },
                      { label: "10:00 AM", value: "10:00" },
                      { label: "11:00 AM", value: "11:00" },
                      { label: "02:00 PM", value: "14:00" },
                      { label: "03:00 PM", value: "15:00" },
                      { label: "04:00 PM", value: "16:00" },
                    ].map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() =>
                          setMeetupData({
                            ...meetupData,
                            time: slot.value,
                          })
                        }
                        className={`p-3 text-xs rounded-xl border transition-all duration-200 ${
                          meetupData.time ===
                          slot.value
                            ? "bg-[#9bc2c9] border-[#9bc2c9] text-white font-bold"
                            : "border-slate-200 text-slate-600 hover:border-teal-200"
                        }`}
                      >
                        {slot.label}
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

                              <p className="text-xs text-slate-400 mt-1">
                                {
                                  point.address
                                }
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
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
    </>
  );
};

export default SellerMessages;
