export default function Loading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="border-b border-border bg-card/40 px-5 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-2/3 max-w-xs rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted/70" />
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-8">
        <div className="space-y-3">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                <div className="h-24 w-24 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted/70" />
                  <div className="h-3 w-1/2 rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
