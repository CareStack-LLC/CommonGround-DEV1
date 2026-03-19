export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-teal-100 rounded-lg mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-teal-50 rounded-lg" />
      </div>

      {/* Firm details card skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-5 mb-6">
          <div className="h-16 w-16 bg-teal-50 rounded-xl flex-shrink-0" />
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-5 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Team members section skeleton */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-9 w-28 bg-teal-50 rounded-lg" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 border-b border-gray-50 flex items-center gap-4"
          >
            <div className="h-11 w-11 bg-teal-50 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-28 bg-gray-100 rounded" />
            </div>
            <div className="hidden sm:block h-6 w-20 bg-teal-50 rounded-full" />
            <div className="h-8 w-8 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
