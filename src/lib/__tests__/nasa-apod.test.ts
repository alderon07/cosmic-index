import { deriveApodVideoThumbnail, getApodVideoSource } from "../apod-media";

describe("deriveApodVideoThumbnail", () => {
  it("derives thumbnail from youtube watch URL", () => {
    expect(
      deriveApodVideoThumbnail("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("derives thumbnail from youtube embed URL", () => {
    expect(
      deriveApodVideoThumbnail("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("derives thumbnail from youtu.be short URL", () => {
    expect(
      deriveApodVideoThumbnail("https://youtu.be/dQw4w9WgXcQ"),
    ).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("derives thumbnail from youtube-nocookie URL", () => {
    expect(
      deriveApodVideoThumbnail("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"),
    ).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("returns undefined for non-youtube URLs", () => {
    expect(deriveApodVideoThumbnail("https://vimeo.com/123456789")).toBeUndefined();
  });

  it("returns undefined for malformed URLs", () => {
    expect(deriveApodVideoThumbnail("not-a-url")).toBeUndefined();
  });
});

describe("getApodVideoSource", () => {
  it("returns iframe source for youtube watch URLs", () => {
    expect(getApodVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "iframe",
      src: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0",
    });
  });

  it("returns iframe source for vimeo URLs", () => {
    expect(getApodVideoSource("https://vimeo.com/123456789")).toEqual({
      kind: "iframe",
      src: "https://player.vimeo.com/video/123456789",
    });
  });

  it("returns html5 source for direct video files", () => {
    expect(getApodVideoSource("https://apod.nasa.gov/apod/image/2603/moon.mp4")).toEqual({
      kind: "html5",
      src: "https://apod.nasa.gov/apod/image/2603/moon.mp4",
    });
  });

  it("returns null for unsupported or non-video URLs", () => {
    expect(getApodVideoSource("https://example.com/article")).toBeNull();
    expect(getApodVideoSource("not-a-url")).toBeNull();
  });
});
