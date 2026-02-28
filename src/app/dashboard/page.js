'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import Link from 'next/link'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

// ✅ ยอดเงิน “ล่าสุด” ตามที่ตั้งไว้ (ไม่แตะ logic/DB)
const BALANCES = {
  GSB: 76994.75,
  KTB: 9278.44,
  KBANK: 87833.34,
}

export default function DashboardPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)

  const [kpi, setKpi] = useState({
    activeCount: 0,
    soldCount: 0,
    totalCount: 0,
    activeCostSum: 0,

    monthSales: 0,
    monthProfit: 0,
    monthExpenses: 0,
    monthNet: 0,
  })

  const [dailySales, setDailySales] = useState([])
  const [latestInvoices, setLatestInvoices] = useState([])

  // งานค้าง + breakdown เดือนนี้ (ถ้า enum ใน DB ไม่ตรง จะเป็น null แล้ว UI โชว์ "-")
  const [work, setWork] = useState({
    unpaidOrPartialCount: null,
    notShippedCount: null,
  })

  const [statusBreakdown, setStatusBreakdown] = useState({
    paid: null,
    partial: null,
    unpaid: null,
    shipped: null,
    not_shipped: null,
  })

  const monthStart = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01` // type=date
  }, [])

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2000)
  }

  // ✅ นับ count แบบ “ไม่พัง” ถ้าค่า enum ไม่ตรง/คอลัมน์ไม่ตรง
  async function safeCount(queryBuilder) {
    try {
      const res = await queryBuilder
      if (res?.error) return null
      return typeof res?.count === 'number' ? res.count : null
    } catch {
      return null
    }
  }

  async function loadDashboard() {
    setErr('')
    setOk('')
    setLoading(true)

    try {
      // plants counts
      const activeCountReq = supabase.from('plants').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE')
      const soldCountReq = supabase.from('plants').select('id', { count: 'exact', head: true }).eq('status', 'SOLD')
      const totalCountReq = supabase.from('plants').select('id', { count: 'exact', head: true })

      // sum(cost) ACTIVE
      const activeCostsReq = supabase.from('plants').select('cost').eq('status', 'ACTIVE').limit(10000)

      // invoices month
      const monthInvoicesReq = supabase
        .from('invoices')
        .select('total_price,total_profit,sale_date')
        .gte('sale_date', monthStart)
        .limit(5000)

      // expenses month
      const monthExpensesReq = supabase
        .from('expenses')
        .select('amount,expense_date')
        .gte('expense_date', monthStart)
        .limit(5000)

      // latest invoices
      const latestInvoicesReq = supabase
        .from('invoices')
        .select('id,invoice_no,sale_date,customer_name,total_price,total_profit,pay_status,ship_status,invoice_status,created_at')
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)

      const [
        activeCountRes,
        soldCountRes,
        totalCountRes,
        activeCostsRes,
        monthInvoicesRes,
        monthExpensesRes,
        latestInvoicesRes,
      ] = await Promise.all([
        activeCountReq,
        soldCountReq,
        totalCountReq,
        activeCostsReq,
        monthInvoicesReq,
        monthExpensesReq,
        latestInvoicesReq,
      ])

      if (activeCountRes.error) throw activeCountRes.error
      if (soldCountRes.error) throw soldCountRes.error
      if (totalCountRes.error) throw totalCountRes.error
      if (activeCostsRes.error) throw activeCostsRes.error
      if (monthInvoicesRes.error) throw monthInvoicesRes.error
      if (monthExpensesRes.error) throw monthExpensesRes.error
      if (latestInvoicesRes.error) throw latestInvoicesRes.error

      const activeCostSum = (activeCostsRes.data || []).reduce((sum, r) => sum + Number(r.cost || 0), 0)
      const monthSales = (monthInvoicesRes.data || []).reduce((sum, r) => sum + Number(r.total_price || 0), 0)
      const monthProfit = (monthInvoicesRes.data || []).reduce((sum, r) => sum + Number(r.total_profit || 0), 0)
      const monthExpenses = (monthExpensesRes.data || []).reduce((sum, r) => sum + Number(r.amount || 0), 0)
      const monthNet = monthProfit - monthExpenses

      // daily sales (group by sale_date)
      const map = new Map()
      for (const r of monthInvoicesRes.data || []) {
        const key = r.sale_date || 'unknown'
        map.set(key, (map.get(key) || 0) + Number(r.total_price || 0))
      }
      const daily = Array.from(map.entries())
        .filter(([d]) => d !== 'unknown')
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
        .map(([date, sales]) => ({ date, sales }))

      setKpi({
        activeCount: activeCountRes.count || 0,
        soldCount: soldCountRes.count || 0,
        totalCount: totalCountRes.count || 0,
        activeCostSum,
        monthSales,
        monthProfit,
        monthExpenses,
        monthNet,
      })

      setDailySales(daily)
      setLatestInvoices(latestInvoicesRes.data || [])

      // ✅ งานค้าง + breakdown (เดือนนี้) — ทำแบบ safe (ไม่ throw)
      const unpaidCount = await safeCount(
        supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('sale_date', monthStart).eq('pay_status', 'unpaid')
      )
      const partialCount = await safeCount(
        supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('sale_date', monthStart).eq('pay_status', 'partial')
      )
      const paidCount = await safeCount(
        supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('sale_date', monthStart).eq('pay_status', 'paid')
      )

      const notShippedCount = await safeCount(
        supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('sale_date', monthStart).eq('ship_status', 'not_shipped')
      )
      const shippedCount = await safeCount(
        supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('sale_date', monthStart).eq('ship_status', 'shipped')
      )

      const unpaidOrPartialCount =
        unpaidCount == null && partialCount == null ? null : Number(unpaidCount || 0) + Number(partialCount || 0)

      setWork({
        unpaidOrPartialCount,
        notShippedCount,
      })

      setStatusBreakdown({
        paid: paidCount,
        partial: partialCount,
        unpaid: unpaidCount,
        shipped: shippedCount,
        not_shipped: notShippedCount,
      })

      toastOk('อัปเดต Dashboard แล้ว')
    } catch (e) {
      setErr(e?.message || 'โหลด Dashboard ไม่สำเร็จ')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const donutData = useMemo(() => {
    return [
      { name: 'ACTIVE', value: kpi.activeCount || 0 },
      { name: 'SOLD', value: kpi.soldCount || 0 },
    ]
  }, [kpi.activeCount, kpi.soldCount])

  const turnoverPct = useMemo(() => {
    const total = kpi.totalCount || 0
    if (!total) return 0
    return Math.round(((kpi.soldCount || 0) / total) * 100)
  }, [kpi.totalCount, kpi.soldCount])

  const insights = useMemo(() => {
    const msgs = []

    if ((kpi.activeCount || 0) === 0) msgs.push({ tone: 'bad', text: 'ไม่มีสต๊อก ACTIVE เลย — ต้องเพิ่มไม้เข้าระบบ' })
    else if ((kpi.activeCount || 0) > 300) msgs.push({ tone: 'warn', text: 'สต๊อก ACTIVE เยอะ — เงินจมสูง แนะนำเร่งหมุนของ/โปรโมชัน' })
    else msgs.push({ tone: 'good', text: 'สต๊อก ACTIVE อยู่ระดับโอเค — คุมการซื้อเข้าและหมุนเวียนต่อเนื่อง' })

    if (turnoverPct < 15) msgs.push({ tone: 'warn', text: `อัตราหมุนเวียนต่ำ (${turnoverPct}%) — ดันไม้หมุนไว/จัดชุดขาย` })
    else if (turnoverPct >= 40) msgs.push({ tone: 'good', text: `อัตราหมุนเวียนดีมาก (${turnoverPct}%) — ระบบขายลื่น` })
    else msgs.push({ tone: 'ok', text: `อัตราหมุนเวียนปานกลาง (${turnoverPct}%) — เพิ่มยอดอีกนิดจะสวย` })

    if ((kpi.monthSales || 0) === 0) msgs.push({ tone: 'ok', text: 'เดือนนี้ยังไม่มียอดขายในระบบ (หรือยังไม่ได้บันทึก invoice)' })
    else {
      if ((kpi.monthNet || 0) > 0) msgs.push({ tone: 'good', text: `เดือนนี้กำไรสุทธิเป็นบวก (+${kpi.monthNet.toLocaleString()} บาท)` })
      else msgs.push({ tone: 'bad', text: `เดือนนี้กำไรสุทธิติดลบ (${kpi.monthNet.toLocaleString()} บาท) — ค่าใช้จ่ายกินกำไร/มาร์จิ้นต่ำ` })
    }

    // งานค้าง (ถ้านับได้)
    if (work.unpaidOrPartialCount != null) {
      if (work.unpaidOrPartialCount > 0) msgs.push({ tone: 'warn', text: `มีบิลค้างชำระเดือนนี้ ${work.unpaidOrPartialCount} บิล — ไปปิดยอด/ตามเงิน` })
      else msgs.push({ tone: 'good', text: 'เดือนนี้ไม่มีบิลค้างชำระ (ดีมาก)' })
    }
    if (work.notShippedCount != null) {
      if (work.notShippedCount > 0) msgs.push({ tone: 'warn', text: `มีบิลค้างส่งเดือนนี้ ${work.notShippedCount} บิล — เช็คการแพ็ค/เลขพัสดุ` })
      else msgs.push({ tone: 'good', text: 'เดือนนี้ไม่มีบิลค้างส่ง (ดีมาก)' })
    }

    return msgs.slice(0, 8)
  }, [kpi.activeCount, kpi.monthNet, kpi.monthSales, turnoverPct, work.notShippedCount, work.unpaidOrPartialCount])

  const buyAdvice = useMemo(() => {
    const net = Number(kpi.monthNet || 0)
    const sales = Number(kpi.monthSales || 0)
    const active = Number(kpi.activeCount || 0)
    const cash = Number(BALANCES.GSB + BALANCES.KTB + BALANCES.KBANK)

    // ✅ เป็น “คำแนะนำเชิงปฏิบัติ” แบบไม่ยุ่งกับ logic/DB
    if (sales === 0) {
      return { tone: 'warn', title: 'การซื้อเข้า', text: 'เดือนนี้ยังไม่เห็นยอดขายในระบบ — ถ้าจะซื้อเข้า ให้ซื้อแค่ตัวหมุนไว/ทุนต่ำ และโฟกัสปิดการขายก่อน' }
    }

    if (net > 0 && turnoverPct >= 25) {
      if (active < 120) return { tone: 'good', title: 'การซื้อเข้า', text: 'ยอดขายเดิน + กำไรเป็นบวก + สต๊อกไม่เยอะ — ซื้อเข้าได้ แต่เน้นตัวที่ขายไว/มีจองชัด' }
      return { tone: 'ok', title: 'การซื้อเข้า', text: 'กำไรเป็นบวก แต่สต๊อกยังพอมี — ซื้อเข้าได้แบบคุมงบ และเร่งหมุนของเก่าควบคู่' }
    }

    if (net <= 0 && cash > 0) {
      return { tone: 'bad', title: 'การซื้อเข้า', text: 'กำไรสุทธิยังไม่บวก — แนะนำ “ชะลอซื้อเข้า” แล้วเน้นปรับมาร์จิ้น/ลดค่าใช้จ่าย + เร่งขายของคงเหลือ' }
    }

    return { tone: 'ok', title: 'การซื้อเข้า', text: 'ซื้อเข้าได้แบบระวังงบ เลือกเฉพาะตัวที่หมุนไว และตั้งราคาให้ได้กำไรจริง' }
  }, [kpi.activeCount, kpi.monthNet, kpi.monthSales, turnoverPct])

  return (
    <AppShell title="Dashboard">
      <div style={wrap}>
        {err ? <Banner type="err">{err}</Banner> : null}
        {ok ? <Banner type="ok">{ok}</Banner> : null}

        {/* Quick actions */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={panelTitle}>ปุ่มลัด</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>เข้าเมนูที่ใช้บ่อยแบบเร็ว ๆ</div>
            </div>

            <button onClick={loadDashboard} style={primaryBtn} disabled={loading}>
              {loading ? 'กำลังโหลด...' : 'รีเฟรช Dashboard'}
            </button>
          </div>

          <div style={quickGrid}>
            <QuickLink href="/sell" label="ไปขาย (Sell)" />
            <QuickLink href="/plants" label="เพิ่ม/ดูต้นไม้" />
            <QuickLink href="/expenses" label="บันทึกค่าใช้จ่าย" />
            <QuickLink href="/edit-invoice" label="แก้บิล/งานค้าง" />
          </div>
        </div>

        {/* KPI */}
        <div style={kpiGrid}>
          <KpiCard title="ไม้คงเหลือ (ACTIVE)" value={(kpi.activeCount || 0).toLocaleString()} sub="จำนวนต้นที่ยังไม่ขาย" />
          <KpiCard title="มูลค่าทุนคงเหลือ" value={(kpi.activeCostSum || 0).toLocaleString()} sub="บาท" />
          <KpiCard title="ยอดขายเดือนนี้" value={(kpi.monthSales || 0).toLocaleString()} sub="บาท" />
          <KpiCard title="กำไรสุทธิเดือนนี้" value={(kpi.monthNet || 0).toLocaleString()} sub="บาท" />
        </div>


        {/* Balances */}
        <div style={kpiGrid}>
          <KpiCard title="ยอดเงิน GSB" value={Number(BALANCES.GSB).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sub="บาท" />
          <KpiCard title="ยอดเงิน KTB" value={Number(BALANCES.KTB).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sub="บาท" />
          <KpiCard title="ยอดเงิน KBANK" value={Number(BALANCES.KBANK).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sub="บาท" />
          <KpiCard title="รวมทั้งหมด" value={Number(BALANCES.GSB + BALANCES.KTB + BALANCES.KBANK).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sub="บาท" />
        </div>

        {/* Insights */}
        <div style={twoCol}>
          <div style={panel}>
            <div style={panelTitle}>สรุปภาพรวม</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {insights.map((x, idx) => (
                <Insight key={idx} tone={x.tone}>
                  {x.text}
                </Insight>
              ))}
            </div>
          </div>
          <div style={panel}>
            <div style={panelTitle}>{buyAdvice.title}</div>
            <Insight tone={buyAdvice.tone}>{buyAdvice.text}</Insight>
          </div>
        </div>

        {/* งานค้าง + breakdown */}
        <div style={twoCol}>
          <div style={panel}>
            <div style={panelTitle}>งานค้าง (เดือนนี้)</div>
            <div style={miniGrid2}>
              <Mini tone="warn" label="บิลค้างชำระ (unpaid + partial)">
                {work.unpaidOrPartialCount == null ? '-' : work.unpaidOrPartialCount.toLocaleString()}
              </Mini>
              <Mini tone="warn" label="บิลค้างส่ง (not_shipped)">
                {work.notShippedCount == null ? '-' : work.notShippedCount.toLocaleString()}
              </Mini>
            </div>
          </div>

          <div style={panel}>
            <div style={panelTitle}>สถานะบิล (เดือนนี้)</div>
            <div style={miniGrid3}>
              <Mini label="paid">{fmtCount(statusBreakdown.paid)}</Mini>
              <Mini label="partial">{fmtCount(statusBreakdown.partial)}</Mini>
              <Mini label="unpaid">{fmtCount(statusBreakdown.unpaid)}</Mini>
              <Mini label="shipped">{fmtCount(statusBreakdown.shipped)}</Mini>
              <Mini label="not_shipped">{fmtCount(statusBreakdown.not_shipped)}</Mini>
              <Mini label="ขายแล้ว/ทั้งหมด">{`${(kpi.soldCount || 0).toLocaleString()} / ${(kpi.totalCount || 0).toLocaleString()} (${turnoverPct}%)`}</Mini>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={twoCol}>
          <div style={panel}>
            <div style={panelTitle}>สถานะสต๊อก (โดนัท)</div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="85%" paddingAngle={2}>
                    <Cell fill="rgba(0,255,120,0.55)" />
                    <Cell fill="rgba(255,60,60,0.60)" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={panel}>
            <div style={panelTitle}>ยอดขายรายวัน (เดือนนี้)</div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div></div>
        </div>

        {/* Latest invoices */}
        <div style={panel}>
          <div style={panelTitle}>บิลล่าสุด</div>
          {!latestInvoices.length ? (
            <div style={{ opacity: 0.8 }}>ยังไม่มีบิล</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {latestInvoices.map((x) => (
                <div key={x.id} style={{ ...rowCard, border: `2px solid ${borderColorFromTone(toneFromInvoice(x))}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>{x.invoice_no || '-'}</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>
                        {x.sale_date || '-'} • {x.customer_name || '-'}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        <span className={pillClass(toneFromInvoice(x))}>PAY: <b>{x.pay_status || '-'}</b></span>
                        <span className={'status-pill ' + (String(x.ship_status||'').toLowerCase()==='shipped' ? 'status-success' : 'status-danger')}>SHIP: <b>{x.ship_status || '-'}</b></span>
                        <span className="status-pill">INV: <b>{x.invoice_status || '-'}</b></span>
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
          )}
        </div>
      </div>
    </AppShell>
  )
}

/* ===== UI components ===== */


function toneFromInvoice(inv) {
  const pay = String(inv?.pay_status || '').toLowerCase()
  const ship = String(inv?.ship_status || '').toLowerCase()

  // priority: unpaid is danger
  if (pay === 'unpaid') return 'danger'
  // partial or paid-but-not-shipped => warning
  if (pay === 'partial') return 'warning'
  if (pay === 'paid' && ship && ship !== 'shipped') return 'warning'
  // paid + shipped (or no ship info) => success
  if (pay === 'paid') return 'success'
  // fallback
  return 'warning'
}

function pillClass(tone) {
  if (tone === 'success') return 'status-pill status-success'
  if (tone === 'danger') return 'status-pill status-danger'
  return 'status-pill status-warning'
}

function borderColorFromTone(tone) {
  if (tone === 'success') return 'rgba(34,197,94,0.55)'
  if (tone === 'danger') return 'rgba(239,68,68,0.55)'
  return 'rgba(234,179,8,0.55)'
}

function fmtCount(n) {
  if (n == null) return '-'
  return Number(n || 0).toLocaleString()
}

function Banner({ type, children }) {
  const bg = type === 'err' ? 'rgba(255,0,0,0.12)' : 'rgba(0,255,120,0.10)'
  const bd = type === 'err' ? 'rgba(255,0,0,0.25)' : 'rgba(0,255,120,0.22)'
  return <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 14, padding: 12 }}>{children}</div>
}

function KpiCard({ title, value, sub }) {
  return (
    <div style={kpiCard}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{title}</div>
      <div style={{ fontWeight: 950, fontSize: 22, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{sub}</div>
    </div>
  )
}

function Mini({ label, children, tone }) {
  const toneMap = {
    warn: { bd: 'rgba(255,200,0,0.35)', bg: 'rgba(255,200,0,0.08)' },
    good: { bd: 'rgba(0,255,120,0.35)', bg: 'rgba(0,255,120,0.08)' },
    bad: { bd: 'rgba(255,60,60,0.45)', bg: 'rgba(255,60,60,0.10)' },
    ok: { bd: 'rgba(255,255,255,0.10)', bg: 'rgba(255,255,255,0.04)' },
  }
  const s = toneMap[tone] || toneMap.ok
  return (
    <div style={{ border: `1px solid ${s.bd}`, background: s.bg, borderRadius: 14, padding: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 950, marginTop: 4 }}>{children}</div>
    </div>
  )
}

function Insight({ tone, children }) {
  const map = {
    good: { bd: 'rgba(0,255,120,0.35)', bg: 'rgba(0,255,120,0.08)' },
    ok: { bd: 'rgba(255,255,255,0.16)', bg: 'rgba(255,255,255,0.05)' },
    warn: { bd: 'rgba(255,200,0,0.35)', bg: 'rgba(255,200,0,0.08)' },
    bad: { bd: 'rgba(255,60,60,0.45)', bg: 'rgba(255,60,60,0.10)' },
  }
  const s = map[tone] || map.ok
  return <div style={{ border: `1px solid ${s.bd}`, background: s.bg, borderRadius: 14, padding: 12, fontWeight: 900 }}>{children}</div>
}

function QuickLink({ href, label }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        color: 'white',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.06)',
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <span style={{ fontWeight: 950 }}>{label}</span>
      <span style={{ opacity: 0.8 }}>›</span>
    </Link>
  )
}

/* ===== Styles ===== */

const wrap = {
  display: 'grid',
  gap: 12,
  maxWidth: 1100,
  margin: '0 auto',
  paddingBottom: 30,
}

const kpiGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 10,
}

const kpiCard = {
  borderRadius: 18,
  padding: 14,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.06)',
}

const twoCol = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
}

const panel = {
  borderRadius: 18,
  padding: 14,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.06)',
}

const panelTitle = {
  fontWeight: 950,
  marginBottom: 10,
  fontSize: 14,
}

const note = {
  fontSize: 12,
  opacity: 0.75,
  marginTop: 10,
}

const rowCard = {
  borderRadius: 14,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.04)',
}

const primaryBtn = {
  height: 44,
  padding: '0 16px',
  borderRadius: 14,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 950,
  cursor: 'pointer',
}

const quickGrid = {
  marginTop: 12,
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 10,
}

const miniGrid2 = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10,
  marginTop: 10,
}

const miniGrid3 = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  marginTop: 10,
}