import React, { useState } from "react";
import { X, Info, MapPin, Navigation, CheckCircle2, ChevronLeft, Circle, MoreVertical } from "lucide-react";

const DonationModal = ({ isOpen, onClose, onConfirm, listing, barangay }) => {
  const [view, setView] = useState("details");

  if (!isOpen) return null;

  const handleBack = () => {
    if (view === "directions") setView("details");
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 my-auto">
        {/* Header */}
        <div className="bg-[#f97316] p-7 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            {view === "directions" && (
              <button
                onClick={() => setView("details")}
                className="hover:bg-white/20 p-1.5 rounded-full transition"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold">
                {view === "details"
                  ? "Donation Details"
                  : "Directions to Center"}
              </h2>
              <p className="text-[10px] opacity-90 uppercase tracking-wider font-medium">
                {view === "details"
                  ? "Select your barangay's e-waste center"
                  : `Barangay ${barangay || "Gen. T. de Leon"} Drop-off Point`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {view === "details" ? (
          /* --- VIEW 1: DETAILS --- */
          <div className="p-7 space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
              <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p className="text-[11px] text-blue-700 leading-relaxed text-left">
                <span className="font-bold">
                  Drop-off at Your Barangay Center:
                </span>{" "}
                Based on your registered address in
                <span className="font-bold">
                  {" "}
                  {barangay || "Gen. T. de Leon"}
                </span>
                , you will bring your device to your designated center.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] block text-left">
                Your Designated E-waste Center
              </label>
              <div className="border border-emerald-100 bg-emerald-50/40 rounded-3xl p-6 border-dashed">
                <div className="flex gap-4 mb-5 text-left">
                  <div className="bg-[#10b981] p-3.5 rounded-2xl text-white shrink-0 h-fit shadow-sm">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 italic">
                      Barangay {barangay || "Gen. T. de Leon"} E-waste Center
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {barangay || "Gen. T. de Leon"} Public Market, Valenzuela
                      City
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Mon-Fri, 8:00 AM - 5:00 PM
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setView("directions")}
                  className="w-full bg-[#84cc16] text-white py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-[#65a30d] transition-all shadow-md active:scale-95 uppercase tracking-widest"
                >
                  <Navigation size={16} fill="white" /> Get Directions
                </button>
              </div>
            </div>

            <div className="text-left space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                Additional Notes (Optional)
              </label>
              <textarea
                placeholder="Any special instructions..."
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm min-h-[110px] outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#f97316] transition-all resize-none"
              />
            </div>
          </div>
        ) : (
          /* --- VIEW 2: DIRECTIONS (ACCURATE TO MOCKUP) --- */
          <div className="p-7 space-y-6">
            {/* Map Area */}
            <div className="relative w-full h-52 bg-slate-200 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
              <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/120.985,14.698,15/600x400?access_token=pk.placeholder')] bg-cover bg-center" />
              <div className="absolute inset-0 bg-black/5" />

              {/* Center Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="bg-[#f97316] p-2.5 rounded-full shadow-xl border-2 border-white animate-bounce">
                  <MapPin size={24} className="text-white" fill="white" />
                </div>
              </div>

              {/* Estimated Travel Badge */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 border border-white/50">
                <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                  <Circle size={8} className="text-slate-400 fill-slate-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-700">
                  Estimated Travel: 8-12 mins
                </span>
              </div>
            </div>

            {/* Stepper / Route Info */}
            <div className="px-2 space-y-0">
              {/* Start Node */}
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full border-[3px] border-blue-500 bg-white shadow-sm" />
                  <div className="w-[2px] h-12 bg-dashed border-l-2 border-dashed border-slate-200 my-1" />
                </div>
                <div className="text-left pb-4">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Start Point
                  </p>
                  <p className="text-sm font-extrabold text-slate-800">
                    Your Registered Address
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Valenzuela City, Metro Manila
                  </p>
                </div>
              </div>

              {/* Destination Node */}
              <div className="flex gap-5">
                <div className="w-5 h-5 rounded-full border-[3px] border-emerald-500 bg-white shadow-sm" />
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Destination
                  </p>
                  <p className="text-sm font-extrabold text-slate-800 italic">
                    Barangay {barangay || "Gen. T. de Leon"} E-waste Center
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {barangay || "Gen. T. de Leon"} Public Market
                  </p>
                </div>
              </div>
            </div>

            {/* Pro-tip Box */}
            <div className="bg-orange-50 border border-orange-100 p-5 rounded-[1.5rem] flex gap-3 items-start">
              <div className="bg-orange-100 p-1.5 rounded-lg shrink-0">
                <Info size={16} className="text-orange-600" />
              </div>
              <p className="text-[11px] text-orange-800 leading-relaxed font-medium text-left">
                <span className="font-bold">Pro-tip:</span> Make sure to pack
                your items securely. Mention the{" "}
                <span className="underline italic">"Gadget-to-Goods"</span>{" "}
                program to the staff at the counter for priority processing.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-7 pt-0 flex gap-4">
          <button
            onClick={handleBack}
            className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition"
          >
            {view === "details" ? "Back" : "Return"}
          </button>
          <button
            onClick={() => onConfirm(listing?.id)}
            className="flex-[1.5] py-4 bg-[#f97316] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#ea580c] transition shadow-lg shadow-orange-100 active:scale-95"
          >
            <CheckCircle2 size={18} /> Confirm Donation
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
