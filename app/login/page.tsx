'use client'

import { useState } from 'react'
import { login, register } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ArrowLeft } from 'lucide-react'
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
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <Button className="w-full h-11 mt-2" type="submit" disabled={loading}>
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
