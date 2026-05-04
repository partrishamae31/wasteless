import React from "react";
import {
  X,
  User,
  Store,
  ShieldCheck,
  Calendar,
  Mail,
  Star,
  Receipt,
  FileCheck,
  Image as ImageIcon,
} from "lucide-react";

const UserDetailsModal = ({ isOpen, onClose, userData }) => {
  if (!isOpen) return null;
const NoImagePlaceholder = ({ label }) => (
  <div className="w-full py-10 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
    <ImageIcon size={24} className="mb-2" />
    <p className="text-sm">{label}</p>
  </div>
);
  // Mock data for display based on your screenshot
  const details = {
    fullName: userData?.full_name,
    name: userData?.business_name,
    email: userData?.email,
    joinDate: userData?.created_at,
    role: userData?.role,
    transactions: userData?.transactions,
    rating: userData?.rating,
    status: "Active",
    verified: "Yes",
    businessPermit:
      userData?.business_permit_url || userData?.valid_id_url || null,
    techCert: userData?.tech_cert_url || null,
    businessName: userData?.business_name || "Personal Account",
  };
  const role = details.role.toLowerCase();
  const isSeller = details.role.toLowerCase() === "seller";
  const isHarvester = role === "harvester"; 
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6">
      {/* 1. Added flex-col and max-h to the main container */}
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header - Stays Fixed at the Top */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800">User Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-8 bg-slate-50/50 overflow-y-auto flex-1 custom-scrollbar">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              {/* Account Info */}
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

              {/* Platform Metrics */}
              <DetailItem
                label="Transactions"
                value={details.transactions}
                icon={<Receipt size={14} />}
              />
              <DetailItem
                label="Rating"
                value={`${details.rating} ★`}
                icon={<Star size={14} />}
              />

              {/* Status */}
              <DetailItem
                label="Status"
                value={details.status}
                valueColor="text-emerald-600 font-bold"
              />
              <DetailItem
                label="Verified"
                value={details.verified}
                icon={<ShieldCheck size={14} className="text-emerald-500" />}
                valueColor={
                  details.verified === "Yes"
                    ? "text-emerald-600 font-bold"
                    : "text-slate-500"
                }
              />
              {(isSeller || isHarvester) && (
                <div className="col-span-2 border-t border-slate-100 pt-6 space-y-6">
                  
                  {/* Business Permit / Valid ID */}
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-3 block">
                      {isSeller ? "Business Permit / ID" : "Harvester Valid ID"}
                    </span>
                    {details.businessPermit ? (
                      <div className="relative group border rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={details.businessPermit}
                          alt="Credential"
                          className="w-full h-48 object-contain"
                        />
                        <a
                          href={details.businessPermit}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-center py-2 bg-slate-800 text-white text-xs hover:bg-slate-700 transition-colors"
                        >
                          View Full Size
                        </a>
                      </div>
                    ) : (
                      <NoImagePlaceholder label="No ID image uploaded" />
                    )}
                  </div>

                  {/* Technical Certification (Specific to Harvesters or specialized Sellers) */}
                  {details.techCert && (
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-3 block">
                        Technical Certification
                      </span>
                      <div className="relative group border rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={details.techCert}
                          alt="Tech Cert"
                          className="w-full h-48 object-contain"
                        />
                        <a
                          href={details.techCert}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-center py-2 bg-slate-800 text-white text-xs hover:bg-slate-700 transition-colors"
                        >
                          View Full Size
                        </a>
                      </div>
                      
                    </div>
                    
                  )}
                  
                </div>
              )}

              {/* Footer item across two columns */}
              {isSeller && (
                <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-6">
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1">
                    Registered Shop Name
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {details.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Action */}
      </div>
    </div>
  );
};

// Reusable component for each detail entry
const DetailItem = ({ label, value, icon, valueColor = "text-slate-800" }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">
      {label}
    </span>
    <div className="flex items-center gap-2">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  </div>
);

export default UserDetailsModal;
