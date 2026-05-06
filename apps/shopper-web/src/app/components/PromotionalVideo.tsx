import { useId } from "react";
import { cn } from "./UI";

type PromotionalVideoGalleryItem = {
  id: string;
  title: string;
  src: string;
};

type PromotionalVideoProps = {
  src: string;
  title: string;
  className?: string;
  galleryTitle?: string;
  galleryItems?: readonly PromotionalVideoGalleryItem[];
};

const buildMutedEmbedSrc = (src: string) => {
  const url = new URL(src);
  url.searchParams.set("autoplay", "0");
  url.searchParams.set("mute", "1");
  url.searchParams.set("muted", "1");
  return url.toString();
};

export function PromotionalVideo({
  src,
  title,
  className,
  galleryTitle = "Video Gallery",
  galleryItems = [],
}: PromotionalVideoProps) {
  const labelId = useId();

  return (
    <div className={cn("overflow-hidden rounded-[inherit]", className)}>
      <div className="overflow-hidden rounded-[inherit]">
        <iframe
          title={title}
          aria-labelledby={labelId}
          src={buildMutedEmbedSrc(src)}
          className="aspect-video w-full border-0 bg-slate-100"
          allow="fullscreen"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <span id={labelId} className="sr-only">
          {title}
        </span>
      </div>

      {galleryItems.length > 0 ? (
        <section className="border-t border-slate-200 bg-slate-50/70 px-4 py-5 md:px-5">
          <div className="mb-4">
            <h3 className="text-lg font-black tracking-tight text-slate-950">{galleryTitle}</h3>
          </div>
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
            {galleryItems.map((item) => (
              <article
                key={item.id}
                className="min-w-[280px] snap-start overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)] sm:min-w-[340px]"
              >
                <iframe
                  title={item.title}
                  src={buildMutedEmbedSrc(item.src)}
                  className="aspect-video w-full border-0 bg-slate-100"
                  allow="fullscreen"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
