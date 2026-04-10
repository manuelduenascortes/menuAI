import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Page header */}
      <div className="mb-10">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72 mt-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-4 w-28 mt-2" />
                </div>
                <Skeleton className="w-10 h-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Restaurant info + quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-80 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-48 mt-1" />
          </CardContent>
        </Card>
        <div className="md:col-span-2 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48 mt-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
