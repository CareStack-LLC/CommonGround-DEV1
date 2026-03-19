export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-40 bg-teal-100 rounded-lg mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-lg" />
          <div className="h-10 w-32 bg-gray-200 rounded-lg" />
          <div className="h-10 w-10 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* View toggle skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-9 w-20 bg-teal-50 rounded-lg" />
        <div className="h-9 w-20 bg-gray-100 rounded-lg" />
        <div className="h-9 w-20 bg-gray-100 rounded-lg" />
      </div>

      {/* Calendar grid skeleton */}
      <div className="bg-white rounded-xl border border-gray-100">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {["S", "M", "T", "W", "T", "F", "S"].map((_, i) => (
            <div key={i} className="p-3 text-center">
              <div className="h-4 w-8 bg-gray-200 rounded mx-auto" />
            </div>
          ))}
        </div>
        {/* Week rows */}
        {[1, 2, 3, 4, 5].map((week) => (
          <div
            key={week}
            className="grid grid-cols-7 border-b border-gray-50"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className="p-2 min-h-[80px] border-r border-gray-50 last:border-r-0"
              >
                <div className="h-5 w-5 bg-gray-100 rounded mb-1" />
                {week === 2 && day === 3 && (
                  <div className="h-4 w-full bg-teal-50 rounded mt-1" />
                )}
                {week === 3 && day === 5 && (
                  <div className="h-4 w-full bg-teal-50 rounded mt-1" />
                )}
                {week === 4 && day === 1 && (
                  <div className="h-4 w-full bg-teal-50 rounded mt-1" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
