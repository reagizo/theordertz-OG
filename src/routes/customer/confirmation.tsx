import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import BrandLayout from '../../components/BrandLayout'
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext'

export const Route = createFileRoute('/customer/confirmation')({
  component: CustomerConfirmationPage,
})

function CustomerConfirmationInner() {
  const { settings } = useSettings()
  return (
    <BrandLayout>
      <section style={{ padding: 16 }}>
        <h2 style={{ margin: 0 }}>Thank you for your request</h2>
        <p>Your representative is: <strong>{settings.superAgentName}</strong></p>
        <p>We will contact you shortly with next steps.</p>
      </section>
    </BrandLayout>
  )
}

function CustomerConfirmationPage() {
  return (
    <SettingsProvider>
      <CustomerConfirmationInner />
    </SettingsProvider>
  )
}
