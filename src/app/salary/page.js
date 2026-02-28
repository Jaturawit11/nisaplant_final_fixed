'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function SalaryPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)

  const [monthNet, setMonthNet] = useState(0) // กำไรสุทธิเดือนนี้ = total_profit - expenses
  const taxRate = 0.15

  const myRate = 0.10
  const partnerRate = 0.20
  const salaryCap = 60000

  const monthStart = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01`
  }, [])

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2000)
  }

  async function load() {
    setErr('')
    setOk('')
    setLoading(true)

    try {
      // อ่านข้อมูลเดิม: invoices + expenses ของเดือนนี้
      const invReq = supabase
        .from('invoices')
        .select('total_profit,sale_date')
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

      const profit = (invRes.data || []).reduce((s, r) => s + Number(r.total_profit || 0), 0)
      const expenses = (expRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0)
      const net = profit - expenses

      setMonthNet(net)
      toastOk('อัปเดตแล้ว')
    } catch (e) {
      setErr(e?.message || 'โหลดข้อมูลไม่สำเร็จ')
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const calc = useMemo(() => {
    const net = Number(monthNet || 0)
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

    return {
      net,
      taxReserve,
      afterTax,
      rawMe,
      rawPartner,
      rawTotal,
      me,
      partner,
      total,
      capHit: rawTotal > salaryCap,
    }
  }, [monthNet])

  return (
    <AppShell title="เงินเดือน (ผัวเมีย)">
      <div style={wrap}>
        {err ? <Banner type="err">{err}</Banner> : null}
        {ok ? <Banner type="ok">{ok}</Banner> : null}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            เดือนนี้เริ่มนับตั้งแต่ <b>{monthStart}</b> • คิดจาก <b>(กำไรสุทธิ = total_profit - expenses)</b> แล้วกันภาษี 15%
          </div>
          <button onClick={load} style={primaryBtn} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>

        <div style={grid2}>
          <Card title="ฐานคำนวณ">
            <Mini label="กำไรสุทธิเดือนนี้ (net)">{fmt(calc.net)} บาท</Mini>
            <Mini label="กันภาษี 15%">{fmt(calc.taxReserve)} บาท</Mini>
            <Mini label="เหลือหลังกันภาษี">{fmt(calc.afterTax)} บาท</Mini>
            <div style={note}>* ถ้า net ≤ 0 ระบบจะให้เงินเดือน = 0</div>
          </Card>

          <Card title="เงินเดือน">
            <Mini label="ผัว 10% (ก่อนติดเพดาน)">{fmt(calc.rawMe)} บาท</Mini>
            <Mini label="เมีย 20% (ก่อนติดเพดาน)">{fmt(calc.rawPartner)} บาท</Mini>
            <Mini label="รวม (ก่อนติดเพดาน)">{fmt(calc.rawTotal)} บาท</Mini>

            <div style={{ height: 10 }} />

            <Mini label="ผัว (หลังคุมเพดาน)">{fmt(calc.me)} บาท</Mini>
            <Mini label="เมีย (หลังคุมเพดาน)">{fmt(calc.partner)} บาท</Mini>
            <Mini label="รวมจ่ายจริง (เพดาน 60,000)">{fmt(calc.total)} บาท</Mini>

            {calc.capHit ? (
              <div style={{ marginTop: 10, ...chipWarn }}>
                รวมเกิน 60,000 → ระบบลดสัดส่วนลงอัตโนมัติ (ยังคง 10% : 20%)
              </div>
            ) : (
              <div style={{ marginTop: 10, ...chipOk }}>ไม่ชนเพดาน 60,000</div>
            )}
          </Card>
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

function Card({ title, children }) {
  return (
    <div style={panel}>
      <div style={panelTitle}>{title}</div>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </div>
  )
}

function Mini({ label, children }) {
  return (
    <div style={miniBox}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 950, marginTop: 4 }}>{children}</div>
    </div>
  )
}

const wrap = { display: 'grid', gap: 12, maxWidth: 1100, margin: '0 auto', paddingBottom: 30 }
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
const panel = { borderRadius: 18, padding: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.06)' }
const panelTitle = { fontWeight: 950, marginBottom: 10, fontSize: 14 }
const miniBox = { borderRadius: 14, padding: 12, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)' }
const note = { fontSize: 12, opacity: 0.75, marginTop: 8 }
const primaryBtn = { height: 44, padding: '0 16px', borderRadius: 14, border: 'none', background: '#1f8a5b', color: 'white', fontWeight: 950, cursor: 'pointer' }
const chipWarn = { padding: 10, borderRadius: 14, border: '1px solid rgba(255,200,0,0.35)', background: 'rgba(255,200,0,0.08)', fontWeight: 900 }
const chipOk = { padding: 10, borderRadius: 14, border: '1px solid rgba(0,255,120,0.35)', background: 'rgba(0,255,120,0.08)', fontWeight: 900 }