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
    {
      id: "Parts Only",
      label: "Parts Only",
      sub: "For harvesting components",
      activeStyles: "border-slate-500 bg-slate-50/30 text-slate-700",
    },
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
  const [showHazardGuidelines, setShowHazardGuidelines] = useState(false);
  const [showSanitizationGuide, setShowSanitizationGuide] = useState(false);
  const [checklist, setChecklist] = useState({
    factoryReset: false,
    accountsRemoved: false,
    simRemoved: false,
    filesDeleted: false,
    hazardAcknowledged: false,
    valuationAcknowledged: false,
  });
  const [formData, setFormData] = useState({
    category: "",
    model: "",
    condition: "Defective", // Default condition
    description: "",
    images: [],
    price: "",
  });

  const fileInputRef = useRef(null);
  const [issues, setIssues] = useState({
    physical: [],
    functional: [],
    cosmetic: [],
    noDamage: false,
  });
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
    if (isOpen) {
      calculateRecoveryValue();
    }
  }, [issues, isOpen]);
  const calculateRecoveryValue = () => {
    // Use the base value from the DB model selected in Step 1
    let baseValue = formData.base_part_value || 0;
    let scrap = formData.base_scrap_value || 0;

    if (baseValue === 0) return; // Fallback if no model is selected

    // Apply condition-based deductions
    if (issues.physical.includes("Cracked/Shattered Screen")) baseValue *= 0.7; // 30% deduction
    if (issues.functional.includes("Won't Power On")) baseValue *= 0.5; // 50% deduction
    if (issues.functional.includes("Dead/Degraded Battery")) baseValue -= 800;

    const finalPartsValue = Math.max(baseValue, scrap);

    setReusableValue(Math.round(finalPartsValue));
    setScrapValue(scrap);
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
    }, // Added per mockup
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

    if (validFiles.length + formData.images.length > 5) {
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

  const handleFinish = async () => {
    setLoading(true);
    try {
      const imageUrls = [];
      for (const file of formData.images) {
        const fileName = `${userId}/${Date.now()}-${file.name}`;
        await supabase.storage.from("listing-images").upload(fileName, file);
        const {
          data: { publicUrl },
        } = supabase.storage.from("listing-images").getPublicUrl(fileName);
        imageUrls.push(publicUrl);
      }

      const selectedIssues = [
        ...issues.physical,
        ...issues.functional,
        ...issues.cosmetic,
      ];

      // 2. Create a formatted string of the problems found
      const problemSummary =
        selectedIssues.length > 0
          ? `[SYSTEM DIAGNOSIS: ${selectedIssues.join(", ")}]`
          : "[SYSTEM DIAGNOSIS: No visible damage]";

      // 3. Combine the automated summary with the user's manual description
      const finalDescription =
        `${problemSummary} ${formData.description}`.trim();

      const finalPrice =
        formData.price === "" ? reusableValue : parseFloat(formData.price);

      // Aligned with your 'listings' table columns
      const { data: insertedData, error } = await supabase
        .from("listings")
        .insert([
          {
            seller_id: userId,
            device_model: formData.model,
            condition: formData.condition,
            asking_price: finalPrice,
            scrap_value: scrapValue,
            images: imageUrls,
            status: "active",
            description: finalDescription, // Checklist data is now saved here!
            barangay: userBarangay,
            category: formData.category, // Ensure category is saved for filtering
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (insertedData && selectedIssues.length > 0) {
        await handleHazardDetection(insertedData.id, selectedIssues); //[cite: 8]
      }

      if (insertedData) await checkAndNotifyHarvesters(insertedData);

      alert("Listing Created!");
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
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

              <div className="mt-6">
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  {formData.category === "Others"
                    ? "Specific Model / Device Name"
                    : "Select Model"}
                </label>

                {formData.category === "Others" ? (
                  /* Text Input for 'Others' category as seen in image_5e05b5.png */
                  <input
                    type="text"
                    placeholder="e.g., Smartwatch, Router, E-reader..."
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/10"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                  />
                ) : (
                  /* Dropdown for predefined categories */
                  <div className="relative">
                    <select
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-teal-500/10"
                      value={formData.model}
                      onChange={(e) => {
                        const selectedModel = dbModels.find(
                          (m) => m.model_name === e.target.value,
                        );
                        setFormData({
                          ...formData,
                          model: e.target.value,
                          base_part_value: selectedModel?.base_part_value || 0,
                          base_scrap_value: selectedModel?.scrap_value || 0,
                        });
                      }}
                    >
                      {/* Default placeholder */}
                      <option value="" disabled>
                        {!formData.category
                          ? "Select a category first..."
                          : dbModels.length > 0
                            ? "Choose a model..."
                            : "No models found for this category"}
                      </option>

                      {/* Map through the models from your database */}
                      {dbModels.map((m) => (
                        <option key={m.id || m.model_name} value={m.model_name}>
                          {m.model_name}
                        </option>
                      ))}
                    </select>

                    {/* Dropdown Arrow Icon */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <button
                disabled={!formData.category || !formData.model}
                onClick={() => setStep(2)}
                className={`w-full py-4 mt-4 rounded-xl font-bold text-sm transition-all ${
                  formData.category && formData.model
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
                  Photos ({formData.images.length}/5)
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50/50 cursor-pointer"
                >
                  <ImageIcon className="text-gray-300 mb-2" size={24} />
                  <p className="text-sm font-bold text-gray-700">Add photos</p>
                  <input
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
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
                      View Breakdown
                    </span>
                    <span className="flex items-center gap-1 text-[10px] opacity-90">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>{" "}
                      Stable
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
                    <p className="text-[8px] opacity-60">
                      incl. all parts listed
                    </p>
                  </div>
                </div>

                <p className="text-[9px] mt-4 opacity-80">
                  Price Range: ₱{(reusableValue * 0.9).toLocaleString()} - ₱
                  {(reusableValue * 1.1).toLocaleString()}
                </p>

                <div className="mt-3 p-3 bg-black/10 rounded-xl flex gap-2 items-start">
                  <div className="w-3 h-3 bg-white/20 rounded-full mt-0.5 shrink-0" />
                  <p className="text-[9px] leading-tight">
                    This is a non-binding estimate. Actual offers may vary based
                    on buyer assessment and market conditions.
                  </p>
                </div>
              </div>

              {/* Component Breakdown was removed from here */}

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
                      <path d="M17 16h1" />
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
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="e.g., 6,000"
                      className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-[#2d7a7f]"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Set the minimum price you're willing to accept. Buyers can
                    bid at or above this price.
                  </p>
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
                    { label: "Market Trend", val: "Stable", icon: "—" },
                    { label: "Price Range", val: "~₱8K", icon: "⚝" },
                    { label: "Confidence", val: "Low", icon: "⚙" },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-gray-50/50 p-3 rounded-xl text-center border border-gray-50"
                    >
                      <div className="text-teal-500 mb-1">{stat.icon}</div>
                      <p className="text-[8px] text-gray-400 mb-1 uppercase font-bold">
                        {stat.label}
                      </p>
                      <p className="text-xs font-bold text-gray-800">
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
                  Watch these helpful guides to properly prepare your{" "}
                  {formData.model} for sale:
                </p>
                <div className="space-y-2">
                  {[
                    {
                      title: `How to Factory Reset a ${formData.category}`,
                      sub: "Complete reset guide for all major brands",
                    },
                    {
                      title: "How to Safely Remove Hard Drive Data",
                      sub: "Secure data deletion and drive wiping techniques",
                    },
                    {
                      title: `Preparing Your ${formData.category} For Sale`,
                      sub: `Cleaning, testing, and packaging tips for ${formData.category.toLowerCase()}s`,
                    },
                  ].map((vid, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-white border border-red-50 rounded-xl group cursor-pointer hover:border-red-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-red-50 p-2 rounded-lg text-red-500">
                          <Video size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-800">
                            {vid.title}
                          </p>
                          <p className="text-[9px] text-gray-400">{vid.sub}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 group-hover:text-red-500 transition-colors">
                        Watch →
                      </span>
                    </div>
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
                      I acknowledge the valuation is a non-binding estimate
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      I understand the Estimated Recovery Value (₱
                      {reusableValue.toLocaleString()}) is for decision support
                      only. Actual offers from buyers may vary based on
                      assessment.
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
