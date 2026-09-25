import { useRef, useState } from 'react'
import type { Standard, EvaluationResult } from '../types'
import ResultCard from './ResultCard'

const API_URL = 'http://localhost:8000'

interface Indikasi {
  id: number
  panjang_mm: number
  lebar_mm: number
  posisi_x: number | null
  posisi_y: number | null
}

interface Props {
  standards: Standard[]
}

type Step = 'info' | 'foto'

function InputFlow({ standards }: Props) {
  const [step, setStep] = useState<Step>('info')
  const [componentId, setComponentId] = useState<number | null>(null)

  // form info dasar
  const [jenisBenda, setJenisBenda] = useState('')
  const [diameter, setDiameter] = useState('')
  const [panjangL, setPanjangL] = useState('')
  const [zona, setZona] = useState('')
  const [standardId, setStandardId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // step foto & indikasi
  const [gambarUrl, setGambarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [indikasiList, setIndikasiList] = useState<Indikasi[]>([])
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  async function handleSubmitInfo(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!jenisBenda || !diameter || !panjangL || !zona || standardId === '') {
      setError('Semua field wajib diisi.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis_benda: jenisBenda,
          diameter_mm: parseFloat(diameter),
          panjang_l_mm: parseFloat(panjangL),
          zona: zona,
          standard_id: standardId,
        }),
      })
      if (!res.ok) throw new Error(`Gagal membuat komponen (status ${res.status})`)
      const data = await res.json()
      setComponentId(data.id)
      setStep('foto')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || componentId === null) return

    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/components/${componentId}/upload-image`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error(`Gagal upload (status ${res.status})`)
      const data = await res.json()
      setGambarUrl(`${API_URL}${data.url}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat upload')
    } finally {
      setUploading(false)
    }
  }

  async function handleKlikGambar(e: React.MouseEvent<HTMLImageElement>) {
    if (componentId === null || !imgRef.current) return

    const rect = imgRef.current.getBoundingClientRect()
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100

    try {
      const res = await fetch(`${API_URL}/components/${componentId}/indications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panjang_mm: 0,
          lebar_mm: 0,
          posisi_x: xPercent,
          posisi_y: yPercent,
        }),
      })
      if (!res.ok) throw new Error('Gagal menambah titik indikasi.')
      const data = await res.json()
      setIndikasiList((prev) => [
        ...prev,
        { id: data.id, panjang_mm: 0, lebar_mm: 0, posisi_x: xPercent, posisi_y: yPercent },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    }
  }

  function ubahUkuran(id: number, field: 'panjang_mm' | 'lebar_mm', value: number) {
    setIndikasiList((prev) =>
      prev.map((ind) => (ind.id === id ? { ...ind, [field]: value } : ind))
    )
  }

  async function simpanUkuran(ind: Indikasi) {
    try {
      await fetch(`${API_URL}/indications/${ind.id}/size`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panjang_mm: ind.panjang_mm, lebar_mm: ind.lebar_mm }),
      })
    } catch {
      setError('Gagal menyimpan ukuran indikasi.')
    }
  }

  async function handleHitung() {
    if (componentId === null) return
    setError(null)
    setCalculating(true)
    try {
      const res = await fetch(`${API_URL}/components/${componentId}/calculate`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`Gagal menghitung (status ${res.status})`)
      const data: EvaluationResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setCalculating(false)
    }
  }

  function mulaiLagi() {
    setStep('info')
    setComponentId(null)
    setJenisBenda('')
    setDiameter('')
    setPanjangL('')
    setZona('')
    setStandardId('')
    setGambarUrl(null)
    setIndikasiList([])
    setResult(null)
    setError(null)
  }

  // -----------------------------------------------------------------
  // STEP 1: Info dasar
  // -----------------------------------------------------------------
  if (step === 'info') {
    return (
      <form onSubmit={handleSubmitInfo} className="bg-slate-800 rounded-lg p-6 max-w-2xl space-y-4">
        <h2 className="text-lg font-semibold mb-2">Langkah 1: Info Komponen</h2>

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

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
        >
          {submitting ? 'Menyimpan...' : 'Lanjut ke Upload Foto →'}
        </button>
      </form>
    )
  }

  // -----------------------------------------------------------------
  // STEP 2: Foto + tandai titik + isi ukuran + hitung
  // -----------------------------------------------------------------
  return (
    <div className="bg-slate-800 rounded-lg p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Langkah 2: Foto & Tandai Indikasi</h2>
        <button onClick={mulaiLagi} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded">
          Mulai Baru
        </button>
      </div>

      {!gambarUrl && (
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">Upload foto bearing/babbit</label>
          <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="text-sm text-slate-300" />
          {uploading && <p className="text-xs text-slate-400 mt-1">Mengupload...</p>}
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {gambarUrl && !result && (
        <div className="flex gap-6">
          <div className="relative inline-block border border-slate-600 rounded overflow-hidden">
            <img
              ref={imgRef}
              src={gambarUrl}
              alt="Foto komponen"
              onClick={handleKlikGambar}
              className="max-w-xl block cursor-crosshair"
            />
            {indikasiList.map((ind, i) => (
              <div
                key={ind.id}
                className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-red-500 border-2 border-white text-[10px] flex items-center justify-center font-bold"
                style={{ left: `${ind.posisi_x}%`, top: `${ind.posisi_y}%` }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <div className="flex-1">
            <p className="text-sm text-slate-400 mb-2">
              Klik di foto untuk menambah titik indikasi, lalu isi ukurannya di bawah.
            </p>
            <div className="space-y-2 mb-4">
              {indikasiList.map((ind, i) => (
                <div key={ind.id} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-400 w-6">#{i + 1}</span>
                  <input
                    type="number"
                    value={ind.panjang_mm}
                    onChange={(e) => ubahUkuran(ind.id, 'panjang_mm', Number(e.target.value))}
                    onBlur={() => simpanUkuran(ind)}
                    placeholder="Panjang (mm)"
                    className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={ind.lebar_mm}
                    onChange={(e) => ubahUkuran(ind.id, 'lebar_mm', Number(e.target.value))}
                    onBlur={() => simpanUkuran(ind)}
                    placeholder="Lebar (mm)"
                    className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
              ))}
              {indikasiList.length === 0 && (
                <p className="text-xs text-slate-500">Belum ada titik ditandai.</p>
              )}
            </div>

            <button
              onClick={handleHitung}
              disabled={calculating || indikasiList.length === 0}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
            >
              {calculating ? 'Menghitung...' : 'Hitung & Evaluasi'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <>
          <ResultCard result={result} />
          <button
            onClick={mulaiLagi}
            className="mt-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-medium"
          >
            + Input Komponen Baru
          </button>
        </>
      )}
    </div>
  )
}

export default InputFlow