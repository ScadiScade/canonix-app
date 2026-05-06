export default function PricingLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-7 py-8 md:py-12 text-center">
      <div className="h-10 w-48 skeleton mx-auto mb-3" />
      <div className="h-5 w-72 skeleton mx-auto mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surface rounded-xl border border-ink-3/10 p-6">
            <div className="h-6 w-24 skeleton mb-2" />
            <div className="h-10 w-32 skeleton mb-4" />
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 w-full skeleton" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
