export type ApodVideoSource =
  | { kind: "iframe"; src: string }
  | { kind: "html5"; src: string };

function isValidVideoId(id: string | null): id is string {
  return Boolean(id && /^[A-Za-z0-9_-]{6,}$/.test(id));
}

function extractYouTubeVideoId(videoUrl: string): string | null {
  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    if (host === "youtu.be" || host === "www.youtu.be") {
      const id = path.split("/").filter(Boolean)[0] ?? null;
      return isValidVideoId(id) ? id : null;
    }

    const isYoutubeHost =
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "www.youtube-nocookie.com";

    if (!isYoutubeHost) return null;

    const watchId = parsed.searchParams.get("v");
    if (isValidVideoId(watchId)) {
      return watchId;
    }

    const segments = path.split("/").filter(Boolean);
    if (
      segments.length >= 2 &&
      new Set(["embed", "shorts", "live"]).has(segments[0]) &&
      isValidVideoId(segments[1])
    ) {
      return segments[1];
    }

    return null;
  } catch {
    return null;
  }
}

function extractVimeoVideoId(videoUrl: string): string | null {
  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);
    const isVimeoHost = host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com";
    if (!isVimeoHost) return null;

    if (host === "player.vimeo.com" && segments[0] === "video" && /^\d+$/.test(segments[1] ?? "")) {
      return segments[1];
    }

    for (let i = segments.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(segments[i])) {
        return segments[i];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function isDirectVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(url);
}

export function deriveApodVideoThumbnail(videoUrl: string): string | undefined {
  const youtubeVideoId = extractYouTubeVideoId(videoUrl);
  if (youtubeVideoId) {
    return `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`;
  }
  return undefined;
}

export function getApodVideoSource(videoUrl: string): ApodVideoSource | null {
  if (isDirectVideoFileUrl(videoUrl)) {
    return { kind: "html5", src: videoUrl };
  }

  const youtubeVideoId = extractYouTubeVideoId(videoUrl);
  if (youtubeVideoId) {
    return {
      kind: "iframe",
      src: `https://www.youtube.com/embed/${youtubeVideoId}?rel=0`,
    };
  }

  const vimeoVideoId = extractVimeoVideoId(videoUrl);
  if (vimeoVideoId) {
    return {
      kind: "iframe",
      src: `https://player.vimeo.com/video/${vimeoVideoId}`,
    };
  }

  return null;
}
