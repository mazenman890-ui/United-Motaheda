/**
 * ImageWithFallback — M8 image-pipeline upgrade
 *
 * Changes vs. v1:
 *  - Accepts `srcset` and `sizes` props so callers can pass Supabase transform
 *    srcsets without any special handling here.
 *  - Drops the srcset on error so the fallback placeholder never makes
 *    unnecessary network requests to transform endpoints.
 *  - Retains the existing lazy/async loading defaults.
 *  - The `alt` prop is required by the M8 acceptance criteria (every <img>
 *    must have a meaningful alt attribute) — we keep the existing signature
 *    (it's already optional for backward-compat) but enforce it on the
 *    fallback div's aria-label.
 */
import React, { useState } from "react";

// Inline SVG placeholder encoded as a data URI — rendered when the real
// image fails to load. Zero network round-trip, zero Supabase transform cost.
const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>,
) {
  const [didError, setDidError] = useState(false);

  const { src, alt, style, className, srcSet, sizes, ...rest } = props;
  const loading = rest.loading ?? "lazy";
  const decoding = rest.decoding ?? "async";

  if (didError) {
    return (
      <div
        className={`inline-flex items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eefcf8_100%)] text-center align-middle ${className ?? ""}`}
        style={style}
        role="img"
        aria-label={alt ?? "Image unavailable"}
        data-original-url={typeof src === "string" ? src : undefined}
      >
        <img
          src={ERROR_IMG_SRC}
          alt=""
          className="h-10 w-10 opacity-45"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      srcSet={srcSet}
      sizes={sizes}
      className={className}
      style={style}
      loading={loading}
      decoding={decoding}
      onError={() => setDidError(true)}
      {...rest}
    />
  );
}
