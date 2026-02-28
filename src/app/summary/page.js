'use client'

import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

const money = (n) => Number(n || 0).toLocaleString('th-TH')

function pad2(n) {
  return String(n).padStart(2, '0')
}
function monthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}
function startOfMonth(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map((x) => Number(x))
  return new Date(y, m - 1, 1)
}
function endOfMonthExclusive(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map((x) => Number(x))
  return new Date(y, m, 1)
}
function toISODate(d) {
  return d.toISOString().slice(0, 10)
}
function addDays(d, days) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}
function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function pickRow(data) {
  const row = Array.isArray(data) ? data[0] : data
  return row || null
}

export default function SummaryPage() {
  const supabase = supabaseBrowser()

  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // main (month)
  const [sumMonth, setSumMonth] = useState(null)

  // KPI Today (reuse get_month_summary with today range)
  const [sumToday, setSumToday] = useState(null)

  // optional: last 30 days series (needs RPC get_daily_profit_series)
  const [series30, setSeries30] = useState([])
  const [series30Note, setSeries30Note] = useState('')

  // optional: top profit items (needs RPC get_top_profit_items)
  const [top10, setTop10] = useState([])
  const [top10Note, setTop10Note] = useState('')

  const rangeMonth = useMemo(() => {
    const s = startOfMonth(month)
    const e = endOfMonthExclusive(month)
    return { start: toISODate(s), end: toISODate(e) } // end exclusive
  }, [month])

  const rangeToday = useMemo(() => {
    const s = startOfDay(new Date())
    const e = startOfDay(addDays(s, 1))
    return { start: toISODate(s), end: toISODate(e) }
  }, [])

  const range30 = useMemo(() => {
    const end = startOfDay(addDays(new Date(), 1)) // exclusive: tomorrow 00:00
    const start = startOfDay(addDays(end, -30))
    return { start: toISODate(start), end: toISODate(end) }
  }, [])

  async function rpcSafe(name, args) {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
  }

  async function loadAll() {
    setErr('')
    setLoading(true)

    try {
      // 1) เดือน (ของเดิม) ✅
      {
        const data = await rpcSafe('get_month_summary', {
          p_start: rangeMonth.start,
          p_end: rangeMonth.end,
        })
        setSumMonth(pickRow(data))
      }

      // 2) วันนี้ (ใช้ get_month_summary เดิมได้เลย ✅)
      {
        const data = await rpcSafe('get_month_summary', {
          p_start: rangeToday.start,
          p_end: rangeToday.end,
        })
        setSumToday(pickRow(data))
      }

      // 3) กราฟ 30 วัน (optional) — ถ้ายังไม่มี RPC ก็ไม่พัง
      try {
        const data = await rpcSafe('get_daily_profit_series', {
          p_start: range30.start,
          p_end: range30.end,
        })
        const rows = Array.isArray(data) ? data : []
        setSeries30(rows)
        setSeries30Note('')
      } catch (e) {
        setSeries30([])
        setSeries30Note(
          'ยังไม่ได้เปิดใช้กราฟ 30 วัน (ต้องสร้าง RPC: get_daily_profit_series ใน Supabase)'
        )
      }

      // 4) Top 10 (optional) — ถ้ายังไม่มี RPC ก็ไม่พัง
      try {
        const data = await rpcSafe('get_top_profit_items', {
          p_start: rangeMonth.start,
          p_end: rangeMonth.end,
          p_limit: 10,
        })
        const rows = Array.isArray(data) ? data : []
        setTop10(rows)
        setTop10Note('')
      } catch (e) {
        setTop10([])
        setTop10Note(
          'ยังไม่ได้เปิดใช้ Top 10 (ต้องสร้าง RPC: get_top_profit_items ใน Supabase)'
        )
      }
    } catch (e) {
      setErr(e.message || String(e))
      setSumMonth(null)
      setSumToday(null)
      setSeries30([])
      setTop10([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeMonth.start, rangeMonth.end])

  function prevMonth() {
    const d = startOfMonth(month)
    d.setMonth(d.getMonth() - 1)
    setMonth(monthKey(d))
  }
  function nextMonth() {
    const d = startOfMonth(month)
    d.setMonth(d.getMonth() + 1)
    setMonth(monthKey(d))
  }

  const m = normalizeSummary(sumMonth)
  const t = normalizeSummary(sumToday)

  return (
    <AppShell title="สรุป (Summary)">
      <div style={wrap}>
        {/* Header controls */}
        <div style={headerRow}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>เลือกเดือน</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={prevMonth} style={btnGhost} disabled={loading}>◀ เดือนก่อน</button>

              <div style={{ width: 220 }}>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={input}
                />
              </div>

              <button onClick={nextMonth} style={btnGhost} disabled={loading}>เดือนถัดไป ▶</button>

              <button onClick={loadAll} style={btnPrimary} disabled={loading}>
                {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              ช่วงข้อมูลเดือน: <b>{rangeMonth.start}</b> - <b>{rangeMonth.end}</b>
              {' '}| วันนี้: <b>{rangeToday.start}</b>
            </div>
          </div>
        </div>

        {err ? <pre style={errBox}>{err}</pre> : null}

        {/* KPI Row: Today + Month */}
        <div style={kpiGrid}>
          <KpiCard title="ยอดขายวันนี้" value={money(t.totalSales)} sub="บาท" />
          <KpiCard title="กำไรวันนี้" value={money(t.netProfit)} sub="บาท" emphasize={t.netProfit > 0} />

          <KpiCard title="ยอดขายเดือนนี้" value={money(m.totalSales)} sub="บาท" />
          <KpiCard title="กำไรเดือนนี้" value={money(m.netProfit)} sub="บาท" emphasize={m.netProfit > 0} />
        </div>

        {/* Month Breakdown */}
        <Card title="ภาพรวมรายเดือน">
          <div style={miniGrid}>
            <Mini label="ยอดขายรวม">{money(m.totalSales)}</Mini>
            <Mini label="ต้นทุนรวม">{money(m.totalCost)}</Mini>
            <Mini label="กำไรจากการขาย (รวม)">{money(m.grossProfit)}</Mini>
            <Mini label="ค่าใช้จ่ายรวม">{money(m.totalExpenses)}</Mini>
          </div>
        </Card>

        {/* Net + Tax */}
        <Card title="กำไรสุทธิจริง + เกราะภาษี 15%">
          <div style={{ display: 'grid', gap: 10 }}>
            <BigLine
              label="กำไรสุทธิ (กำไรจากการขาย - ค่าใช้จ่าย)"
              value={money(m.netProfit)}
            />
            <BigLine
              label="กันภาษี 15% (เฉพาะกำไรสุทธิที่เป็นบวก)"
              value={money(m.tax15)}
            />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />
            <BigLine
              label="เหลือหลังกันภาษี (เงินใช้/เงินลงทุนได้จริง)"
              value={money(m.afterTax)}
              emphasize
            />
          </div>
        </Card>

        {/* 30 days chart */}
        <Card
          title="แนวโน้มกำไร 30 วันล่าสุด"
          right={series30Note ? <span style={note}>{series30Note}</span> : null}
        >
          {series30?.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <SimpleBarChart
                rows={series30}
                xKey="d"
                yKey="net_profit"
              />
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                ช่วงข้อมูล: <b>{range30.start}</b> - <b>{range30.end}</b>
              </div>
            </div>
          ) : (
            <EmptyHint text={series30Note || 'ยังไม่มีข้อมูลกราฟ 30 วัน'} />
          )}
        </Card>

        {/* Top 10 */}
        <Card
          title="Top 10 รายการกำไรสูงสุด (เดือนที่เลือก)"
          right={top10Note ? <span style={note}>{top10Note}</span> : null}
        >
          {top10?.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>อันดับ</th>
                    <th style={th}>รายการ</th>
                    <th style={thRight}>ยอดขาย</th>
                    <th style={thRight}>กำไร</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((r, idx) => (
                    <tr key={idx} style={tr}>
                      <td style={td}>{idx + 1}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 900 }}>{r.name || r.item_name || r.plant_name || '-'}</div>
                        {r.note ? <div style={{ fontSize: 12, opacity: 0.7 }}>{r.note}</div> : null}
                      </td>
                      <td style={tdRight}>{money(r.total_sales || r.sales || 0)}</td>
                      <td style={tdRight}>{money(r.profit || r.net_profit || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyHint text={top10Note || 'ยังไม่มีข้อมูล Top 10'} />
          )}
        </Card>
      </div>
    </AppShell>
  )
}

function normalizeSummary(sum) {
  const totalSales = Number(sum?.total_sales || 0)
  const totalCost = Number(sum?.total_cost || 0)
  const grossProfit = Number(sum?.gross_profit || 0)
  const totalExpenses = Number(sum?.total_expenses || 0)
  const netProfit = Number(sum?.net_profit || 0)
  const tax15 = Number(sum?.tax_15 || 0)
  const afterTax = Number(sum?.after_tax || 0)

  return { totalSales, totalCost, grossProfit, totalExpenses, netProfit, tax15, afterTax }
}

function Card({ title, right, children }) {
  return (
    <div style={card}>
      <div style={cardHead}>
        <div style={{ fontWeight: 950 }}>{title}</div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  )
}

function KpiCard({ title, value, sub, emphasize }) {
  return (
    <div style={kpiCard}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.3 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{sub}</div>
      </div>
      <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: '60%',
            borderRadius: 99,
            background: emphasize ? 'rgba(31,138,91,0.85)' : 'rgba(255,255,255,0.25)',
          }}
        />
      </div>
    </div>
  )
}

function Mini({ label, children }) {
  return (
    <div style={miniCard}>
      <div style={{ fontSize: 12, opacity: 0.82 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 950 }}>{children}</div>
    </div>
  )
}

function BigLine({ label, value, hint, emphasize }) {
  return (
    <div style={lineCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 950 }}>{label}</div>
        <div style={{ fontWeight: 950, fontSize: emphasize ? 22 : 18 }}>{value}</div>
      </div>
      {hint ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{hint}</div> : null}
    </div>
  )
}

function EmptyHint({ text }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.18)', opacity: 0.85 }}>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  )
}

/**
 * Very light-weight SVG bar chart.
 * rows: [{ d: '2026-03-01', net_profit: 1234 }, ...]
 */
function SimpleBarChart({ rows, xKey, yKey }) {
  const cleaned = (rows || [])
    .map((r) => ({
      x: r?.[xKey] ?? r?.d ?? '',
      y: Number(r?.[yKey] ?? 0),
    }))
    .slice(-30)

  const maxAbs = Math.max(1, ...cleaned.map((p) => Math.abs(p.y)))
  const w = 960
  const h = 180
  const pad = 10
  const baseY = h / 2
  const barW = Math.max(4, Math.floor((w - pad * 2) / cleaned.length) - 2)

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', minWidth: 720, height: 200, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.15)' }}
      >
        {/* baseline */}
        <line x1={0} y1={baseY} x2={w} y2={baseY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

        {cleaned.map((p, i) => {
          const x = pad + i * (barW + 2)
          const barH = Math.round((Math.abs(p.y) / maxAbs) * (h / 2 - 18))
          const y = p.y >= 0 ? baseY - barH : baseY
          const fill = p.y >= 0 ? 'rgba(31,138,91,0.80)' : 'rgba(255,120,120,0.70)'

          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="3" fill={fill} />
              {/* show only few x labels to avoid clutter */}
              {i % 6 === 0 ? (
                <text x={x} y={h - 6} fontSize="10" fill="rgba(255,255,255,0.65)">
                  {String(p.x).slice(5)}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, opacity: 0.8, marginTop: 8 }}>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(31,138,91,0.80)' }} />
          กำไร (+)
        </span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,120,120,0.70)' }} />
          ขาดทุน (-)
        </span>
      </div>
    </div>
  )
}

/* ===== styles ===== */
const wrap = {
  maxWidth: 1040,
  margin: '0 auto',
  display: 'grid',
  gap: 12,
}

const headerRow = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 18,
  padding: 14,
}

const card = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 18,
  padding: 14,
}

const cardHead = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 10,
  marginBottom: 10,
}

const note = {
  fontSize: 12,
  opacity: 0.7,
  border: '1px solid rgba(255,255,255,0.12)',
  padding: '6px 10px',
  borderRadius: 999,
}

const kpiGrid = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
}

const kpiCard = {
  background: 'rgba(0,0,0,0.15)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 18,
  padding: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
}

const miniGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
}

const miniCard = {
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  padding: 12,
  background: 'rgba(0,0,0,0.10)',
}

const lineCard = {
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  padding: 14,
  background: 'rgba(0,0,0,0.10)',
}

const input = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(0,0,0,0.18)',
  color: 'white',
  outline: 'none',
}

const btnPrimary = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 950,
  cursor: 'pointer',
}

const btnGhost = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: 'white',
  fontWeight: 950,
  cursor: 'pointer',
}

const errBox = {
  marginTop: 10,
  color: '#ffb4b4',
  whiteSpace: 'pre-wrap',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  padding: 10,
}

const table = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  overflow: 'hidden',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.12)',
}

const th = {
  textAlign: 'left',
  fontSize: 12,
  opacity: 0.85,
  padding: '10px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.10)',
}

const thRight = {
  ...th,
  textAlign: 'right',
}

const tr = {
  borderBottom: '1px solid rgba(255,255,255,0.08)',
}

const td = {
  padding: '10px 10px',
  fontSize: 13,
  verticalAlign: 'top',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

const tdRight = {
  ...td,
  textAlign: 'right',
  whiteSpace: 'nowrap',
}