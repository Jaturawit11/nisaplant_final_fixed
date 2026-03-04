'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => {
      return (
        String(r.invoice_no || '').toLowerCase().includes(s) ||
        String(r.customer_name || '').toLowerCase().includes(s) ||
        String(r.bank || '').toLowerCase().includes(s)
      )
    })
  }, [rows, q])

  const summary = useMemo(() => {
    const total = filtered.reduce((sum, r) => sum + Number(r.total_price || 0), 0)
    const cnt = filtered.length
    return { total, cnt }
  }, [filtered])

  return (
    <AppShell title="ลูกหนี้ (A/R)">
      <div style={wrap}>
        {err ? <Banner type="err">{err}</Banner> : null}

        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              ลูกหนี้คือบิล pay_status = <b>unpaid / partial</b> • เดือนนี้เริ่ม <b>{monthStart}</b>
            </div>
            <button onClick={load} style={primaryBtn} disabled={loading}>
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา: invoice / ลูกค้า / bank" style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
            <div style={chip}>{`ค้าง ${summary.cnt} บิล • รวม ${summary.total.toLocaleString()} บาท`}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {loading ? <div style={{ opacity: 0.85 }}>กำลังโหลด...</div> : null}
          {!loading && !filtered.length ? <div style={{ opacity: 0.85 }}>ไม่มีลูกหนี้ค้าง</div> : null}

          {filtered.map((x) => (
            <div key={x.id} style={rowCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 950 }}>{x.invoice_no || '-'}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{x.sale_date || '-'} • {x.customer_name || '-'}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    pay: <b>{x.pay_status || '-'}</b> • ship: <b>{x.ship_status || '-'}</b> • bank: <b>{x.bank || '-'}</b>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 950 }}>{Number(x.total_price || 0).toLocaleString()} บาท</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>กำไร: {Number(x.total_profit || 0).toLocaleString()}</div>
                </div>
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

const wrap = { display: 'grid', gap: 12, maxWidth: 1100, margin: '0 auto', paddingBottom: 30 }
const panel = { borderRadius: 18, padding: 14, border: '1px solid rgba(15,23,42,0.12)', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
const rowCard = { borderRadius: 16, padding: 12, border: '1px solid rgba(15,23,42,0.12)', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
const primaryBtn = { height: 44, padding: '0 16px', borderRadius: 14, border: 'none', background: '#1f8a5b', color: 'white', fontWeight: 950, cursor: 'pointer' }
const inputStyle = { height: 44, padding: '0 12px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.2)', width: '100%' }
const chip = { padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', fontWeight: 900 }