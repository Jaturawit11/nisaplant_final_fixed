'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function ClosingPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [summary, setSummary] = useState({
    monthSales: 0,
    monthProfit: 0,
    monthExpenses: 0,
    monthNet: 0,
  })

  const taxRate = 0.15
  const myRate = 0.10
  const partnerRate = 0.20
  const salaryCap = 60000

  const { monthStart, yyyymm } = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return { monthStart: `${y}-${m}-01`, yyyymm: `${y}${m}` }
  }, [])

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2200)
  }

  const calc = useMemo(() => {
    const net = Number(summary.monthNet || 0)
    const taxReserve = net > 0 ? net * taxRate : 0
    const afterTax = Math.max(net - taxReserve, 0)

    const rawMe = afterTax * myRate
    const rawPartner = afterTax * partnerRate
    const rawTotal = rawMe + rawPartner

    let me = rawMe
    let partner = rawPartner
    let total = rawTotal

    if (rawTotal > salaryCap) {
      const k = salaryCap / rawTotal
      me = Math.floor(rawMe * k)
      partner = Math.floor(rawPartner * k)
      total = me + partner
    }

    return { taxReserve, me, partner, total }
  }, [summary.monthNet])

  async function loadMonth() {
    setErr('')
    setOk('')
    setLoading(true)
    try {
      const invReq = supabase
        .from('invoices')
        .select('total_price,total_profit,sale_date')
        .gte('sale_date', monthStart)
        .limit(5000)

      const expReq = supabase
        .from('expenses')
        .select('amount,expense_date')
        .gte('expense_date', monthStart)
        .limit(5000)

      const [invRes, expRes] = await Promise.all([invReq, expReq])
      if (invRes.error) throw invRes.error
      if (expRes.error) throw expRes.error

      const monthSales = (invRes.data || []).reduce((s, r) => s + Number(r.total_price || 0), 0)
      const monthProfit = (invRes.data || []).reduce((s, r) => s + Number(r.total_profit || 0), 0)
      const monthExpenses = (expRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0)
      const monthNet = monthProfit - monthExpenses

      setSummary({ monthSales, monthProfit, monthExpenses, monthNet })
      toastOk('คำนวณเดือนนี้แล้ว')
    } catch (e) {
      setErr(e?.message || 'คำนวณไม่สำเร็จ')
    }
    setLoading(false)
  }

  async function saveClosing() {
    setErr('')
    setOk('')
    setSaving(true)
    try {
      const payload = {
        month_yyyymm: yyyymm,
        month_start: monthStart,
        month_sales: summary.monthSales,
        month_profit: summary.monthProfit,
        month_expenses: summary.monthExpenses,
        month_net: summary.monthNet,
        tax_reserve: calc.taxReserve,
        salary_me: calc.me,
        salary_partner: calc.partner,
        salary_total: calc.total,
      }

      const { error } = await supabase.from('month_closings').insert([payload])
      if (error) throw error

      toastOk('ปิดเดือนและบันทึก Snapshot แล้ว')
    } catch (e) {
      setErr(e?.message || 'บันทึกปิดเดือนไม่สำเร็จ')
    }
    setSaving(false)
  }

  useEffect(() => {
    loadMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppShell title="ปิดเดือน (Snapshot)">
      <div style={wrap}>
        {err ? <Banner type="err">{err}</Banner> : null}
        {ok ? <Banner type="ok">{ok}</Banner> : null}

        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              เดือน <b>{yyyymm}</b> • เริ่ม <b>{monthStart}</b> • ปิดเดือน = บันทึก snapshot 1 ครั้ง/เดือน
            </div>
            <button onClick={loadMonth} style={secondaryBtn} disabled={loading}>
              {loading ? 'กำลังคำนวณ...' : 'คำนวณใหม่'}
            </button>
          </div>

          <div style={grid4}>
            <Mini label="ยอดขายเดือนนี้">{fmt(summary.monthSales)} บาท</Mini>
            <Mini label="กำไรขั้นต้นเดือนนี้">{fmt(summary.monthProfit)} บาท</Mini>
            <Mini label="ค่าใช้จ่ายเดือนนี้">{fmt(summary.monthExpenses)} บาท</Mini>
            <Mini label="กำไรสุทธิ (net)">{fmt(summary.monthNet)} บาท</Mini>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <Mini label="กันภาษี 15%">{fmt(calc.taxReserve)} บาท</Mini>
            <Mini label="เงินเดือนผัว">{fmt(calc.me)} บาท</Mini>
            <Mini label="เงินเดือนเมีย">{fmt(calc.partner)} บาท</Mini>
            <Mini label="รวมเงินเดือน (cap 60,000)">{fmt(calc.total)} บาท</Mini>
          </div>

          <button onClick={saveClosing} disabled={saving || loading} style={{ ...primaryBtn, width: '100%', height: 48, marginTop: 14 }}>
            {saving ? 'กำลังบันทึก...' : 'ปิดเดือนและบันทึก Snapshot'}
          </button>

        </div>
      </div>
    </AppShell>
  )
}

function fmt(n) {
  return Number(n || 0).toLocaleString()
}

function Banner({ type, children }) {
  const bg = type === 'err' ? 'rgba(255,0,0,0.12)' : 'rgba(0,255,120,0.10)'
  const bd = type === 'err' ? 'rgba(255,0,0,0.25)' : 'rgba(0,255,120,0.22)'
  return <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 14, padding: 12 }}>{children}</div>
}

function Mini({ label, children }) {
  return (
    <div style={miniBox}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 950, marginTop: 4 }}>{children}</div>
    </div>
  )
}

const wrap = { display: 'grid', gap: 12, maxWidth: 1100, margin: '0 auto', paddingBottom: 30 }
const panel = { borderRadius: 18, padding: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.06)' }
const miniBox = { borderRadius: 14, padding: 12, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)' }
const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 12 }
const note = { fontSize: 12, opacity: 0.75, marginTop: 10 }
const primaryBtn = { height: 44, padding: '0 16px', borderRadius: 14, border: 'none', background: '#1f8a5b', color: 'white', fontWeight: 950, cursor: 'pointer' }
const secondaryBtn = { height: 44, padding: '0 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 900, cursor: 'pointer' }