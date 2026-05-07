export default function RouteLoadingSkeleton() {
  return (
    <div className="min-h-[60vh] bg-[var(--background)]">
      <div className="page-section flex flex-col gap-6 py-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-[1.25rem] bg-teal-100" />
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-44 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-12 max-w-3xl animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-4 max-w-2xl animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 max-w-xl animate-pulse rounded-full bg-slate-200" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-[2rem] border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex h-full flex-col gap-3 p-5">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-10 w-full animate-pulse rounded-2xl bg-slate-200" />
                  <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-4 w-3/5 animate-pulse rounded-full bg-slate-200" />
                </div>
                <div className="h-10 w-32 animate-pulse rounded-full bg-teal-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

