import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import BrandLayout from '../../components/BrandLayout'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '@/components/AuthProvider'
import { getCustomerProfileFn, listAgentsFn, listSuperAgentsFn } from '@/server/db.functions'

export const Route = createFileRoute('/customer/confirmation')({
  component: CustomerConfirmationPage,
})

function CustomerConfirmationPage() {
  const { settings } = useSettings()
  const { user } = useAuth()
  const [agentName, setAgentName] = useState<string>('')

  useEffect(() => {
    if (!user?.id) return
    
    async function loadAgentName() {
      try {
        const customer = await getCustomerProfileFn({ data: { id: user.id } })
        if (customer?.assignedSuperAgentId) {
          const superAgents = await listSuperAgentsFn()
          const superAgent = superAgents.find(a => a.id === customer.assignedSuperAgentId)
          if (superAgent) {
            setAgentName(superAgent.fullName)
            return
          }
        }
        if (customer?.assignedAgentId) {
          const agents = await listAgentsFn()
          const agent = agents.find(a => a.id === customer.assignedAgentId)
          if (agent) {
            setAgentName(agent.fullName)
            return
          }
        }
        setAgentName(settings.superAgentName)
      } catch (err) {
        console.error('Error loading agent name:', err)
        setAgentName(settings.superAgentName)
      }
    }
    
    loadAgentName()
  }, [user?.id, settings.superAgentName])

  return (
    <BrandLayout>
      <section style={{ padding: 16 }}>
        <h2 style={{ margin: 0 }}>Thank you for your request</h2>
        <p>Your representative is: <strong>{agentName || settings.superAgentName}</strong></p>
        <p>We will contact you shortly with next steps.</p>
      </section>
    </BrandLayout>
  )
}
