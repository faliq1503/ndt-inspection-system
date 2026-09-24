import { useState } from 'react'
import type { Standard, Indikasi, EvaluationResult } from '../types'

const API_URL = 'http://localhost:8000'

interface Props {
  standards: Standard[]
  onResult: (result: EvaluationResult) => void
}

function EvaluateForm({ standards, onResult }: Props) {
  const [jenisBenda, setJenisBenda] = useState('')
  const [diameter, setDiameter] = useState('')
  const [panjangL, setPanjangL] = useState('')
  const [zona, setZona] = useState('')
  const [standardId, setStandardId] = useState<number | ''>('')
  const [indikasiList, setIndikasiList] = useState<Indikasi[]>([{ panjang_mm: 0, lebar_mm: 0 }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function tambahBarisIndikasi() {
    setIndikasiList([...indikasiList, { panjang_mm: 0, lebar_mm: 0 }])
  }

  function hapusBarisIndikasi(index: number) {
    setIndikasiList(indikasiList.filter((_, i) => i !== index))
  }

  function ubahIndikasi(index: number, field: keyof Indikasi, value: number) {
    const baru = [...indikasiList]
    baru[index] = { ...baru[index], [field]: value }
    setIndikasiList(baru)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!jenisBenda || !diameter || !panjangL || !zona || standardId === '') {
      setError('Semua field wajib diisi.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis_benda: jenisBenda,
          diameter_mm: parseFloat(diameter),
          panjang_l_mm: parseFloat(panjangL),
          zona: zona,
          standard_id: standardId,
          daftar_indikasi: indikasiList,
        }),
      })

      if (!res.ok) throw new Error(`Gagal submit (status ${res.status})`)

      const data: EvaluationResult = await res.json()
      onResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold mb-2">Input Komponen & Indikasi</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Jenis Benda</label>
          <input
            type="text"
            value={jenisBenda}
            onChange={(e) => setJenisBenda(e.target.value)}
            placeholder="mis. Bearing"
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Zona</label>
          <input
            type="text"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            placeholder="mis. Zona A"
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Diameter (mm)</label>
          <input
            type="number"
            value={diameter}
            onChange={(e) => setDiameter(e.target.value)}
            placeholder="mis. 360"
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Panjang / L (mm)</label>
          <input
            type="number"
            value={panjangL}
            onChange={(e) => setPanjangL(e.target.value)}
            placeholder="mis. 200"
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-slate-400 mb-1">Standard yang Dipakai</label>
          <select
            value={standardId}
            onChange={(e) => setStandardId(Number(e.target.value))}
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="">-- Pilih standard --</option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama_standard} (toleransi {s.toleransi_persen}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-400">Daftar Indikasi / Cacat</label>
          <button
            type="button"
            onClick={tambahBarisIndikasi}
            className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
          >
            + Tambah Indikasi
          </button>
        </div>

        <div className="space-y-2">
          {indikasiList.map((ind, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="number"
                value={ind.panjang_mm}
                onChange={(e) => ubahIndikasi(i, 'panjang_mm', Number(e.target.value))}
                placeholder="Panjang (mm)"
                className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={ind.lebar_mm}
                onChange={(e) => ubahIndikasi(i, 'lebar_mm', Number(e.target.value))}
                placeholder="Lebar (mm)"
                className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
              />
              {indikasiList.length > 1 && (
                <button
                  type="button"
                  onClick={() => hapusBarisIndikasi(i)}
                  className="text-red-400 hover:text-red-300 text-sm px-2"
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
      >
        {submitting ? 'Menghitung...' : 'Hitung & Evaluasi'}
      </button>
    </form>
  )
}

export default EvaluateForm