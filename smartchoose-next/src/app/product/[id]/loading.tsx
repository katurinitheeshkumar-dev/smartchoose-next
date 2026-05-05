export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto w-full">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 bg-slate-200 rounded w-48 mb-8 animate-pulse" />
        
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Skeleton */}
          <div className="aspect-square bg-slate-200 rounded-3xl animate-pulse" />
          
          {/* Content Skeleton */}
          <div className="space-y-6">
            <div className="h-10 bg-slate-200 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
            </div>
            <div className="h-16 bg-slate-200 rounded-2xl w-full animate-pulse" />
            <div className="h-16 bg-slate-200 rounded-2xl w-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
