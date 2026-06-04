/**
 * LOOKING GLASS — URL Metadata Fetcher
 * Fetch Open Graph + Twitter Card metadata from a URL.
 */
export async function fetchMetadata(url) {
  const result = {
    title: '',
    description: '',
    image_url: null,
    favicon_url: null,
    domain: new URL(url).hostname,
    canonical_url: url,
    fetch_status: 'pending',
  };

  // Try allorigins.win proxy
  try {
    const resp = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
    const data = await resp.json();
    if (data.contents) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      result.title = doc.querySelector('meta[property="og:title"]')?.content || doc.querySelector('title')?.textContent || '';
      result.description = doc.querySelector('meta[property="og:description"]')?.content || doc.querySelector('meta[name="description"]')?.content || '';
      result.image_url = doc.querySelector('meta[property="og:image"]')?.content || null;
      result.favicon_url = doc.querySelector('link[rel="icon"]')?.href || null;
      const canonical = doc.querySelector('link[rel="canonical"]')?.href;
      if (canonical) result.canonical_url = canonical;
      result.fetch_status = result.title ? 'ok' : 'partial';
    }
  } catch {
    // Fallback: microlink
    try {
      const resp = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
      const data = await resp.json();
      if (data.data) {
        result.title = data.data.title || '';
        result.description = data.data.description || '';
        result.image_url = data.data.image?.url || null;
        result.fetch_status = result.title ? 'ok' : 'partial';
      }
    } catch {
      result.fetch_status = 'failed';
    }
  }

  return result;
}
