/**
 * Image Placeholder Component
 *
 * Renders a styled placeholder for images that will be generated later.
 * Stores the AI generation prompt as a data attribute for reference.
 */

export function ImagePlaceholder({
  alt,
  prompt,
  aspectRatio = '16/9',
  className = '',
}: {
  alt: string;
  prompt: string;
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8F4F8] via-[#F4F8F7] to-[#FEF7ED] border-2 border-dashed border-gray-200 ${className}`}
      style={{ aspectRatio }}
      data-ai-prompt={prompt}
      role="img"
      aria-label={alt}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        <svg
          className="h-10 w-10 text-gray-300 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
        <p className="text-sm text-gray-400 max-w-xs">{alt}</p>
      </div>
    </div>
  );
}
