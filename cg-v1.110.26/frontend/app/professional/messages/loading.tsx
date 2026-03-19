export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-40 bg-teal-100 rounded-lg mb-2" />
          <div className="h-4 w-52 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-teal-50 rounded-lg" />
      </div>

      {/* Search bar skeleton */}
      <div className="h-10 w-full max-w-sm bg-gray-100 rounded-lg mb-6" />

      {/* Conversation list skeleton */}
      <div className="bg-white rounded-xl border border-gray-100">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="p-4 border-b border-gray-50 flex items-center gap-4"
          >
            <div className="h-12 w-12 bg-teal-50 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-12 bg-gray-100 rounded" />
              </div>
              <div className="h-3 w-56 bg-gray-100 rounded mb-1" />
              <div className="h-3 w-40 bg-gray-50 rounded" />
            </div>
            {i <= 2 && (
              <div className="h-5 w-5 bg-teal-100 rounded-full flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
