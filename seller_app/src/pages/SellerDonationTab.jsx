import React, { useMemo, useState } from "react";
import {
  Gift,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  Leaf,
} from "lucide-react";

/**
 * SellerDonationTab
 *
 * This component is intentionally separate from SellerDashboard.
 *
 * Props:
 * - listings: seller's listings from Supabase
 * - donationConfig: { firstReminder, secondReminder, autoSuggest }
 * - onDonate: async (listingId) => void
 * - onBackToListings: () => void
 */
const SellerDonationTab = ({
  listings = [],
  donationConfig = {
    firstReminder: 7,
    secondReminder: 3,
    autoSuggest: 14,
  },
  onDonate,
  onBackToListings,
}) => {
  const [selectedListing, setSelectedListing] = useState(null);

  const donationListings = useMemo(
    () =>
      listings
        .filter((listing) =>
          ["donated", "drop_off_assigned", "processed"].includes(
            listing.status?.toLowerCase(),
          ),
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at) -
            new Date(a.updated_at || a.created_at),
        ),
    [listings],
  );

  const eligibleListings = useMemo(() => {
    const now = new Date();

    return listings
      .filter((listing) => {
        const status = listing.status?.toLowerCase();

        if (
          [
            "donated",
            "drop_off_assigned",
            "processed",
            "inactive",
            "sold",
            "completed",
            "cancelled",
          ].includes(status)
        ) {
          return false;
        }

        const createdDate = new Date(listing.created_at);

        if (Number.isNaN(createdDate.getTime())) return false;

        const ageInDays =
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays < Number(donationConfig.firstReminder || 7)) {
          return false;
        }

        const activeBids =
          listing.bids?.filter((bid) => bid.status !== "declined") || [];

        return activeBids.length === 0;
      })
      .map((listing) => {
        const ageInDays = Math.floor(
          (now.getTime() - new Date(listing.created_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return {
          ...listing,
          ageInDays,
          isStrongSuggestion:
            ageInDays >= Number(donationConfig.autoSuggest || 14),
        };
      })
      .sort((a, b) => b.ageInDays - a.ageInDays);
  }, [listings, donationConfig]);

  const handleDonate = async () => {
    if (!selectedListing) return;

    await onDonate?.(selectedListing.id);
    setSelectedListing(null);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-r from-[#f97316] to-[#d97706] p-7 text-white shadow-lg">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Donation Management
              </span>
            </div>

            <h2 className="text-2xl font-black">
              Give your unused devices a second life.
            </h2>

            <p className="text-sm text-white/80 mt-2 max-w-2xl">
              Donate electronics that are no longer receiving interest and
              help reduce e-waste in your community.
            </p>
          </div>

          <div className="hidden md:flex w-16 h-16 rounded-2xl bg-white/15 items-center justify-center">
            <Leaf size={32} />
          </div>
        </div>
      </div>

      {eligibleListings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Recommended for Donation
              </h3>
              <p className="text-xs text-slate-400">
                These listings have been inactive without active bids.
              </p>
            </div>

            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
              {eligibleListings.length} eligible
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {eligibleListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-black text-slate-800">
                      {listing.device_model || "Electronic Device"}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {listing.category || "Electronics"}
                    </p>
                  </div>

                  <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-[9px] font-black">
                    {listing.ageInDays} DAYS
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                  <Clock size={14} />
                  <span>
                    Listed{" "}
                    {new Date(listing.created_at).toLocaleDateString(
                      "en-PH",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </span>
                </div>

                {listing.asking_price && (
                  <p className="text-sm font-black text-[#3285a1] mt-3">
                    Est. Value: ₱
                    {Number(listing.asking_price).toLocaleString()}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedListing(listing)}
                  className="mt-5 w-full bg-[#f97316] hover:bg-[#ea580c] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2"
                >
                  <Gift size={14} />
                  Convert to Donation
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">
              My Donations
            </h3>
            <p className="text-xs text-slate-400">
              Track devices that you have already donated.
            </p>
          </div>
        </div>

        {donationListings.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <Gift className="mx-auto text-slate-200 mb-3" size={36} />
            <h4 className="font-black text-slate-700">
              No donations yet
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Eligible listings will appear above when they meet your donation
              reminder settings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {donationListings.map((listing) => {
              const status = listing.status?.toLowerCase();

              return (
                <div
                  key={listing.id}
                  className="bg-white border border-emerald-100 rounded-2xl p-5 flex items-center justify-between gap-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Package size={20} />
                    </div>

                    <div>
                      <h4 className="font-black text-slate-800">
                        {listing.device_model || "Electronic Device"}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {listing.category || "Electronics"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                      <CheckCircle2 size={12} />
                      {status === "donated"
                        ? "Donated"
                        : status.replaceAll("_", " ")}
                    </span>

                    {listing.drop_off_point_id ? (
                      <p className="text-[10px] text-slate-400 mt-2">
                        Drop-off point assigned
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-2">
                        Waiting for admin assignment
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={onBackToListings}
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#3285a1] hover:underline"
      >
        Back to My Listings
        <ArrowRight size={14} />
      </button>

      {selectedListing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-7 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center mb-5">
              <Gift size={24} />
            </div>

            <h3 className="text-xl font-black text-slate-800">
              Donate this device?
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              You are about to donate{" "}
              <span className="font-bold text-slate-700">
                {selectedListing.device_model || "this device"}
              </span>
              . The listing will be marked as donated and will wait for admin
              drop-off assignment.
            </p>

            <div className="flex gap-3 mt-7">
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDonate}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase"
              >
                Confirm Donation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDonationTab;