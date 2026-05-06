import { SkeletonCard } from "@/components/ui";

export default function MarketplaceLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-7 py-8 md:py-12">
      <div className="h-8 w-64 skeleton mb-2" />
      <div className="h-5 w-96 skeleton mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[10px]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} lines={3} avatar />
        ))}
      </div>
    </div>
  );
}
