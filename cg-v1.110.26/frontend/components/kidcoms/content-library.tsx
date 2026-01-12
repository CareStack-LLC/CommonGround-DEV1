'use client';

import { useState } from 'react';
import {
  X,
  Film,
  BookOpen,
  Youtube,
  Play,
  Search,
  Sparkles,
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
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl border border-slate-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Choose Content</h2>
              <p className="text-sm text-slate-400">Watch together in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700/50">
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 transition-all duration-200 ${
              activeTab === 'videos'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Film className="h-5 w-5" />
            <span className="font-medium">Videos</span>
          </button>
          <button
            onClick={() => setActiveTab('storybooks')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 transition-all duration-200 ${
              activeTab === 'storybooks'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="font-medium">Storybooks</span>
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 transition-all duration-200 ${
              activeTab === 'youtube'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Youtube className="h-5 w-5" />
            <span className="font-medium">YouTube</span>
          </button>
        </div>

        {/* Search (for videos and storybooks) */}
        {activeTab !== 'youtube' && (
          <div className="p-4 border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-slate-800/50 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-slate-700/50 placeholder:text-slate-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredVideos.length === 0 ? (
                <p className="col-span-full text-center text-slate-400 py-8">
                  No videos found
                </p>
              ) : (
                filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => handleVideoSelect(video)}
                    className="group relative aspect-video bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all duration-200 hover:scale-[1.02]"
                  >
                    {/* Placeholder thumbnail */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                      <Film className="h-10 w-10 text-slate-600" />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-lg shadow-emerald-500/30 transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <p className="text-white text-sm font-medium truncate">
                        {video.title}
                      </p>
                      {video.duration && (
                        <p className="text-slate-400 text-xs">{video.duration}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Storybooks Tab */}
          {activeTab === 'storybooks' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredStorybooks.length === 0 ? (
                <p className="col-span-full text-center text-slate-400 py-8">
                  No storybooks found
                </p>
              ) : (
                filteredStorybooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleStorybookSelect(book)}
                    className="group relative aspect-[3/4] bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all duration-200 hover:scale-[1.02]"
                  >
                    {/* Placeholder cover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-slate-800 to-slate-900 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-slate-600" />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-lg shadow-emerald-500/30 transform scale-90 group-hover:scale-100 transition-transform">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <p className="text-white text-sm font-medium truncate">
                        {book.title}
                      </p>
                      {book.author && (
                        <p className="text-slate-400 text-xs">{book.author}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* YouTube Tab */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              <p className="text-slate-300">
                Paste a YouTube video URL to watch together
              </p>

              <div className="flex space-x-3">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setYoutubeError('');
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-slate-800/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-slate-700/50 placeholder:text-slate-500 transition-all"
                />
                <button
                  onClick={handleYoutubeSubmit}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  Watch
                </button>
              </div>

              {youtubeError && (
                <p className="text-red-400 text-sm">{youtubeError}</p>
              )}

              <div className="pt-4 border-t border-slate-700/50">
                <p className="text-slate-400 text-sm">
                  Supported formats:
                </p>
                <ul className="text-slate-500 text-sm mt-2 space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    youtube.com/watch?v=VIDEO_ID
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    youtu.be/VIDEO_ID
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    youtube.com/embed/VIDEO_ID
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
