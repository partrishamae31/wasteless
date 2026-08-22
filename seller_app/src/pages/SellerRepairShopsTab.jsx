import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

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
} from "lucide-react";

/**
 * SellerRepairShopsTab
 *
 * Displays verified repair shops from the profiles table.
 *
 * Expected profile fields already used by the seller dashboard:
 * - id
 * - role
 * - business_name
 * - full_name
 * - barangay
 * - verification_status
 * - average_rating
 * - total_reviews
 *
 * Optional fields are handled safely:
 * - specialties / specialty / categories
 * - contact_number
 * - price_range
 */

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

const MapResizeFix = () => {
  const map = useMap();

  useEffect(() => {
    // Leaflet needs a moment to calculate the size
    // when the map becomes visible after being hidden.
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

const RepairShopMap = ({ shops, barangay, sellerBarangay, onShopClick }) => {
  const coordinates = BARANGAY_COORDINATES[barangay] ||
    BARANGAY_COORDINATES[sellerBarangay] || [14.676, 120.983];

  console.log("MAP COORDINATES:", coordinates);
  console.log("MAP BARANGAY:", barangay);
  console.log("MAP SHOPS:", shops);

  return (
    <div className="relative z-0 isolate w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Barangay label */}
      <div className="absolute left-4 top-4 z-[1000] rounded-xl bg-white px-3 py-2 shadow-lg">
        <p className="text-[9px] font-black text-slate-700">Brgy. {barangay}</p>

        <p className="text-[7px] text-slate-400">Valenzuela City</p>
      </div>

      {/* Shop count */}
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
        <Marker position={coordinates}>
          <Popup>
            <div className="text-center">
              <p className="font-black text-slate-800">{barangay}</p>
              <p className="text-xs text-slate-500">
                Repair shops in this barangay
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Repair shop markers */}
        {shops.map((shop, index) => {
          const markerPosition = [
            coordinates[0] + ((index % 3) - 1) * 0.002,
            coordinates[1] + (Math.floor(index / 3) - 1) * 0.002,
          ];

          return (
            <Marker
              key={shop.id}
              position={markerPosition}
              eventHandlers={{
                click: () => onShopClick(shop),
              }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-black text-slate-800">
                    {shop.business_name || shop.full_name || "Repair Shop"}
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
                      {Number(shop.average_rating || 0).toFixed(1)}
                    </span>
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
          <span className="h-3 w-3 rounded-full bg-[#3285a1]" />
          Repair Shop
        </div>

        <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-500">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Barangay Center
        </div>
      </div>
    </div>
  );
};
const SellerRepairShopsTab = ({ session, sellerBarangay = "" }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("All Barangays");
  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    const fetchRepairShops = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "repair_shop");

        console.log("ALL PROFILES:", data);
        console.log("REPAIR SHOP DETAILS:", data?.[0]);
        console.log("verification_status:", data?.[0]?.verification_status);
        console.log("status:", data?.[0]?.status);
        console.log("is_verified:", data?.[0]?.is_verified);

        if (error) throw error;

        const verifiedShops = (data || []).filter((shop) => {
          if (!verifiedOnly) return true;

          return (
            shop.is_verified === true ||
            shop.verification_status?.toLowerCase() === "verified"
          );
        });

        const withPurchaseCounts = await Promise.all(
          verifiedShops.map(async (shop) => {
            const { count } = await supabase
              .from("transactions")
              .select("id", { count: "exact", head: true })
              .eq("harvester_id", shop.id)
              .eq("status", "completed");

            return {
              ...shop,
              purchaseCount: count || 0,
            };
          }),
        );

        setShops(withPurchaseCounts);
      } catch (error) {
        console.error("Error loading repair shops:", error);
        setShops([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRepairShops();
  }, [verifiedOnly]);

  const barangays = useMemo(() => {
    const values = shops.map((shop) => shop.barangay).filter(Boolean);

    return ["All Barangays", ...Array.from(new Set(values)).sort()];
  }, [shops]);

  const filteredShops = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = shops.filter((shop) => {
      const name = shop.business_name || shop.full_name || "Repair Shop";

      const location = shop.barangay || "";

      const specialties =
        shop.specialties || shop.specialty || shop.categories || "";

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        location.toLowerCase().includes(query) ||
        String(specialties).toLowerCase().includes(query) ||
        String(shop.full_name || "")
          .toLowerCase()
          .includes(query);

      const matchesBarangay =
        barangayFilter === "All Barangays" || location === barangayFilter;

      const matchesOpen =
        !openOnly ||
        shop.is_open === true ||
        shop.open_now === true ||
        String(shop.business_status || "").toLowerCase() === "open";

      return matchesSearch && matchesBarangay && matchesOpen;
    });

    return result.sort((a, b) => {
      if (sortBy === "purchases") {
        return (b.purchaseCount || 0) - (a.purchaseCount || 0);
      }

      return Number(b.average_rating || 0) - Number(a.average_rating || 0);
    });
  }, [shops, search, barangayFilter, sortBy, openOnly]);

  const totalShops = filteredShops.length;

  const verifiedShopsCount = filteredShops.filter(
    (shop) =>
      shop.is_verified === true ||
      String(shop.verification_status || "").toLowerCase() === "verified",
  ).length;

  const openShopsCount = filteredShops.filter(
    (shop) =>
      shop.is_open === true ||
      shop.open_now === true ||
      String(shop.business_status || "").toLowerCase() === "open",
  ).length;

  const totalPurchases = filteredShops.reduce(
    (total, shop) => total + Number(shop.purchaseCount || 0),
    0,
  );

  const currentBarangay =
    barangayFilter === "All Barangays"
      ? sellerBarangay || "Valenzuela City"
      : barangayFilter;

  const getSpecialties = (shop) => {
    const raw =
      shop.specialties ||
      shop.specialty ||
      shop.categories ||
      "Mobile Phones, Tablets, Laptops";

    if (Array.isArray(raw)) return raw;

    return String(raw)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const handleContact = (shop) => {
    setSelectedShop(shop);
  };

  const getShopAddress = (shop) => {
    return (
      shop.address ||
      shop.business_address ||
      (shop.barangay
        ? `Brgy. ${shop.barangay}, Valenzuela City`
        : "Valenzuela City")
    );
  };

  const getShopHours = (shop) => {
    return (
      shop.opening_hours ||
      shop.operating_hours ||
      shop.business_hours ||
      "Business hours not provided"
    );
  };

  const getShopContact = (shop) => {
    return (
      shop.contact_number ||
      shop.phone ||
      shop.mobile_number ||
      "Contact number not provided"
    );
  };

  const getAcceptedDevices = (shop) => {
    const raw =
      shop.accepted_devices ||
      shop.acceptedDevices ||
      shop.specialties ||
      shop.specialty ||
      shop.categories;

    if (Array.isArray(raw) && raw.length > 0) {
      return raw;
    }

    if (typeof raw === "string" && raw.trim()) {
      return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return ["Smartphones", "Tablets", "Laptops", "Accessories"];
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-3">
      {/* =========================================================
        REPAIR SHOP HEADER
    ========================================================= */}
      <div className="rounded-[1.25rem] bg-gradient-to-r from-[#2d86a3] to-[#14516d] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-white/60">
              <MapPin size={11} />
              Brgy. {currentBarangay}
            </div>

            <h2 className="mt-1 text-xl font-black">Repair Shops Near You</h2>

            <p className="mt-0.5 text-[10px] text-white/60">
              {totalShops} registered buyers in your barangay
            </p>
          </div>

          {/* Shop count */}
          <div className="hidden sm:flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, specialty..."
            className="w-full rounded-xl border border-white/15 bg-white/10 px-9 py-2.5 text-[10px] text-white placeholder:text-white/40 outline-none transition focus:bg-white/15"
          />
        </div>

        {/* View buttons */}
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
        </div>
      </div>

      {/* =========================================================
        FILTERS
    ========================================================= */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={barangayFilter}
          onChange={(e) => setBarangayFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 outline-none"
        >
          {barangays.map((barangay) => (
            <option key={barangay}>{barangay}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 outline-none"
        >
          <option value="rating">Top Rated</option>
          <option value="purchases">Most Purchases</option>
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

        <button
          type="button"
          onClick={() => setOpenOnly((value) => !value)}
          className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-bold transition ${
            openOnly
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <Clock3 size={11} className="mr-1 inline" />
          Open Now
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

      {/* =========================================================
        STATISTICS
    ========================================================= */}
      {!loading && filteredShops.length > 0 && (
        <div>
          <div className="mb-2">
            <h3 className="text-sm font-black text-slate-700">
              Repair Shop Map — {currentBarangay}
            </h3>

            <p className="text-[9px] text-slate-400">
              Registered buyers within your barangay
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* Total Shops */}
            <div className="rounded-xl bg-blue-50 p-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                <Building2 size={11} className="text-[#3285a1]" />
                Total Shops
              </div>

              <p className="mt-1 text-lg font-black text-slate-700">
                {totalShops}
              </p>

              <p className="text-[8px] text-slate-400">
                in Brgy. {currentBarangay}
              </p>
            </div>

            {/* Verified */}
            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                <BadgeCheck size={11} className="text-emerald-500" />
                Verified
              </div>

              <p className="mt-1 text-lg font-black text-slate-700">
                {verifiedShopsCount}
              </p>

              <p className="text-[8px] text-slate-400">admin-verified</p>
            </div>

            {/* Open */}
            <div className="rounded-xl bg-purple-50 p-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                <Clock3 size={11} className="text-purple-500" />
                Open Now
              </div>

              <p className="mt-1 text-lg font-black text-slate-700">
                {openShopsCount}
              </p>

              <p className="text-[8px] text-slate-400">accepting drop-offs</p>
            </div>

            {/* Purchases */}
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                <Wrench size={11} className="text-amber-500" />
                Total Purchases
              </div>

              <p className="mt-1 text-lg font-black text-slate-700">
                {totalPurchases}
              </p>

              <p className="text-[8px] text-slate-400">completed</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
        BARANGAY LOCK NOTICE
    ========================================================= */}
      {sellerBarangay && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <div className="flex items-start gap-2">
            <MapPin size={13} className="mt-0.5 shrink-0 text-blue-600" />

            <p className="text-[9px] leading-relaxed text-blue-700">
              <span className="font-black">Barangay-Locked View:</span> Only
              repair shops registered within{" "}
              <span className="font-black">Brgy. {sellerBarangay}</span> are
              shown. Exact shop addresses are only revealed after initiating
              contact.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
        CONTENT
    ========================================================= */}
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
            There are no verified repair shops in{" "}
            {barangayFilter === "All Barangays"
              ? "your selected area"
              : `Brgy. ${barangayFilter}`}
            .
          </p>
        </div>
      ) : (
        <>
          {/* =====================================================
            MAP
        ===================================================== */}
          <RepairShopMap
            shops={filteredShops}
            barangay={currentBarangay}
            sellerBarangay={sellerBarangay}
            onShopClick={(shop) => setSelectedShop(shop)}
          />

          {/* =====================================================
            SHOP CARDS
        ===================================================== */}
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-700">
                  Repair Shops
                </h3>

                <p className="text-[9px] text-slate-400">
                  Click a shop to view details
                </p>
              </div>

              <span className="rounded-lg bg-[#3285a1]/10 px-2 py-1 text-[8px] font-black text-[#3285a1]">
                {filteredShops.length} Shops
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredShops.map((shop) => {
                const rating = Number(shop.average_rating || 0);

                const specialties = getSpecialties(shop);

                const shopName =
                  shop.business_name || shop.full_name || "Repair Shop";

                const isOpen =
                  shop.is_open === true ||
                  shop.open_now === true ||
                  String(shop.business_status || "").toLowerCase() === "open";

                /* Tier */
                const tier =
                  rating >= 4.7
                    ? "Platinum"
                    : rating >= 4.5
                      ? "Gold"
                      : rating >= 4
                        ? "Silver"
                        : "Bronze";

                const tierDot =
                  tier === "Platinum"
                    ? "bg-[#3285a1]"
                    : tier === "Gold"
                      ? "bg-amber-500"
                      : tier === "Silver"
                        ? "bg-emerald-500"
                        : "bg-red-500";

                return (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => setSelectedShop(shop)}
                    className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* Shop name */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-[11px] font-black text-slate-800">
                          {shopName}
                        </h4>

                        <p className="mt-0.5 text-[8px] text-slate-400">
                          {shop.purchaseCount || 0} purchases completed
                        </p>
                      </div>

                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tierDot}`}
                      />
                    </div>

                    {/* Details */}
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-[9px]">
                      <span className="text-slate-400">Rating</span>

                      <span className="font-black text-[#3285a1]">
                        {rating > 0
                          ? `${rating.toFixed(1)} ★ (${shop.total_reviews || 0})`
                          : "New"}
                      </span>

                      <span className="text-slate-400">Response</span>

                      <span className="text-slate-500">
                        {shop.response_time || shop.responseTime || "< 1 hour"}
                      </span>

                      <span className="text-slate-400">Hours</span>

                      <span className="text-right text-slate-500">
                        {isOpen ? (
                          <>
                            Open <span className="text-emerald-500">●</span>
                          </>
                        ) : (
                          <>
                            Closed <span className="text-red-500">●</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Specialty tags */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {specialties.slice(0, 3).map((specialty, index) => (
                        <span
                          key={`${shop.id}-specialty-${index}`}
                          className="rounded-full bg-slate-50 px-2 py-1 text-[7px] font-medium text-slate-500"
                        >
                          {specialty}
                        </span>
                      ))}

                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[7px] font-bold text-emerald-600">
                        ✓ Verified
                      </span>
                    </div>

                    {/* Location */}
                    <div className="mt-3 flex items-center gap-1 text-[8px] text-slate-400">
                      <MapPin size={9} />
                      Brgy. {shop.barangay || currentBarangay}, Valenzuela City
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* =========================================================
        REPAIR SHOP PROFILE MODAL
        KEEP YOUR EXISTING MODAL HERE
    ========================================================= */}

      {/* REPAIR SHOP PROFILE MODAL */}
      {selectedShop && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedShop(null);
            }
          }}
        >
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            {/* Header */}
            <div className="relative h-40 bg-gradient-to-r from-[#3285a1] to-[#14516d]">
              <button
                type="button"
                onClick={() => setSelectedShop(null)}
                className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <X size={24} />
              </button>

              <div className="absolute left-8 -bottom-12">
                <div className="flex h-28 w-28 items-center justify-center rounded-[1.5rem] border-[6px] border-white bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-xl">
                  <Building2 size={52} />
                </div>
              </div>
            </div>

            {/* Profile */}
            <div className="px-8 pb-8 pt-16">
              {/* Name + badge */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-black text-slate-900">
                      {selectedShop.business_name ||
                        selectedShop.full_name ||
                        "Repair Shop"}
                    </h2>

                    <BadgeCheck
                      size={27}
                      className="text-emerald-600"
                      fill="white"
                    />
                  </div>

                  {selectedShop.full_name &&
                    selectedShop.full_name !== selectedShop.business_name && (
                      <p className="mt-1 text-lg text-slate-500">
                        {selectedShop.full_name}
                      </p>
                    )}

                  {/* Rating */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          className="text-amber-400"
                          fill={
                            star <=
                            Math.round(Number(selectedShop.average_rating || 0))
                              ? "currentColor"
                              : "none"
                          }
                        />
                      ))}
                    </div>

                    <span className="text-xl font-black text-slate-800">
                      {Number(selectedShop.average_rating || 0).toFixed(1)}
                    </span>

                    <span className="text-sm text-slate-400">
                      ({selectedShop.total_reviews || 0} reviews)
                    </span>
                  </div>
                </div>

                {/* Gold / Partner */}
                <div
                  className={`self-start rounded-full border px-5 py-2 text-sm font-black ${
                    Number(selectedShop.average_rating || 0) >= 4.5
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {Number(selectedShop.average_rating || 0) >= 4.5
                    ? "🏅 Gold"
                    : "Partner"}
                </div>
              </div>

              {/* Information card */}
              <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-6">
                <div className="space-y-5">
                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <MapPin size={21} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-400">
                        Address
                      </p>
                      <p className="mt-1 text-lg font-medium text-slate-700">
                        {getShopAddress(selectedShop)}
                      </p>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <Clock3 size={21} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-400">
                        Hours
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-lg font-medium text-slate-700">
                          {getShopHours(selectedShop)}
                        </p>

                        {(selectedShop.is_open === true ||
                          selectedShop.open_now === true ||
                          String(
                            selectedShop.business_status || "",
                          ).toLowerCase() === "open") && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-700">
                            Open Now
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <Phone size={21} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-400">
                        Contact
                      </p>

                      <p className="mt-1 text-lg font-medium text-slate-700">
                        {getShopContact(selectedShop)}
                      </p>
                    </div>
                  </div>

                  {/* Response time */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3285a1] shadow-sm">
                      <Send size={21} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-400">
                        Response Time
                      </p>

                      <p className="mt-1 text-lg font-medium text-slate-700">
                        {selectedShop.response_time ||
                          selectedShop.responseTime ||
                          "< 1 hour"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accepted Devices */}
              <div className="mt-8">
                <h3 className="text-xl font-black text-slate-700">
                  Accepted Devices
                </h3>

                <div className="mt-4 flex flex-wrap gap-3">
                  {getAcceptedDevices(selectedShop).map((device, index) => (
                    <span
                      key={`${selectedShop.id}-device-${index}`}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-bold text-emerald-700"
                    >
                      {device}
                    </span>
                  ))}
                </div>
              </div>

              {/* Purchases / Pricing */}
              <div className="mt-7 rounded-[1.25rem] border border-[#3285a1]/20 bg-[#3285a1]/5 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-[#3285a1]">
                    <Wrench size={23} />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-400">
                      Purchases · Pricing
                    </p>

                    <p className="mt-1 text-xl font-black text-[#3285a1]">
                      {selectedShop.purchaseCount || 0} completed
                      {" · "}
                      {selectedShop.price_range || "Price not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedShop(null)}
                  className="rounded-2xl bg-slate-100 py-4 text-base font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedShop(null);

                    // If your parent component has messaging functionality,
                    // connect it here.
                    console.log("Message repair shop:", selectedShop.id);
                  }}
                  className="flex items-center justify-center gap-3 rounded-2xl bg-[#3285a1] py-4 text-base font-black text-white transition hover:bg-[#286f88]"
                >
                  <MessageSquare size={21} />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRepairShopsTab;
