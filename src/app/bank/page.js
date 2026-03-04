'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function BankReportPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const [inv, setInv] = useState([])
  const [exp, setExp] = useState([])

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
      const invReq = supabase
        .from('invoices')
        .select('bank,total_price,sale_date,pay_status')
        .gte('sale_date', monthStart)
        .limit(5000)

      const expReq = supabase
        .from('expenses')
        .select('bank,amount,expense_date,category')
        .gte('expense_date', monthStart)
        .limit(5000)

      const [a, b] = await Promise.all([invReq, expReq])
      if (a.error) throw a.error
      if (b.error) throw b.error

      setInv(a.data || [])
      setExp(b.data || [])
    } catch (e) {
      setErr(e?.message || 'โหลดรายงานธนาคารไม่สำเร็จ')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const report = useMemo(() => {
    // เงินเข้า = total_price ของบิล (จะนับทั้งหมด/หรือจะนับเฉพาะ paid ก็ได้ในอนาคต)
    const byBank = new Map()

    for (const r of inv) {
      const bank = r.bank || 'UNKNOWN'
      const obj = byBank.get(bank) || { bank, income: 0, expense: 0, invoices: 0, expenses: 0 }
      obj.income += Number(r.total_price || 0)
      obj.invoices += 1
      byBank.set(bank, obj)
    }

    for (const r of exp) {
      const bank = r.bank || 'UNKNOWN'
      const obj = byBank.get(bank) || { bank, income: 0, expense: 0, invoices: 0, expenses: 0 }
      obj.expense += Number(r.amount || 0)
      obj.expenses += 1
      byBank.set(bank, obj)
    }

    const rows = Array.from(byBank.values()).map((x) => ({ ...x, net: x.income - x.expense }))
    rows.sort((a, b) => b.net - a.net)

    const totalIncome = rows.reduce((s, r) => s + r.income, 0)
    const totalExpense = rows.reduce((s, r) => s + r.expense, 0)

    return { rows, totalIncome, totalExpense, totalNet: totalIncome - totalExpense }
  }, [inv, exp])

  return (
    <AppShell title="รายงานธนาคาร">
      <div style={wrap}>
        {err ? <Banner type="err">{err}</Banner> : null}

        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              เดือนนี้เริ่ม <b>{monthStart}</b> • เงินเข้า(invoices.total_price) / เงินออก(expenses.amount) แยกตาม bank
            </div>
            <button onClick={load} style={primaryBtn} disabled={loading}>
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>

          <div style={kpiRow}>
            <Mini label="เงินเข้าเดือนนี้">{report.totalIncome.toLocaleString()} บาท</Mini>
            <Mini label="เงินออกเดือนนี้">{report.totalExpense.toLocaleString()} บาท</Mini>
            <Mini label="สุทธิเดือนนี้">{report.totalNet.toLocaleString()} บาท</Mini>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {loading ? <div style={{ opacity: 0.85 }}>กำลังโหลด...</div> : null}
          {!loading && !report.rows.length ? <div style={{ opacity: 0.85 }}>ไม่มีข้อมูล</div> : null}

          {report.rows.map((r) => (
            <div key={r.bank} style={rowCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 950 }}>{r.bank}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 950 }}>{r.net.toLocaleString()} บาท</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>สุทธิ</div>
                </div>
              </div>

              <div style={kpiRow2}>
                <Mini label={`เงินเข้า (${r.invoices} บิล)`}>{r.income.toLocaleString()}</Mini>
                <Mini label={`เงินออก (${r.expenses} รายการ)`}>{r.expense.toLocaleString()}</Mini>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
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
      <div style={{ fontSize: 16, fontWeight: 950, marginTop: 4 }}>{children} บาท</div>
    </div>
  )
}

const wrap = { display: 'grid', gap: 12, maxWidth: 1100, margin: '0 auto', paddingBottom: 30 }
const panel = { borderRadius: 18, padding: 14, border: '1px solid rgba(15,23,42,0.12)', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
const rowCard = { borderRadius: 16, padding: 12, border: '1px solid rgba(15,23,42,0.12)', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
const primaryBtn = { height: 44, padding: '0 16px', borderRadius: 14, border: 'none', background: '#1f8a5b', color: 'white', fontWeight: 950, cursor: 'pointer' }
const miniBox = { borderRadius: 16, padding: 12, border: '1px solid rgba(15,23,42,0.12)', background: 'white' }
const kpiRow = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 12 }
const kpiRow2 = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 10 }