import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import SanitizationGuideModal from "./SanitizationGuideModal";
import {
  Check,
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  X,
  Image as ImageIcon,
  Package,
  Info,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  Video,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  BarChart3,
  HelpCircle,
  Settings,
  Film,
} from "lucide-react";

// Keep all "new listing" defaults in one place so the modal
// can be completely cleared whenever it is closed.
const INITIAL_FORM_DATA = {
  category: "",
  model: "",
  condition: "Working",
  last_working_date: "",
  description: "",
  attachments: [],
  price: "",
  base_part_value: 0,
  base_scrap_value: 0,
};

const INITIAL_ISSUES = {
  physical: [],
  functional: [],
  cosmetic: [],
  noDamage: false,
};

const INITIAL_CHECKLIST = {
  factoryReset: false,
  accountsRemoved: false,
  simRemoved: false,
  filesDeleted: false,
  hazardAcknowledged: false,
  valuationAcknowledged: false,
};

// Checklist criteria are device-specific. Only show data-sanitization
// checks that can actually apply to the selected category.
const CHECKLIST_BY_CATEGORY = {
  Smartphone: ["factoryReset", "accountsRemoved", "simRemoved", "filesDeleted"],
  Tablet: ["factoryReset", "accountsRemoved", "simRemoved", "filesDeleted"],
  Laptop: ["factoryReset", "accountsRemoved", "filesDeleted"],
  Desktop: ["factoryReset", "accountsRemoved", "filesDeleted"],
  Monitor: [],
  Others: ["factoryReset", "accountsRemoved", "filesDeleted"],
  Parts: [],
};

const CHECKLIST_ITEMS = {
  factoryReset: {
    label: "Factory reset performed",
    sub: "Device restored to original factory settings",
  },
  accountsRemoved: {
    label: "All accounts logged out and removed",
    sub: "Apple ID, Google account, Microsoft account, etc. signed out",
  },
  simRemoved: {
    label: "SIM card and memory card removed",
    sub: "All removable SIM/storage media extracted from the device",
  },
  filesDeleted: {
    label: "Personal files deleted",
    sub: "Photos, documents, contacts, and all personal data removed",
  },
  hazardAcknowledged: {
    label: "Hazardous materials disclosure",
    sub: "Confirm no visibly swollen, leaking, or otherwise damaged hazardous components are being presented as safe",
  },
};


const NOT_WORKING_MAX_DAYS = 60;
const WORKING_BIDDING_DAYS = 7;

const DiagnosisSection = ({ title, count, items, selected, onToggle }) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-lg font-bold text-gray-800">
          {title}{" "}
          <span className="text-sm text-gray-400 font-normal ml-1">
            ({count} selected)
          </span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${isSelected
                ? "border-[#2d7a7f] bg-emerald-50/40"
                : "border-gray-100 hover:border-gray-200"
                }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${isSelected
                  ? "bg-[#2d7a7f] border-[#2d7a7f]"
                  : "border-gray-200 bg-white"
                  }`}
              >
                {isSelected && <Check size={13} className="text-white" />}
              </div>
              <span
                className={`text-sm font-medium ${isSelected ? "text-gray-800" : "text-gray-600"}`}
              >
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ConditionSection = ({ selected, onChange }) => {
  const options = [
    {
      id: "Working",
      label: "Working",
      sub: "Device is fully functional",
      activeStyles: "border-[#17708c] bg-emerald-50/40 text-[#17708c]",
    },
    {
      id: "Not Working",
      label: "Not Working",
      sub: "Some components not working",
      activeStyles: "border-[#17708c] bg-emerald-50/40 text-[#17708c]",
    },
  ];

  return (
    <div className="space-y-3 w-full">
      <label className="text-2xl font-bold text-gray-800 block text-left">
        Device Condition
      </label>

      <div className="flex flex-col gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${isSelected
                  ? opt.activeStyles
                  : "border-gray-100 bg-white hover:border-gray-200"
                }`}
            >
              <span
                className={`text-base font-bold ${isSelected ? "" : "text-gray-800"
                  }`}
              >
                {opt.label}
              </span>

              <span className="block text-sm text-gray-500 font-medium mt-0.5">
                {opt.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
const CreateListingModal = ({ isOpen, onClose, userId }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSanitized, setIsSanitized] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState(5000);
  const [userBarangay, setUserBarangay] = useState("");
  const [reusableValue, setReusableValue] = useState(0);
  const [scrapValue, setScrapValue] = useState(0);
  const [componentBreakdown, setComponentBreakdown] = useState([]);
  const [showHazardGuidelines, setShowHazardGuidelines] = useState(false);
  const [showSanitizationGuide, setShowSanitizationGuide] = useState(false);
  const [hasMarketHistory, setHasMarketHistory] = useState(true);
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);

  // Add this helper object inside your file to handle dynamic breakdown mapping
  const CATEGORY_COMPONENTS_MAP = {
    Smartphone: {
      display: {
        label: "OLED/LCD Display Assembly",
        weight: 0.32,
        issues: [
          "Cracked/Shattered Screen",
          "Display Not Working (black screen, lines)",
          "Touch Screen Not Responding",
          "Screen Burn-in or Dead Pixels",
          "Scratched Screen",
        ],
      },

      motherboard: {
        label: "Logic Board & IC Components",
        weight: 0.33,
        issues: [
          "Won't Power On",
          "Charging Problems",
          "Water Damage / Liquid Exposure",
          "Wi-Fi/Bluetooth Not Working",
          "No Signal / SIM Detection Issue",
          "Boot Loop / Stuck on Logo",
        ],
      },

      battery: {
        label: "Lithium-ion Battery Pack",
        weight: 0.15,
        issues: ["Dead/Degraded Battery", "Battery Swelling", "Overheating"],
      },

      camera: {
        label: "Front & Rear Camera Modules",
        weight: 0.08,
        issues: ["Camera Not Working", "Blurry Camera", "Camera Focus Failure"],
      },

      ports: {
        label: "Charging Port & Audio Components",
        weight: 0.07,
        issues: [
          "Charging Port Loose/Damaged",
          "Microphone Not Working",
          "Speaker Distortion",
          "Headphone Jack Failure",
        ],
      },

      body: {
        label: "Housing Frame & Back Cover",
        weight: 0.05,
        issues: [
          "Cracked Back Panel",
          "Bent or Damaged Frame",
          "Minor Dents/Scratches",
          "Paint Chipping/Fading",
          "Missing Buttons or SIM Tray",
        ],
      },
    },

    Laptop: {
      display: {
        label: "LCD/LED Display Panel",
        weight: 0.22,
        issues: [
          "Cracked/Shattered Screen",
          "Display Flickering",
          "Backlight Failure",
          "Dead Pixels",
          "Scratched Screen",
        ],
      },

      motherboard: {
        label: "Motherboard, CPU & GPU",
        weight: 0.32,
        issues: [
          "Won't Power On",
          "Overheating",
          "Water Damage / Liquid Exposure",
          "GPU Failure",
          "Random Shutdowns",
          "Charging Problems",
        ],
      },

      battery: {
        label: "Laptop Battery Pack",
        weight: 0.13,
        issues: ["Dead/Degraded Battery", "Battery Swelling", "Not Charging"],
      },

      storage: {
        label: "SSD/HDD Storage Drive",
        weight: 0.1,
        issues: ["Drive Not Detected", "Slow Performance", "Corrupted Storage"],
      },

      keyboard: {
        label: "Keyboard & Trackpad",
        weight: 0.1,
        issues: [
          "Buttons Not Working",
          "Trackpad Not Responding",
          "Missing Keys",
        ],
      },

      ports: {
        label: "USB, HDMI & I/O Ports",
        weight: 0.07,
        issues: [
          "USB Port Failure",
          "HDMI Port Not Working",
          "Audio Jack Problems",
        ],
      },

      body: {
        label: "Chassis & Hinges",
        weight: 0.06,
        issues: [
          "Broken Hinges",
          "Bent or Damaged Frame",
          "Minor Dents/Scratches",
        ],
      },
    },

    Tablet: {
      display: {
        label: "Touchscreen & Display Panel",
        weight: 0.38,
        issues: [
          "Cracked/Shattered Screen",
          "Touch Screen Not Responding",
          "Display Not Working",
          "Dead Pixels",
        ],
      },

      motherboard: {
        label: "Logic Board Components",
        weight: 0.28,
        issues: [
          "Won't Power On",
          "Charging Problems",
          "Water Damage / Liquid Exposure",
          "Boot Loop",
        ],
      },

      battery: {
        label: "Internal Battery Module",
        weight: 0.18,
        issues: ["Dead/Degraded Battery", "Battery Swelling", "Overheating"],
      },

      ports: {
        label: "Charging & Audio Ports",
        weight: 0.08,
        issues: ["Charging Port Loose/Damaged", "Speaker Not Working"],
      },

      body: {
        label: "Aluminum/Plastic Housing",
        weight: 0.08,
        issues: [
          "Bent or Damaged Frame",
          "Cracked Back Panel",
          "Minor Dents/Scratches",
        ],
      },
    },

    Monitor: {
      display: {
        label: "LCD/LED Display Matrix",
        weight: 0.65,
        issues: [
          "Cracked/Shattered Screen",
          "Dead Pixels",
          "Display Flickering",
          "Backlight Failure",
          "Display Not Working",
        ],
      },

      motherboard: {
        label: "Power Supply & Main Board",
        weight: 0.2,
        issues: [
          "Won't Power On",
          "Power Fluctuation",
          "Display Signal Failure",
        ],
      },

      ports: {
        label: "HDMI/VGA/Display Ports",
        weight: 0.08,
        issues: ["HDMI Port Not Working", "Loose Display Ports"],
      },

      body: {
        label: "Stand, Bezel & Housing",
        weight: 0.07,
        issues: ["Broken Stand", "Bent Frame", "Minor Dents/Scratches"],
      },
    },

    Desktop: {
      motherboard: {
        label: "Motherboard & Processor",
        weight: 0.28,
        issues: ["Won't Power On", "Overheating", "Random Shutdowns"],
      },

      gpu: {
        label: "Graphics Card (GPU)",
        weight: 0.18,
        issues: ["No Display Output", "GPU Artifacting", "Overheating"],
      },

      ram: {
        label: "Memory Modules (RAM)",
        weight: 0.1,
        issues: ["Memory Not Detected", "Random Crashes"],
      },

      storage: {
        label: "SSD/HDD Storage",
        weight: 0.12,
        issues: ["Drive Failure", "Slow Boot", "Corrupted Storage"],
      },

      psu: {
        label: "Power Supply Unit",
        weight: 0.15,
        issues: ["Won't Power On", "Power Failure"],
      },

      cooling: {
        label: "Cooling System & Fans",
        weight: 0.07,
        issues: ["Fan Failure", "Overheating"],
      },

      body: {
        label: "PC Case & Panels",
        weight: 0.1,
        issues: ["Bent Frame", "Missing Panels", "Minor Dents/Scratches"],
      },
    },

    Others: {
      motherboard: {
        label: "Primary Circuit Components",
        weight: 0.5,
        issues: [
          "Won't Power On",
          "Water Damage / Liquid Exposure",
          "Short Circuit",
        ],
      },

      ports: {
        label: "Connectivity Interfaces",
        weight: 0.2,
        issues: ["Port Failure", "Loose Connections"],
      },

      body: {
        label: "External Housing & Structure",
        weight: 0.3,
        issues: [
          "Bent or Damaged Frame",
          "Minor Dents/Scratches",
          "Missing Parts",
        ],
      },
    },

    Parts: {
      motherboard: {
        label: "Logic Board / PCB",
        weight: 0.4,
        issues: ["Burnt Components", "Short Circuit", "Water Damage"],
      },

      display: {
        label: "Display Components",
        weight: 0.25,
        issues: ["Cracked Screen", "Dead Pixels"],
      },

      battery: {
        label: "Battery Components",
        weight: 0.15,
        issues: ["Battery Swelling", "Dead Battery"],
      },

      ports: {
        label: "Ports & Connectors",
        weight: 0.1,
        issues: ["Loose Connector", "Damaged Port"],
      },

      body: {
        label: "Casing & Structural Parts",
        weight: 0.1,
        issues: ["Broken Housing", "Missing Parts"],
      },
    },
  };
  const handleClose = () => {
    // Closing without saving must discard everything entered.
    resetCreateListingForm();
    onClose();
  };

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const normalizeModelName = (model) => {
    return model
      ?.toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  };

  const fileInputRef = useRef(null);
  const [issues, setIssues] = useState(INITIAL_ISSUES);

  const resetCreateListingForm = () => {
    // Release temporary object URLs created for previews.
    formData.attachments.forEach((item) => {
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });

    setStep(1);
    setLoading(false);
    setIsSanitized(false);
    setEstimatedValue(5000);
    setReusableValue(0);
    setScrapValue(0);
    setComponentBreakdown([]);
    setShowHazardGuidelines(false);
    setShowSanitizationGuide(false);
    setHasMarketHistory(true);
    setChecklist({ ...INITIAL_CHECKLIST });
    setIssues({ ...INITIAL_ISSUES });
    setFormData({ ...INITIAL_FORM_DATA });

    // Clear the browser file input as well.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  // Large household appliances are outside the platform's supported
  // e-waste listing scope. Apply this guard to every category so a user
  // cannot bypass the restriction by choosing a different category.
  const isLargeApplianceDetected = () => {
    const inputLower = String(formData.model || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    if (!inputLower) return false;

    const prohibitedKeywords = [
      "refrigerator", "refrigerator freezer", "fridge", "freezer",
      "washing machine", "washer", "tumble dryer", "dryer",
      "air conditioner", "aircon", "air con",
      "microwave", "microwave oven", "oven", "stove", "range hood",
      "dishwasher", "chiller", "water dispenser", "water cooler",
      "electric range", "gas range", "range cooker",
      "large appliance", "home appliance", "household appliance",
      "television", "tv",
    ];

    // Word-boundary matching avoids rejecting legitimate model names that
    // merely contain a short token such as "ac" inside another word.
    return prohibitedKeywords.some((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i").test(inputLower);
    });
  };

  const hasFormError = isLargeApplianceDetected();

  const toggleIssue = (type, item) => {
    setIssues((prev) => {
      const currentList = prev[type];
      const newList = currentList.includes(item)
        ? currentList.filter((i) => i !== item)
        : [...currentList, item];

      return {
        ...prev,
        [type]: newList,
        noDamage: false,
      };
    });
  };
  const handleHazardDetection = async (listingId, selectedIssues) => {
    // Define which issues trigger specific hazards
    const highRiskIssues = {
      "Dead/Degraded Battery": "Lithium-Ion Battery",
      "Won't Power On": "Lithium-Ion Battery",
      "Water Damage/ Liquid Exposure": "Lithium-Ion Battery",
    };

    const detectedHazards = [];

    // Logic to identify hazards based on user selection
    for (const issue of selectedIssues) {
      if (highRiskIssues[issue]) {
        // Find the hazard ID from your hazardous_materials table
        const { data: hazard } = await supabase
          .from("hazardous_materials")
          .select("id")
          .eq("name", highRiskIssues[issue])
          .single();

        if (hazard)
          detectedHazards.push({
            listing_id: listingId,
            hazard_id: hazard.id,
            is_detected_automatically: true,
          });
      }
    }

    if (detectedHazards.length > 0) {
      await supabase.from("listing_hazards").insert(detectedHazards);
    }
  };
  const [dbModels, setDbModels] = useState([]);
  const isHighRisk =
    issues.functional.includes("Dead/Degraded Battery") ||
    issues.functional.includes("Won't Power On") ||
    issues.physical.includes("Water Damage/ Liquid Exposure");
  const showHazardWarning = !issues.noDamage && isHighRisk;
  useEffect(() => {
    if (isOpen) {
      // Always start a newly opened Create Listing modal from a blank state.
      resetCreateListingForm();

      // Prevent scrolling on the body when modal is open
      document.body.style.overflow = "hidden";
    } else {
      // Re-enable scrolling when closed
      document.body.style.overflow = "unset";
    }

    // Cleanup function to ensure scroll is restored if component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from("profiles") // Replace 'profiles' with your actual user/profile table name
        .select("barangay")
        .eq("id", userId)
        .single();

      if (data) {
        setUserBarangay(data.barangay);
      } else if (error) {
        console.error("Error fetching user barangay:", error.message);
      }
    };

    fetchUserProfile();
  }, [userId]);
  useEffect(() => {
    const determineMarketValue = async () => {
      if (!formData.model || !formData.category) return;

      try {
        const { data: listings, error } = await supabase
          .from("listings")
          .select("device_model, asking_price, category")
          .eq("category", formData.category);

        if (error) throw error;

        const normalizedCurrentModel = normalizeModelName(formData.model);

        const matchedListings = listings.filter((item) => {
          const normalizedDbModel = normalizeModelName(item.device_model);

          return normalizedDbModel === normalizedCurrentModel;
        });
        console.log("Current Model:", formData.model);
        console.log("Matches Found:", matchedListings.length);

        console.log("Matched Listings:", matchedListings);

        if (matchedListings.length >= 3) {
          setHasMarketHistory(true);

          const validPrices = matchedListings.filter(
            (item) =>
              item.asking_price &&
              !isNaN(item.asking_price) &&
              Number(item.asking_price) > 0,
          );

          const totalMarketPrice = validPrices.reduce(
            (sum, item) => sum + Number(item.asking_price),
            0,
          );

          const computedAverage =
            validPrices.length > 0 ? totalMarketPrice / validPrices.length : 0;

          const estimatedPartValue = Math.round(computedAverage);
          const estimatedScrapValue = Math.round(computedAverage * 0.15);

          setFormData((prev) => ({
            ...prev,
            base_part_value: estimatedPartValue,
            base_scrap_value: estimatedScrapValue,
          }));
        } else {
          setHasMarketHistory(false);

          const categoryDefaults = {
            Smartphone: { part: 3500, scrap: 0 },
            Laptop: { part: 7000, scrap: 0 },
            Tablet: { part: 4500, scrap: 0 },
            Monitor: { part: 2500, scrap: 0 },
            Parts: { part: 2000, scrap: 0 },
            Others: { part: 1500, scrap: 0 },
          };

          const fallback =
            categoryDefaults[formData.category] || categoryDefaults.Others;

          setFormData((prev) => ({
            ...prev,
            base_part_value: fallback.part,
            base_scrap_value: fallback.scrap,
          }));
        }
      } catch (err) {
        console.error("Market Valuation Engine Failure:", err.message);
      }
    };

    determineMarketValue();
  }, [formData.model, formData.category]);

  useEffect(() => {
    const fetchModels = async () => {
      // 1. Reset models when category changes or is empty
      if (!formData.category || formData.category === "Others") {
        setDbModels([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("device_valuation_rates")
          .select("model_name, base_part_value, scrap_value")
          .eq("category", formData.category)
          .order("model_name", { ascending: true });

        if (error) {
          console.error("Supabase Error:", error.message);
          return;
        }

        if (data) {
          setDbModels(data);
        }
      } catch (err) {
        console.error("Fetch Catch:", err);
      }
    };

    fetchModels();
  }, [formData.category]);

  const handleChecklistToggle = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getApplicableChecklistKeys = () => {
    // Not Working devices may not be capable of completing device-level
    // operations such as factory reset, account removal, or SIM removal.
    // Those checks therefore do not apply to a Not Working listing.
    const categoryKeys =
      formData.condition === "Not Working"
        ? []
        : CHECKLIST_BY_CATEGORY[formData.category] || [];

    return showHazardWarning
      ? [...categoryKeys, "hazardAcknowledged"]
      : categoryKeys;
  };

  const applicableChecklistItems = getApplicableChecklistKeys().map(
    (key) => ({
      id: key,
      ...CHECKLIST_ITEMS[key],
    })
  );

  // When the device category/condition changes, clear checks that no longer
  // apply so an old selection can never satisfy the wrong checklist.
  useEffect(() => {
    const applicableKeys = new Set(getApplicableChecklistKeys());

    setChecklist((prev) => ({
      ...prev,
      factoryReset: applicableKeys.has("factoryReset")
        ? prev.factoryReset
        : false,
      accountsRemoved: applicableKeys.has("accountsRemoved")
        ? prev.accountsRemoved
        : false,
      simRemoved: applicableKeys.has("simRemoved") ? prev.simRemoved : false,
      filesDeleted: applicableKeys.has("filesDeleted")
        ? prev.filesDeleted
        : false,
      hazardAcknowledged: applicableKeys.has("hazardAcknowledged")
        ? prev.hazardAcknowledged
        : false,
    }));
  }, [formData.category, showHazardWarning]);

  useEffect(() => {
    calculateRecoveryValue();
  }, [issues, formData.base_part_value, formData.category]);

  const calculateRecoveryValue = () => {
    const baseValue = formData.base_part_value || 0;
    const scrap = formData.base_scrap_value || 0;
    const currentCategory = formData.category || "Others";

    // Dynamic extraction based on user selection
    const activeComponentSchema =
      CATEGORY_COMPONENTS_MAP[currentCategory] ||
      CATEGORY_COMPONENTS_MAP.Others;

    const selectedIssues = [
      ...issues.physical,
      ...issues.functional,
      ...issues.cosmetic,
    ];

    let sumOfIntactComponents = 0;
    const breakdownReport = [];

    Object.keys(activeComponentSchema).forEach((key) => {
      const component = activeComponentSchema[key];

      const componentBaseValue = Math.round(baseValue * component.weight);

      const hasDamage = component.issues.some((issue) =>
        selectedIssues.includes(issue),
      );

      const isComponentIntact = issues.noDamage || !hasDamage;

      if (isComponentIntact) {
        sumOfIntactComponents += componentBaseValue;
      }

      breakdownReport.push({
        label: component.label,
        status: isComponentIntact ? "Intact" : "Damaged",
        value: isComponentIntact ? componentBaseValue : 0,
        weightPercentage: Math.round(component.weight * 100),
      });
    });

    const finalPartsValue = Math.max(sumOfIntactComponents, scrap);

    setReusableValue(Math.round(finalPartsValue));
    setScrapValue(scrap);
    setComponentBreakdown(breakdownReport);
  };

  if (!isOpen) return null;

  const handleNoDamageToggle = () => {
    setIssues({
      physical: [],
      functional: [],
      cosmetic: [],
      noDamage: !issues.noDamage,
    });
  };

  const handleChangeConditionToWorking = () => {
    setFormData((prev) => ({
      ...prev,
      condition: "Working",
      last_working_date: "",
    }));
  };

  const handleChangeConditionToNotWorking = () => {
    setFormData((prev) => ({
      ...prev,
      condition: "Not Working",
    }));
  };

  const handleKeepWorkingAndClearFunctionalIssues = () => {
    setIssues((prev) => ({
      ...prev,
      functional: [],
    }));
  };

  const handleKeepNotWorkingAndClearNoDamage = () => {
    setIssues((prev) => ({
      ...prev,
      noDamage: false,
    }));
  };

  const categories = [
    {
      id: "Smartphone",
      icon: <Smartphone size={32} strokeWidth={1.5} />,
      label: "Smartphone",
    },
    {
      id: "Laptop",
      icon: <Laptop size={32} strokeWidth={1.5} />,
      label: "Laptop",
    },
    {
      id: "Tablet",
      icon: <Tablet size={32} strokeWidth={1.5} />,
      label: "Tablet",
    },
    {
      id: "Monitor",
      icon: <Monitor size={32} strokeWidth={1.5} />,
      label: "Monitor",
    },
    {
      id: "Others",
      icon: <Package size={32} strokeWidth={1.5} />,
      label: "Others",
    },
    {
      id: "Parts",
      icon: <Settings size={32} strokeWidth={1.5} />, // Matches the packaging/box style icon layout
      label: "Parts",
    },
  ];

  const allSelectedIssues = [
    ...issues.physical,
    ...issues.functional,
    ...issues.cosmetic,
  ];

  const isAssessmentComplete =
    issues.noDamage ||
    issues.physical.length > 0 ||
    issues.functional.length > 0 ||
    issues.cosmetic.length > 0;

  // REQ-5: Cross-check the damage assessment against the condition selected
  // earlier in the listing flow. A "Working" device cannot simultaneously
  // report functional failures, while "Not Working" cannot be marked as
  // having no visible damage. The user must explicitly correct one side
  // before the assessment can be continued.
  const hasFunctionalIssues = issues.functional.length > 0;
  const conditionAssessmentMismatch =
    (formData.condition === "Working" && hasFunctionalIssues) ||
    (formData.condition === "Not Working" && issues.noDamage);

  const mismatchReason =
    formData.condition === "Working" && hasFunctionalIssues
      ? `The assessment includes ${issues.functional.length === 1 ? "a functional issue" : "functional issues"}, but the selected condition is "Working". Please confirm or correct the device condition before continuing.`
      : formData.condition === "Not Working" && issues.noDamage
        ? `The assessment is marked "No Visible Damage", but the selected condition is "Not Working". Please confirm or correct the device condition before continuing.`
        : "";

  const hasMandatoryListingFields =
    Boolean(formData.model?.trim()) &&
    Boolean(formData.condition) &&
    (formData.condition === "Working" ||
      Boolean(formData.last_working_date)) &&
    formData.price !== "" &&
    Number(formData.price) > 0;

  const areApplicableChecklistItemsComplete =
    getApplicableChecklistKeys().every((key) => checklist[key] === true);

  const hasAttachments = formData.attachments.length > 0;

  // Step 4 is only the valuation and asking-price stage.
  // Data-sanitization and preparation checks are completed in Step 5.
  const isStep4Complete =
    hasMandatoryListingFields &&
    hasAttachments;

  // Step 5 is the final preparation/sanitization stage.
  const isStep5Complete =
    areApplicableChecklistItemsComplete &&
    checklist.valuationAcknowledged;

  const checkAndNotifyHarvesters = async (newListing) => {
    try {
      // Match the listing against the Repair Shop component-alert criteria:
      // exact model, active alert, requested condition, and alert price ceiling.
      // The alert table is also used by the existing Harvester Alerts UI, so
      // this keeps notification behavior consistent with that workflow.
      const { data: alertRows, error: alertError } = await supabase
        .from("alerts")
        .select("harvester_id, device_model, condition, max_price, preferred_barangay")
        .eq("is_active", true)
        .eq("device_model", newListing.device_model);

      if (alertError) throw alertError;

      const listingCondition = String(newListing.condition || "").trim().toLowerCase();
      const listingPrice = Number(newListing.asking_price || 0);
      const listingBarangay = String(newListing.barangay || "").trim().toLowerCase();

      const matchingAlerts = (alertRows || []).filter((alert) => {
        const alertCondition = String(alert.condition || "").trim().toLowerCase();
        const maxPrice = Number(alert.max_price || 0);
        const preferredBarangay = String(alert.preferred_barangay || "").trim().toLowerCase();

        const conditionMatches = !alertCondition || alertCondition === listingCondition;
        const priceMatches = !maxPrice || listingPrice <= maxPrice;
        const locationMatches =
          !preferredBarangay ||
          !listingBarangay ||
          preferredBarangay === listingBarangay;

        return conditionMatches && priceMatches && locationMatches;
      });

      // Do not notify the same Repair Shop more than once for one listing.
      const uniqueUserIds = [...new Set(
        matchingAlerts
          .map((alert) => alert.harvester_id)
          .filter(Boolean),
      )];

      if (uniqueUserIds.length > 0) {
        const notifications = uniqueUserIds.map((userId) => ({
          user_id: userId,
          type: "alert_match",
          title: "New E-Waste Match!",
          content: `A ${newListing.device_model} (${newListing.condition}) was listed for ₱${newListing.asking_price}.`,
          related_listing_id: newListing.id,
          is_read: false,
        }));
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notificationError) throw notificationError;
      }
    } catch (err) {
      console.error("Alert Engine Error:", err.message);
    }
  };



  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    // Filter for PNG and JPEG/JPG only
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    const validFiles = files.filter(
      (file) =>
        (file.type === "image/png" ||
          file.type === "image/jpeg" ||
          file.type === "image/jpg") &&
        file.size <= MAX_FILE_SIZE_BYTES,
    );

    if (validFiles.length !== files.length) {
      alert("Only PNG and JPEG files are allowed.");
    }

    if (validFiles.length + formData.attachments.length > 5) {
      alert("You can only upload up to 5 images.");
    }

    // Legacy image handler retained for compatibility; active uploads use
    // formData.attachments via handleAssetAttachment below.
    setFormData((prev) => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        ...validFiles.slice(0, Math.max(0, 5 - prev.attachments.length)).map((file) => ({
          file,
          type: "image",
          previewUrl: URL.createObjectURL(file),
        })),
      ],
    }));
  };

  const removeImage = (index) => {
    // Kept for compatibility with older callers. The current UI uses
    // removeAttachment for the unified image/video attachment list.
    removeAttachment(index);
  };

  if (!isOpen) return null;

  const handleAssetAttachment = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = [];

    for (const file of files) {
      const isImage =
        file.type.startsWith("image/png") ||
        file.type.startsWith("image/jpeg") ||
        file.type.startsWith("image/jpg");
      const isVideo =
        file.type.startsWith("video/mp4") ||
        file.type.startsWith("video/quicktime") ||
        file.type.startsWith("video/mov");

      if (!isImage && !isVideo) {
        alert(
          `Unsupported file type: ${file.name}. Only images (PNG, JPEG) and videos (MP4, MOV) are accepted.`,
        );
        continue;
      }

      // REQ-7: hard-enforce the 10 MB limit per file before creating a
      // preview object URL or adding the file to the listing.
      const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`File too large: ${file.name}. Each photo or video must be 10MB or smaller.`);
        continue;
      }

      // Check max limits (Combined 5 item limit)
      if (formData.attachments.length + newAttachments.length >= 5) {
        alert("Maximum upload allowance is capped at 5 files.");
        break;
      }

      newAttachments.push({
        file,
        type: isImage ? "image" : "video",
        previewUrl: URL.createObjectURL(file),
      });
    }

    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }));
  };

  const removeAttachment = (index) => {
    setFormData((prev) => {
      const copy = [...prev.attachments];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return { ...prev, attachments: copy };
    });
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Combine all processed asset URLs into a single media array
      const uploadedMediaUrls = [];

      if (formData.attachments && formData.attachments.length > 0) {
        for (const item of formData.attachments) {
          const fileName = `${userId}/${Date.now()}-${item.file.name}`;

          const { error: uploadError } = await supabase.storage
            .from("listing-images") // Keep uploading to your existing bucket
            .upload(fileName, item.file);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("listing-images").getPublicUrl(fileName);

          uploadedMediaUrls.push(publicUrl);
        }
      }

      const selectedIssues = [
        ...issues.physical,
        ...issues.functional,
        ...issues.cosmetic,
      ];

      const problemSummary =
        selectedIssues.length > 0
          ? `[SYSTEM DIAGNOSIS: ${selectedIssues.join(", ")}]`
          : "[SYSTEM DIAGNOSIS: No visible damage]";

      const finalDescription =
        `${problemSummary} ${formData.description}`.trim();
      const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
      const validAttachmentTypes = new Set([
        "image/png",
        "image/jpeg",
        "image/jpg",
        "video/mp4",
        "video/quicktime",
        "video/mov",
      ]);

      const attachmentsAreValid =
        formData.attachments.length >= 1 &&
        formData.attachments.length <= 5 &&
        formData.attachments.every(
          (item) =>
            item?.file &&
            validAttachmentTypes.has(item.file.type) &&
            item.file.size <= MAX_FILE_SIZE_BYTES,
        );

      if (!formData.category || !formData.model?.trim()) {
        alert("Please select a category and model before creating the listing.");
        return;
      }

      if (hasFormError) {
        alert("Large household appliances cannot be listed on this platform.");
        return;
      }

      if (!isAssessmentComplete) {
        alert("Assessment Incomplete. Please select at least one damage/issue or mark the device as 'No Visible Damage' to continue.");
        return;
      }

      if (conditionAssessmentMismatch) {
        alert("Assessment and Condition Need Confirmation. Please confirm or correct the device condition before proceeding.");
        return;
      }

      if (!attachmentsAreValid) {
        alert("Photos Required. Please upload 1 to 5 supported photos or videos, with each file 10MB or smaller.");
        return;
      }

      if (
        !formData.condition ||
        (formData.condition === "Not Working" &&
          !formData.last_working_date) ||
        formData.price === "" ||
        Number(formData.price) <= 0
      ) {
        alert("Mandatory fields missing.");
        return;
      }

      const finalPrice = parseFloat(formData.price);

      let biddingEndsAt;
      if (formData.condition === "Not Working") {
        const lastWorkingDate = new Date(`${formData.last_working_date}T23:59:59.999`);
        if (Number.isNaN(lastWorkingDate.getTime())) {
          throw new Error("Please provide a valid last working date.");
        }

        const expiryDate = new Date(lastWorkingDate.getTime());
        expiryDate.setDate(expiryDate.getDate() + NOT_WORKING_MAX_DAYS);

        if (expiryDate.getTime() <= Date.now()) {
          throw new Error(
            `This Not Working device passed the ${NOT_WORKING_MAX_DAYS}-day posting window from its last working date and cannot be posted.`,
          );
        }

        // Posting later consumes the time already elapsed since the last
        // working date; it never creates a fresh 60-day period.
        biddingEndsAt = expiryDate.toISOString();
      } else {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + WORKING_BIDDING_DAYS);
        biddingEndsAt = expiryDate.toISOString();
      }

      const { data: insertedData, error } = await supabase
        .from("listings")
        .insert([
          {
            seller_id: userId,
            device_model: formData.model.trim().replace(/\s+/g, " "),
            condition: formData.condition,
            asking_price: finalPrice,
            // Postgres date columns reject empty strings -> send null instead.
            last_working_date: formData.last_working_date || null,
            expires_at: biddingEndsAt,
            scrap_value: scrapValue,
            images: uploadedMediaUrls, // Pass all combined assets here
            status: "active",
            description: finalDescription,
            barangay: userBarangay,
            category: formData.category,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (insertedData && selectedIssues.length > 0) {
        await handleHazardDetection(insertedData.id, selectedIssues);
      }
      alert("Listing Created Successfully!");
      resetCreateListingForm();
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false); // Safeguard against sticking at "Processing..."
    }
  };
  const activeLabel = formData.category || "Device";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-white w-full max-w-xl max-h-[calc(100dvh-2rem)] h-[calc(100dvh-2rem)] rounded-3xl shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            Create E-waste Listing
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator — 5 steps */}
        <div className="px-8 pt-2 pb-6 shrink-0">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((num, idx) => (
              <React.Fragment key={num}>
                {idx > 0 && (
                  <div
                    className={`flex-1 h-[3px] rounded-full transition-colors duration-500 ${
                      step > idx ? "bg-[#17708c]" : "bg-gray-100"
                    }`}
                  />
                )}
                <div
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500 ${
                    step >= num
                      ? "bg-[#17708c] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {num}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div
          className="flex-1 min-h-0 p-8 pb-6 space-y-6 overflow-y-auto overscroll-contain touch-pan-y"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <p className="text-2xl font-bold text-gray-800 text-left">
                Select Device Category
              </p>

              <div className="grid grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={
                      () =>
                        setFormData({
                          ...formData,
                          category: cat.id,
                          model: "",
                        }) // Reset model when category changes
                    }
                    className={`flex flex-col items-center justify-center p-7 rounded-2xl border-2 transition-all duration-200 ${formData.category === cat.id
                      ? "border-[#17708c] bg-emerald-50/40 text-[#17708c]"
                      : "border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-500"
                      }`}
                  >
                    <div className="mb-4">{cat.icon}</div>
                    <span className="text-base font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Select Model */}
              <div className="pt-2">
                <label className="text-2xl font-bold text-gray-800 block mb-3">
                  Select Model
                </label>
                <input
                  type="text"
                  disabled={!formData.category}
                  placeholder={
                    !formData.category
                      ? "Please choose a category first..."
                      : formData.category === "Parts"
                        ? "e.g., iPhone 13 Pro - LCD Screen, MacBook Air M1 - Battery"
                        : "e.g., iPhone 13 Pro, MacBook Pro 2021, etc..."
                  }
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#17708c] disabled:bg-slate-50 disabled:cursor-not-allowed placeholder:text-gray-300"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                />
              </div>

              {hasFormError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 animate-in fade-in duration-200">
                  <AlertTriangle
                    size={18}
                    className="text-red-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs font-medium text-red-700 leading-normal">
                    <span className="font-bold">Error:</span> This is a
                    non-small form factor device. Large household appliances
                    cannot be listed on this platform.
                  </p>
                </div>
              )}

              <button
                disabled={!formData.category || !formData.model || hasFormError}
                onClick={() => setStep(2)}
                className={`w-full py-4 mt-2 rounded-2xl font-bold text-base transition-all ${formData.category && formData.model && !hasFormError
                  ? "bg-[#17708c] text-white shadow-lg shadow-teal-900/10 hover:bg-[#125f75]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
              >
                Continue
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              {/* Photos and Videos */}
              <div className="space-y-4">
                <p className="text-2xl font-bold text-gray-800">
                  Photos and Videos ({formData.attachments.length}/5)
                </p>
                <p className="text-sm text-gray-400 -mt-3">
                  Add photos and videos to help buyers see the device condition
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl py-12 px-6 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-[#17708c]/40 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                    <ImageIcon size={26} />
                  </div>
                  <p className="text-base font-medium text-gray-800">Add photos</p>
                  <p className="text-sm text-gray-400 mt-1 text-center">
                    Supported formats: JPG, PNG, MP4, MOV • Max file size: 10MB
                    per file
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/jpg, video/mp4, video/quicktime, video/mov"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleAssetAttachment}
                  />
                </div>

                {formData.attachments.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {formData.attachments.map((item, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group"
                      >
                        {item.type === "image" ? (
                          <img
                            src={item.previewUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={item.previewUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.attachments.length === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                    <AlertTriangle size={18} className="text-red-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-900">
                        Photos Required
                      </p>
                      <p className="text-xs text-red-700/80">
                        Please upload at least one photo or video of the device
                        to continue.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Device Condition */}
              <ConditionSection
                selected={formData.condition}
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    condition: val,
                    last_working_date:
                      val === "Working" ? "" : prev.last_working_date,
                  }))
                }
              />

              {formData.condition === "Not Working" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block text-left">
                    When was this device last working?
                  </label>
                  <p className="text-xs text-slate-400">
                    This helps Repair Shops determine the possible condition of
                    the reusable parts.
                  </p>
                  <input
                    type="date"
                    value={formData.last_working_date}
                    max={(() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      const year = yesterday.getFullYear();
                      const month = String(yesterday.getMonth() + 1).padStart(2, "0");
                      const day = String(yesterday.getDate()).padStart(2, "0");
                      return `${year}-${month}-${day}`;
                    })()}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        last_working_date: e.target.value,
                      }))
                    }
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-[#17708c]"
                  />
                  {!formData.last_working_date && (
                    <p className="text-xs text-red-500 font-medium">
                      Please specify the device's last-used/last-working date.
                    </p>
                  )}
                  {formData.last_working_date && (() => {
                    const lastWorking = new Date(`${formData.last_working_date}T00:00:00`);
                    if (Number.isNaN(lastWorking.getTime())) return null;
                    const expiry = new Date(lastWorking.getTime());
                    expiry.setDate(expiry.getDate() + NOT_WORKING_MAX_DAYS);
                    const remainingMs = expiry.getTime() - Date.now();
                    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
                    const isTooOld = remainingMs <= 0;
                    return (
                      <div className={`rounded-xl border p-3 text-xs ${
                        isTooOld
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}>
                        <p className="font-bold">
                          {isTooOld
                            ? `This device is beyond the ${NOT_WORKING_MAX_DAYS}-day posting window.`
                            : `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining from the ${NOT_WORKING_MAX_DAYS}-day window.`}
                        </p>
                        <p className="mt-1 opacity-80">
                          Listing expiry: {expiry.toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={
                    formData.attachments.length === 0 ||
                    !formData.condition ||
                    (formData.condition === "Not Working" &&
                      (!formData.last_working_date ||
                        new Date(`${formData.last_working_date}T23:59:59.999`).getTime() +
                          NOT_WORKING_MAX_DAYS * 24 * 60 * 60 * 1000 <= Date.now()))
                  }
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 rounded-2xl font-bold text-base transition-all enabled:bg-[#17708c] enabled:text-white enabled:hover:bg-[#125f75] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              {/* Damage Assessment Info */}
              <div className="bg-blue-50 border border-blue-200/70 rounded-2xl p-5 flex gap-3">
                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-900">
                    Damage Assessment
                  </p>
                  <p className="text-xs text-blue-700/90 mt-1 leading-relaxed">
                    Please select all damages and issues that apply to your
                    device. This helps buyers understand the condition and
                    helps us calculate accurate recovery values.
                  </p>
                </div>
              </div>

              {/* No Visible Damage */}
              <button
                onClick={handleNoDamageToggle}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left ${issues.noDamage ? "border-[#17708c] bg-emerald-50/40" : "border-gray-100 bg-white hover:border-gray-200"}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${issues.noDamage ? "bg-[#17708c] border-[#17708c]" : "border-gray-300"}`}
                  >
                    {issues.noDamage && (
                      <CheckCircle2 size={16} className="text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      No Visible Damage
                    </p>
                    <p className="text-xs text-gray-400">
                      Device is in excellent working condition
                    </p>
                  </div>
                </div>
                {issues.noDamage && (
                  <CheckCircle2
                    size={24}
                    className="text-emerald-500 shrink-0"
                  />
                )}
              </button>

              {/* ISSUE SECTIONS */}
              {!issues.noDamage && (
                <div className="space-y-8">
                  <DiagnosisSection
                    title="Physical Damage"
                    count={issues.physical.length}
                    items={[
                      "Cracked/Shattered Screen",
                      "Scratched Screen",
                      "Cracked Back Panel",
                      "Bent or Damaged Frame",
                      "Water Damage/ Liquid Exposure",
                      "Missing Parts (buttons, ports, etc.)",
                    ]}
                    selected={issues.physical}
                    onToggle={(item) => toggleIssue("physical", item)}
                  />

                  <DiagnosisSection
                    title="Functional Issues"
                    count={issues.functional.length}
                    items={[
                      "Won't Power On",
                      "Dead/Degraded Battery",
                      "Charging Problems",
                      "Display Not Working (black screen, lines)",
                      "Touch Screen Not Responding",
                      "Camera Not Working",
                      "Speaker/Microphone Issues",
                      "Wi-Fi/Bluetooth Not Working",
                      "Buttons Not Working",
                    ]}
                    selected={issues.functional}
                    onToggle={(item) => toggleIssue("functional", item)}
                  />

                  <DiagnosisSection
                    title="Cosmetic Issues"
                    count={issues.cosmetic.length}
                    items={[
                      "Minor Dents/Scratches",
                      "Paint Chipping/Fading",
                      "Discoloration",
                    ]}
                    selected={issues.cosmetic}
                    onToggle={(item) => toggleIssue("cosmetic", item)}
                  />
                </div>
              )}

              {/* Additional Details */}
              <div className="space-y-3">
                <p className="text-lg font-bold text-gray-800">
                  Additional Details (Optional)
                </p>
                <textarea
                  placeholder="Provide any additional information about the device condition, when damage occurred, etc..."
                  className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-sm min-h-[120px] outline-none focus:border-[#17708c] placeholder:text-gray-300"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              {/* Assessment Summary */}
              {(allSelectedIssues.length > 0 || issues.noDamage) && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold text-gray-700">
                    Assessment Summary
                  </p>
                  {issues.noDamage ? (
                    <p className="text-xs text-emerald-600 font-medium">
                      No issues identified - Excellent condition
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 font-medium">
                        {allSelectedIssues.length}{" "}
                        {allSelectedIssues.length === 1 ? "issue" : "issues"}{" "}
                        identified
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allSelectedIssues.map((issue, idx) => (
                          <span
                            key={idx}
                            className="bg-orange-50 text-orange-600 text-xs px-3 py-1 rounded-full border border-orange-100 font-medium"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isAssessmentComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle
                    size={18}
                    className="text-amber-500 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      Assessment Incomplete
                    </p>
                    <p className="text-xs text-amber-700/80">
                      Please select at least one damage/issue or mark the
                      device as "No Visible Damage" to continue.
                    </p>
                  </div>
                </div>
              )}

              {conditionAssessmentMismatch && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={20}
                      className="text-red-500 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-red-900">
                        Assessment and Condition Need Confirmation
                      </p>
                      <p className="text-xs text-red-700 leading-relaxed mt-1">
                        {mismatchReason}
                      </p>
                    </div>
                  </div>

                  {formData.condition === "Working" && hasFunctionalIssues && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleChangeConditionToNotWorking}
                        className="p-4 rounded-xl border-2 border-red-200 bg-white text-left hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <p className="text-sm font-bold text-gray-800">
                          Change to Not Working
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Keep the reported functional issues and correct the device condition.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={handleKeepWorkingAndClearFunctionalIssues}
                        className="p-4 rounded-xl border-2 border-gray-200 bg-white text-left hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <p className="text-sm font-bold text-gray-800">
                          Keep Working
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Remove the selected functional issues and keep the earlier condition.
                        </p>
                      </button>
                    </div>
                  )}

                  {formData.condition === "Not Working" && issues.noDamage && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleChangeConditionToWorking}
                        className="p-4 rounded-xl border-2 border-gray-200 bg-white text-left hover:border-[#17708c]/40 hover:bg-emerald-50/30 transition-colors"
                      >
                        <p className="text-sm font-bold text-gray-800">
                          Change to Working
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Keep "No Visible Damage" and correct the device condition.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={handleKeepNotWorkingAndClearNoDamage}
                        className="p-4 rounded-xl border-2 border-gray-200 bg-white text-left hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <p className="text-sm font-bold text-gray-800">
                          Keep Not Working
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Remove "No Visible Damage" and complete the issue assessment.
                        </p>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={!isAssessmentComplete || conditionAssessmentMismatch}
                  onClick={() => setStep(4)}
                  className="flex-1 py-4 rounded-2xl font-bold text-base transition-all enabled:bg-[#17708c] enabled:text-white enabled:hover:bg-[#125f75] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-6 max-h-[85vh] pr-2">
              <div className="bg-white rounded-2xl p-6 border-2 border-[#17708c] space-y-4">
                <div className="flex items-center gap-2">
                  <Percent size={18} className="text-[#17708c]" />
                  <p className="text-lg font-bold text-gray-800">
                    Set Your Asking Price
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-800">
                    Your Asking Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Percent
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder={
                        hasMarketHistory
                          ? `e.g., ${reusableValue}`
                          : "e.g., 6,000"
                      }
                      className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-[#17708c] placeholder:text-gray-300"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Set the minimum price you're willing to accept. Buyers can
                    bid at or above this price.
                  </p>
                </div>
              </div>


              {/* Estimated Recovery Value Header (Green Card) */}
              {hasMarketHistory ? (
                /* Dynamic Market Card View */
                <div className="bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white rounded-3xl p-6 relative shadow-lg">
                  <div className="flex items-center gap-2 text-xs font-medium opacity-95">
                    <Percent size={13} />
                    Estimated Recovery Value
                  </div>
                  <h3 className="text-4xl font-bold mt-1">
                    ₱{reusableValue.toLocaleString()}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mt-5">
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                      <p className="text-xs opacity-80 mb-1">
                        Reusable Parts Value
                      </p>
                      <p className="text-2xl font-bold">
                        ₱{reusableValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                      <p className="text-xs opacity-80 mb-1">
                        Raw Scrap Value
                      </p>
                      <p className="text-2xl font-bold">
                        ₱{scrapValue.toLocaleString()}
                      </p>
                      <p className="text-[10px] opacity-70 mt-0.5">
                        (15% of parts value)
                      </p>
                    </div>
                  </div>

                  <p className="text-sm mt-4 opacity-90">
                    Price Range: ₱
                    {Math.round(reusableValue * 0.85).toLocaleString()} - ₱
                    {Math.round(reusableValue * 1.15).toLocaleString()}
                  </p>

                  <div className="bg-white/10 rounded-xl p-3.5 mt-4 flex gap-2.5 items-start">
                    <Info size={14} className="shrink-0 mt-0.5 opacity-90" />
                    <p className="text-xs leading-relaxed opacity-95">
                      This is a non-binding estimate. Actual offers may vary
                      based on buyer assessment and market conditions.
                    </p>
                  </div>
                </div>
              ) : (
                /* "No Transaction History Found" Slate Alternative Card */
                <div className="bg-slate-700 text-white rounded-3xl p-6 relative shadow-lg">
                  <div className="flex gap-3 items-start mb-3">
                    <HelpCircle
                      className="text-slate-300 shrink-0 mt-1"
                      size={22}
                    />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-300">
                        Estimated Recovery Value
                      </p>
                      <h3 className="text-xl font-bold leading-snug">
                        No transaction history found
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200/90 leading-relaxed bg-slate-800/40 p-3.5 rounded-xl border border-slate-600/30">
                    This model hasn't been listed on the marketplace before. You
                    have complete flexibility to input your desired asking price
                    below!
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-600/40 flex justify-between items-center">
                    <span className="text-xs text-slate-300 font-medium">
                      Estimated Baseline Scrap Value:
                    </span>
                    <span className="text-sm font-extrabold text-teal-300">
                      ₱{scrapValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-[#17708c]" />
                  <p className="text-lg font-bold text-gray-800">
                    Component Breakdown
                  </p>
                </div>

                <div className="space-y-2">
                  {issues.noDamage ? (
                    <div className="text-center py-4 bg-emerald-50/20 rounded-xl border border-dashed border-emerald-100">
                      <p className="text-xs text-emerald-600 font-bold">
                        All core {formData.category || "device"} subsystems are
                        fully intact (100%)
                      </p>
                    </div>
                  ) : (
                    componentBreakdown.map((comp, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-gray-50/80 rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-gray-700 font-medium truncate">
                            {comp.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {hasMarketHistory ? (
                            <span
                              className={`text-sm font-bold ${comp.status === "Intact" ? "text-gray-800" : "text-gray-400"}`}
                            >
                              ₱{comp.value.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-gray-400">
                              {comp.weightPercentage}% alloc
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Total Estimated Value
                  </span>
                  <span className="text-lg font-bold text-[#17708c]">
                    ₱{reusableValue.toLocaleString()}
                  </span>
                </div>

                {/* Bottom Summary context toggle display */}
                {hasMarketHistory ? (
                  <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-xs font-medium text-gray-400">
                    <span>Maximum Reusable Component Valuen</span>
                    <span className="font-bold text-gray-600">
                      ₱{reusableValue.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-gray-50 bg-slate-50/50 p-2.5 rounded-xl text-xs text-slate-500 leading-normal flex gap-2">
                    <Info
                      size={14}
                      className="text-slate-400 shrink-0 mt-0.5"
                    />
                    <p>
                      Since this{" "}
                      <span className="font-semibold text-slate-700">
                        {formData.model || "model"}
                      </span>{" "}
                      configuration is new to the marketplace index database,
                      core harvesting yields are visualized via weight
                      allocations rather than pricing metrics estimates.
                    </p>
                  </div>
                )}
              </div>


              {/* Market Insights */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#17708c]" />
                  <p className="text-lg font-bold text-gray-800">
                    Market Insights
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Market Trend",
                      val: hasMarketHistory ? "Stable" : "New Model",
                      icon: <TrendingUp size={16} />,
                    },
                    {
                      label: "Price Range",
                      val: hasMarketHistory ? "±30%" : "Open Market",
                      icon: <Percent size={16} />,
                    },
                    {
                      label: "Confidence",
                      val: hasMarketHistory ? "Medium" : "Low",
                      icon: <ShieldCheck size={16} />,
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-gray-50/70 p-4 rounded-2xl text-center border border-gray-100 flex flex-col items-center justify-center gap-1"
                    >
                      <div className="text-[#17708c]">{stat.icon}</div>
                      <p className="text-xs text-gray-400 font-medium">
                        {stat.label}
                      </p>
                      <p className="text-sm font-bold text-gray-800 leading-tight">
                        {stat.val}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1. Valuation Logic Summary - Based on provided image */}
              <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-2">
                <p className="text-sm font-bold text-gray-800">
                  Valuation based on:
                </p>
                <ul className="space-y-1 ml-2">
                  <li className="text-xs text-gray-500">
                    • Device condition: {formData.condition}
                  </li>
                  <li className="text-xs text-gray-500">
                    • {allSelectedIssues.length} damage(s) reported
                  </li>
                  <li className="text-xs text-gray-500">
                    • All original parts (+5% value)
                  </li>
                </ul>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/90 backdrop-blur pb-2">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={!isStep4Complete || loading}
                  onClick={() => setStep(5)}
                  className="flex-1 py-4 rounded-2xl font-bold text-base transition-all enabled:bg-[#17708c] enabled:text-white enabled:hover:bg-[#125f75] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800">
                  Preparation & Data Sanitization
                </p>
                <p className="text-sm text-gray-500">
                  Watch the recommended guides, then confirm the preparation and
                  data-sanitization checklist before publishing your listing.
                </p>
              </div>

              {/* 2. Recommended Preparation Videos */}
              <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2.5 text-gray-800">
                  <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                    <Video size={16} />
                  </div>
                  <p className="text-lg font-bold">
                    Recommended Preparation Videos
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  Watch these helpful guides to properly prepare your{" "}
                  {formData.model || activeLabel} for sale:
                </p>
                <div className="space-y-2">
                  {[
                    {
                      title: `How to Factory Reset a ${activeLabel}`,
                      sub: "Step-by-step decoupling and account decoupling guidelines.",
                      url: "https://youtu.be/dF_MPKfM-yc?si=IBWnEbnu-t-qgE1N",
                    },
                    {
                      title: "How to Safely Remove Hard Drive Data",
                      sub: "Secure block overwriting methods to completely clear system storage files safely.",
                      url: "https://youtu.be/hcLU2dz8xJM?si=I0ylvUdxXCwE1UYy",
                    },
                    {
                      title: `Preparing Your ${activeLabel} For Sale`,
                      sub: "Best practices for physical optimization prior to processing recovery scrap.",
                      url: "https://youtu.be/KBUmzdrzt2c?si=p4m7YPIQWQf6Ay_H",
                    },
                  ].map((vid, i) => (
                    <a
                      key={i}
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-white border border-red-50 rounded-xl group hover:border-red-200 transition-colors block text-left decoration-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2.5 rounded-xl text-red-500">
                          <Video size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 group-hover:text-red-600 transition-colors">
                            {vid.title}
                          </p>
                          <p className="text-xs text-gray-400">{vid.sub}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-red-500 transition-colors shrink-0 ml-2">
                        Watch →
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* 3. Data Sanitization Header & Checklist */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />

                  {/* STEP 1: Add 'relative' and 'z-index' to this wrapper */}
                  <div className="space-y-2 relative z-[60]">
                    <p className="text-base font-bold text-gray-800">
                      Data Sanitization Required
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Before listing your device, please ensure all personal
                      data has been removed.
                    </p>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Prevents the click from triggering parent scroll events
                        setShowSanitizationGuide(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-amber-400 rounded-xl text-amber-600 text-sm font-bold bg-transparent hover:bg-amber-100 active:scale-95 transition-all cursor-pointer pointer-events-auto"
                    >
                      <ExternalLink size={14} /> View Sanitization Guide
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      Data Sanitization Checklist{" "}
                      <span className="text-red-500">*</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Only checks relevant to {formData.category || "this device"} are shown.
                    </p>
                  </div>
                  <ShieldCheck size={18} className="text-[#2d7a7f] shrink-0" />
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-5 shadow-sm">
                  {applicableChecklistItems.length > 0 ? (
                    <>
                      <p className="text-sm text-gray-500">
                        Confirm each step has been completed for{" "}
                        {formData.model || "this device"}:
                      </p>

                      {applicableChecklistItems.map((item) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          className="flex items-start gap-4 cursor-pointer group select-none"
                          onClick={() => handleChecklistToggle(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleChecklistToggle(item.id);
                            }
                          }}
                        >
                          <div
                            className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                              checklist[item.id]
                                ? item.id === "hazardAcknowledged"
                                  ? "bg-amber-500 border-amber-500"
                                  : "bg-[#2d7a7f] border-[#2d7a7f]"
                                : "border-gray-200"
                            }`}
                          >
                            {checklist[item.id] && (
                              <CheckCircle2 size={14} className="text-white" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className="text-base font-bold text-gray-800 group-hover:text-[#2d7a7f]">
                              {item.label}
                            </p>
                            <p className="text-sm text-gray-400 leading-snug">
                              {item.sub}
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          No data-sanitization checks apply to this category
                        </p>
                        <p className="text-xs text-slate-400 leading-tight mt-1">
                          {formData.category === "Monitor"
                            ? "This category does not normally contain user storage or account data."
                            : formData.category === "Parts"
                              ? "Individual parts do not require the device-level sanitization checks used for complete computing devices."
                              : "The selected category has no device-level data checks configured."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Hazardous Materials Section */}
              {showHazardWarning && (
                <div className="bg-orange-50/60 border border-orange-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={22}
                      className="text-orange-500 shrink-0 mt-0.5"
                    />
                    <div className="space-y-3 w-full">
                      <p className="text-sm font-bold text-gray-800">
                        Hazardous Materials Detected
                      </p>
                      <p className="text-xs text-gray-500 leading-tight">
                        This device contains components (Lithium-Ion Battery)
                        classified as hazardous waste due to reported
                        conditions.
                      </p>
                      <button
                        onClick={() => setShowHazardGuidelines(true)}
                        className="flex items-center gap-2 w-full justify-center py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                      >
                        <ExternalLink size={12} /> View Handling & Disposal
                        Guidelines
                      </button>

                      <label className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={checklist.hazardAcknowledged}
                          onChange={() =>
                            handleChecklistToggle("hazardAcknowledged")
                          }
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-[#2d7a7f]"
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-800">
                            I acknowledge the presence of hazardous materials
                          </p>
                          <p className="text-xs text-gray-400 leading-tight">
                            I have read the guidelines and agree to comply with
                            safety requirements for disposal or transfer.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Acknowledgement Section */}
              <div className="space-y-4 pt-4">
                <label className="flex items-start gap-3 p-5 bg-gray-50 rounded-2xl cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={checklist.valuationAcknowledged}
                    onChange={() =>
                      handleChecklistToggle("valuationAcknowledged")
                    }
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#2d7a7f]"
                  />
                  <div className="space-y-1">
                    <p className="text-base font-bold text-gray-800">
                      I acknowledge the valuation is a non-binding estimate
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {hasMarketHistory ? (
                        <>
                          I understand the Estimated Recovery Value (
                          <span className="text-[#17708c] font-semibold inline-flex items-center gap-1">
                            <Percent size={12} className="inline" />₱
                            {reusableValue.toLocaleString()}
                          </span>
                          ) is for decision-support only. Actual offers from
                          buyers may vary based on their assessment and market
                          conditions.
                        </>
                      ) : (
                        "I understand that estimated marketplace recovery values are currently inactive for this model, and I am establishing an open-market target price manual configuration."
                      )}
                    </p>
                  </div>
                </label>
              </div>

              {!isStep5Complete && (
                <p className="text-center text-xs text-red-500 font-bold px-6">
                  Complete all applicable data-sanitization checks and acknowledge
                  that the valuation is a non-binding estimate before creating the listing.
                </p>
              )}

              <div className="flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur pb-2 pt-2 z-10000">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={!isStep5Complete || loading}
                  onClick={handleFinish}
                  className="flex-1 py-4 rounded-2xl font-bold text-base transition-all enabled:bg-[#17708c] enabled:text-white enabled:hover:bg-[#125f75] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Create Listing"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showHazardGuidelines && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* 1. Backdrop: Fixed to the viewport, not the parent modal */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowHazardGuidelines(false)}
          />

          {/* 2. Modal Card: Independent of Step 3's scroll state */}
          <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="font-extrabold text-gray-800 tracking-tight">
                  Hazardous Material Guidelines
                </h3>
              </div>
              <button
                onClick={() => setShowHazardGuidelines(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* The ONLY Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800 text-sm">
                    Lithium-Ion Battery
                  </p>
                  <p className="text-xs text-gray-400 font-medium">
                    LiCoO2
                  </p>
                </div>
                <span className="bg-orange-100 text-orange-700 text-xs font-black px-3 py-1 rounded-full uppercase">
                  High Risk
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-wide">
                  <AlertTriangle size={14} /> Health & Environmental Risks
                </div>
                <ul className="grid grid-cols-1 gap-3 text-[12px] text-gray-600 ml-4">
                  <li className="flex gap-2">
                    •{" "}
                    <span>Fire and explosion risk if damaged or punctured</span>
                  </li>
                  <li className="flex gap-2">
                    • <span>Toxic fumes if burned</span>
                  </li>
                  <li className="flex gap-2">
                    • <span>Chemical burns from electrolyte leakage</span>
                  </li>
                  <li className="flex gap-2">
                    •{" "}
                    <span>
                      Soil and water contamination from lithium and cobalt
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wide">
                  <ShieldCheck size={14} /> Safe Handling Guidelines
                </div>
                <ul className="grid grid-cols-1 gap-3 text-[12px] text-gray-600 ml-4">
                  <li className="flex gap-2">
                    •{" "}
                    <span>Store in cool, dry place away from heat sources</span>
                  </li>
                  <li className="flex gap-2">
                    •{" "}
                    <span>
                      Keep terminals covered to prevent short circuits
                    </span>
                  </li>
                  <li className="flex gap-2">
                    • <span>Do not puncture, crush, or disassemble</span>
                  </li>
                  <li className="flex gap-2">
                    • <span>Handle swollen batteries with extreme caution</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wide">
                  <Info size={14} /> Disposal Procedure
                </div>
                <ul className="space-y-2 text-xs text-blue-800/80 ml-1">
                  <li className="flex gap-2">
                    <span>1.</span>{" "}
                    <span>Discharge battery to below 25% if possible</span>
                  </li>
                  <li className="flex gap-2">
                    <span>2.</span>{" "}
                    <span>Cover terminals with non-conductive tape</span>
                  </li>
                  <li className="flex gap-2">
                    <span>3.</span>{" "}
                    <span>Place in approved collection container</span>
                  </li>
                  <li className="flex gap-2">
                    <span>4.</span>{" "}
                    <span>Transport to certified recycling facility</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-400 italic leading-relaxed text-center px-4">
                  Regulatory Info: Class 9 Hazardous Material | Regulated by:
                  Department of Environment and Natural Resources (DENR)
                </p>
              </div>
            </div>

            {/* Footer: Fixed at the bottom */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
              <button
                onClick={() => {
                  setChecklist((prev) => ({
                    ...prev,
                    hazardAcknowledged: true,
                  }));
                  setShowHazardGuidelines(false);
                }}
                className="w-full py-4 bg-[#2d7a7f] hover:bg-[#246367] text-white rounded-2xl font-bold text-sm shadow-lg transition-all"
              >
                I Understand & Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
      {showSanitizationGuide && (
        <SanitizationGuideModal
          isOpen={showSanitizationGuide}
          onClose={() => setShowSanitizationGuide(false)}
          deviceModel={formData.model}
        />
      )}
    </div>
  );
};

export default CreateListingModal;