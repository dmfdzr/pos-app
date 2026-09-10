import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Memuat data...
        </p>
      </div>
    </div>
  )
}
