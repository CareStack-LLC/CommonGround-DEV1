export default function Loading() {
  return (
    <div className="p-6 max-w-3xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-36 bg-teal-100 rounded-lg mb-2" />
          <div className="h-4 w-52 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-teal-50 rounded-lg" />
      </div>

      {/* Avatar and name section */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="h-20 w-20 bg-teal-50 rounded-full flex-shrink-0" />
          <div>
            <div className="h-6 w-44 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
          </div>
        </div>

        {/* Form fields skeleton */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-10 w-full bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-12 bg-gray-200 rounded mb-2" />
            <div className="h-24 w-full bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Credentials section skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-teal-50 rounded" />
                <div>
                  <div className="h-4 w-36 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
