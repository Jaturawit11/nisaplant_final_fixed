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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

const BANK_THEME = {
  GSB: {
    label: 'GSB',
    color: '#ec4899', // ชมพู
    logo: '/banks/gsb.png',
    tint: 'rgba(236,72,153,0.12)',
  },
  KTB: {
    label: 'KTB',
    color: '#3b82f6', // ฟ้า
    logo: '/banks/ktb.png',
    tint: 'rgba(59,130,246,0.12)',
  },
  KBANK: {
    label: 'KBANK',
    color: '#22c55e', // เขียว
    logo: '/banks/kbank.png',
    tint: 'rgba(34,197,94,0.12)',
  },
}

export default function DashboardPage() {
  const supabase = supabaseBrowser()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

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

  const [bankBalances, setBankBalances] = useState({
    GSB: { balance: 0, income: 0, expense: 0 },
    KTB: { balance: 0, income: 0, expense: 0 },
    KBANK: { balance: 0, income: 0, expense: 0 },
  })

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2000)
  }

  function toastErr(msg) {
    setErr(msg)
    setTimeout(() => setErr(''), 4000)
  }

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data: plantsAgg } = await supabase.rpc('dashboard_plants_agg')
      const { data: monthSum } = await supabase.rpc('get_month_summary')
      const { data: daily } = await supabase.rpc('get_daily_sales_last_n', { p_days: 14 })
      const { data: inv } = await supabase
        .from('invoices')
        .select('id, invoice_no, sale_date, customer_name, total_price, pay_status, ship_status')
        .order('created_at', { ascending: false })
        .limit(6)

      const { data: bank } = await supabase.rpc('get_bank_balances')

      const mapped = {}
      for (const b of bank || []) {
        mapped[b.bank] = {
          balance: Number(b.balance || 0),
          income: Number(b.income || 0),
          expense: Number(b.expense || 0),
        }
      }

      setBankBalances({
        GSB: mapped.GSB || { balance: 0, income: 0, expense: 0 },
        KTB: mapped.KTB || { balance: 0, income: 0, expense: 0 },
        KBANK: mapped.KBANK || { balance: 0, income: 0, expense: 0 },
      })

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

      toastOk('อัปเดตแล้ว')
    } catch (e) {
      toastErr('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tax15 = Math.max(0, Math.floor(kpi.monthNet * 0.15))
  const afterTax = Math.max(0, kpi.monthNet - tax15)
  const salaryTotal = Math.min(Math.floor(afterTax * 0.3), 60000)
  const salaryHusband = Math.floor(salaryTotal / 3)
  const salaryWife = salaryTotal - salaryHusband
  const afterSalary = Math.max(0, afterTax - salaryTotal)

  const totalCash =
    bankBalances.GSB.balance + bankBalances.KTB.balance + bankBalances.KBANK.balance

  const bankDonutData = useMemo(
    () => [
      { name: 'GSB', value: bankBalances.GSB.balance || 0 },
      { name: 'KTB', value: bankBalances.KTB.balance || 0 },
      { name: 'KBANK', value: bankBalances.KBANK.balance || 0 },
    ],
    [bankBalances]
  )

  return (
    <AppShell title="Dashboard">
      <div style={container}>
        <Header loading={loading} reload={loadDashboard} />

        {(ok || err) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {ok && <div style={{ ...toast, borderColor: '#bbf7d0', background: '#f0fdf4' }}>{ok}</div>}
            {err && <div style={{ ...toast, borderColor: '#fecaca', background: '#fff1f2' }}>{err}</div>}
          </div>
        )}

        <Grid4>
          <KPI title="ยอดขายเดือนนี้" value={kpi.monthSales} suffix="บาท" />
          <KPI title="กำไรสุทธิเดือนนี้" value={kpi.monthNet} suffix="บาท" />
          <KPI title="ไม้คงเหลือ" value={kpi.activeCount} />
          <KPI title="มูลค่าทุนคงเหลือ" value={kpi.activeCostSum} suffix="บาท" />
        </Grid4>

        <Grid4>
          <KPI title="กันภาษี 15%" value={tax15} suffix="บาท" />
          <KPI title="เงินเดือนรวม" value={salaryTotal} suffix="บาท" />
          <KPI title="เหลือหลังเงินเดือน" value={afterSalary} suffix="บาท" />
          <KPI title="เงินสดรวมทั้งหมด" value={totalCash} suffix="บาท" />
        </Grid4>

        <Grid3>
          <BankCard bank="GSB" data={bankBalances.GSB} />
          <BankCard bank="KTB" data={bankBalances.KTB} />
          <BankCard bank="KBANK" data={bankBalances.KBANK} />
        </Grid3>

        <TwoCol>
          <ChartBox title="เงินแยกธนาคาร (Donut)">
            {mounted ? (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bankDonutData}
                      dataKey="value"
                      innerRadius={78}
                      outerRadius={110}
                      paddingAngle={2}
                      stroke="white"
                      strokeWidth={2}
                    >
                      {bankDonutData.map((d) => (
                        <Cell key={d.name} fill={BANK_THEME[d.name]?.color || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${Number(v || 0).toLocaleString()} บาท`} />
                  </PieChart>
                </ResponsiveContainer>

                <div style={donutCenter}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>รวมทั้งหมด</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {Number(totalCash || 0).toLocaleString()}
                  </div>
                </div>

                <div style={legendRow}>
                  <LegendPill bank="GSB" value={bankBalances.GSB.balance} />
                  <LegendPill bank="KTB" value={bankBalances.KTB.balance} />
                  <LegendPill bank="KBANK" value={bankBalances.KBANK.balance} />
                </div>
              </div>
            ) : (
              <div style={{ height: 280 }} />
            )}
          </ChartBox>

          <ChartBox title="ยอดขาย 14 วันล่าสุด">
            {mounted ? (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySales}>
                    <CartesianGrid stroke="#eef2f7" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(v) => `${Number(v || 0).toLocaleString()} บาท`} />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 280 }} />
            )}
          </ChartBox>
        </TwoCol>

        <Card>
          <h3 style={cardTitle}>บิลล่าสุด</h3>
          {latestInvoices.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 14 }}>ยังไม่มีบิล</div>
          ) : (
            latestInvoices.map((x) => <InvoiceRow key={x.id} data={x} />)
          )}
        </Card>
      </div>
    </AppShell>
  )
}

/* ===== UI Components ===== */

function Header({ loading, reload }) {
  return (
    <div style={header}>
      <div>
        <h2 style={{ margin: 0 }}>ศูนย์บัญชาการ</h2>
        <div style={{ color: '#6b7280', fontSize: 13 }}>ภาพรวมธุรกิจเดือนนี้</div>
      </div>
      <button onClick={reload} style={primaryBtn}>
        {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
      </button>
    </div>
  )
}

function KPI({ title, value, suffix }) {
  return (
    <Card>
      <div style={{ fontSize: 13, color: '#6b7280' }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
        {Number(value || 0).toLocaleString()}
        {suffix ? <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 6, color: '#6b7280' }}>{suffix}</span> : null}
      </div>
    </Card>
  )
}

function BankCard({ bank, data }) {
  const t = BANK_THEME[bank] || { color: '#94a3b8', logo: '', label: bank, tint: 'rgba(148,163,184,0.12)' }

  return (
    <div style={{ ...bankCardWrap, borderColor: t.tint }}>
      {/* watermark logo */}
      {t.logo ? (
        <img
          src={t.logo}
          alt={bank}
          style={bankWatermark}
          onError={(e) => {
            // ถ้า path รูปผิด จะไม่โชว์ให้รก
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : null}

      <div style={bankTopRow}>
        <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{t.label}</div>
        <div style={{ ...bankBadge, background: t.tint, color: t.color }}>Balance</div>
      </div>

      <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>
        {Number(data.balance || 0).toLocaleString()} <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 800 }}>บาท</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>รับเดือนนี้</div>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{Number(data.income || 0).toLocaleString()}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>จ่ายเดือนนี้</div>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{Number(data.expense || 0).toLocaleString()}</div>
      </div>
    </div>
  )
}

function LegendPill({ bank, value }) {
  const t = BANK_THEME[bank] || { color: '#94a3b8', label: bank }
  return (
    <div style={legendPill}>
      <span style={{ ...dot, background: t.color }} />
      <span style={{ fontWeight: 900 }}>{t.label}:</span>
      <span style={{ fontWeight: 800, color: '#111827' }}>{Number(value || 0).toLocaleString()}</span>
    </div>
  )
}

function InvoiceRow({ data }) {
  const payTone =
    data.pay_status === 'paid' ? 'paid' : data.pay_status === 'partial' ? 'partial' : 'unpaid'

  const borderColor = payTone === 'paid' ? '#22c55e' : payTone === 'partial' ? '#f59e0b' : '#ef4444'
  const badgeBg = payTone === 'paid' ? 'rgba(34,197,94,0.12)' : payTone === 'partial' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'
  const badgeText = payTone === 'paid' ? '#166534' : payTone === 'partial' ? '#92400e' : '#991b1b'
  const payLabel = payTone === 'paid' ? 'จ่ายแล้ว' : payTone === 'partial' ? 'แบ่งจ่าย' : 'ยังไม่จ่าย'
  const shipLabel = data.ship_status === 'shipped' ? 'ส่งแล้ว' : 'ยังไม่ส่ง'

  return (
    <Link href={`/receipt/${data.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          ...invoiceRow,
          border: `2px solid ${borderColor}`,
          boxShadow: '0 1px 0 rgba(17,24,39,0.04)',
        }}
      >
        <div>
          <div style={{ fontWeight: 800 }}>{data.invoice_no}</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {data.sale_date} • {data.customer_name}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                background: badgeBg,
                color: badgeText,
                fontSize: 12,
                fontWeight: 900,
                border: `1px solid ${borderColor}`,
              }}
            >
              {payLabel}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(59,130,246,0.10)',
                color: '#1d4ed8',
                fontSize: 12,
                fontWeight: 900,
                border: '1px solid rgba(59,130,246,0.35)',
              }}
            >
              {shipLabel}
            </span>
          </div>
        </div>

        <div style={{ fontWeight: 900 }}>{Number(data.total_price || 0).toLocaleString()} บาท</div>
      </div>
    </Link>
  )
}

/* ===== Layout ===== */

const container = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: 20,
  background: '#f6f8fb',
  minHeight: '100vh',
}

const toast = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  color: '#111827',
  fontWeight: 800,
}

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 18,
}

const primaryBtn = {
  padding: '10px 18px',
  borderRadius: 12,
  border: '1px solid rgba(17,24,39,0.08)',
  background: '#111827',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 900,
}

const Card = ({ children }) => (
  <div
    style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 18,
      padding: 16,
      boxShadow: '0 10px 30px rgba(17,24,39,0.06)',
    }}
  >
    {children}
  </div>
)

const Grid4 = ({ children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
      gap: 16,
      marginBottom: 16,
    }}
  >
    {children}
  </div>
)

const Grid3 = ({ children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
      gap: 16,
      marginBottom: 18,
    }}
  >
    {children}
  </div>
)

const TwoCol = ({ children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))',
      gap: 18,
      marginBottom: 18,
    }}
  >
    {children}
  </div>
)

const ChartBox = ({ title, children }) => (
  <Card>
    <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
    {children}
  </Card>
)

const cardTitle = {
  margin: 0,
  marginBottom: 10,
  fontWeight: 900,
}

const invoiceRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '1px solid #f1f5f9',
}

const bankCardWrap = {
  position: 'relative',
  overflow: 'hidden',
  background: '#ffffff',
  border: '1px solid rgba(17,24,39,0.08)',
  borderRadius: 18,
  padding: 16,
  boxShadow: '0 10px 30px rgba(17,24,39,0.06)',
}

const bankWatermark = {
  position: 'absolute',
  right: -10,
  top: -10,
  width: 160,
  height: 160,
  objectFit: 'contain',
  opacity: 0.10, // ปรับความใสตรงนี้ได้
  pointerEvents: 'none',
  filter: 'saturate(1.1)',
}

const bankTopRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const bankBadge = {
  padding: '6px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  border: '1px solid rgba(17,24,39,0.06)',
}

const donutCenter = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%,-65%)',
  textAlign: 'center',
  pointerEvents: 'none',
}

const legendRow = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 10,
}

const legendPill = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 999,
  border: '1px solid #e5e7eb',
  background: '#f8fafc',
  fontSize: 13,
}

const dot = {
  width: 10,
  height: 10,
  borderRadius: 999,
}