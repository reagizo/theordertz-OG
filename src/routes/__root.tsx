import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import '@/styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Service Interface Portal System' },
      { name: 'theme-color', content: '#1a1a3e' },
      { name: 'description', content: 'Service Interface Portal System - The Order Service Company' },
    ],
    links: [
      { rel: 'icon', type: 'image/png', href: '/logo.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/pwa-512x512.png' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="mb-2 text-4xl font-bold text-gray-900">404</h1>
      <p className="text-lg text-gray-600">Page not found</p>
    </div>
  ),
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#1a1a3e]">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
