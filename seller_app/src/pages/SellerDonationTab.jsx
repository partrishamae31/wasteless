import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

import {
  Gift,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  Leaf,
  MapPin,
  ClipboardCheck,
  ShieldCheck,
  Info,
  RefreshCw,
} from "lucide-react";

const DEFAULT_CONFIG = {
  firstReminder: 7,
  secondReminder: 3,
  autoSuggest: 14,
};

const DONATION_STATUSES = ["donated", "drop_off_assigned", "processed"];

const formatDate = (date) => {
  if (!date) return "Listing date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Listing date unavailable";
  }

  return parsedDate.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatStatus = (status) =>
  String(status || "unknown").replace(/_/g, " ");

const getPointAddress = (point) =>
  [point?.address, point?.barangay, point?.city]
    .filter(Boolean)
    .join(", ");

const SellerDonationTab = ({
  listings = [],
  donationConfig = DEFAULT_CONFIG,
  dropOffPoints: dropOffPointsProp = [],
  onDonate,
  onBackToListings,
}) => {
  const parentDropOffPoints = Array.isArray(dropOffPointsProp)
    ? dropOffPointsProp
    : [];

  const [availableDropOffPoints, setAvailableDropOffPoints] = useState(
    parentDropOffPoints
  );

  const [loadingDropOffPoints, setLoadingDropOffPoints] = useState(true);
  const [loadingDonationHistory, setLoadingDonationHistory] = useState(true);

  const [selectedListing, setSelectedListing] = useState(null);
  const [selectedDropOffPointId, setSelectedDropOffPointId] = useState("");

  const [isDonating, setIsDonating] = useState(false);
  const [donationError, setDonationError] = useState("");
  const [donationSuccess, setDonationSuccess] = useState("");

  const [savedDonations, setSavedDonations] = useState([]);

  /*
   * ---------------------------------------------------------
   * FETCH ACTIVE DROP-OFF POINTS
   * ---------------------------------------------------------
   *
   * We load the active drop-off points directly from Supabase.
   * This means the selected location can still be resolved after
   * a page refresh.
   */
  useEffect(() => {
    let isMounted = true;

    const fetchDropOffPoints = async () => {
      try {
        const { data, error } = await supabase
          .from("drop_off_points")
          .select(
            "id, name, address, barangay, city, operating_hours, is_active"
          )
          .eq("is_active", true);

        if (error) throw error;

        if (isMounted) {
          const fetchedPoints = Array.isArray(data) ? data : [];

          setAvailableDropOffPoints(
            fetchedPoints.length > 0
              ? fetchedPoints
              : parentDropOffPoints
          );
        }
      } catch (error) {
        console.error("Failed to load drop-off points:", error);

        if (isMounted) {
          setAvailableDropOffPoints(parentDropOffPoints);

          setDonationError(
            error?.message ||
              "Could not load drop-off locations. Please refresh and try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingDropOffPoints(false);
        }
      }
    };

    fetchDropOffPoints();

    return () => {
      isMounted = false;
    };

    // Intentionally fetch only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * ---------------------------------------------------------
   * KEEP PARENT DROP-OFF POINTS AVAILABLE
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (parentDropOffPoints.length > 0) {
      setAvailableDropOffPoints((current) =>
        current.length > 0 ? current : parentDropOffPoints
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropOffPointsProp]);

  /*
   * ---------------------------------------------------------
   * FETCH DONATION HISTORY DIRECTLY FROM SUPABASE
   * ---------------------------------------------------------
   *
   * IMPORTANT FIX:
   *
   * Previously, the donation history depended entirely on the
   * "listings" prop supplied by the parent component.
   *
   * If the parent did not return:
   *
   *     drop_off_point_id
   *
   * or did not include donated listings after a refresh,
   * the Donation Tab displayed:
   *
   *     "No drop-off point saved"
   *
   * even though the donation had already been saved.
   *
   * We now independently retrieve the authenticated user's
   * donated listings from Supabase.
   */
  useEffect(() => {
    let isMounted = true;

    const fetchDonationHistory = async () => {
      try {
        setLoadingDonationHistory(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          if (isMounted) {
            setSavedDonations([]);
          }

          return;
        }

        const { data, error } = await supabase
          .from("listings")
          .select(
            `
              id,
              seller_id,
              status,
              drop_off_point_id,
              device_model,
              category,
              created_at,
              asking_price
            `
          )
          .eq("seller_id", user.id)
          .in("status", DONATION_STATUSES)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (isMounted) {
          const fetchedDonations = Array.isArray(data) ? data : [];

          setSavedDonations((current) => {
            const byId = new Map();

            /*
             * Keep anything already stored locally.
             */
            current.forEach((item) => {
              if (item?.id) {
                byId.set(item.id, item);
              }
            });

            /*
             * Merge the persistent Supabase records.
             *
             * Supabase data wins for database fields such as:
             * status
             * drop_off_point_id
             * created_at
             */
            fetchedDonations.forEach((listing) => {
              if (!listing?.id) return;

              byId.set(listing.id, {
                ...(byId.get(listing.id) || {}),
                ...listing,
              });
            });

            return Array.from(byId.values());
          });
        }
      } catch (error) {
        console.error("Failed to load donation history:", error);

        /*
         * Do not destroy existing parent/local data when the
         * independent history query fails.
         */
      } finally {
        if (isMounted) {
          setLoadingDonationHistory(false);
        }
      }
    };

    fetchDonationHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * KEEP LOCALLY SAVED DONATIONS IN SYNC WITH PARENT LISTINGS
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * The old version replaced savedDonations completely with
   * "listings".
   *
   * That could erase the independently fetched donation history
   * whenever the parent refreshed its listings.
   *
   * We now MERGE instead of REPLACE.
   */
  useEffect(() => {
    setSavedDonations((current) => {
      const currentById = new Map(
        current
          .filter((item) => item?.id)
          .map((item) => [item.id, item])
      );

      listings.forEach((listing) => {
        if (!listing?.id) return;

        currentById.set(listing.id, {
          ...(currentById.get(listing.id) || {}),
          ...listing,
        });
      });

      return Array.from(currentById.values());
    });
  }, [listings]);

  /*
   * ---------------------------------------------------------
   * COMBINE PARENT LISTINGS + SAVED DONATIONS
   * ---------------------------------------------------------
   */
  const allListings = useMemo(() => {
    const byId = new Map();

    listings.forEach((listing) => {
      if (!listing?.id) return;

      byId.set(listing.id, listing);
    });

    savedDonations.forEach((listing) => {
      if (!listing?.id) return;

      byId.set(listing.id, {
        ...(byId.get(listing.id) || {}),
        ...listing,
      });
    });

    return Array.from(byId.values());
  }, [listings, savedDonations]);

  /*
   * ---------------------------------------------------------
   * DONATION HISTORY
   * ---------------------------------------------------------
   */
  const donationListings = useMemo(
    () =>
      allListings
        .filter((listing) =>
          DONATION_STATUSES.includes(
            String(listing.status || "").toLowerCase()
          )
        )
        .sort(
          (a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        ),
    [allListings]
  );

  /*
   * ---------------------------------------------------------
   * ELIGIBLE LISTINGS
   * ---------------------------------------------------------
   */
  const eligibleListings = useMemo(() => {
    const now = Date.now();

    const excludedStatuses = [
      "donated",
      "drop_off_assigned",
      "processed",
      "inactive",
      "sold",
      "completed",
      "cancelled",
    ];

    return allListings
      .filter(
        (listing) =>
          !excludedStatuses.includes(
            String(listing.status || "").toLowerCase()
          )
      )
      .map((listing) => {
        const createdAt = new Date(
          listing.created_at || 0
        ).getTime();

        const ageInDays = Number.isFinite(createdAt)
          ? Math.max(
              0,
              Math.floor((now - createdAt) / 86400000)
            )
          : 0;

        const activeBids = Array.isArray(listing.bids)
          ? listing.bids.filter(
              (bid) =>
                !["declined", "cancelled"].includes(
                  String(bid.status || "").toLowerCase()
                )
            )
          : [];

        const autoSuggestDays = Number(
          donationConfig?.autoSuggest ??
            DEFAULT_CONFIG.autoSuggest
        );

        return {
          ...listing,
          ageInDays,
          hasActiveBids: activeBids.length > 0,
          isStrongSuggestion:
            ageInDays >= autoSuggestDays &&
            activeBids.length === 0,
        };
      })
      .sort((a, b) => {
        if (a.isStrongSuggestion !== b.isStrongSuggestion) {
          return a.isStrongSuggestion ? -1 : 1;
        }

        return b.ageInDays - a.ageInDays;
      });
  }, [allListings, donationConfig]);

  /*
   * ---------------------------------------------------------
   * SELECTED DROP-OFF POINT
   * ---------------------------------------------------------
   */
  const selectedDropOffPoint = availableDropOffPoints.find(
    (point) =>
      String(point.id) === String(selectedDropOffPointId)
  );

  /*
   * ---------------------------------------------------------
   * OPEN DONATION MODAL
   * ---------------------------------------------------------
   */
  const openDonationModal = (listing) => {
    setDonationError("");
    setDonationSuccess("");
    setSelectedDropOffPointId("");
    setSelectedListing(listing);
  };

  /*
   * ---------------------------------------------------------
   * CLOSE DONATION MODAL
   * ---------------------------------------------------------
   */
  const closeDonationModal = () => {
    if (isDonating) return;

    setSelectedListing(null);
    setSelectedDropOffPointId("");
    setDonationError("");
  };

  /*
   * ---------------------------------------------------------
   * SAVE DONATION
   * ---------------------------------------------------------
   */
  const handleDonate = async () => {
    if (!selectedListing || isDonating) return;

    if (!selectedDropOffPointId) {
      setDonationError("Please choose a drop-off point.");
      return;
    }

    const chosenPoint = availableDropOffPoints.find(
      (point) =>
        String(point.id) ===
        String(selectedDropOffPointId)
    );

    if (!chosenPoint) {
      setDonationError(
        "The selected drop-off point is no longer available. Please select another one."
      );
      return;
    }

    setIsDonating(true);
    setDonationError("");
    setDonationSuccess("");

    try {
      const { data, error } = await supabase
        .from("listings")
        .update({
          status: "donated",
          drop_off_point_id: chosenPoint.id,
        })
        .eq("id", selectedListing.id)
        .select(
          "id, status, drop_off_point_id, device_model, category, created_at, asking_price, seller_id"
        )
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "No listing was returned. Check that the listing exists and your Supabase update policy allows this action."
        );
      }

      /*
       * Make absolutely sure the database returned the
       * drop-off point ID.
       */
      if (!data.drop_off_point_id) {
        throw new Error(
          "The donation status was updated, but no drop-off point ID was returned. Check the listings.drop_off_point_id column and Supabase policies."
        );
      }

      /*
       * Save a complete local representation immediately.
       *
       * This is what makes the selected location appear
       * immediately without waiting for the parent component.
       */
      const savedListing = {
        ...selectedListing,
        ...data,
        drop_off_point_id: data.drop_off_point_id,
        saved_drop_off_point_name: chosenPoint.name,
        saved_drop_off_point_address:
          getPointAddress(chosenPoint),
      };

      setSavedDonations((current) => [
        savedListing,
        ...current.filter(
          (item) => item.id !== savedListing.id
        ),
      ]);

      setDonationSuccess(
        "Donation saved successfully."
      );

      setSelectedListing(null);
      setSelectedDropOffPointId("");

      /*
       * The parent callback should only refresh parent data.
       *
       * The actual donation update has already been performed
       * above.
       */
      if (typeof onDonate === "function") {
        try {
          await onDonate(
            savedListing.id,
            chosenPoint.id,
            savedListing
          );
        } catch (callbackError) {
          console.error(
            "Parent donation refresh callback failed:",
            callbackError
          );
        }
      }

      /*
       * Re-fetch this user's donation history after saving.
       *
       * This guarantees that the persisted record is available
       * even if the parent refreshes its listings.
       */
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: refreshedDonation } =
            await supabase
              .from("listings")
              .select(
                `
                  id,
                  seller_id,
                  status,
                  drop_off_point_id,
                  device_model,
                  category,
                  created_at,
                  asking_price
                `
              )
              .eq("id", savedListing.id)
              .eq("seller_id", user.id)
              .maybeSingle();

          if (refreshedDonation) {
            setSavedDonations((current) =>
              current.map((item) =>
                item.id === refreshedDonation.id
                  ? {
                      ...item,
                      ...refreshedDonation,
                      saved_drop_off_point_name:
                        chosenPoint.name,
                      saved_drop_off_point_address:
                        getPointAddress(chosenPoint),
                    }
                  : item
              )
            );
          }
        }
      } catch (refreshError) {
        /*
         * The original save already succeeded, so this secondary
         * refresh failure should not make the donation appear
         * unsuccessful.
         */
        console.error(
          "Failed to refresh saved donation:",
          refreshError
        );
      }
    } catch (error) {
      console.error("Donation failed:", error);

      setDonationError(
        error?.message ||
          "Unable to save this donation. Please check your connection and try again."
      );
    } finally {
      setIsDonating(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * RESOLVE SAVED DROP-OFF POINT
   * ---------------------------------------------------------
   */
  const getSavedPoint = (listing) => {
    if (!listing?.drop_off_point_id) return null;

    return (
      availableDropOffPoints.find(
        (point) =>
          String(point.id) ===
          String(listing.drop_off_point_id)
      ) || null
    );
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="mt-16 rounded-[2rem] bg-gradient-to-r from-[#f97316] to-[#d97706] p-7 text-white shadow-lg">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Gift size={20} />

              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Donation Management
              </span>
            </div>

            <h2 className="text-2xl font-black">
              Give your unused devices a second life.
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Donate any active listing whenever you’re
              ready. Choose an available community drop-off
              location and prepare your device before bringing
              it in.
            </p>
          </div>

          <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/15 md:flex">
            <Leaf size={32} />
          </div>
        </div>
      </div>

      {/* Available drop-off locations */}
      {/* <section className="rounded-2xl border border-emerald-100 bg-white p-5 md:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MapPin size={20} />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-800">
              Where to Donate
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              These active locations are managed by your administrator.
            </p>
          </div>
        </div>

        {loadingDropOffPoints ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            <RefreshCw size={16} className="animate-spin" />
            Loading available drop-off locations...
          </div>
        ) : availableDropOffPoints.length === 0 ? (
          <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <Info size={18} className="mt-0.5 shrink-0 text-slate-400" />

            <div>
              <p className="text-sm font-bold text-slate-700">
                No active drop-off locations available
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Please check that your admin-created locations are active and
                visible to sellers.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {availableDropOffPoints.map((point) => (
              <div
                key={point.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start gap-2">
                  <MapPin
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div className="min-w-0">
                    <h4 className="font-black text-slate-800">
                      {point.name || "Community Drop-off Point"}
                    </h4>

                    <p className="mt-2 text-xs text-slate-500">
                      {getPointAddress(point) ||
                        "Address not provided"}
                    </p>

                    {point.operating_hours && (
                      <p className="mt-2 text-xs text-slate-600">
                        <span className="font-bold">
                          Operating hours:
                        </span>{" "}
                        {point.operating_hours}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section> */}

      {/* Device preparation */}
      <section className="rounded-2xl border border-blue-100 bg-white p-5 md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ClipboardCheck size={20} />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-800">
              How to Prepare Your Device
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Follow these steps before handing over your
              electronics.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            [
              "Back up your important files",
              "Save photos, documents, contacts, and other files you want to keep to a separate, trusted storage location.",
            ],
            [
              "Sign out and remove personal information",
              "Sign out of personal accounts, remove SIM and memory cards, and perform a factory reset when appropriate for the device.",
            ],
            [
              "Make the device safe to handle",
              "Turn it off and unplug it. Keep devices with swollen, leaking, or damaged batteries separate, and tell the drop-off staff about the condition. Do not attempt to open or repair a damaged battery.",
            ],
            [
              "Include accessories only when safe and accepted",
              "Keep chargers and other accessories together if the drop-off point accepts them. Do not include unrelated household waste.",
            ],
            [
              "Confirm the handover",
              "Follow the selected drop-off location’s instructions and ask for confirmation or a receipt if the location provides one.",
            ],
          ].map(([title, description], index) => (
            <div key={title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                {index + 1}
              </span>

              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {title}
                </h4>

                <p className="mt-1 text-xs text-slate-500">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <p className="text-xs text-amber-800">
            <span className="font-bold">Data safety:</span>{" "}
            Back up your files first. A factory reset may not
            securely erase data on every device. If the device
            contains sensitive information, ask the authorized
            drop-off or processing staff about their
            data-sanitization process.
          </p>
        </div>
      </section>

      {/* Available listings */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-800">
              Available to Donate
            </h3>

            <p className="text-xs text-slate-400">
              Donate any active listing now, even if it still
              has inquiries.
            </p>
          </div>

          <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase text-orange-600">
            {eligibleListings.length} available
          </span>
        </div>

        {eligibleListings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <Gift
              className="mx-auto mb-3 text-slate-200"
              size={36}
            />

            <h4 className="font-black text-slate-700">
              No active listings available
            </h4>

            <p className="mt-1 text-xs text-slate-400">
              Your active listings will appear here when you
              have something to donate.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {eligibleListings.map((listing) => (
              <div
                key={listing.id}
                className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-black text-slate-800">
                      {listing.device_model ||
                        "Electronic Device"}
                    </h4>

                    <p className="mt-1 text-xs text-slate-400">
                      {listing.category || "Electronics"}
                    </p>
                  </div>

                  {listing.isStrongSuggestion ? (
                    <span className="rounded-lg bg-orange-50 px-2 py-1 text-[9px] font-black text-orange-600">
                      RECOMMENDED
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">
                      ACTIVE LISTING
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={14} />
                  <span>
                    Listed {formatDate(listing.created_at)}
                  </span>
                </div>

                {listing.asking_price != null && (
                  <p className="mt-3 text-sm font-black text-[#3285a1]">
                    Asking Price: ₱
                    {Number(
                      listing.asking_price
                    ).toLocaleString()}
                  </p>
                )}

                {listing.hasActiveBids && (
                  <p className="mt-2 text-xs text-amber-600">
                    This listing has active inquiries or bids.
                    You can still choose to donate it.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    openDonationModal(listing)
                  }
                  disabled={
                    loadingDropOffPoints ||
                    availableDropOffPoints.length === 0
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f97316] py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Gift size={14} />
                  Donate This Listing
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Donation history */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-black text-slate-800">
            My Donations
          </h3>

          <p className="text-xs text-slate-400">
            Track devices that you have already donated.
          </p>
        </div>

        {loadingDonationHistory &&
        donationListings.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
            <RefreshCw
              size={16}
              className="animate-spin"
            />
            Loading your donation history...
          </div>
        ) : donationListings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <Gift
              className="mx-auto mb-3 text-slate-200"
              size={36}
            />

            <h4 className="font-black text-slate-700">
              No donations yet
            </h4>

            <p className="mt-1 text-xs text-slate-400">
              Your confirmed donations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {donationListings.map((listing) => {
              const status = String(
                listing.status || ""
              ).toLowerCase();

              const savedPoint =
                getSavedPoint(listing);

              /*
               * Priority:
               *
               * 1. Current active drop-off point from DB
               * 2. Saved local drop-off point name
               * 3. Generic saved point text
               * 4. No drop-off point saved
               */
              const pointName =
                savedPoint?.name ||
                listing.saved_drop_off_point_name ||
                (listing.drop_off_point_id
                  ? "Saved drop-off point"
                  : "No drop-off point saved");

              const pointAddress =
                getPointAddress(savedPoint) ||
                listing.saved_drop_off_point_address;

              return (
                <div
                  key={listing.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Package size={20} />
                    </div>

                    <div>
                      <h4 className="font-black text-slate-800">
                        {listing.device_model ||
                          "Electronic Device"}
                      </h4>

                      <p className="text-xs text-slate-400">
                        {listing.category || "Electronics"}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Donated{" "}
                        {formatDate(listing.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[9px] font-black uppercase text-emerald-700">
                      <CheckCircle2 size={12} />

                      {status === "donated"
                        ? "Donated"
                        : formatStatus(status)}
                    </span>

                    {/*
                     * IMPORTANT:
                     * The saved drop-off point is displayed
                     * separately below the status badge.
                     */}
                    <div className="mt-2">
                      <p className="flex items-center justify-start gap-1 text-[10px] font-bold text-slate-600 sm:justify-end">
                        <MapPin
                          size={11}
                          className="shrink-0"
                        />

                        <span>{pointName}</span>
                      </p>

                      {pointAddress && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          {pointAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {donationSuccess && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
        >
          {donationSuccess}
        </p>
      )}

      {donationError && !selectedListing && (
        <p
          role="alert"
          className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {donationError}
        </p>
      )}

      <button
        type="button"
        onClick={onBackToListings}
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#3285a1] hover:underline"
      >
        Back to My Listings
        <ArrowRight size={14} />
      </button>

      {/* Donation confirmation modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="donation-dialog-title"
            className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
              <Gift size={24} />
            </div>

            <h3
              id="donation-dialog-title"
              className="text-xl font-black text-slate-800"
            >
              Donate this device?
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Choose where you plan to bring{" "}
              <span className="font-bold text-slate-700">
                {selectedListing.device_model ||
                  "this device"}
              </span>
              . The selected location will be saved with
              this donation.
            </p>

            <div className="mt-5">
              <label
                htmlFor="donation-drop-off-point"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Choose a drop-off point *
              </label>

              <select
                id="donation-drop-off-point"
                value={selectedDropOffPointId}
                onChange={(event) =>
                  setSelectedDropOffPointId(
                    event.target.value
                  )
                }
                disabled={
                  loadingDropOffPoints ||
                  availableDropOffPoints.length === 0
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">
                  Select a location
                </option>

                {availableDropOffPoints.map((point) => (
                  <option
                    key={point.id}
                    value={point.id}
                  >
                    {point.name || "Drop-off Point"} —{" "}
                    {[point.barangay, point.city]
                      .filter(Boolean)
                      .join(", ")}
                  </option>
                ))}
              </select>

              {selectedDropOffPoint && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">
                    {getPointAddress(
                      selectedDropOffPoint
                    )}
                  </p>

                  {selectedDropOffPoint.operating_hours && (
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="font-bold">
                        Operating hours:
                      </span>{" "}
                      {
                        selectedDropOffPoint.operating_hours
                      }
                    </p>
                  )}
                </div>
              )}
            </div>

            {donationError && (
              <p
                role="alert"
                className="mt-3 break-words text-sm text-red-600"
              >
                {donationError}
              </p>
            )}

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                disabled={isDonating}
                onClick={closeDonationModal}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-[10px] font-black uppercase text-slate-500 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isDonating ||
                  loadingDropOffPoints ||
                  !selectedDropOffPointId ||
                  availableDropOffPoints.length === 0
                }
                onClick={handleDonate}
                className="flex-1 rounded-xl bg-orange-500 py-3 text-[10px] font-black uppercase text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDonating
                  ? "Saving..."
                  : "Confirm Donation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDonationTab;