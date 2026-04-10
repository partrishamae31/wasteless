import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Make sure the path matches where your supabaseClient.js is located
const SignUp = ({ onLoginClick }) => {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form Data State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
    barangay: '',
    password: '',
    confirmPassword: '',
    idFile: null,
    businessName: '',
    businessPermit: null,
    techCert: null
  });

  // Validation Errors State
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

const handleFileChange = (e, field) => {
  // Use index to get the actual file object
  // CHANGE THE LINE BELOW:
  const selectedFile = e.target.files && e.target.files; // Add here!
  
  if (selectedFile) {
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [field]: "File is too large (Max 5MB)" }));
    } else {
      // Save the single file to state
      setFormData(prev => ({ ...prev, [field]: selectedFile }));
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }
};

  const validateStep2 = () => {
    let newErrors = {};
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.contactNumber) newErrors.contactNumber = "Contact number is required";
    if (!formData.barangay) newErrors.barangay = "Please select your barangay";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (step === 1 && accountType) {
      setStep(2);
    } else if (step === 2) {
    if (validateStep2()) {
      // ADD THESE 3 LINES BELOW:
      if (accountType === 'seller') {
        setIsSubmitted(true); // Sellers go straight to the end
      } else {
        setStep(3); // Harvesters go to the upload screen
      }
    }
    } else if (step === 3) {
  if (!formData.businessPermit) { // Changed from idFile
    setErrors({ ...errors, businessPermit: "Please upload your permit" });
  } else {
    setIsSubmitted(true);
  }
}
  };

  const handleFinalSubmit = async () => {
  try {
    // 1. Sign up the user first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) throw authError;

    // Use the ID from the newly created auth user
    const userId = authData.user?.id;

    if (!userId) throw new Error("User ID not generated.");

    // 2. Upload the Permit (using the userId in the path for organization)
    const permitFile = formData.businessPermit;
    const permitPath = `permits/${userId}/${Date.now()}_${permitFile.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('verifications')
      .upload(permitPath, permitFile);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('verifications')
      .getPublicUrl(permitPath);

    // 3. NOW insert into profiles (This satisfies the Foreign Key)
    const { error: dbError } = await supabase
      .from('profiles')
      .insert([{
        id: userId, // This matches the ID in auth.users
        full_name: formData.fullName,
        email: formData.email,
        role: accountType,
        business_name: formData.businessName,
        business_permit_url: publicUrlData.publicUrl,
        status: 'pending'
      }]);

    if (dbError) throw dbError;

    alert("Registration successful! Please check your email for a verification link.");
  } catch (error) {
    console.error("Submission failed:", error.message);
    alert("Registration failed: " + error.message);
  }
};

  const steps = [1, 2, 3];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1a4567] via-[#2d7a7f] to-[#6da43a] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#448b78] to-[#6da43a] p-6 text-white text-left flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a13 13 0 0 1-13 13L8.1 20H11Z"/><path d="M19 2c-3 1.5-6.5 4-8 10"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">Join Wasteless</h2>
            <p className="text-[10px] opacity-90">Create your account</p>
          </div>
        </div>

        <div className="p-8">
          {/* Progress Bar / Step Indicator */}
          <div className="flex items-center justify-center mb-8 relative">
            <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-gray-100 -z-0"></div>
            <div className="flex justify-between w-full px-4 relative z-10">
                {steps.map((num) => (
                <div 
                    key={num}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step >= num ? 'bg-[#2d7a7f] text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                >
                    {step > num || isSubmitted ? '✓' : num}
                </div>
                ))}
            </div>
          </div>

          {/* STEP 1: Account Selection */}
          {!isSubmitted && step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Select Account Type</h3>
              <button 
                onClick={() => setAccountType('seller')}
                className={`w-full py-4 px-6 border rounded-xl text-sm transition-all text-center ${
                  accountType === 'seller' ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                }`}
              >
                E-waste Seller
              </button>
              <button 
                onClick={() => setAccountType('harvester')}
                className={`w-full py-4 px-6 border rounded-xl text-sm transition-all text-center ${
                  accountType === 'harvester' ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                }`}
              >
                Repair Shop / Tech-Harvester
              </button>
              <button 
                disabled={!accountType}
                onClick={handleContinue}
                className={`w-full mt-6 py-3 rounded-lg font-bold text-sm transition-all ${
                  accountType ? 'bg-[#2d7a7f] text-white hover:opacity-90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          )}

          {/* STEP 2: Basic Information */}
          {!isSubmitted && step === 2 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">Full Name *</label>
                  <input name="fullName" type="text" placeholder="Juan Dela Cruz" className={`w-full px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-1 ${errors.fullName ? 'border-red-500 ring-red-500' : 'border-gray-100 focus:ring-teal-500'}`} onChange={handleChange} value={formData.fullName} />
                  {errors.fullName && <p className="text-[9px] text-red-500 mt-1">{errors.fullName}</p>}
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">Email Address *</label>
                  <input name="email" type="email" placeholder="juan.delacruz@example.com" className={`w-full px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-1 ${errors.email ? 'border-red-500 ring-red-500' : 'border-gray-100 focus:ring-teal-500'}`} onChange={handleChange} value={formData.email} />
                  {errors.email && <p className="text-[9px] text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">Contact Number *</label>
                  <input name="contactNumber" type="text" placeholder="09123456789" className={`w-full px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-1 ${errors.contactNumber ? 'border-red-500 ring-red-500' : 'border-gray-100 focus:ring-teal-500'}`} onChange={handleChange} value={formData.contactNumber} />
                  {errors.contactNumber && <p className="text-[9px] text-red-500 mt-1">{errors.contactNumber}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">Barangay of Residence *</label>
                  <select name="barangay" className={`w-full px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-1 ${errors.barangay ? 'border-red-500 ring-red-500' : 'border-gray-100 focus:ring-teal-500'}`} onChange={handleChange} value={formData.barangay}>
                    <option value="">Select barangay...</option>
                    <option value="brgy1">Barangay 1</option>
                  </select>
                  {errors.barangay && <p className="text-[9px] text-red-500 mt-1">{errors.barangay}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input name="password" type="password" placeholder="Password *" className={`w-full px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-1 ${errors.password ? 'border-red-500 ring-red-500' : 'border-gray-100 focus:ring-teal-500'}`} onChange={handleChange} />
                  <input name="confirmPassword" type="password" placeholder="Confirm *" className={`w-full px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-1 ${errors.confirmPassword ? 'border-red-500 ring-red-500' : 'border-gray-100 focus:ring-teal-500'}`} onChange={handleChange} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(1)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50">Back</button>
                <button onClick={handleContinue} className="flex-1 py-2 bg-[#2d7a7f] text-white rounded-lg font-bold text-sm hover:opacity-90">Continue</button>
              </div>
            </div>
          )}

          {/* STEP 3: Professional Verification */}
{!isSubmitted && step === 3 && (
  <div className="space-y-4 animate-fadeIn text-left">
    
    {/* Banner */}
    <h3 className="text-xs font-bold text-emerald-900 mb-1">Professional Verification</h3>
    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-2">
      
      <p className="text-[10px] text-emerald-800 leading-relaxed">
        To ensure marketplace integrity, we require all repair shops and tech-harvesters to verify 
        their credentials. Your account will be set to "Pending Verification" until an administrator 
        reviews your documents.
      </p>
    </div>

    {/* Business Name Input */}
    <div>
      <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">Business/Shop Name *</label>
      <input 
        name="businessName" 
        type="text" 
        placeholder="Tech Repair Shop" 
        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" 
        onChange={handleChange} 
        value={formData.businessName || ''} 
      />
    </div>

    {/* Business Permit Upload */}
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Business Permit / DTI Registration *</label>
      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <svg className="w-6 h-6 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          <p className="text-[10px] font-bold text-[#2d7a7f]">{formData.businessPermit ? formData.businessPermit.name : 'Click to upload'}</p>
          {/* ADD THE PREVIEW HERE */}
    {/* The 'instanceof File' check ensures the app won't crash if the state is messy */}
{formData.businessPermit && formData.businessPermit instanceof File && (
  <div className="mt-2">
    <img 
      src={URL.createObjectURL(formData.businessPermit)} 
      className="h-20 w-auto rounded-lg object-cover shadow-sm border border-gray-200" 
      alt="Preview" 
    />
  </div>
)}
          <p className="text-[8px] text-gray-400 mt-1">PDF or JPEG (max 5MB)</p>
        </div>
        <input 
  type="file" 
  className="hidden" 
  accept=".pdf,.jpg,.jpeg" 
  onChange={(e) => handleFileChange(e, 'businessPermit')} 
/>
      </label>
    </div>

    {/* Technical Certification Upload */}
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Technical Certification *</label>
      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <svg className="w-6 h-6 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          <p className="text-[10px] font-bold text-[#2d7a7f]">{formData.techCert ? formData.techCert.name : 'Click to upload'}</p>
          <p className="text-[8px] text-gray-400 mt-1">PDF or JPEG (max 5MB)</p>
        </div>
        <input 
  type="file" 
  className="hidden" 
  accept=".pdf,.jpg,.jpeg" 
  onChange={(e) => handleFileChange(e, 'techCert')} 
/>
      </label>
    </div>

    {/* Navigation Buttons */}
    <div className="flex gap-3 pt-4">
      <button onClick={() => setStep(2)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50">Back</button>
      <button onClick={handleContinue} className="flex-1 py-2 bg-[#2d7a7f] text-white rounded-lg font-bold text-sm hover:opacity-90">Continue</button>
    </div>
  </div>
)}
          {/* FINAL STEP: Complete Registration */}
          {isSubmitted && (
            <div className="space-y-6 animate-fadeIn text-left">
              <h3 className="text-sm font-bold text-gray-700">Complete Registration</h3>
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-xl flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-8 h-8 text-[#6da43a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-[10px] text-emerald-800 font-medium text-center px-4">
                  You're all set! Click "Complete Registration" to create your account.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsSubmitted(false)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm">Back</button>
                <button onClick={handleFinalSubmit} className="flex-1 py-3 bg-[#6da43a] text-white rounded-lg font-bold text-sm shadow-md hover:opacity-90">Complete Registration</button>
              </div>
            </div>
          )}

          {/* Login Footer */}
          <p className="text-center text-[11px] text-gray-400 mt-6">
            Already have an account? <span onClick={onLoginClick} className="text-teal-600 font-bold cursor-pointer hover:underline">Login</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;