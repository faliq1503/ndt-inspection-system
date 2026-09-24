import type { EvaluationResult } from '../types'

interface Props {
  result: EvaluationResult
}

function ResultCard({ result }: Props) {
  const isAccept = result.status === 'ACCEPT'

  return (
    <div className="bg-slate-800 rounded-lg p-6 max-w-2xl mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Hasil Evaluasi</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-bold ${
            isAccept ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {result.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between border-b border-slate-700 py-1">
          <span className="text-slate-400">Keliling (P)</span>
          <span>{result.p_keliling} mm</span>
        </div>
        <div className="flex justify-between border-b border-slate-700 py-1">
          <span className="text-slate-400">Luas Babbit</span>
          <span>{result.a_babbit} mm²</span>
        </div>
        <div className="flex justify-between border-b border-slate-700 py-1">
          <span className="text-slate-400">Luas Zone C</span>
          <span>{result.a_zone_c} mm²</span>
        </div>
        <div className="flex justify-between border-b border-slate-700 py-1">
          <span className="text-slate-400">Luas Zone A</span>
          <span>{result.a_zone_a} mm²</span>
        </div>
        <div className="flex justify-between border-b border-slate-700 py-1">
          <span className="text-slate-400">Total Luas Unbond</span>
          <span>{result.a_unbond_total} mm²</span>
        </div>
        <div className="flex justify-between border-b border-slate-700 py-1">
          <span className="text-slate-400">Luas Bond</span>
          <span>{result.a_bond} mm²</span>
        </div>
        <div className="flex justify-between border-b border-slate-700 py-1 col-span-2">
          <span className="text-slate-400">Persentase Unbond</span>
          <span className="font-semibold">{result.persen_unbond}%</span>
        </div>
      </div>
    </div>
  )
}

export default ResultCard