import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import '@/styles.css'

export const Route = createRootRoute({
  notFoundComponent: () => (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-lg text-gray-600">Page not found</p>
      <a href="/" className="text-blue-600 hover:underline">Return home</a>
    </div>
  ),
  onCatch: ({ error }) => {
    console.error('Global catch handler:', error)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-4xl font-bold text-red-600">Error</h1>
        <p className="text-lg text-gray-600">{error?.message || 'An unexpected error occurred'}</p>
        <a href="/" className="text-blue-600 hover:underline">Return home</a>
      </div>
    )
  },
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
})

// GitHub Pages SPA restore: /?/<path> -> <path>
if (typeof window !== 'undefined') {
  const search = window.location.search
  if (search.startsWith('?/')) {
    const next = search.slice(2)
    window.history.replaceState(null, '', '/' + next.replace(/^\/+/, ''))
  }
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-gray-50">
        <AuthProvider>
          <SettingsProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </SettingsProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
