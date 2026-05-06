import React, { useState } from "react";
import { X, Smartphone, Info, CheckCircle } from "lucide-react";

const SanitizationGuideModal = ({ isOpen, onClose, deviceModel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const steps = [
    {
      title: "Back Up Your Data",
      description: "Save your important data",
      instructions: [
        "Go to Settings > Accounts and backup",
        'Tap "Backup and restore"',
        'Tap "Back up data"',
        'Select data to back up and tap "Back up"',
        "Wait for backup to complete",
      ],
    },
    {
      title: "Remove Google Account",
      description: "Sign out of your Google account",
      warning:
        "IMPORTANT: Removing Google account prevents Factory Reset Protection (FRP) lock. Device will be unusable by buyer if FRP is active.",
      instructions: [
        "Go to Settings > Accounts and backup",
        'Tap "Accounts"',
        "Select your Google account",
        'Tap "Remove account"',
        "Confirm removal",
      ],
    },
    {
      title: "Factory Data Reset",
      description: "Erase all data and settings",
      instructions: [
        "Go to Settings > General management",
        'Tap "Reset"',
        'Tap "Factory data reset"',
        "Review the list of data that will be erased",
        'Tap "Reset" and enter your PIN/password if prompted',
        'Tap "Delete all" to confirm',
        "Wait for reset to complete",
      ],
    },
    {
      title: "Remove SIM and SD Cards",
      description: "Extract all removable storage",
      instructions: [
        "Power off the device completely",
        "Locate the SIM/SD card tray",
        "Use the eject tool or paperclip to open the tray",
        "Remove SIM card and SD card (if present)",
        "Reinsert empty tray",
      ],
    },
    {
      title: "Verify Reset",
      description: "Confirm device is wiped",
      instructions: [
        "Power on the device",
        "You should see the initial setup screen",
        "Do NOT complete the setup process",
        "Power off the device",
        "Device is ready to list",
      ],
    },
  ];

  if (!isOpen) return null;

  const progress = (currentStep / totalSteps) * 100;
  const activeData = steps[currentStep - 1];
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#ff1744] p-6 text-white relative">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Data Sanitization Guide</h3>
              <p className="text-xs opacity-90">{deviceModel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 top-6 p-1 hover:bg-white/10 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        {/* Progress */}
        <div className="px-8 pt-6">
          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-2">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ff5722] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div>
            <h4 className="text-xl font-black text-gray-800 mb-1">
              {activeData.title}
            </h4>
            <p className="text-sm text-gray-500">{activeData.description}</p>
          </div>
          {activeData.warning && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3">
              <div className="text-red-500 shrink-0 mt-0.5">
                <Info size={16} />
              </div>
              <p className="text-[11px] leading-relaxed text-red-700 font-medium">
                {activeData.warning}
              </p>
            </div>
          )}
          <div className="bg-gray-50/50 border border-gray-100 rounded-[24px] p-6 space-y-4">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Steps:
            </p>
            <ul className="space-y-4">
              {activeData.instructions.map((text, idx) => (
                <li key={idx} className="flex gap-4 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#2d7a7f] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-600 font-medium">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50/30">
          <button
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => prev - 1)}
            className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-gray-400 disabled:opacity-50"
          >
            Previous
          </button>

          {currentStep === totalSteps ? (
            <button
              onClick={onClose}
              className="flex-[2] py-4 bg-[#00c853] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} /> I've Completed All Steps
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="flex-[2] py-4 bg-[#2d7a7f] text-white rounded-2xl font-bold shadow-lg"
            >
              Next Step
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SanitizationGuideModal;