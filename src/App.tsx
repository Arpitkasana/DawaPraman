import { useState } from 'react'
import { ShieldCheck, Search } from 'lucide-react'
import VerifiedCard from './components/VerifiedCard'
import { verifyMedicine } from './services/api'

export default function App() {
  const [batchNo, setBatchNo] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleVerify = async () => {
    if (!batchNo.trim()) {
      setMessage('Please enter Batch No')
      return
    }
    setLoading(true)
    setMessage('')
    setResult(null)
    const res: any = await verifyMedicine(batchNo.trim())
    setLoading(false)
    if (res?.medicine || res?.secureMeta) {
      setResult(res)
    } else {
      setMessage(res?.message || 'Medicine not verified')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-white p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="text-emerald-600 w-8 h-8" />
          <h1 className="text-xl font-bold">MedVerify India</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">DawAI Suraksha - Verify your medicine is Asli</p>

        <label className="text-sm font-medium">Batch No</label>
        <input
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value.toUpperCase)}
          placeholder="e.g. B12345"
          className="w-full border rounded-lg p-3 mt-1 mb-3 outline-none focus:border-emerald-500"
        />
        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-emerald-600 text-white rounded-lg p-3 font-bold flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" />
          {loading ? 'Verifying...' : 'Verify Medicine'}
        </button>

        {message && (
          <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
            {message}
          </div>
        )}

        {result && (
          <div className="mt-4">
            <VerifiedCard data={result} />
          </div>
        )}
      </div>
    </div>
  )
}
