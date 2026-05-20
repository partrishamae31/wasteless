// DonationTab.jsx

import React, { useState } from "react";
import {
  MapPin,
  Plus,
  Navigation,
  Calendar,
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Package,
  X,
  ImagePlus,
  AlertCircle,
} from "lucide-react";

const deviceCategories = [
  {
    label: "Smartphone",
    icon: Smartphone,
  },
  {
    label: "Laptop",
    icon: Laptop,
  },
  {
    label: "Tablet",
    icon: Tablet,
  },
  {
    label: "Monitor",
    icon: Monitor,
  },
  {
    label: "Others",
    icon: Package,
  },
  {
    label: "Parts",
    icon: Package,
  },
];

const functionalIssues = [
  "Won't Power On",
  "Dead/Degraded Battery",
  "Charging Problems",
  "Display Not Working (black screen, lines)",
  "Touch Screen Not Responding",
  "Camera Not Working",
  "Speaker/Microphone Issues",
  "Wi-Fi/Bluetooth Not Working",
  "Buttons Not Working",
];

const cosmeticIssues = [
  "Minor Dents/Scratches",
  "Paint Chipping/Fading",
  "Discoloration",
];

const DonationTab = ({ profileData }) => {
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

  const [step, setStep] = useState(1);

  const [selectedCategory, setSelectedCategory] = useState("Smartphone");
  const [model, setModel] = useState("");

  const [deviceCondition, setDeviceCondition] = useState("Working");

  const [selectedFunctionalIssues, setSelectedFunctionalIssues] = useState([]);

  const [selectedCosmeticIssues, setSelectedCosmeticIssues] = useState([]);

  const [noVisibleDamage, setNoVisibleDamage] = useState(false);

  const toggleFunctionalIssue = (issue) => {
    setSelectedFunctionalIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue],
    );
  };

  const toggleCosmeticIssue = (issue) => {
    setSelectedCosmeticIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue],
    );
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn">
        {/* TOP STATS */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-4xl font-black text-slate-800">5</h2>
            <p className="text-xs text-slate-400 mt-1">Active Alerts</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-4xl font-black text-slate-800">3</h2>
            <p className="text-xs text-slate-400 mt-1">Pending Bids</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-4xl font-black text-slate-800">24</h2>
            <p className="text-xs text-slate-400 mt-1">Acquired Parts</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-4xl font-black text-slate-800">₱45,200</h2>
            <p className="text-xs text-slate-400 mt-1">Total Spent</p>
          </div>
        </div>

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-800">
              Drop-off Center
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              Based on your registered address in{" "}
              <span className="font-bold text-slate-700">
                Barangay {profileData?.barangay || "Karuhatan"}
              </span>
              , you will bring your device to your designated e-waste center.
            </p>
          </div>

          <button
            onClick={() => setIsDonationModalOpen(true)}
            className="bg-[#6DA43A] hover:bg-[#5e9032] transition-all text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-bold text-sm shadow-sm"
          >
            <Plus size={18} />
            Donate a New Device
          </button>
        </div>

        {/* MAP CARD */}
        <div className="bg-[#DDF3E2] rounded-3xl overflow-hidden border border-emerald-100 relative min-h-[500px]">
          <div className="absolute top-0 left-0 right-0 p-7 z-10">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#12B347] flex items-center justify-center text-white shadow-sm">
                  <MapPin size={22} />
                </div>

                <div>
                  <h3 className="font-black text-slate-800 text-xl">
                    Barangay Karuhatan E-waste Center
                  </h3>

                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin size={12} className="text-red-400" />
                    Karuhatan Public Market, Valenzuela City
                  </p>

                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                    <Calendar size={13} />
                    Mon-Fri, 8:00 AM - 5:00 PM
                  </div>
                </div>
              </div>

              <button className="bg-white shadow-sm border border-slate-100 w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition">
                <Navigation size={18} />
              </button>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[#12B347]">
              <MapPin size={70} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* DONATION MODAL */}
      {isDonationModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-[760px] overflow-hidden animate-fadeIn max-h-[95vh] overflow-y-auto">
            {/* HEADER */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-200">
              <h2 className="text-3xl font-black text-slate-800">
                Donate Device
              </h2>

              <button
                onClick={() => {
                  setIsDonationModalOpen(false);
                  setStep(1);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* STEPPER */}
            <div className="px-8 pt-8 flex items-center justify-center gap-3">
              {[1, 2, 3].map((s, index) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                      step >= s
                        ? "bg-[#3285a1] text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {s}
                  </div>

                  {index < 2 && (
                    <div
                      className={`w-28 h-1 rounded-full ${
                        step > s ? "bg-[#3285a1]" : "bg-slate-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 mb-4">
                    Select Device Category
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {deviceCategories.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.label}
                          onClick={() => setSelectedCategory(item.label)}
                          className={`border rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all ${
                            selectedCategory === item.label
                              ? "border-[#3285a1] bg-[#EEF8FB]"
                              : "border-slate-200 hover:border-[#3285a1]/40"
                          }`}
                        >
                          <Icon
                            size={34}
                            className={
                              selectedCategory === item.label
                                ? "text-[#3285a1]"
                                : "text-slate-400"
                            }
                          />

                          <span
                            className={`font-semibold ${
                              selectedCategory === item.label
                                ? "text-[#3285a1]"
                                : "text-slate-700"
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Select Model
                  </label>

                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. iPhone 11"
                    className="w-full border border-slate-300 rounded-xl px-4 py-4 outline-none focus:border-[#3285a1]"
                  />
                </div>

                <button
                  disabled={!model}
                  onClick={handleNext}
                  className={`w-full py-4 rounded-2xl font-bold transition ${
                    model
                      ? "bg-[#3285a1] text-white hover:bg-[#2d748d]"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="p-8 space-y-6">
                {/* PHOTO */}
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-3">
                    Photos (0/5)
                  </p>

                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <ImagePlus size={28} className="text-slate-400" />
                    </div>

                    <p className="font-semibold text-slate-700">Add photos</p>

                    <p className="text-xs text-slate-400 mt-2">
                      Supported formats: JPG, PNG, MP4, MOV
                    </p>
                  </div>
                </div>

                {/* CONDITION */}
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-3">
                    Device Condition
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Working",
                        desc: "Device is fully functional",
                      },
                      {
                        title: "Defective",
                        desc: "Some components not working",
                      },
                      {
                        title: "Parts Only",
                        desc: "For harvesting components",
                      },
                    ].map((item) => (
                      <button
                        key={item.title}
                        onClick={() => setDeviceCondition(item.title)}
                        className={`w-full text-left border rounded-2xl p-5 transition ${
                          deviceCondition === item.title
                            ? "border-[#3285a1] bg-[#EEF8FB]"
                            : "border-slate-200 hover:border-[#3285a1]/40"
                        }`}
                      >
                        <h4 className="font-bold text-slate-800">
                          {item.title}
                        </h4>

                        <p className="text-xs text-slate-500 mt-1">
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DAMAGE ASSESSMENT */}
                <div className="bg-[#EEF5FF] border border-[#B9D4FF] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-[#3B82F6] mt-0.5" />

                    <div>
                      <p className="font-bold text-[#2563EB] text-sm">
                        Damage Assessment
                      </p>

                      <p className="text-xs text-[#3B82F6] mt-1">
                        Please select all damages and issues that apply to your
                        device.
                      </p>
                    </div>
                  </div>
                </div>

                {/* NO DAMAGE */}
                <button
                  onClick={() => setNoVisibleDamage(!noVisibleDamage)}
                  className={`w-full border rounded-2xl p-5 flex items-start gap-3 transition ${
                    noVisibleDamage
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border mt-0.5 ${
                      noVisibleDamage
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300"
                    }`}
                  />

                  <div className="text-left">
                    <p className="font-bold text-slate-800">
                      No Visible Damage
                    </p>

                    <p className="text-xs text-slate-500">
                      Device is in excellent working condition
                    </p>
                  </div>
                </button>

                {/* FUNCTIONAL */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-3">
                    Functional Issues
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {functionalIssues.map((issue) => (
                      <button
                        key={issue}
                        onClick={() => toggleFunctionalIssue(issue)}
                        className={`border rounded-xl p-3 text-sm text-left transition ${
                          selectedFunctionalIssues.includes(issue)
                            ? "border-[#3285a1] bg-[#EEF8FB] text-[#3285a1]"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {issue}
                      </button>
                    ))}
                  </div>
                </div>

                {/* COSMETIC */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-3">
                    Cosmetic Issues
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {cosmeticIssues.map((issue) => (
                      <button
                        key={issue}
                        onClick={() => toggleCosmeticIssue(issue)}
                        className={`border rounded-xl p-3 text-sm text-left transition ${
                          selectedCosmeticIssues.includes(issue)
                            ? "border-[#3285a1] bg-[#EEF8FB] text-[#3285a1]"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {issue}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DETAILS */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Additional Details (Optional)
                  </label>

                  <textarea
                    rows={4}
                    placeholder="Provide additional information about the device condition..."
                    className="w-full border border-slate-300 rounded-2xl p-4 outline-none focus:border-[#3285a1]"
                  />
                </div>

                {/* FOOTER */}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleBack}
                    className="flex-1 border border-slate-300 py-4 rounded-2xl font-bold text-slate-700"
                  >
                    Back
                  </button>

                  <button
                    onClick={handleNext}
                    className="flex-1 bg-[#3285a1] text-white py-4 rounded-2xl font-bold hover:bg-[#2d748d]"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {/* STEP 3 */}
            {step === 3 && (
              <div className="p-8 space-y-6">
                {/* VIDEOS */}
                <div className="border border-red-200 bg-red-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">
                      ▶
                    </div>

                    <h3 className="font-bold text-slate-800">
                      Recommended Preparation Videos
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 mb-5">
                    Watch these helpful guides to properly prepare your{" "}
                    <span className="font-bold">{model}</span> for donation.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "How to Factory Reset a Laptop (Windows & Mac)",
                        desc: "Complete reset guide for all major laptop brands",
                      },
                      {
                        title: "How to Safely Remove Hard Drive Data",
                        desc: "Secure data deletion and drive wiping techniques",
                      },
                      {
                        title: "Preparing Your Laptop for Donation",
                        desc: "Cleaning, testing, and packaging tips",
                      },
                    ].map((video, index) => (
                      <div
                        key={index}
                        className="bg-white border border-red-100 rounded-xl p-4 flex justify-between items-center"
                      >
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500">
                            ▶
                          </div>

                          <div>
                            <h4 className="font-semibold text-sm text-slate-800">
                              {video.title}
                            </h4>

                            <p className="text-xs text-slate-400 mt-1">
                              {video.desc}
                            </p>
                          </div>
                        </div>

                        <button className="text-xs font-bold text-slate-400 hover:text-[#3285a1]">
                          Watch →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SANITIZATION */}
                <div className="bg-[#FFF8E7] border border-[#F5D27A] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-[#D97706] mt-0.5" />

                    <div className="flex-1">
                      <h3 className="font-bold text-[#92400E] text-sm">
                        Data Sanitization Required
                      </h3>

                      <p className="text-xs text-[#B45309] mt-1">
                        Before donating your device, please ensure all personal
                        data has been removed.
                      </p>

                      <button className="mt-4 border border-[#F5D27A] bg-white hover:bg-[#FFF7E6] transition px-4 py-2 rounded-xl text-xs font-bold text-[#B45309]">
                        View Sanitization Guide
                      </button>
                    </div>
                  </div>
                </div>

                {/* CHECKLIST */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-4">
                    Data Sanitization Checklist{" "}
                    <span className="text-red-500">*</span>
                  </h3>

                  <div className="border border-slate-200 rounded-2xl p-5 space-y-5">
                    <p className="text-xs text-slate-400">
                      Confirm each step has been completed for{" "}
                      <span className="font-bold">{model}</span>.
                    </p>

                    {[
                      {
                        title: "Factory reset performed",
                        desc: "Device restored to original factory settings",
                      },
                      {
                        title: "All accounts logged out and removed",
                        desc: "Apple ID, Google account, Microsoft account, etc. signed out",
                      },
                      {
                        title: "SIM card and memory card removed",
                        desc: "All removable storage media extracted from device",
                      },
                      {
                        title: "Personal files deleted",
                        desc: "Photos, documents, contacts, and personal data removed",
                      },
                    ].map((item, index) => (
                      <label key={index} className="flex gap-3 cursor-pointer">
                        <input type="checkbox" className="mt-1" />

                        <div>
                          <p className="font-semibold text-slate-700 text-sm">
                            {item.title}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            {item.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* HAZARD */}
                <div className="bg-[#FFF7ED] border border-[#FDBA74] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-[#EA580C] mt-0.5" />

                    <div className="flex-1">
                      <h3 className="font-bold text-[#9A3412] text-sm">
                        Hazardous Materials Detected
                      </h3>

                      <p className="text-xs text-[#C2410C] mt-1">
                        This device contains components classified as hazardous
                        waste. Special handling and disposal procedures are
                        required by law.
                      </p>

                      <div className="inline-flex mt-3 px-3 py-1 rounded-full bg-white border border-orange-200 text-xs font-bold text-orange-700">
                        Lithium-Ion Battery
                      </div>

                      <button className="mt-4 block border border-orange-200 bg-white hover:bg-orange-50 transition px-4 py-2 rounded-xl text-xs font-bold text-orange-700">
                        View Handling & Disposal Guidelines
                      </button>

                      <label className="mt-4 flex gap-3 border border-slate-200 rounded-xl p-4 bg-white cursor-pointer">
                        <input type="checkbox" className="mt-1" />

                        <div>
                          <p className="font-bold text-slate-700 text-sm">
                            I acknowledge the presence of hazardous materials
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            I have read the handling guidelines and agree to
                            comply with all safety and regulatory requirements
                            for disposal or transfer.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="text-center text-red-500 text-xs font-medium">
                  Please complete all required data sanitization and hazard
                  acknowledgments before donating.
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleBack}
                    className="flex-1 border border-slate-300 py-4 rounded-2xl font-bold text-slate-700"
                  >
                    Back
                  </button>

                  <button className="flex-1 bg-slate-300 text-white py-4 rounded-2xl font-bold cursor-not-allowed">
                    Donate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DonationTab;
