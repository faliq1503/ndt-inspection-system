import { useEffect, useRef, useState } from 'react'

const API_URL = 'http://localhost:8000'

interface Indikasi {
  id: number
  panjang_mm: number
  lebar_mm: number
  posisi_x: number | null
  posisi_y: number | null
}

interface ComponentDetail {
  id: number
  jenis_benda: string
  diameter_mm: number
  zona: string
  gambar_path: string | null
  indikasi_list: Indikasi[]
}

interface Props {
  componentId: number
  onClose: () => void
}

function MappingPage({ componentId, onClose }: Props) {
  const [comp, setComp] = useState<ComponentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [indikasiAktif, setIndikasiAktif] = useState<number | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    muatData()
  }, [componentId])

  function muatData() {
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/components/${componentId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal mengambil data (status ${res.status})`)
        return res.json()
      })
      .then((data: ComponentDetail) => {
        setComp(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

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
      muatData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat upload')
    } finally {
      setUploading(false)
    }
  }

  async function handleKlikGambar(e: React.MouseEvent<HTMLImageElement>) {
    if (indikasiAktif === null || !imgRef.current) return

    const rect = imgRef.current.getBoundingClientRect()
    // posisi disimpan dalam persen (0-100) relatif terhadap ukuran gambar,
    // supaya tetap akurat walau gambar ditampilkan dengan ukuran berbeda-beda
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100

    try {
      await fetch(`${API_URL}/indications/${indikasiAktif}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posisi_x: xPercent, posisi_y: yPercent }),
      })
      setIndikasiAktif(null)
      muatData()
    } catch {
      setError('Gagal menyimpan posisi titik.')
    }
  }

  if (loading) return <p className="text-slate-400">Memuat data komponen...</p>
  if (error) return <p className="text-red-400">Error: {error}</p>
  if (!comp) return null

  const gambarUrl = comp.gambar_path ? `${API_URL}/images/${comp.gambar_path}` : null

  return (
    <div className="bg-slate-800 rounded-lg p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Mapping 2D — {comp.jenis_benda} (Zona {comp.zona})
        </h2>
        <button
          onClick={onClose}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded"
        >
          Kembali
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-2">
          {gambarUrl ? 'Ganti gambar' : 'Upload foto bearing/babbit'}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="text-sm text-slate-300"
        />
        {uploading && <p className="text-xs text-slate-400 mt-1">Mengupload...</p>}
      </div>

      {!gambarUrl && (
        <p className="text-slate-400 text-sm">Belum ada gambar. Upload foto dulu untuk mulai mapping.</p>
      )}

      {gambarUrl && (
        <div className="flex gap-6">
          {/* Area gambar + marker */}
          <div className="relative inline-block border border-slate-600 rounded overflow-hidden">
            <img
              ref={imgRef}
              src={gambarUrl}
              alt="Foto komponen"
              onClick={handleKlikGambar}
              className={`max-w-xl block ${indikasiAktif !== null ? 'cursor-crosshair' : 'cursor-default'}`}
            />
            {comp.indikasi_list.map((ind, i) =>
              ind.posisi_x !== null && ind.posisi_y !== null ? (
                <div
                  key={ind.id}
                  title={`Indikasi #${i + 1}: ${ind.panjang_mm}x${ind.lebar_mm} mm`}
                  className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-red-500 border-2 border-white text-[10px] flex items-center justify-center font-bold"
                  style={{ left: `${ind.posisi_x}%`, top: `${ind.posisi_y}%` }}
                >
                  {i + 1}
                </div>
              ) : null
            )}
          </div>

          {/* Daftar indikasi */}
          <div className="flex-1">
            <p className="text-sm text-slate-400 mb-2">
              Klik salah satu indikasi di bawah, lalu klik titik lokasinya di gambar.
            </p>
            <div className="space-y-2">
              {comp.indikasi_list.map((ind, i) => (
                <button
                  key={ind.id}
                  onClick={() => setIndikasiAktif(ind.id)}
                  className={`w-full text-left text-sm px-3 py-2 rounded flex items-center justify-between ${
                    indikasiAktif === ind.id
                      ? 'bg-blue-600'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <span>
                    #{i + 1} — {ind.panjang_mm} x {ind.lebar_mm} mm
                  </span>
                  <span className="text-xs">
                    {ind.posisi_x !== null ? '✓ Sudah ditandai' : 'Belum ditandai'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MappingPage