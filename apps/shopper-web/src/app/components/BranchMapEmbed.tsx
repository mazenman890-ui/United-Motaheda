import { cn } from "./UI";

type BranchMapEmbedProps = {
  src: string;
  title: string;
  className?: string;
};

export function BranchMapEmbed({ src, title, className }: BranchMapEmbedProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <iframe
        title={title}
        src={src}
        className="h-[280px] w-full sm:h-[340px] lg:h-[420px]"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

