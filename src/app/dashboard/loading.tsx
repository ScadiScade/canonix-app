import { SkeletonCard } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-7 py-8 md:py-12">
      {/* Profile skeleton */}
      <div className="bg-surface rounded-xl border border-ink-3/10 p-6 md:p-8 mb-8">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full skeleton flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-48 skeleton" />
            <div className="h-5 w-72 skeleton" />
            <div className="h-4 w-56 skeleton" />
          </div>
        </div>
      </div>
      {/* Universe cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}
