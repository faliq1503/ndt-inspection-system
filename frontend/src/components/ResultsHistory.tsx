import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

interface RiwayatItem {
  id: number
  component_id: number
  jenis_benda: string
  diameter_mm: number
  zona: string
  p_keliling: number
  a_babbit: number
  a_zone_c: number
  a_zone_a: number
  a_unbond_total: number
  a_bond: number
  persen_unbond: number
  status: 'ACCEPT' | 'REJECT'
}

function ResultsHistory() {
  const [data, setData] = useState<RiwayatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    muatUlang()
  }, [])

  function muatUlang() {
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/results`)
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal mengambil data (status ${res.status})`)
        return res.json()
      })
      .then((json: RiwayatItem[]) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Riwayat Hasil Evaluasi</h2>
        <div className="flex gap-2">
          <a
            href={`${API_URL}/results/export/excel`}
            className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded"
          >
            Export Semua ke Excel
          </a>
          <button
            onClick={muatUlang}
            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded"
          >
            Muat Ulang
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-400">Memuat data...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {!loading && !error && data.length === 0 && (
        <p className="text-slate-400">Belum ada riwayat evaluasi.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Jenis Benda</th>
                <th className="py-2 pr-4">Diameter</th>
                <th className="py-2 pr-4">Zona</th>
                <th className="py-2 pr-4">Luas Bond</th>
                <th className="py-2 pr-4">Total Unbond</th>
                <th className="py-2 pr-4">% Unbond</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Laporan</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-slate-700">
                  <td className="py-2 pr-4 text-slate-400">#{item.id}</td>
                  <td className="py-2 pr-4">{item.jenis_benda}</td>
                  <td className="py-2 pr-4">{item.diameter_mm} mm</td>
                  <td className="py-2 pr-4">{item.zona}</td>
                  <td className="py-2 pr-4">{item.a_bond} mm²</td>
                  <td className="py-2 pr-4">{item.a_unbond_total} mm²</td>
                  <td className="py-2 pr-4">{item.persen_unbond}%</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        item.status === 'ACCEPT' ? 'bg-green-600' : 'bg-red-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <a
                      href={`${API_URL}/results/${item.id}/report/pdf`}
                      className="text-blue-400 hover:text-blue-300 text-xs underline"
                    >
                      Download PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ResultsHistory