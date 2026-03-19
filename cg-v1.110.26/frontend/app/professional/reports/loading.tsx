export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-36 bg-teal-100 rounded-lg mb-2" />
          <div className="h-4 w-60 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-teal-50 rounded-lg" />
      </div>

      {/* Report type cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col items-center text-center"
          >
            <div className="h-12 w-12 bg-teal-50 rounded-xl mb-3" />
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Recent reports list skeleton */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-8 w-20 bg-gray-100 rounded-lg" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 border-b border-gray-50 flex items-center gap-4"
          >
            <div className="h-10 w-10 bg-teal-50 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded" />
            </div>
            <div className="hidden sm:block h-6 w-20 bg-gray-100 rounded-full" />
            <div className="h-8 w-8 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
