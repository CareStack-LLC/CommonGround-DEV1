'use client';

import { useState } from 'react';
import {
  X,
  Film,
  BookOpen,
  Youtube,
  Play,
  Search,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Choose Content</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-colors ${
              activeTab === 'videos'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="h-5 w-5" />
            <span>Videos</span>
          </button>
          <button
            onClick={() => setActiveTab('storybooks')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-colors ${
              activeTab === 'storybooks'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Storybooks</span>
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-colors ${
              activeTab === 'youtube'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Youtube className="h-5 w-5" />
            <span>YouTube</span>
          </button>
        </div>

        {/* Search (for videos and storybooks) */}
        {activeTab !== 'youtube' && (
          <div className="p-4 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <p className="col-span-full text-center text-gray-400 py-8">
                  No videos found
                </p>
              ) : (
                filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => handleVideoSelect(video)}
                    className="group relative aspect-video bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
                  >
                    {/* Placeholder thumbnail */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-gray-900 flex items-center justify-center">
                      <Film className="h-10 w-10 text-gray-600" />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-purple-600 rounded-full">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-sm font-medium truncate">
                        {video.title}
                      </p>
                      {video.duration && (
                        <p className="text-gray-400 text-xs">{video.duration}</p>
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
                <p className="col-span-full text-center text-gray-400 py-8">
                  No storybooks found
                </p>
              ) : (
                filteredStorybooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleStorybookSelect(book)}
                    className="group relative aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
                  >
                    {/* Placeholder cover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/50 to-gray-900 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-gray-600" />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-purple-600 rounded-full">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-sm font-medium truncate">
                        {book.title}
                      </p>
                      {book.author && (
                        <p className="text-gray-400 text-xs">{book.author}</p>
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
              <p className="text-gray-300">
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
                  className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleYoutubeSubmit}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Watch
                </button>
              </div>

              {youtubeError && (
                <p className="text-red-400 text-sm">{youtubeError}</p>
              )}

              <div className="pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm">
                  Supported formats:
                </p>
                <ul className="text-gray-500 text-sm mt-2 space-y-1">
                  <li>youtube.com/watch?v=VIDEO_ID</li>
                  <li>youtu.be/VIDEO_ID</li>
                  <li>youtube.com/embed/VIDEO_ID</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
