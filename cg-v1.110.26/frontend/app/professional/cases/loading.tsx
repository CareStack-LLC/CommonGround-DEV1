export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-36 bg-teal-100 rounded-lg mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-teal-50 rounded-lg" />
      </div>

      {/* Stat cards skeleton - 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-9 w-16 bg-teal-100 rounded mb-1" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-48 bg-gray-100 rounded-lg" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg" />
      </div>

      {/* Case list skeleton */}
      <div className="bg-white rounded-xl border border-gray-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-5 border-b border-gray-50 flex items-center gap-4"
          >
            <div className="h-11 w-11 bg-teal-50 rounded-lg" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-44 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-60 bg-gray-100 rounded" />
            </div>
            <div className="hidden sm:block h-6 w-20 bg-teal-50 rounded-full" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
