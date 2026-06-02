"use client";

interface QuickAnswerBlockProps {
  question?: string;
  answer: string;
  winner?: string;
  rating?: number;
  lastReviewed?: string;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-4 h-4 ${i < full ? 'text-amber-400' : (i === full && half ? 'text-amber-300' : 'text-slate-200')}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-bold text-slate-700">{rating.toFixed(1)}</span>
    </span>
  );
}

export function QuickAnswerBlock({ question, answer, winner, rating, lastReviewed }: QuickAnswerBlockProps) {
  const reviewDate = lastReviewed
    ? new Date(lastReviewed).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="quick-answer-block not-prose my-8 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-emerald-600 text-white">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xs font-black uppercase tracking-widest">Quick Answer</span>
        <span className="ml-auto text-[10px] font-semibold opacity-80">Updated: {reviewDate}</span>
      </div>

      <div className="p-5 sm:p-6">
        {/* Question */}
        {question && (
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-2">
            {question}
          </p>
        )}

        {/* Answer */}
        <p className="text-slate-800 font-medium leading-relaxed text-base">{answer}</p>

        {/* Winner + Rating row */}
        {(winner || rating) && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {winner && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-emerald-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Top Pick: {winner}
              </div>
            )}
            {rating && <StarRating rating={rating} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickAnswerBlock;
