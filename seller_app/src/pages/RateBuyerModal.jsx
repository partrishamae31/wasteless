import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* --- HEADER --- */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-500 p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold">Rate Your Experience</h2>
          <p className="text-white/80 text-sm mt-1">How was your transaction with {buyerName}?</p>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar space-y-8">
          
          {/* --- RATING CATEGORIES --- */}
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-1">
                <h3 className="font-bold text-slate-800 text-sm">{cat.label}</h3>
                <p className="text-xs text-slate-400 mb-1">{cat.sub}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoveredRatings({ ...hoveredRatings, [cat.id]: star })}
                      onMouseLeave={() => setHoveredRatings({ ...hoveredRatings, [cat.id]: 0 })}
                      onClick={() => setRatings({ ...ratings, [cat.id]: star })}
                      className="transition-transform active:scale-90"
                    >
                      <Star
                        size={28}
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
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Would you recommend this seller? <span className="text-red-500">*</span>
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => setRecommend('yes')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-sm ${
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
                className="w-full h-32 pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-slate-600 placeholder:text-slate-300 resize-none transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400 italic">Your feedback helps build trust in the community</p>
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
        <div className="p-8 border-t border-slate-50 flex gap-4 bg-slate-50/30">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-6 border border-slate-200 bg-white rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            disabled={!isFormValid}
            onClick={() => onConfirm({ ratings, recommend, feedback })}
            className={`flex-1 py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
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