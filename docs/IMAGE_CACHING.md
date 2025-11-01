# Image Caching & Progressive Loading

LocalLoop uses **expo-image** with progressive loading for optimal image performance and user experience.

## Features

### ✅ Automatic Caching
- **Memory cache**: Fast access for recently viewed images
- **Disk cache**: Persistent storage for offline access
- Images are cached automatically - no manual cache management needed

### ✅ Progressive Loading
- Shows low-quality thumbnail instantly
- Smoothly transitions to full-quality image
- Optional blurhash placeholder for elegant loading states

### ✅ Smart Preloading
- **First 10 statuses**: Automatically preloaded when feed loads
- Instant display when scrolling through status stories
- Background preloading doesn't block UI

### ✅ Better Performance
- Reduces data usage with thumbnail preloading
- Faster perceived loading times
- Optimized memory management
- Smooth scrolling with instant image display

## Usage

### Basic Usage

```jsx
import ProgressiveImage from '../components/ProgressiveImage';

function MyComponent() {
  return (
    <ProgressiveImage
      source="https://example.com/image.jpg"
      style={{ width: 300, height: 200 }}
      contentFit="cover"
    />
  );
}
```

### With Thumbnail

```jsx
import ProgressiveImage from '../components/ProgressiveImage';
import { getThumbnailUrl } from '../utils/imageUtils';

function MyComponent({ imageUrl }) {
  return (
    <ProgressiveImage
      source={imageUrl}
      thumbnail={getThumbnailUrl(imageUrl, 200, 60)}
      style={{ width: 300, height: 200 }}
      contentFit="cover"
      transition={300}
    />
  );
}
```

### With Blurhash Placeholder

```jsx
import ProgressiveImage from '../components/ProgressiveImage';

function MyComponent({ imageUrl, blurhash }) {
  return (
    <ProgressiveImage
      source={imageUrl}
      blurhash={blurhash}
      style={{ width: 300, height: 200 }}
      contentFit="cover"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | string \| object | required | Image URL or source object |
| `thumbnail` | string \| object | null | Optional thumbnail URL for progressive loading |
| `blurhash` | string | null | Optional blurhash placeholder |
| `style` | object | {} | Style object |
| `contentFit` | string | 'cover' | 'cover', 'contain', 'fill', 'none', 'scale-down' |
| `transition` | number | 300 | Transition duration in milliseconds |
| `cachePolicy` | string | 'memory-disk' | 'disk', 'memory', 'memory-disk', 'none' |
| `priority` | string | 'normal' | 'low', 'normal', 'high' - loading priority |

## Utility Functions

### getThumbnailUrl(imageUrl, width, quality)

Generates a thumbnail URL from the original image URL.

```jsx
import { getThumbnailUrl } from '../utils/imageUtils';

const thumbnail = getThumbnailUrl(imageUrl, 200, 60);
// width: 200px, quality: 60%
```

### getBlurhash(imageUrl)

Returns a blurhash placeholder (currently returns a default purple hash).

**Note**: For production, generate blurhash server-side when images are uploaded and store in Firestore.

```jsx
import { getBlurhash } from '../utils/imageUtils';

const blurhash = getBlurhash(imageUrl);
```

### preloadImages(imageUrls)

Preload images before navigating to a screen.

```jsx
import { preloadImages } from '../utils/imageUtils';

// Before navigating to photo gallery
await preloadImages([
  'https://example.com/photo1.jpg',
  'https://example.com/photo2.jpg',
]);
```

**Automatic Preloading:**

The `StatusesContext` automatically preloads the first 10 status images when statuses load:

```jsx
// In StatusesContext.js
onChange: (items) => {
  setStatuses(items);

  // Preload first 10 status images for instant display
  const imageUrls = items
    .slice(0, 10)
    .map(status => status?.imageUrl)
    .filter(Boolean);

  if (imageUrls.length > 0) {
    preloadImages(imageUrls);
  }
}
```

This means when users scroll through status stories, the first 10 appear instantly!

### clearImageCache()

Clear all cached images (useful for troubleshooting or freeing space).

```jsx
import { clearImageCache } from '../utils/imageUtils';

const cleared = await clearImageCache();
if (cleared) {
  console.log('Cache cleared successfully');
}
```

## Best Practices

### 1. Use Appropriate Thumbnail Sizes

Match thumbnail size to display size:

```jsx
// Status cards (140x200)
getThumbnailUrl(imageUrl, 140, 50)

// Feed images (400px width)
getThumbnailUrl(imageUrl, 400, 60)

// Profile photos (100x100)
getThumbnailUrl(imageUrl, 100, 70)
```

### 2. Set Priority for Critical Images

Use `priority="high"` for above-the-fold images:

```jsx
<ProgressiveImage
  source={heroImage}
  priority="high"
  // ... other props
/>
```

### 3. Store Blurhash in Firestore

When uploading images, generate and store blurhash:

```javascript
// Server-side or Firebase Function
import { encode } from 'blurhash';

const blurhash = encode(imageData, 4, 3);

await firestore.collection('statuses').doc(statusId).update({
  imageUrl: downloadUrl,
  blurhash: blurhash,
});
```

### 4. Preload Important Images

Preload images before navigation for smooth UX:

```jsx
// Before opening photo viewer
useEffect(() => {
  if (status?.imageUrl) {
    preloadImages([status.imageUrl]);
  }
}, [status?.imageUrl]);
```

**Already Implemented:**
- ✅ First 10 status images are automatically preloaded in `StatusesContext`
- ✅ No additional code needed for status story preloading
- ✅ Works on `CountryScreen`, `TopStatusesScreen`, and all screens using statuses

## Implementation Status

### ✅ Currently Using ProgressiveImage

**Components:**
- `StatusStoryCard.js` - Status story cards
- `StatusCard.js` - Full status cards

**Screens:**
- `PublicProfileScreen.js` - Profile photos, album images (grid & masonry), photo preview modal
- `DiscoverScreen.js` - User profile avatars
- `FollowersScreen.js` - User profile avatars
- `FollowingScreen.js` - User profile avatars

**Contexts:**
- `StatusesContext.js` - **Automatic preloading of first 10 status images** 🚀

### 🔄 Recommended Updates

- `PostItem.js` - Post images
- Direct message attachments
- Any other components displaying remote images

## Performance Tips

1. **Lazy load off-screen images**: Use FlatList's built-in virtualization
2. **Limit concurrent downloads**: expo-image handles this automatically
3. **Monitor cache size**: Clear cache periodically in settings
4. **Use appropriate quality settings**: Balance quality vs. file size

## Troubleshooting

### Images not loading?

1. Check network connection
2. Verify image URLs are accessible
3. Check cache policy setting
4. Try clearing image cache

### Images loading slowly?

1. Generate proper thumbnails (Firebase Storage or CDN)
2. Implement blurhash placeholders
3. Use `priority="high"` for critical images
4. Ensure good network connection

### Out of memory errors?

1. Reduce image dimensions
2. Lower quality settings
3. Clear image cache
4. Check for memory leaks

## Future Enhancements

- [ ] Implement Firebase image resizing extension
- [ ] Add CDN support (Cloudinary, Imgix)
- [ ] Server-side blurhash generation
- [ ] Automatic thumbnail generation on upload
- [ ] Image optimization pipeline
- [ ] Analytics for cache hit rates
