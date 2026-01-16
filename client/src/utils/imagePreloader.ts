/**
 * Image preloader for MTG cards
 * Preloads card images in the background so they display instantly during gameplay
 */

// Track which images have been preloaded to avoid duplicates
const preloadedUrls = new Set<string>();

/**
 * Preload a single image URL
 */
export function preloadImage(url: string): Promise<void> {
  if (!url || preloadedUrls.has(url)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedUrls.add(url);
      resolve();
    };
    img.onerror = () => {
      // Don't add to set on error, allow retry later
      resolve();
    };
    img.src = url;
  });
}

/**
 * Preload multiple images with optional concurrency limit
 */
export async function preloadImages(
  urls: string[],
  options: { concurrency?: number; onProgress?: (loaded: number, total: number) => void } = {}
): Promise<void> {
  const { concurrency = 5, onProgress } = options;

  // Filter out already preloaded and empty URLs
  const toPreload = urls.filter((url) => url && !preloadedUrls.has(url));

  if (toPreload.length === 0) {
    onProgress?.(0, 0);
    return;
  }

  let loaded = 0;
  const total = toPreload.length;

  // Process in batches for controlled concurrency
  for (let i = 0; i < toPreload.length; i += concurrency) {
    const batch = toPreload.slice(i, i + concurrency);
    await Promise.all(batch.map((url) => preloadImage(url)));
    loaded += batch.length;
    onProgress?.(loaded, total);
  }
}

/**
 * Preload all images for a resolved deck
 */
export function preloadDeckImages(
  deck: Array<{ imageUri: string; backImageUri?: string }>,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const urls: string[] = [];

  for (const card of deck) {
    if (card.imageUri) {
      urls.push(card.imageUri);
    }
    // Also preload back faces for DFCs
    if (card.backImageUri) {
      urls.push(card.backImageUri);
    }
  }

  return preloadImages(urls, { concurrency: 6, onProgress });
}

/**
 * Preload a single card's images (front + back if DFC)
 * Use this when a card is revealed during gameplay
 */
export function preloadCardImages(card: {
  imageUri: string;
  backImageUri?: string;
}): void {
  preloadImage(card.imageUri);
  if (card.backImageUri) {
    preloadImage(card.backImageUri);
  }
}

/**
 * Get preload stats for debugging
 */
export function getPreloadStats(): { preloadedCount: number } {
  return { preloadedCount: preloadedUrls.size };
}

/**
 * Clear preload cache (useful for testing or memory management)
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear();
}
