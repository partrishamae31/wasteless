import React, { useEffect, useRef, useState } from "react";
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
  MessageSquare,
} from "lucide-react";

const SellerMessages = ({
  userId,
  onTabChange,
  trustTier,
  trustTierLoading = false,
  trustTierError = "",
}) => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [repairAppointments, setRepairAppointments] = useState([]);
  const [searchText, setSearchText] = useState("");
  const chatMessagesRef = useRef(null);

  // Keep the latest message visible while the chat body scrolls on its own.
  useEffect(() => {
    if (!activeChat) return;
    const frame = window.requestAnimationFrame(() => {
      const container = chatMessagesRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeChat?.conversation_key, messages.length, repairAppointments.length]);

  const [acceptedBidAmount, setAcceptedBidAmount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertPopup, setAlertPopup] = useState(null);

  // Prevent the page behind the meetup/handover modal from scrolling.
  // The modal's own content area remains independently scrollable.
  useEffect(() => {
    if (!isModalOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isModalOpen]);

  // Use a consistent in-app popup for validation and transaction feedback.
  const showAppAlert = (message, type = "error") => {
    setAlertPopup({ message, type });
  };

  const [meetupData, setMeetupData] = useState({
    date: "",
    time: "",
    location: "",
    drop_off_point_id: "",
    notes: "",
  });
  const [isFlexibleHandoverMode, setIsFlexibleHandoverMode] = useState(false);
  const [flexibleHandoverData, setFlexibleHandoverData] = useState({
    arrangement: "",
    address: "",
    contact: "",
    schedule: "",
    instructions: "",
  });

  const [dropOffPoints, setDropOffPoints] = useState([]);
  const [activeTransaction, setActiveTransaction] = useState(null);
  const [activeTransactions, setActiveTransactions] = useState([]);
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

  // Partner-establishment access is driven by the privilege configured by
  // the administrator for the user's current trust tier. Accept common
  // wording variations without granting access based on the tier name alone.
  const normalizePrivilege = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ");

  const hasPartnerMeetupPrivilege =
    !trustTierLoading &&
    !trustTierError &&
    (Array.isArray(trustTier?.privileges) ? trustTier.privileges : []).some((privilege) => {
      const normalized = normalizePrivilege(privilege);
      return (
        normalized.includes("partner") &&
        (normalized.includes("establishment") ||
          normalized.includes("meetup") ||
          normalized.includes("location"))
      );
    });

  // Flexible handover arrangements are available only to SILVER, GOLD,
  // and PLATINUM accounts. Do not grant access while tier data is unavailable.
  const normalizedTrustTierName = normalizePrivilege(trustTier?.name);
  const canUseFlexibleHandover =
    !trustTierLoading &&
    !trustTierError &&
    ["silver", "gold", "platinum"].includes(normalizedTrustTierName);

  // Barangay MRF entries are donation facilities, not transaction meetup
  // locations. The database stores this classification in the text `partner`
  // column (for example, "Barangay MRF"), so identify it before checking
  // whether a location is a restricted partner establishment.
  const isBarangayMRFDropOffPoint = (point) => {
    const normalizedPartner = normalizePrivilege(point?.partner);
    return [
      "barangay mrf",
      "mrf",
      "materials recovery facility",
      "barangay materials recovery facility",
    ].includes(normalizedPartner);
  };

  const isPartnerDropOffPoint = (point) => {
    if (isBarangayMRFDropOffPoint(point)) return false;

    const partnerValue = point?.partner;
    if (typeof partnerValue === "boolean") return partnerValue;

    const normalized = normalizePrivilege(partnerValue);
    return Boolean(
      normalized &&
      !["false", "no", "0", "none", "null"].includes(normalized)
    );
  };

  // Marketplace meetup choices exclude donation-only Barangay MRF sites.
  // Actual partner establishments remain restricted by the configured tier
  // privilege; ordinary non-partner meetup locations remain available.
  const selectableDropOffPoints = dropOffPoints.filter(
    (point) =>
      !isBarangayMRFDropOffPoint(point) &&
      (!isPartnerDropOffPoint(point) || hasPartnerMeetupPrivilege)
  );

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
  }, [userId, activeChat?.other_party_id, activeTransaction?.id]);

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
          partner,
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
    // One chat per person: load every active marketplace transaction
    // between the signed-in user and the other party, whatever the listing.
    if (!activeChat || !userId || !activeChat.other_party_id) {
      setActiveTransaction(null);
      setActiveTransactions([]);
      setTransactionHistory([]);
      return null;
    }

    const otherId = activeChat.other_party_id;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .or(
        `and(seller_id.eq.${userId},harvester_id.eq.${otherId}),and(seller_id.eq.${otherId},harvester_id.eq.${userId})`
      )
      .not("listing_id", "is", null)
      .in("status", [
        "pending",
        "matched",
        "Matched",
        "meetup_scheduled",
      ])
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error fetching active transactions:",
        error.message
      );

      setActiveTransaction(null);
      setActiveTransactions([]);
      return null;
    }

    const list = data || [];
    setActiveTransactions(list);

    // The "selected" transaction is the one whose listing is the
    // current context (used by the meetup modal), else the newest.
    const selected =
      list.find((tx) => tx.listing_id === activeChat.listing_id) ||
      list[0] ||
      null;

    setActiveTransaction(selected);

    if (selected) {
      setAcceptedBidAmount(Number(selected.amount || 0));
      await fetchTransactionHistory(selected.id);
    } else {
      setTransactionHistory([]);
    }

    return selected;
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
      setActiveTransactions([]);
      setTransactionHistory([]);
      return;
    }

    fetchActiveTransaction();
  }, [activeChat?.other_party_id, userId]);

  // ============================================================
  // FETCH ACTIVE CHAT
  // ============================================================

  useEffect(() => {
    if (!activeChat || !userId) {
      setMessages([]);
      setRepairAppointments([]);
      return;
    }

    // One chat per person: messages are loaded by participants only
    // (every listing), and repair appointments are loaded whenever the
    // other party is a repair shop.
    const isRepairShop = activeChat.other_party_role_type === "repair_shop";

    const fetchChatData = async () => {
      // --------------------------------------------------------
      // FETCH NORMAL CHAT MESSAGES
      // --------------------------------------------------------

      let messageQuery = supabase
        .from("messages")
        .select("*, listings ( device_model )")
        .order("created_at", {
          ascending: true,
        });

      messageQuery = messageQuery.or(
        `and(sender_id.eq.${userId},receiver_id.eq.${activeChat.other_party_id}),and(sender_id.eq.${activeChat.other_party_id},receiver_id.eq.${userId})`
      );

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
        `chat-${userId}-${activeChat.other_party_id}`
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
  }, [activeChat?.other_party_id, userId]);

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
  // FLEXIBLE HANDOVER PROPOSAL (SILVER+)
  // ============================================================

  const handleSubmitFlexibleHandover = async () => {
    if (!canSendMessages) {
      showAppAlert("Your account is view-only and cannot propose a handover arrangement.");
      return;
    }

    if (trustTierLoading || trustTierError || !canUseFlexibleHandover) {
      showAppAlert("Flexible handover arrangements are available only to verified SILVER, GOLD, and PLATINUM users.");
      return;
    }

    const arrangement = flexibleHandoverData.arrangement.trim();
    if (!arrangement) {
      showAppAlert("Please describe your preferred handover arrangement.");
      return;
    }

    const contactNumber = String(flexibleHandoverData.contact || "").trim();
    if (contactNumber && !/^\d{1,11}$/.test(contactNumber)) {
      showAppAlert("Contact number must contain numbers only and must not exceed 11 digits.");
      return;
    }

    if (!activeTransaction?.id) {
      showAppAlert("No active transaction is selected. Please refresh and try again.");
      return;
    }

    const currentStatus = normalizeTransactionStatus(activeTransaction.status);
    if (!["pending", "matched"].includes(currentStatus)) {
      showAppAlert("A flexible handover can only be proposed for a pending or matched transaction.");
      return;
    }

    if (![activeTransaction.seller_id, activeTransaction.harvester_id].includes(userId)) {
      showAppAlert("You are not a participant in this transaction.");
      return;
    }

    try {
      const proposedAt = new Date().toISOString();
      const { data: proposedTx, error: proposalError } = await supabase
        .from("transactions")
        .update({
          handover_arrangement: arrangement,
          handover_address: flexibleHandoverData.address.trim() || null,
          handover_contact: flexibleHandoverData.contact.trim() || null,
          handover_schedule: flexibleHandoverData.schedule.trim() || null,
          handover_instructions: flexibleHandoverData.instructions.trim() || null,
          handover_proposed_by: userId,
          handover_proposal_status: "pending",
          handover_proposed_at: proposedAt,
          handover_responded_at: null,
          updated_at: proposedAt,
        })
        .eq("id", activeTransaction.id)
        .in("status", ["pending", "matched", "Matched"])
        .or(`seller_id.eq.${userId},harvester_id.eq.${userId}`)
        .or("handover_proposal_status.is.null,handover_proposal_status.eq.rejected")
        .select("*")
        .maybeSingle();

      if (proposalError) throw proposalError;
      if (!proposedTx) {
        throw new Error("A handover proposal is already pending or has already been accepted. Refresh the transaction and try again.");
      }

      const proposalMessage = `Schedule Meetup
Arrangement: ${arrangement}
Address: ${flexibleHandoverData.address.trim() || "Not provided"}
Contact: ${flexibleHandoverData.contact.trim() || "Not provided"}
Preferred Schedule: ${flexibleHandoverData.schedule.trim() || "To be agreed"}
Instructions: ${flexibleHandoverData.instructions.trim() || "None"}

Please review this proposal and accept or reject it in the transaction conversation.`;

      const { error: messageError } = await supabase.from("messages").insert([{
        listing_id: activeTransaction.listing_id || activeChat?.listing_id || null,
        sender_id: userId,
        receiver_id: activeTransaction.seller_id === userId
          ? activeTransaction.harvester_id
          : activeTransaction.seller_id,
        content: proposalMessage,
      }]);

      if (messageError) {
        console.warn("Handover proposal message could not be sent:", messageError.message);
      }

      const recipientId = activeTransaction.seller_id === userId
        ? activeTransaction.harvester_id
        : activeTransaction.seller_id;
      if (recipientId) {
        const { error: notificationError } = await supabase.from("notifications").insert([{
          user_id: recipientId,
          type: "transaction_update",
          title: "Schedule meetup",
          content: "The other party proposed a flexible handover arrangement. Review it in Messages.",
          related_listing_id: activeTransaction.listing_id || null,
          is_read: false,
          description: "A handover proposal is waiting for your response.",
        }]);
        if (notificationError) {
          console.warn("Handover proposal notification could not be created:", notificationError.message);
        }
      }

      setIsModalOpen(false);
      setIsFlexibleHandoverMode(false);
      setFlexibleHandoverData({
        arrangement: "",
        address: "",
        contact: "",
        schedule: "",
        instructions: "",
      });
      showAppAlert("Your handover proposal has been sent. The other party must accept it before the arrangement is confirmed.", "success");
      await fetchActiveTransaction();
      await fetchConversations();
    } catch (err) {
      console.error("Error submitting schedule meetup:", err);
      showAppAlert(`Unable to submit the handover proposal: ${err.message || "Unknown error"}`);
    }
  };

  const handleRespondToHandoverProposal = async (tx, response) => {
    if (!canSendMessages) {
      showAppAlert("Your account is view-only and cannot respond to a handover proposal.");
      return;
    }
    if (!tx?.id || tx.handover_proposal_status !== "pending") return;
    if (tx.handover_proposed_by === userId) {
      showAppAlert("You cannot respond to your own handover proposal.");
      return;
    }
    if (![tx.seller_id, tx.harvester_id].includes(userId)) {
      showAppAlert("You are not a participant in this transaction.");
      return;
    }
    if (!["accepted", "rejected"].includes(response)) return;

    try {
      const respondedAt = new Date().toISOString();
      const { data: updatedTx, error: responseError } = await supabase
        .from("transactions")
        .update({
          handover_proposal_status: response,
          handover_responded_at: respondedAt,
          updated_at: respondedAt,
        })
        .eq("id", tx.id)
        .or(`seller_id.eq.${userId},harvester_id.eq.${userId}`)
        .eq("handover_proposal_status", "pending")
        .neq("handover_proposed_by", userId)
        .select("*")
        .maybeSingle();

      if (responseError) throw responseError;
      if (!updatedTx) {
        throw new Error("This proposal has already been answered. Refresh the conversation to see its latest status.");
      }

      const responseLabel = response === "accepted" ? "accepted" : "rejected";
      const proposerId = tx.handover_proposed_by;
      if (proposerId) {
        const { error: messageError } = await supabase.from("messages").insert([{
          listing_id: tx.listing_id || null,
          sender_id: userId,
          receiver_id: proposerId,
          content: `Schedule meetup ${responseLabel}.${response === "accepted" ? " The proposed arrangement is now agreed by both parties." : " Please discuss and submit a revised proposal if needed."}`,
        }]);
        if (messageError) {
          console.warn("Handover response message could not be sent:", messageError.message);
        }
        const { error: notificationError } = await supabase.from("notifications").insert([{
          user_id: proposerId,
          type: "transaction_update",
          title: `Handover Proposal ${response === "accepted" ? "Accepted" : "Rejected"}`,
          content: `The other party ${responseLabel} your Schedule meetup.`,
          related_listing_id: tx.listing_id || null,
          is_read: false,
          description: "Your Schedule meetup has received a response.",
        }]);
        if (notificationError) {
          console.warn("Handover response notification could not be created:", notificationError.message);
        }
      }

      showAppAlert(`Handover proposal ${responseLabel}.`, "success");
      await fetchActiveTransaction();
      await fetchConversations();
    } catch (err) {
      console.error("Error responding to Schedule meetup:", err);
      showAppAlert(`Unable to respond to the proposal: ${err.message || "Unknown error"}`);
    }
  };

  // ============================================================
  // SCHEDULE MARKETPLACE MEETUP
  // ============================================================

  const handleScheduleMeetup = async () => {
    // Pending Verification accounts are view-only: no meetup scheduling.
    if (!canSendMessages) {
      showAppAlert(
        "Pending Verification accounts are view-only and cannot schedule meetups."
      );
      return;
    }

    // Marketplace meetup scheduling works for both normal harvesters
    // and Repair Shops when they are the accepted bidder.
    if (
      !activeChat ||
      !activeChat.listing_id
    ) {
      showAppAlert(
        "Meetup scheduling is only available for marketplace transactions."
      );

      return;
    }

    if (
      !meetupData.date ||
      !meetupData.time ||
      !meetupData.drop_off_point_id
    ) {
      showAppAlert(
        "Please select a date, time, and drop-off point."
      );

      return;
    }

    // 7.2.2.1: reject an invalid or past schedule instead of saving it.
    const scheduledAt = new Date(
      `${meetupData.date}T${String(meetupData.time).slice(0, 5)}:00`
    );

    if (Number.isNaN(scheduledAt.getTime())) {
      showAppAlert("The meetup date or time is invalid. Please correct it.");
      return;
    }

    if (scheduledAt.getTime() <= Date.now()) {
      showAppAlert("The meetup must be scheduled for a future date and time.");
      return;
    }

    try {
      // Re-fetch the selected location so a stale/modified client-side list
      // cannot bypass the active-point or partner-establishment restriction.
      const { data: selectedPoint, error: pointError } = await supabase
        .from("drop_off_points")
        .select("id,name,barangay,city,address,partner,is_active")
        .eq("id", meetupData.drop_off_point_id)
        .eq("is_active", true)
        .maybeSingle();

      if (pointError) throw pointError;
      if (!selectedPoint) {
        throw new Error("This drop-off point is no longer active. Please choose another location.");
      }

      if (isBarangayMRFDropOffPoint(selectedPoint)) {
        throw new Error(
          "Barangay MRF locations are for e-waste donations and cannot be used for transaction meetups. Please choose a meetup location."
        );
      }

      if (isPartnerDropOffPoint(selectedPoint) && !hasPartnerMeetupPrivilege) {
        throw new Error(
          trustTierLoading || trustTierError
            ? "Your trust-tier privileges could not be verified. Partner-establishment meetups are unavailable until your trust-tier information loads successfully."
            : `Your current trust tier (${trustTier?.name || "NEWCOMER"}) does not include partner-establishment meetups. Please select a standard drop-off point.`
        );
      }

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

      if (fetchError) throw fetchError;
      if (!existingTx) {
        throw new Error("No active marketplace transaction was found for this conversation.");
      }

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

      showAppAlert(
        `Meetup Scheduled for ₱${finalPrice.toLocaleString()}`,
        "success"
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

      showAppAlert(
        "Transaction failed: " +
          (err.message ||
            "Unknown error"),
        "error"
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

  const filteredConversations = conversations.filter((conv) =>
    String(conv.other_party_name || "Unknown User")
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

  // One sidebar row per person. Each person's separate marketplace
  // transactions and repair-service chat stay available as "threads"
  // that are switched from the chat header, so the list isn't flooded
  // with the same user once per transaction.
  const groupedConversations = (() => {
    const groups = new Map();
    filteredConversations.forEach((conv) => {
      const id = conv.other_party_id;
      if (!groups.has(id)) {
        groups.set(id, { other_party_id: id, latest: conv, threads: [] });
      }
      groups.get(id).threads.push(conv);
    });
    return [...groups.values()];
  })();

  const getListingModel = (listingId, fallback) =>
    fallback ||
    conversations.find((c) => c.listing_id === listingId)?.listings
      ?.device_model ||
    "Item";

  // Opens the meetup form for one specific transaction with this person.
  const openMeetupFor = (tx) => {
    if (!canSendMessages) return;
    setIsFlexibleHandoverMode(false);
    setActiveTransaction(tx);
    setAcceptedBidAmount(Number(tx.amount || 0));
    setActiveChat((prev) =>
      prev
        ? {
            ...prev,
            listing_id: tx.listing_id,
            listings: { device_model: getListingModel(tx.listing_id) },
          }
        : prev
    );
    setIsModalOpen(true);
  };

  const openFlexibleHandoverFor = (tx) => {
    if (!canSendMessages || !canUseFlexibleHandover) return;
    setActiveTransaction(tx);
    setAcceptedBidAmount(Number(tx.amount || 0));
    setActiveChat((prev) =>
      prev
        ? {
            ...prev,
            listing_id: tx.listing_id,
            listings: { device_model: getListingModel(tx.listing_id) },
          }
        : prev
    );
    setFlexibleHandoverData({
      arrangement: "",
      address: "",
      contact: "",
      schedule: "",
      instructions: "",
    });
    setIsFlexibleHandoverMode(true);
    setIsModalOpen(true);
  };

  const getThreadLabel = (conv) =>
    conv.listing_id
      ? `Re: ${conv.listings?.device_model || "Item"}`
      : `Repair: ${conv.repair_device_model || "Appointment"}`;

  return (
    <>
      {alertPopup && (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-950/55 p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAlertPopup(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-live="assertive"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  alertPopup.type === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {alertPopup.type === "success" ? (
                  <CheckCheck size={22} />
                ) : (
                  <ShieldAlert size={22} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-slate-800">
                  {alertPopup.type === "success" ? "Success" : "Please check"}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {alertPopup.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAlertPopup(null)}
                aria-label="Close popup"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setAlertPopup(null)}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition ${
                  alertPopup.type === "success"
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-slate-800 hover:bg-slate-900"
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
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

      <div className="grid grid-cols-12 gap-8 bg-white rounded-[3rem] shadow-sm border mt-16 border-white overflow-hidden h-[calc(100vh-12rem)] min-h-[600px] max-h-[850px] font-sans">

      {/* ======================================================
          SIDEBAR
      ======================================================= */}

      <div className="col-span-4 min-h-0 border-r border-slate-50 flex flex-col">

        <div className="p-6 pb-4 shrink-0">
          <h2 className="text-xl font-black text-slate-800 mb-4">
            Messages
          </h2>

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
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-6">

          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-400">
                {conversations.length === 0
                  ? "No conversations yet."
                  : "No matching conversations."}
              </p>
            </div>
          ) : (
            groupedConversations.map((group) => {

              const conv = group.latest;

              const isActive =
                activeChat?.other_party_id ===
                conv.other_party_id;

              const isRepairShop =
                conv.other_party_role_type ===
                "repair_shop";

              return (
                <div
                  key={
                    group.other_party_id
                  }
                  onClick={() => {
                    if (isActive) return;
                    handleSelectConversation(
                      conv
                    );
                  }}
                  className={`p-4 border-b border-slate-100 cursor-pointer rounded-2xl transition-all ${
                    isActive
                      ? "bg-slate-100"
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

                  <p className="text-xs text-teal-600 font-bold mb-1 flex items-center gap-2">

                    <span className="truncate">
                      {(() => {
                        const marketCount = group.threads.filter(
                          (t) => t.listing_id
                        ).length;
                        const hasRepair = group.threads.some(
                          (t) => !t.listing_id &&
                            t.other_party_role_type === "repair_shop"
                        );
                        if (group.threads.length <= 1) return getThreadLabel(conv);
                        return [
                          marketCount > 0
                            ? `${marketCount} transaction${marketCount > 1 ? "s" : ""}`
                            : null,
                          hasRepair ? "Repair" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                      })()}
                    </span>

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

      <div className="col-span-8 min-w-0 min-h-0 flex flex-col overflow-hidden bg-slate-50/30">

        {activeChat ? (
          <>

            {/* ==================================================
                CHAT HEADER
            =================================================== */}

            <div className="shrink-0 p-6 bg-white border-b border-slate-100 flex justify-between items-center">

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
                    {activeChat.other_party_role_type ===
                    "repair_shop"
                      ? "Repair Shop Conversation"
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

            </div>

            <div className="flex min-h-0 flex-1">
            <section className="flex min-w-0 min-h-0 flex-1 flex-col">

            {/* ==================================================
                CHAT CONTENT
            =================================================== */}

            <div ref={chatMessagesRef} className="min-h-0 flex-1 p-6 md:p-8 overflow-y-auto overscroll-contain space-y-5 scroll-smooth">

              {/* ------------------------------------------------
                  TRANSACTION COORDINATION (one card per transaction)
              ------------------------------------------------- */}

              {activeTransactions.map((tx) => (
                <React.Fragment key={tx.id}>
                  <div className={`bg-white rounded-2xl p-5 shadow-sm border ${
                  normalizeTransactionStatus(tx.status) === "cancelled"
                    ? "border-red-200 bg-red-50/40"
                    : normalizeTransactionStatus(tx.status) === "completed"
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-teal-100"
                }`}>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2"><Calendar size={16} className="text-[#2d7a7f]" /><span className="text-xs font-bold text-slate-700">Transaction Coordination · {getListingModel(tx.listing_id)}</span></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${normalizeTransactionStatus(tx.status) === "cancelled" ? "bg-red-100 text-red-700" : normalizeTransactionStatus(tx.status) === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-teal-50 text-teal-700"}`}>{formatTransactionStatus(tx.status)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                    <p><span className="font-bold">Amount:</span> ₱{Number(tx.amount || 0).toLocaleString()}</p>
                    {tx.meetup_date && <p className="flex items-center gap-2"><Calendar size={13} />{formatDate(tx.meetup_date)}</p>}
                    {tx.meetup_time && <p className="flex items-center gap-2"><Clock size={13} />{formatMeetupTime(tx.meetup_time)}</p>}
                    {tx.barangay && <p className="flex items-center gap-2"><MapPin size={13} />{tx.barangay}</p>}
                  </div>
                  {["pending", "matched"].includes(normalizeTransactionStatus(tx.status)) &&
                    (!tx.handover_proposal_status || tx.handover_proposal_status === "rejected") &&
                    (canUseFlexibleHandover ? (
                      <button
                        type="button"
                        disabled={!canSendMessages}
                        title={!canSendMessages ? "View-only: your account is pending verification" : undefined}
                        onClick={() => openFlexibleHandoverFor(tx)}
                        className="mt-4 flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        <Navigation size={14} />
                        Propose Flexible Handover
                      </button>
                    ) : tx.seller_id === userId ? (
                      <button
                        type="button"
                        disabled={!canSendMessages}
                        title={!canSendMessages ? "View-only: your account is pending verification" : undefined}
                        onClick={() => openMeetupFor(tx)}
                        className="mt-4 flex items-center gap-2 bg-[#2d7a7f] text-white px-4 py-2 rounded-xl text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        <Calendar size={14} />
                        {canSendMessages ? "Schedule Meetup" : "Schedule Meetup (View-only)"}
                      </button>
                    ) : null)}
                  {tx.handover_proposal_status && (
                    <div className={`mt-4 rounded-xl border p-4 text-xs ${
                      tx.handover_proposal_status === "accepted"
                        ? "border-emerald-200 bg-emerald-50"
                        : tx.handover_proposal_status === "rejected"
                        ? "border-rose-200 bg-rose-50"
                        : "border-amber-200 bg-amber-50"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-700">Flexible Handover · {String(tx.handover_proposal_status).toUpperCase()}</p>
                        {tx.handover_proposed_at && <span className="text-slate-400">{formatDate(tx.handover_proposed_at)}</span>}
                      </div>
                      <p className="mt-2 text-slate-700"><b>Arrangement:</b> {tx.handover_arrangement || "—"}</p>
                      {tx.handover_address && <p className="mt-1 text-slate-600"><b>Address:</b> {tx.handover_address}</p>}
                      {tx.handover_contact && <p className="mt-1 text-slate-600"><b>Contact:</b> {tx.handover_contact}</p>}
                      {tx.handover_schedule && <p className="mt-1 text-slate-600"><b>Preferred schedule:</b> {tx.handover_schedule}</p>}
                      {tx.handover_instructions && <p className="mt-1 text-slate-600"><b>Instructions:</b> {tx.handover_instructions}</p>}
                      {tx.handover_proposal_status === "pending" && tx.handover_proposed_by !== userId && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" disabled={!canSendMessages} onClick={() => handleRespondToHandoverProposal(tx, "accepted")} className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Accept Arrangement</button>
                          <button type="button" disabled={!canSendMessages} onClick={() => handleRespondToHandoverProposal(tx, "rejected")} className="rounded-lg bg-rose-600 px-3 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-50">Reject Proposal</button>
                        </div>
                      )}
                      {tx.handover_proposal_status === "pending" && tx.handover_proposed_by === userId && <p className="mt-2 font-semibold text-amber-700">Waiting for the other party to respond.</p>}
                      {tx.handover_proposal_status === "accepted" && <p className="mt-2 font-semibold text-emerald-700">Both parties have accepted this arrangement.</p>}
                      {tx.handover_proposal_status === "rejected" && <p className="mt-2 font-semibold text-rose-700">The other party rejected this proposal. You may discuss and submit a revised proposal.</p>}
                    </div>
                  )}
                  {tx.harvester_id === userId && normalizeTransactionStatus(tx.status) === "meetup_scheduled" && (
                    <span className="mt-4 inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-100">
                      <CheckCheck size={14} />
                      Meetup Scheduled
                    </span>
                  )}
                  {tx.cancel_reason && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700"><span className="font-bold">Cancellation reason:</span> {tx.cancel_reason}</div>}
                  {tx.id === activeTransaction?.id && transactionHistory.length > 0 && <div className="mt-4 pt-4 border-t border-slate-100"><p className="text-xs font-bold text-slate-600 mb-3">Transaction History</p><div className="space-y-2 max-h-48 overflow-y-auto">{transactionHistory.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 text-xs"><div><p className="font-semibold text-slate-600">{entry.old_status ? `${formatTransactionStatus(entry.old_status)} → ` : ""}{formatTransactionStatus(entry.new_status)}</p>{(entry.meetup_date || entry.meetup_time || entry.meeting_location) && <p className="text-slate-400 mt-1">{[entry.meetup_date ? formatDate(entry.meetup_date) : null, entry.meetup_time ? formatMeetupTime(entry.meetup_time) : null, entry.meeting_location || null].filter(Boolean).join(" • ")}</p>}</div><span className="text-slate-400 whitespace-nowrap">{formatDate(entry.changed_at)}</span></div>)}</div></div>}
                </div>
                </React.Fragment>
              ))}

              {/* ------------------------------------------------
                  NORMAL MESSAGES
              ------------------------------------------------- */}

              {messages.map((msg, index) => {

                const isMe =
                  msg.sender_id ===
                  userId;

                const ctx = msg.listing_id || null;
                const prevCtx =
                  index === 0 ? undefined : messages[index - 1].listing_id || null;
                const showContextLabel =
                  index === 0 ? Boolean(ctx) : ctx !== prevCtx;

                return (
                  <React.Fragment key={msg.id}>
                  {showContextLabel && (
                    <div className="flex justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white border border-slate-100 rounded-full px-3 py-1">
                        {ctx
                          ? `Re: ${getListingModel(ctx, msg.listings?.device_model)}`
                          : "General"}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex flex-col ${
                      isMe
                        ? "items-end ml-auto"
                        : "items-start"
                    } min-w-0 max-w-[85%]`}
                  >

                    <div
                      className={`min-w-0 px-5 py-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                        isMe
                          ? "bg-[#2d7a7f] text-white rounded-br-md"
                          : "bg-white border border-slate-100 text-slate-600 rounded-bl-md"
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
                  </React.Fragment>
                );
              })}

            </div>

            {/* ==================================================
                STICKY TRANSACTION ACTION
                Keeps meetup/handover access visible while messages scroll.
            =================================================== */}
            {activeTransaction?.listing_id &&
              ["pending", "matched"].includes(normalizeTransactionStatus(activeTransaction.status)) &&
              (!activeTransaction.handover_proposal_status ||
                activeTransaction.handover_proposal_status === "rejected") &&
              (canUseFlexibleHandover || activeTransaction.seller_id === userId) && (
                <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-3">
                  <button
                    type="button"
                    disabled={!canSendMessages}
                    onClick={() => {
                      if (canUseFlexibleHandover) {
                        openFlexibleHandoverFor(activeTransaction);
                      } else {
                        openMeetupFor(activeTransaction);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2d7a7f] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {canUseFlexibleHandover ? <Navigation size={16} /> : <Calendar size={16} />}
                    {canUseFlexibleHandover
                      ? "Propose Flexible Handover"
                      : canSendMessages
                        ? "Schedule Meetup"
                        : "Schedule Meetup (View-only)"}
                  </button>
                </div>
              )}

            {/* ==================================================
                MESSAGE INPUT
            =================================================== */}

            <form
              onSubmit={
                handleSendMessage
              }
              className="shrink-0 p-6 bg-white border-t border-slate-50"
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

              <div className="flex gap-4">

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
                  className="flex-1 bg-slate-50 rounded-2xl py-4 px-6 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={!canSendMessages}
                  className="p-4 bg-[#2d7a7f] text-white rounded-2xl disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={18} />
                </button>

              </div>

            </form>

            </section>

            {/* ==================================================
                REPAIR APPOINTMENTS SIDE PANEL
            =================================================== */}

            {(activeChat.other_party_role_type === "repair_shop" ||
              repairAppointments.length > 0) && (
              <aside className="flex w-[340px] max-w-[42%] min-h-0 shrink-0 flex-col border-l border-slate-200 bg-white">
                <div className="shrink-0 border-b border-slate-100 px-5 py-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-800">Repair Appointments</h3>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      {repairAppointments.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Your repair requests with this shop, without leaving the chat.</p>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                  {repairAppointments.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-xs font-semibold text-slate-500">No repair requests</p>
                      <p className="mt-1 text-xs text-slate-400">Appointment requests with this shop will appear here.</p>
                    </div>
                  ) : (
                    repairAppointments.map((appointment) => (
                      <div
                        key={`appointment-${appointment.id}`}
                        className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                              Repair Appointment Request
                            </p>
                            <h3 className="text-base font-bold text-slate-800 mt-1 break-words">
                              {appointment.device_model || "Device"}
                            </h3>
                          </div>

                          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase h-fit shrink-0">
                            {String(appointment.status || "pending").toLowerCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-slate-600">
                          <p><b>Category:</b> {appointment.category || "—"}</p>
                          <p><b>Date:</b> {appointment.preferred_date ? formatDate(appointment.preferred_date) : "—"}</p>
                          <p><b>Time:</b> {appointment.preferred_time || "—"}</p>
                          <p className="break-words"><b>Issue:</b> {appointment.issue_description || "—"}</p>
                        </div>

                        {appointment.notes && (
                          <p className="text-xs text-slate-500 mt-3 break-words">
                            <b>Notes:</b> {appointment.notes}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </aside>
            )}

            </div>

          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
            <MessageSquare size={40} />
            <p className="text-xs font-bold uppercase">
              Select a chat to begin
            </p>
          </div>
        )}

      </div>

      {/* ========================================================
          MARKETPLACE MEETUP MODAL
      ========================================================= */}

      {isModalOpen &&
        activeChat &&
        activeChat.listing_id && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto overscroll-none bg-black/40 p-4 backdrop-blur-sm">

            <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-xl animate-in fade-in zoom-in duration-200">

              {/* ------------------------------------------------
                  HEADER
              ------------------------------------------------- */}

              <div className="shrink-0 p-8 pb-4 flex justify-between items-start">

                <div>

                  <h2 className="font-bold text-[#2d3748] text-xl">
                    {isFlexibleHandoverMode ? "Propose Flexible Handover" : "Schedule Meetup"}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    With{" "}
                    {activeChat.other_party_name ||
                      "User"}{" "}
                    for{" "}
                    {activeChat.listings
                      ?.device_model ||
                      "Item"}
                    {isFlexibleHandoverMode ? " · Proposal requires the other party's approval" : ""}
                  </p>

                </div>

                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsFlexibleHandoverMode(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>

              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-8 space-y-6">

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

                {isFlexibleHandoverMode ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-xs leading-5 text-teal-800">
                      SILVER, GOLD, and PLATINUM users may propose their own handover arrangement. Describe what works for both parties; there is no fixed delivery-mode dropdown. The other party must accept the proposal before it is confirmed.
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">Preferred Handover Arrangement <span className="text-rose-500">*</span></label>
                      <textarea
                        value={flexibleHandoverData.arrangement}
                        onChange={(e) => setFlexibleHandoverData({ ...flexibleHandoverData, arrangement: e.target.value })}
                        placeholder="Describe how you would like to hand over the device (for example, arrange a pickup, meet at an agreed place, or use a courier)."
                        className="h-28 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">Address or Meeting Location</label>
                      <textarea
                        value={flexibleHandoverData.address}
                        onChange={(e) => setFlexibleHandoverData({ ...flexibleHandoverData, address: e.target.value })}
                        placeholder="Enter the pickup address, delivery address, or proposed meeting place."
                        className="h-20 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">Contact Details</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={11}
                        value={flexibleHandoverData.contact}
                        onChange={(e) => {
                          const numericContact = e.target.value.replace(/\D/g, "").slice(0, 11);
                          setFlexibleHandoverData({
                            ...flexibleHandoverData,
                            contact: numericContact,
                          });
                        }}
                        placeholder="Enter up to 11 digits"
                        aria-label="Contact number (numbers only, maximum 11 digits)"
                        className="w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      <p className="mt-1 text-right text-[11px] text-slate-400">
                        {flexibleHandoverData.contact.length}/11 digits
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">Preferred Date and Time</label>
                      <input
                        type="datetime-local"
                        value={flexibleHandoverData.schedule}
                        onChange={(e) => setFlexibleHandoverData({ ...flexibleHandoverData, schedule: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Select your preferred date and time using the picker. The other party can review your proposed schedule.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">Additional Instructions</label>
                      <textarea
                        value={flexibleHandoverData.instructions}
                        onChange={(e) => setFlexibleHandoverData({ ...flexibleHandoverData, instructions: e.target.value })}
                        placeholder="Add any other details the other party should know."
                        className="h-24 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                ) : (
                  <>
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

                    {/* {dropOffPoints.some(isBarangayMRFDropOffPoint) && (
                      <div className="p-3 rounded-xl border border-sky-200 bg-sky-50 text-xs text-sky-700">
                        Barangay MRF facilities are reserved for e-waste donations and are not available as transaction meetup locations.
                      </div>
                    )} */}

                    {trustTierLoading ? (
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
                        Checking your trust-tier privileges. Standard meetup locations remain available.
                      </div>
                    ) : trustTierError ? (
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-700">
                        Trust-tier privileges could not be loaded. Partner establishments are temporarily unavailable; choose a standard drop-off point.
                      </div>
                    ) : !hasPartnerMeetupPrivilege && dropOffPoints.some(isPartnerDropOffPoint) ? (
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-700">
                        Partner establishments are restricted to trust tiers with the corresponding admin-configured privilege. Your current tier is {trustTier?.name || "NEWCOMER"}.
                      </div>
                    ) : null}

                    {selectableDropOffPoints.length ===
                    0 ? (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
                        No eligible active drop-off points available.
                      </div>
                    ) : (
                      selectableDropOffPoints.map(
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

                              {isPartnerDropOffPoint(point) && (
                                <span className="inline-flex mt-1 rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">
                                  Partner Establishment
                                </span>
                              )}

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

                  </>
                )}

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
                      setIsFlexibleHandoverMode(false);
                      setFlexibleHandoverData({
                        arrangement: "",
                        address: "",
                        contact: "",
                        schedule: "",
                        instructions: "",
                      });

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
                    disabled={!canSendMessages}
                    onClick={
                      isFlexibleHandoverMode
                        ? handleSubmitFlexibleHandover
                        : handleScheduleMeetup
                    }
                    className="flex-1 py-4 px-6 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-sm font-extrabold transition-all shadow-lg shadow-teal-700/25 ring-1 ring-teal-800/10 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:ring-0 disabled:cursor-not-allowed"
                  >
                    {isFlexibleHandoverMode ? "Send Handover Proposal" : "Schedule Meetup"}
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