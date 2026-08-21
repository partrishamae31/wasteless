import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  X,
  MapPin,
  Star,
  CheckCircle2,
  MessageSquare,
  Package,
  ShoppingBag,
  Clock,
  User,
} from "lucide-react";

const SellerProfileModal = ({ sellerId, onClose, onMessage }) => {
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [soldListings, setSoldListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewers, setReviewers] = useState({});
  const [stats, setStats] = useState({
    totalListed: 0,
    sold: 0,
    responseRate: 95,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Listings");

  useEffect(() => {
    if (!sellerId) return;

    fetchSellerProfile();
  }, [sellerId]);

  const fetchSellerProfile = async () => {
    try {
      setLoading(true);

      // ============================================
      // 1. GET SELLER PROFILE
      // ============================================
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
    id,
    full_name,
    barangay,
    average_rating,
    total_reviews,
    is_verified,
    verification_status,
    created_at
  `,
        )
        .eq("id", sellerId)
        .single();

      if (profileError) {
        console.error("Seller profile error:", profileError);
        throw profileError;
      }

      setSeller(profile);

      // ============================================
      // 2. GET SELLER LISTINGS
      // ============================================
      const { data: sellerListings, error: listingsError } = await supabase
        .from("listings")
        .select(
          `
        id,
        seller_id,
        device_model,
        condition,
        category,
        asking_price,
        images,
        status,
        created_at,
        barangay
      `,
        )
        .eq("seller_id", sellerId)
        .order("created_at", {
          ascending: false,
        });

      if (listingsError) {
        console.error("Seller listings error:", listingsError);
        throw listingsError;
      }

      console.log("Seller ID:", sellerId);

      console.log("Seller Listings:", sellerListings);

      const allListings = sellerListings || [];

      // ============================================
      // 3. ACTIVE LISTINGS
      // ============================================
      const activeListings = allListings.filter((item) => {
        const status = item.status?.toLowerCase()?.trim();

        return status === "active";
      });

      // ============================================
      // 4. SOLD / COMPLETED LISTINGS
      // ============================================
      const soldListingsData = allListings.filter((item) => {
        const status = item.status?.toLowerCase()?.trim();

        return status === "sold" || status === "meetup scheduled";
      });

      // ============================================
      // 5. SET LISTINGS
      // ============================================
      setListings(activeListings);
      setSoldListings(soldListingsData);

      // ============================================
      // 6. SET STATISTICS
      // ============================================
      setStats({
        totalListed: allListings.length,
        sold: soldListingsData.length,
        responseRate: 95,
      });
      // ============================================
      // 7. GET SELLER REVIEWS
      // ============================================
      const { data: sellerReviews, error: reviewsError } = await supabase
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
  `,
        )
        .eq("seller_id", sellerId)
        .order("created_at", {
          ascending: false,
        });

      if (reviewsError) {
        console.error("Seller reviews error:", reviewsError);
        setReviews([]);
      } else {
        const loadedReviews = sellerReviews || [];

        setReviews(loadedReviews);

        // ============================================
        // GET REVIEWER PROFILES
        // ============================================
        const reviewerIds = [
          ...new Set(
            loadedReviews.map((review) => review.reviewer_id).filter(Boolean),
          ),
        ];

        if (reviewerIds.length > 0) {
          const { data: reviewerProfiles, error: reviewerError } =
            await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", reviewerIds);

          if (reviewerError) {
            console.error("Reviewer profiles error:", reviewerError);
          } else {
            const reviewerMap = {};

            (reviewerProfiles || []).forEach((profile) => {
              reviewerMap[profile.id] = profile.full_name;
            });

            setReviewers(reviewerMap);
          }
        }
      }

      console.log("Seller Reviews:", sellerReviews);
    } catch (error) {
      console.error("Error loading seller profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!sellerId) return null;

  const sellerName = seller?.full_name || "Seller";

  const sellerInitials = sellerName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const rating = Number(seller?.average_rating || 0);

  const joinedDate = seller?.created_at
    ? new Date(seller.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const formatPrice = (price) => {
    return `₱${Number(price || 0).toLocaleString()}`;
  };

  const formatRelativeDate = (date) => {
    if (!date) return "";

    const now = new Date();
    const created = new Date(date);

    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return "Today";
    }

    if (diffDays === 1) {
      return "1 day ago";
    }

    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    const weeks = Math.floor(diffDays / 7);

    if (weeks === 1) {
      return "1 week ago";
    }

    if (weeks < 5) {
      return `${weeks} weeks ago`;
    }

    const months = Math.floor(diffDays / 30);

    if (months === 1) {
      return "1 month ago";
    }

    return `${months} months ago`;
  };

  const getReviewRating = (review) => {
    return Number(review.overall_rating || 0);
  };

  const getReviewerName = (review) => {
    return reviewers[review.reviewer_id] || "Verified Buyer";
  };

  const getReviewComment = (review) => {
    return review.comment?.trim() || "No written review.";
  };

  const getReviewDate = (review) => {
    return review.created_at;
  };

  const getCategoryAverage = (field) => {
    if (!reviews.length) return 0;

    const validReviews = reviews
      .map((review) => Number(review[field]))
      .filter((value) => !Number.isNaN(value) && value > 0);

    if (!validReviews.length) return 0;

    return (
      validReviews.reduce((sum, value) => sum + value, 0) / validReviews.length
    );
  };

  const reviewAverage =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + getReviewRating(review), 0) /
        reviews.length
      : rating;

  const communicationAverage = getCategoryAverage("communication_rating");

  const punctualityAverage = getCategoryAverage("punctuality_rating");

  const itemConditionAverage = getCategoryAverage("condition_rating");

  const overallExperienceAverage = getCategoryAverage("overall_rating");

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[410px] max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================
            HEADER COVER
        ============================================ */}
        <div className="relative h-[84px] bg-gradient-to-r from-[#1f7a94] to-[#237f99]">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-slate-500 hover:bg-white transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* ============================================
            PROFILE INFORMATION
        ============================================ */}
        <div className="px-4">
          <div className="relative -mt-7 flex items-end justify-between">
            {/* AVATAR */}
            <div className="w-14 h-14 rounded-full bg-[#4a8b63] border-2 border-white shadow-md flex items-center justify-center text-white text-sm font-black">
              {sellerInitials}
            </div>

            {/* RATING */}
            <div className="mb-1 text-right">
              <div className="flex items-center justify-end gap-1">
                <Star size={13} className="text-yellow-400 fill-yellow-400" />

                <span className="text-xs font-black text-slate-700">
                  {rating > 0 ? rating.toFixed(1) : "New"}
                </span>

                <span className="text-[8px] text-slate-400">
                  ({reviews.length})
                </span>
              </div>

              <p className="text-[8px] text-slate-400 mt-0.5">Seller Rating</p>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black text-slate-800">
                {sellerName}
              </h2>

              {seller?.verification_status === "verified" && (
                <CheckCircle2 size={12} className="text-sky-500" />
              )}
            </div>

            <div className="flex items-center gap-1 mt-1">
              <MapPin size={9} className="text-slate-400" />

              <p className="text-[8px] text-slate-400">
                Barangay {seller?.barangay || "Valenzuela"}
                {seller?.city ? ` · ${seller.city}` : " · Valenzuela City"}
              </p>
            </div>

            {joinedDate && (
              <p className="text-[8px] text-slate-300 mt-1">
                Member since {joinedDate}
              </p>
            )}
          </div>

          {/* SMALL RATING BADGE */}
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 border border-yellow-100 rounded-full text-[8px] font-black text-slate-600">
              <Star size={9} className="fill-yellow-400 text-yellow-400" />

              {rating > 0 ? rating.toFixed(1) : "No rating yet"}
            </span>
          </div>
        </div>

        {/* ============================================
            SELLER STATISTICS
        ============================================ */}
        <div className="grid grid-cols-3 mt-4 border-y border-slate-100">
          <div className="text-center py-3 border-r border-slate-100">
            <p className="text-sm font-black text-sky-500">
              {stats.totalListed}
            </p>

            <p className="text-[7px] text-slate-400 font-bold">Total Listed</p>
          </div>

          <div className="text-center py-3 border-r border-slate-100">
            <p className="text-sm font-black text-[#769c2d]">{stats.sold}</p>

            <p className="text-[7px] text-slate-400 font-bold">Sold</p>
          </div>

          <div className="text-center py-3">
            <p className="text-sm font-black text-slate-700">
              {stats.responseRate}%
            </p>

            <p className="text-[7px] text-slate-400 font-bold">Response</p>
          </div>
        </div>

        {/* ============================================
            TABS
        ============================================ */}
        <div className="flex border-b border-slate-100">
          {[
            {
              name: "Listings",
              count: listings.length,
            },
            {
              name: "Sold",
              count: stats.sold,
            },
            {
              name: "Reviews",
              count: reviews.length,
            },
            {
              name: "About",
              count: null,
            },
          ].map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex-1 py-2.5 text-[8px] font-bold transition-colors border-b-2 ${
                activeTab === tab.name
                  ? "text-[#4d7e2b] border-[#769c2d]"
                  : "text-slate-400 border-transparent"
              }`}
            >
              {tab.name}

              {tab.count !== null && (
                <span className="ml-1">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* ============================================
            SCROLLABLE CONTENT
        ============================================ */}
        <div className="flex-1 overflow-y-auto">
          {/* LOADING */}
          {loading && (
            <div className="py-14 text-center">
              <div className="w-7 h-7 border-2 border-[#769c2d] border-t-transparent rounded-full animate-spin mx-auto" />

              <p className="text-[9px] text-slate-400 font-bold mt-3">
                Loading seller profile...
              </p>
            </div>
          )}

          {/* ============================================
              LISTINGS TAB
          ============================================ */}
          {!loading && activeTab === "Listings" && (
            <div className="p-3">
              <p className="text-[8px] font-bold text-slate-400 mb-2">
                {listings.length} active{" "}
                {listings.length === 1 ? "listing" : "listings"}
              </p>

              {listings.length === 0 ? (
                <div className="py-10 text-center">
                  <Package size={28} className="mx-auto text-slate-200" />

                  <p className="text-[9px] font-bold text-slate-400 mt-2">
                    No active listings
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {listings.map((item) => {
                    const image = Array.isArray(item.images)
                      ? item.images[0]
                      : item.images;

                    return (
                      <div
                        key={item.id}
                        className="border border-slate-100 rounded-lg overflow-hidden bg-white"
                      >
                        {/* IMAGE */}
                        <div className="relative h-[88px] bg-slate-100">
                          {image ? (
                            <img
                              src={image}
                              alt={item.device_model}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={22} className="text-slate-300" />
                            </div>
                          )}

                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-[#5b9b27] text-white text-[6px] font-black">
                            Active
                          </span>
                        </div>

                        {/* DETAILS */}
                        <div className="p-2">
                          <p className="text-[9px] font-black text-slate-700 truncate">
                            {item.device_model || "Device"}
                          </p>

                          <p className="text-[7px] text-slate-400 truncate">
                            {item.category || "E-waste"}
                            {" · "}
                            {item.condition || "Unknown"}
                          </p>

                          <p className="text-[10px] font-black text-sky-600 mt-1">
                            {formatPrice(item.asking_price)}
                          </p>

                          <p className="text-[7px] text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin size={7} />
                            {seller?.barangay || "Valenzuela"}
                          </p>

                          <p className="text-[7px] text-slate-300 mt-0.5">
                            {new Date(item.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================
    SOLD TAB
============================================ */}
          {!loading && activeTab === "Sold" && (
            <div className="p-3">
              <p className="text-[8px] font-bold text-slate-400 mb-2">
                {soldListings.length} sold{" "}
                {soldListings.length === 1 ? "item" : "items"}
              </p>

              {soldListings.length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingBag size={28} className="mx-auto text-slate-200" />

                  <p className="text-[9px] font-bold text-slate-400 mt-2">
                    No sold items yet
                  </p>

                  <p className="text-[8px] text-slate-300 mt-1">
                    Completed sales will appear here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {soldListings.map((item) => {
                    const image = Array.isArray(item.images)
                      ? item.images[0]
                      : item.images;

                    return (
                      <div
                        key={item.id}
                        className="border border-slate-100 rounded-lg overflow-hidden bg-white"
                      >
                        {/* IMAGE */}
                        <div className="relative h-[88px] bg-slate-100">
                          {image ? (
                            <img
                              src={image}
                              alt={item.device_model || "Sold device"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={22} className="text-slate-300" />
                            </div>
                          )}

                          {/* SOLD BADGE */}
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-slate-500 text-white text-[6px] font-black">
                            Sold
                          </span>
                        </div>

                        {/* DETAILS */}
                        <div className="p-2">
                          <p className="text-[9px] font-black text-slate-700 truncate">
                            {item.device_model || "Device"}
                          </p>

                          <p className="text-[7px] text-slate-400 truncate">
                            {item.category || "E-waste"}
                            {" · "}
                            {item.condition || "Unknown"}
                          </p>

                          <p className="text-[10px] font-black text-slate-700 mt-1">
                            {formatPrice(item.asking_price)}
                          </p>

                          <p className="text-[7px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock size={7} />
                            {formatRelativeDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================
    REVIEWS TAB
============================================ */}
          {!loading && activeTab === "Reviews" && (
            <div className="p-2.5">
              {reviews.length === 0 ? (
                <div className="py-12 text-center">
                  <Star size={30} className="mx-auto text-yellow-300" />

                  <p className="text-xs font-black text-slate-500 mt-3">
                    No reviews yet
                  </p>

                  <p className="text-[8px] text-slate-400 mt-1">
                    Reviews from completed transactions will appear here.
                  </p>
                </div>
              ) : (
                <>
                  {/* ============================================
            RATING SUMMARY
        ============================================ */}
                  <div className="border border-slate-100 rounded-xl p-2.5 mb-2">
                    <div className="flex items-center gap-3">
                      {/* OVERALL RATING */}
                      <div className="w-[92px] text-center">
                        <p className="text-[28px] leading-none font-black text-sky-600">
                          {reviewAverage.toFixed(1)}
                        </p>

                        <div className="flex justify-center gap-[1px] mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={9}
                              className={
                                star <= Math.round(reviewAverage)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-slate-200"
                              }
                            />
                          ))}
                        </div>

                        <p className="text-[7px] text-slate-400 mt-1">
                          {reviews.length}{" "}
                          {reviews.length === 1 ? "review" : "reviews"}
                        </p>
                      </div>

                      {/* RATING BREAKDOWN */}
                      <div className="flex-1 space-y-1">
                        {/* COMMUNICATION */}
                        <div className="flex items-center gap-1">
                          <span className="w-[52px] text-[6px] text-slate-400">
                            Communication
                          </span>

                          <div className="flex-1 h-[3px] bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#5b962d] rounded-full"
                              style={{
                                width: `${(communicationAverage / 5) * 100}%`,
                              }}
                            />
                          </div>

                          <span className="w-[17px] text-right text-[6px] text-slate-500 font-bold">
                            {communicationAverage
                              ? communicationAverage.toFixed(1)
                              : "—"}
                          </span>
                        </div>

                        {/* PUNCTUALITY */}
                        <div className="flex items-center gap-1">
                          <span className="w-[52px] text-[6px] text-slate-400">
                            Punctuality
                          </span>

                          <div className="flex-1 h-[3px] bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#5b962d] rounded-full"
                              style={{
                                width: `${(punctualityAverage / 5) * 100}%`,
                              }}
                            />
                          </div>

                          <span className="w-[17px] text-right text-[6px] text-slate-500 font-bold">
                            {punctualityAverage
                              ? punctualityAverage.toFixed(1)
                              : "—"}
                          </span>
                        </div>

                        {/* ITEM CONDITION */}
                        <div className="flex items-center gap-1">
                          <span className="w-[52px] text-[6px] text-slate-400">
                            Item Condition
                          </span>

                          <div className="flex-1 h-[3px] bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#5b962d] rounded-full"
                              style={{
                                width: `${(itemConditionAverage / 5) * 100}%`,
                              }}
                            />
                          </div>

                          <span className="w-[17px] text-right text-[6px] text-slate-500 font-bold">
                            {itemConditionAverage
                              ? itemConditionAverage.toFixed(1)
                              : "—"}
                          </span>
                        </div>

                        {/* OVERALL EXPERIENCE */}
                        <div className="flex items-center gap-1">
                          <span className="w-[52px] text-[6px] text-slate-400">
                            Overall
                          </span>

                          <div className="flex-1 h-[3px] bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#5b962d] rounded-full"
                              style={{
                                width: `${
                                  (overallExperienceAverage / 5) * 100
                                }%`,
                              }}
                            />
                          </div>

                          <span className="w-[17px] text-right text-[6px] text-slate-500 font-bold">
                            {overallExperienceAverage
                              ? overallExperienceAverage.toFixed(1)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============================================
            INDIVIDUAL REVIEWS
        ============================================ */}
                  <div className="space-y-2">
                    {reviews.map((review) => {
                      const reviewRating = getReviewRating(review);
                      const reviewerName = getReviewerName(review);
                      const reviewComment = getReviewComment(review);
                      const reviewDate = getReviewDate(review);

                      const reviewerInitial = reviewerName
                        .charAt(0)
                        .toUpperCase();

                      return (
                        <div
                          key={review.id}
                          className="border border-slate-100 rounded-xl p-2.5 bg-white"
                        >
                          {/* REVIEW HEADER */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {/* REVIEWER AVATAR */}
                              <div className="w-6 h-6 rounded-full bg-[#4a9672] text-white flex items-center justify-center text-[8px] font-black">
                                {reviewerInitial}
                              </div>

                              <div>
                                <p className="text-[8px] font-black text-slate-700">
                                  {reviewerName}
                                </p>

                                {/* STARS */}
                                <div className="flex items-center gap-[1px] mt-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      size={7}
                                      className={
                                        star <= Math.round(reviewRating)
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-slate-200"
                                      }
                                    />
                                  ))}

                                  <span className="text-[6px] text-slate-400 ml-1">
                                    {reviewRating.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* DATE */}
                            <span className="text-[6px] text-slate-300">
                              {reviewDate ? formatRelativeDate(reviewDate) : ""}
                            </span>
                          </div>

                          {/* REVIEW TEXT */}
                          <p className="text-[7px] leading-[1.45] text-slate-500 mt-2">
                            "{reviewComment}"
                          </p>

                          {/* VERIFIED PURCHASE */}
                          <div className="flex items-center gap-1 mt-1.5">
                            <CheckCircle2 size={7} className="text-[#67a83a]" />

                            <span className="text-[6px] text-[#67a83a] font-bold">
                              Verified Purchase
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================
              ABOUT TAB
          ============================================ */}
          {!loading && activeTab === "About" && (
            <div className="p-4 space-y-3">
              <div className="flex gap-3">
                <User size={14} className="text-slate-400" />

                <div>
                  <p className="text-[7px] text-slate-400 uppercase font-bold">
                    Seller
                  </p>

                  <p className="text-[9px] font-bold text-slate-700">
                    {sellerName}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin size={14} className="text-slate-400" />

                <div>
                  <p className="text-[7px] text-slate-400 uppercase font-bold">
                    Location
                  </p>

                  <p className="text-[9px] font-bold text-slate-700">
                    Barangay {seller?.barangay || "Valenzuela"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Clock size={14} className="text-slate-400" />

                <div>
                  <p className="text-[7px] text-slate-400 uppercase font-bold">
                    Response Rate
                  </p>

                  <p className="text-[9px] font-bold text-slate-700">
                    {stats.responseRate}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================
            FOOTER BUTTONS
        ============================================ */}
        <div className="p-2 border-t border-slate-100 bg-white flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-600 text-[8px] font-black"
          >
            Close
          </button>

          <button
            onClick={() => {
              if (onMessage && seller) {
                onMessage(seller);
              }
            }}
            className="flex-1 py-2.5 rounded-lg bg-[#2589a3] text-white text-[8px] font-black flex items-center justify-center gap-1.5 hover:bg-[#20798f] transition"
          >
            <MessageSquare size={10} />
            Message Seller
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerProfileModal;
