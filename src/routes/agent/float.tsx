import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { saveFloatExchangeFn, listFloatExchangesByAgentFn } from '@/server/db.functions'
import { generateId } from '@/lib/utils'
import { CARRIER_CODES, type FloatExchange } from '@/lib/types'
import { ArrowLeftRight, Clock, CheckCircle, XCircle, ChevronRight, AlertCircle, Send } from 'lucide-react'

export const Route = createFileRoute('/agent/float')({
  component: AgentFloatExchange,
})

const RECEIVING_CARRIERS = ['AzamPesa', 'Airtel Money', 'Mixx By Yas', 'M-Pesa', 'HaloPesa', 'SelcomPay', 'T-Pesa']

type FloatStatus = 'sent' | 'pending' | 'received' | 'approved' | 'rejected' | 'completed'

const STATUS_FLOW: FloatStatus[] = ['sent', 'pending', 'received', 'approved', 'completed']
const STATUS_COLORS: Record<FloatStatus, string> = {
  sent: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  received: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

function StatusTrail({ status, rejectionReason }: { status: string; rejectionReason?: string }) {
  const currentStatus = status as FloatStatus
  const isRejected = currentStatus === 'rejected'
  const flow = isRejected ? ['sent', 'pending', 'received', 'rejected'] : STATUS_FLOW

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 flex-wrap">
        {flow.map((step, i) => {
          const stepIndex = flow.indexOf(step)
          const currentIndex = flow.indexOf(currentStatus)
          const isActive = stepIndex <= currentIndex
          const isCurrent = step === currentStatus

          return (
            <div key={step} className="flex items-center gap-1">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                isCurrent
                  ? STATUS_COLORS[step] + ' ring-2 ring-offset-1 ' + (step === 'rejected' ? 'ring-red-300' : 'ring-current')
                  : isActive
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-50 text-gray-300'
              }`}>
                {step === 'sent' && <Send className="w-3 h-3" />}
                {step === 'pending' && <Clock className="w-3 h-3" />}
                {step === 'received' && <ChevronRight className="w-3 h-3" />}
                {step === 'approved' && <CheckCircle className="w-3 h-3" />}
                {step === 'rejected' && <XCircle className="w-3 h-3" />}
                {step === 'completed' && <CheckCircle className="w-3 h-3" />}
                <span className="capitalize">{step}</span>
              </div>
              {i < flow.length - 1 && (
                <div className={`w-4 h-0.5 ${isActive && stepIndex < currentIndex ? 'bg-gray-300' : 'bg-gray-100'}`} />
              )}
            </div>
          )
        })}
      </div>
      {isRejected && rejectionReason && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-700">Rejection Reason</p>
            <p className="text-xs text-red-600 mt-0.5">{rejectionReason}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function AgentFloatExchange() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    superAgentDepCode: '',
    receivingCarrier: '',
    agentDepReceivingCode: '',
    referenceCode: '',
    additionalNotes: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<FloatExchange[]>([])

  useEffect(() => {
    if (!user?.id) return
    listFloatExchangesByAgentFn({ data: { agentId: user.id } }).then(setHistory)
  }, [user?.id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.superAgentDepCode || !form.receivingCarrier || !form.agentDepReceivingCode) {
      setError('Please fill all required fields')
      return
    }
    if (!user?.id) return
    setLoading(true)
    setError('')
    try {
      const now = new Date().toISOString()
      await saveFloatExchangeFn({
        data: {
          id: generateId(),
          agentId: user.id,
          agentName: user.user_metadata?.full_name ?? user.email ?? 'Agent',
          superAgentDepCode: form.superAgentDepCode,
          carrierType: form.receivingCarrier as any,
          agentCode: form.receivingCarrier,
          agentDepReceivingCode: form.agentDepReceivingCode,
          referenceCode: form.referenceCode,
          additionalNotes: form.additionalNotes || undefined,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        },
      })
      setSuccess(true)
      setForm({ superAgentDepCode: '', receivingCarrier: '', agentDepReceivingCode: '', referenceCode: '', additionalNotes: '' })
      const updated = await listFloatExchangesByAgentFn({ data: { agentId: user.id } })
      setHistory(updated)
    } catch {
      setError('Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Float Exchange Request Sent Successfully!</h2>
          <p className="text-gray-500 text-sm mb-2">
            Your float exchange request has been submitted and is awaiting processing.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Track the status on your transaction page: Sent → Pending → Received → Approved/Rejected → Completed
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  const carrierEntries = Object.entries(CARRIER_CODES).filter(([, code]) => code)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Float Exchange</h1>
        <p className="text-gray-500 text-sm mt-1">Submit a float exchange request to your super agent</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-green-600" />
              Float Exchange Form
            </h3>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Super Agent Dep. Code — dropdown of carrier reference codes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Super Agent Dep. Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="superAgentDepCode"
                    value={form.superAgentDepCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  >
                    <option value="">Select carrier code...</option>
                    {carrierEntries.map(([carrier, code]) => (
                      <option key={carrier} value={code}>{carrier} — {code}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Agent Receiving Carrier List */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Receiving Carrier List <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="receivingCarrier"
                    value={form.receivingCarrier}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  >
                    <option value="">Select receiving carrier...</option>
                    {RECEIVING_CARRIERS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Agent Dep. Receiving Code or Mobile Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Dep. Receiving Code / Mobile No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="agentDepReceivingCode"
                    value={form.agentDepReceivingCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="Enter receiving code or mobile number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Code</label>
                  <input
                    name="referenceCode"
                    value={form.referenceCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="Transaction reference"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  name="additionalNotes"
                  value={form.additionalNotes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                  placeholder="Any additional information..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-lg text-sm"
              >
                {loading ? 'Submitting...' : 'Send Request'}
              </button>
            </form>
          </div>
        </div>

        {/* Carrier Reference */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Carrier Reference Codes</h4>
          <div className="space-y-2 text-sm">
            {carrierEntries.map(([carrier, code]) => (
              <div key={carrier} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <span className="font-medium text-gray-700">{carrier}</span>
                <span className="text-gray-500 font-mono text-xs">{code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History with Status Trail */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Float Exchange Request History</h3>
          <div className="space-y-4">
            {history.slice(0, 10).map(ex => (
              <div key={ex.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800 text-sm">{ex.carrierType}</span>
                    <span className="text-gray-400 text-xs">•</span>
                    <span className="text-gray-500 text-xs">{ex.agentDepReceivingCode || '—'}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    ex.status === 'approved' ? 'bg-green-100 text-green-700' :
                    ex.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {ex.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                     ex.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                     <Clock className="w-3 h-3" />}
                    {ex.status}
                  </span>
                </div>
                <StatusTrail status={ex.status} rejectionReason={(ex as any).rejectionReason} />
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>Ref: {ex.referenceCode || '—'}</span>
                  <span>{new Date(ex.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
