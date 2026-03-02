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

  // ✅ งานค้าง + breakdown เดือนนี้
  const [work, setWork] = useState({
    unpaidOrPartialCount: null,
    notShippedCount: null,
  })

  const [statusBreakdown, setStatusBreakdown] = useState({
    pay_unpaid: null,
    pay_partial: null,
    pay_paid: null,
    ship_not: null,
    ship_yes: null,
  })

  // ✅ ยอดเงินจริงจาก DB
  const [bankBalances, setBankBalances] = useState({
    GSB: { balance: 0, income: 0, expense: 0, opening_amount: 0 },
    KTB: { balance: 0, income: 0, expense: 0, opening_amount: 0 },
    KBANK: { balance: 0, income: 0, expense: 0, opening_amount: 0 },
  })

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2200)
  }

  function toastErr(msg) {
    setErr(msg)
    setTimeout(() => setErr(''), 4500)
  }

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

  // เงินเดือน (สูตร B): คิดจาก “กำไรหลังกันภาษี 15%”
  const tax15 = useMemo(() => {
    const net = Number(kpi.monthNet || 0)
    if (net <= 0) return 0
    return Math.floor(net * 0.15)
  }, [kpi.monthNet])

  const afterTax15 = useMemo(() => {
    const net = Number(kpi.monthNet || 0)
    if (net <= 0) return 0
    return Math.max(0, net - tax15)
  }, [kpi.monthNet, tax15])

  const salary = useMemo(() => {
    const base = Number(afterTax15 || 0)
    if (base <= 0) return { husband: 0, wife: 0, total: 0, capped: false }

    let husband = Math.floor(base * 0.1)
    let wife = Math.floor(base * 0.2)
    let total = husband + wife

    const CAP = 60000
    let capped = false
    if (total > CAP) {
      capped = true
      husband = Math.floor(CAP / 3)
      wife = Math.floor((CAP * 2) / 3)
      total = husband + wife
    }

    return { husband, wife, total, capped }
  }, [afterTax15])

  const afterSalary = useMemo(() => {
    const v = Number(afterTax15 || 0) - Number(salary.total || 0)
    return Math.max(0, v)
  }, [afterTax15, salary.total])

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

    if ((kpi.monthNet || 0) > 0) {
      msgs.push({
        tone: salary.capped ? 'warn' : 'ok',
        text: `เดือนนี้กันภาษี 15% = ${tax15.toLocaleString()} • เงินเดือนรวม = ${salary.total.toLocaleString()}${salary.capped ? ' (ชนเพดาน 60,000)' : ''}`,
      })
    } else {
      msgs.push({ tone: 'ok', text: 'เดือนนี้กำไรสุทธิยังไม่เป็นบวก → ภาษี/เงินเดือน = 0' })
    }

    return msgs.slice(0, 6)
  }, [kpi.activeCount, kpi.monthSales, kpi.monthNet, turnoverPct, salary.capped, salary.total, tax15])

  const buyAdvice = useMemo(() => {
    if ((kpi.monthNet || 0) <= 0) {
      return {
        title: 'คำแนะนำการซื้อเข้า (เดือนนี้)',
        tone: 'bad',
        text: 'เดือนนี้กำไรสุทธิติดลบ/ใกล้ศูนย์ — แนะนำ “งดซื้อเข้าเพิ่ม” หรือซื้อเฉพาะตัวหมุนไวจริง ๆ',
      }
    }

    if ((kpi.activeCostSum || 0) > (kpi.monthSales || 0) * 2) {
      return {
        title: 'คำแนะนำการซื้อเข้า (เดือนนี้)',
        tone: 'warn',
        text: 'ทุนคงเหลือสูงเมื่อเทียบยอดขาย — ซื้อเข้าพอประมาณ เน้นขาย/ลดเงินจมก่อน',
      }
    }

    return {
      title: 'คำแนะนำการซื้อเข้า (เดือนนี้)',
      tone: 'good',
      text: 'สถานะโดยรวมโอเค — ซื้อเข้าได้ แต่ควรคุมงบและเน้นไม้หมุนเร็ว',
    }
  }, [kpi.monthNet, kpi.activeCostSum, kpi.monthSales])

  function mapBalances(rows) {
    const next = {
      GSB: { balance: 0, income: 0, expense: 0, opening_amount: 0 },
      KTB: { balance: 0, income: 0, expense: 0, opening_amount: 0 },
      KBANK: { balance: 0, income: 0, expense: 0, opening_amount: 0 },
    }
    for (const r of rows || []) {
      if (!r?.bank) continue
      const b = String(r.bank).toUpperCase()
      if (!next[b]) continue
      next[b] = {
        balance: Number(r.balance || 0),
        income: Number(r.income || 0),
        expense: Number(r.expense || 0),
        opening_amount: Number(r.opening_amount || 0),
      }
    }
    return next
  }

  async function loadDashboard() {
    setLoading(true)
    setErr('')
    try {
      // ✅ 0) Bank balances (เงินจริง)
      const { data: bdata, error: berr } = await supabase.rpc('get_bank_balances')
      if (berr) throw berr
      setBankBalances(mapBalances(bdata))

      // 1) Plants counts + cost
      const { data: plantsAgg, error: plantsErr } = await supabase.rpc('dashboard_plants_agg')
      if (plantsErr) throw plantsErr

      // 2) Month summary
      const { data: monthSum, error: sumErr } = await supabase.rpc('get_month_summary')
      if (sumErr) throw sumErr

      // 3) Daily sales (last 14 days)
      const { data: daily, error: dailyErr } = await supabase.rpc('get_daily_sales_last_n', { p_days: 14 })
      if (dailyErr) throw dailyErr

      // 4) Latest invoices (last 8)
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select('id, invoice_no, sale_date, customer_name, total, pay_status, ship_status')
        .order('created_at', { ascending: false })
        .limit(8)
      if (invErr) throw invErr

      // 5) Work counts (month)
      const { data: w, error: wErr } = await supabase.rpc('get_month_work_counts')
      if (!wErr) {
        setWork({
          unpaidOrPartialCount: w?.unpaid_or_partial_count ?? null,
          notShippedCount: w?.not_shipped_count ?? null,
        })
      } else {
        setWork({ unpaidOrPartialCount: null, notShippedCount: null })
      }

      // 6) Status breakdown (month)
      const { data: sb, error: sbErr } = await supabase.rpc('get_month_status_breakdown')
      if (!sbErr) {
        setStatusBreakdown({
          pay_unpaid: sb?.pay_unpaid ?? null,
          pay_partial: sb?.pay_partial ?? null,
          pay_paid: sb?.pay_paid ?? null,
          ship_not: sb?.ship_not ?? null,
          ship_yes: sb?.ship_yes ?? null,
        })
      } else {
        setStatusBreakdown({
          pay_unpaid: null,
          pay_partial: null,
          pay_paid: null,
          ship_not: null,
          ship_yes: null,
        })
      }

      setKpi({
        activeCount: Number(plantsAgg?.active_count || 0),
        soldCount: Number(plantsAgg?.sold_count || 0),
        totalCount: Number(plantsAgg?.total_count || 0),
        activeCostSum: Number(plantsAgg?.active_cost_sum || 0),

        monthSales: Number(monthSum?.sales || 0),
        monthProfit: Number(monthSum?.gross || 0),
        monthExpenses: Number(monthSum?.expenses || 0),
        monthNet: Number(monthSum?.net || 0),
      })

      setDailySales(daily || [])
      setLatestInvoices(inv || [])

      toastOk('อัปเดต Dashboard แล้ว')
    } catch (e) {
      toastErr(e?.message || 'โหลด Dashboard ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalCash = useMemo(() => {
    return (
      Number(bankBalances.GSB.balance || 0) +
      Number(bankBalances.KTB.balance || 0) +
      Number(bankBalances.KBANK.balance || 0)
    )
  }, [bankBalances])

  const fmt2 = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <AppShell title="Dashboard">
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 14px 30px' }}>
        {(err || ok) && (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {err ? <div style={alertBad}>{err}</div> : null}
            {ok ? <div style={alertGood}>{ok}</div> : null}
          </div>
        )}

        {/* Header + quick actions */}
        <div style={{ marginTop: 14, ...panel }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>ศูนย์บัญชาการ (เดือนนี้)</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>ดูสถานการณ์เร็ว ๆ + ไม่ตัดการวิเคราะห์</div>
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

        {/* ภาษี + เงินเดือน */}
        <div style={kpiGrid}>
          <KpiCard title="กันภาษี 15% (เดือนนี้)" value={(tax15 || 0).toLocaleString()} sub="บาท" />
          <KpiCard title="กำไรหลังภาษี (เดือนนี้)" value={(afterTax15 || 0).toLocaleString()} sub="บาท" />
          <KpiCard
            title="เงินเดือนผัว+เมีย (เดือนนี้)"
            value={(salary.total || 0).toLocaleString()}
            sub={salary.capped ? 'บาท (ชนเพดาน 60,000)' : 'บาท'}
          />
          <KpiCard title="เหลือหลังเงินเดือน" value={(afterSalary || 0).toLocaleString()} sub="บาท" />
        </div>

        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <div style={rowCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900 }}>เงินเดือน (สูตร B)</div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>
                คิดจากกำไรหลังกันภาษี 15% • ผัว 10% • เมีย 20% • รวมไม่เกิน 60,000 • ปัดลง
              </div>
            </div>
            <div style={miniGrid3}>
              <Mini tone="ok" label="ผัว (10%)">{(salary.husband || 0).toLocaleString()} บาท</Mini>
              <Mini tone="ok" label="เมีย (20%)">{(salary.wife || 0).toLocaleString()} บาท</Mini>
              <Mini tone={salary.capped ? 'warn' : 'good'} label="รวม">{(salary.total || 0).toLocaleString()} บาท</Mini>
            </div>
          </div>
        </div>

        {/* ✅ ยอดเงินธนาคาร (ดึงจริง) */}
        <div style={kpiGrid}>
          <KpiCard title="ยอดเงิน GSB" value={fmt2(bankBalances.GSB.balance)} sub={`รับ ${fmt2(bankBalances.GSB.income)} | จ่าย ${fmt2(bankBalances.GSB.expense)}`} />
          <KpiCard title="ยอดเงิน KTB" value={fmt2(bankBalances.KTB.balance)} sub={`รับ ${fmt2(bankBalances.KTB.income)} | จ่าย ${fmt2(bankBalances.KTB.expense)}`} />
          <KpiCard title="ยอดเงิน KBANK" value={fmt2(bankBalances.KBANK.balance)} sub={`รับ ${fmt2(bankBalances.KBANK.income)} | จ่าย ${fmt2(bankBalances.KBANK.expense)}`} />
          <KpiCard title="รวมทั้งหมด" value={fmt2(totalCash)} sub="บาท" />
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
              <Mini tone="warn" label="บิลค้างชำระ (ยังไม่จ่าย + จ่ายบางส่วน)">
                {work.unpaidOrPartialCount == null ? '-' : work.unpaidOrPartialCount.toLocaleString()}
              </Mini>
              <Mini tone="warn" label="บิลค้างส่ง (ยังไม่ส่ง)">
                {work.notShippedCount == null ? '-' : work.notShippedCount.toLocaleString()}
              </Mini>
            </div>

            <div style={note}>
              *ตัวเลขงานค้างอาศัย RPC: <code>get_month_work_counts</code>
            </div>
          </div>

          <div style={panel}>
            <div style={panelTitle}>Breakdown สถานะ (เดือนนี้)</div>
            <div style={miniGrid3}>
              <Mini tone="ok" label="ยังไม่จ่าย">{statusBreakdown.pay_unpaid == null ? '-' : statusBreakdown.pay_unpaid.toLocaleString()}</Mini>
              <Mini tone="warn" label="จ่ายบางส่วน">{statusBreakdown.pay_partial == null ? '-' : statusBreakdown.pay_partial.toLocaleString()}</Mini>
              <Mini tone="good" label="จ่ายแล้ว">{statusBreakdown.pay_paid == null ? '-' : statusBreakdown.pay_paid.toLocaleString()}</Mini>
            </div>

            <div style={miniGrid2}>
              <Mini tone="warn" label="ยังไม่ส่ง">{statusBreakdown.ship_not == null ? '-' : statusBreakdown.ship_not.toLocaleString()}</Mini>
              <Mini tone="good" label="ส่งแล้ว">{statusBreakdown.ship_yes == null ? '-' : statusBreakdown.ship_yes.toLocaleString()}</Mini>
            </div>

            <div style={note}>
              *ตัวเลข Breakdown อาศัย RPC: <code>get_month_status_breakdown</code>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={twoCol}>
          <div style={panel}>
            <div style={panelTitle}>สัดส่วนสต๊อก</div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {donutData.map((_, idx) => (
                      <Cell key={idx} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={panel}>
            <div style={panelTitle}>ยอดขายรายวัน (14 วันล่าสุด)</div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer>
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Latest invoices */}
        <div style={panel}>
          <div style={panelTitle}>บิลล่าสุด</div>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {(latestInvoices || []).length === 0 ? (
              <div style={{ opacity: 0.75 }}>ยังไม่มีบิล</div>
            ) : (
              latestInvoices.map((x) => (
                <div key={x.id} style={rowCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>
                        <Link href={`/receipt/${x.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {x.invoice_no || '(no invoice_no)'}
                        </Link>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {x.sale_date} • {x.customer_name || '-'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 950 }}>{Number(x.total || 0).toLocaleString()} บาท</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {x.pay_status || '-'} • {x.ship_status || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function QuickLink({ href, label }) {
  return (
    <Link href={href} style={quickLink}>
      <div style={{ fontWeight: 950 }}>{label}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>ไปหน้า</div>
    </Link>
  )
}

function KpiCard({ title, value, sub }) {
  return (
    <div style={kpiCard}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function Mini({ tone = 'ok', label, children }) {
  return (
    <div style={{ ...miniCard, borderColor: toneBorder(tone) }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontWeight: 950, marginTop: 6 }}>{children}</div>
    </div>
  )
}

function Insight({ tone = 'ok', children }) {
  return <div style={{ ...insight, borderColor: toneBorder(tone) }}>{children}</div>
}

function toneBorder(tone) {
  if (tone === 'good') return 'rgba(40, 200, 120, 0.55)'
  if (tone === 'warn') return 'rgba(255, 200, 80, 0.55)'
  if (tone === 'bad') return 'rgba(255, 120, 120, 0.55)'
  return 'rgba(255,255,255,0.15)'
}

const alertBad = {
  borderRadius: 16,
  padding: 12,
  border: '1px solid rgba(255,80,80,0.45)',
  background: 'rgba(255,80,80,0.12)',
}

const alertGood = {
  borderRadius: 16,
  padding: 12,
  border: '1px solid rgba(40,200,120,0.45)',
  background: 'rgba(40,200,120,0.12)',
}

const panel = {
  borderRadius: 18,
  padding: 14,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.05)',
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

const quickLink = {
  borderRadius: 16,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.04)',
  textDecoration: 'none',
  color: 'inherit',
}

const kpiGrid = {
  marginTop: 12,
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 10,
}

const kpiCard = {
  borderRadius: 18,
  padding: 14,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.04)',
}

const miniCard = {
  borderRadius: 16,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
}

const insight = {
  borderRadius: 16,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
}

const twoCol = {
  marginTop: 12,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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