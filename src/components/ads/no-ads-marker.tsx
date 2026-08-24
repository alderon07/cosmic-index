import { NO_ADS_MARKER_ATTRIBUTE } from "@/lib/adsense";

export function NoAdsMarker() {
  return (
    <span
      {...{ [NO_ADS_MARKER_ATTRIBUTE]: "" }}
      aria-hidden="true"
      className="hidden"
    />
  );
}
