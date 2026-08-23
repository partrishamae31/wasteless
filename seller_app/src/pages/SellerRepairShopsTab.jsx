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
  Clock3,
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

/* =========================================================
   LEAFLET ICON
   ========================================================= */

const repairShopIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#3285a1;
      border:4px solid white;
      box-shadow:0 3px 12px rgba(0,0,0,.25);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:15px;
      font-weight:900;
    ">
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

const barangayIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:28px;
      height:28px;
      border-radius:50%;
      background:#10b981;
      border:4px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,.2);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:12px;
    ">
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/* =========================================================
   MAP RESIZE FIX
   ========================================================= */

const MapResizeFix = () => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

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
  const coordinates =
    BARANGAY_COORDINATES[barangay] ||
    BARANGAY_COORDINATES[sellerBarangay] ||
    [14.676, 120.983];

  return (
    <div className="relative z-0 isolate w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="absolute left-4 top-4 z-[1000] rounded-xl bg-white px-3 py-2 shadow-lg">
        <p className="text-[9px] font-black text-slate-700">
          Brgy. {barangay}
        </p>

        <p className="text-[7px] text-slate-400">
          Valenzuela City
        </p>
      </div>

      {/* Shop count */}
      <div className="absolute right-4 top-4 z-[1000] rounded-xl bg-[#3285a1] px-3 py-2 text-white shadow-lg">
        <p className="text-[9px] font-black">
          {shops.length} Repair Shops
        </p>

        <p className="mt-0.5 text-[7px] text-white/70">
          Click a pin for details
        </p>
      </div>

      <MapContainer
        className="repair-shop-map"
        key={`${barangay}-${coordinates[0]}-${coordinates[1]}`}
        center={coordinates}
        zoom={15}
        scrollWheelZoom={true}
        style={{
          height: "350px",
          width: "100%",
        }}
      >
        <MapResizeFix />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Barangay center */}
        <Marker
          position={coordinates}
          icon={barangayIcon}
        >
          <Popup>
            <div className="text-center">
              <p className="font-black text-slate-800">
                {barangay}
              </p>

              <p className="text-xs text-slate-500">
                Barangay center
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Repair shop markers */}
        {shops.map((shop, index) => {
          /*
            Your profiles table does not currently contain
            latitude / longitude.

            Therefore these are APPROXIMATE positions around
            the barangay center.
          */

          const row = Math.floor(index / 3);
          const column = index % 3;

          const markerPosition = [
            coordinates[0] + (row - 1) * 0.0012,
            coordinates[1] + (column - 1) * 0.0012,
          ];

          const shopName =
            shop.business_name ||
            shop.full_name ||
            "Repair Shop";

          return (
            <Marker
              key={shop.id}
              position={markerPosition}
              icon={repairShopIcon}
              eventHandlers={{
                click: () => onShopClick(shop),
              }}
            >
              <Popup>
                <div className="min-w-[190px]">
                  <p className="font-black text-slate-800">
                    {shopName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Brgy. {shop.barangay || barangay}
                  </p>

                  <div className="mt-2 flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-amber-400"
                      fill="currentColor"
                    />

                    <span className="text-xs font-bold">
                      {Number(
                        shop.average_rating || 0
                      ).toFixed(1)}
                    </span>

                    <span className="text-[10px] text-slate-400">
                      ({shop.total_reviews || 0})
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {shop.purchaseCount || 0} completed purchases
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
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] rounded-xl bg-white p-3 shadow-lg">
        <div className="flex items-center gap-2 text-[9px] text-slate-500">
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#3285a1] text-[6px]">
          </span>
          Repair Shop
        </div>

        <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-500">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Barangay Center
        </div>
      </div>

      {/* Approximate location notice */}
      <div className="absolute bottom-4 left-4 z-[1000] max-w-[220px] rounded-lg bg-white/95 px-3 py-2 text-[8px] text-slate-500 shadow">
        Shop locations are approximate because exact coordinates are not
        currently stored in the profiles table.
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
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] =
    useState("All Barangays");

  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  const [selectedShop, setSelectedShop] = useState(null);

  const [viewMode, setViewMode] = useState("list");

  const [shopTransactions, setShopTransactions] =
    useState([]);

  const [shopReviews, setShopReviews] = useState([]);

  const [loadingShopDetails, setLoadingShopDetails] =
    useState(false);

  /* =========================================================
     MESSAGING
     ========================================================= */

  const [messageShop, setMessageShop] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] =
    useState(false);
  const [sendingMessage, setSendingMessage] =
    useState(false);

  /* =========================================================
     FETCH REPAIR SHOPS
     ========================================================= */

  const fetchRepairShops = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            role,
            barangay,
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
          `
        )
        .eq("role", "repair_shop");

      if (error) throw error;

      /*
        Only active repair shops.
      */

      const activeShops = (data || []).filter(
        (shop) =>
          String(shop.status || "active").toLowerCase() ===
          "active"
      );

      /*
        Verification filter.
      */

      const verifiedShops = activeShops.filter((shop) => {
        if (!verifiedOnly) return true;

        return (
          shop.is_verified === true ||
          String(
            shop.verification_status || ""
          ).toLowerCase() === "verified"
        );
      });

      /*
        Get completed purchase count for each shop.
      */

      const shopsWithStats = await Promise.all(
        verifiedShops.map(async (shop) => {
          const { data: transactionData, error: transactionError } =
            await supabase
              .from("transactions")
              .select(
                `
                  id,
                  amount,
                  status,
                  created_at,
                  completed_at,
                  listing_id,
                  listings (
                    id,
                    device_model,
                    category,
                    condition,
                    seller_id,
                    status
                  )
                `
              )
              .eq("harvester_id", shop.id)
              .eq("status", "completed")
              .order("completed_at", {
                ascending: false,
              });

          if (transactionError) {
            console.error(
              "Transaction error for shop:",
              shop.id,
              transactionError
            );
          }

          const completedTransactions =
            transactionData || [];

          /*
            Get reviews for this shop through its transactions.
          */

          const transactionIds =
            completedTransactions.map(
              (transaction) => transaction.id
            );

          let reviews = [];

          if (transactionIds.length > 0) {
            const { data: reviewData, error: reviewError } =
              await supabase
                .from("reviews")
                .select(
                  `
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
                  `
                )
                .in(
                  "transaction_id",
                  transactionIds
                )
                .order("created_at", {
                  ascending: false,
                });

            if (reviewError) {
              console.error(
                "Review error:",
                reviewError
              );
            }

            reviews = reviewData || [];
          }

          return {
            ...shop,
            purchaseCount:
              completedTransactions.length,
            completedTransactions,
            reviews,
          };
        })
      );

      setShops(shopsWithStats);
    } catch (error) {
      console.error(
        "Error loading repair shops:",
        error
      );

      setShops([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRepairShops();

    /*
      Refresh when transactions/profiles change.
    */

    const channel = supabase
      .channel("repair-shop-tab-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchRepairShops(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchRepairShops(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [verifiedOnly]);

  /* =========================================================
     BARANGAYS
     ========================================================= */

  const barangays = useMemo(() => {
    const values = shops
      .map((shop) => shop.barangay)
      .filter(Boolean);

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
      const name =
        shop.business_name ||
        shop.full_name ||
        "Repair Shop";

      const location = shop.barangay || "";

      const buyerType = shop.buyer_type || "";

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        location.toLowerCase().includes(query) ||
        String(
          shop.full_name || ""
        )
          .toLowerCase()
          .includes(query) ||
        String(buyerType)
          .toLowerCase()
          .includes(query);

      const matchesBarangay =
        barangayFilter === "All Barangays" ||
        location === barangayFilter;

      return (
        matchesSearch &&
        matchesBarangay
      );
    });

    return [...result].sort((a, b) => {
      if (sortBy === "purchases") {
        return (
          Number(b.purchaseCount || 0) -
          Number(a.purchaseCount || 0)
        );
      }

      if (sortBy === "reviews") {
        return (
          Number(b.total_reviews || 0) -
          Number(a.total_reviews || 0)
        );
      }

      return (
        Number(b.average_rating || 0) -
        Number(a.average_rating || 0)
      );
    });
  }, [
    shops,
    search,
    barangayFilter,
    sortBy,
  ]);

  /* =========================================================
     STATISTICS
     ========================================================= */

  const totalShops = filteredShops.length;

  const verifiedShopsCount =
    filteredShops.filter(
      (shop) =>
        shop.is_verified === true ||
        String(
          shop.verification_status || ""
        ).toLowerCase() === "verified"
    ).length;

  const totalPurchases =
    filteredShops.reduce(
      (total, shop) =>
        total +
        Number(shop.purchaseCount || 0),
      0
    );

  const totalReviews =
    filteredShops.reduce(
      (total, shop) =>
        total +
        Number(shop.total_reviews || 0),
      0
    );

  const currentBarangay =
    barangayFilter === "All Barangays"
      ? sellerBarangay || "Valenzuela City"
      : barangayFilter;

  /* =========================================================
     HELPERS
     ========================================================= */

  const isVerified = (shop) =>
    shop.is_verified === true ||
    String(
      shop.verification_status || ""
    ).toLowerCase() === "verified";

  const getShopName = (shop) =>
    shop.business_name ||
    shop.full_name ||
    "Repair Shop";

  const getShopAddress = (shop) => {
    if (shop.barangay) {
      return `Brgy. ${shop.barangay}, Valenzuela City`;
    }

    return "Valenzuela City";
  };

  const getShopContact = (shop) =>
    shop.contact_number ||
    "Contact number not provided";

  const getShopRating = (shop) =>
    Number(shop.average_rating || 0);

  const getDeviceCategories = (shop) => {
    const transactions =
      shop.completedTransactions || [];

    const categories = transactions
      .map(
        (transaction) =>
          transaction.listings?.category
      )
      .filter(Boolean);

    return Array.from(
      new Set(categories)
    );
  };

  const getDeviceModels = (shop) => {
    const transactions =
      shop.completedTransactions || [];

    const models = transactions
      .map(
        (transaction) =>
          transaction.listings?.device_model
      )
      .filter(Boolean);

    return Array.from(
      new Set(models)
    );
  };

  const getTier = (rating) => {
    if (rating >= 4.7) return "Platinum";
    if (rating >= 4.5) return "Gold";
    if (rating >= 4) return "Silver";
    return "Bronze";
  };

  const getTierClass = (rating) => {
    if (rating >= 4.7) {
      return "bg-[#3285a1]";
    }

    if (rating >= 4.5) {
      return "bg-amber-500";
    }

    if (rating >= 4) {
      return "bg-emerald-500";
    }

    return "bg-red-500";
  };

  /* =========================================================
     LOAD SHOP DETAILS
     ========================================================= */

  const openShopProfile = async (shop) => {
    setSelectedShop(shop);
    setLoadingShopDetails(true);

    try {
      /*
        Fetch completed transactions again so the
        modal always has fresh information.
      */

      const { data: transactionData, error } =
        await supabase
          .from("transactions")
          .select(
            `
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
            `
          )
          .eq("harvester_id", shop.id)
          .eq("status", "completed")
          .order("completed_at", {
            ascending: false,
          });

      if (error) throw error;

      const transactions =
        transactionData || [];

      const transactionIds =
        transactions.map(
          (transaction) => transaction.id
        );

      let reviews = [];

      if (transactionIds.length > 0) {
        const { data: reviewData, error: reviewError } =
          await supabase
            .from("reviews")
            .select(
              `
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
              `
            )
            .in(
              "transaction_id",
              transactionIds
            )
            .order("created_at", {
              ascending: false,
            });

        if (reviewError) {
          console.error(
            "Could not load reviews:",
            reviewError
          );
        }

        reviews = reviewData || [];
      }

      const updatedShop = {
        ...shop,
        purchaseCount:
          transactions.length,
        completedTransactions:
          transactions,
        reviews,
      };

      setSelectedShop(updatedShop);

      /*
        Also update the shop in the main list.
      */

      setShops((previous) =>
        previous.map((item) =>
          item.id === shop.id
            ? updatedShop
            : item
        )
      );

      setShopTransactions(transactions);
      setShopReviews(reviews);
    } catch (error) {
      console.error(
        "Error loading shop details:",
        error
      );

      setShopTransactions(
        shop.completedTransactions || []
      );

      setShopReviews(
        shop.reviews || []
      );
    } finally {
      setLoadingShopDetails(false);
    }
  };

  /* =========================================================
     MESSAGING
     ========================================================= */

  const loadMessages = async (shop) => {
    if (!session?.user?.id || !shop?.id) {
      return;
    }

    setLoadingMessages(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
            id,
            listing_id,
            sender_id,
            receiver_id,
            content,
            is_read,
            created_at
          `
        )
        .or(
          `and(sender_id.eq.${session.user.id},receiver_id.eq.${shop.id}),and(sender_id.eq.${shop.id},receiver_id.eq.${session.user.id})`
        )
        .order("created_at", {
          ascending: true,
        });

      if (error) throw error;

      setMessages(data || []);

      /*
        Mark messages from the repair shop as read.
      */

      const unreadIds = (data || [])
        .filter(
          (message) =>
            message.receiver_id ===
              session.user.id &&
            !message.is_read
        )
        .map((message) => message.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadIds);
      }
    } catch (error) {
      console.error(
        "Error loading messages:",
        error
      );

      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const openMessageModal = async (shop) => {
    setMessageShop(shop);
    setMessageText("");

    await loadMessages(shop);
  };

  useEffect(() => {
    if (!messageShop?.id || !session?.user?.id) {
      return;
    }

    const channel = supabase
      .channel(
        `repair-shop-messages-${messageShop.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${session.user.id}`,
        },
        (payload) => {
          const message = payload.new;

          if (
            message.sender_id ===
            messageShop.id
          ) {
            setMessages((previous) => [
              ...previous,
              message,
            ]);

            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", message.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    messageShop?.id,
    session?.user?.id,
  ]);

  const sendMessage = async () => {
    const content = messageText.trim();

    if (
      !content ||
      !session?.user?.id ||
      !messageShop?.id
    ) {
      return;
    }

    setSendingMessage(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: messageShop.id,
          content,
          listing_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((previous) => [
        ...previous,
        data,
      ]);

      setMessageText("");
    } catch (error) {
      console.error(
        "Error sending message:",
        error
      );

      alert(
        "Unable to send message. Please try again."
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /* =========================================================
     RETURN
     ========================================================= */

  return (
    <div className="animate-in fade-in duration-500 space-y-3">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="rounded-[1.25rem] bg-gradient-to-r from-[#2d86a3] to-[#14516d] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-white/60">
              <MapPin size={11} />

              Brgy. {currentBarangay}
            </div>

            <h2 className="mt-1 text-xl font-black">
              Repair Shops Near You
            </h2>

            <p className="mt-0.5 text-[10px] text-white/60">
              Find verified repair shops and buyers
              for your electronic devices
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

        {/* Search */}
        <div className="relative mt-4">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search shop, owner, barangay..."
            className="w-full rounded-xl border border-white/15 bg-white/10 px-9 py-2.5 text-[10px] text-white placeholder:text-white/40 outline-none transition focus:bg-white/15"
          />
        </div>

        {/* View buttons */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setViewMode("list")
            }
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
            onClick={() =>
              setViewMode("map")
            }
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
            onClick={() =>
              fetchRepairShops(true)
            }
            disabled={refreshing}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[9px] font-black text-white hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw
              size={11}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={barangayFilter}
          onChange={(e) =>
            setBarangayFilter(
              e.target.value
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 outline-none"
        >
          {barangays.map((barangay) => (
            <option
              key={barangay}
              value={barangay}
            >
              {barangay}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value)
          }
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 outline-none"
        >
          <option value="rating">
            Top Rated
          </option>

          <option value="purchases">
            Most Purchases
          </option>

          <option value="reviews">
            Most Reviews
          </option>
        </select>

        <button
          type="button"
          onClick={() =>
            setVerifiedOnly(
              (value) => !value
            )
          }
          className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-bold transition ${
            verifiedOnly
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <BadgeCheck
            size={11}
            className="mr-1 inline"
          />

          Verified
        </button>

        {sellerBarangay && (
          <button
            type="button"
            onClick={() => {
              setBarangayFilter(
                sellerBarangay
              );

              setViewMode("map");
            }}
            className="rounded-lg border border-[#3285a1]/20 bg-[#3285a1]/5 px-2.5 py-1.5 text-[9px] font-bold text-[#3285a1]"
          >
            <MapPin
              size={11}
              className="mr-1 inline"
            />

            My Barangay
          </button>
        )}
      </div>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      {!loading &&
        filteredShops.length > 0 && (
          <div>
            <div className="mb-2">
              <h3 className="text-sm font-black text-slate-700">
                Repair Shop Overview
              </h3>

              <p className="text-[9px] text-slate-400">
                Registered repair shops and completed
                purchase activity
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* Total */}
              <div className="rounded-xl bg-blue-50 p-3">
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                  <Building2
                    size={11}
                    className="text-[#3285a1]"
                  />

                  Total Shops
                </div>

                <p className="mt-1 text-lg font-black text-slate-700">
                  {totalShops}
                </p>

                <p className="text-[8px] text-slate-400">
                  selected area
                </p>
              </div>

              {/* Verified */}
              <div className="rounded-xl bg-emerald-50 p-3">
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                  <BadgeCheck
                    size={11}
                    className="text-emerald-500"
                  />

                  Verified
                </div>

                <p className="mt-1 text-lg font-black text-slate-700">
                  {verifiedShopsCount}
                </p>

                <p className="text-[8px] text-slate-400">
                  admin verified
                </p>
              </div>

              {/* Reviews */}
              <div className="rounded-xl bg-purple-50 p-3">
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                  <Star
                    size={11}
                    className="text-purple-500"
                  />

                  Reviews
                </div>

                <p className="mt-1 text-lg font-black text-slate-700">
                  {totalReviews}
                </p>

                <p className="text-[8px] text-slate-400">
                  submitted reviews
                </p>
              </div>

              {/* Purchases */}
              <div className="rounded-xl bg-amber-50 p-3">
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                  <Wrench
                    size={11}
                    className="text-amber-500"
                  />

                  Purchases
                </div>

                <p className="mt-1 text-lg font-black text-slate-700">
                  {totalPurchases}
                </p>

                <p className="text-[8px] text-slate-400">
                  completed
                </p>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          BARANGAY NOTICE
      ===================================================== */}

      {sellerBarangay && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <div className="flex items-start gap-2">
            <MapPin
              size={13}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <p className="text-[9px] leading-relaxed text-blue-700">
              <span className="font-black">
                Barangay-Locked View:
              </span>{" "}
              Repair shops are filtered according
              to the seller's registered barangay.
              Exact shop addresses are not stored
              in the current profiles table.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-12 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#3285a1]" />

          <p className="mt-3 text-[10px] text-slate-400">
            Loading repair shops...
          </p>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <Building2
            className="mx-auto mb-3 text-slate-200"
            size={34}
          />

          <h4 className="text-sm font-black text-slate-700">
            No repair shops found
          </h4>

          <p className="mt-1 text-[9px] text-slate-400">
            Try changing your search,
            barangay, or verification filter.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setBarangayFilter(
                "All Barangays"
              );
            }}
            className="mt-4 rounded-lg bg-[#3285a1] px-4 py-2 text-[9px] font-black text-white"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* =================================================
              MAP VIEW
          ================================================= */}

          {viewMode === "map" && (
            <div>
              <div className="mb-2">
                <h3 className="text-sm font-black text-slate-700">
                  Repair Shop Map —{" "}
                  {currentBarangay}
                </h3>

                <p className="text-[9px] text-slate-400">
                  Click a repair shop pin to view
                  its profile.
                </p>
              </div>

              <RepairShopMap
                shops={filteredShops}
                barangay={currentBarangay}
                sellerBarangay={
                  sellerBarangay
                }
                onShopClick={
                  openShopProfile
                }
              />
            </div>
          )}

          {/* =================================================
              SHOP LIST
          ================================================= */}

          {viewMode === "list" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-700">
                    Repair Shops
                  </h3>

                  <p className="text-[9px] text-slate-400">
                    Click a shop to view its profile
                  </p>
                </div>

                <span className="rounded-lg bg-[#3285a1]/10 px-2 py-1 text-[8px] font-black text-[#3285a1]">
                  {filteredShops.length} Shops
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredShops.map(
                  (shop) => {
                    const rating =
                      getShopRating(
                        shop
                      );

                    const tier =
                      getTier(rating);

                    return (
                      <button
                        key={shop.id}
                        type="button"
                        onClick={() =>
                          openShopProfile(
                            shop
                          )
                        }
                        className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {/* Name */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="truncate text-[11px] font-black text-slate-800">
                                {getShopName(
                                  shop
                                )}
                              </h4>

                              {isVerified(
                                shop
                              ) && (
                                <BadgeCheck
                                  size={
                                    13
                                  }
                                  className="shrink-0 text-emerald-500"
                                  fill="white"
                                />
                              )}
                            </div>

                            <p className="mt-0.5 text-[8px] text-slate-400">
                              {shop.purchaseCount ||
                                0}{" "}
                              completed
                              purchases
                            </p>
                          </div>

                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getTierClass(
                              rating
                            )}`}
                            title={tier}
                          />
                        </div>

                        {/* Rating */}
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(
                              (star) => (
                                <Star
                                  key={
                                    star
                                  }
                                  size={
                                    11
                                  }
                                  className="text-amber-400"
                                  fill={
                                    star <=
                                    Math.round(
                                      rating
                                    )
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              )
                            )}
                          </div>

                          <span className="text-[9px] font-black text-slate-700">
                            {rating > 0
                              ? rating.toFixed(
                                  1
                                )
                              : "New"}
                          </span>

                          <span className="text-[8px] text-slate-400">
                            (
                            {shop.total_reviews ||
                              0}{" "}
                            reviews)
                          </span>
                        </div>

                        {/* Information */}
                        <div className="mt-3 space-y-1.5 text-[9px]">
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin
                              size={
                                10
                              }
                            />

                            <span>
                              Brgy.{" "}
                              {shop.barangay ||
                                "Not provided"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400">
                            <Wrench
                              size={
                                10
                              }
                            />

                            <span>
                              {shop.buyer_type ||
                                "Repair shop buyer"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400">
                            <ShoppingBag
                              size={
                                10
                              }
                            />

                            <span>
                              {shop.purchaseCount ||
                                0}{" "}
                              completed
                              purchases
                            </span>
                          </div>
                        </div>

                        {/* Device categories */}
                        {getDeviceCategories(
                          shop
                        ).length >
                          0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {getDeviceCategories(
                              shop
                            )
                              .slice(
                                0,
                                3
                              )
                              .map(
                                (
                                  category
                                ) => (
                                  <span
                                    key={
                                      category
                                    }
                                    className="rounded-full bg-slate-50 px-2 py-1 text-[7px] font-medium text-slate-500"
                                  >
                                    {
                                      category
                                    }
                                  </span>
                                )
                              )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-[8px] text-slate-400">
                            View shop
                            profile
                          </span>

                          <ChevronRight
                            size={
                              13
                            }
                            className="text-[#3285a1] transition group-hover:translate-x-1"
                          />
                        </div>
                      </button>
                    );
                  }
                )}
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
            if (
              e.target ===
              e.currentTarget
            ) {
              setSelectedShop(null);
            }
          }}
        >
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            {/* Header */}
            <div className="relative h-36 bg-gradient-to-r from-[#3285a1] to-[#14516d]">
              <button
                type="button"
                onClick={() =>
                  setSelectedShop(null)
                }
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

            {/* Profile */}
            <div className="px-8 pb-8 pt-16">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900">
                      {getShopName(
                        selectedShop
                      )}
                    </h2>

                    {isVerified(
                      selectedShop
                    ) && (
                      <BadgeCheck
                        size={25}
                        className="text-emerald-600"
                        fill="white"
                      />
                    )}
                  </div>

                  {selectedShop.full_name &&
                    selectedShop.full_name !==
                      selectedShop.business_name && (
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedShop.full_name}
                      </p>
                    )}

                  {/* Rating */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(
                        (star) => (
                          <Star
                            key={star}
                            size={17}
                            className="text-amber-400"
                            fill={
                              star <=
                              Math.round(
                                getShopRating(
                                  selectedShop
                                )
                              )
                                ? "currentColor"
                                : "none"
                            }
                          />
                        )
                      )}
                    </div>

                    <span className="text-lg font-black text-slate-800">
                      {getShopRating(
                        selectedShop
                      ).toFixed(1)}
                    </span>

                    <span className="text-sm text-slate-400">
                      (
                      {selectedShop.total_reviews ||
                        0}{" "}
                      reviews)
                    </span>
                  </div>
                </div>

                <div
                  className={`self-start rounded-full border px-4 py-2 text-xs font-black ${
                    getShopRating(
                      selectedShop
                    ) >= 4.5
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {getShopRating(
                    selectedShop
                  ) >= 4.5
                    ? "🏅 Top Rated"
                    : "Repair Shop"}
                </div>
              </div>

              {/* =================================================
                  INFORMATION
              ================================================= */}

              <div className="mt-7 rounded-[1.5rem] bg-slate-50 p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Barangay */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <MapPin size={19} />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Registered Barangay
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {getShopAddress(
                          selectedShop
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <Phone size={19} />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Contact Number
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {getShopContact(
                          selectedShop
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Purchases */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <ShoppingBag size={19} />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Completed Purchases
                      </p>

                      <p className="mt-1 text-sm font-black text-[#3285a1]">
                        {selectedShop.purchaseCount ||
                          0}
                      </p>
                    </div>
                  </div>

                  {/* Verification */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                      <BadgeCheck size={19} />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Verification
                      </p>

                      <p className="mt-1 text-sm font-black text-emerald-600">
                        {isVerified(
                          selectedShop
                        )
                          ? "Verified Repair Shop"
                          : "Verification Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* =================================================
                  DEVICES PURCHASED
              ================================================= */}

              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-700">
                      Devices Purchased
                    </h3>

                    <p className="text-[9px] text-slate-400">
                      Categories from completed transactions
                    </p>
                  </div>

                  <Package
                    size={20}
                    className="text-[#3285a1]"
                  />
                </div>

                {getDeviceCategories(
                  selectedShop
                ).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getDeviceCategories(
                      selectedShop
                    ).map((category) => (
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

              {/* =================================================
                  RECENT PURCHASES
              ================================================= */}

              <div className="mt-7">
                <h3 className="text-lg font-black text-slate-700">
                  Recent Purchases
                </h3>

                {loadingShopDetails ? (
                  <div className="mt-3 flex items-center justify-center rounded-xl bg-slate-50 p-6">
                    <Loader2
                      size={20}
                      className="animate-spin text-[#3285a1]"
                    />
                  </div>
                ) : shopTransactions.length >
                  0 ? (
                  <div className="mt-3 space-y-2">
                    {shopTransactions
                      .slice(0, 5)
                      .map(
                        (
                          transaction
                        ) => (
                          <div
                            key={
                              transaction.id
                            }
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <Package
                                  size={
                                    17
                                  }
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-black text-slate-700">
                                  {transaction
                                    .listings
                                    ?.device_model ||
                                    "Device"}
                                </p>

                                <p className="text-[8px] text-slate-400">
                                  {transaction
                                    .listings
                                    ?.category ||
                                    "Unknown category"}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-black text-[#3285a1]">
                                ₱
                                {Number(
                                  transaction.amount ||
                                    0
                                ).toLocaleString()}
                              </p>

                              <p className="text-[8px] text-emerald-500">
                                Completed
                              </p>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-slate-50 p-5 text-center">
                    <ShoppingBag
                      size={22}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      No completed purchases yet.
                    </p>
                  </div>
                )}
              </div>

              {/* =================================================
                  REVIEWS
              ================================================= */}

              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-700">
                      Customer Reviews
                    </h3>

                    <p className="text-[9px] text-slate-400">
                      Reviews from completed transactions
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star
                      size={15}
                      className="text-amber-400"
                      fill="currentColor"
                    />

                    <span className="text-sm font-black">
                      {getShopRating(
                        selectedShop
                      ).toFixed(1)}
                    </span>
                  </div>
                </div>

                {shopReviews.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {shopReviews
                      .slice(0, 5)
                      .map((review) => (
                        <div
                          key={
                            review.id
                          }
                          className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400">
                                <User
                                  size={
                                    15
                                  }
                                />
                              </div>

                              <div>
                                <p className="text-xs font-bold text-slate-700">
                                  Customer
                                </p>

                                <p className="text-[8px] text-slate-400">
                                  {review.created_at
                                    ? new Date(
                                        review.created_at
                                      ).toLocaleDateString()
                                    : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Star
                                size={
                                  12
                                }
                                className="text-amber-400"
                                fill="currentColor"
                              />

                              <span className="text-xs font-black">
                                {review.overall_rating ||
                                  0}
                              </span>
                            </div>
                          </div>

                          {review.comment && (
                            <p className="mt-3 text-xs leading-relaxed text-slate-600">
                              "{review.comment}"
                            </p>
                          )}

                          {review.recommend && (
                            <div className="mt-2 flex items-center gap-1 text-[8px] font-bold text-emerald-600">
                              <CheckCircle2
                                size={
                                  11
                                }
                              />

                              Recommended
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-slate-50 p-5 text-center">
                    <Star
                      size={22}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      No reviews yet.
                    </p>
                  </div>
                )}
              </div>

              {/* =================================================
                  ACTION BUTTONS
              ================================================= */}

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedShop(
                      null
                    )
                  }
                  className="rounded-2xl bg-slate-100 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openMessageModal(
                      selectedShop
                    )
                  }
                  className="flex items-center justify-center gap-3 rounded-2xl bg-[#3285a1] py-4 text-sm font-black text-white transition hover:bg-[#286f88]"
                >
                  <MessageSquare
                    size={19}
                  />

                  Send Message
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
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setMessageShop(null);
            }
          }}
        >
          <div className="flex h-[600px] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            {/* Message header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#3285a1] to-[#14516d] p-5 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Building2 size={22} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {getShopName(
                      messageShop
                    )}
                  </p>

                  <p className="mt-0.5 text-[9px] text-white/60">
                    Repair Shop
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMessageShop(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2
                    size={25}
                    className="animate-spin text-[#3285a1]"
                  />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageSquare
                    size={35}
                    className="text-slate-200"
                  />

                  <p className="mt-3 text-sm font-black text-slate-600">
                    Start a conversation
                  </p>

                  <p className="mt-1 max-w-[250px] text-[9px] text-slate-400">
                    Send a message to{" "}
                    {getShopName(
                      messageShop
                    )}{" "}
                    about your device or transaction.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map(
                    (message) => {
                      const isMine =
                        message.sender_id ===
                        session?.user?.id;

                      return (
                        <div
                          key={
                            message.id
                          }
                          className={`flex ${
                            isMine
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              isMine
                                ? "rounded-br-md bg-[#3285a1] text-white"
                                : "rounded-bl-md bg-white text-slate-700 shadow-sm"
                            }`}
                          >
                            <p className="break-words text-xs leading-relaxed">
                              {
                                message.content
                              }
                            </p>

                            <p
                              className={`mt-1 text-[7px] ${
                                isMine
                                  ? "text-white/60"
                                  : "text-slate-400"
                              }`}
                            >
                              {message.created_at
                                ? new Date(
                                    message.created_at
                                  ).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "numeric",
                                      minute:
                                        "2-digit",
                                    }
                                  )
                                : ""}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-slate-100 bg-white p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) =>
                    setMessageText(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                        "Enter" &&
                      !e.shiftKey
                    ) {
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
                  onClick={
                    sendMessage
                  }
                  disabled={
                    sendingMessage ||
                    !messageText.trim()
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3285a1] text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sendingMessage ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>

              <p className="mt-1.5 px-1 text-[7px] text-slate-400">
                Press Enter to send · Shift + Enter
                for a new line
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRepairShopsTab;