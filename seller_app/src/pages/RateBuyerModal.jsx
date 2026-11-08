import React, { useState } from 'react';
import useBodyScrollLock from "../utils/useBodyScrollLock";
import { Star, ThumbsUp, ThumbsDown, MessageSquare, X, CheckCircle2 } from 'lucide-react';

const RateBuyerModal = ({ isOpen, onClose, buyerName, onConfirm }) => {
  const [ratings, setRatings] = useState({
    communication: 0,
    punctuality: 0,
    payment: 0,
    overall: 0,
  });
  const [recommend, setRecommend] = useState(null); // 'yes' or 'no'
  const [feedback, setFeedback] = useState('');
  const [hoveredRatings, setHoveredRatings] = useState({
    communication: 0,
    punctuality: 0,
    payment: 0,
    overall: 0,
  });

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const categories = [
    { id: 'communication', label: 'Communication', sub: 'Responsiveness and clarity' },
    { id: 'punctuality', label: 'Punctuality', sub: 'On-time for meetup' },
    { id: 'payment', label: 'Payment', sub: 'Payment received as agreed' },
    { id: 'overall', label: 'Overall Experience', sub: 'Overall satisfaction' },
  ];

  const isFormValid = 
    ratings.communication > 0 && 
    ratings.punctuality > 0 && 
    ratings.payment > 0 && 
    ratings.overall > 0 && 
    recommend !== null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div role="dialog"
        aria-modal="true"
        aria-labelledby="rate-buyer-title"
        className="relative mx-auto my-4 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 sm:my-6 sm:rounded-[1.75rem]">
        
        {/* --- HEADER --- */}
        <div className="relative shrink-0 bg-gradient-to-r from-blue-600 to-purple-500 px-5 py-4 text-white sm:px-6 sm:py-5">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-white/20 sm:right-5 sm:top-5"
          >
            <X size={20} />
          </button>
          <h2 id="rate-buyer-title" className="pr-10 text-xl font-bold sm:text-2xl">Rate Your Experience</h2>
          <p className="text-white/80 text-sm mt-1">How was your transaction with {buyerName}?</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-6 sm:px-6 sm:py-6">
          
          {/* --- RATING CATEGORIES --- */}
          <div className="space-y-5">
            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-1.5">
                <h3 className="font-bold text-slate-800 text-sm">{cat.label}</h3>
                <p className="text-xs text-slate-400 mb-1">{cat.sub}</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoveredRatings({ ...hoveredRatings, [cat.id]: star })}
                      onMouseLeave={() => setHoveredRatings({ ...hoveredRatings, [cat.id]: 0 })}
                      onClick={() => setRatings({ ...ratings, [cat.id]: star })}
                      type="button"
                      aria-label={`${star} out of 5 stars for ${cat.label}`}
                      className="rounded-md p-0.5 transition-transform hover:scale-110 active:scale-90"
                    >
                      <Star
                        size={24}
                        className={`transition-colors ${
                          star <= (hoveredRatings[cat.id] || ratings[cat.id])
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* --- RECOMMENDATION --- */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-800 text-sm">
              Would you recommend this seller? <span className="text-red-500">*</span>
            </h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                onClick={() => setRecommend('yes')}
                type="button"
                className={`min-h-11 flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all font-bold text-sm ${
                  recommend === 'yes'
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-100 text-slate-500 hover:border-slate-200"
                }`}
              >
                <ThumbsUp size={18} /> Yes, Recommend
              </button>
              <button
                onClick={() => setRecommend('no')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-sm ${
                  recommend === 'no'
                    ? "border-slate-800 bg-slate-50 text-slate-800"
                    : "border-slate-100 text-slate-500 hover:border-slate-200"
                }`}
              >
                <ThumbsDown size={18} /> No, Don't Recommend
              </button>
            </div>
          </div>

          {/* --- ADDITIONAL FEEDBACK --- */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Additional Feedback (Optional)</h3>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-4 text-slate-300" size={18} />
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience..."
                className="w-full min-h-24 max-h-40 resize-y rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-600 outline-none transition-all placeholder:text-slate-300 focus:border-transparent focus:ring-2 focus:ring-blue-500 sm:min-h-28"
              />
            </div>
            <p className="text-xs text-slate-400 italic">Your feedback helps build trust in the community</p>
          </div>

          {/* --- VALIDATION WARNING --- */}
          {!isFormValid && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-pulse">
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Please rate all categories and indicate if you would recommend before submitting
              </p>
            </div>
          )}
        </div>

        {/* --- FOOTER BUTTONS --- */}
        <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:gap-4 sm:px-6">
          <button
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 sm:px-6"
          >
            Cancel
          </button>
          <button
            disabled={!isFormValid}
            onClick={() => onConfirm({ ratings, recommend, feedback })}
            className={`min-h-11 flex-1 rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md sm:px-6 ${
              isFormValid
                ? "bg-[#2d7a7f] text-white hover:bg-[#246367] shadow-teal-100"
                : "bg-teal-100/50 text-white cursor-not-allowed shadow-none"
            }`}
          >
            <CheckCircle2 size={18} /> Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateBuyerModal;