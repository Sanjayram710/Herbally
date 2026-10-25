import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchProtectedMedia } from "../services/api";

interface ProtectedMediaImageProps {
  mediaUrl: string;
  alt: string;
  style?: CSSProperties;
  isVideo?: boolean;
}

/** Fetches private media with the configured bearer token rather than placing it in a public URL. */
export function ProtectedMediaImage({ mediaUrl, alt, style, isVideo }: ProtectedMediaImageProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    fetchProtectedMedia(mediaUrl)
      .then((url) => {
        objectUrl = url;
        if (active) setPreviewUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => {
        if (active) setPreviewUrl(null);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaUrl]);

  if (!previewUrl) return <div style={{ ...style, display: "grid", placeItems: "center", color: "#94a3b8" }}>Private creative unavailable</div>;
  if (isVideo) {
    return <video src={previewUrl} controls playsInline muted style={style} />;
  }
  return <img src={previewUrl} alt={alt} style={style} />;
}
