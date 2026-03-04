/**
 * Theater Mode Content Library
 * Static configuration for available videos and storybooks
 */

export type VideoCategory = 'comedy' | 'adventure' | 'educational' | 'animation' | 'action';
export type BookCategory = 'fiction' | 'educational' | 'fantasy' | 'adventure';

export interface VideoContent {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  duration?: string;
  description?: string;
  category: VideoCategory;
  ageRange?: string;
}

export interface StorybookContent {
  id: string;
  title: string;
  url: string;
  cover?: string;
  pages?: number;
  author?: string;
  category: BookCategory;
  ageRange?: string;
}

export interface CategoryMetadata {
  name: string;
  color: string;
  emoji: string;
  description: string;
}

export const videoCategories: Record<VideoCategory, CategoryMetadata> = {
  comedy: {
    name: 'Comedy',
    color: 'red-500',
    emoji: '😂',
    description: 'Funny and entertaining videos'
  },
  adventure: {
    name: 'Adventure',
    color: 'blue-500',
    emoji: '🚀',
    description: 'Exciting journeys and quests'
  },
  educational: {
    name: 'Educational',
    color: 'green-500',
    emoji: '🎓',
    description: 'Learn something new'
  },
  animation: {
    name: 'Animation',
    color: 'cyan-500',
    emoji: '✨',
    description: 'Beautiful animated stories'
  },
  action: {
    name: 'Action',
    color: 'orange-500',
    emoji: '⚡',
    description: 'Fast-paced and exciting'
  }
};

export const bookCategories: Record<BookCategory, CategoryMetadata> = {
  fiction: {
    name: 'Stories',
    color: 'cyan-500',
    emoji: '📚',
    description: 'Imaginative tales and stories'
  },
  educational: {
    name: 'Learn',
    color: 'blue-500',
    emoji: '🔬',
    description: 'Educational and informative'
  },
  fantasy: {
    name: 'Fantasy',
    color: 'pink-500',
    emoji: '🦄',
    description: 'Magical worlds and creatures'
  },
  adventure: {
    name: 'Adventure',
    color: 'green-500',
    emoji: '🗺️',
    description: 'Exciting adventures and exploration'
  }
};

export interface TheaterContentLibrary {
  videos: VideoContent[];
  storybooks: StorybookContent[];
}

export const theaterContent: TheaterContentLibrary = {
  videos: [
    {
      id: 'crunch',
      title: 'Crunch',
      url: '/kidsComms/Crunch.mp4',
      thumbnail: '/kidsComms/posters/crunch-poster.jpg',
      duration: '4:30',
      description: 'Animated short film about an alien who loves cereal',
      category: 'comedy',
      ageRange: '6-12'
    },
    {
      id: 'johnny-express',
      title: 'Johnny Express',
      url: '/kidsComms/Johnny Express.mp4',
      thumbnail: '/kidsComms/posters/johnny-express-poster.jpg',
      duration: '5:15',
      description: 'Funny space delivery adventure',
      category: 'adventure',
      ageRange: '8-12'
    },
    {
      id: 'the-bread',
      title: 'The Bread',
      url: '/kidsComms/The Bread.mp4',
      thumbnail: '/kidsComms/posters/the-bread-poster.jpg',
      duration: '2:45',
      description: 'Charming animated story about bread',
      category: 'animation',
      ageRange: '5-10'
    },
    {
      id: 'minions',
      title: 'Minions Clip',
      url: '/kidsComms/minions-clip.mp4',
      thumbnail: '/kidsComms/posters/minions-poster.jpg',
      duration: '3:24',
      description: 'Fun minions adventure clip',
      category: 'comedy',
      ageRange: '6-12'
    },
    {
      id: 'sonic',
      title: 'Sonic The Hedgehog',
      url: '/kidsComms/Sonic The Hedgehog.mp4',
      thumbnail: '/kidsComms/posters/sonic-poster.jpg',
      duration: '4:15',
      description: 'Sonic movie clip',
      category: 'action',
      ageRange: '8-14'
    },
    {
      id: 'mario',
      title: 'Super Mario Bros',
      url: '/kidsComms/Super Marios Bros.mp4',
      thumbnail: '/kidsComms/posters/mario-poster.jpg',
      duration: '5:02',
      description: 'Super Mario Bros movie clip',
      category: 'action',
      ageRange: '8-14'
    },
  ],
  storybooks: [
    {
      id: 'luna-midnight',
      title: 'Luna and Midnight',
      url: '/kidsComms/Luna_And_Midnight_.pdf',
      cover: '/kidsComms/covers/luna-midnight-cover.jpg',
      pages: 24,
      author: 'Children\'s Book',
      category: 'fantasy',
      ageRange: '6-10'
    },
    {
      id: 'my-family',
      title: 'My Family',
      url: '/kidsComms/15-MyFamily-by-Starfall.pdf',
      cover: '/kidsComms/covers/my-family-cover.jpg',
      pages: 12,
      author: 'Starfall',
      category: 'educational',
      ageRange: '5-8'
    },
    {
      id: 'peg',
      title: 'Peg',
      url: '/kidsComms/2-Peg-by-Starfall.pdf',
      cover: '/kidsComms/covers/peg-cover.jpg',
      pages: 8,
      author: 'Starfall',
      category: 'fiction',
      ageRange: '5-7'
    },
    {
      id: 'sky-ride',
      title: 'Sky Ride',
      url: '/kidsComms/8-SkyRide-by-Starfall.pdf',
      cover: '/kidsComms/covers/sky-ride-cover.jpg',
      pages: 10,
      author: 'Starfall',
      category: 'adventure',
      ageRange: '6-9'
    },
    {
      id: 'reach-stars',
      title: 'Reach For The Stars',
      url: '/kidsComms/ReachForTheStars_by_Starfall.pdf',
      cover: '/kidsComms/covers/reach-stars-cover.jpg',
      pages: 14,
      author: 'Starfall',
      category: 'educational',
      ageRange: '7-10'
    },
    {
      id: 'backpack-bears',
      title: 'Backpack Bears Plant Book',
      url: '/kidsComms/SB776_backpack-bears-plant-book.pdf',
      cover: '/kidsComms/covers/backpack-bears-cover.jpg',
      pages: 16,
      author: 'Starfall',
      category: 'educational',
      ageRange: '6-9'
    },
    {
      id: 'soap-boat',
      title: 'Soap Boat',
      url: '/kidsComms/Soap Boat.pdf',
      cover: '/kidsComms/covers/soap-boat-cover.jpg',
      pages: 8,
      category: 'fiction',
      ageRange: '5-8'
    },
  ],
};

// Theater sync message types
export interface TheaterSyncMessage {
  type: 'theater_control';
  data: {
    action: 'start' | 'stop' | 'play' | 'pause' | 'seek' | 'page' | 'sync_request';
    contentType: 'video' | 'pdf' | 'youtube';
    contentUrl: string;
    contentTitle?: string;
    currentTime?: number;      // For video/youtube (seconds)
    currentPage?: number;      // For PDF
    totalPages?: number;       // For PDF
    isPlaying?: boolean;
    duration?: number;         // Total duration in seconds
    senderId: string;          // Parent's user ID
    senderName?: string;
  };
}

// Helper to create sync messages
export function createTheaterMessage(
  action: TheaterSyncMessage['data']['action'],
  contentType: TheaterSyncMessage['data']['contentType'],
  contentUrl: string,
  senderId: string,
  options?: Partial<TheaterSyncMessage['data']>
): TheaterSyncMessage {
  return {
    type: 'theater_control',
    data: {
      action,
      contentType,
      contentUrl,
      senderId,
      ...options,
    },
  };
}

// Extract YouTube video ID from URL
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/v\/([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Validate YouTube URL
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}
