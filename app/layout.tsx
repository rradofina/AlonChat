import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AuthProvider } from '@/components/auth-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AlonChat - AI Chatbot Builder for PH Businesses',
  description: 'Build intelligent chatbots from your Facebook Messenger exports and other data sources. Perfect for Philippine SMEs.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </AuthProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}