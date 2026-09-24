import React, { useMemo, useState } from "react";
import { X, Smartphone, Info, CheckCircle } from "lucide-react";

const SanitizationGuideModal = ({ isOpen, onClose, deviceModel }) => {
  const [currentStep, setCurrentStep] = useState(1);

  const deviceInfo = useMemo(() => {
    const model = String(deviceModel || "").toLowerCase();

    const isApple =
      /iphone|ipad|ipod|macbook|mac\b|imac/.test(model);

    const isAndroid =
      /android|samsung|galaxy|xiaomi|redmi|poco|oppo|vivo|realme|oneplus|google pixel|pixel|huawei|honor|tecno|infinix|asus rog/.test(
        model
      );

    const isLaptop =
      /laptop|notebook|macbook|chromebook|thinkpad|ideapad|vivobook|zenbook|inspiron|latitude|pavilion|elitebook|probook|surface/.test(
        model
      );

    const hasRemovableStorage =
      /sd|micro\s*sd|memory card|expandable storage/.test(model);

    return {
      isApple,
      isAndroid,
      isLaptop,
      hasRemovableStorage,
    };
  }, [deviceModel]);

  const steps = useMemo(() => {
    const commonBackup = {
      title: "Back Up Your Data",
      description: "Save your important data before erasing the device.",
      instructions: [
        "Back up photos, contacts, documents, and other important files.",
        "Confirm that the backup has finished before continuing.",
      ],
    };

    const accountStep = deviceInfo.isApple
      ? {
          title: "Remove Apple Account",
          description: "Sign out of the Apple Account linked to the device.",
          warning:
            "IMPORTANT: Remove the Apple Account and turn off Find My before resetting the device. This helps prevent Activation Lock for the next owner.",
          instructions: [
            "Open Settings > [your name] on the device.",
            'Tap "Sign Out" and follow the on-screen instructions.',
            "Confirm that Find My is turned off.",
          ],
        }
      : deviceInfo.isLaptop
      ? {
          title: "Remove Personal Accounts",
          description: "Sign out of personal accounts and remove personal access.",
          instructions: [
            "Sign out of personal email, cloud-storage, browser, and other personal accounts.",
            "Remove personal files and confirm that no personal account remains signed in.",
            "If the device uses a work or school account, follow the organization's approved removal procedure.",
          ],
        }
      : {
          title: "Remove Google Account",
          description: "Sign out of your Google account before resetting.",
          warning:
            "IMPORTANT: Removing the Google account helps prevent Factory Reset Protection (FRP) from locking the device for the next owner.",
          instructions: [
            "Go to Settings > Accounts and backup.",
            'Tap "Accounts" and select your Google account.',
            'Tap "Remove account" and confirm removal.',
          ],
        };

    const resetStep = deviceInfo.isApple
      ? {
          title: "Erase All Content and Settings",
          description: "Erase personal data and settings from the device.",
          instructions: [
            "Open Settings > General > Transfer or Reset.",
            'Tap "Erase All Content and Settings".',
            "Review what will be erased and follow the prompts.",
            "Enter the device passcode or Apple Account password if requested.",
            "Wait for the erase process to finish.",
          ],
        }
      : deviceInfo.isLaptop
      ? {
          title: "Reset or Securely Wipe the Device",
          description: "Remove personal data using the operating system's reset or approved wipe process.",
          instructions: [
            "Use the operating system's official reset/reinstall option.",
            "Choose the option that removes personal files and accounts.",
            "Follow the on-screen prompts until the reset is complete.",
            "For organization-managed devices, use the approved secure-wipe procedure.",
          ],
        }
      : {
          title: "Factory Data Reset",
          description: "Erase all personal data and settings.",
          instructions: [
            "Go to Settings > General management.",
            'Tap "Reset" or "Factory data reset".',
            "Review the list of data that will be erased.",
            'Tap "Reset" and enter your PIN/password if prompted.',
            'Tap "Delete all" to confirm.',
            "Wait for the reset to complete.",
          ],
        };

    const removableStorageStep = {
      title: "Remove Removable Storage",
      description: deviceInfo.hasRemovableStorage
        ? "Remove any removable SIM or memory cards that are present."
        : "Skip this step if the device has no removable storage.",
      instructions: deviceInfo.hasRemovableStorage
        ? [
            "Power off the device completely.",
            "Remove the SIM card and memory card, if present.",
            "Keep the removed cards with the owner and do not include personal storage with the listing.",
          ]
        : [
            "Check whether the device has a removable SIM or memory card.",
            "If none is present or the device has no removable storage, this step is not applicable.",
          ],
    };

    const verifyStep = {
      title: "Verify Reset",
      description: "Confirm that the device is ready for listing.",
      instructions: [
        "Power on the device after the reset.",
        "Confirm that it shows the initial setup or welcome screen.",
        "Do NOT complete the setup process.",
        "Power off the device.",
        "Confirm that personal accounts, files, and removable storage are no longer included.",
      ],
    };

    return [
      commonBackup,
      accountStep,
      resetStep,
      removableStorageStep,
      verifyStep,
    ];
  }, [deviceInfo]);

  if (!isOpen) return null;

  const totalSteps = steps.length;
  const progress = (currentStep / totalSteps) * 100;
  const activeData = steps[currentStep - 1];

  const goNext = () =>
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));

  const goPrevious = () =>
    setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleClose = () => {
    setCurrentStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
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
            onClick={handleClose}
            className="absolute right-6 top-6 p-1 hover:bg-white/10 rounded-full"
            aria-label="Close sanitization guide"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pt-6">
          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-2">
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
              <p className="text-xs leading-relaxed text-red-700 font-medium">
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
                  <span className="w-6 h-6 rounded-full bg-[#2d7a7f] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-600 font-medium">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {currentStep === 4 && !deviceInfo.hasRemovableStorage && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <p className="text-xs text-amber-800 font-semibold">
                This step may not apply to this device. Skip it if there is no
                removable SIM or memory card.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50/30">
          <button
            disabled={currentStep === 1}
            onClick={goPrevious}
            className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-gray-400 disabled:opacity-50"
          >
            Previous
          </button>

          {currentStep === totalSteps ? (
            <button
              onClick={handleClose}
              className="flex-[2] py-4 bg-[#00c853] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} /> I've Completed All Steps
            </button>
          ) : (
            <button
              onClick={goNext}
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