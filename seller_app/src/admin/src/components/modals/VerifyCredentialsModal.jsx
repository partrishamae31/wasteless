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
  RefreshCw,
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
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const userRole = shopData?.role?.toLowerCase();

  const isSeller = userRole === "seller";
  const isRepairShop =
    userRole === "repair_shop" || userRole === "repair shop";
  const isHarvester = userRole === "harvester";

  const validIdUrl =
    shopData?.valid_id_url ||
    shopData?.government_id_url ||
    shopData?.id_url ||
    null;

  const businessPermitUrl =
    shopData?.business_permit_url ||
    shopData?.business_permit ||
    null;

  const techCertUrl =
    shopData?.tech_cert_url ||
    shopData?.technical_certification_url ||
    shopData?.tech_certification_url ||
    null;

  // Reset the form whenever a different application is opened.
  useEffect(() => {
    if (isOpen) {
      setChecklist({ ...EMPTY_CHECKLIST });
      setIsSuccess(false);
      setIsProcessing(false);
      setRejectionReason("");
      setShowRejectForm(false);
    }
  }, [isOpen, shopData?.id]);

  const handleCheck = (key) => {
    if (isProcessing) return;

    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const requiredDocumentsPresent = useMemo(() => {
    if (isRepairShop) {
      return Boolean(businessPermitUrl && techCertUrl);
    }

    if (isSeller || isHarvester) {
      return Boolean(validIdUrl);
    }

    return false;
  }, [
    isRepairShop,
    isSeller,
    isHarvester,
    businessPermitUrl,
    techCertUrl,
    validIdUrl,
  ]);

  const isAllChecked = useMemo(() => {
    if (!requiredDocumentsPresent) return false;

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
  }, [
    isSeller,
    isHarvester,
    isRepairShop,
    checklist,
    requiredDocumentsPresent,
  ]);

  const handleReject = async () => {
    if (!shopData?.id || isProcessing) return;

    if (!rejectionReason.trim()) {
      alert(
        "Please provide a reason for rejection so the applicant knows what needs to be corrected."
      );
      return;
    }

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: "rejected",
          rejection_reason: rejectionReason.trim(),
          is_verified: false,
        })
        .eq("id", shopData.id);

      if (error) throw error;

      alert(
        "The verification request has been rejected. The applicant can use the rejection reason to correct and resubmit their documents."
      );

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

      /*
       * The admin is the final verifier.
       * Gemini/document scanning during signup only assists with
       * extracting registration information.
       *
       * We intentionally use the existing profiles fields here:
       * - is_verified
       * - verification_status
       * - rejection_reason
       *
       * The UI derives the visible "Verified Repair Shop" badge
       * from verification_status + role, so this does not require
       * inventing another database column.
       */
      const { data, error } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verification_status: "verified",
          rejection_reason: null,
        })
        .eq("id", shopData.id)
        .select("id, role, is_verified, verification_status");

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
    setRejectionReason("");
    setShowRejectForm(false);
    onClose();
  };

  const displayName = isRepairShop
    ? shopData?.business_name || shopData?.full_name || "Repair Shop"
    : shopData?.full_name || "User";

  const roleLabel = isRepairShop
    ? "Repair Shop"
    : isHarvester
      ? "Tech Harvester"
      : isSeller
        ? "Seller"
        : "User";

  const verificationBadge = isRepairShop
    ? "Verified Repair Shop"
    : isHarvester
      ? "Verified Harvester"
      : isSeller
        ? "Verified Seller"
        : "Verified User";

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

                  <p className="text-sm font-medium text-slate-700 break-all">
                    {shopData?.email || "No email"}
                  </p>
                </div>

                {isRepairShop && (
                  <>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Owner's Name
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
                        {shopData?.contact_number ||
                          shopData?.phone ||
                          shopData?.phone_number ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Business Address
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {shopData?.address ||
                          shopData?.shop_address ||
                          "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Barangay
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {shopData?.barangay || "Not provided"}
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
                    url={validIdUrl}
                  />
                )}

                {isHarvester && (
                  <DocumentPreview
                    title="Government Valid ID"
                    url={validIdUrl}
                  />
                )}

                {isRepairShop && (
                  <>
                    <DocumentPreview
                      title="Business Permit"
                      url={businessPermitUrl}
                    />

                    <DocumentPreview
                      title="Technical Certification"
                      url={techCertUrl}
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

              {/* DOCUMENT REQUIREMENT WARNING */}
              {!requiredDocumentsPresent && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 flex-shrink-0 text-red-500"
                  />

                  <div>
                    <p className="font-semibold">
                      Required verification document missing
                    </p>

                    <p className="mt-1 text-xs leading-5">
                      {isRepairShop
                        ? "A Business Permit and at least one Technical Certification must be uploaded before this Repair Shop can be approved."
                        : "A government-issued valid ID must be uploaded before this account can be approved."}
                    </p>
                  </div>
                </div>
              )}

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
                        label="Business/owner information matches the submitted documents"
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
                      Complete all checklist items and make sure all required
                      documents are uploaded before approving the account.
                    </span>
                  </div>
                )}
              </div>

              {/* REJECTION FORM */}
              {showRejectForm && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle size={17} className="text-red-500" />
                    <h3 className="text-sm font-bold text-red-700">
                      Request Correction / Reject Verification
                    </h3>
                  </div>

                  <p className="mb-3 text-xs leading-5 text-slate-600">
                    Enter the discrepancy or reason that the Repair Shop needs
                    to correct before resubmitting its verification documents.
                  </p>

                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    disabled={isProcessing}
                    rows={4}
                    placeholder="Example: Business permit is expired. Please upload a current permit and resubmit the verification request."
                    className="w-full resize-none rounded-lg border border-red-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
                  />

                  <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason("");
                      }}
                      disabled={isProcessing}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={isProcessing || !rejectionReason.trim()}
                      className="flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <XCircle size={15} />
                      {isProcessing ? "Processing..." : "Reject & Request Resubmission"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            {!showRejectForm && (
              <div className="flex flex-shrink-0 gap-4 border-t border-slate-100 p-6">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isProcessing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle size={18} />
                  Reject / Request Correction
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
            )}
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

            <div className="mb-3 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              {verificationBadge}
            </div>

            <p className="mb-8 max-w-sm text-slate-500">
              <span className="font-semibold text-slate-700">
                {displayName}
              </span>{" "}
              is now a {verificationBadge.toLowerCase()}.
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

const DocumentPreview = ({ title, url }) => {
  const isPdf = typeof url === "string" && /\.pdf(?:$|\?)/i.test(url);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">{title}</p>

        {url && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {isPdf ? "PDF" : "Image"}
          </span>
        )}
      </div>

      <div className="flex min-h-[150px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
        {url ? (
          <div className="flex h-full w-full flex-col items-center p-3">
            {isPdf ? (
              <iframe
                src={url}
                title={title}
                className="mb-2 h-40 w-full rounded border border-slate-200 bg-white"
              />
            ) : (
              <img
                src={url}
                alt={title}
                className="mb-2 max-h-40 max-w-full rounded object-contain shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}

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
};

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
