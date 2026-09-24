export interface Standard {
  id: number
  nama_standard: string
  offset_x_mm: number
  toleransi_persen: number
  keterangan: string
}

export interface Indikasi {
  panjang_mm: number
  lebar_mm: number
}

export interface EvaluationResult {
  component_id: number
  p_keliling: number
  a_babbit: number
  a_zone_c: number
  a_zone_a: number
  a_unbond_total: number
  a_bond: number
  persen_unbond: number
  status: 'ACCEPT' | 'REJECT'
}