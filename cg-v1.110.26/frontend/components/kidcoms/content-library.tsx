'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Film,
  BookOpen,
  Youtube,
  Play,
  Search,
  Sparkles,
  Clock,
  BookMarked,
} from 'lucide-react';
import {
  theaterContent,
  VideoContent,
  StorybookContent,
  isValidYouTubeUrl,
} from '@/lib/theater-content';

type ContentType = 'video' | 'pdf' | 'youtube';

interface SelectedContent {
  type: ContentType;
  url: string;
  title: string;
}

interface ContentLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: SelectedContent) => void;
}

export function ContentLibrary({ isOpen, onClose, onSelect }: ContentLibraryProps) {
  const [activeTab, setActiveTab] = useState<'videos' | 'storybooks' | 'youtube'>('videos');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleVideoSelect = (video: VideoContent) => {
    onSelect({
      type: 'video',
      url: video.url,
      title: video.title,
    });
  };

  const handleStorybookSelect = (book: StorybookContent) => {
    onSelect({
      type: 'pdf',
      url: book.url,
      title: book.title,
    });
  };

  const handleYoutubeSubmit = () => {
    if (!youtubeUrl.trim()) {
      setYoutubeError('Please enter a YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      setYoutubeError('Invalid YouTube URL. Please enter a valid YouTube video link.');
      return;
    }

    onSelect({
      type: 'youtube',
      url: youtubeUrl,
      title: 'YouTube Video',
    });
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  // Filter content based on search
  const filteredVideos = theaterContent.videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStorybooks = theaterContent.storybooks.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl border border-slate-700/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cg-sage to-cg-sage-light flex items-center justify-center shadow-lg shadow-cg-sage/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Watch Together</h2>
              <p className="text-sm text-slate-400">Choose content to enjoy in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/50 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 flex items-center justify-center space-x-2.5 py-4 transition-all duration-200 ${
              activeTab === 'videos'
                ? 'text-cg-sage border-b-2 border-cg-sage bg-cg-sage/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Film className="h-5 w-5" />
            <span className="font-medium">Movies</span>
          </button>
          <button
            onClick={() => setActiveTab('storybooks')}
            className={`flex-1 flex items-center justify-center space-x-2.5 py-4 transition-all duration-200 ${
              activeTab === 'storybooks'
                ? 'text-cg-sage border-b-2 border-cg-sage bg-cg-sage/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="font-medium">Storybooks</span>
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 flex items-center justify-center space-x-2.5 py-4 transition-all duration-200 ${
              activeTab === 'youtube'
                ? 'text-cg-sage border-b-2 border-cg-sage bg-cg-sage/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Youtube className="h-5 w-5" />
            <span className="font-medium">YouTube</span>
          </button>
        </div>

        {/* Search (for videos and storybooks) */}
        {activeTab !== 'youtube' && (
          <div className="p-4 bg-slate-900/30">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content..."
                className="w-full bg-slate-800/60 text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-cg-sage/50 border border-slate-700/50 placeholder:text-slate-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[55vh]">
          {/* Videos Tab - Netflix-style cards */}
          {activeTab === 'videos' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {filteredVideos.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Film className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No movies found</p>
                </div>
              ) : (
                filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => handleVideoSelect(video)}
                    className="group relative aspect-[2/3] bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-cg-sage transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-cg-sage/20"
                  >
                    {/* Poster Image or Placeholder */}
                    {video.thumbnail && !imageErrors.has(video.id) ? (
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover"
                        onError={() => handleImageError(video.id)}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-cg-sage/30 via-slate-800 to-slate-900 flex items-center justify-center">
                        <Film className="h-16 w-16 text-slate-600" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Play Button on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="p-4 bg-cg-sage rounded-full shadow-xl shadow-cg-sage/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="h-8 w-8 text-white fill-white" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    {video.duration && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md">
                        <Clock className="h-3 w-3 text-slate-300" />
                        <span className="text-xs text-slate-200 font-medium">{video.duration}</span>
                      </div>
                    )}

                    {/* Title & Description */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-semibold text-lg leading-tight mb-1 drop-shadow-lg">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-slate-300 text-xs line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {video.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Storybooks Tab - Book cover style */}
          {activeTab === 'storybooks' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {filteredStorybooks.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No storybooks found</p>
                </div>
              ) : (
                filteredStorybooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleStorybookSelect(book)}
                    className="group relative aspect-[2/3] bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-cg-amber transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-cg-amber/20"
                  >
                    {/* Book Cover or Placeholder */}
                    {book.cover && !imageErrors.has(book.id) ? (
                      <Image
                        src={book.cover}
                        alt={book.title}
                        fill
                        className="object-cover"
                        onError={() => handleImageError(book.id)}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-cg-amber/30 via-slate-800 to-slate-900 flex items-center justify-center">
                        <BookMarked className="h-16 w-16 text-slate-600" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Read Button on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="p-4 bg-cg-amber rounded-full shadow-xl shadow-cg-amber/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                    </div>

                    {/* Pages Badge */}
                    {book.pages && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md">
                        <BookOpen className="h-3 w-3 text-slate-300" />
                        <span className="text-xs text-slate-200 font-medium">{book.pages} pages</span>
                      </div>
                    )}

                    {/* Title & Author */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-semibold text-lg leading-tight mb-1 drop-shadow-lg">
                        {book.title}
                      </h3>
                      {book.author && (
                        <p className="text-slate-300 text-xs">by {book.author}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* YouTube Tab */}
          {activeTab === 'youtube' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
                  <Youtube className="h-8 w-8 text-white" />
                </div>
                <p className="text-slate-300 text-lg">
                  Paste a YouTube video URL to watch together
                </p>
              </div>

              <div className="flex space-x-3">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setYoutubeError('');
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-slate-800/60 text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-cg-sage/50 border border-slate-700/50 placeholder:text-slate-500 transition-all"
                />
                <button
                  onClick={handleYoutubeSubmit}
                  className="px-8 py-4 bg-cg-sage hover:bg-cg-sage-light text-white rounded-xl font-medium transition-all shadow-lg shadow-cg-sage/20 hover:shadow-cg-sage/30"
                >
                  Watch
                </button>
              </div>

              {youtubeError && (
                <p className="text-red-400 text-sm text-center">{youtubeError}</p>
              )}

              <div className="pt-6 border-t border-slate-800/50">
                <p className="text-slate-500 text-sm mb-3 text-center">
                  Supported formats:
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-cg-sage" />
                    <span className="text-slate-400 text-sm">youtube.com/watch?v=...</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-cg-sage" />
                    <span className="text-slate-400 text-sm">youtu.be/...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
