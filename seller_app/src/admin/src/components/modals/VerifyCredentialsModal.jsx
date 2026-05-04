import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Check,
  X,
  PartyPopper,
  ArrowRight,
} from "lucide-react";

const VerifyCredentialsModal = ({ isOpen, onClose, shopData, onSuccess }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [checklist, setChecklist] = useState({
    permitValid: false,
    certLegit: false,
    nameMatches: false,
    contactVerified: false,
  });

  if (!isOpen) return null;

  const handleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const handleReject = async () => {
    const reason = prompt(
      "Please enter the reason for rejection (e.g., Expired Permit):",
    );
    if (!reason) return; // Don't reject if no reason is given

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: "rejected",
          rejection_reason: reason, // You'll need this column in your table
          is_verified: false,
        })
        .eq("id", shopData.id);

      if (error) throw error;
      alert("User has been notified of rejection.");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleApprove = async () => {
    try {
      const { data, error, count } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          status: "Active",
          verification_status: "verified",
        })
        .eq("id", shopData.id)
        .select(); // This allows us to see if a row was actually returned

      if (error) throw error;

      // Check if any row was actually updated
      if (!data || data.length === 0) {
        console.error(
          "Update executed but 0 rows affected. Check RLS policies.",
        );
        alert(
          "Verification failed: You might not have permission to update this user.",
        );
        return;
      }

      console.log("Success! Updated user:", data);
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Verification failed:", error.message);
      alert("Verification Error: " + error.message);
    }
  };

  const handleFinalClose = () => {
    setIsSuccess(false);
    onClose();
  };

  const isAllChecked = Object.values(checklist).every((val) => val === true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                Verify Repair Shop Credentials
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 p-5 bg-slate-50 rounded-xl mb-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                    Shop Name
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {shopData?.business_name || "E-Parts Hub"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                    Contact Email
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {shopData?.email || "eparts@email.com"}
                  </p>
                </div>
              </div>

              {/* Document Previews Section */}
              <div className="space-y-4 mb-8">
                <DocumentPreview
                  title="Business Permit / DTI Registration"
                  url={shopData?.business_permit_url}
                />
                <DocumentPreview
                  title="Technical Certification"
                  url={shopData?.tech_cert_url}
                />
              </div>

              {/* Checklist */}
              <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4">
                  Verification Checklist:
                </h3>
                <div className="space-y-3">
                  <CheckItem
                    label="Business permit is valid and not expired"
                    checked={checklist.permitValid}
                    onChange={() => handleCheck("permitValid")}
                  />
                  <CheckItem
                    label="Technical certification is legitimate"
                    checked={checklist.certLegit}
                    onChange={() => handleCheck("certLegit")}
                  />
                  <CheckItem
                    label="Shop name matches official documents"
                    checked={checklist.nameMatches}
                    onChange={() => handleCheck("nameMatches")}
                  />
                  <CheckItem
                    label="Contact information is verified"
                    checked={checklist.contactVerified}
                    onChange={() => handleCheck("contactVerified")}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-4 flex-shrink-0">
              <button
                onClick={handleReject} // Changed from onClose
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors"
              >
                <XCircle size={18} /> Reject
              </button>
              <button
                disabled={!isAllChecked}
                onClick={handleApprove}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
                  isAllChecked
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <CheckCircle size={18} /> Approve & Verify
              </button>
            </div>
          </>
        ) : (
          /* SUCCESS VIEW */
          <div className="p-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <PartyPopper size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Shop Verified Successfully!
            </h2>
            <p className="text-slate-500 mb-8 max-w-sm">
              <span className="font-semibold text-slate-700">
                {shopData?.name}
              </span>{" "}
              is now a verified partner. They can now bid on e-waste listings
              and offer repair services.
            </p>
            <button
              onClick={handleFinalClose}
              className="w-full max-w-xs flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              Back to User Management
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
// Updated Helper Component
const DocumentPreview = ({ title, url }) => (
  <div>
    <p className="text-xs font-semibold text-slate-500 mb-2">{title}</p>
    <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col items-center justify-center min-h-[150px]">
      {url ? (
        <div className="w-full h-full flex flex-col items-center p-2">
          {/* If it's an image, show it. If it's a PDF, show the icon. */}
          <img
            src={url}
            alt={title}
            className="max-h-32 object-contain rounded mb-2 shadow-sm"
            onError={(e) => {
              e.target.style.display = "none";
            }} // Fallback if not an image
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
          >
            <Eye size={12} /> Full Screen View
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <XCircle size={24} className="text-red-300 mb-2" />
          <p className="text-[10px] text-red-400 font-bold">No file uploaded</p>
        </div>
      )}
    </div>
  </div>
);

const CheckItem = ({ label, checked, onChange }) => (
  <div
    className="flex items-center gap-3 cursor-pointer group"
    onClick={onChange}
  >
    <div
      className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
        checked
          ? "bg-emerald-500 border-emerald-500"
          : "bg-white border-slate-300"
      }`}
    >
      {checked && <Check size={14} className="text-white" />}
    </div>
    <span
      className={`text-sm select-none ${checked ? "text-slate-700 font-medium" : "text-slate-500"}`}
    >
      {label}
    </span>
  </div>
);

export default VerifyCredentialsModal;
