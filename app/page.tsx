import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Store, Zap, ShieldCheck } from "lucide-react"
import { createClient } from "@/utils/supabase/server"

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo.jpg" alt="StockFlow" className="h-8 w-8 rounded-lg object-cover" />
            <span>StockFlow POS</span>
          </div>
          <nav className="ml-auto flex items-center gap-4 sm:gap-6">
            {user ? (
              <Link href="/dashboard">
                <Button variant="default" size="sm">Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm">Sign In</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-24 md:py-32 lg:py-48 flex flex-col items-center justify-center text-center px-4">
          <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
          
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-6">
            v1.0 Now Live
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl text-foreground">
            Modern Retail Management, <br className="hidden sm:inline" />
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="mt-6 max-w-[600px] text-muted-foreground md:text-xl">
            A blazing-fast Point of Sale and Inventory system built for multi-tenant scalability. Secure, real-time, and beautifully designed.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-xl hover:shadow-primary/25 transition-all duration-300">
                  Open Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-xl hover:shadow-primary/25 transition-all duration-300">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="w-full py-16 md:py-24 bg-card/50 backdrop-blur-md border-t">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Keyboard-First POS</h3>
                <p className="text-muted-foreground">Lightning fast checkout experience optimized for hardware keyboards. Never touch the mouse again.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Absolute Isolation</h3>
                <p className="text-muted-foreground">Enterprise-grade tenant data isolation at the database level using Postgres Row Level Security.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 sm:col-span-2 lg:col-span-1">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <Store className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Real-time Inventory</h3>
                <p className="text-muted-foreground">Track stock movements instantly across all your stores with optimistic UI updates.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
