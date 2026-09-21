import React from "react";
import {
  X,
  User,
  Store,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Mail,
  Star,
  Receipt,
  FileCheck,
  Image as ImageIcon,
  MapPin,
  Phone,
  Building2,
} from "lucide-react";

const UserDetailsModal = ({ isOpen, onClose, userData }) => {
  if (!isOpen) return null;

  const NoImagePlaceholder = ({ label }) => (
    <div className="w-full py-10 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
      <ImageIcon size={24} className="mb-2" />
      <p className="text-sm">{label}</p>
    </div>
  );

  const role = (userData?.role || "").toLowerCase();
  const isSeller = role === "seller";
  const isHarvester = role === "harvester";
  const isRepairShop = role === "repair_shop" || role === "repair shop";

  const verified =
    Boolean(userData?.is_verified) ||
    userData?.verification_status?.toLowerCase() === "verified";

  const verificationStatus =
    userData?.verification_status?.toLowerCase() || "pending";

  const roleLabel =
    isRepairShop
      ? "Repair Shop"
      : isHarvester
        ? "Tech Harvester"
        : isSeller
          ? "Seller"
          : userData?.role || "User";

  const details = {
    fullName: userData?.full_name || "—",
    email: userData?.email || "—",
    joinDate: userData?.created_at
      ? new Date(userData.created_at).toLocaleDateString()
      : "—",
    role: roleLabel,
    transactions:
      userData?.transactions_count ??
      userData?.transactions ??
      0,
    rating:
      userData?.average_rating ??
      userData?.rating ??
      null,
    status: userData?.status || "Active",
    verificationStatus,
    address:
      userData?.address ||
      userData?.home_address ||
      userData?.shop_address ||
      "—",
    barangay: userData?.barangay || "—",
    contactNumber:
      userData?.contact_number ||
      userData?.phone ||
      userData?.phone_number ||
      "—",
    businessName: userData?.business_name || "Personal Account",

    // Government ID / verification document fields.
    validIdUrl:
      userData?.valid_id_url ||
      userData?.government_id_url ||
      userData?.id_url ||
      null,

    // Repair-shop credentials.
    businessPermitUrl:
      userData?.business_permit_url ||
      userData?.business_permit ||
      null,
    techCertUrl:
      userData?.tech_cert_url ||
      userData?.technical_certification_url ||
      userData?.tech_certification_url ||
      null,
  };

  const renderDocument = (url, label, icon = <FileCheck size={14} />) => {
    if (!url) {
      return <NoImagePlaceholder label={`No ${label} uploaded`} />;
    }

    const isPdf = /\.pdf(?:$|\?)/i.test(url);

    return (
      <div className="relative group border rounded-lg overflow-hidden bg-slate-100">
        {isPdf ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500">
            <FileCheck size={36} className="mb-2" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-slate-400">PDF document</p>
          </div>
        ) : (
          <img
            src={url}
            alt={label}
            className="w-full h-48 object-contain"
          />
        )}

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 py-2 bg-slate-800 text-white text-xs hover:bg-slate-700 transition-colors"
        >
          {icon}
          View Full Size
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">User Details</h2>
            <p className="text-xs text-slate-400 mt-1">
              Account information and verification documents
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 bg-slate-50/50 overflow-y-auto flex-1 custom-scrollbar">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              {/* Account Information */}
              <DetailItem
                label="Name"
                value={details.fullName}
                icon={<User size={14} />}
              />

              <DetailItem
                label="Email"
                value={details.email}
                icon={<Mail size={14} />}
              />

              <DetailItem
                label="Join Date"
                value={details.joinDate}
                icon={<Calendar size={14} />}
              />

              <DetailItem
                label="Role"
                value={details.role}
                icon={<Store size={14} />}
              />

              <DetailItem
                label="Contact Number"
                value={details.contactNumber}
                icon={<Phone size={14} />}
              />

              <DetailItem
                label="Barangay"
                value={details.barangay}
                icon={<MapPin size={14} />}
              />

              <div className="md:col-span-2">
                <DetailItem
                  label={isRepairShop ? "Shop Address" : "Address"}
                  value={details.address}
                  icon={<MapPin size={14} />}
                />
              </div>

              {/* Repair-shop business information */}
              {isRepairShop && (
                <div className="md:col-span-2 border-t border-slate-100 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                    <DetailItem
                      label="Business Name"
                      value={details.businessName}
                      icon={<Building2 size={14} />}
                    />

                    <DetailItem
                      label="Verification Type"
                      value="Business Permit + Technical Certification"
                      icon={<FileCheck size={14} />}
                    />
                  </div>
                </div>
              )}

              {/* Platform Metrics */}
              <DetailItem
                label="Transactions"
                value={details.transactions}
                icon={<Receipt size={14} />}
              />

              <DetailItem
                label="Rating"
                value={
                  details.rating !== null && details.rating !== undefined
                    ? `${details.rating} ★`
                    : "N/A"
                }
                icon={<Star size={14} />}
              />

              {/* Status */}
              <DetailItem
                label="Account Status"
                value={details.status}
                valueColor={
                  details.status?.toLowerCase() === "active"
                    ? "text-emerald-600 font-bold"
                    : "text-red-500 font-bold"
                }
              />

              <DetailItem
                label="Verification"
                value={
                  verified
                    ? "Verified"
                    : verificationStatus === "rejected"
                      ? "Unverified / Rejected"
                      : "New User / Pending"
                }
                icon={
                  verified ? (
                    <ShieldCheck size={14} className="text-emerald-500" />
                  ) : (
                    <ShieldAlert size={14} className="text-orange-500" />
                  )
                }
                valueColor={
                  verified
                    ? "text-emerald-600 font-bold"
                    : verificationStatus === "rejected"
                      ? "text-red-500 font-bold"
                      : "text-orange-500 font-bold"
                }
              />

              {/* Verification Documents */}
              <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={15} className="text-slate-500" />
                    <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">
                      Verification Documents
                    </span>
                  </div>

                  {/* Government ID for Seller / Harvester */}
                  {(isSeller || isHarvester) && (
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-3 block">
                        Government-Issued Valid ID
                      </span>

                      {renderDocument(
                        details.validIdUrl,
                        "Government-Issued Valid ID"
                      )}
                    </div>
                  )}

                  {/* Repair Shop Business Permit */}
                  {isRepairShop && (
                    <div className="space-y-6">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-3 block">
                          Business Permit
                        </span>

                        {renderDocument(
                          details.businessPermitUrl,
                          "Business Permit"
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-3 block">
                          Technical Certification
                        </span>

                        {renderDocument(
                          details.techCertUrl,
                          "Technical Certification"
                        )}
                      </div>
                    </div>
                  )}

                  {!isSeller && !isHarvester && !isRepairShop && (
                    <NoImagePlaceholder label="No verification documents available" />
                  )}
                </div>
              </div>

              {/* Seller-specific information */}
              {isSeller && (
                <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-6">
                  <DetailItem
                    label="Registered Shop Name"
                    value={details.businessName}
                    icon={<Store size={14} />}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, icon, valueColor = "text-slate-800" }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">
      {label}
    </span>

    <div className="flex items-center gap-2">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className={`text-sm font-semibold break-words ${valueColor}`}>
        {value ?? "—"}
      </span>
    </div>
  </div>
);

export default UserDetailsModal;
