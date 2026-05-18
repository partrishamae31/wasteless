import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import SanitizationGuideModal from "./SanitizationGuideModal";
import {
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

const DiagnosisSection = ({ title, count, items, selected, onToggle }) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-bold text-gray-700">
          {title}{" "}
          <span className="text-gray-400 font-normal ml-1">
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
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? "border-[#2d7a7f] bg-teal-50/30"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-[#2d7a7f] border-[#2d7a7f]"
                    : "border-gray-200 bg-white"
                }`}
              >
                {isSelected && (
                  <CheckCircle2 size={14} className="text-white" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${isSelected ? "text-gray-800" : "text-gray-500"}`}
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
      activeStyles: "border-emerald-500 bg-emerald-50/30 text-emerald-700",
    },
    {
      id: "Defective",
      label: "Defective",
      sub: "Some components not working",
      activeStyles: "border-blue-500 bg-blue-50/30 text-blue-700",
    },
    // {
    //   id: "Parts Only",
    //   label: "Parts Only",
    //   sub: "For harvesting components",
    //   activeStyles: "border-slate-500 bg-slate-50/30 text-slate-700",
    // },
  ];

  return (
    <div className="space-y-3 w-full">
      <label className="text-sm font-semibold text-slate-700 block text-left">
        Device Condition
      </label>

      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const isSelected = selected === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`w-full p-4 rounded-xl border transition-all text-left flex flex-col justify-center gap-1 ${
                isSelected
                  ? `${opt.activeStyles} ring-1 ring-inset ring-opacity-50`
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`text-[15px] font-bold ${
                  isSelected ? "" : "text-slate-700"
                }`}
              >
                {opt.label}
              </span>
              <span className="text-xs text-slate-500 font-medium">
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
  const [checklist, setChecklist] = useState({
    factoryReset: false,
    accountsRemoved: false,
    simRemoved: false,
    filesDeleted: false,
    hazardAcknowledged: false,
    valuationAcknowledged: false,
  });

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
  const [formData, setFormData] = useState({
    category: "",
    model: "",
    condition: "Defective", // Default condition
    description: "",
    attachments: [],
    price: "",
  });

  const fileInputRef = useRef(null);
  const [issues, setIssues] = useState({
    physical: [],
    functional: [],
    cosmetic: [],
    noDamage: false,
  });

  const isLargeApplianceDetected = () => {
    if (
      !formData.model ||
      (formData.category !== "Others" && formData.category !== "Parts")
    ) {
      return false;
    }

    const prohibitedKeywords = [
      "refrigerator",
      "fridge",
      "ref",
      "washing machine",
      "washer",
      "dryer",
      "aircon",
      "air con",
      "air conditioner",
      "ac",
      "microwave",
      "oven",
      "stove",
      "range hood",
      "freezer",
      "dishwasher",
      "chiller",
      "water dispenser",
    ];

    const inputLower = formData.model.toLowerCase().trim();
    return prohibitedKeywords.some((keyword) => inputLower.includes(keyword));
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
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      condition: issues.noDamage ? "Working" : "Defective",
    }));
  }, [issues.noDamage]);
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
        const { data: matchedListings, error } = await supabase
          .from("listings")
          .select("asking_price")
          .ilike("device_model", formData.model.trim());

        if (error) throw error;

        // Requirement: Checked if model has been specified 3 or more times
        if (matchedListings && matchedListings.length >= 3) {
          setHasMarketHistory(true);
          const totalMarketPrice = matchedListings.reduce(
            (sum, item) => sum + Number(item.asking_price || 0),
            0,
          );
          const computedAverage = totalMarketPrice / matchedListings.length;

          setFormData((prev) => ({
            ...prev,
            base_part_value: computedAverage,
            base_scrap_value: computedAverage * 0.15,
          }));
        } else {
          // Trigger the 'No transaction history available' mode
          setHasMarketHistory(false);

          // Fetch baseline category rates for safety behind the scenes
          const { data: fallbackRates } = await supabase
            .from("device_valuation_rates")
            .select("base_part_value, scrap_value")
            .eq("category", formData.category)
            .limit(1);

          if (fallbackRates && fallbackRates.length > 0) {
            setFormData((prev) => ({
              ...prev,
              base_part_value: fallbackRates.base_part_value,
              base_scrap_value: fallbackRates.scrap_value,
            }));
          } else {
            const categoricalDefaults = {
              Smartphone: { part: 3500, scrap: 500 },
              Laptop: { part: 7000, scrap: 1000 },
              Tablet: { part: 4500, scrap: 600 },
              Monitor: { part: 2500, scrap: 400 },
              Parts: { part: 2000, scrap: 300 },
              Others: { part: 1500, scrap: 200 },
            };
            const activeDefault =
              categoricalDefaults[formData.category] ||
              categoricalDefaults.Others;
            setFormData((prev) => ({
              ...prev,
              base_part_value: activeDefault.part,
              base_scrap_value: activeDefault.scrap,
            }));
          }
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

      // 1. Compute individual component baseline value
      const componentBaseValue = Math.round(baseValue * component.weight);

      // 2. Evaluate if user-selected diagnostics hit this component matrix
      const hasDamage = component.issues.some((issue) =>
        selectedIssues.includes(issue),
      );

      const isComponentIntact = issues.noDamage || !hasDamage;

      // 3. Accumulate only the intact component rows to guarantee alignment
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

    // CRITICAL FIX: Base total reusable calculation directly on the sum of what is intact
    // This completely removes individual rounding conflicts
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

  const isStep3Complete =
    checklist.factoryReset &&
    checklist.accountsRemoved &&
    checklist.simRemoved &&
    checklist.filesDeleted &&
    // Only require hazard check if the warning is actually shown
    (showHazardWarning ? checklist.hazardAcknowledged : true) &&
    checklist.valuationAcknowledged;

  const checkAndNotifyHarvesters = async (newListing) => {
    try {
      // Matches your schema: device_model, max_price, is_active
      const { data: matchingAlerts } = await supabase
        .from("alerts")
        .select("harvester_id")
        .eq("device_model", newListing.device_model)
        .eq("is_active", true)
        .gte("max_price", newListing.asking_price);

      if (matchingAlerts?.length > 0) {
        const notifications = matchingAlerts.map((alert) => ({
          user_id: alert.harvester_id,
          type: "alert_match",
          title: "New E-Waste Match!",
          content: `A ${newListing.device_model} was listed for ₱${newListing.asking_price}.`,
          related_listing_id: newListing.id,
          is_read: false,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    } catch (err) {
      console.error("Alert Engine Error:", err.message);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    // Filter for PNG and JPEG/JPG only
    const validFiles = files.filter(
      (file) =>
        file.type === "image/png" ||
        file.type === "image/jpeg" ||
        file.type === "image/jpg",
    );

    if (validFiles.length !== files.length) {
      alert("Only PNG and JPEG files are allowed.");
    }

    if (validFiles.length + formData.attachments.length > 5) {
      alert("You can only upload up to 5 images.");
    }

    setFormData({
      ...formData,
      images: [...formData.images, ...validFiles],
    });
  };

  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
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
      const finalPrice =
        formData.price === "" ? reusableValue : parseFloat(formData.price);

      // 2. Map the array to the existing images column
      const { data: insertedData, error } = await supabase
        .from("listings")
        .insert([
          {
            seller_id: userId,
            device_model: formData.model,
            condition: formData.condition,
            asking_price: finalPrice,
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

      if (insertedData) await checkAndNotifyHarvesters(insertedData);

      alert("Listing Created Successfully!");
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false); // Safeguard against sticking at "Processing..."
    }
  };
  const activeLabel = formData.category || "Device";
  const steps = [1, 2, 3];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            Create E-waste Listing
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center py-6 px-20 relative">
          <div className="absolute h-[2px] left-32 right-32 top-1/2 -translate-y-1/2 bg-gray-100">
            <div
              className="h-full bg-[#2d7a7f] transition-all duration-500"
              style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
            ></div>
          </div>
          <div className="flex justify-between w-full max-w-[300px] z-10">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 ${
                  step >= num
                    ? "bg-[#2d7a7f] border-[#2d7a7f] text-white"
                    : "bg-white border-gray-200 text-gray-400"
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <p className="text-sm font-semibold text-slate-700">
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
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-200 ${
                      formData.category === cat.id
                        ? "border-teal-500 bg-teal-50/30 text-teal-600"
                        : "border-slate-100 text-slate-400 hover:border-slate-200"
                    } ${cat.id === "Others" ? "col-span-1" : ""}`}
                  >
                    <div className="mb-3">{cat.icon}</div>
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Input field replacing the static Dropdown structure */}
              <div className="mt-6">
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Device Model / Name
                </label>
                <input
                  type="text"
                  disabled={!formData.category}
                  placeholder={
                    formData.category
                      ? "e.g., iPhone 13 Pro, MacBook Pro 2021, etc..."
                      : "Please choose a category first..."
                  }
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/10 disabled:bg-slate-50 disabled:cursor-not-allowed"
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
                  <p className="text-[11px] font-medium text-red-700 leading-normal">
                    <span className="font-bold">Error:</span> This is a
                    non-small form factor device. Large household appliances
                    cannot be listed on this platform.
                  </p>
                </div>
              )}

              <button
                disabled={!formData.category || !formData.model || hasFormError}
                onClick={() => setStep(2)}
                className={`w-full py-4 mt-4 rounded-xl font-bold text-sm transition-all ${
                  formData.category && formData.model && !hasFormError
                    ? "bg-[#2d7a7f] text-white shadow-lg shadow-teal-900/10"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                Continue
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              {/* Photo Upload (Simplified for brevity) */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-700">
                  Photos and Videos ({formData.attachments.length}/5)
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors"
                >
                  <div className="flex gap-2 text-gray-300 mb-2">
                    <ImageIcon size={24} />
                    <Film size={24} />
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    Add photos or videos
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
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
                  <div className="grid grid-cols-5 gap-2 pt-2">
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

                        {/* Status/Type pill indicator overlay */}
                        <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-[2px] rounded px-1 py-0.5 text-[8px] font-bold text-white uppercase flex items-center gap-0.5">
                          {item.type === "image" ? (
                            <ImageIcon size={8} />
                          ) : (
                            <Film size={8} />
                          )}
                          {item.type}
                        </div>

                        {/* Action remove trigger click button icon hook */}
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
              </div>

              {/* Damage Assessment Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4">
                <Info size={20} className="text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    Damage Assessment
                  </p>
                  <p className="text-[11px] text-blue-700/80">
                    Please select all damages and issues that apply to your
                    device.
                  </p>
                </div>
              </div>

              {/* No Visible Damage */}
              <button
                onClick={handleNoDamageToggle}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${issues.noDamage ? "border-[#2d7a7f] bg-teal-50/20" : "border-gray-100 bg-white"}`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${issues.noDamage ? "bg-[#2d7a7f] border-[#2d7a7f]" : "border-gray-200"}`}
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
                  <CheckCircle2 size={24} className="text-emerald-500" />
                )}
              </button>

              <ConditionSection
                selected={formData.condition}
                onChange={(val) => setFormData({ ...formData, condition: val })}
              />

              {/* ISSUE SECTIONS */}
              {!issues.noDamage && (
                <div className="space-y-8 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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

                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-700">
                      Additional Details (Optional)
                    </p>
                    <textarea
                      placeholder="Provide any additional information about the device condition..."
                      className="w-full p-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs min-h-[100px] outline-none focus:border-[#2d7a7f]"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  {/* ASSESSMENT SUMMARY - Matches image_684bfa.png */}
                  {(allSelectedIssues.length > 0 || issues.noDamage) && (
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3">
                      <p className="text-xs font-bold text-gray-700">
                        Assessment Summary
                      </p>
                      {issues.noDamage ? (
                        <p className="text-[11px] text-emerald-600 font-medium">
                          No issues identified - Excellent condition
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-[11px] text-gray-500 font-medium">
                            {allSelectedIssues.length}{" "}
                            {allSelectedIssues.length === 1
                              ? "issue"
                              : "issues"}{" "}
                            identified
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {allSelectedIssues.map((issue, idx) => (
                              <span
                                key={idx}
                                className="bg-orange-50 text-orange-600 text-[10px] px-3 py-1 rounded-full border border-orange-100 font-medium"
                              >
                                {issue}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Assessment Incomplete Warning */}
              {!isAssessmentComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle
                    size={18}
                    className="text-amber-500 shrink-0"
                  />
                  <div>
                    <p className="text-[11px] font-bold text-amber-900">
                      Assessment Incomplete
                    </p>
                    <p className="text-[10px] text-amber-700/80">
                      Please select at least one damage/issue or mark the device
                      as "No Visible Damage" to continue.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border border-gray-100 text-gray-500 rounded-2xl font-bold"
                >
                  Back
                </button>
                <button
                  disabled={!isAssessmentComplete}
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 bg-[#2d7a7f] text-white rounded-2xl font-bold disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Complete Assessment
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Estimated Recovery Value Header (Green Card) */}
              {hasMarketHistory ? (
                /* Dynamic Market Card View */
                <div className="bg-[#00c853] text-white rounded-3xl p-6 relative shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-90">
                        Estimated Recovery Value
                      </p>
                      <h3 className="text-4xl font-bold">
                        ₱{reusableValue.toLocaleString()}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="bg-white/20 text-[10px] px-3 py-1 rounded-full border border-white/30">
                        Market Estimate
                      </span>
                      <span className="flex items-center gap-1 text-[10px] opacity-90">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>{" "}
                        Dynamic
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                      <p className="text-[10px] opacity-80 mb-1">
                        Reusable Part Value
                      </p>
                      <p className="text-xl font-bold">
                        ₱{reusableValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                      <p className="text-[10px] opacity-80 mb-1">
                        Raw Scrap Value
                      </p>
                      <p className="text-xl font-bold">
                        ₱{scrapValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] mt-4 opacity-80">
                    Calculated based on actual historical listings of similar
                    models.
                  </p>
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
                      <p className="text-[10px] uppercase tracking-wider text-slate-300">
                        Market Value Context
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
                    <span className="text-[10px] text-slate-300 font-medium">
                      Estimated Baseline Scrap Value:
                    </span>
                    <span className="text-sm font-extrabold text-teal-300">
                      ₱{scrapValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <p className="text-xs font-bold text-gray-800">
                    Component Breakdown
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      hasMarketHistory
                        ? "bg-teal-50 text-[#2d7a7f]"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {hasMarketHistory
                      ? "Value Deducted Pricing"
                      : "Hardware Integrity Map"}
                  </span>
                </div>

                <div className="space-y-2.5">
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
                        className="flex justify-between items-center text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${comp.status === "Intact" ? "bg-emerald-500" : "bg-red-400"}`}
                          />
                          <span className="text-gray-600 font-medium">
                            {comp.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              comp.status === "Intact"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-600 line-through"
                            }`}
                          >
                            {comp.status}
                          </span>

                          {/* ALTERNATIVE VIEW FOR NEW MODELS vs POPULAR MODELS */}
                          {hasMarketHistory ? (
                            <span
                              className={`font-bold w-16 text-right ${comp.status === "Intact" ? "text-gray-700" : "text-gray-400"}`}
                            >
                              ₱
                              {comp.status === "Intact"
                                ? comp.value.toLocaleString()
                                : "0"}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 w-16 text-right">
                              {comp.weightPercentage}% alloc
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Summary context toggle display */}
                {hasMarketHistory ? (
                  <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[11px] font-medium text-gray-400">
                    <span>Maximum Reusable Component Valuen</span>
                    <span className="font-bold text-gray-600">
                      ₱{reusableValue.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-gray-50 bg-slate-50/50 p-2.5 rounded-xl text-[10px] text-slate-500 leading-normal flex gap-2">
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

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="text-[#2d7a7f]">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="8" r="6" />
                      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                      <path d="M7 6h1v4" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    Set Your Asking Price
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Your Asking Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder={
                        hasMarketHistory
                          ? `Recommended: ₱${reusableValue}`
                          : "Input your desired price"
                      }
                      className="w-full pl-6 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-[#2d7a7f]"
                    />
                  </div>
                </div>
              </div>

              {/* Market Insights */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={16} className="text-teal-500" />
                  <p className="text-sm font-bold text-gray-800">
                    Market Insights
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Market Trend",
                      val: hasMarketHistory ? "Active" : "New Model",
                      icon: <TrendingUp size={14} />,
                    },
                    {
                      label: "Price Range",
                      val: hasMarketHistory
                        ? `₱${scrapValue.toLocaleString()} - ₱${Math.round(reusableValue * 1.3).toLocaleString()}`
                        : "Open Market",
                      icon: <Percent size={14} />,
                    },
                    {
                      label: "Confidence",
                      val: hasMarketHistory ? "High" : "Low",
                      icon: <ShieldCheck size={14} />,
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-gray-50/50 p-3 rounded-xl text-center border border-gray-50 flex flex-col items-center justify-center"
                    >
                      <div className="text-teal-500 mb-1">{stat.icon}</div>
                      <p className="text-[8px] text-gray-400 mb-1 uppercase font-bold">
                        {stat.label}
                      </p>
                      <p className="text-[11px] font-bold text-gray-800 leading-tight">
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
                  <li className="text-[11px] text-gray-500">
                    • Device condition: {formData.condition}
                  </li>
                  <li className="text-[11px] text-gray-500">
                    • {allSelectedIssues.length} damage(s) reported
                  </li>
                  <li className="text-[11px] text-gray-500">
                    • All original parts (+5% value)
                  </li>
                </ul>
              </div>

              {/* 2. Recommended Preparation Videos */}
              <div className="bg-red-50/30 border border-red-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Video size={16} />
                  <p className="text-sm font-bold">
                    Recommended Preparation Videos
                  </p>
                </div>
                <p className="text-[10px] text-gray-500">
                  Watch these certified video tutorials to securely wipe and
                  arrange your hardware:
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
                        <div className="bg-red-50 p-2 rounded-lg text-red-500">
                          <Video size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-800 group-hover:text-red-600 transition-colors">
                            {vid.title}
                          </p>
                          <p className="text-[9px] text-gray-400">{vid.sub}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 group-hover:text-red-500 transition-colors shrink-0 ml-2">
                        Watch →
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* 3. Data Sanitization Header & Checklist */}
              <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={18}
                    className="text-orange-500 shrink-0"
                  />

                  {/* STEP 1: Add 'relative' and 'z-index' to this wrapper */}
                  <div className="space-y-2 relative z-[60]">
                    <p className="text-sm font-bold text-gray-800">
                      Data Sanitization Required
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Before listing your device, please ensure all personal
                      data has been removed.
                    </p>

                    {/* STEP 2: Ensure the button has 'cursor-pointer' and 'pointer-events-auto' */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Prevents the click from triggering parent scroll events
                        setShowSanitizationGuide(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 border border-orange-200 rounded-lg text-orange-600 text-[10px] font-bold bg-white hover:bg-orange-50 active:scale-95 transition-all cursor-pointer pointer-events-auto"
                    >
                      <ExternalLink size={12} /> View Sanitization Guide
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-800">
                  Data Sanitization Checklist{" "}
                  <span className="text-red-500">*</span>
                </p>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-5 shadow-sm">
                  <p className="text-[10px] text-gray-400">
                    Confirm each step has been completed for {formData.model}:
                  </p>

                  {[
                    {
                      id: "factoryReset",
                      label: "Factory reset performed",
                      sub: "Device restored to original factory settings",
                    },
                    {
                      id: "accountsRemoved",
                      label: "All accounts logged out and removed",
                      sub: "Apple ID, Google account, Microsoft account, etc. signed out",
                    },
                    {
                      id: "simRemoved",
                      label: "SIM card and memory card removed",
                      sub: "All removable storage media extracted from device",
                    },
                    {
                      id: "filesDeleted",
                      label: "Personal files deleted",
                      sub: "Photos, documents, contacts, and all personal data removed",
                    },
                    // ADD THIS NEW OBJECT BELOW:
                    {
                      id: "hazardAcknowledged",
                      label: "Hazardous Materials Disclosure",
                      sub: "Confirm no bloated batteries or leaking components are present",
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 cursor-pointer group"
                      onClick={() => handleChecklistToggle(item.id)}
                    >
                      <div
                        className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all 
    ${
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
                        <p className="text-[11px] font-bold text-gray-800 group-hover:text-[#2d7a7f]">
                          {item.label}
                        </p>
                        <p className="text-[9px] text-gray-400 leading-tight">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Hazardous Materials Section */}
              {showHazardWarning && (
                <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={20}
                      className="text-orange-500 shrink-0"
                    />
                    <div className="space-y-3 w-full">
                      <p className="text-sm font-bold text-gray-800">
                        Hazardous Materials Detected
                      </p>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        This device contains components (Lithium-Ion Battery)
                        classified as hazardous waste due to reported
                        conditions.
                      </p>
                      <button
                        onClick={() => setShowHazardGuidelines(true)}
                        className="flex items-center gap-2 w-full justify-center py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
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
                          <p className="text-[10px] font-bold text-gray-800">
                            I acknowledge the presence of hazardous materials
                          </p>
                          <p className="text-[9px] text-gray-400 leading-tight">
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
                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={checklist.valuationAcknowledged}
                    onChange={() =>
                      handleChecklistToggle("valuationAcknowledged")
                    }
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#2d7a7f]"
                  />
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-gray-800">
                      {hasMarketHistory
                        ? "I acknowledge the valuation terms"
                        : "I acknowledge the new model manual listing pricing terms"}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      {hasMarketHistory
                        ? `I understand the Estimated Recovery Value (₱${reusableValue.toLocaleString()}) is for decision support only. Actual offers from buyers may vary based on assessment.`
                        : "I understand that estimated marketplace recovery values are currently inactive for this model, and I am establishing an open-market target price manual configuration."}
                    </p>
                  </div>
                </label>

                {!isStep3Complete && (
                  <p className="text-center text-[10px] text-red-500 font-bold px-6">
                    Please complete all required data sanitization and hazardous
                    acknowledgments to create your listing.
                  </p>
                )}

                <div className="flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur pb-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 border border-gray-200 text-gray-500 rounded-2xl font-bold"
                  >
                    Back
                  </button>
                  <button
                    disabled={!isStep3Complete || loading}
                    onClick={handleFinish}
                    className="flex-[2] py-4 bg-[#ccd2d9] text-white rounded-2xl font-bold disabled:bg-[#ccd2d9] enabled:bg-[#2d7a7f]"
                  >
                    {loading ? "Processing..." : "Create Listing"}
                  </button>
                </div>
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
                  <p className="text-[10px] text-gray-400 font-medium">
                    LiCoO2
                  </p>
                </div>
                <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">
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
                <ul className="space-y-2 text-[11px] text-blue-800/80 ml-1">
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
                <p className="text-[10px] text-gray-400 italic leading-relaxed text-center px-4">
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
