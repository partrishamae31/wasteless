import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  BadgeCheck,
  Building2,
  Clock3,
  MapPin,
  MessageSquare,
  Search,
  Star,
  Wrench,
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
const SellerRepairShopsTab = ({ session, sellerBarangay = "" }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] = useState(
    sellerBarangay || "All Barangays",
  );
  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    const fetchRepairShops = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "repair_shop");

        if (error) throw error;

        const verifiedShops = (data || []).filter((shop) => {
          if (!verifiedOnly) return true;

          return (
            shop.verification_status?.toLowerCase() === "verified" ||
            shop.status?.toLowerCase() === "verified"
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
    const values = shops
      .map((shop) => shop.barangay)
      .filter(Boolean);

    return ["All Barangays", ...Array.from(new Set(values)).sort()];
  }, [shops]);

  const filteredShops = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = shops.filter((shop) => {
      const name =
        shop.business_name ||
        shop.full_name ||
        "Repair Shop";

      const location = shop.barangay || "";

      const specialties =
        shop.specialties ||
        shop.specialty ||
        shop.categories ||
        "";

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        location.toLowerCase().includes(query) ||
        String(specialties).toLowerCase().includes(query) ||
        String(shop.full_name || "").toLowerCase().includes(query);

      const matchesBarangay =
        barangayFilter === "All Barangays" ||
        location === barangayFilter;

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

      return (
        Number(b.average_rating || 0) -
        Number(a.average_rating || 0)
      );
    });
  }, [shops, search, barangayFilter, sortBy, openOnly]);

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
    const name = shop.business_name || shop.full_name || "this repair shop";

    alert(
      `Contact ${name} through the Messages tab. You can use the shop profile information shown here to start the conversation.`,
    );
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="rounded-[2rem] bg-gradient-to-r from-[#3285a1] to-[#14516d] p-7 text-white shadow-lg">
        <div className="flex items-center justify-between gap-5">
          <div>
            <h2 className="text-2xl font-black">
              Repair Shops Near You
            </h2>
            <p className="text-sm text-white/70 mt-1">
              Verified repair shops and buyers ready to purchase your
              e-waste in Valenzuela.
            </p>
          </div>

          <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-white/15 items-center justify-center">
            <Wrench size={30} />
          </div>
        </div>

        <div className="mt-6 relative">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shops, specialties, owner name..."
            className="w-full rounded-xl border border-white/20 bg-white/10 px-11 py-3 text-sm text-white placeholder:text-white/45 outline-none focus:bg-white/15"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <select
          value={barangayFilter}
          onChange={(e) => setBarangayFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 outline-none"
        >
          {barangays.map((barangay) => (
            <option key={barangay}>{barangay}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 outline-none"
        >
          <option value="rating">Top Rated</option>
          <option value="purchases">Most Purchases</option>
        </select>

        <button
          type="button"
          onClick={() => setVerifiedOnly((value) => !value)}
          className={`px-4 py-2 rounded-xl border text-xs font-bold ${
            verifiedOnly
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-white border-slate-200 text-slate-500"
          }`}
        >
          <BadgeCheck size={13} className="inline mr-1" />
          Verified Only
        </button>

        <button
          type="button"
          onClick={() => setOpenOnly((value) => !value)}
          className={`px-4 py-2 rounded-xl border text-xs font-bold ${
            openOnly
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-white border-slate-200 text-slate-500"
          }`}
        >
          <Clock3 size={13} className="inline mr-1" />
          Open Now
        </button>

        {sellerBarangay && (
          <button
            type="button"
            onClick={() => setBarangayFilter(sellerBarangay)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-500"
          >
            <MapPin size={13} className="inline mr-1" />
            My Barangay
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-6 mb-4">
        <div>
          <h3 className="text-lg font-black text-slate-800">
            {loading ? "Finding shops..." : "Verified Repair Shops"}
          </h3>
          <p className="text-xs text-slate-400">
            {loading
              ? "Loading verified businesses."
              : `${filteredShops.length} shop${
                  filteredShops.length === 1 ? "" : "s"
                } found`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-[#3285a1] rounded-full mx-auto" />
          <p className="text-xs text-slate-400 mt-4">
            Loading repair shops...
          </p>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Building2 className="mx-auto text-slate-200 mb-3" size={38} />
          <h4 className="font-black text-slate-700">
            No repair shops found
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Try another barangay, search term, or filter.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filteredShops.map((shop) => {
            const rating = Number(shop.average_rating || 0);
            const specialties = getSpecialties(shop);
            const shopName =
              shop.business_name ||
              shop.full_name ||
              "Repair Shop";

            const isOpen =
              shop.is_open === true ||
              shop.open_now === true ||
              String(shop.business_status || "").toLowerCase() ===
                "open";

            return (
              <div
                key={shop.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="h-1.5 bg-gradient-to-r from-[#3285a1] to-emerald-500" />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Building2 size={21} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-800">
                            {shopName}
                          </h4>

                          <span className="text-[9px] text-emerald-600 font-black">
                            <BadgeCheck
                              size={12}
                              className="inline mr-0.5"
                            />
                            Verified
                          </span>
                        </div>

                        {shop.full_name &&
                          shop.full_name !== shopName && (
                            <p className="text-[10px] text-slate-400">
                              {shop.full_name}
                            </p>
                          )}

                        <div className="flex items-center gap-1 mt-1">
                          <Star
                            size={12}
                            className="text-amber-400"
                            fill="currentColor"
                          />
                          <span className="text-[10px] font-black text-slate-700">
                            {rating ? rating.toFixed(1) : "New"}
                          </span>

                          {shop.total_reviews != null && (
                            <span className="text-[9px] text-slate-400">
                              ({shop.total_reviews})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-amber-50 text-amber-700">
                      {rating >= 4.5 ? "Gold" : "Partner"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] text-slate-500 flex items-center gap-2">
                      <MapPin size={12} className="text-[#3285a1]" />
                      {shop.barangay
                        ? `Brgy. ${shop.barangay}, Valenzuela City`
                        : "Valenzuela City"}
                    </p>

                    <p className="text-[10px] text-slate-500 flex items-center gap-2">
                      <Clock3 size={12} />
                      {isOpen
                        ? "Open now"
                        : shop.opening_hours || "Business hours not provided"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {specialties.slice(0, 4).map((specialty, index) => (
                      <span
                        key={`${shop.id}-${index}`}
                        className="px-2 py-1 rounded-full bg-[#3285a1]/5 border border-[#3285a1]/10 text-[9px] text-[#3285a1] font-semibold"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 mt-4 pt-4">
                    <div className="text-center">
                      <p className="text-sm font-black text-[#3285a1]">
                        {shop.purchaseCount}
                      </p>
                      <p className="text-[8px] text-slate-400 uppercase">
                        Purchases
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-black text-slate-700">
                        {shop.total_reviews || 0}
                      </p>
                      <p className="text-[8px] text-slate-400 uppercase">
                        Reviews
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-black text-slate-700">
                        {shop.price_range || "—"}
                      </p>
                      <p className="text-[8px] text-slate-400 uppercase">
                        Price Range
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleContact(shop)}
                    className="w-full mt-4 bg-[#3285a1] hover:bg-[#286f88] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition"
                  >
                    <MessageSquare size={14} />
                    Contact
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SellerRepairShopsTab;