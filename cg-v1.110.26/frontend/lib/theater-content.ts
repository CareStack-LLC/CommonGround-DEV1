/**
 * Theater Mode Content Library
 * Static configuration for available videos and storybooks
 */

export interface VideoContent {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  duration?: string;
  description?: string;
}

export interface StorybookContent {
  id: string;
  title: string;
  url: string;
  cover?: string;
  pages?: number;
  author?: string;
}

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
    },
    {
      id: 'johnny-express',
      title: 'Johnny Express',
      url: '/kidsComms/Johnny Express.mp4',
      thumbnail: '/kidsComms/posters/johnny-express-poster.jpg',
      duration: '5:15',
      description: 'Funny space delivery adventure',
    },
    {
      id: 'the-bread',
      title: 'The Bread',
      url: '/kidsComms/The Bread.mp4',
      thumbnail: '/kidsComms/posters/the-bread-poster.jpg',
      duration: '2:45',
      description: 'Charming animated story about bread',
    },
    {
      id: 'minions',
      title: 'Minions Clip',
      url: '/kidsComms/minions-clip.mp4',
      thumbnail: '/kidsComms/posters/minions-poster.jpg',
      duration: '3:24',
      description: 'Fun minions adventure clip',
    },
    {
      id: 'sonic',
      title: 'Sonic The Hedgehog',
      url: '/kidsComms/Sonic The Hedgehog.mp4',
      thumbnail: '/kidsComms/posters/sonic-poster.jpg',
      duration: '4:15',
      description: 'Sonic movie clip',
    },
    {
      id: 'mario',
      title: 'Super Mario Bros',
      url: '/kidsComms/Super Marios Bros.mp4',
      thumbnail: '/kidsComms/posters/mario-poster.jpg',
      duration: '5:02',
      description: 'Super Mario Bros movie clip',
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
    },
    {
      id: 'my-family',
      title: 'My Family',
      url: '/kidsComms/15-MyFamily-by-Starfall.pdf',
      cover: '/kidsComms/covers/my-family-cover.jpg',
      pages: 12,
      author: 'Starfall',
    },
    {
      id: 'peg',
      title: 'Peg',
      url: '/kidsComms/2-Peg-by-Starfall.pdf',
      cover: '/kidsComms/covers/peg-cover.jpg',
      pages: 8,
      author: 'Starfall',
    },
    {
      id: 'sky-ride',
      title: 'Sky Ride',
      url: '/kidsComms/8-SkyRide-by-Starfall.pdf',
      cover: '/kidsComms/covers/sky-ride-cover.jpg',
      pages: 10,
      author: 'Starfall',
    },
    {
      id: 'reach-stars',
      title: 'Reach For The Stars',
      url: '/kidsComms/ReachForTheStars_by_Starfall.pdf',
      cover: '/kidsComms/covers/reach-stars-cover.jpg',
      pages: 14,
      author: 'Starfall',
    },
    {
      id: 'backpack-bears',
      title: 'Backpack Bears Plant Book',
      url: '/kidsComms/SB776_backpack-bears-plant-book.pdf',
      cover: '/kidsComms/covers/backpack-bears-cover.jpg',
      pages: 16,
      author: 'Starfall',
    },
    {
      id: 'soap-boat',
      title: 'Soap Boat',
      url: '/kidsComms/Soap Boat.pdf',
      cover: '/kidsComms/covers/soap-boat-cover.jpg',
      pages: 8,
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
