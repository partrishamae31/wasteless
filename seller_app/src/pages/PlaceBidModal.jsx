import React, { useEffect, useState } from "react";
import {
  X,
  MessageSquare,
  Link2,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const PlaceBidModal = ({
  listing,
  existingBid,
  placingBid,
  bidAmount,
  setBidAmount,
  bidMessage,
  setBidMessage,
  onClose,
  onSubmit,
}) => {
  const [seller, setSeller] = useState(null);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!listing?.seller_id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, business_name, role")
        .eq("id", listing.seller_id)
        .single();

      if (!error) {
        setSeller(data);
      }
    };

    fetchSeller();
  }, [listing]);

  if (!listing) return null;

  const askingPrice = Number(listing.asking_price || 0);

  const quickOffers = [
    {
      label: "Full Price",
      percentage: 100,
      amount: askingPrice,
    },
    {
      label: "90%",
      percentage: 90,
      amount: Math.round(askingPrice * 0.9),
    },
    {
      label: "80%",
      percentage: 80,
      amount: Math.round(askingPrice * 0.8),
    },
    {
      label: "70%",
      percentage: 70,
      amount: Math.round(askingPrice * 0.7),
    },
  ];

  const selectedPercentage =
    askingPrice > 0 && bidAmount
      ? Math.round((Number(bidAmount) / askingPrice) * 100)
      : null;

  /*
   * Supports common image formats without requiring
   * a database change.
   */
  const getListingImages = () => {
    const possibleImages = [
      listing.image_urls,
      listing.images,
      listing.photos,
      listing.image_url,
      listing.photo_url,
    ];

    for (const value of possibleImages) {
      if (!value) continue;

      if (Array.isArray(value)) {
        const valid = value.filter(Boolean);
        if (valid.length > 0) return valid;
      }

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);

          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter(Boolean);
          }
        } catch {
          return [value];
        }
      }
    }

    return [];
  };

  const images = getListingImages();

  const sellerName =
    seller?.business_name ||
    seller?.full_name ||
    "Seller";

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[95vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-medium text-slate-900">
              Contact Seller
            </h2>

            <p className="text-lg text-slate-500 mt-1">
              {listing.device_model}
              {listing.device_id ? ` - ${listing.device_id}` : ""}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition"
          >
            <X size={30} strokeWidth={1.5} />
          </button>
        </div>

        {/* =====================================================
            PRODUCT IMAGE
        ===================================================== */}
        <div className="relative w-full h-[260px] bg-slate-100 overflow-hidden">
          {images.length > 0 ? (
            <img
              src={images[0]}
              alt={listing.device_model}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <Link2 size={40} />
              <p className="text-sm mt-2">
                No listing image available
              </p>
            </div>
          )}

          {/* Image count */}
          {images.length > 1 && (
            <div className="absolute bottom-5 right-5 bg-black/75 text-white px-4 py-2 rounded-full text-sm">
              1 / {images.length}
            </div>
          )}
        </div>

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}
        <div className="flex-1 overflow-y-auto">

          {/* TABS */}
          <div className="flex border-b border-slate-200">
            <div className="flex-1 py-4 text-center text-lg font-medium text-[#5b9e29] border-b-4 border-[#5b9e29]">
              <div className="flex items-center justify-center gap-2">
                <Link2 size={21} />
                Make Offer
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const messageBox =
                  document.getElementById("seller-message");

                messageBox?.focus();
              }}
              className="flex-1 py-4 text-center text-lg text-slate-500 hover:text-slate-700"
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare size={21} />
                Ask Question
              </div>
            </button>
          </div>

          <div className="p-6 space-y-7">

            {/* =================================================
                MAXIMUM PRICE
            ================================================= */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">

              <div className="flex justify-between items-start">

                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-500">
                    Maximum Price
                  </p>

                  <p className="text-4xl font-medium text-slate-900 mt-1">
                    ₱{askingPrice.toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">
                    Seller
                  </p>

                  <p className="text-lg text-slate-700 font-medium">
                    {sellerName}
                  </p>
                </div>

              </div>

              <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-3 text-amber-700">
                <ArrowUpRight size={20} />

                <span>
                  Offer at or below this price.
                </span>
              </div>
            </div>

            {/* =================================================
                YOUR OFFER
            ================================================= */}
            <div>
              <h3 className="text-xl text-slate-700 mb-3">
                Your Offer
              </h3>

              <div className="relative">
                <Link2
                  size={23}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="number"
                  min="1"
                  max={askingPrice || undefined}
                  value={bidAmount}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (
                      askingPrice > 0 &&
                      Number(value) > askingPrice
                    ) {
                      setBidAmount(String(askingPrice));
                      return;
                    }

                    setBidAmount(value);
                  }}
                  placeholder="Enter offer amount"
                  className="w-full border-2 border-slate-200 rounded-2xl pl-14 pr-5 py-5 text-xl outline-none focus:border-[#5b9e29] transition"
                />
              </div>

              {/* Offer percentage */}
              {selectedPercentage && (
                <div className="inline-block mt-3 bg-blue-50 text-blue-600 px-5 py-2 rounded-full text-sm">
                  {selectedPercentage}% of asking price
                  {selectedPercentage >= 80 && " · Good offer"}
                </div>
              )}
            </div>

            {/* =================================================
                QUICK SELECT
            ================================================= */}
            <div>
              <h3 className="text-lg text-slate-600 mb-3">
                Quick select:
              </h3>

              <div className="grid grid-cols-4 gap-3">
                {quickOffers.map((offer) => {
                  const selected =
                    Number(bidAmount) === offer.amount;

                  return (
                    <button
                      key={offer.percentage}
                      type="button"
                      onClick={() =>
                        setBidAmount(String(offer.amount))
                      }
                      className={`
                        py-4 px-2 rounded-2xl border-2 transition
                        ${
                          selected
                            ? "border-[#5b9e29] bg-[#f3f8ed]"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }
                      `}
                    >
                      <div className="text-sm text-slate-500">
                        {offer.label}
                      </div>

                      <div className="text-lg font-medium text-slate-800 mt-1">
                        ₱{offer.amount.toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* =================================================
                MESSAGE
            ================================================= */}
            <div>
              <h3 className="text-xl text-slate-700 mb-3">
                Message to Seller (Optional)
              </h3>

              <div className="relative">
                <MessageSquare
                  size={25}
                  className="absolute left-5 top-5 text-slate-400"
                />

                <textarea
                  id="seller-message"
                  value={bidMessage}
                  onChange={(e) =>
                    setBidMessage(e.target.value)
                  }
                  placeholder="Add a message to the seller..."
                  className="w-full min-h-[150px] border-2 border-slate-200 rounded-2xl pl-14 pr-5 py-5 text-base resize-none outline-none focus:border-[#5b9e29] transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}
        <div className="p-6 border-t border-slate-100 flex gap-4 shrink-0">

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 border-2 border-slate-200 rounded-2xl text-lg text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={
              placingBid ||
              !bidAmount ||
              Number(bidAmount) <= 0 ||
              Number(bidAmount) > askingPrice
            }
            className="flex-1 py-4 bg-[#5b9e29] text-white rounded-2xl text-lg font-medium hover:bg-[#4e8924] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {placingBid ? "Sending..." : "Send Offer"}
          </button>

        </div>
      </div>
    </div>
  );
};

export default PlaceBidModal;