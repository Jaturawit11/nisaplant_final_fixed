'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function money(n) {
  return Number(n || 0).toLocaleString('th-TH')
}

function daysDiffFromToday(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null

  const now = new Date()
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor((startNow - startD) / (1000 * 60 * 60 * 24))
}

function agingBucket(days) {
  if (days === null || days === undefined || Number.isNaN(days)) return 'unknown'
  if (days <= 7) return '0-7'
  if (days <= 30) return '8-30'
  return '31+'
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald: 'border border-emerald-200/90 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200/90 bg-amber-50 text-amber-700',
    rose: 'border border-rose-200/90 bg-rose-50 text-rose-700',
    slate: 'border border-slate-200/90 bg-white text-slate-600',
    sky: 'border border-sky-200/90 bg-sky-50 text-sky-700',
    lilac: 'border border-violet-200/90 bg-violet-50 text-violet-700',
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

function ShellCard({ title, subtitle, tint = 'default', right, children, className = '' }) {
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
      <div className="relative z-10">
        {(title || subtitle || right) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? (
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</div>
              ) : null}
            </div>
            {right}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function MiniStat({ label, value, tone = 'default' }) {
  const toneMap = {
    default: 'border-white/85 bg-white/82',
    rose: 'border-rose-100/90 bg-white/72',
    sky: 'border-sky-100/90 bg-white/72',
    emerald: 'border-emerald-100/90 bg-white/72',
    cream: 'border-amber-100/90 bg-white/72',
    lilac: 'border-violet-100/90 bg-white/72',
  }

  return (
    <div
      className={cn(
        'rounded-[22px] border p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
        toneMap[tone] || toneMap.default
      )}
    >
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

function statusTone(payStatus) {
  if (payStatus === 'partial') return 'amber'
  if (payStatus === 'unpaid') return 'rose'
  return 'slate'
}

function bankTone(bank) {
  if (bank === 'GSB') return 'rose'
  if (bank === 'KTB') return 'sky'
  if (bank === 'KBANK') return 'emerald'
  return 'slate'
}

function agingTone(bucket) {
  if (bucket === '0-7') return 'emerald'
  if (bucket === '8-30') return 'amber'
  if (bucket === '31+') return 'rose'
  return 'slate'
}

export default function ARPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')

  const monthStart = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01`
  }, [])

  async function load() {
    setErr('')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id,invoice_no,sale_date,paid_date,customer_name,total_price,total_profit,pay_status,ship_status,bank')
        .in('pay_status', ['unpaid', 'partial'])
        .order('sale_date', { ascending: false })
        .limit(300)

      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setErr(e?.message || 'โหลดลูกหนี้ไม่สำเร็จ')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const days = daysDiffFromToday(r.sale_date)
      const bucket = agingBucket(days)
      return {
        ...r,
        arDays: days,
        arBucket: bucket,
      }
    })
  }, [rows])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return enriched
    return enriched.filter((r) => {
      return (
        String(r.invoice_no || '').toLowerCase().includes(s) ||
        String(r.customer_name || '').toLowerCase().includes(s) ||
        String(r.bank || '').toLowerCase().includes(s) ||
        String(r.pay_status || '').toLowerCase().includes(s)
      )
    })
  }, [enriched, q])

  const summary = useMemo(() => {
    const total = filtered.reduce((sum, r) => sum + Number(r.total_price || 0), 0)
    const cnt = filtered.length

    const unpaidRows = filtered.filter((r) => r.pay_status === 'unpaid')
    const partialRows = filtered.filter((r) => r.pay_status === 'partial')

    const unpaidTotal = unpaidRows.reduce((sum, r) => sum + Number(r.total_price || 0), 0)
    const partialTotal = partialRows.reduce((sum, r) => sum + Number(r.total_price || 0), 0)

    const aging = {
      '0-7': { count: 0, total: 0 },
      '8-30': { count: 0, total: 0 },
      '31+': { count: 0, total: 0 },
      unknown: { count: 0, total: 0 },
    }

    const byBank = {}

    for (const r of filtered) {
      const amt = Number(r.total_price || 0)
      const b = r.bank || 'UNKNOWN'
      if (!byBank[b]) {
        byBank[b] = { bank: b, count: 0, total: 0, unpaid: 0, partial: 0 }
      }
      byBank[b].count += 1
      byBank[b].total += amt
      if (r.pay_status === 'unpaid') byBank[b].unpaid += amt
      if (r.pay_status === 'partial') byBank[b].partial += amt

      const bucket = r.arBucket || 'unknown'
      aging[bucket].count += 1
      aging[bucket].total += amt
    }

    const bankRows = Object.values(byBank).sort((a, b) => {
      const order = { GSB: 1, KTB: 2, KBANK: 3, UNKNOWN: 99 }
      return (order[a.bank] || 50) - (order[b.bank] || 50)
    })

    return {
      total,
      cnt,
      unpaidCnt: unpaidRows.length,
      partialCnt: partialRows.length,
      unpaidTotal,
      partialTotal,
      aging,
      bankRows,
    }
  }, [filtered])

  return (
    <AppShell title="ลูกหนี้ (A/R)">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant A/R
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                ลูกหนี้ (A/R)
              </div>
              <div className="mt-1 text-sm leading-relaxed text-slate-500">
                แสดงบิลที่ค้างชำระแบบ unpaid / partial พร้อมมุมมองตามธนาคารและอายุลูกหนี้
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="sky">เริ่มเดือน {monthStart}</Pill>
              <Pill tone="rose">ค้าง {summary.cnt} บิล</Pill>
            </div>
          </div>

          {err ? (
            <div className="rounded-[24px] border border-rose-100/90 bg-rose-50/92 px-4 py-3 text-sm font-semibold text-rose-700">
              {err}
            </div>
          ) : null}

          <ShellCard
            title="ค้นหา / ภาพรวม"
            subtitle="ค้นหาจากเลขบิล ลูกค้า ธนาคาร หรือสถานะ"
            tint="default"
            right={
              <button
                onClick={load}
                className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
              </button>
            }
          >
            <div className="grid gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา: invoice / ลูกค้า / bank / pay status"
                className="h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="ค้างทั้งหมด" value={`${summary.cnt} บิล`} tone="default" />
                <MiniStat label="ยอดลูกหนี้รวม" value={`${money(summary.total)} บาท`} tone="rose" />
                <MiniStat label="unpaid" value={`${summary.unpaidCnt} บิล / ${money(summary.unpaidTotal)}`} tone="rose" />
                <MiniStat label="partial" value={`${summary.partialCnt} บิล / ${money(summary.partialTotal)}`} tone="amber" />
              </div>
            </div>
          </ShellCard>

          <ShellCard
            title="อายุลูกหนี้"
            subtitle="ช่วยแยกว่าค้างใหม่หรือค้างนาน"
            tint="cream"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat
                label="0–7 วัน"
                value={`${summary.aging['0-7'].count} / ${money(summary.aging['0-7'].total)}`}
                tone="emerald"
              />
              <MiniStat
                label="8–30 วัน"
                value={`${summary.aging['8-30'].count} / ${money(summary.aging['8-30'].total)}`}
                tone="cream"
              />
              <MiniStat
                label="31+ วัน"
                value={`${summary.aging['31+'].count} / ${money(summary.aging['31+'].total)}`}
                tone="rose"
              />
              <MiniStat
                label="ไม่ทราบวัน"
                value={`${summary.aging.unknown.count} / ${money(summary.aging.unknown.total)}`}
                tone="default"
              />
            </div>
          </ShellCard>

          <ShellCard
            title="ยอดรวมลูกหนี้ตามธนาคาร"
            subtitle="ช่วยตามเงินและดูความเสี่ยงแยกตามบัญชี"
            tint="sky"
          >
            {summary.bankRows.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                ยังไม่มีข้อมูล
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {summary.bankRows.map((b) => (
                  <div
                    key={b.bank}
                    className="rounded-[24px] border border-white/85 bg-white/82 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold tracking-tight text-slate-900">{b.bank}</div>
                        <div className="mt-1 text-xs text-slate-500">{b.count} บิล</div>
                      </div>
                      <Pill tone={bankTone(b.bank)}>{b.bank}</Pill>
                    </div>

                    <div className="mt-4 text-[26px] font-bold tracking-tight text-slate-900">
                      {money(b.total)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">ยอดลูกหนี้รวม</div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill tone="rose">unpaid {money(b.unpaid)}</Pill>
                      <Pill tone="amber">partial {money(b.partial)}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ShellCard>

          <ShellCard
            title="รายการลูกหนี้"
            subtitle="แสดงบิลที่ค้างทั้งหมด พร้อมสถานะ อายุลูกหนี้ และธนาคาร"
            tint="default"
            right={<Pill tone="slate">{filtered.length} รายการ</Pill>}
          >
            <div className="grid gap-2">
              {loading ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                  กำลังโหลด...
                </div>
              ) : null}

              {!loading && !filtered.length ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                  ไม่มีลูกหนี้ค้าง
                </div>
              ) : null}

              {filtered.map((x) => (
                <div
                  key={x.id}
                  className="rounded-[24px] border border-white/85 bg-white/82 px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-extrabold tracking-tight text-slate-900">
                          {x.invoice_no || '-'}
                        </div>
                        <Pill tone={statusTone(x.pay_status)}>{x.pay_status || '-'}</Pill>
                        <Pill tone={agingTone(x.arBucket)}>
                          {x.arBucket === 'unknown'
                            ? 'ไม่ทราบอายุ'
                            : `${x.arBucket} วัน`}
                        </Pill>
                        <Pill tone={bankTone(x.bank)}>{x.bank || '-'}</Pill>
                      </div>

                      <div className="mt-2 text-sm text-slate-600">
                        {x.customer_name || '-'}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>วันที่ขาย: {x.sale_date || '-'}</span>
                        <span>วันที่รับเงิน: {x.paid_date || '-'}</span>
                        <span>จัดส่ง: {x.ship_status || '-'}</span>
                        <span>
                          อายุลูกหนี้:{' '}
                          {x.arDays === null || x.arDays === undefined ? '-' : `${x.arDays} วัน`}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-left lg:text-right">
                      <div className="text-[22px] font-bold tracking-tight text-slate-900">
                        {money(x.total_price || 0)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        กำไร {money(x.total_profit || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ShellCard>
        </div>
      </div>
    </AppShell>
  )
}