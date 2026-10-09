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
  Printer,
  X,
} from "lucide-react";

const DEFAULT_CONFIG = {
  firstReminder: 7,
  secondReminder: 3,
  autoSuggest: 14,
  // Maximum safe-storage duration in days. Administrators can override
  // these values through the shared donation configuration.
  safeStorageDurations: {
    Smartphone: 60,
    Laptop: 60,
    Tablet: 60,
    Monitor: 60,
    Parts: 60,
    Others: 60,
    Desktop: 60,
    Phone: 60,
    Printer: 60,
    TV: 60,
    Router: 60,
    Keyboard: 60,
    Mouse: 60,
    Other: 60,
  },
};

const DONATION_STATUSES = [
  "for_donation",
  "donated",
  "drop_off_assigned",
  "processed",
];

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
  const [administratorContact, setAdministratorContact] = useState(null);

  const [loadingDropOffPoints, setLoadingDropOffPoints] = useState(true);
  const [loadingDonationHistory, setLoadingDonationHistory] = useState(true);

  const [selectedListing, setSelectedListing] = useState(null);
  const [selectedDropOffPointId, setSelectedDropOffPointId] = useState("");
  const [selectedDonationBarangay, setSelectedDonationBarangay] = useState("");

  const [isDonating, setIsDonating] = useState(false);
  const [donationError, setDonationError] = useState("");
  const [donationSuccess, setDonationSuccess] = useState("");
  const [donationReceipt, setDonationReceipt] = useState(null);

  const [savedDonations, setSavedDonations] = useState([]);

  const [resolvedDonationConfig, setResolvedDonationConfig] = useState(
    donationConfig || DEFAULT_CONFIG
  );

  /*
   * ---------------------------------------------------------
   * LOAD ADMIN DONATION CONFIGURATION
   * ---------------------------------------------------------
   *
   * The admin Donation Management screen stores its configuration under
   * the shared wasteless_donation_configuration key. We read that value
   * here so the seller donation eligibility uses the same administrator
   * settings after refresh.
   */
  useEffect(() => {
    let cancelled = false;

    const applyConfig = (parsedConfig = {}) => {
      if (cancelled) return;
      const safeStorageDurations = {
        ...DEFAULT_CONFIG.safeStorageDurations,
        ...(parsedConfig.safeStorageDurations || {}),
        ...(donationConfig?.safeStorageDurations || {}),
      };

      setResolvedDonationConfig({
        ...DEFAULT_CONFIG,
        ...parsedConfig,
        ...(donationConfig || {}),
        safeStorageDurations,
      });
    };

    const loadConfiguration = async () => {
      try {
        const { data, error } = await supabase
          .from("donation_configurations")
          .select("config")
          .eq("id", 1)
          .maybeSingle();

        if (!error && data?.config) {
          applyConfig(data.config);
          localStorage.setItem(
            "wasteless_donation_configuration",
            JSON.stringify(data.config),
          );
          return;
        }

        const savedConfig = localStorage.getItem(
          "wasteless_donation_configuration"
        );
        applyConfig(savedConfig ? JSON.parse(savedConfig) : {});
      } catch (error) {
        console.error("Failed to load donation configuration:", error);
        try {
          const savedConfig = localStorage.getItem(
            "wasteless_donation_configuration"
          );
          applyConfig(savedConfig ? JSON.parse(savedConfig) : {});
        } catch (fallbackError) {
          console.error("Failed to load cached donation configuration:", fallbackError);
          applyConfig({});
        }
      }
    };

    loadConfiguration();
    return () => { cancelled = true; };
  }, [donationConfig]);
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

    const fetchAdministratorContact = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, role")
          .in("role", ["admin", "env_officer"])
          .limit(1)
          .maybeSingle();

        if (isMounted && data) setAdministratorContact(data);
      } catch (error) {
        console.warn("Could not load administrator contact details:", error);
      }
    };

    fetchAdministratorContact();

    const fetchDropOffPoints = async () => {
      try {
        const { data, error } = await supabase
          .from("drop_off_points")
          .select(
            "id, name, address, barangay, city, operating_hours, is_active, status"
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
              asking_price,
              barangay
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
      "for_donation",
      "donated",
      "drop_off_assigned",
      "processed",
      "inactive",
      "sold",
      "completed",
      "cancelled",
    ];

    const getSafeStorageLimit = (listing) => {
      const category = String(listing?.category || "Others").trim();
      const durations =
        resolvedDonationConfig?.safeStorageDurations ||
        DEFAULT_CONFIG.safeStorageDurations;

      const configured = Number(
        durations[category] ??
          durations[category.toLowerCase()] ??
          durations.Others ??
          DEFAULT_CONFIG.safeStorageDurations.Others
      );

      return Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_CONFIG.safeStorageDurations.Others;
    };

    return allListings
      .filter(
        (listing) =>
          !excludedStatuses.includes(
            String(listing.status || "").toLowerCase()
          ) &&
          String(listing.condition || "").toLowerCase() ===
            "not working"
      )
      .map((listing) => {
        const lastWorkingAt = listing.last_working_date
          ? new Date(listing.last_working_date).getTime()
          : NaN;

        const hasLastWorkingDate = Number.isFinite(lastWorkingAt);
        const safeStorageDays = getSafeStorageLimit(listing);
        const ageInDays = hasLastWorkingDate
          ? Math.max(
              0,
              Math.floor((now - lastWorkingAt) / 86400000)
            )
          : 0;

        const safeStorageReached =
          hasLastWorkingDate && ageInDays >= safeStorageDays;

        const activeBids = Array.isArray(listing.bids)
          ? listing.bids.filter(
              (bid) =>
                !["declined", "cancelled"].includes(
                  String(bid.status || "").toLowerCase()
                )
            )
          : [];

        const autoSuggestDays = Number(
          resolvedDonationConfig?.autoSuggest ??
            DEFAULT_CONFIG.autoSuggest
        );

        return {
          ...listing,
          ageInDays,
          safeStorageDays,
          safeStorageReached,
          hasLastWorkingDate,
          hasActiveBids: activeBids.length > 0,
          isStrongSuggestion:
            safeStorageReached && activeBids.length === 0,
          isMissingLastWorkingDate: !hasLastWorkingDate,
          isApproachingSafeStorage:
            hasLastWorkingDate &&
            safeStorageDays > 0 &&
            ageInDays >= Math.max(0, safeStorageDays - autoSuggestDays),
        };
      })
      .filter((listing) => listing.safeStorageReached)
      .sort((a, b) => b.ageInDays - a.ageInDays);
  }, [allListings, resolvedDonationConfig]);

  /*
   * ---------------------------------------------------------
   * SAFE-STORAGE NOTIFICATIONS + REMINDER HISTORY
   * ---------------------------------------------------------
   *
   * TC_DON_01:
   *   When a Not Working listing reaches the administrator-configured
   *   maximum safe-storage duration, create the first hazard notification.
   *
   * TC_DON_02:
   *   If the first reminder is dismissed/read and the listing is still
   *   unresolved, send the second reminder after the configured interval.
   *
   * IMPORTANT:
   *   Supabase notifications are the authoritative reminder history.
   *   localStorage is retained only as a backward-compatible cache for
   *   older versions of this component. This prevents reminder history
   *   from disappearing when the seller changes browser/device or clears
   *   browser storage.
   */
  useEffect(() => {
    let isMounted = true;

    const getSafeStorageInfo = (listing) => {
      if (!listing?.last_working_date) return null;

      const lastWorkingAt = new Date(listing.last_working_date).getTime();
      if (!Number.isFinite(lastWorkingAt)) return null;

      const category = String(listing.category || "Others").trim();
      const durations =
        resolvedDonationConfig?.safeStorageDurations ||
        DEFAULT_CONFIG.safeStorageDurations;

      const safeStorageDays = Number(
        durations[category] ??
          durations[category.toLowerCase()] ??
          durations.Others ??
          DEFAULT_CONFIG.safeStorageDurations.Others
      );

      if (!Number.isFinite(safeStorageDays) || safeStorageDays <= 0) {
        return null;
      }

      const ageInDays = Math.max(
        0,
        Math.floor((Date.now() - lastWorkingAt) / 86400000)
      );

      const safeStorageReached = ageInDays >= safeStorageDays;

      return {
        lastWorkingAt,
        ageInDays,
        safeStorageDays,
        safeStorageReached,
        daysSinceReached: Math.max(0, ageInDays - safeStorageDays),
      };
    };

    const getLegacyHistory = (key) => {
      try {
        const stored = localStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const saveLegacyHistory = (key, history) => {
      try {
        localStorage.setItem(key, JSON.stringify(history));
      } catch (error) {
        console.warn(
          "Unable to persist legacy donation reminder history:",
          error
        );
      }
    };

    const notifySafeStorageListings = async () => {
      // TC_DON_01: only listings whose age from last_working_date is
      // greater than or equal to the administrator-configured category
      // safe-storage duration are eligible for the hazard notification.
      const reachedListings = allListings.filter((listing) => {
        if (!listing?.id) return false;

        if (
          String(listing.condition || "").toLowerCase() !== "not working"
        ) {
          return false;
        }

        const terminalStatuses = [
          "for_donation",
          "donated",
          "drop_off_assigned",
          "processed",
          "sold",
          "completed",
          "cancelled",
        ];

        if (
          terminalStatuses.includes(
            String(listing.status || "").toLowerCase()
          )
        ) {
          return false;
        }

        const safeStorage = getSafeStorageInfo(listing);
        return Boolean(safeStorage?.safeStorageReached);
      });

      if (!reachedListings.length) return;

      try {
        const {
          data: { user } = {},
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user || !isMounted) return;

        const secondReminderDays = Math.max(
          0,
          Number(
            resolvedDonationConfig?.secondReminder ??
              DEFAULT_CONFIG.secondReminder
          )
        );

        /*
         * Read ALL relevant donation reminder notifications from Supabase.
         *
         * This is the persistent audit trail for TC_DON_02. We intentionally
         * do not depend on localStorage to decide whether a reminder already
         * exists.
         */
        const { data: reminderNotifications, error: reminderHistoryError } =
          await supabase
            .from("notifications")
            .select(
              "id, type, title, content, description, related_listing_id, is_read, created_at"
            )
            .eq("user_id", user.id)
            .in("type", [
              "donation_safe_storage",
              "donation_safe_storage_reminder",
            ])
            .order("created_at", { ascending: true });

        if (reminderHistoryError) {
          console.error(
            "Failed to load persistent donation reminder history:",
            reminderHistoryError
          );
          return;
        }

        const notifications = Array.isArray(reminderNotifications)
          ? reminderNotifications
          : [];

        /*
         * Keep the old browser marker synchronized for compatibility with
         * previous SellerDonationTab versions, but never use it as the
         * authoritative source for reminder eligibility.
         */
        const legacyFirstReminderKey =
          `wasteless_safe_storage_notified_${user.id}`;

        const persistentFirstIds = notifications
          .filter(
            (notification) =>
              notification?.type === "donation_safe_storage" &&
              notification?.related_listing_id
          )
          .map((notification) => notification.related_listing_id);

        if (persistentFirstIds.length) {
          saveLegacyHistory(
            legacyFirstReminderKey,
            [...new Set(persistentFirstIds)]
          );
        }

        for (const listing of reachedListings) {
          if (!isMounted) break;

          const safeStorage = getSafeStorageInfo(listing);
          if (!safeStorage || !safeStorage.safeStorageReached) continue;

          const listingNotifications = notifications
            .filter(
              (notification) =>
                String(notification?.related_listing_id) ===
                String(listing.id)
            )
            .sort(
              (a, b) =>
                new Date(a?.created_at || 0).getTime() -
                new Date(b?.created_at || 0).getTime()
            );

          const firstReminder = listingNotifications.find(
            (notification) =>
              notification?.type === "donation_safe_storage"
          );

          const secondReminder = listingNotifications.find(
            (notification) =>
              notification?.type === "donation_safe_storage_reminder"
          );

          /*
           * TC_DON_01:
           * Send the first hazard notification immediately when the
           * configured maximum safe-storage duration has been reached.
           *
           * The notification itself is the persistent first-reminder log.
           */
          if (!firstReminder) {
            const message =
              `${listing.device_model || "Your device"} has reached the maximum safe-storage duration for ${listing.category || "this device"}. ` +
              "Continued storage may increase safety hazards. Please donate the device to an approved e-waste drop-off point.";

            const { data: insertedFirstReminder, error: notificationError } =
              await supabase
                .from("notifications")
                .insert({
                  user_id: user.id,
                  type: "donation_safe_storage",
                  title: "Safe-storage duration reached",
                  content: message,
                  description: message,
                  related_listing_id: listing.id,
                  is_read: false,
                })
                .select(
                  "id, type, title, content, description, related_listing_id, is_read, created_at"
                )
                .single();

            if (notificationError) {
              console.error(
                "Failed to create first safe-storage notification:",
                notificationError
              );
              continue;
            }

            /*
             * Add the inserted notification to the in-memory history so the
             * same effect run cannot immediately create another reminder.
             */
            if (insertedFirstReminder) {
              notifications.push(insertedFirstReminder);
            }

            continue;
          }

          /*
           * TC_DON_02:
           * The second reminder is allowed ONLY after:
           *
           * 1. the first notification exists,
           * 2. the first notification has been read/dismissed,
           * 3. the configured secondary interval has elapsed, and
           * 4. a second reminder does not already exist.
           */
          if (secondReminder) continue;

          if (!Boolean(firstReminder.is_read)) {
            continue;
          }

          const firstNotifiedAt = new Date(
            firstReminder.created_at || 0
          ).getTime();

          if (!Number.isFinite(firstNotifiedAt) || firstNotifiedAt <= 0) {
            continue;
          }

          const elapsedSinceFirstReminder = Math.max(
            0,
            Math.floor(
              (Date.now() - firstNotifiedAt) / 86400000
            )
          );

          if (elapsedSinceFirstReminder < secondReminderDays) {
            continue;
          }

          const message =
            `${listing.device_model || "Your device"} still requires action after the safe-storage reminder. ` +
            "Please arrange donation to an approved e-waste drop-off point to reduce continued storage risk.";

          const { data: insertedSecondReminder, error: notificationError } =
            await supabase
              .from("notifications")
              .insert({
                user_id: user.id,
                type: "donation_safe_storage_reminder",
                title: "Donation reminder — action still required",
                content: message,
                description: message,
                related_listing_id: listing.id,
                is_read: false,
              })
              .select(
                "id, type, title, content, description, related_listing_id, is_read, created_at"
              )
              .single();

          if (notificationError) {
            console.error(
              "Failed to create second safe-storage reminder:",
              notificationError
            );
            continue;
          }

          /*
           * Persist the second reminder in the same notifications table and
           * update the in-memory history immediately. This prevents a second
           * reminder from being generated twice during the same refresh cycle.
           */
          if (insertedSecondReminder) {
            notifications.push(insertedSecondReminder);
          }
        }
      } catch (error) {
        console.error(
          "Safe-storage notification/reminder check failed:",
          error
        );
      }
    };

    notifySafeStorageListings();

    return () => {
      isMounted = false;
    };
  }, [allListings, resolvedDonationConfig]);

  /*
   * ---------------------------------------------------------
   * DONATION BARANGAY + MAPPED DROP-OFF POINTS
   * ---------------------------------------------------------
   *
   * TC_DON_03 requires the Owner/Dealer to choose a barangay first,
   * then display the mapped drop-off details for that barangay.
   *
   * TC_DON_05 also requires a barangay with no mapped point to remain
   * selectable so the user can be clearly informed that administrator
   * assistance or another barangay is required.
   */
  const normalizeBarangay = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const donationBarangays = useMemo(() => {
    const byNormalizedName = new Map();

    availableDropOffPoints.forEach((point) => {
      const label = String(point?.barangay || "").trim();
      const normalized = normalizeBarangay(label);

      if (normalized && !byNormalizedName.has(normalized)) {
        byNormalizedName.set(normalized, label);
      }
    });

    /*
     * Also include barangays already present on the seller's listings.
     * This is important for TC_DON_05: a seller must be able to select
     * a barangay even when no active drop-off point is mapped to it.
     */
    allListings.forEach((listing) => {
      const label = String(listing?.barangay || "").trim();
      const normalized = normalizeBarangay(label);

      if (normalized && !byNormalizedName.has(normalized)) {
        byNormalizedName.set(normalized, label);
      }
    });

    return Array.from(byNormalizedName.values()).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [availableDropOffPoints, allListings]);

  const mappedDropOffPointsForBarangay = useMemo(() => {
    const normalizedSelectedBarangay =
      normalizeBarangay(selectedDonationBarangay);

    if (!normalizedSelectedBarangay) return [];

    return availableDropOffPoints.filter(
      (point) =>
        normalizeBarangay(point?.barangay) === normalizedSelectedBarangay &&
        String(point?.status || "available").toLowerCase() === "available" &&
        point?.is_active !== false
    );
  }, [availableDropOffPoints, selectedDonationBarangay]);

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
    setSelectedDonationBarangay(
      String(listing?.barangay || "").trim()
    );
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
    setSelectedDonationBarangay("");
    setDonationError("");
  };

  /*
   * ---------------------------------------------------------
   * SAVE DONATION
   * ---------------------------------------------------------
   */
  const handleDonate = async () => {
    if (!selectedListing || isDonating) return;

    if (!selectedDonationBarangay) {
      setDonationError("Please choose a barangay first.");
      return;
    }

    if (!selectedDropOffPointId) {
      if (mappedDropOffPointsForBarangay.length === 0) {
        setDonationError(
          `No active drop-off point is currently mapped to ${selectedDonationBarangay}. Please choose another barangay or contact an administrator for disposal coordination.`
        );
      } else {
        setDonationError("Please choose a mapped drop-off point.");
      }
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
      const lastWorkingAt = selectedListing.last_working_date
        ? new Date(selectedListing.last_working_date).getTime()
        : NaN;

      if (!Number.isFinite(lastWorkingAt)) {
        throw new Error(
          "This listing cannot be donated yet because its last-working date is missing or invalid."
        );
      }

      const category = String(
        selectedListing.category || "Others"
      ).trim();
      const durations =
        resolvedDonationConfig?.safeStorageDurations ||
        DEFAULT_CONFIG.safeStorageDurations;
      const safeStorageDays = Number(
        durations[category] ??
          durations[category.toLowerCase()] ??
          durations.Others ??
          DEFAULT_CONFIG.safeStorageDurations.Others
      );
      const ageInDays = Math.max(
        0,
        Math.floor((Date.now() - lastWorkingAt) / 86400000)
      );

      if (!Number.isFinite(safeStorageDays) || ageInDays < safeStorageDays) {
        throw new Error(
          `Donation is unlocked after ${safeStorageDays} days from the last-working date. This listing is currently ${ageInDays} days old.`
        );
      }

      const { data, error } = await supabase
        .from("listings")
        .update({
          status: "for_donation",
          drop_off_point_id: chosenPoint.id,
        })
        .eq("id", selectedListing.id)
        .select(
          "id, status, drop_off_point_id, device_model, category, created_at, asking_price, seller_id, barangay"
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

      // Generate a digital drop-off receipt immediately after the
      // Supabase donation update succeeds. The receipt references the
      // persisted listing/drop-off association and can be printed or
      // saved as PDF from the browser print dialog.
      const receiptNumber = `DON-${String(savedListing.id || "").slice(0, 8).toUpperCase()}-${Date.now()}`;

      // Persist a donation-routing/receipt record so TC_DON_04 survives
      // refreshes and can be audited independently of the listing row.
      const {
        data: { user: donationUser },
      } = await supabase.auth.getUser();

      if (!donationUser?.id) {
        throw new Error(
          "Your authenticated user could not be identified. The donation was not recorded as a completed donation receipt."
        );
      }

      const { error: donationRecordError } = await supabase
        .from("donation_records")
        .insert({
          listing_id: savedListing.id,
          donor_id: donationUser.id,
          drop_off_point_id: chosenPoint.id,
          barangay:
            chosenPoint.barangay ||
            selectedDonationBarangay ||
            savedListing.barangay ||
            null,
          status: "for_donation",
          receipt_number: receiptNumber,
          receipt_data: {
            deviceModel: savedListing.device_model || "E-waste device",
            category: savedListing.category || "Others",
            dropOffName: chosenPoint.name || "Mapped Drop-off Point",
            address: getPointAddress(chosenPoint) || "Address unavailable",
            partner: chosenPoint.partner || chosenPoint.organization || "",
            city: chosenPoint.city || "",
            operatingHours: chosenPoint.operating_hours || "",
          },
        });

      if (donationRecordError) {
        console.error(
          "Failed to persist donation routing/receipt:",
          donationRecordError
        );
        throw new Error(
          "The listing was updated, but the donation routing/receipt record could not be saved. Please try the donation again or contact an administrator."
        );
      }

      setDonationReceipt({
        receiptNumber,
        issuedAt: new Date().toISOString(),
        listingId: savedListing.id,
        deviceModel: savedListing.device_model || "E-waste device",
        category: savedListing.category || "Others",
        barangay:
          chosenPoint.barangay ||
          selectedDonationBarangay ||
          savedListing.barangay ||
          "Not specified",
        dropOffName: chosenPoint.name || "Mapped Drop-off Point",
        address: getPointAddress(chosenPoint) || "Address unavailable",
        partner: chosenPoint.partner || chosenPoint.organization || "",
        status: "For Donation",
      });

      setSavedDonations((current) => [
        savedListing,
        ...current.filter(
          (item) => item.id !== savedListing.id
        ),
      ]);

      setDonationSuccess(
        `Donation confirmed for ${
          selectedDonationBarangay ||
          chosenPoint.barangay ||
          "the selected barangay"
        }. The listing is now marked For Donation and the selected drop-off point has been saved.`
      );

      setSelectedListing(null);
      setSelectedDropOffPointId("");
      setSelectedDonationBarangay("");

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
      <div className="mt-16 rounded-[2rem] bg-gradient-to-r from-[#2d86a3] to-[#14516d] p-7 text-white shadow-lg">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Gift size={20} />

              <span className="text-xs font-black uppercase tracking-[0.2em]">
                Donation Management
              </span>
            </div>

            <h2 className="text-2xl font-black">
              Give your unused devices a second life.
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Not Working devices become eligible for donation when
              they reach the administrator-configured maximum safe-storage
              duration. Choose an available community drop-off location
              and prepare your device before bringing it in.
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
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-slate-800">
                        {point.name || "Community Drop-off Point"}
                      </h4>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        String(point.status || "available").toLowerCase() === "full"
                          ? "bg-amber-50 text-amber-700"
                          : String(point.status || "available").toLowerCase() === "temporarily_closed"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {String(point.status || "available").toLowerCase() === "full"
                          ? "Full"
                          : String(point.status || "available").toLowerCase() === "temporarily_closed"
                            ? "Temporarily Closed"
                            : "Available"}
                      </span>
                    </div>

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
              Not Working listings that have reached their configured
              maximum safe-storage duration are available for donation.
            </p>
          </div>

          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase text-orange-600">
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
                    <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-orange-600">
                      RECOMMENDED
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">
                      ACTIVE LISTING
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={14} />
                  <span>
                    Last working {formatDate(listing.last_working_date)}
                  </span>
                </div>

                <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Safe-storage limit: {listing.safeStorageDays} days •
                  Stored for {listing.ageInDays} days
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
                  disabled={loadingDropOffPoints}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f97316] py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50"
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

                      <p className="mt-1 text-xs text-slate-400">
                        Donated{" "}
                        {formatDate(listing.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-emerald-700">
                      <CheckCircle2 size={12} />

                      {status === "for_donation"
                        ? "For Donation"
                        : status === "donated"
                          ? "Donated"
                          : formatStatus(status)}
                    </span>

                    {/*
                     * IMPORTANT:
                     * The saved drop-off point is displayed
                     * separately below the status badge.
                     */}
                    <div className="mt-2">
                      <p className="flex items-center justify-start gap-1 text-xs font-bold text-slate-600 sm:justify-end">
                        <MapPin
                          size={11}
                          className="shrink-0"
                        />

                        <span>{pointName}</span>
                      </p>

                      {pointAddress && (
                        <p className="mt-1 text-xs text-slate-400">
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

      {/* Digital donation drop-off receipt */}
      {donationReceipt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="donation-receipt-title"
            className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <ClipboardCheck size={24} />
                </div>
                <h3 id="donation-receipt-title" className="text-xl font-black text-slate-800">
                  Digital Drop-Off Receipt
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your donation has been recorded as <span className="font-bold text-emerald-700">For Donation</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDonationReceipt(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close receipt"
              >
                <X size={20} />
              </button>
            </div>

            <div id="donation-receipt-content" className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Receipt No.</span>
                <span className="text-sm font-black text-slate-800">{donationReceipt.receiptNumber}</span>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-slate-500">Device</span><span className="text-right font-bold text-slate-800">{donationReceipt.deviceModel}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Category</span><span className="text-right font-bold text-slate-800">{donationReceipt.category}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Barangay</span><span className="text-right font-bold text-slate-800">{donationReceipt.barangay}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Drop-off location</span><span className="text-right font-bold text-slate-800">{donationReceipt.dropOffName}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Address</span><span className="text-right font-bold text-slate-800">{donationReceipt.address}</span></div>
                {donationReceipt.partner && (
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Partner</span><span className="text-right font-bold text-slate-800">{donationReceipt.partner}</span></div>
                )}
                <div className="flex justify-between gap-4"><span className="text-slate-500">Issued</span><span className="text-right font-bold text-slate-800">{formatDate(donationReceipt.issuedAt)}</span></div>
                <div className="mt-2 flex justify-between gap-4 rounded-xl bg-emerald-100 px-3 py-2"><span className="font-black text-emerald-800">Status</span><span className="font-black text-emerald-800">{donationReceipt.status}</span></div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDonationReceipt(null)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-black text-white hover:bg-slate-700"
              >
                <Printer size={17} />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

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
                htmlFor="donation-barangay"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Choose a barangay *
              </label>

              <select
                id="donation-barangay"
                value={selectedDonationBarangay}
                onChange={(event) => {
                  const barangay = event.target.value;

                  setSelectedDonationBarangay(barangay);
                  setSelectedDropOffPointId("");
                  setDonationError("");
                }}
                disabled={loadingDropOffPoints}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
              >
                <option value="">
                  Select a barangay
                </option>

                {donationBarangays.map((barangay) => (
                  <option key={barangay} value={barangay}>
                    {barangay}
                  </option>
                ))}
              </select>

              {selectedDonationBarangay &&
                mappedDropOffPointsForBarangay.length === 0 && (
                  <div
                    role="alert"
                    className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
                  >
                    <p className="text-xs font-black text-amber-800">
                      No mapped drop-off point
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      There is currently no available drop-off point mapped to {selectedDonationBarangay}. Please choose another barangay or contact the Administrator for assisted disposal coordination.
                    </p>
                    <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3 text-xs text-slate-700">
                      <p className="font-black text-slate-800">Administrator contact</p>
                      {administratorContact ? (
                        <>
                          <p className="mt-1">Name: {administratorContact.full_name || "Administrator"}</p>
                          {administratorContact.email && <p className="mt-1">Email: {administratorContact.email}</p>}
                          {administratorContact.phone && <p className="mt-1">Phone: {administratorContact.phone}</p>}
                        </>
                      ) : (
                        <p className="mt-1">Administrator contact details are currently unavailable. Please contact your system administrator through the administration office.</p>
                      )}
                    </div>
                  </div>
                )}

              {selectedDonationBarangay &&
                mappedDropOffPointsForBarangay.length === 0 &&
                availableDropOffPoints.some(
                  (point) =>
                    normalizeBarangay(point?.barangay) === normalizeBarangay(selectedDonationBarangay) &&
                    point?.is_active !== false &&
                    String(point?.status || "available").toLowerCase() !== "available"
                ) && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-black text-red-800">Mapped point currently unavailable</p>
                    <p className="mt-1 text-xs leading-5 text-red-700">
                      The mapped point is currently Full or Temporarily Closed. Please choose another barangay or wait until the location becomes available.
                    </p>
                  </div>
                )}

              {selectedDonationBarangay &&
                mappedDropOffPointsForBarangay.length > 0 && (
                  <div className="mt-4">
                    <label
                      htmlFor="donation-drop-off-point"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Choose a mapped drop-off point *
                    </label>

                    <select
                      id="donation-drop-off-point"
                      value={selectedDropOffPointId}
                      onChange={(event) => {
                        setSelectedDropOffPointId(
                          event.target.value
                        );
                        setDonationError("");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    >
                      <option value="">
                        Select a location
                      </option>

                      {mappedDropOffPointsForBarangay.map((point) => (
                        <option
                          key={point.id}
                          value={point.id}
                        >
                          {point.name || "Drop-off Point"}
                          {point.city ? ` — ${point.city}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {selectedDropOffPoint &&
                normalizeBarangay(selectedDropOffPoint.barangay) ===
                  normalizeBarangay(selectedDonationBarangay) && (
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs font-black text-emerald-800">
                      {selectedDropOffPoint.name || "Mapped drop-off point"}
                    </p>

                    <p className="mt-1 text-xs text-emerald-700">
                      <span className="font-bold">Address:</span>{" "}
                      {getPointAddress(selectedDropOffPoint) ||
                        "Address unavailable"}
                    </p>

                    <p className="mt-1 text-xs text-emerald-700">
                      <span className="font-bold">Barangay:</span>{" "}
                      {selectedDropOffPoint.barangay ||
                        selectedDonationBarangay}
                    </p>

                    {selectedDropOffPoint.operating_hours && (
                      <p className="mt-1 text-xs text-emerald-700">
                        <span className="font-bold">
                          Operating hours:
                        </span>{" "}
                        {selectedDropOffPoint.operating_hours}
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
                className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-black uppercase text-slate-500 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isDonating ||
                  loadingDropOffPoints ||
                  !selectedDonationBarangay ||
                  mappedDropOffPointsForBarangay.length === 0 ||
                  !selectedDropOffPointId
                }
                onClick={handleDonate}
                className="flex-1 rounded-xl bg-orange-500 py-3 text-xs font-black uppercase text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
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