import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { scopeQuery, scopeTransactionsQuery } from "./barangayScope";
import {
  Activity,
  Edit3,
  Shield,
  Sparkles,
  Users,
  Database,
  Info,
  Save,
  X,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from "lucide-react";

const DEFAULT_TIERS = [
  { name: "NEWCOMER", color: "bg-gray-100 text-gray-600", border: "bg-gray-300", min_transactions: 0, min_rating: 0, privileges: ["Basic Listings", "Basic Messaging"] },
  { name: "BRONZE", color: "bg-orange-100 text-orange-600", border: "bg-orange-500", min_transactions: 3, min_rating: 3.5, privileges: ["Basic Listings", "Basic Messaging", "Priority Support"] },
  { name: "SILVER", color: "bg-slate-100 text-slate-600", border: "bg-slate-400", min_transactions: 10, min_rating: 4.0, privileges: ["Basic Listings", "Basic Messaging", "Priority Support", "Featured Listings", "Extended Warranty"] },
  { name: "GOLD", color: "bg-yellow-100 text-yellow-700", border: "bg-yellow-500", min_transactions: 25, min_rating: 4.5, privileges: ["Basic Listings", "Basic Messaging", "Priority Support", "Featured Listings", "Extended Warranty", "+2 more"] },
  { name: "PLATINUM", color: "bg-violet-100 text-violet-600", border: "bg-violet-500", min_transactions: 50, min_rating: 4.8, privileges: ["Basic Listings", "Basic Messaging", "Priority Support", "Featured Listings", "Extended Warranty", "+5 more"] },
];

const TIER_ORDER = ["NEWCOMER", "BRONZE", "SILVER", "GOLD", "PLATINUM"];

const StatCard = ({ item }) => {
  const Icon = item.icon;

  return (
    <div className="bg-white border border-[#ECEEF3] rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-lg bg-[#F8FAFC] flex items-center justify-center ${item.color}`}
        >
          <Icon size={18} />
        </div>

        <span className="text-xs font-semibold text-[#9CA3AF]">
          Live
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-[28px] font-bold text-[#111827] leading-none">
          {item.value}
        </h3>

        <p className="text-sm text-[#9CA3AF] mt-2">
          {item.title}
        </p>
      </div>
    </div>
  );
};

const TierCard = ({ tier, onEdit }) => (
  <div className="relative bg-white border border-[#ECEEF3] rounded-xl overflow-hidden">
    <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${tier.border}`} />
    <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tier.color}`}>
            {tier.name}
          </span>
          <p className="text-[12px] text-[#9CA3AF]">
            {tier.min_transactions} transactions · {Number(tier.min_rating).toFixed(2)} rating · {tier.privileges.length} privileges
          </p>
        </div>
        <button type="button" onClick={() => onEdit(tier)}
          className="h-8 px-3 rounded-lg border border-[#E5E7EB] text-[#6B7280] text-sm flex items-center gap-2 hover:bg-[#F9FAFB]">
          <Edit3 size={14} /> Edit
        </button>
      </div>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#F8FAFC] border border-[#ECEEF3] p-3">
          <p className="text-xs text-[#9CA3AF]">Minimum transactions</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{tier.min_transactions}</p>
        </div>
        <div className="rounded-lg bg-[#F8FAFC] border border-[#ECEEF3] p-3">
          <p className="text-xs text-[#9CA3AF]">Minimum rating</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{Number(tier.min_rating).toFixed(2)}</p>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-xs text-[#9CA3AF] mb-3">Current Privileges</p>
        <div className="flex flex-wrap gap-2">
          {tier.privileges.map((item, index) => (
            <span key={`${item}-${index}`} className="px-3 py-1 rounded-md bg-[#F8FAFC] border border-[#ECEEF3] text-xs text-[#6B7280]">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TrustTierManagement = ({ adminBarangay }) => {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [repairShopTierCounts, setRepairShopTierCounts] = useState({
    purchase: { NEWCOMER: 0, BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
    service: { NEWCOMER: 0, BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingTier, setEditingTier] = useState(null);
  const [draft, setDraft] = useState(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeListings: 0, verifiedShops: 0, completedDevices: 0 });
  const [userTierCounts, setUserTierCounts] = useState({ NEWCOMER: 0, BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const currentUserId = authData?.user?.id;
      if (!currentUserId) {
        setIsAdmin(false);
        throw new Error("You must be signed in to access Trust Tier Management.");
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUserId)
        .maybeSingle();

      if (profileError) throw profileError;

      const administrator = String(currentProfile?.role || "").trim().toLowerCase() === "admin";
      setIsAdmin(administrator);

      if (!administrator) {
        throw new Error("Access denied. Only administrators can manage trust tiers.");
      }

      const { data: tierRows, error: tierError } = await supabase
        .from("trust_tiers")
        .select("id,name,min_transactions,min_rating,privileges,created_at,updated_at");
      if (tierError) throw tierError;

      const ordered = TIER_ORDER.map(name =>
        (tierRows || []).find(t => String(t.name).toUpperCase() === name)
      ).filter(Boolean);

      if (ordered.length !== 5) {
        throw new Error("trust_tiers must contain NEWCOMER, BRONZE, SILVER, GOLD and PLATINUM.");
      }

      const normalized = ordered.map(t => ({
        ...t,
        name: String(t.name).toUpperCase(),
        min_transactions: Number(t.min_transactions) || 0,
        min_rating: Number(t.min_rating) || 0,
        privileges: Array.isArray(t.privileges) ? t.privileges : [],
      }));
      setTiers(normalized);

      // BARANGAY COORDINATOR SCOPE:
      // Listings/reviews have no barangay, so member IDs are resolved first
      // and used to scope listings, transactions and reviews.
      let barangayUserIds = null;

      if (adminBarangay) {
        const { data: barangayUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("barangay", adminBarangay);

        barangayUserIds = (barangayUsers || []).map((u) => u.id);
      }

      const EMPTY_ID = ["00000000-0000-0000-0000-000000000000"];

      const idsOrEmpty = (ids) => (ids.length ? ids : EMPTY_ID);

      // Keep the admin distribution aligned with the purchase-reputation model:
      // count completed purchase transactions and combine eligible purchase
      // reviews from marketplace selling and Repair Shop purchase transactions.
      // Repair-service ratings remain a separate reputation stream.
      const [profiles, listings, shops, transactions, reviews, repairPurchaseReviews, repairShopTiers] = await Promise.all([
        scopeQuery(supabase.from("profiles").select("id", { count: "exact" }), adminBarangay),
        barangayUserIds === null
          ? supabase.from("listings").select("id", { count: "exact", head: true }).in("status", ["active", "available", "pending", "meetup_scheduled", "Meetup Scheduled"])
          : supabase.from("listings").select("id", { count: "exact", head: true }).in("status", ["active", "available", "pending", "meetup_scheduled", "Meetup Scheduled"]).in("seller_id", idsOrEmpty(barangayUserIds)),
        scopeQuery(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "repair_shop").or("is_verified.eq.true,verification_status.eq.verified"), adminBarangay),
        scopeTransactionsQuery(supabase.from("transactions").select("seller_id,harvester_id,status,transaction_type,listing_id").eq("status", "completed").eq("transaction_type", "purchase"), adminBarangay),
        barangayUserIds === null
          ? supabase.from("reviews").select("seller_id,overall_rating").eq("review_type", "selling").eq("moderation_status", "approved").not("overall_rating", "is", null)
          : supabase.from("reviews").select("seller_id,overall_rating").eq("review_type", "selling").eq("moderation_status", "approved").not("overall_rating", "is", null).in("seller_id", idsOrEmpty(barangayUserIds)),
        barangayUserIds === null
          ? supabase.from("repair_purchase_reviews").select("repair_shop_id,overall_rating").not("overall_rating", "is", null)
          : supabase.from("repair_purchase_reviews").select("repair_shop_id,overall_rating").not("overall_rating", "is", null).in("repair_shop_id", idsOrEmpty(barangayUserIds)),
        barangayUserIds === null
          ? supabase.from("repair_shop_reputation_tiers").select("repair_shop_id,reputation_type,trust_tier_id")
          : supabase.from("repair_shop_reputation_tiers").select("repair_shop_id,reputation_type,trust_tier_id").in("repair_shop_id", idsOrEmpty(barangayUserIds)),
      ]);

      const firstError = [profiles, listings, shops, transactions, reviews, repairPurchaseReviews, repairShopTiers].find(r => r.error);
      if (firstError?.error) throw firstError.error;

      setStats({
        totalUsers: profiles.count || 0,
        activeListings: listings.count || 0,
        verifiedShops: shops.count || 0,
        completedDevices: new Set((transactions.data || []).map(t => t.listing_id).filter(Boolean)).size,
      });

      const completedByUser = {};
      (transactions.data || []).forEach(tx => {
        [tx.seller_id, tx.harvester_id].forEach(id => {
          if (id) completedByUser[id] = (completedByUser[id] || 0) + 1;
        });
      });

      const ratings = {};
      const addRating = (id, value) => {
        if (!id || value == null) return;
        if (!ratings[id]) ratings[id] = { total: 0, count: 0 };
        ratings[id].total += Number(value);
        ratings[id].count += 1;
      };
      // Purchase reputation includes approved marketplace selling reviews and
      // Repair Shop purchase reviews. Repair-service reviews remain separate.
      (reviews.data || []).forEach(r => addRating(r.seller_id, r.overall_rating));
      (repairPurchaseReviews.data || []).forEach(r => addRating(r.repair_shop_id, r.overall_rating));

      const counts = { NEWCOMER: 0, BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };
      // Include every profile, including users with no completed transactions,
      // so NEWCOMER distribution is not understated.
      const allUserIds = new Set([
        ...(profiles.data || []).map(profile => profile.id),
        ...Object.keys(completedByUser),
      ]);
      allUserIds.forEach(id => {
        const ratingInfo = ratings[id];
        const rating = ratingInfo ? ratingInfo.total / ratingInfo.count : 0;
        let tierName = "NEWCOMER";
        [...normalized].sort((a, b) => b.min_transactions - a.min_transactions).forEach(t => {
          if (completedByUser[id] >= t.min_transactions && rating >= t.min_rating) tierName = t.name;
        });
        counts[tierName] += 1;
      });
      setUserTierCounts(counts);

      const repairCounts = {
        purchase: { NEWCOMER: 0, BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
        service: { NEWCOMER: 0, BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
      };
      const tierNameById = new Map(normalized.map(tier => [tier.id, tier.name]));

      (repairShopTiers.data || []).forEach(row => {
        const category = String(row.reputation_type || "").toLowerCase();
        const tierName = tierNameById.get(row.trust_tier_id);
        if (
          (category === "purchase" || category === "service") &&
          tierName &&
          Object.prototype.hasOwnProperty.call(repairCounts[category], tierName)
        ) {
          repairCounts[category][tierName] += 1;
        }
      });

      setRepairShopTierCounts(repairCounts);
    } catch (err) {
      console.error("Trust tier load error:", err);
      setError(err?.message || "Failed to load trust tier data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [adminBarangay]);

  const openEdit = tier => {
    setError("");
    setSuccess("");
    setEditingTier(tier);
    setDraft({
      id: tier.id,
      name: tier.name,
      min_transactions: String(tier.min_transactions),
      min_rating: String(tier.min_rating),
      privileges: [...tier.privileges],
    });
  };

  const closeEdit = () => {
    if (!saving) {
      setEditingTier(null);
      setDraft(null);
    }
  };

  const validate = next => {
    const ordered = [...next].sort((a, b) => TIER_ORDER.indexOf(a.name) - TIER_ORDER.indexOf(b.name));
    if (ordered[0].min_transactions !== 0 || ordered[0].min_rating !== 0) return "NEWCOMER must require 0 transactions and 0 rating.";
    for (let i = 0; i < ordered.length; i++) {
      const t = ordered[i];
      if (!Number.isFinite(Number(t.min_transactions)) || Number(t.min_transactions) < 0) return `${t.name}: transactions must be 0 or higher.`;
      if (!Number.isFinite(Number(t.min_rating)) || Number(t.min_rating) < 0 || Number(t.min_rating) > 5) return `${t.name}: rating must be between 0 and 5.`;
      if (!t.privileges.filter(Boolean).length) return `${t.name} must have at least one privilege.`;
      if (i > 0) {
        const prev = ordered[i - 1];
        if (t.min_transactions <= prev.min_transactions) return `${t.name} must require more transactions than ${prev.name}.`;
        if (t.min_rating <= prev.min_rating) return `${t.name} must require a higher rating than ${prev.name}.`;
      }
    }
    return "";
  };

  const saveTier = async () => {
    if (!draft) return;
    const updated = {
      ...editingTier,
      min_transactions: Number(draft.min_transactions),
      min_rating: Number(draft.min_rating),
      privileges: draft.privileges.map(p => p.trim()).filter(Boolean),
    };
    const next = tiers.map(t => t.id === updated.id ? updated : t);
    const validationError = validate(next);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase.from("trust_tiers").update({
        min_transactions: updated.min_transactions,
        min_rating: updated.min_rating,
        privileges: updated.privileges,
        updated_at: new Date().toISOString(),
      }).eq("id", updated.id);
      if (updateError) throw updateError;
      setSuccess(`${updated.name} was updated successfully.`);
      closeEdit();
      await loadData();
    } catch (err) {
      console.error("Trust tier update error:", err);
      setError(err?.message || "Failed to save trust tier.");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm("Reset all trust tiers to the WASTELESS default values?")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      for (const def of DEFAULT_TIERS) {
        const existing = tiers.find(t => t.name === def.name);
        if (!existing) continue;
        const { error: updateError } = await supabase.from("trust_tiers").update({
          min_transactions: def.min_transactions,
          min_rating: def.min_rating,
          privileges: def.privileges,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        if (updateError) throw updateError;
      }
      setSuccess("All trust tiers were reset to their default values.");
      await loadData();
    } catch (err) {
      console.error("Trust tier reset error:", err);
      setError(err?.message || "Failed to reset trust tiers.");
    } finally {
      setSaving(false);
    }
  };

  const statItems = useMemo(() => [
    { title: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-cyan-500" },
    { title: "Active Listings", value: stats.activeListings.toLocaleString(), icon: Activity, color: "text-emerald-500" },
    { title: "Verified Shops", value: stats.verifiedShops.toLocaleString(), icon: Sparkles, color: "text-violet-500" },
    { title: "Completed Devices", value: stats.completedDevices.toLocaleString(), icon: Database, color: "text-orange-500" },
  ], [stats]);

  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] p-6">
        <div className="max-w-xl mx-auto mt-12 rounded-xl border border-red-200 bg-white p-6">
          <div className="flex items-center gap-3 text-red-600">
            <Shield size={22} />
            <h1 className="text-lg font-semibold">Administrator Access Required</h1>
          </div>
          <p className="mt-3 text-sm text-[#6B7280]">
            Only administrator accounts can manage trust tier requirements and privileges.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Trust Tier Management</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Manage trust requirements directly from Supabase.</p>
        </div>
        <button type="button" onClick={resetDefaults} disabled={loading || saving}
          className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] text-sm flex items-center gap-2 hover:bg-[#F9FAFB] disabled:opacity-50">
          <RotateCcw size={14} /> Reset Defaults
        </button>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-red-700 text-sm"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {success && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 text-emerald-700 text-sm"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {statItems.map(item => <StatCard key={item.title} item={item} />)}
      </div>

      <div className="bg-white border border-[#ECEEF3] rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#F1F3F7]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-violet-600"><Shield size={18} /></div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Trust Tier Management</h2>
              <p className="text-sm text-[#9CA3AF] mt-1">Configure transaction and rating requirements. Changes are saved to Supabase.</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-sm text-[#6B7280]"><Loader2 size={18} className="animate-spin" />Loading trust tiers...</div>
          ) : tiers.map(tier => <TierCard key={tier.id} tier={tier} onEdit={openEdit} />)}

          {!loading && tiers.length > 0 && (
            <div className="mt-6 rounded-xl border border-[#ECEEF3] bg-[#FAFBFC] p-5">
              <div className="flex items-center gap-2 mb-4"><UserCheck size={17} className="text-violet-600" /><h3 className="text-sm font-semibold text-[#111827]">Current User Tier Distribution</h3></div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {TIER_ORDER.map(name => (
                  <div key={name} className="rounded-lg bg-white border border-[#ECEEF3] p-3">
                    <p className="text-xs font-semibold text-[#9CA3AF]">{name}</p>
                    <p className="mt-1 text-xl font-bold text-[#111827]">{userTierCounts[name] || 0}</p>
                    <p className="text-xs text-[#9CA3AF]">qualifying users</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && tiers.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#ECEEF3] bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={17} className="text-violet-600" />
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Repair Shop Reputation Distribution</h3>
                  <p className="text-xs text-[#9CA3AF] mt-1">Purchase and repair-service reputation are counted separately.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {[
                  { key: "purchase", label: "Purchase Reputation" },
                  { key: "service", label: "Repair Service Reputation" },
                ].map(category => (
                  <div key={category.key} className="rounded-lg border border-[#ECEEF3] p-4">
                    <p className="text-sm font-semibold text-[#374151] mb-3">{category.label}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {TIER_ORDER.map(name => (
                        <div key={name} className="rounded-md bg-[#F8FAFC] p-2 text-center">
                          <p className="text-[10px] font-semibold text-[#9CA3AF]">{name}</p>
                          <p className="mt-1 text-lg font-bold text-[#111827]">
                            {repairShopTierCounts[category.key][name] || 0}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-5 flex items-start gap-3">
            <Info size={18} className="text-[#2563EB] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-[#1E3A8A] mb-2">Important Notes</h4>
              <ul className="space-y-1 text-[13px] text-[#2563EB]">
                <li>• Tier changes are saved immediately to the trust_tiers table.</li>
                <li>• A user qualifies for the highest tier where both requirements are satisfied.</li>
                <li>• Completed purchase transactions are used for the tier transaction count.</li>
                <li>• Owner/Dealer selling ratings and Repair Shop purchase ratings contribute to purchase reputation; Repair Shop service ratings are tracked separately.</li>
                <li>• Higher tiers must have stricter transaction and rating requirements.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {editingTier && draft && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F1F3F7] flex items-center justify-between">
              <div><h2 className="text-lg font-semibold text-[#111827]">Edit {editingTier.name}</h2><p className="text-xs text-[#9CA3AF] mt-1">Update requirements and privileges.</p></div>
              <button type="button" onClick={closeEdit} disabled={saving} className="p-2 rounded-lg hover:bg-[#F8FAFC]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-xs font-medium text-[#374151]">Minimum transactions</span>
                  <input type="number" min="0" value={draft.min_transactions} onChange={e => setDraft(d => ({...d, min_transactions: e.target.value}))}
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-[#E5E7EB] outline-none focus:ring-2 focus:ring-violet-200" />
                </label>
                <label className="block"><span className="text-xs font-medium text-[#374151]">Minimum rating</span>
                  <input type="number" min="0" max="5" step="0.01" value={draft.min_rating} onChange={e => setDraft(d => ({...d, min_rating: e.target.value}))}
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-[#E5E7EB] outline-none focus:ring-2 focus:ring-violet-200" />
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#374151]">Privileges</span>
                  <button type="button" onClick={() => setDraft(d => ({...d, privileges: [...d.privileges, ""]}))} className="text-xs font-medium text-violet-600">+ Add privilege</button>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {draft.privileges.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={p} onChange={e => setDraft(d => ({...d, privileges: d.privileges.map((x, n) => n === i ? e.target.value : x)}))}
                        className="flex-1 h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm" placeholder="Privilege name" />
                      <button type="button" onClick={() => setDraft(d => ({...d, privileges: d.privileges.filter((_, n) => n !== i)}))}
                        className="w-9 h-9 rounded-lg border border-[#E5E7EB] text-[#9CA3AF] hover:text-red-500"><X size={15} className="mx-auto" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-[#FFF7ED] border border-[#FED7AA] p-3 text-xs text-[#9A3412]">Higher tiers must remain stricter than the tier below them.</div>
            </div>
            <div className="px-6 py-4 border-t border-[#F1F3F7] flex justify-end gap-2">
              <button type="button" onClick={closeEdit} disabled={saving} className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm">Cancel</button>
              <button type="button" onClick={saveTier} disabled={saving} className="h-10 px-4 rounded-lg bg-violet-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustTierManagement;