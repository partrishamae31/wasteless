import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Check,
  X,
  PartyPopper,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

const EMPTY_CHECKLIST = {
  permitValid: false,
  certLegit: false,
  nameMatches: false,
  contactVerified: false,
};

const VerifyCredentialsModal = ({
  isOpen,
  onClose,
  shopData,
  onSuccess,
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checklist, setChecklist] = useState(EMPTY_CHECKLIST);

  const userRole = shopData?.role?.toLowerCase();

  const isSeller = userRole === "seller";
  const isRepairShop =
    userRole === "repair_shop" || userRole === "repair shop";
  const isHarvester = userRole === "harvester";

  // Reset the checklist whenever a different user/application is opened.
  useEffect(() => {
    if (isOpen) {
      setChecklist({ ...EMPTY_CHECKLIST });
      setIsSuccess(false);
      setIsProcessing(false);
    }
  }, [isOpen, shopData?.id]);

  const handleCheck = (key) => {
    if (isProcessing) return;

    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleReject = async () => {
    if (!shopData?.id || isProcessing) return;

    const reason = window.prompt(
      "Please enter the reason for rejection (e.g., Expired Permit):"
    );

    if (!reason?.trim()) return;

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: "rejected",
          rejection_reason: reason.trim(),
          is_verified: false,
        })
        .eq("id", shopData.id);

      if (error) throw error;

      alert("The verification request has been rejected.");

      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (error) {
      console.error("Rejection failed:", error);
      alert("Rejection Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!shopData?.id || isProcessing || !isAllChecked) return;

    try {
      setIsProcessing(true);

      // Verification is intentionally done here by the admin.
      // Document scanning during signup only extracts/pre-fills information.
      const { data, error } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verification_status: "verified",
          rejection_reason: null,
        })
        .eq("id", shopData.id)
        .select("id, is_verified, verification_status");

      if (error) throw error;

      if (!data || data.length === 0) {
        console.error(
          "Verification update returned no rows. Check Supabase RLS policies."
        );

        alert(
          "Verification failed: the admin account may not have permission to update this user."
        );
        return;
      }

      console.log("User successfully verified:", data[0]);

      if (onSuccess) {
        await onSuccess();
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Verification failed:", error);
      alert("Verification Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalClose = () => {
    setIsSuccess(false);
    setChecklist({ ...EMPTY_CHECKLIST });
    onClose();
  };

  const isAllChecked = useMemo(() => {
    if (isSeller || isHarvester) {
      return (
        checklist.permitValid &&
        checklist.nameMatches &&
        checklist.contactVerified
      );
    }

    if (isRepairShop) {
      return (
        checklist.permitValid &&
        checklist.certLegit &&
        checklist.nameMatches &&
        checklist.contactVerified
      );
    }

    return false;
  }, [isSeller, isHarvester, isRepairShop, checklist]);

  const displayName = isRepairShop
    ? shopData?.business_name || shopData?.full_name || "Repair Shop"
    : shopData?.full_name || "User";

  const roleLabel = isRepairShop
    ? "Repair Shop"
    : isHarvester
      ? "Harvester"
      : isSeller
        ? "Seller"
        : "User";

  if (!isOpen || !shopData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in duration-200">
        {!isSuccess ? (
          <>
            {/* HEADER */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 p-6">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-800">
                    {isSeller
                      ? "Verify Seller Identity"
                      : isRepairShop
                        ? "Verify Repair Shop Credentials"
                        : "Verify Harvester Credentials"}
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Review the submitted information and documents before
                  approving this {roleLabel.toLowerCase()}.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="rounded-full p-2 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close verification modal"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="overflow-y-auto p-6">
              {/* USER SUMMARY */}
              <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {isSeller
                      ? "Seller Name"
                      : isRepairShop
                        ? "Shop Name"
                        : "Harvester Name"}
                  </p>

                  <p className="text-sm font-medium text-slate-700">
                    {displayName}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Contact Email
                  </p>

                  <p className="text-sm font-medium text-slate-700">
                    {shopData?.email || "No email"}
                  </p>
                </div>

                {isRepairShop && (
                  <>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Full Name
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {shopData?.full_name || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Contact Number
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {shopData?.contact_number || "Not provided"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Business Address
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {shopData?.address || "Not provided"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* DOCUMENT PREVIEWS */}
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText size={17} className="text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Submitted Documents
                  </h3>
                </div>

                {isSeller && (
                  <DocumentPreview
                    title="Government Valid ID"
                    url={
                      shopData?.government_id_url ||
                      shopData?.business_permit_url
                    }
                  />
                )}

                {isHarvester && (
                  <DocumentPreview
                    title="Government Valid ID"
                    url={
                      shopData?.government_id_url ||
                      shopData?.business_permit_url
                    }
                  />
                )}

                {isRepairShop && (
                  <>
                    <DocumentPreview
                      title="Business Permit / DTI Registration"
                      url={shopData?.business_permit_url}
                    />

                    <DocumentPreview
                      title="Technical Certification"
                      url={shopData?.tech_cert_url}
                    />
                  </>
                )}

                {!isSeller && !isHarvester && !isRepairShop && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                    This account has an unsupported role and cannot be verified
                    from this form.
                  </div>
                )}
              </div>

              {/* CHECKLIST */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-800">
                    Verification Checklist
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    The admin must manually review the submitted documents.
                    Scanning only assists with extracting registration
                    information.
                  </p>
                </div>

                <div className="space-y-3">
                  {isSeller && (
                    <>
                      <CheckItem
                        label="Government ID is clear and valid"
                        checked={checklist.permitValid}
                        onChange={() => handleCheck("permitValid")}
                      />

                      <CheckItem
                        label="Seller identity matches registration details"
                        checked={checklist.nameMatches}
                        onChange={() => handleCheck("nameMatches")}
                      />

                      <CheckItem
                        label="Contact information is verified"
                        checked={checklist.contactVerified}
                        onChange={() => handleCheck("contactVerified")}
                      />
                    </>
                  )}

                  {isHarvester && (
                    <>
                      <CheckItem
                        label="Government ID is clear and valid"
                        checked={checklist.permitValid}
                        onChange={() => handleCheck("permitValid")}
                      />

                      <CheckItem
                        label="Harvester identity matches registration details"
                        checked={checklist.nameMatches}
                        onChange={() => handleCheck("nameMatches")}
                      />

                      <CheckItem
                        label="Contact information is verified"
                        checked={checklist.contactVerified}
                        onChange={() => handleCheck("contactVerified")}
                      />
                    </>
                  )}

                  {isRepairShop && (
                    <>
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
                        label="Shop name matches the submitted documents"
                        checked={checklist.nameMatches}
                        onChange={() => handleCheck("nameMatches")}
                      />

                      <CheckItem
                        label="Contact information is verified"
                        checked={checklist.contactVerified}
                        onChange={() => handleCheck("contactVerified")}
                      />
                    </>
                  )}
                </div>

                {!isAllChecked && (
                  <div className="mt-5 flex items-start gap-2 rounded-lg border border-blue-100 bg-white p-3 text-xs text-slate-500">
                    <AlertTriangle
                      size={15}
                      className="mt-0.5 flex-shrink-0 text-blue-500"
                    />
                    <span>
                      Complete all checklist items before approving the
                      account.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex flex-shrink-0 gap-4 border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle size={18} />
                {isProcessing ? "Processing..." : "Reject"}
              </button>

              <button
                type="button"
                disabled={!isAllChecked || isProcessing}
                onClick={handleApprove}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-all ${
                  isAllChecked && !isProcessing
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                <CheckCircle size={18} />
                {isProcessing ? "Processing..." : "Approve & Verify"}
              </button>
            </div>
          </>
        ) : (
          /* SUCCESS VIEW */
          <div className="flex flex-col items-center p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <PartyPopper size={40} />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-slate-800">
              Account Verified Successfully!
            </h2>

            <p className="mb-8 max-w-sm text-slate-500">
              <span className="font-semibold text-slate-700">
                {displayName}
              </span>{" "}
              is now a verified {roleLabel.toLowerCase()}.
            </p>

            <button
              type="button"
              onClick={handleFinalClose}
              className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800"
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

/* =========================
   DOCUMENT PREVIEW
========================= */

const DocumentPreview = ({ title, url }) => (
  <div>
    <p className="mb-2 text-xs font-semibold text-slate-500">{title}</p>

    <div className="flex min-h-[150px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
      {url ? (
        <div className="flex h-full w-full flex-col items-center p-3">
          <img
            src={url}
            alt={title}
            className="mb-2 max-h-40 max-w-full rounded object-contain shadow-sm"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:underline"
          >
            <Eye size={12} />
            Open Document
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <XCircle size={24} className="mb-2 text-red-300" />
          <p className="text-[10px] font-bold text-red-400">
            No file uploaded
          </p>
        </div>
      )}
    </div>
  </div>
);

/* =========================
   CHECKLIST ITEM
========================= */

const CheckItem = ({ label, checked, onChange }) => (
  <button
    type="button"
    className="flex w-full items-center gap-3 text-left"
    onClick={onChange}
  >
    <span
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-all ${
        checked
          ? "border-emerald-500 bg-emerald-500"
          : "border-slate-300 bg-white"
      }`}
    >
      {checked && <Check size={14} className="text-white" />}
    </span>

    <span
      className={`text-sm select-none ${
        checked ? "font-medium text-slate-700" : "text-slate-500"
      }`}
    >
      {label}
    </span>
  </button>
);

export default VerifyCredentialsModal;
