import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import { SettingsProvider } from '@/contexts/SettingsContext'
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
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-gray-50">
        <AuthProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
