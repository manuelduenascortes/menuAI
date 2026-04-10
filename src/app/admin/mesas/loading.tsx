import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function MesasLoading() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Page header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80 mt-2" />
      </div>

      {/* Add table form */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-32">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="bg-secondary p-4 text-center border-b border-border">
              <Skeleton className="h-7 w-24 mx-auto" />
              <Skeleton className="h-5 w-16 mx-auto mt-1.5 rounded-full" />
            </div>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="w-32 h-32 rounded-lg mx-auto" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
