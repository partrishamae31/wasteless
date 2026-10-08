import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { containsRestrictedContent } from "../utils/restrictedContentFilter";
import HarvesterAlerts from "./HarvesterAlerts";
import UrbanMineMap from "./UrbanMineMap";
import InventoryView from "./InventoryView";
import TransactionsView from "./TransactionsView";
import BarangayLeaderboard from "./BarangayLeaderboard"; // Ensure path is correct
import bannerBg from "./assets/banner.png";
import DonationTab from "./DonationTab";
import SellerProfileModal from "./SellerProfileModal";
import RepairShopMessages from "./RepairShopMessages";
import SiteFooter from "./SiteFooter";
import {
  recordTransactionStatusHistory,
  getMissingHandoverFields,
} from "../utils/transactionHistory";

import {
  Search,
  Bell,
  Building2,
  Map as MapIcon,
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
  Gavel,
  MessageSquareText,
  ArrowLeftRight,
  Check,
  Calendar,
  CheckCircle,
  Shield,
  Camera,
  Mail,
  Phone,
  Star,
  Gift,
  Leaf,
  CalendarDays,
  Upload,
} from "lucide-react";

const HAZARDOUS_DIAGNOSIS_KEYWORDS = [
  "Dead/Degraded Battery",
  "Won\'t Power On",
  "Water Damage/ Liquid Exposure",
];

// Keep listing conditions consistent even if older rows use legacy values/casing.
const normalizeListingCondition = (value) => {
  const condition = String(value || "").trim().toLowerCase();

  if (condition === "working") return "Working";
  if (["not working", "not_working", "not-working", "defective"].includes(condition)) {
    return "Not Working";
  }

  return "";
};

const isHazardousListing = (listing) => {
  // WASTELESS now uses only the canonical condition values:
  // "Working" and "Not Working".
  // Hazardous diagnosis checks apply only to Not Working devices.
  if (String(listing?.condition || "").trim().toLowerCase() !== "not working") {
    return false;
  }

  const description = String(listing?.description || "").toLowerCase();

  return HAZARDOUS_DIAGNOSIS_KEYWORDS.some((issue) =>
    description.includes(issue.toLowerCase()),
  );
};

const HarvesterDashboard = ({ session, onLogout }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse");
  const [searchTerm, setSearchTerm] = useState("");
  const [conditionFilter, setConditionFilter] = useState("All Conditions");
  const [accountRole, setAccountRole] = useState("");
  const isRepairShop = String(accountRole || "").trim().toLowerCase() === "repair_shop";
  const [sortOption, setSortOption] = useState("Newest");
  const [selectedListing, setSelectedListing] = useState(null);
  const [contactSellerChat, setContactSellerChat] = useState(null);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePanelTab, setProfilePanelTab] = useState("profile");
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    activeAlerts: 0,
    pendingBids: 0,
    acquiredParts: 0,
    totalSpent: 0,
  });

  const [profileData, setProfileData] = useState({
    full_name: "Loading...",
    business_name: "",
    initials: "??",
    email: "",
    contact_number: "",
    role: "Harvester",
    joined_date: "",

    // Harvester metrics
    completed_pickups: 0,
    active_bids: 0,
    eco_points: 0,

    // Recovery Contribution
    recovered_devices: 0,
    co2_recovered_kg: 0,

    assigned_area: "",
    barangay: "",
    average_rating: 0,
    total_reviews: 0,
  });
  const [verificationStatus, setVerificationStatus] = useState("verified");
  const isVerified = verificationStatus === "verified";
  const [rejectionReason, setRejectionReason] = useState("");

  // Repair Shop verification resubmission
  const [resubmissionPermitFile, setResubmissionPermitFile] = useState(null);
  const [resubmissionTechCertFile, setResubmissionTechCertFile] = useState(null);
  const [resubmittingVerification, setResubmittingVerification] = useState(false);
  const resubmissionPermitRef = React.useRef(null);
  const resubmissionTechCertRef = React.useRef(null);

  // Trust Tier — loaded from the admin-configured trust_tiers table.
  const [trustTiers, setTrustTiers] = useState([]);
  const [trustTierLoading, setTrustTierLoading] = useState(true);
  const [trustTierError, setTrustTierError] = useState("");
  const [userTrustStats, setUserTrustStats] = useState({
    completedTransactions: 0,
    // Repair Shop ratings are intentionally kept separate.
    // `averageRating`/`totalReviews` remain as the purchase-transaction
    // rating aliases used by the existing Trust Tier calculation.
    averageRating: 0,
    totalReviews: 0,
    purchaseTransactionRating: 0,
    purchaseTransactionReviews: 0,
    repairServiceRating: 0,
    repairServiceReviews: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // TC_ALT_01: live component-alert toast shown when a new matching
  // Not Working listing is delivered through the notifications table.
  const [componentAlertToast, setComponentAlertToast] = useState(null);

  // Unread message badge for the top-right message icon
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const [transactions, setTransactions] = useState([]);

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [showRatingModal, setShowRatingModal] = useState(false);
  // REQ-1 / 7.2.2.1: complete the handover only when the transaction is in the
  // correct state and all required coordination data exists. Otherwise the
  // update is prevented and the user is told exactly what to correct.
  const handleCompleteHandover = async (transactionId) => {
    const currentTx =
      transactions.find((tx) => tx.id === transactionId) ||
      (selectedTransaction?.id === transactionId ? selectedTransaction : null);

    if (!currentTx) {
      alert("Transaction not found. Please refresh and try again.");
      return;
    }

    const oldStatus = String(currentTx.status || "").trim().toLowerCase();

    if (oldStatus === "completed" || oldStatus === "cancelled") {
      alert(`This transaction is already ${oldStatus} and cannot be updated.`);
      return;
    }

    if (oldStatus !== "meetup_scheduled") {
      alert("The meetup must be scheduled before the handover can be completed.");
      return;
    }

    const missingFields = getMissingHandoverFields(currentTx);
    if (missingFields.length > 0) {
      alert(
        `The transaction cannot be completed because the following required details are missing: ${missingFields.join(", ")}.\n\nPlease coordinate with the seller through Messages so the meetup details can be corrected.`,
      );
      return;
    }

    try {
      const updatedTime = new Date().toISOString();

      // Scoped to this harvester and to the expected status so a stale screen
      // can never overwrite a change the other participant already made.
      const { data, error } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          completed_at: updatedTime,
          updated_at: updatedTime,
        })
        .eq("id", transactionId)
        .eq("harvester_id", session.user.id)
        .eq("status", "meetup_scheduled")
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        alert(
          "The transaction could not be completed because its status has just changed. The latest status has been loaded.",
        );
        fetchTransactions();
        return;
      }

      // REQ-3: keep the complete status history.
      await recordTransactionStatusHistory({
        transactionId,
        oldStatus,
        newStatus: "completed",
        transaction: { ...currentTx, ...data[0] },
        notes: "Buyer confirmed handover completion.",
      });

      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId
            ? { ...tx, status: "completed", completed_at: updatedTime, updated_at: updatedTime }
            : tx,
        ),
      );

      setSelectedTransaction((prev) =>
        prev?.id === transactionId
          ? { ...prev, status: "completed", completed_at: updatedTime, updated_at: updatedTime }
          : prev,
      );

      setShowRatingModal(true);
    } catch (err) {
      console.error("Update failed:", err.message);
      alert("Error updating status: " + err.message);
    }
  };

  useEffect(() => {
    if (!session?.user) return;

    const fetchHarvesterProfile = async () => {
      try {
        // PROFILE DATA
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            `
  full_name,
  business_name,
  contact_number,
  role,
  created_at,
  verification_status,
  rejection_reason,
  average_rating,
  total_reviews,
  barangay,
  address,
  certification_type,
  other_certification,
  business_permit_number,
  permit_type,
  permit_issuing_lgu,
  permit_issue_date,
  permit_expiry_date,
  business_activity,
  tech_certificate_number,
  tech_certificate_issuer,
  tech_certificate_title,
  tech_certificate_issue_date,
  tech_certificate_expiry_date,
  tech_specialization,
  business_permit_url,
  tech_cert_url
`,
          )
          .eq("id", session.user.id)
          .single();

        if (profileError) throw profileError;

        // Listing visibility is role-based: only Repair Shops may access Not Working items.
        setAccountRole(profile?.role || "");

        // ACTIVE BIDS COUNT
        const { count: bidsCount } = await supabase
          .from("bids")
          .select("*", { count: "exact", head: true })
          .eq("bidder_id", session.user.id)
          .eq("status", "pending");

        // COMPLETED TRANSACTIONS COUNT
        // COMPLETED TRANSACTIONS + CO₂ RECOVERY
        const { data: recoveryData, error: recoveryError } = await supabase
          .from("transactions")
          .select("carbon_saved")
          .eq("harvester_id", session.user.id)
          .eq("status", "completed");

        if (recoveryError) {
          console.error(
            "Error fetching recovery contribution:",
            recoveryError.message,
          );
        }

        const pickupsCount = recoveryData?.length || 0;

        const totalCo2Recovered =
          recoveryData?.reduce(
            (total, transaction) =>
              total + Number(transaction.carbon_saved || 0),
            0,
          ) || 0;

        const name = profile?.full_name || "Harvester User";

        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        setProfileData({
          full_name: name,
          business_name: profile?.business_name || "",
          initials,
          email: session.user.email || "",
          contact_number: profile?.contact_number || "",
          role: profile?.role || "Harvester",

          // Repair Shop verification/document details
          address: profile?.address || "",
          certification_type: profile?.certification_type || "",
          other_certification: profile?.other_certification || "",
          business_permit_number: profile?.business_permit_number || "",
          permit_type: profile?.permit_type || "",
          permit_issuing_lgu: profile?.permit_issuing_lgu || "",
          permit_issue_date: profile?.permit_issue_date || "",
          permit_expiry_date: profile?.permit_expiry_date || "",
          business_activity: profile?.business_activity || "",
          tech_certificate_number: profile?.tech_certificate_number || "",
          tech_certificate_issuer: profile?.tech_certificate_issuer || "",
          tech_certificate_title: profile?.tech_certificate_title || "",
          tech_certificate_issue_date: profile?.tech_certificate_issue_date || "",
          tech_certificate_expiry_date: profile?.tech_certificate_expiry_date || "",
          tech_specialization: profile?.tech_specialization || "",
          business_permit_url: profile?.business_permit_url || "",
          tech_cert_url: profile?.tech_cert_url || "",

          joined_date: profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
            : "Recent Partner",

          // STATS
          active_bids: bidsCount || 0,
          completed_pickups: pickupsCount || 0,

          // RECOVERY CONTRIBUTION
          recovered_devices: pickupsCount || 0,
          co2_recovered_kg: Number(totalCo2Recovered.toFixed(2)),

          // RATINGS
          average_rating: Number(profile?.average_rating || 0),
          total_reviews: profile?.total_reviews || 0,

          // LOCATION
          barangay: profile?.barangay || "",
          assigned_area: profile?.barangay || "Not assigned",

          eco_points: (pickupsCount || 0) * 150,
        });

        if (profile?.verification_status) {
          setVerificationStatus(profile.verification_status);
        }
        setRejectionReason(profile?.rejection_reason || "");
      } catch (error) {
        console.error("Error fetching harvester profile:", error.message);
      }
    };

    fetchHarvesterProfile();
  }, [session]);

  // Load the current repair shop's Trust Tier using the same rules configured by Admin.
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchTrustTier = async () => {
      setTrustTierLoading(true);
      setTrustTierError("");

      try {
        const userId = session.user.id;

        const [tiersResult, transactionsResult, marketplaceReviewsResult, repairReviewsResult] =
          await Promise.all([
            supabase
              .from("trust_tiers")
              .select("id,name,min_transactions,min_rating,privileges")
              .order("min_transactions", { ascending: true }),
            supabase
              .from("transactions")
              .select("id,seller_id,harvester_id,status")
              .or(`seller_id.eq.${userId},harvester_id.eq.${userId}`)
              .eq("status", "completed"),
            supabase
              .from("reviews")
              .select("overall_rating")
              .eq("seller_id", userId),
            supabase
              .from("repair_reviews")
              .select("overall_rating")
              .eq("repair_shop_id", userId),
          ]);

        if (tiersResult.error) throw tiersResult.error;
        if (transactionsResult.error) throw transactionsResult.error;
        if (marketplaceReviewsResult.error) throw marketplaceReviewsResult.error;
        if (repairReviewsResult.error) throw repairReviewsResult.error;

        const tiers = tiersResult.data || [];
        const completedTransactions = (transactionsResult.data || []).length;

        // IMPORTANT: Purchase Transaction and Repair Service ratings must
        // never be averaged together. They represent two different
        // customer experiences and are displayed separately throughout the
        // Repair Shop profile. The existing Trust Tier rules continue to use
        // the Purchase Transaction rating as the participant rating.
        const purchaseTransactionRatings = (marketplaceReviewsResult.data || [])
          .map((review) => Number(review?.overall_rating))
          .filter((rating) => Number.isFinite(rating));
        const repairServiceRatings = (repairReviewsResult.data || [])
          .map((review) => Number(review?.overall_rating))
          .filter((rating) => Number.isFinite(rating));

        const purchaseTransactionReviews = purchaseTransactionRatings.length;
        const repairServiceReviews = repairServiceRatings.length;
        const purchaseTransactionRating = purchaseTransactionReviews
          ? purchaseTransactionRatings.reduce((sum, rating) => sum + rating, 0) / purchaseTransactionReviews
          : 0;
        const repairServiceRating = repairServiceReviews
          ? repairServiceRatings.reduce((sum, rating) => sum + rating, 0) / repairServiceReviews
          : 0;

        setTrustTiers(tiers);
        setUserTrustStats({
          completedTransactions,
          // Keep these existing fields as aliases for the purchase score only.
          averageRating: purchaseTransactionRating,
          totalReviews: purchaseTransactionReviews,
          purchaseTransactionRating,
          purchaseTransactionReviews,
          repairServiceRating,
          repairServiceReviews,
        });
      } catch (error) {
        console.error("Error fetching repair shop trust tier:", error);
        setTrustTierError(error.message || "Unable to load Trust Tier.");
      } finally {
        setTrustTierLoading(false);
      }
    };

    fetchTrustTier();
  }, [session?.user?.id]);

  const sortedTrustTiers = [...trustTiers].sort(
    (a, b) => Number(a.min_transactions || 0) - Number(b.min_transactions || 0),
  );

  const currentTrustTier =
    [...sortedTrustTiers]
      .reverse()
      .find(
        (tier) =>
          userTrustStats.completedTransactions >= Number(tier.min_transactions || 0) &&
          userTrustStats.averageRating >= Number(tier.min_rating || 0),
      ) ||
    sortedTrustTiers.find((tier) => tier.name === "NEWCOMER") ||
    sortedTrustTiers[0] ||
    null;

  const currentTierIndex = currentTrustTier
    ? sortedTrustTiers.findIndex((tier) => tier.id === currentTrustTier.id)
    : -1;
  const nextTrustTier =
    currentTierIndex >= 0 ? sortedTrustTiers[currentTierIndex + 1] || null : null;

  const transactionProgress = nextTrustTier
    ? Math.min(
        100,
        (userTrustStats.completedTransactions /
          Math.max(1, Number(nextTrustTier.min_transactions || 0))) *
          100,
      )
    : 100;
  const ratingProgress = nextTrustTier
    ? Math.min(
        100,
        (userTrustStats.averageRating /
          Math.max(0.01, Number(nextTrustTier.min_rating || 0))) *
          100,
      )
    : 100;
  const trustTierProgress = Math.round(Math.min(transactionProgress, ratingProgress));

  const fetchTransactions = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
      *,
      listing:listing_id (
        device_model,
        asking_price
      ),
      seller:seller_id (
        full_name
      )
    `,
      )
      // Same scope as the realtime refresh below: every transaction in which
      // this account is a participant, so the list never changes shape.
      .or(`harvester_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error.message);
      return;
    }

    if (data) {
      setTransactions(data);
      if (data.length > 0 && !selectedTransaction) {
        setSelectedTransaction(data[0]);
      }
    }
  };

  // Keep the top-right message badge synced with Supabase.
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUnreadMessageCount = async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", session.user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error fetching unread messages:", error.message);
        return;
      }

      setUnreadMessageCount(count || 0);
    };

    fetchUnreadMessageCount();

    const messagesChannel = supabase
      .channel("harvester-message-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${session.user.id}`,
        },
        () => {
          setUnreadMessageCount((prev) => prev + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${session.user.id}`,
        },
        () => {
          fetchUnreadMessageCount();
        },
      )
      .subscribe();

    return () => supabase.removeChannel(messagesChannel);
  }, [session?.user?.id]);

  // Open Messages from the top-right icon and clear the unread badge.
  const handleOpenMessages = async () => {
    setActiveTab("messages");

    if (!session?.user?.id) return;

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", session.user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking messages as read:", error.message);
      return;
    }

    setUnreadMessageCount(0);
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    const bidsChannel = supabase
      .channel("my-bids-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bids",
          filter: `bidder_id=eq.${session.user.id}`,
        },
        (payload) => {
          fetchMyBids();
          // If the bid is accepted, the system logic (often via a DB Trigger)
          // should create a transaction with status 'pending'
          if (payload.new.status === "accepted") {
            fetchTransactions();
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(bidsChannel);
  }, [session?.user?.id]);
  useEffect(() => {
    if (activeTab === "transactions" && session?.user?.id) {
      fetchTransactions();
    }
  }, [activeTab, session?.user?.id]);

  // Requirement 7 / REQ-2: synchronize transaction changes in real time.
  // Keep the original transaction loader above intact; this listener only
  // refreshes that same data when either participant changes a transaction.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return undefined;

    const refreshTransactionsRealtime = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
        *,
        listing:listing_id (
          device_model,
          asking_price
        ),
        seller:seller_id (
          full_name
        )
      `,
        )
        .or(`harvester_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Realtime transaction refresh error:", error.message);
        return;
      }

      const nextTransactions = data || [];
      setTransactions(nextTransactions);

      setSelectedTransaction((current) => {
        if (!current) return nextTransactions[0] || null;
        const refreshed = nextTransactions.find((tx) => tx.id === current.id);
        return refreshed || current;
      });
    };

    const transactionsChannel = supabase
      .channel(`harvester-transactions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `harvester_id=eq.${userId}`,
        },
        () => {
          refreshTransactionsRealtime();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `seller_id=eq.${userId}`,
        },
        () => {
          refreshTransactionsRealtime();
        },
      )
      .subscribe((status) => {
        console.log("Harvester transaction realtime:", status);
      });

    return () => {
      supabase.removeChannel(transactionsChannel);
    };
  }, [session?.user?.id]);

  const handleReverify = () => {
    setShowProfileDropdown(false);
    setProfilePanelTab("profile");
    setShowProfileModal(true);
    setIsEditingProfile(true);
  };

  const handleResubmitVerification = async () => {
    const currentStatus = String(verificationStatus || "").trim().toLowerCase();
    const allowedStatuses = ["rejected", "expired"];

    // Resubmission is intentionally available only after rejection/expiration.
    // It does NOT require the account to be verified first.
    if (!allowedStatuses.includes(currentStatus)) {
      alert("Document resubmission is only available for rejected or expired Repair Shop accounts.");
      return;
    }

    const permitFile =
      resubmissionPermitRef.current?.files?.[0] || resubmissionPermitFile;
    const techCertFile =
      resubmissionTechCertRef.current?.files?.[0] || resubmissionTechCertFile;

    if (!permitFile) {
      alert("Please upload your corrected Business Permit / DTI Registration.");
      return;
    }

    if (!techCertFile) {
      alert("Please upload your corrected Technical Certification document.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    const maxFileSize = 5 * 1024 * 1024;

    for (const [label, file] of [
      ["Business Permit / DTI Registration", permitFile],
      ["Technical Certification", techCertFile],
    ]) {
      if (!allowedTypes.includes(file.type)) {
        alert(`${label} must be a PDF, JPEG, PNG, or WebP file.`);
        return;
      }
      if (file.size > maxFileSize) {
        alert(`${label} must not exceed 5MB.`);
        return;
      }
    }

    if (!session?.user?.id) {
      alert("User session not found. Please log in again.");
      return;
    }

    setResubmittingVerification(true);

    try {
      const userId = session.user.id;
      const timestamp = Date.now();
      const permitExt = (permitFile.name.split(".").pop() || "bin").toLowerCase();
      const certExt = (techCertFile.name.split(".").pop() || "bin").toLowerCase();

      const permitPath = `permits/${userId}/resubmission_permit_${timestamp}.${permitExt}`;
      const certPath = `certs/${userId}/resubmission_cert_${timestamp}.${certExt}`;

      // Upload the corrected documents using the same Supabase bucket and
      // folder structure used by Repair Shop registration.
      const { error: permitUploadError } = await supabase.storage
        .from("verifications")
        .upload(permitPath, permitFile);

      if (permitUploadError) throw permitUploadError;

      const { data: permitPublicUrl } = supabase.storage
        .from("verifications")
        .getPublicUrl(permitPath);

      const { error: certUploadError } = await supabase.storage
        .from("verifications")
        .upload(certPath, techCertFile);

      if (certUploadError) throw certUploadError;

      const { data: certPublicUrl } = supabase.storage
        .from("verifications")
        .getPublicUrl(certPath);

      // Move rejected/expired -> pending. No verified-status prerequisite.
      const { data: updatedProfile, error: profileError } = await supabase
        .from("profiles")
        .update({
          business_permit_url: permitPublicUrl.publicUrl,
          tech_cert_url: certPublicUrl.publicUrl,
          verification_status: "pending",
          rejection_reason: null,
        })
        .eq("id", userId)
        .select("*")
        .single();

      if (profileError) throw profileError;

      // Keep Auth metadata consistent with the profile status. Failure here
      // should not undo a successful profile resubmission.
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          verification_status: "pending",
          verification_badge: "New User",
        },
      });

      if (metadataError) {
        console.warn("Could not update verification metadata:", metadataError);
      }

      // Re-notify every Administrator account. Notification failure is treated
      // as non-blocking because the corrected documents were already saved.
      try {
        const { data: admins, error: adminLookupError } = await supabase
          .from("profiles")
          .select("id,role")
          .in("role", ["admin", "administrator"]);

        if (adminLookupError) {
          console.warn("Could not find administrator accounts:", adminLookupError);
        } else if (admins?.length) {
          const notificationRows = admins.map((admin) => ({
            user_id: admin.id,
            type: "verification_resubmission",
            title: "Repair Shop Verification Resubmitted",
            description: `${profileData.business_name || profileData.full_name || "A Repair Shop"} has resubmitted corrected verification documents for review.`,
            content: `${profileData.business_name || profileData.full_name || "A Repair Shop"} has resubmitted corrected verification documents for review.`,
            is_read: false,
          }));

          const { error: notificationError } = await supabase
            .from("notifications")
            .insert(notificationRows);

          if (notificationError) {
            console.warn("Could not create administrator notification:", notificationError);
          }
        }
      } catch (notificationError) {
        console.warn("Administrator notification step failed:", notificationError);
      }

      // Update the dashboard immediately without forcing the user to log out.
      setVerificationStatus("pending");
      setRejectionReason("");
      setResubmissionPermitFile(null);
      setResubmissionTechCertFile(null);
      if (resubmissionPermitRef.current) resubmissionPermitRef.current.value = "";
      if (resubmissionTechCertRef.current) resubmissionTechCertRef.current.value = "";
      setProfileData((prev) => ({
        ...prev,
        business_permit_url: updatedProfile?.business_permit_url || permitPublicUrl.publicUrl,
        tech_cert_url: updatedProfile?.tech_cert_url || certPublicUrl.publicUrl,
      }));
      setIsEditingProfile(false);

      alert("Your corrected documents were resubmitted successfully. Your Repair Shop account is now pending administrator review.");
    } catch (error) {
      console.error("REPAIR SHOP VERIFICATION RESUBMISSION ERROR:", error);
      alert(error?.message || "Unable to resubmit your verification documents. Please try again.");
    } finally {
      setResubmittingVerification(false);
    }
  };
  const [myBids, setMyBids] = useState([]);
  const fetchMyBids = async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("bids")
      .select(
        `
      *,
      listings (
        device_model,
        asking_price,
        seller_id,
        profiles:seller_id (
  full_name,
  barangay
)
      )
    `,
      )
      .eq("bidder_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) setMyBids(data);
  };

  const fetchDashboardStats = async () => {
    try {
      if (!session?.user?.id) return;

      // ACTIVE ALERTS
      const { count: alertsCount, error: alertsError } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("harvester_id", session.user.id)
        .eq("is_active", true);

      if (alertsError) console.error(alertsError);

      // PENDING BIDS
      const { count: bidsCount, error: bidsError } = await supabase
        .from("bids")
        .select("*", { count: "exact", head: true })
        .eq("bidder_id", session.user.id)
        .in("status", ["pending", "accepted"]);

      if (bidsError) console.error(bidsError);

      // ACQUIRED PARTS
      const { count: acquiredCount, error: acquiredError } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("harvester_id", session.user.id)
        .eq("status", "completed");

      if (acquiredError) console.error(acquiredError);

      // TOTAL SPENT
      const { data: spentData, error: spentError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("harvester_id", session.user.id)
        .eq("status", "completed");

      if (spentError) console.error(spentError);

      const totalSpent =
        spentData?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0;

      setDashboardStats({
        activeAlerts: alertsCount || 0,
        pendingBids: bidsCount || 0,
        acquiredParts: acquiredCount || 0,
        totalSpent,
      });
    } catch (err) {
      console.error("Dashboard stats error:", err);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardStats();
    }
  }, [session?.user?.id]);

  // Call fetchMyBids when the activeTab changes to 'bids'
  useEffect(() => {
    if (activeTab === "bids") fetchMyBids();
  }, [activeTab]);
  useEffect(() => {
    if (!session?.user?.id) return;

    const notifChannel = supabase
      .channel("personal-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const incomingNotification = payload.new;

          // Add only the REAL database notification. Guard against duplicate
          // realtime events so the same notification is not shown twice.
          setNotifications((prev) =>
            prev.some((item) => item.id === incomingNotification.id)
              ? prev
              : [incomingNotification, ...prev]
          );

          // TC_ALT_01: component-alert notifications must visibly notify the
          // user immediately, not merely write to the console.
          if (incomingNotification?.type === "alert_match") {
            const message =
              incomingNotification.description ||
              incomingNotification.content ||
              "A new Not Working listing matches your component alert.";

            setComponentAlertToast({
              id: incomingNotification.id,
              title: incomingNotification.title || "Component Alert Match",
              message,
            });

            // Keep the toast visible long enough to be noticed without
            // blocking the application with a browser alert().
            window.clearTimeout(
              window.__wastelessComponentAlertToastTimer
            );
            window.__wastelessComponentAlertToastTimer = window.setTimeout(
              () => setComponentAlertToast(null),
              7000
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      window.clearTimeout(window.__wastelessComponentAlertToastTimer);
    };
  }, [session?.user?.id]);
  useEffect(() => {
    if (!session?.user?.id) return;

    // 1. Fetch initial notifications from DB
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        // Only show notifications that actually belong to this account.
        // Do not add demo/mock notifications because they appear for every
        // newly registered user and make the notification panel look like
        // the user already has activity.
        setNotifications(data);
      }
    };

    fetchNotifications();

    const listingsChannel = supabase
      .channel("realtime-listings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        (payload) => {
          console.log("Listing realtime change received!", payload);

          const incomingCondition = normalizeListingCondition(
            payload.new?.condition
          ).toLowerCase();

          // Refresh only when the new listing belongs to this dashboard role.
          // TC_ALT_01 notifications are NOT created here. They are created
          // server-side by the listing alert trigger, which prevents missed
          // notifications when the Alerts tab is not open.
          const canSeeIncomingListing = isRepairShop
            ? incomingCondition === "not working"
            : incomingCondition === "working";

          if (
            payload.new?.status === "active" &&
            canSeeIncomingListing
          ) {
            // Re-fetch so seller profile data and bid information stay complete.
            fetchActiveListings();
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status); // Should say 'SUBSCRIBED'
      });

    return () => {
      supabase.removeChannel(listingsChannel);
    };
  }, [session?.user?.id, isRepairShop]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, business_name, verification_status, rejection_reason")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setVerificationStatus(data.verification_status);
        setRejectionReason(data.rejection_reason);

        const name = data.full_name || "User";

        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        // KEEP existing profileData values
        setProfileData((prev) => ({
          ...prev,
          full_name: name,
          business_name: data.business_name || "",
          initials,
        }));
      }
    };

    // Fetch the profile first so accountRole/isRepairShop is known
    // before the marketplace listing query runs.
    fetchProfile();
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
    // Re-fetch listings whenever the account role becomes known/changes.
    // Repair Shops -> all active Not Working listings (all barangays).
    // Tech Harvesters -> all active Working listings (all barangays).
    if (!isRepairShop && conditionFilter === "Not Working") {
      setConditionFilter("All Conditions");
    }

    // Do not fetch while the role is still unknown.
    if (!accountRole) return;

    fetchActiveListings();
  }, [isRepairShop, accountRole]);

  useEffect(() => {
    if (!accountRole) return;

    const timer = setInterval(async () => {
      await expireListingsIfNeeded();
      await fetchActiveListings();
    }, 30000);

    return () => clearInterval(timer);
  }, [accountRole, isRepairShop]);

  const expireListingsIfNeeded = async () => {
    const nowIso = new Date().toISOString();

    const { data: expiredListings, error } = await supabase
      .from("listings")
      .select("id")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lte("expires_at", nowIso);

    if (error) {
      console.error("Error checking listing expiry:", error.message);
      return;
    }

    if (!expiredListings?.length) return;

    const ids = expiredListings.map((item) => item.id);
    const { error: updateError } = await supabase
      .from("listings")
      .update({ status: "expired" })
      .in("id", ids)
      .eq("status", "active");

    if (updateError) {
      console.error("Error marking listings expired:", updateError.message);
    }
  };

  const fetchActiveListings = async () => {
    try {
      setLoading(true);

      await expireListingsIfNeeded();

      const { data, error } = await supabase
        .from("listings")
        .select(
          `
    *,
    bids(
      amount,
      bidder_id,
      status,
      created_at,
      profiles:bidder_id (
        full_name
      )
    ),
    profiles:seller_id (
      id,
      full_name,
      barangay,
      average_rating
    )
  `
        )
        .eq("status", "active")
        // Hide listings whose expiry timestamp has passed even before the
        // database expiry worker runs its next minute cycle.
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        // Do not filter condition here by exact capitalization.
        // Normalize legacy/current condition values below instead.
        // Barangay is intentionally NOT used as a dashboard visibility filter.
        // All barangays are shown; barangay matching is only for notifications.
        .order("created_at", { ascending: false });

      if (error) throw error;

      // FINAL VISIBILITY RULE:
      // - Working -> visible to regular Tech Harvesters.
      // - Not Working -> visible exclusively to Repair Shops.
      // - Not Working + hazardous -> never shown in the marketplace.
      // The query already restricts Not Working items by account role; this
      // second check protects the UI if data changes while the dashboard is open.
      const sellableListings = (data || [])
        .map((listing) => ({
          ...listing,
          // Store the canonical value in local state so every dashboard
          // component renders the same condition.
          condition: normalizeListingCondition(listing?.condition),
        }))
        .filter((listing) => {
          const condition = String(listing.condition || "").trim().toLowerCase();
          const notExpired =
            !listing.expires_at ||
            new Date(listing.expires_at).getTime() > Date.now();

          // Display only sellable, non-expired listings.
          return ["working", "not working"].includes(condition) && notExpired;
        });

      const formattedData = sellableListings.map((listing) => {
        const bids = Array.isArray(listing.bids) ? listing.bids : [];

        // REQ-2: this is a descending-price marketplace.
        // Only pending bids are active bidding prices. The current displayed
        // price is the lowest active bid; when there are no active bids it is
        // the seller's maximum asking price.
        const activeBids = bids.filter(
          (bid) => String(bid?.status || "").trim().toLowerCase() === "pending",
        );

        const lowestActiveBid =
          activeBids.length > 0
            ? activeBids.reduce((lowest, bid) =>
              Number(bid.amount || 0) < Number(lowest.amount || 0) ? bid : lowest,
            )
            : null;

        const askingPrice = Number(listing.asking_price || 0);
        const currentDisplayedPrice = lowestActiveBid
          ? Number(lowestActiveBid.amount)
          : askingPrice;

        /*
         * IMPORTANT:
         * Seller information comes directly from profiles.
         */
        const sellerName = listing.profiles?.full_name?.trim() || "Seller";

        return {
          ...listing,

          seller_name: sellerName,

          seller_barangay: listing.profiles?.barangay || "Valenzuela",

          seller_rating: Number(listing.profiles?.average_rating || 0),

          // Kept for compatibility with existing UI/sorting.
          highest_bid: lowestActiveBid ? Number(lowestActiveBid.amount) : null,

          highest_bidder: lowestActiveBid?.profiles?.full_name || null,

          // REQ-2 fields.
          lowest_active_bid: lowestActiveBid ? Number(lowestActiveBid.amount) : null,
          current_displayed_price: currentDisplayedPrice,

          bid_count: bids.length,
          active_bid_count: activeBids.length,
        };
      });

      setListings(formattedData);
    } catch (err) {
      console.error("Error fetching listings:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (listingId, amount, message) => {
    if (!isVerified) {
      alert("Only verified harvesters can place bids.");
      return;
    }

    // TC_MSG_03: block bids whose optional message contains restricted
    // content instead of transmitting it with the bid.
    const bidMessageViolation = containsRestrictedContent(message);
    if (bidMessageViolation.blocked) {
      alert(bidMessageViolation.message);
      return;
    }

    try {
      // 1. Re-fetch the listing and its active bids immediately before
      // accepting the offer. This prevents a stale UI price from bypassing
      // REQ-2 when another bidder has already submitted a lower bid.
      const { data: currentListing, error: statusError } = await supabase
        .from("listings")
        .select(
          `
          status,
          condition,
          description,
          seller_id,
          device_model,
          asking_price,
          expires_at,
          bids (
            amount,
            status,
            created_at
          )
        `,
        )
        .eq("id", listingId)
        .single();

      const listingCondition = String(currentListing?.condition || "")
        .trim()
        .toLowerCase();
      const isExpired = Boolean(
        currentListing?.expires_at &&
        new Date(currentListing.expires_at).getTime() <= Date.now(),
      );

      if (isExpired && currentListing?.status === "active") {
        await supabase
          .from("listings")
          .update({ status: "expired" })
          .eq("id", listingId)
          .eq("status", "active");
      }

      // Check if the listing is locked, unsupported, hazardous, or expired.
      if (
        statusError ||
        !currentListing ||
        currentListing.status !== "active" ||
        isExpired ||
        (!["working", "not working"].includes(listingCondition) ||
          (listingCondition === "not working" && !isRepairShop)) ||
        isHazardousListing(currentListing)
      ) {
        alert(
          isHazardousListing(currentListing)
            ? "This item is hazardous and is not available for sale."
            : listingCondition === "not working" && !isRepairShop
            ? "Not Working items are available exclusively to Repair Shops."
            : "This listing is no longer accepting bids (Closed or Expired).",
        );
        setSelectedListing(null);
        fetchActiveListings();
        return;
      }

      // REQ-2: seller's maximum asking price is the starting displayed price.
      // After a bid is placed, the lowest pending bid becomes the current
      // displayed price. Every new bid must be strictly lower than it.
      const activeBids = Array.isArray(currentListing.bids)
        ? currentListing.bids.filter(
            (bid) =>
              String(bid?.status || "").trim().toLowerCase() === "pending",
          )
        : [];

      const lowestActiveBid =
        activeBids.length > 0
          ? activeBids.reduce((lowest, bid) =>
              Number(bid.amount || 0) < Number(lowest.amount || 0)
                ? bid
                : lowest,
            )
          : null;

      const maximumAskingPrice = Number(currentListing.asking_price || 0);
      const currentDisplayedPrice = lowestActiveBid
        ? Number(lowestActiveBid.amount)
        : maximumAskingPrice;
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        alert("Please enter a valid bid amount.");
        return;
      }

      if (
        !Number.isFinite(currentDisplayedPrice) ||
        currentDisplayedPrice <= 0
      ) {
        alert("This listing does not have a valid current displayed price.");
        return;
      }

      if (numericAmount >= currentDisplayedPrice) {
        alert(
          `Your bid must be lower than the current displayed price of ₱${currentDisplayedPrice.toLocaleString()}.`,
        );
        return;
      }

      // 2. Insert the bid
      const { error: bidError } = await supabase.from("bids").insert([
        {
          listing_id: listingId,
          bidder_id: session.user.id,
          amount: numericAmount,
        },
      ]);

      if (bidError) throw bidError;

      // 3. The database bid trigger creates the seller notification atomically
      // with the bid, so direct/API bids cannot bypass REQ-4.

      // 4. Handle optional message
      if (message.trim()) {
        await supabase.from("messages").insert([
          {
            listing_id: listingId,
            sender_id: session.user.id,
            receiver_id: currentListing.seller_id, // Ensure receiver is set
            content: message,
          },
        ]);
      }

      alert("Bid placed successfully!");
      setSelectedListing(null);

      // Optional: refresh local state if you track bids locally
      // fetchActiveListings();
    } catch (err) {
      console.error("ERROR:", err);
      alert("Error placing bid: " + err.message);
    }
  };
  // Opens the Messages tab pre-loaded with a chat to the seller of an accepted bid.
  const handleContactSeller = (bid) => {
    const sellerId = bid?.listings?.seller_id;

    if (!sellerId) {
      alert("Seller information is unavailable for this bid.");
      return;
    }

    setContactSellerChat({
      other_party_id: sellerId,
      name: bid.listings?.profiles?.full_name || "Seller",
    });
    setActiveTab("messages");
  };

  // REQ-1: coordinate the selected transaction through Messages.
  const handleOpenTransactionMessages = () => {
    const tx = selectedTransaction;
    if (!tx) return;

    const otherPartyId =
      tx.seller_id === session?.user?.id ? tx.harvester_id : tx.seller_id;

    if (!otherPartyId) {
      alert("The other participant of this transaction is unavailable.");
      return;
    }

    setContactSellerChat({
      other_party_id: otherPartyId,
      name: tx.seller?.full_name || "Seller",
    });
    setActiveTab("messages");
  };

  const handleSendMessageOnly = async (listingId, message) => {
    if (!message.trim()) return;

    // REQ-2: Pending Verification accounts are view-only.
    if (!isVerified) {
      alert("Pending Verification accounts are view-only and cannot send messages.");
      return;
    }

    // TC_MSG_03: block restricted content before transmitting.
    const messageViolation = containsRestrictedContent(message);
    if (messageViolation.blocked) {
      alert(messageViolation.message);
      return;
    }

    try {
      // Fetch seller_id
      const { data: listing, error } = await supabase
        .from("listings")
        .select("seller_id")
        .eq("id", listingId)
        .single();

      if (error) throw error;

      // Insert message
      const { error: messageError } = await supabase.from("messages").insert([
        {
          listing_id: listingId,
          sender_id: session.user.id,
          receiver_id: listing.seller_id,
          content: message,
          is_read: false,
        },
      ]);

      if (messageError) throw messageError;

      // REQ-3: notify the seller of the new message.
      await notifyNewMessage({
        receiverId: listing.seller_id,
        listingId,
        senderLabel: "A Tech Harvester",
      });

      alert("Message sent to seller!");
      setSelectedListing(null);
    } catch (err) {
      console.error("ERROR SENDING MESSAGE:", err);
      alert("Error sending message: " + err.message);
    }
  };
  const handleMarkAllRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };
  // Keep the condition filter valid while allowing both listing conditions.
  const effectiveConditionFilter =
    conditionFilter === "Working" || conditionFilter === "Not Working" || conditionFilter === "All Conditions"
      ? conditionFilter
      : "All Conditions";

  const filteredListings = listings
    .filter((item) => {
      const search = searchTerm.toLowerCase().trim();

      if (!search) return true;

      return (
        item.device_model?.toLowerCase().includes(search) ||
        item.device_type?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search) ||
        item.seller_name?.toLowerCase().includes(search)
      );
    })
    .filter((item) => {
      const condition = normalizeListingCondition(item?.condition).toLowerCase();

      // Display both Working and Not Working listings.
      if (!["working", "not working"].includes(condition)) return false;

      if (effectiveConditionFilter === "All Conditions") {
        return true;
      }

      return condition === effectiveConditionFilter.toLowerCase();
    })
    .sort((a, b) => {
      if (sortOption === "Price Low") {
        return Number(a.asking_price || 0) - Number(b.asking_price || 0);
      }

      if (sortOption === "Price High") {
        return Number(b.asking_price || 0) - Number(a.asking_price || 0);
      }

      if (sortOption === "Highest Bid") {
        return (
          Number(b.current_displayed_price || b.asking_price || 0) -
          Number(a.current_displayed_price || a.asking_price || 0)
        );
      }

      // Newest
      return new Date(b.created_at) - new Date(a.created_at);
    });
  const handleChangePassword = async () => {
    const current = passwordForm.current.trim();
    const next = passwordForm.next;
    const confirm = passwordForm.confirm;

    if (!current || !next || !confirm) {
      alert("Please complete all password fields.");
      return;
    }

    if (next.length < 8) {
      alert("Your new password must be at least 8 characters.");
      return;
    }

    if (next !== confirm) {
      alert("The new password and confirmation do not match.");
      return;
    }

    if (!session?.user?.email) {
      alert("User session not found. Please log in again.");
      return;
    }

    setChangingPassword(true);

    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: current,
      });

      if (reauthError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });

      if (updateError) throw updateError;

      setPasswordForm({ current: "", next: "", confirm: "" });
      alert("Password updated successfully.");
    } catch (error) {
      console.error("CHANGE PASSWORD ERROR:", error);
      alert(error?.message || "Unable to update your password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeactivateAccount = async () => {
    const confirmed = window.confirm(
      "Deactivate your Repair Shop account? Your account will no longer be active until it is restored by an administrator."
    );

    if (!confirmed || !session?.user?.id) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "inactive" })
        .eq("id", session.user.id);

      if (error) throw error;

      await supabase.auth.signOut();
      setShowProfileModal(false);
      setIsEditingProfile(false);

      if (typeof onLogout === "function") {
        onLogout();
      }
    } catch (error) {
      console.error("DEACTIVATE ACCOUNT ERROR:", error);
      alert(error?.message || "Unable to deactivate your account.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* =========================================================
          TC_ALT_01 — COMPONENT ALERT LIVE TOAST
          ========================================================= */}
      {componentAlertToast && (
        <div className="fixed top-5 right-5 z-[200] w-[min(420px,calc(100vw-2rem))]">
          <div className="bg-white border border-amber-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Bell size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800">
                  {componentAlertToast.title}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  {componentAlertToast.message}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setComponentAlertToast(null);
                    setShowNotifications(true);
                  }}
                  className="mt-3 text-xs font-black text-amber-600 hover:text-amber-700"
                >
                  View notification
                </button>
              </div>

              <button
                type="button"
                aria-label="Dismiss component alert"
                onClick={() => setComponentAlertToast(null)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== TOP BANNER ===== */}
      <div
        className="relative overflow-hidden min-h-[360px] px-6 pt-6 pb-8 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(
          rgba(255, 255, 255, 0.09),
          rgba(255, 255, 255, 0.29)
        ), url(${bannerBg})`,
        }}
      >
        {/* Soft overlay blur */}
        <div className="absolute inset-0 backdrop-[1px]"></div>

        {/* CONTENT */}
        <div className="relative z-10">
          {/* --- TOP HEADER SECTION --- */}
          <div className="flex justify-end items-center min-h-11 mb-8 gap-3">
            {/* Message Icon Container */}
            <div className="relative">
              <button
                type="button"
                onClick={handleOpenMessages}
                aria-label="Messages"
                title="Messages"
                className={`relative bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-sm border border-white/50 cursor-pointer hover:bg-white transition-all ${activeTab === "messages"
                  ? "text-[#769c2d] ring-2 ring-[#769c2d]/20"
                  : "text-slate-600"
                  }`}
              >
                <MessageSquare size={20} />
              </button>

              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold border-2 border-white">
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              )}
            </div>

            {/* Notification Bell Container */}
            <div className="relative">
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-11 h-11 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-white/60 cursor-pointer hover:bg-white transition-all text-slate-600"
              >
                <Bell size={20} />
              </div>

              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">
                  {notifications.filter((n) => !n.is_read).length}
                </span>
              )}

              {/* Notification Dropdown */}
              {showNotifications && (
                <>
                  {/* Click anywhere outside the notification box to close it. */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                    aria-hidden="true"
                  />

                  <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-tight">
                      Notifications
                    </h3>

                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-bold text-[#769c2d] hover:text-[#5d7a24]"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => {
                        let icon = <Package size={14} />;
                        let iconBg = "bg-lime-100 text-[#769c2d]";

                        if (n.type === "bid_accepted" || n.type === "payment") {
                          icon = <CheckCircle size={14} />;
                          iconBg = "bg-emerald-100 text-emerald-600";
                        } else if (n.type === "message") {
                          icon = <MessageSquare size={14} />;
                          iconBg = "bg-blue-100 text-blue-600";
                        } else if (n.type === "meetup") {
                          icon = <Calendar size={14} />;
                          iconBg = "bg-purple-100 text-purple-600";
                        }

                        return (
                          <div
                            key={n.id}
                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.is_read ? "bg-lime-50/30" : ""
                              }`}
                          >
                            <div className="flex gap-3">
                              <div
                                className={`w-8 h-8 ${iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}
                              >
                                {icon}
                              </div>

                              <div className="flex-1">
                                <p className="text-xs font-black text-slate-800">
                                  {n.title}
                                </p>

                                <p className="text-xs text-slate-500 leading-tight mt-1">
                                  {n.content ||
                                    n.description ||
                                    "New Wasteless notification."}
                                </p>

                                <p className="text-xs text-slate-300 font-bold mt-2 uppercase tracking-widest">
                                  {new Date(n.created_at).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>

                              {!n.is_read && (
                                <div className="w-1.5 h-1.5 bg-[#769c2d] rounded-full mt-1"></div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-10 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">
                        No new alerts
                      </div>
                    )}
                  </div>

                  <button className="w-full py-4 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors bg-slate-50/50 border-t border-slate-50">
                    View All Notifications
                  </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <div
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-1 pr-4 rounded-full shadow-sm border border-white/50 cursor-pointer hover:border-slate-300 transition-all"
              >
                <div className="text-right hidden sm:block pl-3">
                  <p className="font-bold text-slate-800 text-xs leading-none mb-1">
                    {((profileData.role === "repair_shop" && profileData.business_name?.trim()) || profileData.full_name)}
                  </p>

                  {verificationStatus === "verified" ? (
                    <p className="text-[#769c2d] text-xs font-black flex items-center justify-end gap-1 uppercase tracking-tighter">
                      <CheckCircle2 size={10} /> Verified
                    </p>
                  ) : verificationStatus === "rejected" ? (
                    <p className="text-red-500 text-xs font-black flex items-center justify-end gap-1 uppercase tracking-tighter">
                      <XCircle size={10} /> Rejected
                    </p>
                  ) : (
                    <p className="text-orange-400 text-xs font-black flex items-center justify-end gap-1 uppercase tracking-tighter">
                      <Clock size={10} /> Pending
                    </p>
                  )}
                </div>

                <div className="w-9 h-9 bg-[#4a7c59] rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm border border-white/20">
                  {profileData.initials}
                </div>
              </div>

              {showProfileDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfileDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-50 z-20 overflow-hidden">
                    <div className="bg-gradient-to-br from-[#4a7c59] to-[#769c2d] p-5 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-sm">
                          {profileData.initials}
                        </div>
                        <div>
                          <p className="font-bold text-xs">
                            {((profileData.role === "repair_shop" && profileData.business_name?.trim()) || profileData.full_name)}
                          </p>
                          <p className="text-xs text-white/80">
                            {session?.user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          setProfilePanelTab("profile");
                          setIsEditingProfile(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors text-xs font-bold"
                      >
                        <span className="text-slate-400">
                          <User size={15} />
                        </span>
                        View Profile
                      </button>
                      <MenuLink
                        icon={<Settings size={15} />}
                        label="Settings"
                        onClick={() => {
                          setShowProfileDropdown(false);
                          setProfilePanelTab("profile");
                          setShowProfileModal(true);
                          setIsEditingProfile(true);
                        }}
                      />
                      {/* Achievements */}
                      <MenuLink
                        icon={<Award size={15} />}
                        label="Achievements"
                        onClick={() => {
                          setShowProfileDropdown(false);
                          setShowAchievementsModal(true);
                        }}
                      />

                      {/* Logout section with border-t and specific styling from image_085a5b.jpg */}
                      <div className="mt-2 pt-2 border-t border-slate-50">
                        <button
                          onClick={onLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors text-xs font-black uppercase tracking-widest"
                        >
                          <LogOut size={15} /> Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {selectedSellerId && (
            <SellerProfileModal
              sellerId={selectedSellerId}
              onClose={() => setSelectedSellerId(null)}
              onMessage={(seller) => {
                setSelectedSellerId(null);

                // Optional:
                // switch to your Messages tab here
                // if you want "Message Seller" to open
                // the messaging interface.
                console.log("Message seller:", seller.id);
              }}
            />
          )}
          {showProfileModal && (
            <RepairShopProfileDrawer
              profileData={profileData}
              verificationStatus={verificationStatus}
              isRepairShop={isRepairShop}
              profilePanelTab={profilePanelTab}
              setProfilePanelTab={setProfilePanelTab}
              isEditingProfile={isEditingProfile}
              setIsEditingProfile={setIsEditingProfile}
              setShowProfileModal={setShowProfileModal}
              passwordForm={passwordForm}
              setPasswordForm={setPasswordForm}
              changingPassword={changingPassword}
              handleChangePassword={handleChangePassword}
              handleDeactivateAccount={handleDeactivateAccount}
              handleReverify={handleReverify}
              userTrustStats={userTrustStats}
              currentTrustTier={currentTrustTier}
              nextTrustTier={nextTrustTier}
              trustTierLoading={trustTierLoading}
              trustTierProgress={trustTierProgress}
              dashboardStats={dashboardStats}
              session={session}
            />
          )}
          {(verificationStatus === "rejected" || verificationStatus === "expired") && (
            <div className={`mb-8 p-6 border-2 rounded-[2rem] flex items-center gap-6 animate-in slide-in-from-top duration-500 ${
              verificationStatus === "expired"
                ? "bg-orange-50 border-orange-100"
                : "bg-red-50 border-red-100"
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                verificationStatus === "expired"
                  ? "bg-orange-100 text-orange-600"
                  : "bg-red-100 text-red-600"
              }`}>
                {verificationStatus === "expired" ? <Clock size={24} /> : <XCircle size={24} />}
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-black uppercase tracking-tight ${
                  verificationStatus === "expired" ? "text-orange-800" : "text-red-800"
                }`}>
                  {verificationStatus === "expired"
                    ? "Account Verification Expired"
                    : "Account Verification Rejected"}
                </h3>
                {rejectionReason && (
                  <p className={`text-xs font-medium mt-1 ${
                    verificationStatus === "expired" ? "text-orange-700" : "text-red-600"
                  }`}>
                    Reason: <span className="font-bold">"{rejectionReason}"</span>
                  </p>
                )}
                <p className={`text-xs mt-2 ${
                  verificationStatus === "expired" ? "text-orange-500" : "text-red-400"
                }`}>
                  Upload corrected Business Permit and Technical Certification documents, then resubmit for administrator approval.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReverify}
                className={`px-6 py-2 text-white text-xs font-black rounded-2xl uppercase tracking-widest transition-colors ${
                  verificationStatus === "expired"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Update Profile
              </button>
            </div>
          )}

          {verificationStatus === "pending" && (
            <div className="mb-8 p-5 bg-blue-50 border-2 border-blue-100 rounded-[2rem] flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Clock size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-blue-800 uppercase tracking-tight">
                  Verification Pending
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  Your documents are with the Administrator for review. You will be notified when the verification status changes.
                </p>
              </div>
            </div>
          )}

          {/* --- STATS GRID --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 mb-8">
            <StatCard
              label="Active Alerts"
              value={dashboardStats.activeAlerts.toString()}
            />

            <StatCard
              label="Pending Bids"
              value={dashboardStats.pendingBids.toString()}
            />

            <StatCard
              label="Acquired Parts"
              value={dashboardStats.acquiredParts.toString()}
            />

            <StatCard
              label="Total Spent"
              value={dashboardStats.totalSpent}
              isPrice
            />
          </div>

          {/* --- NAVIGATION --- */}
          <div className="bg-white/95 backdrop-blur-md rounded-[2rem] border border-white shadow-lg px-16 py-4 flex flex-wrap gap-8 items-stretch z-1000">
            <NavBtn
              active={activeTab === "browse"}
              onClick={() => setActiveTab("browse")}
              icon={<Search size={16} />}
              label="Browse Listings"
            />

            <NavBtn
              active={activeTab === "bids"}
              onClick={() => setActiveTab("bids")}
              icon={<Gavel size={16} />}
              label="My Bids"
            />

            <NavBtn
              active={activeTab === "transactions"}
              onClick={() => setActiveTab("transactions")}
              icon={<Gavel size={16} />}
              label="Transactions"
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
              icon={
                <MapIcon size={16} className={!isVerified ? "opacity-50" : ""} />
              }
              label={isVerified ? "Urban Mine Map" : "Map (Locked)"}
              disabled={!isVerified}
            />

            <NavBtn
              active={activeTab === "leaderboard"}
              onClick={() => setActiveTab("leaderboard")}
              icon={<Trophy size={16} />}
              label="E-waste Tracker"
            />

            <NavBtn
              active={activeTab === "alerts"}
              onClick={() => setActiveTab("alerts")}
              icon={<Bell size={16} />}
              label="My Alerts"
            />

            <NavBtn
              active={activeTab === "donation"}
              onClick={() => setActiveTab("donation")}
              icon={<Gift size={16} />}
              label="Donation"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 shadow-sm p-4 sm:p-5 mb-8 rounded-[2rem]">
        {/* =========================================================
    SEARCH + FILTER
    TC_MAP_01: Listing filter/search UI is shown ONLY on Browse Listings.
    It is hidden on every other dashboard tab.
========================================================= */}
        {activeTab === "browse" && (
          <>
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-sm p-4 mb-5">
              <div className="flex flex-col md:flex-row gap-3">
                {/* SEARCH */}
                <div className="relative flex-1">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={17}
                  />

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by device name or model..."
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#769c2d]/20 focus:border-[#769c2d]"
                  />

                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* CONDITION */}
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="md:w-40 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#769c2d]/20"
                >
                  <option>All Conditions</option>
                  <option value="Working">Working</option>
                  <option value="Not Working">Not Working</option>
                </select>

                {/* SORT */}
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="md:w-36 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#769c2d]/20"
                >
                  <option value="Newest">Newest</option>
                  <option value="Price Low">Price: Low</option>
                  <option value="Price High">Price: High</option>
                  <option value="Highest Bid">Highest Bid</option>
                </select>
              </div>
            </div>

            {/* RESULT COUNT */}
            <div className="flex justify-between items-center mb-4 px-1">
              <p className="text-xs font-bold text-slate-400">
                {filteredListings.length}{" "}
                {filteredListings.length === 1 ? "listing" : "listings"} found
              </p>

              <p className="text-xs font-bold text-slate-400">
                Sorted by: <span className="text-slate-600">{sortOption}</span>
              </p>
            </div>
          </>
        )}

        {/* <p className="text-xs font-bold text-slate-400 mb-6 flex justify-between">
          <span className=" rounded-full px-3 py-1 ">
            {listings.length} listings found
          </span>
          <span>Sorted by: Nearest</span>
        </p> */}

        {/* --- TAB CONTENT --- */}
        {activeTab === "browse" ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pb-20">
            {loading ? (
              <div className="xl:col-span-2 py-20 text-center">
                <div className="w-8 h-8 border-2 border-[#769c2d] border-t-transparent rounded-full animate-spin mx-auto" />

                <p className="text-xs font-bold text-slate-400 mt-3">
                  Loading listings...
                </p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 py-20 text-center">
                <Box size={36} className="mx-auto text-slate-200" />

                <p className="text-sm font-black text-slate-500 mt-4">
                  No listings found
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Try another search or condition.
                </p>
              </div>
            ) : (
              filteredListings.map((item) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  onBid={() => setSelectedListing(item)}
                  onSellerClick={() =>
                    setSelectedSellerId(item.seller_id || item.profiles?.id)
                  }
                  isVerified={isVerified}
                />
              ))
            )}
          </div>
        ) : activeTab === "leaderboard" ? (
          <BarangayLeaderboard />
        ) : activeTab === "bids" ? (
          <MyBidsView bids={myBids} onContactSeller={handleContactSeller} />
        ) : activeTab === "transactions" ? (
          <TransactionsView
            transactions={transactions}
            selectedTransaction={selectedTransaction}
            onSelect={setSelectedTransaction}
            handleCompleteHandover={handleCompleteHandover}
            onOpenMessages={handleOpenTransactionMessages}
            session={session} // Add this prop
          />
        ) : activeTab === "inventory" ? ( // ADD THIS
          <InventoryView userId={session?.user?.id} />
        ) : activeTab === "map" ? ( // ADD THIS BLOCK
          <UrbanMineMap isVerified={isVerified} />
        ) : activeTab === "messages" ? (
          <MessagesView
            session={session}
            initialChat={contactSellerChat}
            onInitialChatConsumed={() => setContactSellerChat(null)}
          />
        ) : activeTab === "alerts" ? (
          <div className="space-y-8">
            {/* This allows you to both manage alert settings AND see your matches */}
            <HarvesterAlerts session={session} isVerified={isVerified} />

            {/* ADD THIS LINE TO RENDER THE NOTIFICATIONS LIST */}
            <AlertsView
              notifications={notifications.filter(
                (n) => n.type === "alert_match",
              )}
            />
          </div>
        ) : activeTab === "donation" ? (
          <DonationTab
            profileData={profileData}
            session={session}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <LayoutGrid size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-sm uppercase tracking-widest">
              Section Coming Soon
            </p>
          </div>
        )}

        {showAchievementsModal && (
          <AchievementsModal
            profileData={profileData}
            verificationStatus={verificationStatus}
            currentTrustTier={currentTrustTier}
            onClose={() => setShowAchievementsModal(false)}
          />
        )}

        {selectedListing && (
          <PlaceBidModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            // Pass user id for the Ask Question functionality
            session={session}
            onSubmit={handlePlaceBid}
            // Pass the new function for sending just a message
            onSendMessage={handleSendMessageOnly}
          />
        )}
      </div>
      <SiteFooter />
    </div>
  );
};
const RepairShopProfileDrawer = ({
  profileData,
  verificationStatus,
  isRepairShop,
  profilePanelTab,
  setProfilePanelTab,
  isEditingProfile,
  setIsEditingProfile,
  setShowProfileModal,
  passwordForm,
  setPasswordForm,
  changingPassword,
  handleChangePassword,
  handleDeactivateAccount,
  handleReverify,
  userTrustStats,
  currentTrustTier,
  nextTrustTier,
  trustTierLoading,
  trustTierProgress,
  dashboardStats,
  session,
}) => (
            <div
              className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-[2px]"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setShowProfileModal(false);
                  setIsEditingProfile(false);
                }
              }}
            >
              <aside
                className="absolute right-0 top-0 h-full w-full max-w-[390px] bg-white shadow-2xl flex flex-col overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Repair Shop profile"
              >
                {/* Drawer top bar */}
                <div className="h-[62px] shrink-0 bg-slate-900 flex items-center justify-end px-3">
                  <button
                    type="button"
                    aria-label="Close profile"
                    onClick={() => {
                      setShowProfileModal(false);
                      setIsEditingProfile(false);
                      setProfilePanelTab("profile");
                    }}
                    className="w-8 h-8 rounded-lg bg-slate-700 text-white/80 hover:bg-slate-600 hover:text-white flex items-center justify-center transition"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                {/* Profile identity */}
                <div className="px-4 pt-5 pb-3 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5d963d] to-[#2b8c91] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {profileData?.initials || "RS"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[15px] font-black text-slate-800 truncate">
                          {profileData?.full_name || "Repair Shop"}
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-50 text-[#5d963d] text-[9px] font-bold border border-lime-100 shrink-0">
                          <CheckCircle2 size={10} />
                          {verificationStatus === "verified" ? "Verified" : "Pending"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Repair Shop · {profileData?.barangay || profileData?.assigned_area || "Valenzuela"}
                      </p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-100 p-0.5">
                    {[
                      { id: "profile", label: "View Profile" },
                      { id: "security", label: "Account & Security" },
                      { id: "trust", label: "Trust Tier" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setProfilePanelTab(tab.id);
                          setIsEditingProfile(false);
                        }}
                        className={`min-w-0 px-2 py-2 rounded-lg text-[9px] font-bold transition ${
                          profilePanelTab === tab.id
                            ? "bg-white text-[#527a24] shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white">
                  {/* ================= VIEW PROFILE ================= */}
                  {profilePanelTab === "profile" && (
                    <div className="px-4 pb-7 pt-2 space-y-5">
                      {!isEditingProfile ? (
                        <>
                          <section>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">
                              Shop Information
                            </p>

                            <div className="space-y-2">
                              {[
                                {
                                  icon: <User size={14} />,
                                  label: "Full Name",
                                  value: profileData?.full_name || "No name provided",
                                },
                                {
                                  icon: <Mail size={14} />,
                                  label: "Email",
                                  value: profileData?.email || "No email provided",
                                },
                                {
                                  icon: <Phone size={14} />,
                                  label: "Phone Number",
                                  value: profileData?.contact_number || "No phone number",
                                },
                                {
                                  icon: <MapPin size={14} />,
                                  label: "Barangay",
                                  value:
                                    profileData?.barangay ||
                                    profileData?.assigned_area ||
                                    "Not assigned",
                                },
                              ].map((item) => (
                                <div
                                  key={item.label}
                                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                                >
                                  <span className="text-slate-400 shrink-0">{item.icon}</span>
                                  <div className="min-w-0">
                                    <p className="text-[9px] text-slate-400">{item.label}</p>
                                    <p className="text-[11px] font-semibold text-slate-700 truncate">
                                      {item.value}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>

                          <section>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                About the Shop
                              </p>
                              <button
                                type="button"
                                onClick={() => setIsEditingProfile(true)}
                                className="text-[10px] font-bold text-[#5d963d] hover:text-[#3f7126] flex items-center gap-1"
                              >
                                <Settings size={11} />
                                Edit
                              </button>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-3">
                              <p className="text-[11px] leading-relaxed text-slate-500">
                                {profileData?.business_activity?.trim() ||
                                  "No shop description has been provided yet."}
                              </p>
                            </div>
                          </section>

                          <section>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">
                              Services Offered
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                              {String(profileData?.tech_specialization || "")
                                .split(/[,;\n|]+/)
                                .map((service) => service.trim())
                                .filter(Boolean)
                                .map((service, index) => (
                                  <span
                                    key={`${service}-${index}`}
                                    className="px-2.5 py-1 rounded-full border border-lime-200 bg-lime-50 text-[#5d7f3b] text-[9px] font-medium"
                                  >
                                    {service}
                                  </span>
                                ))}

                              {!String(profileData?.tech_specialization || "").trim() && (
                                <span className="text-[10px] text-slate-400">
                                  No services listed yet.
                                </span>
                              )}
                            </div>
                          </section>

                          <button
                            type="button"
                            onClick={() => setIsEditingProfile(true)}
                            className="w-full rounded-xl bg-[#5d9d25] hover:bg-[#4f8b20] text-white py-2.5 text-[10px] font-black flex items-center justify-center gap-2 transition shadow-sm"
                          >
                            <Settings size={13} />
                            Edit Contact Info
                          </button>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-black text-slate-800">Edit Contact Info</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Update your repair shop profile details.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsEditingProfile(false)}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>

                          {[
                            ["Full Name", "full_name", "text", "Enter your full name"],
                            ["Phone Number", "contact_number", "tel", "Enter your phone number"],
                            ["Barangay", "assigned_area", "text", "Enter your barangay"],
                          ].map(([label, key, type, placeholder]) => (
                            <label key={key} className="block">
                              <span className="text-[10px] font-bold text-slate-500">{label}</span>
                              <input
                                type={type}
                                value={profileData?.[key] || ""}
                                onChange={(e) =>
                                  setProfileData((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                placeholder={placeholder}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] outline-none focus:bg-white focus:border-[#769c2d] focus:ring-2 focus:ring-lime-100"
                              />
                            </label>
                          ))}

                          <label className="block">
                            <span className="text-[10px] font-bold text-slate-500">About the Shop</span>
                            <textarea
                              rows={4}
                              value={profileData?.business_activity || ""}
                              onChange={(e) =>
                                setProfileData((prev) => ({
                                  ...prev,
                                  business_activity: e.target.value,
                                }))
                              }
                              placeholder="Describe your repair shop and services."
                              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] outline-none resize-none focus:bg-white focus:border-[#769c2d] focus:ring-2 focus:ring-lime-100"
                            />
                          </label>

                          <label className="block">
                            <span className="text-[10px] font-bold text-slate-500">
                              Services Offered
                            </span>
                            <textarea
                              rows={3}
                              value={profileData?.tech_specialization || ""}
                              onChange={(e) =>
                                setProfileData((prev) => ({
                                  ...prev,
                                  tech_specialization: e.target.value,
                                }))
                              }
                              placeholder="Screen Replacement, Battery Replacement, Data Recovery..."
                              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] outline-none resize-none focus:bg-white focus:border-[#769c2d] focus:ring-2 focus:ring-lime-100"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                if (!session?.user?.id) {
                                  alert("User session not found. Please log in again.");
                                  return;
                                }

                                const { data, error } = await supabase
                                  .from("profiles")
                                  .update({
                                    full_name: profileData?.full_name?.trim() || null,
                                    contact_number: profileData?.contact_number?.trim() || null,
                                    barangay:
                                      profileData?.assigned_area?.trim() ||
                                      profileData?.barangay?.trim() ||
                                      null,
                                    business_activity:
                                      profileData?.business_activity?.trim() || null,
                                    tech_specialization:
                                      profileData?.tech_specialization?.trim() || null,
                                  })
                                  .eq("id", session.user.id)
                                  .select(
                                    "full_name,contact_number,barangay,business_activity,tech_specialization",
                                  )
                                  .single();

                                if (error) throw error;

                                setProfileData((prev) => ({
                                  ...prev,
                                  ...data,
                                  assigned_area: data?.barangay || "",
                                }));
                                setIsEditingProfile(false);
                                alert("Profile updated successfully!");
                              } catch (error) {
                                console.error("PROFILE UPDATE ERROR:", error);
                                alert(`Failed to update profile: ${error.message}`);
                              }
                            }}
                            className="w-full rounded-xl bg-[#5d9d25] hover:bg-[#4f8b20] text-white py-2.5 text-[10px] font-black transition"
                          >
                            Save Changes
                          </button>
                        </div>
                      )}

                      {(verificationStatus === "rejected" || verificationStatus === "expired") && (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                          <p className="text-[10px] font-bold text-amber-800">
                            Verification needs attention.
                          </p>
                          <button
                            type="button"
                            onClick={handleReverify}
                            className="mt-2 text-[10px] font-black text-amber-700 hover:text-amber-900"
                          >
                            Update verification documents →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ================= ACCOUNT & SECURITY ================= */}
                  {profilePanelTab === "security" && (
                    <div className="px-4 pb-8 pt-6">
                      <section>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-3">
                          Change Password
                        </p>

                        <div className="space-y-3">
                          {[
                            ["Current Password", "current", passwordForm.current],
                            ["New Password", "next", passwordForm.next],
                            ["Confirm New Password", "confirm", passwordForm.confirm],
                          ].map(([label, key, value]) => (
                            <label key={key} className="block">
                              <span className="text-[10px] font-medium text-slate-500">{label}</span>
                              <input
                                type="password"
                                value={value}
                                onChange={(e) =>
                                  setPasswordForm((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[11px] outline-none focus:border-[#769c2d] focus:ring-2 focus:ring-lime-100"
                              />
                            </label>
                          ))}

                          <button
                            type="button"
                            onClick={handleChangePassword}
                            disabled={changingPassword}
                            className="w-full rounded-xl bg-[#5d9d25] hover:bg-[#4f8b20] text-white py-2.5 text-[10px] font-black transition disabled:opacity-50"
                          >
                            {changingPassword ? "Updating Password..." : "Update Password"}
                          </button>
                        </div>
                      </section>

                      <div className="my-6 border-t border-slate-100" />

                      <section>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-3">
                          Danger Zone
                        </p>

                        <button
                          type="button"
                          onClick={handleDeactivateAccount}
                          className="w-full rounded-xl border border-red-300 text-red-600 hover:bg-red-50 py-3 text-[10px] font-bold flex items-center justify-center gap-2 transition"
                        >
                          <XCircle size={13} />
                          Deactivate Account
                        </button>
                      </section>
                    </div>
                  )}

                  {/* ================= TRUST TIER ================= */}
                  {profilePanelTab === "trust" && (
                    <div className="px-3 pb-8 pt-3 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          {
                            label: "Total Bids",
                            value: dashboardStats?.pendingBids || profileData?.active_bids || 0,
                          },
                          {
                            label: "Items Bought",
                            value: userTrustStats.completedTransactions,
                          },
                          {
                            label: "Purchase Rating",
                            value: userTrustStats.purchaseTransactionReviews > 0
                              ? Number(userTrustStats.purchaseTransactionRating || 0).toFixed(1)
                              : "—",
                            suffix: userTrustStats.purchaseTransactionReviews > 0 ? "★" : "",
                          },
                          {
                            label: "Repair Service Rating",
                            value: userTrustStats.repairServiceReviews > 0
                              ? Number(userTrustStats.repairServiceRating || 0).toFixed(1)
                              : "—",
                            suffix: userTrustStats.repairServiceReviews > 0 ? "★" : "",
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="rounded-xl bg-slate-50 border border-slate-100 px-1.5 py-2 text-center"
                          >
                            <p className="text-[11px] font-black text-slate-800">
                              {stat.value}{stat.suffix ? ` ${stat.suffix}` : ""}
                            </p>
                            <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">
                              {stat.label}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Purchase Transaction Reviews
                          </p>
                          <p className="mt-0.5 text-sm font-black text-slate-700">
                            {userTrustStats.purchaseTransactionReviews}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Repair Service Reviews
                          </p>
                          <p className="mt-0.5 text-sm font-black text-slate-700">
                            {userTrustStats.repairServiceReviews}
                          </p>
                        </div>
                      </div>

                      {userTrustStats.purchaseTransactionReviews === 0 &&
                        userTrustStats.repairServiceReviews === 0 && (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-center text-[9px] font-medium text-slate-400">
                            No ratings available
                          </p>
                        )}

                      <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">
                              Current Tier
                            </p>
                            <p className="text-base font-black text-amber-500 mt-0.5">
                              {trustTierLoading
                                ? "Loading..."
                                : currentTrustTier?.name || "NEWCOMER"}
                            </p>
                          </div>

                          <div className="text-right text-[9px] text-slate-400">
                            <p>
                              {userTrustStats.completedTransactions} transactions
                            </p>
                            {nextTrustTier ? (
                              <p>
                                {Math.max(
                                  0,
                                  Number(nextTrustTier.min_transactions || 0) -
                                    userTrustStats.completedTransactions,
                                )}{" "}
                                more to {nextTrustTier.name}
                              </p>
                            ) : (
                              <p>Maximum tier reached</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-all"
                              style={{ width: `${trustTierProgress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[8px] text-slate-400">
                            <span>{currentTrustTier?.name || "Current"}</span>
                            <span>{nextTrustTier?.name || "Maximum"}</span>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-100 p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                              <Leaf size={16} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-[#145374]">
                                CO₂ Recovery Contribution
                              </p>
                              <p className="text-[8px] text-[#3b91ad]">
                                From harvesting & processing e-waste
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-lg font-black text-[#145374]">
                              {Number(profileData?.co2_recovered_kg || 0).toFixed(2)}
                              <span className="text-[9px] ml-0.5">kg</span>
                            </p>
                            <p className="text-[8px] text-[#3b91ad]">CO₂e recovered</p>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-emerald-100 pt-3 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                            <Package size={13} />
                          </div>
                          <p className="text-[9px] text-[#145374]">
                            <span className="font-black">
                              {profileData?.recovered_devices || 0} devices
                            </span>{" "}
                            recovered & processed
                          </p>
                        </div>
                      </section>

                      <section>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">
                          Current Privileges
                        </p>

                        <div className="space-y-1">
                          {(currentTrustTier?.privileges || []).map((privilege, index) => (
                            <div
                              key={`${privilege}-${index}`}
                              className="flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5"
                            >
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                              <span className="text-[9px] font-medium text-emerald-700">
                                {privilege}
                              </span>
                            </div>
                          ))}

                          {!currentTrustTier?.privileges?.length && (
                            <p className="text-[10px] text-slate-400 rounded-lg bg-slate-50 p-3">
                              No privileges are configured for this tier yet.
                            </p>
                          )}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </aside>
            </div>

);

const MyBidsView = ({ bids, onContactSeller }) => {
  const stats = {
    pending: bids.filter((b) => b.status === "pending").length,
    accepted: bids.filter((b) => b.status === "accepted").length,
    total: bids.length,
  };
  if (bids.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-100 rounded-[40px] p-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-lime-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
          <Gavel size={32} className="text-[#769c2d] opacity-50" />
        </div>
        <h3 className="text-lg font-black text-slate-800">
          No Bids Placed Yet
        </h3>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-[240px] mx-auto leading-relaxed">
          Browse the marketplace and start bidding on e-waste parts to see them
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mini Stats Bar matching image_f1901c.png */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          Track Your Bids
        </h2>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
          Manage your active offers and pending approvals
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl">
              <Clock size={20} />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Pending Bids
            </span>
          </div>
          <span className="text-2xl font-black text-slate-700">
            {stats.pending}
          </span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Accepted Bids
            </span>
          </div>
          <span className="text-2xl font-black text-slate-700">
            {stats.accepted}
          </span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
              <ArrowLeftRight size={20} />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Total Bids
            </span>
          </div>
          <span className="text-2xl font-black text-slate-700">
            {stats.total}
          </span>
        </div>
      </div>

      {/* Bids List */}
      <div className="space-y-6">
        {bids.map((bid) => (
          <div
            key={bid.id}
            className={`group bg-white rounded-[2.5rem] border-2 p-8 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 ${bid.status === "accepted"
              ? "border-emerald-100"
              : bid.status === "countered"
                ? "border-blue-100"
                : "border-orange-50"
              }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-black text-xl text-slate-800">
                    {bid.listings?.device_model}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${bid.status === "accepted"
                      ? "bg-emerald-100 text-emerald-600"
                      : bid.status === "countered"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-orange-100 text-orange-600"
                      }`}
                  >
                    {bid.status || "Pending"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  Seller: {bid.listings?.profiles?.full_name} • Barangay{" "}
                  {bid.listings?.profiles?.barangay || "Unknown"}
                </p>
              </div>
              <div
                className={
                  bid.status === "accepted"
                    ? "text-emerald-500"
                    : "text-orange-400"
                }
              >
                {bid.status === "accepted" ? (
                  <CheckCircle2 size={28} />
                ) : (
                  <Clock size={28} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-[2rem] mb-6 border border-slate-100/50">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase mb-1 tracking-widest">
                  Your Bid
                </p>
                <p className="text-2xl font-black text-[#769c2d]">
                  ₱{bid.amount.toLocaleString()}
                </p>
              </div>
              <div className="border-l border-slate-100 pl-6">
                <p className="text-xs font-black text-slate-400 uppercase mb-1 tracking-widest">
                  Asking Price
                </p>
                <p className="text-2xl font-black text-slate-400">
                  ₱{bid.listings?.asking_price?.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Seller Message/Note box from image_f1901c.png */}
            {bid.message && (
              <div className="mb-6 p-4 bg-white border border-slate-100 rounded-2xl flex items-start gap-3">
                <MessageSquare size={14} className="text-slate-300 mt-1" />
                <p className="text-xs text-slate-500 font-medium">
                  {bid.message}
                </p>
              </div>
            )}

            {/* Counter Offer Logic */}
            {bid.status === "countered" && (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-[1.5rem] mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">
                    Seller's Counter Offer
                  </p>
                  <p className="text-xl font-black text-blue-700">
                    ₱{bid.counter_amount?.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="px-8 py-3 bg-[#769c2d] text-white text-xs font-black rounded-2xl uppercase tracking-widest hover:scale-105 transition-transform">
                    Accept
                  </button>
                  <button className="px-8 py-3 bg-white border border-blue-100 text-blue-400 text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-blue-50 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-widest">
                <Calendar size={12} />
                Submitted {new Date(bid.created_at).toLocaleDateString()}
              </div>

              {bid.status === "accepted" ? (
                <button
                  type="button"
                  onClick={() => onContactSeller?.(bid)}
                  className="px-6 py-2.5 bg-[#769c2d] text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-lime-100 flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  <MessageSquare size={12} /> Contact Seller
                </button>
              ) : (
                <button className="px-6 py-2.5 bg-white border border-slate-100 text-slate-400 text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-slate-50 transition-colors">
                  View Listing
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AlertsView = ({ notifications }) => {
  return (
    <div className="space-y-4">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`p-6 rounded-[2rem] border transition-all flex items-center gap-6 ${!n.is_read
            ? n.type === "alert_match"
              ? "bg-amber-50/50 border-amber-100" // Distinct color for matches
              : "bg-lime-50/50 border-lime-100"
            : "bg-slate-50/30 border-slate-50"
            }`}
        >
          {/* Dynamic Icon based on type */}
          <div
            className={`w-8 h-8 rounded-2xl flex items-center justify-center ${n.type === "alert_match"
              ? "bg-amber-100 text-amber-600"
              : "bg-lime-100 text-[#769c2d]"
              }`}
          >
            {n.type === "alert_match" ? (
              <Search size={14} />
            ) : (
              <Package size={14} />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 text-sm">{n.title}</h4>
              {n.type === "alert_match" && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">
                  Match
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {n.description ||
                n.content ||
                "New e-waste listing matches your criteria."}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-slate-300 uppercase">
              {new Date(n.created_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// REQ-3: notify the recipient of a new in-app message. A failure here must
// not undo a message that was already sent.
const notifyNewMessage = async ({
  receiverId,
  listingId = null,
  senderLabel = "A user",
}) => {
  if (!receiverId) return;

  const { error } = await supabase.from("notifications").insert([
    {
      user_id: receiverId,
      type: "message",
      title: "New Message",
      content: `${senderLabel} sent you a new message.`,
      related_listing_id: listingId || null,
      is_read: false,
      description: "You received a new in-app message.",
    },
  ]);

  if (error) {
    console.warn("Message notification could not be created:", error.message);
  }
};

// --- MESSAGES VIEW COMPONENT ---

const MessagesView = ({
  session,
  initialChat = null,
  onInitialChatConsumed,
}) => {
  const userId = session?.user?.id;

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sendMessageError, setSendMessageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);

  // REQ-2: Pending Verification accounts are view-only (read, no reply).
  const [senderProfile, setSenderProfile] = useState(null);
  const [senderProfileLoaded, setSenderProfileLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSenderProfile = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, verification_status, status")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading sender profile:", error.message);
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

  const canSendMessages =
    senderProfileLoaded &&
    !isSenderRestricted &&
    (["admin", "administrator"].includes(senderRole) ||
      ["verified", "approved"].includes(senderVerification));

  const isViewOnly = senderProfileLoaded && !canSendMessages;

  const normalizeAppointmentStatus = (status) =>
    String(status || "pending").trim().toLowerCase();

  // Load every message where this repair shop is either sender OR receiver.
  // We intentionally use two simple queries instead of a PostgREST OR expression.
  const loadConversations = async () => {
    if (!userId) return;

    setLoading(true);
    setLoadError("");

    try {
      const [receivedResult, sentResult, appointmentResult] = await Promise.all([
        supabase
          .from("messages")
          .select("id,sender_id,receiver_id,listing_id,content,created_at,is_read")
          .eq("receiver_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("messages")
          .select("id,sender_id,receiver_id,listing_id,content,created_at,is_read")
          .eq("sender_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("repair_appointments")
          .select(
            "id,harvester_id,repair_shop_id,device_model,category,issue_description,preferred_date,preferred_time,notes,status,created_at,updated_at"
          )
          .eq("repair_shop_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (receivedResult.error) throw receivedResult.error;
      if (sentResult.error) throw sentResult.error;
      if (appointmentResult.error) throw appointmentResult.error;

      const msgs = [...(receivedResult.data || []), ...(sentResult.data || [])];
      const apps = appointmentResult.data || [];

      // Remove duplicates in case a message ever appears in both result sets.
      const uniqueMessages = Array.from(
        new Map(msgs.map((message) => [message.id, message])).values()
      );

      const otherIds = new Set();

      uniqueMessages.forEach((message) => {
        const otherId =
          message.sender_id === userId
            ? message.receiver_id
            : message.sender_id;

        if (otherId) otherIds.add(otherId);
      });

      apps.forEach((appointment) => {
        if (appointment.harvester_id) {
          otherIds.add(appointment.harvester_id);
        }
      });

      let profileMap = {};

      if (otherIds.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id,full_name,business_name,role,average_rating,total_reviews")
          .in("id", [...otherIds]);

        if (profileError) {
          console.error("REPAIR SHOP PROFILE ERROR:", profileError);
        } else {
          profileMap = Object.fromEntries(
            (profiles || []).map((profile) => [profile.id, profile])
          );
        }
      }

      const conversationMap = new Map();

      const addConversation = (
        otherId,
        lastMessage,
        lastAt,
        hasAppointment = false
      ) => {
        if (!otherId) return;

        const existing = conversationMap.get(otherId);

        if (!existing) {
          conversationMap.set(otherId, {
            id: `harvester-${otherId}`,
            other_party_id: otherId,
            profile: profileMap[otherId],
            last_message: lastMessage,
            last_at: lastAt,
            has_appointment: hasAppointment,
          });
          return;
        }

        if (hasAppointment) {
          existing.has_appointment = true;
        }

        if (
          lastAt &&
          (!existing.last_at ||
            new Date(lastAt).getTime() > new Date(existing.last_at).getTime())
        ) {
          existing.last_message = lastMessage;
          existing.last_at = lastAt;
        }
      };

      uniqueMessages.forEach((message) => {
        const otherId =
          message.sender_id === userId
            ? message.receiver_id
            : message.sender_id;

        addConversation(
          otherId,
          message.content || "Message",
          message.created_at,
          false
        );
      });

      apps.forEach((appointment) => {
        addConversation(
          appointment.harvester_id,
          "Repair appointment request",
          appointment.created_at,
          true
        );
      });

      setConversations(
        [...conversationMap.values()].sort(
          (a, b) =>
            new Date(b.last_at || 0).getTime() -
            new Date(a.last_at || 0).getTime()
        )
      );
    } catch (error) {
      console.error("REPAIR SHOP MESSAGE LOAD ERROR:", error);
      setLoadError(error?.message || "Unable to load messages.");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [userId]);

  // Auto-open the chat requested by another tab (e.g. "Contact Seller" from
  // My Bids). Waits for conversations to load so the entry exists, otherwise
  // synthesizes a placeholder chat for the seller.
  useEffect(() => {
    if (!initialChat || !userId) return;

    if (selectedChat?.other_party_id === initialChat.other_party_id) {
      onInitialChatConsumed?.();
      return;
    }

    const existing = conversations.find(
      (c) => c.other_party_id === initialChat.other_party_id
    );

    if (existing) {
      setSelectedChat(existing);
    } else if (!loading) {
      setSelectedChat({
        id: `contact-${initialChat.other_party_id}`,
        other_party_id: initialChat.other_party_id,
        profile: { full_name: initialChat.name || "Seller" },
        last_message: "No messages yet",
        last_at: null,
      });
    } else {
      return; // conversations still loading, retry on next render
    }

    onInitialChatConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChat, conversations, loading, userId]);

  // Load the selected Harvester's messages and repair appointments.
  useEffect(() => {
    if (!selectedChat || !userId) return;

    const otherId = selectedChat.other_party_id;
    let alive = true;

    const loadChat = async () => {
      setLoadError("");

      try {
        const [receivedResult, sentResult, appointmentResult] =
          await Promise.all([
            supabase
              .from("messages")
              .select("*")
              .eq("receiver_id", userId)
              .eq("sender_id", otherId)
              .order("created_at", { ascending: true }),

            supabase
              .from("messages")
              .select("*")
              .eq("receiver_id", otherId)
              .eq("sender_id", userId)
              .order("created_at", { ascending: true }),

            supabase
              .from("repair_appointments")
              .select(
                "id,harvester_id,repair_shop_id,device_model,category,issue_description,preferred_date,preferred_time,notes,status,created_at,updated_at"
              )
              .eq("harvester_id", otherId)
              .eq("repair_shop_id", userId)
              .order("created_at", { ascending: true }),
          ]);

        if (receivedResult.error) throw receivedResult.error;
        if (sentResult.error) throw sentResult.error;
        if (appointmentResult.error) throw appointmentResult.error;

        const chatMessages = [
          ...(receivedResult.data || []),
          ...(sentResult.data || []),
        ];

        const uniqueChatMessages = Array.from(
          new Map(chatMessages.map((message) => [message.id, message])).values()
        ).sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
        );

        if (alive) {
          setMessages(uniqueChatMessages);
          setAppointments(appointmentResult.data || []);
        }
      } catch (error) {
        console.error("REPAIR SHOP CHAT LOAD ERROR:", error);
        if (alive) {
          setMessages([]);
          setAppointments([]);
          setLoadError(error?.message || "Unable to load this conversation.");
        }
      }
    };

    loadChat();

    const channel = supabase
      .channel(`repair-shop-chat-${userId}-${otherId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new;

          const belongsToChat =
            (message.sender_id === userId &&
              message.receiver_id === otherId) ||
            (message.sender_id === otherId &&
              message.receiver_id === userId);

          if (!belongsToChat) return;

          setMessages((previous) =>
            previous.some((item) => item.id === message.id)
              ? previous
              : [...previous, message]
          );

          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "repair_appointments" },
        (payload) => {
          const appointment = payload.new;

          if (
            appointment.harvester_id !== otherId ||
            appointment.repair_shop_id !== userId
          ) {
            return;
          }

          setAppointments((previous) =>
            previous.some((item) => item.id === appointment.id)
              ? previous
              : [...previous, appointment]
          );

          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "repair_appointments" },
        (payload) => {
          const appointment = payload.new;

          if (
            appointment.harvester_id !== otherId ||
            appointment.repair_shop_id !== userId
          ) {
            return;
          }

          setAppointments((previous) =>
            previous.map((item) =>
              item.id === appointment.id ? appointment : item
            )
          );

          loadConversations();
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [selectedChat, userId]);

  const updateAppointment = async (id, nextStatus) => {
    if (!userId || !id || !nextStatus) return;

    if (updatingAppointmentId === id) return;

    setUpdatingAppointmentId(id);

    try {
      // Always verify that this appointment belongs to the currently logged-in
      // repair shop before changing anything.
      const { data: appointment, error: appointmentFetchError } =
        await supabase
          .from("repair_appointments")
          .select("*")
          .eq("id", id)
          .eq("repair_shop_id", userId)
          .single();

      if (appointmentFetchError) throw appointmentFetchError;
      if (!appointment) throw new Error("Repair appointment was not found.");

      const currentStatus = normalizeAppointmentStatus(appointment.status);
      const targetStatus = normalizeAppointmentStatus(nextStatus);

      // Prevent accidental/repeated transitions.
      const allowedTransitions = {
        pending: ["accepted", "declined"],
        requested: ["accepted", "declined"],
        accepted: ["confirmed", "declined"],
        confirmed: ["completed", "cancelled"],
        declined: [],
        cancelled: [],
        completed: [],
      };

      if (
        currentStatus !== targetStatus &&
        !allowedTransitions[currentStatus]?.includes(targetStatus)
      ) {
        throw new Error(
          `This appointment cannot be changed from ${currentStatus || "pending"} to ${targetStatus}.`
        );
      }

      // ---------------------------------------------------------
      // CONFIRM APPOINTMENT
      // Create a transaction for the repair service only once.
      // Repair service has no fee, so amount = 0.
      // ---------------------------------------------------------
      if (targetStatus === "confirmed") {
        const { data: customerProfile, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, full_name, barangay")
            .eq("id", appointment.harvester_id)
            .single();

        if (profileError) throw profileError;

        const { data: existingTransaction, error: existingError } =
          await supabase
            .from("transactions")
            .select("id")
            .eq("repair_appointment_id", appointment.id)
            .maybeSingle();

        if (existingError) throw existingError;

        if (!existingTransaction) {
          const { data: newTransaction, error: transactionError } =
            await supabase
              .from("transactions")
              .insert({
                seller_id: appointment.harvester_id,
                harvester_id: appointment.repair_shop_id,
                amount: 0,
                barangay: customerProfile?.barangay || "N/A",
                status: "meetup_scheduled",
                meetup_date: appointment.preferred_date,
                meetup_time: appointment.preferred_time
                  ? String(appointment.preferred_time).slice(0, 5)
                  : null,
                notes: [
                  "Repair Service",
                  `Device: ${appointment.device_model || "N/A"}`,
                  `Category: ${appointment.category || "N/A"}`,
                  `Issue: ${appointment.issue_description || "N/A"}`,
                  appointment.notes
                    ? `Customer Notes: ${appointment.notes}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n"),
                listing_id: null,
                repair_appointment_id: appointment.id,
              })
              .select("*")
              .single();

          if (transactionError) throw transactionError;

          console.log("REPAIR TRANSACTION CREATED:", newTransaction);

          await recordTransactionStatusHistory({
            transactionId: newTransaction.id,
            oldStatus: null,
            newStatus: "meetup_scheduled",
            transaction: newTransaction,
            notes: "Repair appointment confirmed by the repair shop.",
          });
        }
      }

      // ---------------------------------------------------------
      // UPDATE APPOINTMENT STATUS
      // ---------------------------------------------------------
      const { data: updatedAppointment, error: updateError } =
        await supabase
          .from("repair_appointments")
          .update({
            status: targetStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("repair_shop_id", userId)
          .select("*")
          .single();

      if (updateError) throw updateError;

      setAppointments((previous) =>
        previous.map((item) =>
          item.id === id ? updatedAppointment : item
        )
      );

      // ---------------------------------------------------------
      // IF MARKED COMPLETED
      // Also complete the corresponding repair transaction.
      // ---------------------------------------------------------
      if (targetStatus === "completed") {
        const { data: completedTransactions, error: transactionError } =
          await supabase
            .from("transactions")
            .update({
              status: "completed",
              updated_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .eq("repair_appointment_id", id)
            .select("*");

        if (transactionError) {
          console.error(
            "REPAIR TRANSACTION COMPLETION ERROR:",
            transactionError
          );
        } else {
          console.log(
            "REPAIR TRANSACTION COMPLETED:",
            completedTransactions
          );

          for (const completedTx of completedTransactions || []) {
            await recordTransactionStatusHistory({
              transactionId: completedTx.id,
              oldStatus: "meetup_scheduled",
              newStatus: "completed",
              transaction: completedTx,
              notes: "Repair service marked as completed by the repair shop.",
            });
          }
        }
      }

      // Notify the harvester through the existing messages system.
      const readableStatus = targetStatus.replaceAll("_", " ");

      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          receiver_id: updatedAppointment.harvester_id,
          listing_id: null,
          content: `Repair appointment update\nStatus: ${readableStatus}`,
          is_read: false,
        });

      if (messageError) {
        // The appointment status was already changed successfully, so do not
        // roll it back just because the optional notification failed.
        console.error("REPAIR APPOINTMENT MESSAGE ERROR:", messageError);
      }

      await loadConversations();

      // Keep the currently selected chat visible and refresh its appointments.
      if (selectedChat?.other_party_id === updatedAppointment.harvester_id) {
        const { data: refreshedAppointments, error: refreshError } =
          await supabase
            .from("repair_appointments")
            .select(
              "id,harvester_id,repair_shop_id,device_model,category,issue_description,preferred_date,preferred_time,notes,status,created_at,updated_at"
            )
            .eq("harvester_id", updatedAppointment.harvester_id)
            .eq("repair_shop_id", userId)
            .order("created_at", { ascending: true });

        if (!refreshError) {
          setAppointments(refreshedAppointments || []);
        }
      }
    } catch (error) {
      console.error("UPDATE APPOINTMENT ERROR:", error);
      alert(error?.message || "Unable to update appointment.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const sendMessage = async () => {
    const content = messageText.trim();

    if (!userId || !selectedChat || !content) return;

    // REQ-2: Pending Verification accounts are view-only.
    if (!canSendMessages) {
      setSendMessageError(
        isSenderRestricted
          ? "Message blocked: Your account is not allowed to send messages."
          : "Pending Verification accounts are view-only and cannot send messages."
      );
      return;
    }

    // TC_MSG_03: block restricted content and surface the violation
    // warning instead of transmitting the message.
    const contentViolation = containsRestrictedContent(content);
    if (contentViolation.blocked) {
      setSendMessageError(contentViolation.message);
      return;
    }

    setSendMessageError("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          receiver_id: selectedChat.other_party_id,
          listing_id: null,
          content,
          is_read: false,
        })
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setMessages((previous) =>
          previous.some((item) => item.id === data.id)
            ? previous
            : [...previous, data]
        );
      }

      // REQ-3: notify the recipient of the new message.
      await notifyNewMessage({
        receiverId: selectedChat.other_party_id,
        senderLabel: "Repair Shop",
      });

      setMessageText("");
      await loadConversations();
    } catch (error) {
      console.error("SEND REPAIR SHOP MESSAGE ERROR:", error);
      alert(error?.message || "Unable to send message.");
    }
  };

  const filtered = conversations.filter((conversation) => {
    const name =
      conversation.profile?.full_name ||
      conversation.profile?.business_name ||
      "Unknown Harvester";

    return name.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="flex-1">
        <div className="grid grid-cols-12 gap-8 bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden min-h-[600px]">
          <div className="col-span-4 border-r border-slate-50 p-6 overflow-y-auto">
            <h2 className="text-xl font-black text-slate-800 mb-4">
              Messages
            </h2>

            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search harvesters..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs outline-none mb-4"
            />

            {loadError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
                <b>Message loading error:</b>
                <div className="mt-1 break-words">{loadError}</div>
              </div>
            )}

            {loading ? (
              <p className="text-xs text-slate-400 p-4">
                Loading conversations...
              </p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare
                  size={32}
                  className="mx-auto mb-3 opacity-40"
                />
                <p className="text-xs font-semibold">No messages yet</p>
                <p className="text-xs mt-1">
                  Harvester messages and repair requests will appear here.
                </p>
              </div>
            ) : (
              filtered.map((chat) => {
                const name =
                  chat.profile?.full_name ||
                  chat.profile?.business_name ||
                  "Unknown Harvester";

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-slate-100 cursor-pointer rounded-2xl ${
                      selectedChat?.id === chat.id
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 text-sm truncate">
                          {name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {chat.last_message}
                        </p>

                        {chat.has_appointment && (
                          <span className="inline-block mt-2 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                            Repair appointment
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 shrink-0">
                        {chat.last_at
                          ? new Date(chat.last_at).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="col-span-8 flex flex-col bg-slate-50/30">
            {selectedChat ? (
              <>
                <div className="p-6 bg-white border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedChat.profile?.full_name ||
                      selectedChat.profile?.business_name ||
                      "Harvester"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Tech Harvester
                  </p>
                </div>

                <div className="flex-1 p-8 overflow-y-auto space-y-5">
                  {appointments.map((appointment) => (
                    <div
                      key={`appointment-${appointment.id}`}
                      className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                            Repair Appointment Request
                          </p>
                          <h3 className="text-base font-bold text-slate-800 mt-1">
                            {appointment.device_model || "Device"}
                          </h3>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase h-fit">
                          {normalizeAppointmentStatus(appointment.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-slate-600">
                        <p>
                          <b>Category:</b> {appointment.category || "—"}
                        </p>
                        <p>
                          <b>Date:</b> {appointment.preferred_date || "—"}
                        </p>
                        <p>
                          <b>Time:</b> {appointment.preferred_time || "—"}
                        </p>
                        <p>
                          <b>Issue:</b> {appointment.issue_description || "—"}
                        </p>
                      </div>

                      {appointment.notes && (
                        <p className="text-xs text-slate-500 mt-3">
                          <b>Notes:</b> {appointment.notes}
                        </p>
                      )}

                      {(() => {
                        const status = normalizeAppointmentStatus(
                          appointment.status
                        );
                        const isUpdating = updatingAppointmentId === appointment.id;

                        return (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {(status === "pending" || status === "requested") && (
                              <>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    updateAppointment(appointment.id, "accepted")
                                  }
                                  className="px-4 py-2 rounded-xl bg-[#769c2d] text-white text-xs font-bold hover:bg-[#668827] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isUpdating ? "Updating..." : "Accept Request"}
                                </button>

                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    updateAppointment(appointment.id, "declined")
                                  }
                                  className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Decline
                                </button>
                              </>
                            )}

                            {status === "accepted" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  updateAppointment(appointment.id, "confirmed")
                                }
                                className="px-4 py-2 rounded-xl bg-[#769c2d] text-white text-xs font-bold hover:bg-[#668827] transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isUpdating ? "Confirming..." : "Confirm Appointment"}
                              </button>
                            )}

                            {status === "confirmed" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  updateAppointment(appointment.id, "completed")
                                }
                                className="px-4 py-2 rounded-xl bg-[#769c2d] text-white text-xs font-bold hover:bg-[#668827] transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isUpdating ? "Completing..." : "Mark Completed"}
                              </button>
                            )}

                            {status === "declined" && (
                              <span className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase">
                                Request Declined
                              </span>
                            )}

                            {status === "cancelled" && (
                              <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold uppercase">
                                Appointment Cancelled
                              </span>
                            )}

                            {status === "completed" && (
                              <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
                                Appointment Completed
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === userId
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`px-5 py-3 rounded-2xl max-w-[70%] text-sm shadow-sm whitespace-pre-line ${
                          message.sender_id === userId
                            ? "bg-[#769c2d] text-white rounded-br-md"
                            : "bg-white text-slate-600 rounded-bl-md border border-slate-100"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {messages.length === 0 && appointments.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-10">
                      No messages in this conversation.
                    </p>
                  )}
                </div>

                <div className="p-6 bg-white border-t border-slate-50">
                  {isViewOnly && (
                    <div className="mb-2 flex items-center gap-2 text-amber-600 text-xs font-bold">
                      <Shield size={14} />
                      {isSenderRestricted
                        ? "Your account is not allowed to send messages."
                        : "Your account is pending verification. You can read messages but cannot reply until you are verified."}
                    </div>
                  )}
                  {sendMessageError && (
                    <div className="mb-2 flex items-center gap-2 text-red-500 text-xs font-bold">
                      <Shield size={14} />
                      {sendMessageError}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <input
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        if (sendMessageError) setSendMessageError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage();
                      }}
                      disabled={!canSendMessages}
                      placeholder={
                        isViewOnly
                          ? "View-only: replies are disabled"
                          : "Type a message..."
                      }
                      className="flex-1 bg-slate-50 rounded-2xl py-4 px-6 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      onClick={sendMessage}
                      disabled={!canSendMessages}
                      className="bg-[#769c2d] text-white p-4 rounded-2xl disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
                <MessageSquare size={40} />
                <p className="text-xs font-bold uppercase">
                  Select a Harvester to view messages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, isPrice }) => (
  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center min-h-[140px]">
    <span
      className={`text-3xl font-black text-slate-800 tracking-tighter ${isPrice ? "text-slate-900" : ""}`}
    >
      {isPrice ? `₱${value}` : value}
    </span>
    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">
      {label}
    </span>
  </div>
);

const NavBtn = ({ active, onClick, icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 sm:flex-none min-w-[150px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs transition-all ${active
      ? "bg-[#527a24] text-white shadow-md"
      : "bg-white text-slate-500 hover:bg-lime-50 hover:text-[#527a24] border border-slate-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {icon}
    {label}
  </button>
);

const MenuLink = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors text-xs font-bold"
  >
    <span className="text-slate-400">{icon}</span> {label}
  </button>
);

const AchievementsModal = ({
  profileData,
  verificationStatus,
  currentTrustTier,
  onClose,
}) => {
  const recovered = Number(profileData?.recovered_devices || profileData?.completed_pickups || 0);
  const co2 = Number(profileData?.co2_recovered_kg || 0);
  const reviews = Number(profileData?.total_reviews || 0);
  const rating = Number(profileData?.average_rating || 0);

  const achievements = [
    {
      title: "Verified Partner",
      description: "Complete account verification and become a verified Wasteless partner.",
      icon: <Shield size={22} />,
      unlocked: verificationStatus === "verified",
      progress: verificationStatus === "verified" ? 1 : 0,
      target: 1,
      progressLabel: verificationStatus === "verified" ? "Verified" : "Verification required",
    },
    {
      title: "First Recovery",
      description: "Complete your first e-waste recovery transaction.",
      icon: <Package size={22} />,
      unlocked: recovered >= 1,
      progress: Math.min(recovered, 1),
      target: 1,
      progressLabel: `${Math.min(recovered, 1)}/1 recovery`,
    },
    {
      title: "Eco Harvester",
      description: "Recover at least 5 electronic devices through completed transactions.",
      icon: <Leaf size={22} />,
      unlocked: recovered >= 5,
      progress: Math.min(recovered, 5),
      target: 5,
      progressLabel: `${Math.min(recovered, 5)}/5 devices`,
    },
    {
      title: "Carbon Saver",
      description: "Contribute at least 5 kg of estimated CO₂e recovery.",
      icon: <Gift size={22} />,
      unlocked: co2 >= 5,
      progress: Math.min(co2, 5),
      target: 5,
      progressLabel: `${co2.toFixed(2)}/5.00 kg CO₂e`,
    },
    {
      title: "Community Trusted",
      description: "Receive at least 5 completed reviews from the Wasteless community.",
      icon: <MessageSquareText size={22} />,
      unlocked: reviews >= 5,
      progress: Math.min(reviews, 5),
      target: 5,
      progressLabel: `${Math.min(reviews, 5)}/5 reviews`,
    },
    {
      title: "Highly Rated",
      description: "Maintain a rating of at least 4.5 with at least 5 reviews.",
      icon: <Star size={22} />,
      unlocked: rating >= 4.5 && reviews >= 5,
      progress: reviews >= 5 ? Math.min(rating, 4.5) : Math.min((reviews / 5) * 4.5, 4.5),
      target: 4.5,
      progressLabel: reviews < 5 ? `${reviews}/5 reviews` : `${rating.toFixed(1)}/4.5 rating`,
    },
    {
      title: "Trust Tier Partner",
      description: "Progress beyond the NEWCOMER trust tier through completed transactions and ratings.",
      icon: <Trophy size={22} />,
      unlocked: Boolean(currentTrustTier?.name && currentTrustTier.name !== "NEWCOMER"),
      progress: currentTrustTier?.name && currentTrustTier.name !== "NEWCOMER" ? 1 : 0,
      target: 1,
      progressLabel: currentTrustTier?.name || "NEWCOMER",
    },
  ];

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#4a7c59] via-[#5f8f45] to-[#769c2d] px-6 py-7 text-white">
          <Trophy className="absolute -right-2 -bottom-6 opacity-10" size={130} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close achievements"
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:bg-white/15 hover:text-white transition"
          >
            <XCircle size={21} />
          </button>

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-sm">
              <Trophy size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                Wasteless Achievements
              </p>
              <h2 className="text-2xl font-black mt-1">Your Achievements</h2>
              <p className="text-xs text-white/80 mt-1">
                {unlockedCount} of {achievements.length} achievements unlocked
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 overflow-y-auto bg-slate-50/70">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((achievement) => {
              const percent = Math.max(0, Math.min(100, (achievement.progress / achievement.target) * 100));

              return (
                <div
                  key={achievement.title}
                  className={`rounded-2xl border p-4 transition-all ${
                    achievement.unlocked
                      ? "bg-white border-emerald-100 shadow-sm"
                      : "bg-slate-100/80 border-slate-200 opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        achievement.unlocked
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {achievement.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-black text-slate-800">{achievement.title}</h3>
                        {achievement.unlocked ? (
                          <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
                        ) : (
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Locked</span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-slate-500 mt-1">
                        {achievement.description}
                      </p>

                      <div className="mt-3">
                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              achievement.unlocked ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs font-bold text-slate-400">
                            {achievement.progressLabel}
                          </span>
                          {achievement.unlocked && (
                            <span className="text-xs font-black uppercase text-emerald-600">Unlocked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lime-50 text-[#769c2d] flex items-center justify-center shrink-0">
              <Award size={18} />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Keep completing transactions, recovering devices, building community trust, and maintaining your rating to unlock more achievements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ListingCard = ({ item, onBid, onSellerClick, isVerified }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Always render the canonical condition value used by the dashboard.
  const normalizedCondition =
    normalizeListingCondition(item?.condition) || "Condition unavailable";

  const getConditionStyles = (condition) => {
    if (condition === "Not Working") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (condition === "Working") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const listingMedia = Array.isArray(item.images)
    ? item.images
    : item.images
      ? [item.images]
      : [];

  const currentMedia = listingMedia[activeIndex] || null;

  const isVideoFile = (url) => {
    if (!url || typeof url !== "string") {
      return false;
    }

    return (
      url.includes(".mp4") ||
      url.includes(".mov") ||
      url.includes(".webm") ||
      url.includes(".m4v") ||
      url.includes("video")
    );
  };

  const nextMedia = (e) => {
    e.stopPropagation();

    if (listingMedia.length <= 1) return;

    setActiveIndex((prev) => (prev === listingMedia.length - 1 ? 0 : prev + 1));
  };

  const prevMedia = (e) => {
    e.stopPropagation();

    if (listingMedia.length <= 1) return;

    setActiveIndex((prev) => (prev === 0 ? listingMedia.length - 1 : prev - 1));
  };

  const highestBid = Number(item.highest_bid || 0);

  const askingPrice = Number(item.asking_price || 0);

  const bidCount = Number(item.bid_count || 0);

  const competition =
    bidCount >= 5
      ? "High Competition"
      : bidCount >= 2
        ? "Moderate Competition"
        : "No Competition";

  const competitionStyle =
    bidCount >= 5
      ? "bg-red-50 text-red-500"
      : bidCount >= 2
        ? "bg-orange-50 text-orange-500"
        : "bg-emerald-50 text-emerald-500";

  const sellerName = item.seller_name || item.profiles?.full_name || "Seller";

  const sellerBarangay =
    item.seller_barangay || item.profiles?.barangay || "Valenzuela";

  const postedDate = item.created_at
    ? new Date(item.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "Recently";

  const sellerRating = Number(
    item.seller_rating || item.profiles?.average_rating || 0,
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200">
      {/* =====================================================
          IMAGE
      ===================================================== */}
      <div
        className="relative h-[250px] bg-slate-100 overflow-hidden cursor-pointer group"
        onClick={onBid}
      >
        {currentMedia ? (
          isVideoFile(currentMedia) ? (
            <video
              src={currentMedia}
              className="w-full h-full object-cover"
              muted
              controls
            />
          ) : (
            <img
              src={currentMedia}
              alt={item.device_model || "E-waste listing"}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/700x500?text=No+Image";
              }}
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <Box size={38} />

            <p className="text-xs font-bold uppercase tracking-widest mt-2">
              No Image
            </p>
          </div>
        )}

        {/* CONDITION */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          <span
            aria-label={`Item condition: ${normalizedCondition}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold shadow-sm ${getConditionStyles(
              normalizedCondition,
            )}`}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
            {normalizedCondition}
          </span>

          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-slate-600 border border-white text-xs font-black uppercase shadow-sm">
            {normalizedCondition === "Working"
              ? "Buyer + Repair Shop"
              : "Repair Shop"}
          </span>
        </div>

        {/* IMAGE COUNT */}
        {listingMedia.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-bold">
            {activeIndex + 1}/{listingMedia.length}
          </div>
        )}

        {/* LEFT */}
        {listingMedia.length > 1 && (
          <button
            onClick={prevMedia}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 text-slate-500 shadow-sm hover:bg-white"
          >
            ←
          </button>
        )}

        {/* RIGHT */}
        {listingMedia.length > 1 && (
          <button
            onClick={nextMedia}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 text-slate-500 shadow-sm hover:bg-white"
          >
            →
          </button>
        )}

        {/* DOTS */}
        {listingMedia.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {listingMedia.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full ${activeIndex === index ? "bg-white" : "bg-white/50"
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}
      <div className="p-4">
        {/* DEVICE TITLE */}
        <div className="mb-2">
          <h3 className="text-sm font-black text-slate-800">
            {item.device_model || "Device Name"}
          </h3>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            {item.device_type || item.category || "E-waste Device"}
          </p>
        </div>

        {/* RATING */}
        {sellerRating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400 text-xs">★</span>

            <span className="text-xs font-bold text-slate-500">
              {sellerRating.toFixed(1)}
            </span>
          </div>
        )}

        {/* DESCRIPTION */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[30px]">
          {item.description || "No description provided for this listing."}
        </p>

        {/* LOCATION */}
        <div className="flex items-center gap-1.5 mt-3">
          <MapPin size={11} className="text-slate-400" />

          <span className="text-xs font-bold text-slate-400">
            Barangay {sellerBarangay}
          </span>
        </div>

        {/* =================================================
            PRICE BOX
        ================================================= */}
        <div className="mt-3 bg-[#f5f8ff] border border-blue-100 rounded-xl p-3">
          <div className="grid grid-cols-2 gap-3">
            {/* ASKING */}
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Asking Price
              </p>

              <p className="text-base font-black text-slate-800 mt-0.5">
                ₱{askingPrice.toLocaleString()}
              </p>
            </div>

            {/* HIGHEST BID */}
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Current Displayed Price
              </p>

              <p className="text-base font-black text-[#769c2d] mt-0.5">
                ₱{Number(item.current_displayed_price || item.asking_price || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="border-t border-blue-100 mt-2 pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Total Bids: <strong className="text-slate-600">{bidCount}</strong>
            </span>

            <span
              className={`px-2 py-1 rounded-full text-xs font-black ${competitionStyle}`}
            >
              {competition}
            </span>
          </div>
        </div>

        {/* =================================================
            SELLER
        ================================================= */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            {/* SELLER PROFILE */}
            <div
              className="min-w-0 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSellerClick?.();
              }}
            >
              <p className="text-xs text-slate-400 uppercase font-bold">
                Seller
              </p>

              <div className="flex items-center gap-1.5 mt-1">
                {/* Seller Avatar */}
                <div className="w-6 h-6 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-xs font-black shrink-0">
                  {sellerName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                {/* Seller Name */}
                <span className="text-xs font-bold text-slate-700 truncate max-w-[150px] group-hover:text-[#769c2d] transition-colors">
                  {sellerName}
                </span>
              </div>

              {/* Click hint */}
              <p className="text-xs text-slate-300 mt-1 group-hover:text-[#769c2d] transition-colors">
                Click to view profile
              </p>
            </div>

            {/* BID BUTTON */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBid();
              }}
              disabled={!isVerified}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-all ${isVerified
                ? "bg-[#769c2d] text-white hover:bg-[#658724]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
              <MessageSquare size={11} />

              {isVerified ? "Bid or Message" : "Locked"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaceBidModal = ({
  listing,
  onClose,
  onSubmit,
  onSendMessage,
  session,
}) => {
  const [activeTab, setActiveTab] = useState("bid");
  const [bidAmount, setBidAmount] = useState(() => {
    const asking = Number(listing.asking_price || 0);
    const lowestActiveBid = Number(listing.lowest_active_bid || 0);

    return lowestActiveBid > 0
      ? Math.max(1, lowestActiveBid - 1)
      : Math.max(1, asking - 1);
  });
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // ==============================
  // LISTING IMAGES
  // ==============================
  const listingImages = Array.isArray(listing.images)
    ? listing.images
    : listing.images
      ? [listing.images]
      : [];

  const askingPrice = Number(listing.asking_price || 0);
  const currentDisplayedPrice =
    Number(listing.current_displayed_price || 0) > 0
      ? Number(listing.current_displayed_price)
      : askingPrice;

  const listingStatus = String(listing.status || "active").trim().toLowerCase();
  const listingExpired = Boolean(
    listing.expires_at &&
    new Date(listing.expires_at).getTime() <= Date.now(),
  );
  const biddingLocked = listingStatus !== "active" || listingExpired;

  // ==============================
  // QUICK OFFER
  // ==============================
  // Every quick offer is strictly below the current displayed price.
  const quickOffers = [
    {
      label: "Just Below",
      percentage:
        currentDisplayedPrice > 0
          ? Math.round(((Math.max(1, currentDisplayedPrice - 1)) / currentDisplayedPrice) * 100)
          : 0,
      amount: Math.max(1, currentDisplayedPrice - 1),
    },
    {
      label: "90%",
      percentage: 90,
      amount: Math.max(1, Math.floor(currentDisplayedPrice * 0.9)),
    },
    {
      label: "80%",
      percentage: 80,
      amount: Math.max(1, Math.floor(currentDisplayedPrice * 0.8)),
    },
    {
      label: "70%",
      percentage: 70,
      amount: Math.max(1, Math.floor(currentDisplayedPrice * 0.7)),
    },
  ];

  const handleQuickOffer = (amount) => {
    setBidAmount(amount);
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleFormSubmit = async () => {
    if (activeTab === "bid") {
      const amount = Number(bidAmount);

      if (!amount || amount <= 0) {
        alert("Please enter a valid offer amount.");
        return;
      }

      if (biddingLocked) {
        alert(
          listingExpired
            ? "This listing has expired and is no longer accepting bids."
            : "This listing is locked and is no longer accepting bids.",
        );
        return;
      }

      if (amount >= currentDisplayedPrice) {
        alert(
          `Your bid must be lower than the current displayed price of ₱${currentDisplayedPrice.toLocaleString()}.`,
        );
        return;
      }
    }

    if (activeTab === "question" && !question.trim()) {
      alert("Please enter your question.");
      return;
    }

    setSubmitting(true);

    try {
      if (activeTab === "bid") {
        await onSubmit(
          listing.id,
          Number(bidAmount),
          message,
        );
      } else {
        await onSendMessage(
          listing.id,
          question,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sellerName =
    listing.profiles?.full_name ||
    listing.seller_name ||
    "Seller";

  const sellerInitials = sellerName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-3xl h-full sm:h-auto sm:max-h-[95vh] overflow-hidden rounded-none sm:rounded-[2rem] shadow-2xl flex flex-col">

        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="px-6 sm:px-8 pt-6 pb-5 flex items-start justify-between border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-medium text-slate-800">
              Contact Seller
            </h2>

            <p className="text-sm sm:text-base text-slate-500 mt-1">
              {listing.device_model || "E-Waste Item"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition"
          >
            <XCircle size={30} strokeWidth={1.8} />
          </button>
        </div>

        {/* =====================================================
            IMAGE
        ===================================================== */}
        {listingImages.length > 0 && (
          <div className="relative h-[230px] sm:h-[300px] bg-slate-100 overflow-hidden">

            <img
              src={listingImages[activeImage]}
              alt={listing.device_model || "Listing"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/900x600?text=No+Image";
              }}
            />

            {/* Image counter */}
            {listingImages.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/75 text-white px-4 py-2 rounded-full text-sm">
                {activeImage + 1} / {listingImages.length}
              </div>
            )}

            {/* Previous */}
            {listingImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveImage((prev) =>
                    prev === 0
                      ? listingImages.length - 1
                      : prev - 1,
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center text-slate-600"
              >
                ←
              </button>
            )}

            {/* Next */}
            {listingImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveImage((prev) =>
                    prev === listingImages.length - 1
                      ? 0
                      : prev + 1,
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center text-slate-600"
              >
                →
              </button>
            )}

            {/* Dots */}
            {listingImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {listingImages.map((_, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={`w-2.5 h-2.5 rounded-full transition ${activeImage === index
                      ? "bg-white"
                      : "bg-white/50"
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            TABS
        ===================================================== */}
        <div className="flex border-b border-slate-200 px-6 sm:px-8">

          <button
            type="button"
            onClick={() => setActiveTab("bid")}
            className={`flex items-center gap-2 py-4 px-2 mr-8 border-b-2 text-base sm:text-lg transition ${activeTab === "bid"
              ? "border-[#5d9f26] text-[#5d9f26]"
              : "border-transparent text-slate-500"
              }`}
          >
            <Gavel size={21} />
            Place Bid
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("question")}
            className={`flex items-center gap-2 py-4 px-2 border-b-2 text-base sm:text-lg transition ${activeTab === "question"
              ? "border-[#5d9f26] text-[#5d9f26]"
              : "border-transparent text-slate-500"
              }`}
          >
            <MessageSquare size={21} />
            Ask Question
          </button>

        </div>

        {/* =====================================================
            CONTENT
        ===================================================== */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">

          {/* ===================================================
              MAKE OFFER
          =================================================== */}
          {activeTab === "bid" && (
            <div className="space-y-7">

              {/* MAXIMUM PRICE */}
              <div className="border border-slate-200 rounded-2xl p-5 sm:p-6">

                <div className="flex justify-between items-start">

                  <div>
                    <p className="text-sm sm:text-base uppercase tracking-wide text-slate-400">
                      Maximum Price
                    </p>

                    <p className="text-3xl sm:text-4xl font-medium text-slate-800 mt-1">
                      ₱{askingPrice.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-2">
                      Seller maximum asking price
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs sm:text-sm uppercase tracking-wide text-slate-400">
                        Current Displayed Price
                      </p>
                      <p className="text-xl sm:text-2xl font-black text-[#5d9f26] mt-1">
                        ₱{currentDisplayedPrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Your bid must be strictly lower than this amount.
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm sm:text-base text-slate-400">
                      Seller
                    </p>

                    <div className="flex items-center justify-end gap-2 mt-1">

                      <div className="w-9 h-9 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-xs font-bold">
                        {sellerInitials}
                      </div>

                      <p className="text-sm sm:text-base text-slate-600">
                        {sellerName}
                      </p>

                    </div>
                  </div>

                </div>

                {/* INFO */}
                <div className="mt-5 bg-[#fffbea] border border-yellow-300 rounded-xl px-4 py-3">
                  <p className="text-sm sm:text-base text-[#a95d16]">
                    ↘ The seller's maximum asking price is always shown above.
                    Your bid must be strictly lower than the current displayed price.
                  </p>
                </div>

              </div>

              {/* YOUR OFFER */}
              <div>
                <h3 className="text-xl sm:text-2xl text-slate-700 mb-3">
                  Enter Amount
                </h3>

                <div className="relative">

                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    ₱
                  </span>

                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, currentDisplayedPrice - 1)}
                    value={bidAmount}
                    onChange={(e) =>
                      setBidAmount(e.target.value)
                    }
                    className="w-full border-2 border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-xl sm:text-2xl text-slate-800 focus:outline-none focus:border-[#5d9f26]"
                    placeholder="Enter offer"
                  />

                </div>

                {/* OFFER INDICATOR */}
                {Number(bidAmount) > 0 && askingPrice > 0 && (
                  <div className="inline-block mt-3 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm">
                    {Math.round(
                      (Number(bidAmount) / askingPrice) * 100,
                    )}
                    % of asking price
                    {" · "}
                    {Number(bidAmount) >= askingPrice * 0.8
                      ? "Good offer"
                      : "Low offer"}
                  </div>
                )}
              </div>

              {/* QUICK SELECT */}
              <div>

                <h3 className="text-lg sm:text-xl text-slate-600 mb-3">
                  Quick select:
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  {quickOffers.map((offer) => {
                    const selected =
                      Number(bidAmount) === offer.amount;

                    return (
                      <button
                        type="button"
                        key={offer.label}
                        onClick={() =>
                          handleQuickOffer(offer.amount)
                        }
                        className={`p-3 sm:p-4 rounded-2xl border-2 transition ${selected
                          ? "border-[#5d9f26] bg-[#f2f8ec]"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <p className="text-sm text-slate-500">
                          {offer.label}
                        </p>

                        <p className="text-base sm:text-lg font-medium text-slate-800 mt-1">
                          ₱{offer.amount.toLocaleString()}
                        </p>
                      </button>
                    );
                  })}

                </div>
              </div>

              {/* MESSAGE */}
              <div>

                <h3 className="text-lg sm:text-xl text-slate-600 mb-3">
                  Message to Seller{" "}
                  <span className="text-slate-400">
                    (Optional)
                  </span>
                </h3>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  placeholder="Write a message to the seller..."
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 min-h-[130px] resize-none text-sm sm:text-base focus:outline-none focus:border-[#5d9f26]"
                />

              </div>

            </div>
          )}

          {/* ===================================================
              ASK QUESTION
          =================================================== */}
          {activeTab === "question" && (
            <div className="space-y-6">

              <div>
                <h3 className="text-xl text-slate-700 mb-2">
                  Ask the Seller
                </h3>

                <p className="text-sm text-slate-500">
                  Ask about the item's condition, functionality,
                  availability, or pickup arrangements.
                </p>
              </div>

              <textarea
                value={question}
                onChange={(e) =>
                  setQuestion(e.target.value)
                }
                placeholder="Example: Is the battery still functional? Can you provide more photos?"
                className="w-full border-2 border-slate-200 rounded-2xl p-5 min-h-[220px] resize-none text-sm sm:text-base focus:outline-none focus:border-[#5d9f26]"
              />

              <div>
                <p className="text-sm font-semibold text-slate-500 mb-3">
                  Quick questions
                </p>

                <div className="space-y-2">

                  {[
                    "What specific parts are still functional?",
                    "Can you provide more photos?",
                    "Is pickup available today?",
                    "Has the data been fully sanitized?",
                  ].map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setQuestion(q)}
                      className="w-full text-left px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
                    >
                      {q}
                    </button>
                  ))}

                </div>
              </div>

            </div>
          )}

        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}
        <div className="border-t border-slate-100 px-6 sm:px-8 py-5 flex gap-3">

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-4 border-2 border-slate-200 rounded-2xl text-lg text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={submitting || (activeTab === "bid" && biddingLocked)}
            className="flex-1 py-4 bg-[#5d9f26] text-white rounded-2xl text-lg font-medium hover:bg-[#518b21] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Sending..."
              : activeTab === "bid" && biddingLocked
                ? listingExpired
                  ? "Bidding Expired"
                  : "Bidding Locked"
                : activeTab === "bid"
                  ? "Place Bid"
                  : "Send Question"}
          </button>

        </div>

      </div>
    </div>
  );
};

export default HarvesterDashboard;
// UI enhancement: stabilized dashboard layout and standardized profile visual styling.
