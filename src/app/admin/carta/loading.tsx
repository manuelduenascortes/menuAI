import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function CartaLoading() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Page header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>

      {/* Header bar */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      {/* Category cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-64 mt-2" />
                  <div className="flex gap-1 mt-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
