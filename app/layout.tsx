import { Geist_Mono, Nunito_Sans, Rubik } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { RouteProgress } from "@/components/route-progress"
import { cn } from "@/lib/utils"

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-heading",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata = {
  title: 'StockFlow POS',
  description: 'Aplikasi Kasir POS Multi-Tenant',
  manifest: '/manifest.json',
  themeColor: '#059669',
  icons: {
    icon: '/assets/logo.jpg',
    apple: '/assets/logo.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased font-sans", fontMono.variable, nunitoSans.variable, rubik.variable)}
    >
      <body suppressHydrationWarning>
        <RouteProgress />
        <ThemeProvider>{children}</ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); }); }`,
          }}
        />
      </body>
    </html>
  )
}
