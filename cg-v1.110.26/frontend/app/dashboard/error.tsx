'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-[#1E3A4A] mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">We hit an unexpected issue. This has been reported to our team.</p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-[#3DAA8A] text-white rounded-xl hover:bg-[#2D8A6A] transition-colors">Try Again</button>
          <a href="/dashboard" className="px-6 py-3 bg-gray-100 text-[#1E3A4A] rounded-xl hover:bg-gray-200 transition-colors">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
