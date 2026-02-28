'use client'

import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

const money = (n) => Number(n || 0).toLocaleString()

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
  return new Date(y, m, 1) // next month day 1
}
function toISODate(d) {
  return d.toISOString().slice(0, 10)
}

export default function SummaryPage() {
  const supabase = supabaseBrowser()

  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sum, setSum] = useState(null)

  const range = useMemo(() => {
    const s = startOfMonth(month)
    const e = endOfMonthExclusive(month)
    return { start: toISODate(s), end: toISODate(e) } // end exclusive
  }, [month])

  async function load() {
    setErr('')
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_month_summary', {
        p_start: range.start,
        p_end: range.end,
      })
      if (error) throw error

      // supabase rpc returns array for set-returning function
      const row = Array.isArray(data) ? data[0] : data
      setSum(row || null)
    } catch (e) {
      setErr(e.message || String(e))
      setSum(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end])

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

  const totalSales = Number(sum?.total_sales || 0)
  const totalCost = Number(sum?.total_cost || 0)
  const grossProfit = Number(sum?.gross_profit || 0)
  const totalExpenses = Number(sum?.total_expenses || 0)
  const netProfit = Number(sum?.net_profit || 0)
  const tax15 = Number(sum?.tax_15 || 0)
  const afterTax = Number(sum?.after_tax || 0)

  return (
    <AppShell title="สรุป (Summary)">
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 12 }}>
        <Card title="ช่วงเวลา">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={prevMonth} style={btnGhost} disabled={loading}>◀ เดือนก่อน</button>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>เลือกเดือน</div>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={input}
              />
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                ช่วงข้อมูล: <b>{range.start}</b> - <b>{range.end}</b>
              </div>
            </div>

            <button onClick={nextMonth} style={btnGhost} disabled={loading}>เดือนถัดไป ▶</button>
            <button onClick={load} style={btnPrimary} disabled={loading}>
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>

          {err ? <pre style={errBox}>{err}</pre> : null}
        </Card>

        <Card title="ภาพรวมรายเดือน">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Mini label="ยอดขายรวม">{money(totalSales)}</Mini>
            <Mini label="ต้นทุนรวม">{money(totalCost)}</Mini>
            <Mini label="กำไรจากการขาย (รวม)">{money(grossProfit)}</Mini>
            <Mini label="ค่าใช้จ่ายรวม">{money(totalExpenses)}</Mini>
          </div>
        </Card>

        <Card title="กำไรสุทธิจริง + เกราะภาษี 15%">
          <div style={{ display: 'grid', gap: 10 }}>
            <BigLine
              label="กำไรสุทธิ (กำไรจากการขาย - ค่าใช้จ่าย)"
              value={money(netProfit)}
            />
            <BigLine
              label="กันภาษี 15% (เฉพาะกำไรสุทธิที่เป็นบวก)"
              value={money(tax15)}
            />
            <hr style={{ opacity: 0.2 }} />
            <BigLine
              label="เหลือหลังกันภาษี (เงินใช้/เงินลงทุนได้จริง)"
              value={money(afterTax)}
              emphasize
            />
          </div>
        </Card>

      </div>
    </AppShell>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Mini({ label, children }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{children}</div>
    </div>
  )
}

function BigLine({ label, value, hint, emphasize }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900 }}>{label}</div>
        <div style={{ fontWeight: 900, fontSize: emphasize ? 22 : 18 }}>{value}</div>
      </div>
      {hint ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{hint}</div> : null}
    </div>
  )
}

const input = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 14,
  border: '1px solid rgba(0,0,0,0.2)',
}

const btnPrimary = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const btnGhost = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: 'white',
  fontWeight: 900,
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