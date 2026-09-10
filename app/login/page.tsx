'use client'

import { useState } from 'react'
import { login, register } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    const result = isLogin ? await login(formData) : await register(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Fullscreen Loading Overlay saat proses login/register berhasil sebelum navigasi */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-primary/10 p-4 rounded-full">
              <Package className="h-8 w-8 text-primary animate-bounce" />
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isLogin ? 'Memverifikasi akun...' : 'Mempersiapkan toko Anda...'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
      
      <Link href="/" className="absolute top-6 left-6">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      <Card className="w-full max-w-md bg-card/50 backdrop-blur-md shadow-2xl border-border/50">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isLogin ? 'Welcome back' : 'Create your store'}
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Enter your credentials to access your POS' : 'Register your business to start selling'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Store Name</label>
                <Input name="storeName" placeholder="My Awesome Store" required minLength={3} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" placeholder="name@example.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input name="password" type="password" placeholder="••••••••" required minLength={6} />
            </div>
            
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md animate-in fade-in">
                {error}
              </div>
            )}

            <Button className="w-full h-11 mt-2 relative" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin absolute left-4" />}
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register Store')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-primary hover:underline font-medium focus:outline-none"
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
