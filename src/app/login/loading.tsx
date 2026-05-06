export default function LoginLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface rounded-xl border border-ink-3/10 p-8">
        <div className="h-8 w-48 skeleton mx-auto mb-6" />
        <div className="h-10 w-full skeleton mb-4" />
        <div className="h-10 w-full skeleton mb-6" />
        <div className="h-12 w-full skeleton" />
      </div>
    </div>
  );
}
