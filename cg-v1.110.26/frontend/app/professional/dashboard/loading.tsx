export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-56 bg-teal-100 rounded-lg mb-2" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-teal-50 rounded-lg" />
      </div>

      {/* Stat cards skeleton - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-8 w-8 bg-teal-50 rounded-lg" />
            </div>
            <div className="h-9 w-20 bg-teal-100 rounded mb-1" />
            <div className="h-3 w-28 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Activity list skeleton */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <div className="h-5 w-32 bg-gray-200 rounded" />
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-4 border-b border-gray-50 flex items-center gap-4"
          >
            <div className="h-10 w-10 bg-teal-50 rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-52 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
