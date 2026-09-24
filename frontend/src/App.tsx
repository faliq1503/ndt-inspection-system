import { useEffect, useState } from 'react'
import type { Standard, EvaluationResult } from './types'
import EvaluateForm from './components/EvaluateForm'
import ResultCard from './components/ResultCard'
import ResultsHistory from './components/ResultsHistory'

const API_URL = 'http://localhost:8000'

type Tab = 'input' | 'riwayat'

function App() {
  const [standards, setStandards] = useState<Standard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [tab, setTab] = useState<Tab>('input')

  useEffect(() => {
    fetch(`${API_URL}/standards`)
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal mengambil data (status ${res.status})`)
        return res.json()
      })
      .then((data: Standard[]) => {
        setStandards(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">NDT Mapping System</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('input')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'input' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Input Baru
        </button>
        <button
          onClick={() => setTab('riwayat')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'riwayat' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Riwayat Hasil
        </button>
      </div>

      {loading && <p className="text-slate-400">Memuat data standard...</p>}
      {error && (
        <p className="text-red-400">
          Error: {error}. Pastikan backend FastAPI sedang berjalan di {API_URL}.
        </p>
      )}

      {!loading && !error && tab === 'input' && (
        <>
          <EvaluateForm standards={standards} onResult={setResult} />
          {result && <ResultCard result={result} />}
        </>
      )}

      {!loading && !error && tab === 'riwayat' && <ResultsHistory />}
    </div>
  )
}

export default App
