# KidComs Theater Content Library

This directory contains videos and PDF storybooks that can be watched together in real-time via the KidComs Theater feature.

## Directory Structure

```
kidsComms/
├── README.md              # This file
├── *.mp4                  # Video files
├── *.pdf                  # PDF storybooks
├── posters/               # Video thumbnail images (16:9)
│   ├── crunch-poster.jpg
│   ├── johnny-express-poster.jpg
│   └── ...
└── covers/                # Storybook cover images
    ├── luna-midnight-cover.jpg
    ├── my-family-cover.jpg
    └── ...
```

## Current Content

### Videos (6 total)
1. **Crunch.mp4** - Animated short about an alien who loves cereal
2. **Johnny Express.mp4** - Space delivery adventure
3. **The Bread.mp4** - Charming story about bread
4. **minions-clip.mp4** - Minions adventure clip
5. **Sonic The Hedgehog.mp4** - Sonic movie clip
6. **Super Marios Bros.mp4** - Mario Bros clip

### Storybooks (7 total)
1. **Luna_And_Midnight_.pdf** - Luna and Midnight story
2. **15-MyFamily-by-Starfall.pdf** - Family themed book
3. **2-Peg-by-Starfall.pdf** - Peg story
4. **8-SkyRide-by-Starfall.pdf** - Sky ride adventure
5. **ReachForTheStars_by_Starfall.pdf** - Inspirational story
6. **SB776_backpack-bears-plant-book.pdf** - Plant education
7. **Soap Boat.pdf** - Soap boat story

## How to Add New Content

### 1. Add Video or PDF File

Place your file in this directory:
```bash
# For videos
cp your-video.mp4 /path/to/frontend/public/kidsComms/

# For PDFs
cp your-storybook.pdf /path/to/frontend/public/kidsComms/
```

**Video Requirements:**
- Format: MP4 (H.264 codec recommended)
- Size: Under 100MB for better streaming
- Resolution: 720p or 1080p recommended
- Family-friendly content only

**PDF Requirements:**
- Format: PDF
- Size: Under 10MB recommended
- Pages: Optimized for reading on screen
- Family-friendly content only

### 2. Add Thumbnail/Cover Image

**For Videos** - Add a poster image:
```bash
# Recommended: 1920x1080 (16:9) JPG image
cp your-video-poster.jpg /path/to/frontend/public/kidsComms/posters/
```

**For Storybooks** - Add a cover image:
```bash
# Recommended: 600x800 or 800x1200 JPG image
cp your-book-cover.jpg /path/to/frontend/public/kidsComms/covers/
```

### 3. Update Content Configuration

Edit `/frontend/lib/theater-content.ts`:

**For Videos:**
```typescript
{
  id: 'your-video-id',
  title: 'Your Video Title',
  url: '/kidsComms/your-video.mp4',
  thumbnail: '/kidsComms/posters/your-video-poster.jpg',
  duration: '5:30',  // Actual duration
  description: 'Brief description of the video',
}
```

**For Storybooks:**
```typescript
{
  id: 'your-book-id',
  title: 'Your Book Title',
  url: '/kidsComms/your-storybook.pdf',
  cover: '/kidsComms/covers/your-book-cover.jpg',
  pages: 24,  // Actual page count
  author: 'Author Name',
}
```

### 4. Test the Content

1. Restart your development server
2. Go to KidComs → Select a child → Theater Mode
3. Verify the content appears in the library
4. Test playback and synchronization

## Where to Get Copyright-Free Content

### Videos
- **YouTube Kids** - Age-appropriate content (can be streamed via YouTube integration)
- **Vimeo** - Creative Commons videos
- **Pixabay Videos** - Free stock videos
- **Pexels Videos** - Free stock videos
- **Archive.org** - Public domain films and animations

### Educational Shorts (Recommended)
- **Scratch Studio** - Student-created animations
- **TED-Ed** - Educational animations
- **Khan Academy Kids** - Educational videos

### Storybooks (PDFs)
- **Starfall.com** - Free educational books (already using these!)
- **Storyweaver** - Open-source children's books
- **International Children's Digital Library** - Free public domain books
- **ManyBooks** - Free children's ebooks
- **Project Gutenberg** - Classic children's literature
- **Bookdash** - Open-licensed African storybooks

### Creating Custom Content
- **Canva** - Create custom storybooks
- **Book Creator** - Design interactive books
- **Pixton** - Comic book creator for kids

## Copyright & Licensing

⚠️ **IMPORTANT**: Only add content that you have the right to use:

1. **Public Domain** - Content with expired copyright
2. **Creative Commons** - Content with CC licenses (check terms)
3. **Licensed Content** - Content you've purchased rights to use
4. **Original Content** - Content you created yourself

**Never add:**
- Pirated movies or shows
- Copyrighted material without permission
- Content not suitable for children

## Content Guidelines

All content must be:
- ✅ Age-appropriate (G or PG rated)
- ✅ Educational or entertaining
- ✅ Safe for co-parent viewing
- ✅ Free from violence, adult themes, or inappropriate language
- ✅ Legally licensed or copyright-free

## Technical Limits

- **Max file size (videos)**: 100MB (GitHub has 50MB warning, 100MB hard limit)
- **Max file size (PDFs)**: 10MB recommended
- **Supported video formats**: MP4 (H.264)
- **Supported PDF version**: PDF 1.4 or higher

## Streaming via YouTube

Instead of storing large video files, you can also stream YouTube videos:

1. In Theater Mode, click the "YouTube" tab
2. Paste any kid-friendly YouTube URL
3. Both parents and child watch in sync

**Recommended YouTube Channels:**
- Blippi
- Ryan's World
- PBS Kids
- National Geographic Kids
- Sesame Street

## Troubleshooting

**Video won't play:**
- Check file format (must be MP4)
- Verify file is under 100MB
- Ensure URL path is correct in `theater-content.ts`

**PDF won't load:**
- Check file size (keep under 10MB)
- Verify it's a standard PDF (not encrypted)
- Ensure URL path is correct

**Content doesn't appear in library:**
- Check that you updated `theater-content.ts`
- Restart the development server
- Clear browser cache

## Future Enhancements

Planned features:
- [ ] Upload interface for parents to add their own content
- [ ] Content moderation queue
- [ ] Age-based content filtering
- [ ] Favorites and playlists
- [ ] Watch history and recommendations
- [ ] Screen recording of watch-together sessions (with consent)

---

**Need help?** Check the main docs at `/docs/features/KIDCOMS.md`
