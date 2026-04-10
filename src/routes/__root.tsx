import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import '@/styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'The Order-Reagizo Service Company' },
      { name: 'theme-color', content: '#111827' },
      { name: 'description', content: 'The Order-Reagizo Service Company - Interactive Service Platform' },
    ],
    links: [
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
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
      <body className="bg-gray-50">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
