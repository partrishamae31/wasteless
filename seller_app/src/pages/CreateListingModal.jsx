import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Smartphone, Laptop, Tablet, Monitor, X, ChevronRight, Image, Camera } from 'lucide-react';

const CreateListingModal = ({ isOpen, onClose, userId }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSanitized, setIsSanitized] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    model: '',
    condition: 'Defective', // Default condition
    description: '',
    images: []
  });

  if (!isOpen) return null;

  const categories = [
    { id: 'Smartphone', icon: <Smartphone size={24} />, label: 'Smartphone' },
    { id: 'Laptop', icon: <Laptop size={24} />, label: 'Laptop' },
    { id: 'Tablet', icon: <Tablet size={24} />, label: 'Tablet' },
    { id: 'Monitor', icon: <Monitor size={24} />, label: 'Monitor' },
  ];
const handleFileChange = (e) => {
  const files = Array.from(e.target.files);
  
  // Limit to 5 images as per your UI requirement (Photos 0/5)
  if (files.length + formData.images.length > 5) {
    alert("You can only upload up to 5 images.");
    return;
  }

  // Update the formData state with the new files
  setFormData({
    ...formData,
    images: [...formData.images, ...files]
  });
};
  const handleFinish = async () => {
    setLoading(true);
    try {
      // Corrected to match your Supabase columns
      const { error } = await supabase
        .from('listings')
        .insert([{
          seller_id: userId,        // Matches your screenshot
          device_model: formData.model, // Matches your screenshot
          condition: formData.condition,
          status: 'active'
        }]);

      if (error) throw error;
      
      alert("Listing created successfully!");
      onClose();
      // Optional: window.location.reload() to see it in "My Listings"
    } catch (err) {
      console.error("Submission Error:", err.message);
      alert("Failed to create listing: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const steps = [1, 2, 3];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="max-h-[90vh] overflow-y-auto custom-scrollbar"></div>
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Create E-waste Listing</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        </div>

        {/* Step Indicator Section */}
<div className="flex items-center justify-center py-8 px-20 relative mb-4">
  {/* The Connector Line Container */}
  <div className="absolute h-[2px] left-28 right-28 top-1/2 -z-0 flex gap-0">
    {/* Line segment between Circle 1 and 2 */}
    <div className={`h-full flex-1 transition-all duration-500 ${
      step >= 2 ? 'bg-[#2d7a7f]' : 'bg-gray-100'
    }`}></div>
    
    {/* Line segment between Circle 2 and 3 */}
    <div className={`h-full flex-1 transition-all duration-500 ${
      step >= 3 ? 'bg-[#2d7a7f]' : 'bg-gray-100'
    }`}></div>
  </div>
  
  {/* The Circles */}
  <div className="flex justify-between w-full max-w-[280px] z-10">
    {steps.map((num) => (
      <div 
        key={num} 
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 shadow-sm ${
          step >= num 
            ? 'bg-[#2d7a7f] border-[#2d7a7f] text-white' 
            : 'bg-white border-gray-200 text-gray-400'
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
              <p className="text-sm font-bold text-gray-700">Select Device Category</p>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFormData({...formData, category: cat.id})}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
                      formData.category === cat.id ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    {cat.icon}
                    <span className="mt-2 text-xs font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="mt-6">
                <label className="text-xs font-bold text-gray-500 block mb-2">Select Model</label>
                <input 
                  type="text" 
                  placeholder="Choose a model.."
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm"
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                />
              </div>

              <button 
                disabled={!formData.category || !formData.model}
                onClick={() => setStep(2)}
                className="w-full py-3 bg-slate-200 text-gray-500 rounded-xl font-bold text-sm mt-4 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}
          {step === 2 && (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    {/* Photo Upload Section */}
    <div>
      <div className="flex justify-between items-end mb-2">
        <p className="text-sm font-bold text-gray-700">Photos (0/5)</p>
        <p className="text-[10px] text-gray-400">Add photos to help buyers see the device condition</p>
      </div>
      <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
        <input type="file" multiple className="hidden" onChange={(e) => handleFileChange(e, 'images')} />
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
          <Image size={20} className="text-gray-300" />
        </div>
        <p className="text-xs font-bold text-gray-600">Add photos</p>
        <p className="text-[10px] text-gray-400 mt-1">or drag and drop (5 remaining)</p>
      </label>
    </div>

    {/* Device Condition */}
    <div>
      <p className="text-sm font-bold text-gray-700 mb-3">Device Condition</p>
      <div className="space-y-2">
        {[
          { id: 'Working', desc: 'Device is fully functional' },
          { id: 'Defective', desc: 'Some components not working' },
          { id: 'Parts Only', desc: 'For harvesting components' }
        ].map((cond) => (
          <button
            key={cond.id}
            onClick={() => setFormData({ ...formData, condition: cond.id })}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              formData.condition === cond.id 
                ? 'border-teal-500 bg-teal-50/50' 
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <p className={`text-xs font-bold ${formData.condition === cond.id ? 'text-teal-700' : 'text-gray-700'}`}>{cond.id}</p>
            <p className="text-[10px] text-gray-400">{cond.desc}</p>
          </button>
        ))}
      </div>
    </div>
    {/* Description */}
    <div>
      <p className="text-sm font-bold text-gray-700 mb-2">Description</p>
      <textarea
        placeholder="Describe the device condition, any defects, or specific parts available..."
        className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs min-h-[80px] focus:ring-2 focus:ring-teal-500/20 outline-none"
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />
    </div>

    {/* Estimated Recovery Value Box */}
    <div className="bg-teal-50/30 rounded-xl p-4 border border-teal-50 flex justify-between">
      <div>
        <p className="text-[10px] font-bold text-teal-800 uppercase tracking-tight">Reusable Parts</p>
        <p className="text-lg font-bold text-teal-600">₱5000</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Raw Scrap Value</p>
        <p className="text-lg font-bold text-gray-500">₱750</p>
      </div>
    </div>
    

    {/* Footer Buttons */}
    <div className="flex gap-3 pt-2">
      <button 
        onClick={() => setStep(1)}
        className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50"
      >
        Back
      </button>
      <button 
        onClick={() => setStep(3)}
        className="flex-1 py-3 bg-[#2d7a7f] text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-900/20"
      >
        Continue
      </button>
    </div>
  </div>
)}
{step === 3 && (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    {/* Warning Banner */}
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
      <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-amber-600 text-xs font-bold">!</span>
      </div>
      <div>
        <p className="text-[11px] font-bold text-amber-900">Data Sanitization Required</p>
        <p className="text-[10px] text-amber-700/80">Before listing your device, please ensure all personal data has been removed.</p>
      </div>
    </div>

    {/* Sanitization Checklist */}
    <div>
      <p className="text-sm font-bold text-gray-700 mb-3">Data Sanitization Checklist</p>
      <div className="border border-gray-100 rounded-2xl p-6 space-y-4">
        <p className="text-xs font-bold text-gray-800">For {formData.model || 'your device'}:</p>
        <div className="space-y-3">
          {[
            "Factory reset performed",
            "All accounts logged out and removed",
            "SIM card and memory card removed",
            "Personal files deleted"
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border border-emerald-500 flex items-center justify-center bg-emerald-50">
                <span className="text-emerald-600 text-[10px]">✓</span>
              </div>
              <span className="text-xs text-gray-500">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Confirmation Checkbox */}
    <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
      <input 
        type="checkbox" 
        className="mt-1 rounded border-gray-300 text-[#2d7a7f] focus:ring-[#2d7a7f]"
        checked={isSanitized}
        onChange={(e) => setIsSanitized(e.target.checked)}
      />
      <div>
        <p className="text-xs font-bold text-gray-800">I confirm data sanitization is complete</p>
        <p className="text-[10px] text-gray-400">I have removed all personal data from this device following the checklist above</p>
      </div>
    </label>

    {/* Footer Buttons */}
    <div className="flex gap-3 pt-4">
      <button 
        onClick={() => setStep(2)}
        className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50"
      >
        Back
      </button>
      <button 
        disabled={!isSanitized || loading}
        onClick={handleFinish}
        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
          isSanitized && !loading 
            ? 'bg-[#2d7a7f] text-white shadow-teal-900/20' 
            : 'bg-slate-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {loading ? "Creating..." : "Create Listing"}
      </button>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default CreateListingModal;