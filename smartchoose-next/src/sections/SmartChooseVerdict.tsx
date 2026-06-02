"use client";

interface SmartChooseVerdictProps {
  verdict: string;
  winner?: string;
  rating?: number;
  bestFor?: string;
  productName?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < Math.round(rating) ? 'text-amber-400' : 'text-white/30'}`}
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-2 text-white font-black text-lg">{rating.toFixed(1)}<span className="text-white/60 text-sm font-medium">/5</span></span>
    </div>
  );
}

export function SmartChooseVerdict({ verdict, winner, rating, bestFor, productName }: SmartChooseVerdictProps) {
  return (
    <div className="verdict-block not-prose mt-14 mb-4 rounded-2xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">SmartChoose Editorial</p>
            <h3 className="text-white font-black text-lg leading-tight">Our Verdict</h3>
          </div>
        </div>

        {rating && <StarRating rating={rating} />}
      </div>

      {/* Body */}
      <div className="bg-white px-6 py-5 space-y-4">
        {winner && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Winner</p>
              <p className="font-black text-slate-900 text-sm">{winner}</p>
            </div>
            {bestFor && (
              <span className="ml-auto shrink-0 px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase tracking-wide">
                {bestFor}
              </span>
            )}
          </div>
        )}

        <p className="text-slate-700 leading-relaxed text-sm">{verdict}</p>

        {/* Editorial badge */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-white text-[8px] font-black">SC</div>
          SmartChoose Editorial Team · Independent Review
        </div>
      </div>
    </div>
  );
}

export default SmartChooseVerdict;
