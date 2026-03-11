'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

function money(n) {
  const x = Number(n || 0)
  return Number.isFinite(x) ? x.toLocaleString('th-TH') : '0'
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function daysBetween(dateStr) {
  if (!dateStr) return 0
  const start = new Date(dateStr)
  if (Number.isNaN(start.getTime())) return 0
  const now = new Date()
  start.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((now - start) / 86400000))
}

function ageTone(days) {
  if (days > 90) return 'rose'
  if (days >= 30) return 'amber'
  return 'emerald'
}

function ageLabel(days) {
  if (days > 90) return 'ค้างนาน'
  if (days >= 30) return 'เริ่มค้าง'
  return 'ปกติ'
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald: 'border border-emerald-200/80 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200/80 bg-amber-50 text-amber-700',
    rose: 'border border-rose-200/80 bg-rose-50 text-rose-700',
    slate: 'border border-slate-200/80 bg-white text-slate-600',
    teal: 'border border-teal-200/80 bg-teal-50 text-teal-700',
    sky: 'border border-sky-200/80 bg-sky-50 text-sky-700',
    lilac: 'border border-violet-200/80 bg-violet-50 text-violet-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-tight',
        map[tone] || map.slate
      )}
    >
      {children}
    </span>
  )
}

function Card({ children, className = '', tint = 'default' }) {
  const tintMap = {
    default:
      'border border-white/80 bg-white/92 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
    rose:
      'border border-rose-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,244,247,0.96)_46%,rgba(252,231,243,0.92)_100%)] shadow-[0_8px_24px_rgba(244,63,94,0.06)]',
    sky:
      'border border-sky-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,250,255,0.96)_46%,rgba(224,242,254,0.92)_100%)] shadow-[0_8px_24px_rgba(59,130,246,0.06)]',
    emerald:
      'border border-emerald-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,255,250,0.96)_46%,rgba(209,250,229,0.92)_100%)] shadow-[0_8px_24px_rgba(16,185,129,0.06)]',
    cream:
      'border border-amber-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,251,245,0.96)_46%,rgba(255,247,237,0.92)_100%)] shadow-[0_8px_24px_rgba(245,158,11,0.06)]',
    lilac:
      'border border-violet-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(249,247,255,0.96)_46%,rgba(243,232,255,0.92)_100%)] shadow-[0_8px_24px_rgba(139,92,246,0.06)]',
  }

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[30px] p-4 sm:p-5',
        tintMap[tint] || tintMap.default,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.66),transparent_38%)]" />
      <div className="relative z-10">{children}</div>
    </section>
  )
}

function StatCard({ title, value, suffix = '', tint = 'default' }) {
  return (
    <Card tint={tint} className="min-h-[132px] sm:min-h-[142px]">
      <div className="flex h-full flex-col justify-between">
        <div className="text-sm font-medium text-slate-500">{title}</div>

        <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[31px] font-bold leading-none tracking-tight text-slate-900 sm:text-[36px]">
            {value}
          </span>
          {suffix ? (
            <span className="mb-1 text-sm font-semibold text-slate-400">{suffix}</span>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function TextCard({ title, text, tint = 'default', icon = '✦' }) {
  return (
    <Card tint={tint} className="min-h-[150px] sm:min-h-[162px]">
      <div className="pointer-events-none absolute right-5 top-4 text-[42px] font-light text-slate-300/35">
        {icon}
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="text-sm font-medium text-slate-500">{title}</div>

        <div className="mt-3 inline-flex w-fit rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-slate-500">
          Insight
        </div>

        <div className="mt-4 whitespace-pre-line text-base font-semibold leading-7 tracking-tight text-slate-900 sm:text-[17px]">
          {text || '-'}
        </div>
      </div>
    </Card>
  )
}

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100'

export default function StockPage() {
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [plants, setPlants] = useState([])

  const [q, setQ] = useState('')
  const [ageFilter, setAgeFilter] = useState('all') // all | lt30 | 30to90 | gt90
  const [sortBy, setSortBy] = useState('days_desc') // days_desc | days_asc | cost_desc | cost_asc | code_asc

  async function loadPlants() {
    setLoading(true)
    setErr('')

    try {
      const { data, error } = await supabase
        .from('plants')
        .select('id, plant_code, name, cost, status, acquired_date, created_at')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = (data || []).map((p) => {
        const baseDate = p.acquired_date || p.created_at
        const days = daysBetween(baseDate)
        return {
          ...p,
          days_in_stock: days,
        }
      })

      setPlants(rows)
    } catch (e) {
      setErr(e?.message || 'โหลดคลังไม้พร้อมขายไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredPlants = useMemo(() => {
    let rows = [...plants]
    const keyword = String(q || '').trim().toUpperCase()

    if (keyword) {
      rows = rows.filter(
        (p) =>
          String(p.plant_code || '').toUpperCase().includes(keyword) ||
          String(p.name || '').toUpperCase().includes(keyword)
      )
    }

    if (ageFilter === 'lt30') {
      rows = rows.filter((p) => p.days_in_stock < 30)
    } else if (ageFilter === '30to90') {
      rows = rows.filter((p) => p.days_in_stock >= 30 && p.days_in_stock <= 90)
    } else if (ageFilter === 'gt90') {
      rows = rows.filter((p) => p.days_in_stock > 90)
    }

    rows.sort((a, b) => {
      if (sortBy === 'days_desc') return b.days_in_stock - a.days_in_stock
      if (sortBy === 'days_asc') return a.days_in_stock - b.days_in_stock
      if (sortBy === 'cost_desc') return Number(b.cost || 0) - Number(a.cost || 0)
      if (sortBy === 'cost_asc') return Number(a.cost || 0) - Number(b.cost || 0)
      return String(a.plant_code || '').localeCompare(String(b.plant_code || ''))
    })

    return rows
  }, [plants, q, ageFilter, sortBy])

  const stats = useMemo(() => {
    const totalCount = plants.length
    const totalCost = plants.reduce((sum, p) => sum + Number(p.cost || 0), 0)
    const avgCost = totalCount > 0 ? totalCost / totalCount : 0
    const over30 = plants.filter((p) => p.days_in_stock >= 30).length
    const over90 = plants.filter((p) => p.days_in_stock > 90).length

    return {
      totalCount,
      totalCost,
      avgCost,
      over30,
      over90,
    }
  }, [plants])

  const topCostPlants = useMemo(() => {
    return [...plants]
      .sort((a, b) => Number(b.cost || 0) - Number(a.cost || 0))
      .slice(0, 5)
  }, [plants])

  const aiStockText = useMemo(() => {
    if (stats.totalCount === 0) {
      return 'ตอนนี้ไม่มีไม้พร้อมขายในคลัง\nสามารถเริ่มเพิ่มไม้ใหม่เข้าระบบได้'
    }

    if (stats.over90 > 0) {
      return `มีไม้ค้างเกิน 90 วัน ${stats.over90} ต้น\nควรเร่งขายตัวที่ค้างนานก่อน เพื่อไม่ให้เงินจมเพิ่ม`
    }

    if (stats.over30 > 0) {
      return `มีไม้ค้างเกิน 30 วัน ${stats.over30} ต้น\nเริ่มมีเงินจมในสต๊อก ควรติดตามการหมุนของขาย`
    }

    return 'สต๊อกยังอยู่ในระดับปกติ\nไม้ส่วนใหญ่ยังไม่ค้างนาน และพร้อมขายได้'
  }, [stats])

  return (
    <AppShell title="เปิดคลังไม้พร้อมขาย">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 sm:mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  NisaPlant Sellable Stock
                </div>
                <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                  เปิดคลังไม้พร้อมขาย
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  ดูเฉพาะไม้ ACTIVE เพื่อหาของขาย เช็คทุน และดูเงินจมในสต๊อก
                </div>
              </div>

              <button
                onClick={loadPlants}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99]"
              >
                {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
              </button>
            </div>
          </div>

          {err ? (
            <div className="mb-4 rounded-[24px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {err}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="ไม้พร้อมขาย"
              value={stats.totalCount.toLocaleString('th-TH')}
              suffix="ต้น"
              tint="rose"
            />
            <StatCard
              title="เงินจมในสต๊อก"
              value={money(stats.totalCost)}
              suffix="บาท"
              tint="emerald"
            />
            <StatCard
              title="ทุนเฉลี่ยต่อต้น"
              value={money(stats.avgCost)}
              suffix="บาท"
              tint="sky"
            />
            <StatCard
              title="ค้างเกิน 30 วัน"
              value={stats.over30.toLocaleString('th-TH')}
              suffix="ต้น"
              tint="cream"
            />
            <StatCard
              title="ค้างเกิน 90 วัน"
              value={stats.over90.toLocaleString('th-TH')}
              suffix="ต้น"
              tint="lilac"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <Card tint="default">
              <div className="mb-4">
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">
                  ค้นหา / กรอง / เรียง
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">
                  ใช้หาต้นไม้ที่พร้อมขาย ดูรหัสกรณีป้ายหลุด และดูว่าต้นไหนค้างนาน
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className={inputClass}
                  placeholder="ค้นหารหัสหรือชื่อไม้"
                />

                <select
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">อายุทั้งหมด</option>
                  <option value="lt30">น้อยกว่า 30 วัน</option>
                  <option value="30to90">30 - 90 วัน</option>
                  <option value="gt90">มากกว่า 90 วัน</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={inputClass}
                >
                  <option value="days_desc">ค้างนานสุดก่อน</option>
                  <option value="days_asc">เข้าใหม่สุดก่อน</option>
                  <option value="cost_desc">ทุนมากสุดก่อน</option>
                  <option value="cost_asc">ทุนน้อยสุดก่อน</option>
                  <option value="code_asc">เรียงตามรหัส</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Pill tone="slate">แสดง {filteredPlants.length} รายการ</Pill>
                <Pill tone="emerald">เกิน 30 วัน {stats.over30}</Pill>
                <Pill tone="rose">เกิน 90 วัน {stats.over90}</Pill>
              </div>
            </Card>

            <TextCard
              title="AI วิเคราะห์สต๊อก"
              text={aiStockText}
              tint="sky"
              icon="◎"
            />
          </div>

          <div className="mt-3">
            <Card tint="default" className="p-0">
              <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold tracking-tight text-slate-900">
                      ไม้พร้อมขายทั้งหมด
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500">
                      ตารางแบบ compact เพื่อดูได้หลายรายการในหน้าเดียว
                    </div>
                  </div>
                </div>

                {!topCostPlants.length ? null : (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {topCostPlants.map((p, idx) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-2 rounded-full border border-white/85 bg-white/84 px-3 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        <span className="text-slate-400">#{idx + 1}</span>
                        <span className="font-mono">{p.plant_code}</span>
                        <span>{money(p.cost)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {loading ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                    กำลังโหลด...
                  </div>
                ) : !filteredPlants.length ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                    ไม่พบไม้พร้อมขายตามเงื่อนไข
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto xl:block">
                      <table className="w-full border-separate border-spacing-0">
                        <thead>
                          <tr>
                            <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">
                              รหัส
                            </th>
                            <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">
                              ชื่อไม้
                            </th>
                            <th className="border-b border-slate-100 px-3 py-3 text-right text-xs font-semibold text-slate-400">
                              ทุน
                            </th>
                            <th className="border-b border-slate-100 px-3 py-3 text-right text-xs font-semibold text-slate-400">
                              ถือมาแล้ว
                            </th>
                            <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">
                              สถานะ
                            </th>
                            <th className="border-b border-slate-100 px-3 py-3 text-right text-xs font-semibold text-slate-400">
                              จัดการ
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPlants.map((p) => (
                            <tr key={p.id}>
                              <td className="border-b border-slate-100 px-3 py-3 font-mono text-sm font-bold text-slate-900">
                                {p.plant_code}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-700">
                                {p.name || '-'}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-right text-sm font-bold text-slate-900">
                                {money(p.cost)}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-right text-sm text-slate-700">
                                {p.days_in_stock} วัน
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-sm">
                                <Pill tone={ageTone(p.days_in_stock)}>
                                  {ageLabel(p.days_in_stock)}
                                </Pill>
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-right">
                                <button
                                  type="button"
                                  className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                  onClick={() => {
                                    window.alert(`ช่วงที่ 1: ดูข้อมูลก่อน\nรหัสที่เลือก: ${p.plant_code}\nช่วงที่ 2 ค่อยผูกปุ่มนี้กลับไปหน้าขาย`)
                                  }}
                                >
                                  เลือกไปขาย
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-2 xl:hidden">
                      {filteredPlants.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-[22px] border border-white/85 bg-white/84 px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-mono text-sm font-bold text-slate-900">
                                {p.plant_code}
                              </div>
                              <div className="mt-1 truncate text-sm text-slate-600">{p.name || '-'}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Pill tone={ageTone(p.days_in_stock)}>
                                  {ageLabel(p.days_in_stock)} • {p.days_in_stock} วัน
                                </Pill>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-xs text-slate-500">ทุน</div>
                              <div className="mt-1 text-sm font-bold text-slate-900">
                                {money(p.cost)}
                              </div>
                              <button
                                type="button"
                                className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                onClick={() => {
                                  window.alert(`ช่วงที่ 1: ดูข้อมูลก่อน\nรหัสที่เลือก: ${p.plant_code}\nช่วงที่ 2 ค่อยผูกปุ่มนี้กลับไปหน้าขาย`)
                                }}
                              >
                                เลือกไปขาย
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}