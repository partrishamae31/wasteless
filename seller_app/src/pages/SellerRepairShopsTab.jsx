import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  BadgeCheck,
  Building2,
  MapPin,
  MessageSquare,
  Search,
  Star,
  Wrench,
  X,
  Phone,
  Send,
  Package,
  ShoppingBag,
  User,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Calendar,
  Clock,
  ClipboardList,
  AlertCircle,
  Check,
  XCircle,
} from "lucide-react";

/* =========================================================
   BARANGAY COORDINATES
   ========================================================= */

const BARANGAY_COORDINATES = {
  Karuhatan: [14.7015, 120.9755],
  "Lawang Bato": [14.6925, 120.9885],
  Marulas: [14.6755, 120.9785],
  "Gen. T. de Leon": [14.6745, 120.9555],
  Malinta: [14.6915, 120.9765],
  "Paso de Blas": [14.7005, 120.9955],
  Maysan: [14.6865, 120.9855],
  Dalandanan: [14.6955, 120.9655],
  "Canumay East": [14.6855, 120.9485],
  "Canumay West": [14.6865, 120.9395],
  Lingunan: [14.6775, 120.9635],
  "Mapulang Lupa": [14.7015, 120.9555],
  Ugong: [14.6795, 120.9955],
  "Arkong Bato": [14.6745, 120.9865],
  Balangkas: [14.6655, 120.9705],
  Bignay: [14.7105, 120.9505],
  Coloong: [14.6685, 120.9525],
  Isla: [14.6605, 120.9625],
  Mabolo: [14.6805, 120.9705],
  Palasan: [14.6855, 120.9555],
  Parada: [14.6905, 120.9585],
  Polo: [14.6845, 120.9405],
  Rincon: [14.6705, 120.9605],
  "Wawang Pulo": [14.6635, 120.9455],
};

const VALENZUELA_CENTER = [14.676, 120.983];

/* =========================================================
   LEAFLET ICONS
   ========================================================= */

const repairShopIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:34px;height:34px;border-radius:50%;
      background:#3285a1;border:4px solid white;
      box-shadow:0 3px 12px rgba(0,0,0,.25);
      display:flex;align-items:center;justify-content:center;
    "></div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

const barangayIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:28px;height:28px;border-radius:50%;
      background:#10b981;border:4px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,.2);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/* =========================================================
   MAP RESIZE
   ========================================================= */

const MapResizeFix = () => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

/* =========================================================
   REPAIR SHOP MAP
   ========================================================= */

const RepairShopMap = ({
  shops,
  barangay,
  sellerBarangay,
  onShopClick,
}) => {
  const isAllBarangays = barangay === "Valenzuela City";

  const coordinates = isAllBarangays
    ? VALENZUELA_CENTER
    : BARANGAY_COORDINATES[barangay] ||
      BARANGAY_COORDINATES[sellerBarangay] ||
      VALENZUELA_CENTER;

  const hasExactLocation = (shop) => {
    const lat = Number(shop.latitude);
    const lng = Number(shop.longitude);

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat !== 0 &&
      lng !== 0
    );
  };

  return (
    <div className="relative z-0 isolate w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="absolute left-4 top-4 z-[1000] rounded-xl bg-white px-3 py-2 shadow-lg">
        <p className="text-[9px] font-black text-slate-700">
          {isAllBarangays ? "Valenzuela City" : `Brgy. ${barangay}`}
        </p>
        <p className="text-[7px] text-slate-400">
          Repair shop locations
        </p>
      </div>

      <div className="absolute right-4 top-4 z-[1000] rounded-xl bg-[#3285a1] px-3 py-2 text-white shadow-lg">
        <p className="text-[9px] font-black">{shops.length} Repair Shops</p>
        <p className="mt-0.5 text-[7px] text-white/70">
          Click a pin for details
        </p>
      </div>

      <MapContainer
        className="repair-shop-map"
        key={`${barangay}-${coordinates[0]}-${coordinates[1]}`}
        center={coordinates}
        zoom={isAllBarangays ? 13 : 15}
        scrollWheelZoom
        style={{ height: "350px", width: "100%" }}
      >
        <MapResizeFix />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {shops.map((shop) => {
          const shopName =
            shop.business_name || shop.full_name || "Repair Shop";
          const shopBarangay = shop.barangay || "Unknown";
          const exactLocation = hasExactLocation(shop);

          const fallbackCoordinates =
            BARANGAY_COORDINATES[shopBarangay] || VALENZUELA_CENTER;

          const markerPosition = exactLocation
            ? [Number(shop.latitude), Number(shop.longitude)]
            : fallbackCoordinates;

          return (
            <Marker
              key={shop.id}
              position={markerPosition}
              icon={repairShopIcon}
              eventHandlers={{ click: () => onShopClick(shop) }}
            >
              <Popup>
                <div className="min-w-[210px]">
                  <p className="font-black text-slate-800">{shopName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Brgy. {shopBarangay}
                  </p>

                  <div className="mt-2">
                    {exactLocation ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} />
                        Exact shop location
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600">
                        <MapPin size={12} />
                        Barangay location only
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-amber-400"
                      fill="currentColor"
                    />
                    {Number(shop.repairReviewCount || 0) +
                      Number(shop.saleReviewCount || 0) >
                    0 ? (
                      <span className="text-[10px] font-bold">
                        {Number(shop.combinedRating || 0).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        No reviews yet
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onShopClick(shop)}
                    className="mt-3 w-full rounded-lg bg-[#3285a1] px-3 py-2 text-xs font-bold text-white"
                  >
                    View Shop
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {isAllBarangays && (
          <Marker position={VALENZUELA_CENTER} icon={barangayIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-black text-slate-800">Valenzuela City</p>
                <p className="text-xs text-slate-500">City map center</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute bottom-4 right-4 z-[1000] rounded-xl bg-white p-3 shadow-lg">
        <div className="flex items-center gap-2 text-[9px] text-slate-500">
          <span className="h-3 w-3 rounded-full bg-[#3285a1]" />
          Repair Shop
        </div>
        {isAllBarangays && (
          <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-500">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            City Map Center
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] max-w-[290px] rounded-lg bg-white/95 px-3 py-2 text-[8px] leading-relaxed text-slate-500 shadow">
        <span className="font-bold text-slate-600">Location accuracy:</span>{" "}
        exact pins are used when a repair shop has saved latitude and
        longitude. Older accounts fall back to their barangay.
      </div>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

const SellerRepairShopsTab = ({
  session,
  sellerBarangay = "",
}) => {
  const userId = session?.user?.id;
  const userRole =
    session?.user?.user_metadata?.role ||
    session?.user?.user_metadata?.buyer_type ||
    "";

  // Only Tech-Harvester accounts can request repair appointments.
  // Seller accounts remain sell-only.
  const canRequestRepair = userRole === "harvester";

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("All Barangays");
  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [viewMode, setViewMode] = useState("list");

  const [selectedShop, setSelectedShop] = useState(null);
  const [shopTransactions, setShopTransactions] = useState([]);
  const [shopReviews, setShopReviews] = useState([]);
  const [repairReviews, setRepairReviews] = useState([]);
  const [shopAppointments, setShopAppointments] = useState([]);
  const [loadingShopDetails, setLoadingShopDetails] = useState(false);

  /* =========================================================
     APPOINTMENT STATE
     ========================================================= */

  const [appointmentShop, setAppointmentShop] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    deviceModel: "",
    category: "",
    issueDescription: "",
    preferredDate: "",
    preferredTime: "",
    notes: "",
  });

  /* =========================================================
     MESSAGING STATE
     ========================================================= */

  const [messageShop, setMessageShop] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageAppointments, setMessageAppointments] = useState([]);
  const [loadingMessageAppointments, setLoadingMessageAppointments] = useState(false);

  /* =========================================================
     HELPERS
     ========================================================= */

  const isVerified = (shop) =>
    shop.is_verified === true ||
    String(shop.verification_status || "").toLowerCase() === "verified";

  const getShopName = (shop) =>
    shop?.business_name || shop?.full_name || "Repair Shop";

  const getShopAddress = (shop) =>
    shop?.address ||
    (shop?.barangay
      ? `Brgy. ${shop.barangay}, Valenzuela City`
      : "Valenzuela City");

  const getShopContact = (shop) =>
    shop?.contact_number || "Contact number not provided";

  const getDeviceCategories = (shop) => {
    const transactions = shop?.completedTransactions || [];
    return Array.from(
      new Set(
        transactions
          .map((transaction) => transaction.listings?.category)
          .filter(Boolean)
      )
    );
  };

  const getShopRating = (shop) => {
    const saleCount = Number(shop?.saleReviewCount || 0);
    const repairCount = Number(shop?.repairReviewCount || 0);
    const saleRating = Number(shop?.saleAverageRating || 0);
    const repairRating = Number(shop?.repairAverageRating || 0);

    const total = saleCount + repairCount;

    if (!total) return 0;

    return (saleRating * saleCount + repairRating * repairCount) / total;
  };

  const appointmentStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (value === "confirmed" || value === "approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (value === "completed") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (value === "cancelled" || value === "rejected") {
      return "bg-red-50 text-red-600 border-red-200";
    }

    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  /* =========================================================
     FETCH REPAIR SHOPS
     ========================================================= */

  const fetchRepairShops = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          role,
          barangay,
          latitude,
          longitude,
          address,
          is_verified,
          created_at,
          business_name,
          verification_status,
          email,
          status,
          contact_number,
          average_rating,
          total_reviews,
          buyer_type
        `)
        .eq("role", "repair_shop");

      if (error) throw error;

      const activeShops = (data || []).filter(
        (shop) =>
          String(shop.status || "active").toLowerCase() === "active"
      );

      const shopsWithStats = await Promise.all(
        activeShops.map(async (shop) => {
          let completedTransactions = [];
          let saleReviews = [];
          let repairReviewsForShop = [];

          /* -----------------------------------------------
             SELLING / PURCHASE TRANSACTIONS
          ------------------------------------------------ */

          const { data: transactionData, error: transactionError } =
            await supabase
              .from("transactions")
              .select(`
                id,
                amount,
                status,
                created_at,
                completed_at,
                listing_id,
                meetup_date,
                meetup_time,
                listings (
                  id,
                  device_model,
                  category,
                  condition,
                  seller_id,
                  status,
                  asking_price,
                  scrap_value
                )
              `)
              .eq("harvester_id", shop.id)
              .eq("status", "completed")
              .order("completed_at", { ascending: false });

          if (transactionError) {
            console.error(
              "Transaction error for repair shop:",
              shop.id,
              transactionError
            );
          } else {
            completedTransactions = transactionData || [];
          }

          const transactionIds = completedTransactions.map(
            (transaction) => transaction.id
          );

          if (transactionIds.length > 0) {
            const { data: reviewData, error: reviewError } =
              await supabase
                .from("reviews")
                .select(`
                  id,
                  transaction_id,
                  seller_id,
                  reviewer_id,
                  communication_rating,
                  punctuality_rating,
                  condition_rating,
                  overall_rating,
                  recommend,
                  comment,
                  created_at
                `)
                .in("transaction_id", transactionIds)
                .order("created_at", { ascending: false });

            if (reviewError) {
              console.error("Selling review error:", reviewError);
            } else {
              saleReviews = reviewData || [];
            }
          }

          /* -----------------------------------------------
             REPAIR REVIEWS
             Separate table from selling reviews.
          ------------------------------------------------ */

          const { data: repairReviewData, error: repairReviewError } =
            await supabase
              .from("repair_reviews")
              .select(`
                id,
                appointment_id,
                repair_shop_id,
                reviewer_id,
                communication_rating,
                service_rating,
                overall_rating,
                recommend,
                comment,
                created_at
              `)
              .eq("repair_shop_id", shop.id)
              .order("created_at", { ascending: false });

          if (repairReviewError) {
            /*
              Keep the shop list working if the new repair_reviews
              table has not been created yet.
            */
            console.warn(
              "Repair reviews could not be loaded. Create the repair_reviews table to enable this feature.",
              repairReviewError
            );
          } else {
            repairReviewsForShop = repairReviewData || [];
          }

          const saleAverage =
            saleReviews.length > 0
              ? saleReviews.reduce(
                  (sum, review) => sum + Number(review.overall_rating || 0),
                  0
                ) / saleReviews.length
              : 0;

          const repairAverage =
            repairReviewsForShop.length > 0
              ? repairReviewsForShop.reduce(
                  (sum, review) => sum + Number(review.overall_rating || 0),
                  0
                ) / repairReviewsForShop.length
              : 0;

          return {
            ...shop,
            purchaseCount: completedTransactions.length,
            completedTransactions,
            reviews: saleReviews,
            repairReviews: repairReviewsForShop,
            saleReviewCount: saleReviews.length,
            repairReviewCount: repairReviewsForShop.length,
            saleAverageRating: saleAverage,
            repairAverageRating: repairAverage,
            combinedRating:
              saleReviews.length + repairReviewsForShop.length > 0
                ? (saleAverage * saleReviews.length +
                    repairAverage * repairReviewsForShop.length) /
                  (saleReviews.length + repairReviewsForShop.length)
                : 0,
          };
        })
      );

      setShops(shopsWithStats);
    } catch (error) {
      console.error("Error loading repair shops:", error);
      setShops([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRepairShops();

    const channel = supabase
      .channel("repair-shop-tab-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => fetchRepairShops(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => fetchRepairShops(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repair_appointments",
        },
        () => fetchRepairShops(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repair_reviews",
        },
        () => fetchRepairShops(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* =========================================================
     BARANGAYS
     ========================================================= */

  const barangays = useMemo(() => {
    const values = shops.map((shop) => shop.barangay).filter(Boolean);

    return [
      "All Barangays",
      ...Array.from(new Set(values)).sort(),
    ];
  }, [shops]);

  /* =========================================================
     FILTERED SHOPS
     ========================================================= */

  const filteredShops = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = shops.filter((shop) => {
      const name = getShopName(shop);
      const location = shop.barangay || "";

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        location.toLowerCase().includes(query) ||
        String(shop.full_name || "").toLowerCase().includes(query) ||
        "repair shop".includes(query);

      const matchesBarangay =
        barangayFilter === "All Barangays" ||
        location === barangayFilter;

      const matchesVerification =
        !verifiedOnly || isVerified(shop);

      return (
        matchesSearch &&
        matchesBarangay &&
        matchesVerification
      );
    });

    return [...result].sort((a, b) => {
      if (sortBy === "purchases") {
        return Number(b.purchaseCount || 0) - Number(a.purchaseCount || 0);
      }

      if (sortBy === "reviews") {
        return (
          Number(b.saleReviewCount || 0) +
          Number(b.repairReviewCount || 0) -
          (Number(a.saleReviewCount || 0) +
            Number(a.repairReviewCount || 0))
        );
      }

      return getShopRating(b) - getShopRating(a);
    });
  }, [
    shops,
    search,
    barangayFilter,
    sortBy,
    verifiedOnly,
  ]);

  const totalShops = filteredShops.length;

  const verifiedShopsCount = filteredShops.filter(isVerified).length;

  const totalPurchases = filteredShops.reduce(
    (total, shop) => total + Number(shop.purchaseCount || 0),
    0
  );

  const totalSaleReviews = filteredShops.reduce(
    (total, shop) => total + Number(shop.saleReviewCount || 0),
    0
  );

  const totalRepairReviews = filteredShops.reduce(
    (total, shop) => total + Number(shop.repairReviewCount || 0),
    0
  );

  const currentBarangay =
    barangayFilter === "All Barangays"
      ? "Valenzuela City"
      : barangayFilter;

  /* =========================================================
     LOAD SHOP DETAILS
     ========================================================= */

  const openShopProfile = async (shop) => {
    setSelectedShop(shop);
    setLoadingShopDetails(true);

    try {
      const { data: transactionData, error: transactionError } =
        await supabase
          .from("transactions")
          .select(`
            id,
            amount,
            status,
            created_at,
            completed_at,
            listing_id,
            meetup_date,
            meetup_time,
            listings (
              id,
              device_model,
              category,
              condition,
              seller_id,
              status,
              asking_price,
              scrap_value
            )
          `)
          .eq("harvester_id", shop.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false });

      if (transactionError) throw transactionError;

      const transactions = transactionData || [];
      const transactionIds = transactions.map(
        (transaction) => transaction.id
      );

      let saleReviews = [];

      if (transactionIds.length > 0) {
        const { data: reviewData, error: reviewError } =
          await supabase
            .from("reviews")
            .select(`
              id,
              transaction_id,
              seller_id,
              reviewer_id,
              communication_rating,
              punctuality_rating,
              condition_rating,
              overall_rating,
              recommend,
              comment,
              created_at
            `)
            .in("transaction_id", transactionIds)
            .order("created_at", { ascending: false });

        if (reviewError) {
          console.error("Could not load selling reviews:", reviewError);
        } else {
          saleReviews = reviewData || [];
        }
      }

      let repairReviewsForShop = [];

      const { data: repairReviewData, error: repairReviewError } =
        await supabase
          .from("repair_reviews")
          .select(`
            id,
            appointment_id,
            repair_shop_id,
            reviewer_id,
            communication_rating,
            service_rating,
            overall_rating,
            recommend,
            comment,
            created_at
          `)
          .eq("repair_shop_id", shop.id)
          .order("created_at", { ascending: false });

      if (repairReviewError) {
        console.warn(
          "Could not load repair reviews:",
          repairReviewError
        );
      } else {
        repairReviewsForShop = repairReviewData || [];
      }

      let appointments = [];

      if (userId) {
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
            .eq("harvester_id", userId)
            .eq("repair_shop_id", shop.id)
            .order("created_at", { ascending: false });

        if (appointmentError) {
          console.warn(
            "Could not load repair appointments:",
            appointmentError
          );
        } else {
          appointments = appointmentData || [];
        }
      }

      const saleAverage =
        saleReviews.length > 0
          ? saleReviews.reduce(
              (sum, review) => sum + Number(review.overall_rating || 0),
              0
            ) / saleReviews.length
          : 0;

      const repairAverage =
        repairReviewsForShop.length > 0
          ? repairReviewsForShop.reduce(
              (sum, review) => sum + Number(review.overall_rating || 0),
              0
            ) / repairReviewsForShop.length
          : 0;

      const updatedShop = {
        ...shop,
        purchaseCount: transactions.length,
        completedTransactions: transactions,
        reviews: saleReviews,
        repairReviews: repairReviewsForShop,
        saleReviewCount: saleReviews.length,
        repairReviewCount: repairReviewsForShop.length,
        saleAverageRating: saleAverage,
        repairAverageRating: repairAverage,
        combinedRating:
          saleReviews.length + repairReviewsForShop.length > 0
            ? (saleAverage * saleReviews.length +
                repairAverage * repairReviewsForShop.length) /
              (saleReviews.length + repairReviewsForShop.length)
            : 0,
      };

      setSelectedShop(updatedShop);
      setShops((previous) =>
        previous.map((item) =>
          item.id === shop.id ? updatedShop : item
        )
      );

      setShopTransactions(transactions);
      setShopReviews(saleReviews);
      setRepairReviews(repairReviewsForShop);
      setShopAppointments(appointments);
    } catch (error) {
      console.error("Error loading shop details:", error);
      setShopTransactions(shop.completedTransactions || []);
      setShopReviews(shop.reviews || []);
      setRepairReviews(shop.repairReviews || []);
      setShopAppointments([]);
    } finally {
      setLoadingShopDetails(false);
    }
  };

  /* =========================================================
     APPOINTMENT
     ========================================================= */

  const resetAppointmentForm = () => {
    setAppointmentForm({
      deviceModel: "",
      category: "",
      issueDescription: "",
      preferredDate: "",
      preferredTime: "",
      notes: "",
    });
  };

  const openAppointmentModal = async (shop) => {
    if (!userId) {
      alert("Please log in before requesting a repair appointment.");
      return;
    }

    if (!canRequestRepair) {
      alert(
        "Only Harvester accounts can request repair appointments from repair shops."
      );
      return;
    }

    setAppointmentShop(shop);
    resetAppointmentForm();

    try {
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
        .eq("harvester_id", userId)
        .eq("repair_shop_id", shop.id)
        .in("status", ["pending", "confirmed", "approved"])
        .order("created_at", { ascending: false });

      if (!error && data?.length) {
        setShopAppointments(data);
      }
    } catch (error) {
      console.warn("Could not check existing appointments:", error);
    }
  };

  const submitRepairAppointment = async () => {
    if (!userId || !appointmentShop) return;

    if (!appointmentForm.deviceModel.trim()) {
      alert("Please enter the device model.");
      return;
    }

    if (!appointmentForm.category) {
      alert("Please select the device category.");
      return;
    }

    if (!appointmentForm.issueDescription.trim()) {
      alert("Please describe the repair issue.");
      return;
    }

    if (!appointmentForm.preferredDate) {
      alert("Please select your preferred date.");
      return;
    }

    if (!appointmentForm.preferredTime) {
      alert("Please select your preferred time.");
      return;
    }

    setAppointmentLoading(true);

    try {
      const { data: existingAppointments, error: existingError } =
        await supabase
          .from("repair_appointments")
          .select("id,status")
          .eq("harvester_id", userId)
          .eq("repair_shop_id", appointmentShop.id)
          .in("status", ["pending", "confirmed", "approved"]);

      if (existingError) throw existingError;

      if (existingAppointments?.length > 0) {
        alert(
          "You already have an active repair appointment request with this shop."
        );
        setAppointmentLoading(false);
        return;
      }

      const { data: appointment, error } = await supabase
        .from("repair_appointments")
        .insert({
          harvester_id: userId,
          repair_shop_id: appointmentShop.id,
          device_model: appointmentForm.deviceModel.trim(),
          category: appointmentForm.category,
          issue_description: appointmentForm.issueDescription.trim(),
          preferred_date: appointmentForm.preferredDate,
          preferred_time: appointmentForm.preferredTime,
          notes: appointmentForm.notes.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      /*
        Also create a normal message so the request is visible
        in the existing Wasteless messaging system.
      */
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: appointmentShop.id,
        listing_id: null,
        content:
          `Repair Appointment Request\n` +
          `Device: ${appointmentForm.deviceModel.trim()}\n` +
          `Category: ${appointmentForm.category}\n` +
          `Issue: ${appointmentForm.issueDescription.trim()}\n` +
          `Preferred schedule: ${appointmentForm.preferredDate} at ${appointmentForm.preferredTime}` +
          (appointmentForm.notes.trim()
            ? `\nNotes: ${appointmentForm.notes.trim()}`
            : ""),
      });

      setShopAppointments((previous) => [
        appointment,
        ...previous,
      ]);

      setAppointmentShop(null);
      resetAppointmentForm();

      alert(
        `Repair appointment request sent to ${getShopName(
          selectedShop || appointmentShop
        )}.`
      );
    } catch (error) {
      console.error("Error requesting repair appointment:", error);
      alert(
        "Unable to request the repair appointment. Make sure the repair appointment table has been created in Supabase."
      );
    } finally {
      setAppointmentLoading(false);
    }
  };

  const cancelRepairAppointment = async (appointment) => {
    if (!appointment?.id || !userId) return;

    if (
      !window.confirm(
        "Cancel this repair appointment request?"
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("repair_appointments")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointment.id)
        .eq("harvester_id", userId)
        .in("status", ["pending", "confirmed", "approved"]);

      if (error) throw error;

      const updatedAppointments = shopAppointments.map((item) =>
        item.id === appointment.id
          ? { ...item, status: "cancelled" }
          : item
      );

      setShopAppointments(updatedAppointments);

      if (selectedShop) {
        setSelectedShop((previous) => ({
          ...previous,
          repairAppointments: updatedAppointments,
        }));
      }
    } catch (error) {
      console.error("Error cancelling repair appointment:", error);
      alert("Unable to cancel the appointment.");
    }
  };

  /* =========================================================
     MESSAGING
     ========================================================= */

  const loadMessages = async (shop) => {
    if (!userId || !shop?.id) return;

    setLoadingMessages(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          listing_id,
          sender_id,
          receiver_id,
          content,
          is_read,
          created_at
        `)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${shop.id}),and(sender_id.eq.${shop.id},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      const unreadIds = (data || [])
        .filter(
          (message) =>
            message.receiver_id === userId && !message.is_read
        )
        .map((message) => message.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadIds);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMessageAppointments = async (shop) => {
    if (!userId || !shop?.id) {
      setMessageAppointments([]);
      return;
    }

    setLoadingMessageAppointments(true);

    try {
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
        .eq("harvester_id", userId)
        .eq("repair_shop_id", shop.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessageAppointments(data || []);
    } catch (error) {
      console.error("Error loading repair appointments in messages:", error);
      setMessageAppointments([]);
    } finally {
      setLoadingMessageAppointments(false);
    }
  };

  const openMessageModal = async (shop) => {
    setMessageShop(shop);
    setMessageText("");
    setMessageAppointments([]);
    await Promise.all([loadMessages(shop), loadMessageAppointments(shop)]);
  };

  useEffect(() => {
    if (!messageShop?.id || !userId) return;

    const channel = supabase
      .channel(`repair-shop-messages-${messageShop.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const message = payload.new;

          if (message.sender_id === messageShop.id) {
            setMessages((previous) => {
              if (previous.some((item) => item.id === message.id)) {
                return previous;
              }
              return [...previous, message];
            });

            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", message.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repair_appointments",
          filter: `harvester_id=eq.${userId}`,
        },
        (payload) => {
          const appointment = payload.new;

          if (appointment?.repair_shop_id !== messageShop.id) return;

          setMessageAppointments((previous) => {
            if (payload.eventType === "DELETE") {
              return previous.filter((item) => item.id !== appointment.id);
            }

            const exists = previous.some((item) => item.id === appointment.id);
            if (exists) {
              return previous.map((item) =>
                item.id === appointment.id ? appointment : item
              );
            }

            return [...previous, appointment].sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
            );
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [messageShop?.id, userId]);

  const sendMessage = async () => {
    const content = messageText.trim();

    if (!content || !userId || !messageShop?.id) return;

    setSendingMessage(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          receiver_id: messageShop.id,
          content,
          listing_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((previous) => [...previous, data]);
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Unable to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  /* =========================================================
     REVIEW CARD
     ========================================================= */

  const ReviewCard = ({ review, type }) => {
    const isRepair = type === "repair";

    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400">
              <User size={15} />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">
                Customer
              </p>

              <p className="text-[8px] text-slate-400">
                {review.created_at
                  ? new Date(review.created_at).toLocaleDateString()
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Star
              size={12}
              className="text-amber-400"
              fill="currentColor"
            />
            <span className="text-xs font-black">
              {Number(review.overall_rating || 0).toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mt-2">
          <span
            className={`rounded-full px-2 py-1 text-[7px] font-black ${
              isRepair
                ? "bg-violet-50 text-violet-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {isRepair ? "Repair Service" : "Selling Transaction"}
          </span>
        </div>

        {review.comment && (
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            "{review.comment}"
          </p>
        )}

        {review.recommend && (
          <div className="mt-2 flex items-center gap-1 text-[8px] font-bold text-emerald-600">
            <CheckCircle2 size={11} />
            Recommended
          </div>
        )}
      </div>
    );
  };

  /* =========================================================
     RETURN
     ========================================================= */

  return (
    <div className="animate-in fade-in duration-500 space-y-3">
      {/* HEADER */}
      <div className="rounded-[1.25rem] bg-gradient-to-r from-[#2d86a3] to-[#14516d] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-white/60">
              <MapPin size={11} />
              {currentBarangay}
            </div>

            <h2 className="mt-1 text-xl font-black">
              Repair Shops in Your Area
            </h2>

            <p className="mt-0.5 text-[10px] text-white/60">
              Find verified repair shops and request a repair appointment
            </p>
          </div>

          <div className="hidden h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm sm:flex">
            <span className="text-xl font-black leading-none">
              {totalShops}
            </span>
            <span className="mt-0.5 text-[7px] font-bold uppercase tracking-wider text-white/60">
              Shops
            </span>
          </div>
        </div>

        <div className="relative mt-4">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shop, owner, barangay..."
            className="w-full rounded-xl border border-white/15 bg-white/10 px-9 py-2.5 text-[10px] text-white placeholder:text-white/40 outline-none transition focus:bg-white/15"
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[9px] font-black transition ${
              viewMode === "list"
                ? "bg-white text-[#2d86a3]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Building2 size={11} />
            Shop List
          </button>

          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[9px] font-black transition ${
              viewMode === "map"
                ? "bg-white text-[#2d86a3]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <MapPin size={11} />
            Map View
          </button>

          <button
            type="button"
            onClick={() => fetchRepairShops(true)}
            disabled={refreshing}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[9px] font-black text-white hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw
              size={11}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={barangayFilter}
          onChange={(e) => setBarangayFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 outline-none"
        >
          {barangays.map((barangay) => (
            <option key={barangay} value={barangay}>
              {barangay}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 outline-none"
        >
          <option value="rating">Top Rated</option>
          <option value="purchases">Most Purchases</option>
          <option value="reviews">Most Reviews</option>
        </select>

        <button
          type="button"
          onClick={() => setVerifiedOnly((value) => !value)}
          className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-bold transition ${
            verifiedOnly
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <BadgeCheck size={11} className="mr-1 inline" />
          Verified
        </button>

        {sellerBarangay && (
          <button
            type="button"
            onClick={() => {
              setBarangayFilter(sellerBarangay);
              setViewMode("map");
            }}
            className="rounded-lg border border-[#3285a1]/20 bg-[#3285a1]/5 px-2.5 py-1.5 text-[9px] font-bold text-[#3285a1]"
          >
            <MapPin size={11} className="mr-1 inline" />
            My Barangay
          </button>
        )}
      </div>

      {/* OVERVIEW */}
      {!loading && filteredShops.length > 0 && (
        <div>
          <div className="mb-2">
            <h3 className="text-sm font-black text-slate-700">
              Repair Shop Overview
            </h3>
            <p className="text-[9px] text-slate-400">
              Shop activity and separate selling/repair review counts
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                <Building2 size={11} className="text-[#3285a1]" />
                Total Shops
              </div>
              <p className="mt-1 text-lg font-black text-slate-700">
                {totalShops}
              </p>
              <p className="text-[8px] text-slate-400">selected area</p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                <BadgeCheck size={11} className="text-emerald-500" />
                Verified
              </div>
              <p className="mt-1 text-lg font-black text-slate-700">
                {verifiedShopsCount}
              </p>
              <p className="text-[8px] text-slate-400">admin verified</p>
            </div>

            <div className="rounded-xl bg-blue-50 p-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                <Star size={11} className="text-blue-500" />
                Selling Reviews
              </div>
              <p className="mt-1 text-lg font-black text-slate-700">
                {totalSaleReviews}
              </p>
              <p className="text-[8px] text-slate-400">device sales</p>
            </div>

            <div className="rounded-xl bg-violet-50 p-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                <Wrench size={11} className="text-violet-500" />
                Repair Reviews
              </div>
              <p className="mt-1 text-lg font-black text-slate-700">
                {totalRepairReviews}
              </p>
              <p className="text-[8px] text-slate-400">repair services</p>
            </div>
          </div>
        </div>
      )}

      {/* NOTICE */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <ClipboardList
            size={13}
            className="mt-0.5 shrink-0 text-blue-600"
          />
          <p className="text-[9px] leading-relaxed text-blue-700">
            <span className="font-black">Repair appointments:</span>{" "}
            Harvester users can open a verified repair shop profile and submit
            a preferred repair date and time. The request starts as{" "}
            <b>Pending</b> until the repair shop confirms it.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-12 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#3285a1]" />
          <p className="mt-3 text-[10px] text-slate-400">
            Loading repair shops...
          </p>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <Building2 className="mx-auto mb-3 text-slate-200" size={34} />
          <h4 className="text-sm font-black text-slate-700">
            No repair shops found
          </h4>
          <p className="mt-1 text-[9px] text-slate-400">
            Try changing your search, barangay, or verification filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setBarangayFilter("All Barangays");
            }}
            className="mt-4 rounded-lg bg-[#3285a1] px-4 py-2 text-[9px] font-black text-white"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {viewMode === "map" && (
            <div>
              <div className="mb-2">
                <h3 className="text-sm font-black text-slate-700">
                  Repair Shop Map — {currentBarangay}
                </h3>
                <p className="text-[9px] text-slate-400">
                  Click a pin to open the shop profile and request an
                  appointment.
                </p>
              </div>

              <RepairShopMap
                shops={filteredShops}
                barangay={currentBarangay}
                sellerBarangay={sellerBarangay}
                onShopClick={openShopProfile}
              />
            </div>
          )}

          {viewMode === "list" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-700">
                    Repair Shops
                  </h3>
                  <p className="text-[9px] text-slate-400">
                    Open a profile to view reviews and request repair service
                  </p>
                </div>

                <span className="rounded-lg bg-[#3285a1]/10 px-2 py-1 text-[8px] font-black text-[#3285a1]">
                  {filteredShops.length} Shops
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredShops.map((shop) => {
                  const rating = getShopRating(shop);
                  const reviewCount =
                    Number(shop.saleReviewCount || 0) +
                    Number(shop.repairReviewCount || 0);

                  return (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => openShopProfile(shop)}
                      className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="truncate text-[11px] font-black text-slate-800">
                              {getShopName(shop)}
                            </h4>

                            {isVerified(shop) && (
                              <BadgeCheck
                                size={13}
                                className="shrink-0 text-emerald-500"
                                fill="white"
                              />
                            )}
                          </div>

                          <p className="mt-0.5 text-[8px] text-slate-400">
                            {shop.purchaseCount || 0} completed purchases
                          </p>
                        </div>

                        {rating >= 4.5 && reviewCount > 0 && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[7px] font-black text-amber-700">
                            Top Rated
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={11}
                              className="text-amber-400"
                              fill={
                                star <= Math.round(rating)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          ))}
                        </div>

                        {reviewCount > 0 ? (
                          <>
                            <span className="text-[9px] font-black text-slate-700">
                              {rating.toFixed(1)}
                            </span>
                            <span className="text-[8px] text-slate-400">
                              ({reviewCount} total)
                            </span>
                          </>
                        ) : (
                          <span className="text-[8px] text-slate-400">
                            No reviews yet
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5 text-[9px]">
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin size={10} />
                          <span>
                            Brgy. {shop.barangay || "Not provided"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          <Wrench size={10} />
                          <span>Repair services available</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar size={10} />
                          <span>Appointment request available</span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {Number(shop.saleReviewCount || 0) > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[7px] font-bold text-blue-600">
                            {shop.saleReviewCount} selling review
                            {shop.saleReviewCount !== 1 ? "s" : ""}
                          </span>
                        )}

                        {Number(shop.repairReviewCount || 0) > 0 && (
                          <span className="rounded-full bg-violet-50 px-2 py-1 text-[7px] font-bold text-violet-600">
                            {shop.repairReviewCount} repair review
                            {shop.repairReviewCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[8px] text-slate-400">
                          View shop profile
                        </span>
                        <ChevronRight
                          size={13}
                          className="text-[#3285a1] transition group-hover:translate-x-1"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* =====================================================
          SHOP PROFILE MODAL
      ===================================================== */}

      {selectedShop && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedShop(null);
            }
          }}
        >
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="relative h-36 bg-gradient-to-r from-[#3285a1] to-[#14516d]">
              <button
                type="button"
                onClick={() => setSelectedShop(null)}
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
              >
                <X size={21} />
              </button>

              <div className="absolute -bottom-12 left-8">
                <div className="flex h-28 w-28 items-center justify-center rounded-[1.5rem] border-[6px] border-white bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-xl">
                  <Building2 size={48} />
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 pt-16">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900">
                      {getShopName(selectedShop)}
                    </h2>

                    {isVerified(selectedShop) && (
                      <BadgeCheck
                        size={25}
                        className="text-emerald-600"
                        fill="white"
                      />
                    )}
                  </div>

                  {selectedShop.full_name &&
                    selectedShop.full_name !== selectedShop.business_name && (
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedShop.full_name}
                      </p>
                    )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={17}
                          className="text-amber-400"
                          fill={
                            star <= Math.round(getShopRating(selectedShop))
                              ? "currentColor"
                              : "none"
                          }
                        />
                      ))}
                    </div>

                    {getShopRating(selectedShop) > 0 ? (
                      <span className="text-lg font-black text-slate-800">
                        {getShopRating(selectedShop).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">
                        No reviews yet
                      </span>
                    )}
                  </div>
                </div>

                <div className="self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-600">
                  Repair Shop
                </div>
              </div>

              {/* INFORMATION */}
              <div className="mt-7 rounded-[1.5rem] bg-slate-50 p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <MapPin size={19} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Shop Address
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {getShopAddress(selectedShop)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <Phone size={19} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Contact Number
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {getShopContact(selectedShop)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <ShoppingBag size={19} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Completed Device Purchases
                      </p>
                      <p className="mt-1 text-sm font-black text-[#3285a1]">
                        {selectedShop.purchaseCount || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                      <BadgeCheck size={19} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Verification
                      </p>
                      <p className="mt-1 text-sm font-black text-emerald-600">
                        {isVerified(selectedShop)
                          ? "Verified Repair Shop"
                          : "Verification Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* =================================================
                  APPOINTMENT AREA
              ================================================= */}

              {canRequestRepair && (
                <div className="mt-7 rounded-[1.5rem] border border-violet-200 bg-violet-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                      <Calendar size={21} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-black text-slate-700">
                        Repair Appointment
                      </h3>
                      <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                        Request a preferred date and time for your device
                        repair. The appointment remains pending until the
                        repair shop confirms it.
                      </p>

                      {shopAppointments.filter(
                        (appointment) =>
                          !["cancelled", "rejected"].includes(
                            String(appointment.status || "").toLowerCase()
                          )
                      ).length === 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            openAppointmentModal(selectedShop)
                          }
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-700"
                        >
                          <Calendar size={16} />
                          Request Repair Appointment
                        </button>
                      ) : (
                        <div className="mt-4 space-y-2">
                          {shopAppointments
                            .filter(
                              (appointment) =>
                                !["cancelled", "rejected"].includes(
                                  String(appointment.status || "").toLowerCase()
                                )
                            )
                            .slice(0, 2)
                            .map((appointment) => (
                              <div
                                key={appointment.id}
                                className="rounded-xl border border-white bg-white p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-black text-slate-700">
                                      {appointment.device_model}
                                    </p>
                                    <p className="mt-1 text-[8px] text-slate-400">
                                      {appointment.preferred_date} ·{" "}
                                      {appointment.preferred_time}
                                    </p>
                                  </div>

                                  <span
                                    className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase ${appointmentStatusClass(
                                      appointment.status
                                    )}`}
                                  >
                                    {appointment.status || "Pending"}
                                  </span>
                                </div>

                                <p className="mt-2 text-[9px] text-slate-500">
                                  {appointment.issue_description}
                                </p>

                                {String(
                                  appointment.status || ""
                                ).toLowerCase() === "pending" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cancelRepairAppointment(
                                        appointment
                                      )
                                    }
                                    className="mt-3 flex items-center gap-1.5 text-[8px] font-bold text-red-500 hover:text-red-600"
                                  >
                                    <XCircle size={11} />
                                    Cancel Request
                                  </button>
                                )}
                              </div>
                            ))}

                          <button
                            type="button"
                            onClick={() =>
                              openAppointmentModal(selectedShop)
                            }
                            className="mt-1 text-[8px] font-black text-violet-700 underline underline-offset-2"
                          >
                            Request another appointment
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DEVICES PURCHASED */}
              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-700">
                      Devices Purchased
                    </h3>
                    <p className="text-[9px] text-slate-400">
                      Categories from completed selling transactions
                    </p>
                  </div>
                  <Package size={20} className="text-[#3285a1]" />
                </div>

                {getDeviceCategories(selectedShop).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getDeviceCategories(selectedShop).map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-[#3285a1]/20 bg-[#3285a1]/5 px-4 py-2 text-xs font-bold text-[#3285a1]"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-400">
                    No completed device purchases yet.
                  </p>
                )}
              </div>

              {/* RECENT SALES */}
              <div className="mt-7">
                <h3 className="text-lg font-black text-slate-700">
                  Recent Selling Transactions
                </h3>

                {loadingShopDetails ? (
                  <div className="mt-3 flex items-center justify-center rounded-xl bg-slate-50 p-6">
                    <Loader2
                      size={20}
                      className="animate-spin text-[#3285a1]"
                    />
                  </div>
                ) : shopTransactions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {shopTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <ShoppingBag size={17} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-slate-700">
                              {transaction.listings?.device_model || "Device"}
                            </p>
                            <p className="text-[8px] text-slate-400">
                              {transaction.listings?.category || "Unknown"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-black text-[#3285a1]">
                            ₱
                            {Number(
                              transaction.amount || 0
                            ).toLocaleString()}
                          </p>
                          <p className="text-[8px] text-emerald-500">
                            Completed
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400">
                    No completed selling transactions yet.
                  </p>
                )}
              </div>

              {/* =================================================
                  SEPARATE REVIEWS
              ================================================= */}

              <div className="mt-7">
                <div className="mb-3">
                  <h3 className="text-lg font-black text-slate-700">
                    Customer Reviews
                  </h3>
                  <p className="text-[9px] text-slate-400">
                    Selling and repair-service reviews are kept separate.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider text-blue-600">
                          Selling Transactions
                        </p>
                        <p className="mt-1 text-2xl font-black text-slate-700">
                          {shopReviews.length}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Star
                          size={15}
                          className="text-amber-400"
                          fill="currentColor"
                        />
                        <span className="text-sm font-black">
                          {Number(
                            selectedShop.saleAverageRating || 0
                          ).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider text-violet-600">
                          Repair Services
                        </p>
                        <p className="mt-1 text-2xl font-black text-slate-700">
                          {repairReviews.length}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Star
                          size={15}
                          className="text-amber-400"
                          fill="currentColor"
                        />
                        <span className="text-sm font-black">
                          {Number(
                            selectedShop.repairAverageRating || 0
                          ).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="flex items-center gap-2 text-sm font-black text-slate-700">
                    <ShoppingBag size={15} className="text-blue-600" />
                    Selling Reviews
                  </h4>

                  {shopReviews.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {shopReviews.slice(0, 5).map((review) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          type="sale"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-400">
                      No selling transaction reviews yet.
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <h4 className="flex items-center gap-2 text-sm font-black text-slate-700">
                    <Wrench size={15} className="text-violet-600" />
                    Repair Service Reviews
                  </h4>

                  {repairReviews.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {repairReviews.slice(0, 5).map((review) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          type="repair"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-400">
                      No repair-service reviews yet.
                    </p>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedShop(null)}
                  className="rounded-2xl bg-slate-100 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => openMessageModal(selectedShop)}
                  className="flex items-center justify-center gap-3 rounded-2xl bg-[#3285a1] py-4 text-sm font-black text-white transition hover:bg-[#286f88]"
                >
                  <MessageSquare size={19} />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          APPOINTMENT MODAL
      ===================================================== */}

      {appointmentShop && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setAppointmentShop(null);
              resetAppointmentForm();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-violet-700 to-indigo-700 p-5 text-white">
              <div>
                <p className="text-sm font-black">
                  Request Repair Appointment
                </p>
                <p className="mt-0.5 text-[9px] text-white/70">
                  {getShopName(appointmentShop)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAppointmentShop(null);
                  resetAppointmentForm();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle
                    size={14}
                    className="mt-0.5 shrink-0 text-violet-600"
                  />
                  <p className="text-[9px] leading-relaxed text-violet-700">
                    Your request will be sent to the repair shop as{" "}
                    <b>Pending</b>. The selected date and time are your
                    preference and are not confirmed until the shop approves
                    the request.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[9px] font-black text-slate-600">
                  Device Model *
                </label>
                <input
                  value={appointmentForm.deviceModel}
                  onChange={(e) =>
                    setAppointmentForm((previous) => ({
                      ...previous,
                      deviceModel: e.target.value,
                    }))
                  }
                  placeholder="e.g. Dell Inspiron 15"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[9px] font-black text-slate-600">
                  Device Category *
                </label>
                <select
                  value={appointmentForm.category}
                  onChange={(e) =>
                    setAppointmentForm((previous) => ({
                      ...previous,
                      category: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-violet-500"
                >
                  <option value="">Select category</option>
                  <option value="Smartphone">Smartphone</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[9px] font-black text-slate-600">
                  Repair Issue *
                </label>
                <textarea
                  value={appointmentForm.issueDescription}
                  onChange={(e) =>
                    setAppointmentForm((previous) => ({
                      ...previous,
                      issueDescription: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Describe what is wrong with the device..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[9px] font-black text-slate-600">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={appointmentForm.preferredDate}
                    onChange={(e) =>
                      setAppointmentForm((previous) => ({
                        ...previous,
                        preferredDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[9px] font-black text-slate-600">
                    Preferred Time *
                  </label>
                  <input
                    type="time"
                    value={appointmentForm.preferredTime}
                    onChange={(e) =>
                      setAppointmentForm((previous) => ({
                        ...previous,
                        preferredTime: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[9px] font-black text-slate-600">
                  Additional Notes
                </label>
                <textarea
                  value={appointmentForm.notes}
                  onChange={(e) =>
                    setAppointmentForm((previous) => ({
                      ...previous,
                      notes: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Optional notes for the repair shop..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAppointmentShop(null);
                    resetAppointmentForm();
                  }}
                  className="rounded-xl bg-slate-100 py-3 text-xs font-black text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitRepairAppointment}
                  disabled={appointmentLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {appointmentLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Calendar size={15} />
                  )}
                  {appointmentLoading
                    ? "Sending..."
                    : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MESSAGE MODAL
      ===================================================== */}

      {messageShop && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setMessageShop(null);
            }
          }}
        >
          <div className="flex h-[600px] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#3285a1] to-[#14516d] p-5 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Building2 size={22} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {getShopName(messageShop)}
                  </p>
                  <p className="mt-0.5 text-[9px] text-white/60">
                    Repair Shop
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMessageShop(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              {loadingMessages || loadingMessageAppointments ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2
                    size={25}
                    className="animate-spin text-[#3285a1]"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Repair appointment cards are shown inside the same conversation. */}
                  {messageAppointments.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <ClipboardList size={13} className="text-violet-600" />
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">
                          Repair Appointments
                        </p>
                      </div>

                      {messageAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-2xl border border-violet-100 bg-white p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-slate-700">
                                {appointment.device_model || "Device"}
                              </p>
                              <p className="mt-0.5 text-[8px] font-semibold text-violet-600">
                                {appointment.category || "Repair request"}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[7px] font-black uppercase ${
                                String(appointment.status || "pending").toLowerCase() === "confirmed" ||
                                String(appointment.status || "pending").toLowerCase() === "approved"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : String(appointment.status || "pending").toLowerCase() === "rejected" ||
                                    String(appointment.status || "pending").toLowerCase() === "cancelled"
                                  ? "border-red-200 bg-red-50 text-red-600"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              {appointment.status || "pending"}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-slate-50 p-2">
                              <div className="flex items-center gap-1 text-[7px] font-bold uppercase text-slate-400">
                                <Calendar size={10} /> Date
                              </div>
                              <p className="mt-1 text-[9px] font-bold text-slate-600">
                                {appointment.preferred_date || "Not set"}
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-50 p-2">
                              <div className="flex items-center gap-1 text-[7px] font-bold uppercase text-slate-400">
                                <Clock size={10} /> Time
                              </div>
                              <p className="mt-1 text-[9px] font-bold text-slate-600">
                                {appointment.preferred_time || "Not set"}
                              </p>
                            </div>
                          </div>

                          {appointment.issue_description && (
                            <div className="mt-2 rounded-lg bg-slate-50 p-2">
                              <p className="text-[7px] font-bold uppercase text-slate-400">Issue</p>
                              <p className="mt-1 text-[9px] leading-relaxed text-slate-600">
                                {appointment.issue_description}
                              </p>
                            </div>
                          )}

                          {appointment.notes && (
                            <div className="mt-2 rounded-lg bg-slate-50 p-2">
                              <p className="text-[7px] font-bold uppercase text-slate-400">Notes</p>
                              <p className="mt-1 text-[9px] leading-relaxed text-slate-600">
                                {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {messages.length === 0 ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                      <MessageSquare size={35} className="text-slate-200" />
                      <p className="mt-3 text-sm font-black text-slate-600">
                        {messageAppointments.length > 0
                          ? "No messages yet"
                          : "Start a conversation"}
                      </p>
                      <p className="mt-1 max-w-[250px] text-[9px] text-slate-400">
                        You can discuss the device or repair appointment with {getShopName(messageShop)}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((message) => {
                        const isMine = message.sender_id === userId;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isMine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                isMine
                                  ? "rounded-br-md bg-[#3285a1] text-white"
                                  : "rounded-bl-md bg-white text-slate-700 shadow-sm"
                              }`}
                            >
                              <p className="break-words text-xs leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                              <p
                                className={`mt-1 text-[7px] ${
                                  isMine ? "text-white/60" : "text-slate-400"
                                }`}
                              >
                                {message.created_at
                                  ? new Date(message.created_at).toLocaleTimeString([], {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Write a message..."
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#3285a1]"
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3285a1] text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sendingMessage ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>

              <p className="mt-1.5 px-1 text-[7px] text-slate-400">
                Press Enter to send · Shift + Enter for a new line
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRepairShopsTab;
