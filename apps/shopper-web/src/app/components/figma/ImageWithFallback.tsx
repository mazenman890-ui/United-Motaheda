import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, ...rest } = props
  const loading = rest.loading ?? 'lazy'
  const decoding = rest.decoding ?? 'async'

  return didError ? (
    <div
      className={`inline-flex items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eefcf8_100%)] text-center align-middle ${className ?? ''}`}
      style={style}
      role="img"
      aria-label={alt ?? 'Image unavailable'}
      data-original-url={typeof src === 'string' ? src : undefined}
    >
      <img src={ERROR_IMG_SRC} alt="" className="h-10 w-10 opacity-45" />
    </div>
  ) : (
    <img src={src} alt={alt} className={className} style={style} {...rest} loading={loading} decoding={decoding} onError={handleError} />
  )
}
