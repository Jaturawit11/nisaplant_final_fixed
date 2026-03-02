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
    loadDashboard()
  }, [])

  const tax15 = Math.max(0, Math.floor(kpi.monthNet * 0.15))
  const afterTax = Math.max(0, kpi.monthNet - tax15)
  const salaryTotal = Math.min(Math.floor(afterTax * 0.3), 60000)
  const salaryHusband = Math.floor(salaryTotal / 3)
  const salaryWife = salaryTotal - salaryHusband
  const afterSalary = Math.max(0, afterTax - salaryTotal)

  const totalCash =
    bankBalances.GSB.balance +
    bankBalances.KTB.balance +
    bankBalances.KBANK.balance

  return (
    <AppShell title="Dashboard">
      <div style={container}>

        <Header loading={loading} reload={loadDashboard} />

        <Grid4>
          <KPI title="ยอดขายเดือนนี้" value={kpi.monthSales} />
          <KPI title="กำไรสุทธิเดือนนี้" value={kpi.monthNet} />
          <KPI title="ไม้คงเหลือ" value={kpi.activeCount} />
          <KPI title="มูลค่าทุนคงเหลือ" value={kpi.activeCostSum} />
        </Grid4>

        <Grid4>
          <KPI title="กันภาษี 15%" value={tax15} />
          <KPI title="เงินเดือนรวม" value={salaryTotal} />
          <KPI title="เหลือหลังเงินเดือน" value={afterSalary} />
          <KPI title="เงินสดรวมทั้งหมด" value={totalCash} />
        </Grid4>

        <Grid3>
          <BankCard name="GSB" data={bankBalances.GSB} />
          <BankCard name="KTB" data={bankBalances.KTB} />
          <BankCard name="KBANK" data={bankBalances.KBANK} />
        </Grid3>

        <TwoCol>
          <ChartBox title="ยอดขาย 14 วันล่าสุด">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailySales}>
                <CartesianGrid stroke="#f0f0f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#1f8a5b" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="สัดส่วนสต๊อก">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'ACTIVE', value: kpi.activeCount },
                    { name: 'SOLD', value: kpi.soldCount },
                  ]}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={90}
                >
                  <Cell fill="#1f8a5b" />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </TwoCol>

        <Card>
          <h3 style={cardTitle}>บิลล่าสุด</h3>
          {latestInvoices.map((x) => (
            <InvoiceRow key={x.id} data={x} />
          ))}
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
        <div style={{ color: '#6b7280', fontSize: 13 }}>
          ภาพรวมธุรกิจเดือนนี้
        </div>
      </div>
      <button onClick={reload} style={primaryBtn}>
        {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
      </button>
    </div>
  )
}

function KPI({ title, value }) {
  return (
    <Card>
      <div style={{ fontSize: 13, color: '#6b7280' }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
        {Number(value || 0).toLocaleString()}
      </div>
    </Card>
  )
}

function BankCard({ name, data }) {
  return (
    <Card>
      <div style={{ fontWeight: 700 }}>{name}</div>
      <div style={{ marginTop: 8 }}>
        ยอดคงเหลือ: {data.balance.toLocaleString()}
      </div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>
        รับ {data.income.toLocaleString()} | จ่าย {data.expense.toLocaleString()}
      </div>
    </Card>
  )
}

function InvoiceRow({ data }) {
  return (
    <div style={invoiceRow}>
      <div>
        <div style={{ fontWeight: 600 }}>{data.invoice_no}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {data.sale_date} • {data.customer_name}
        </div>
      </div>
      <div style={{ fontWeight: 600 }}>
        {Number(data.total_price || 0).toLocaleString()} บาท
      </div>
    </div>
  )
}

/* ===== Layout ===== */

const container = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: 20,
  background: '#f6f8f7',
  minHeight: '100vh',
}

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
}

const primaryBtn = {
  padding: '10px 18px',
  borderRadius: 12,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  cursor: 'pointer',
}

const Card = ({ children }) => (
  <div style={{
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
  }}>
    {children}
  </div>
)

const Grid4 = ({ children }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
    gap: 16,
    marginBottom: 20,
  }}>
    {children}
  </div>
)

const Grid3 = ({ children }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
    gap: 16,
    marginBottom: 20,
  }}>
    {children}
  </div>
)

const TwoCol = ({ children }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(400px,1fr))',
    gap: 20,
    marginBottom: 20,
  }}>
    {children}
  </div>
)

const ChartBox = ({ title, children }) => (
  <Card>
    <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
    {children}
  </Card>
)

const cardTitle = {
  margin: 0,
  marginBottom: 10,
}

const invoiceRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '1px solid #f0f0f0',
}