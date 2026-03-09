'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

function money(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toLocaleString('th-TH') : '0'
}

function monthRange(date = new Date()) {
  const d = new Date(date)
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const toISO = (x) => x.toISOString().slice(0, 10)
  return { start: toISO(start), end: toISO(end) }
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    rose: 'bg-rose-100 text-rose-800 ring-rose-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    teal: 'bg-teal-100 text-teal-800 ring-teal-200',
    sky: 'bg-sky-100 text-sky-800 ring-sky-200',
  }

  return (
    <span
      className={
        'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ' +
        (map[tone] || map.slate)
      }
    >
      {children}
    </span>
  )
}

function Card({ children, className = '', style }) {
  return (
    <div
      style={style}
      className={
        'relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ' +
        className
      }
    >
      {children}
    </div>
  )
}

function PageHeader({ title, loading, onReload }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="text-xl font-semibold tracking-tight text-slate-900">{title}</div>
      </div>

      <button
        onClick={onReload}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
      >
        {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
      </button>
    </div>
  )
}

function StatCard({ title, value, suffix = 'บาท' }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {money(value)}
        {suffix ? <span className="ml-2 text-sm font-semibold text-slate-500">{suffix}</span> : null}
      </div>
    </Card>
  )
}

function SmallStatCard({ title, value, suffix = '' }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {money(value)}
        {suffix ? <span className="ml-2 text-sm font-semibold text-slate-500">{suffix}</span> : null}
      </div>
    </Card>
  )
}

function TextCard({ title, text }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-3 text-lg font-semibold leading-snug text-slate-900">{text || '-'}</div>
    </Card>
  )
}

function SalaryCard({ title, total, time, nisa }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-sm text-slate-500">
        Time {money(time)} / Nisa {money(nisa)}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {money(total)}
        <span className="ml-2 text-sm font-semibold text-slate-500">บาท</span>
      </div>
    </Card>
  )
}

function DonutCard({ title, subtitle, data, colors, centerTop, centerBottom }) {
  const total = data.reduce((a, b) => a + Number(b.value || 0), 0)
  const safeData = total > 0 ? data : [{ name: 'ไม่มีข้อมูล', value: 1 }]

  return (
    <Card className="p-0">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</div> : null}
        </div>

        <span className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-900/10">
          รวม {money(total)}
        </span>
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-900/10">
          <div className="h-[250px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={72}
                  outerRadius={104}
                  paddingAngle={3}
                  stroke="rgba(0,0,0,0.04)"
                >
                  {safeData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={total > 0 ? colors[i % colors.length] : '#e2e8f0'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-white/85 px-5 py-3 text-center ring-1 ring-slate-900/10 backdrop-blur">
              <div className="text-3xl font-extrabold tracking-tight text-slate-900">{centerTop}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">{centerBottom}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {data.map((d, i) => (
            <span
              key={d.name}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200 shadow-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: colors[i % colors.length] }}
              />
              <span className="whitespace-nowrap">{d.name}</span>
              <span className="text-slate-900">{money(d.value)}</span>
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}

function UnpaidCard({ amount, unpaidCount, partialCount }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">ยอดค้างชำระ</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{money(amount)}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill tone="rose">unpaid {money(unpaidCount)}</Pill>
        <Pill tone="amber">partial {money(partialCount)}</Pill>
      </div>
    </Card>
  )
}

function InvoiceStatusPill({ status }) {
  const s = String(status || '').toLowerCase()

  if (s === 'paid') return <Pill tone="emerald">paid</Pill>
  if (s === 'partial') return <Pill tone="amber">partial</Pill>
  return <Pill tone="rose">unpaid</Pill>
}

function BankCard({ bankCode, bankData, bgImage }) {
  const tone =
    bankCode === 'GSB' ? 'rose' : bankCode === 'KTB' ? 'sky' : 'emerald'

  return (
    <Card className="h-[170px]">
      <div
        className="absolute inset-0 bg-no-repeat opacity-10"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundPosition: 'right center',
          backgroundSize: 'cover',
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">{bankCode}</div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {money(bankData.balance)} บาท
            </div>
          </div>
          <Pill tone={tone}>Balance</Pill>
        </div>

        <div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">รับเดือนนี้</span>
            <span className="font-semibold text-slate-900">{money(bankData.income)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-slate-500">จ่ายเดือนนี้</span>
            <span className="font-semibold text-slate-900">{money(bankData.expense)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  const [kpi, setKpi] = useState({
    monthSales: 0,
    monthGrossProfit: 0,
    monthIncome: 0,
    monthExpenses: 0,
    monthNetBusiness: 0,
    activeCount: 0,
    activeCostSum: 0,
  })

  const [latestInvoices, setLatestInvoices] = useState([])

  const [bankBalances, setBankBalances] = useState({
    GSB: { balance: 0, income: 0, expense: 0 },
    KTB: { balance: 0, income: 0, expense: 0 },
    KBANK: { balance: 0, income: 0, expense: 0 },
  })

  const [unpaidStats, setUnpaidStats] = useState({
    unpaid: 0,
    partial: 0,
    amount: 0,
  })

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 1800)
  }

  function toastErr(msg) {
    setErr(msg)
    setTimeout(() => setErr(''), 4000)
  }

  async function loadDashboard() {
    setLoading(true)

    try {
      const { start, end } = monthRange(new Date())

      const [
        plantsRes,
        expensesMonthRes,
        expensesAllRes,
        invoicesMonthRes,
        invoicesLatestRes,
      ] = await Promise.all([
        supabase.rpc('dashboard_plants_agg'),

        supabase
          .from('expenses')
          .select('amount, type, bank, expense_date')
          .gte('expense_date', start)
          .lt('expense_date', end),

        supabase
          .from('expenses')
          .select('amount, type, bank, expense_date'),

        supabase
          .from('invoices')
          .select('id, invoice_no, sale_date, customer_name, total_price, total_profit, pay_status, created_at')
          .gte('sale_date', start)
          .lt('sale_date', end),

        supabase
          .from('invoices')
          .select('id, invoice_no, sale_date, customer_name, total_price, pay_status, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (plantsRes.error) throw plantsRes.error
      if (expensesMonthRes.error) throw expensesMonthRes.error
      if (expensesAllRes.error) throw expensesAllRes.error
      if (invoicesMonthRes.error) throw invoicesMonthRes.error
      if (invoicesLatestRes.error) throw invoicesLatestRes.error

      const plantsAgg = Array.isArray(plantsRes.data) ? plantsRes.data[0] : plantsRes.data
      const monthExpensesRows = expensesMonthRes.data || []
      const allExpenseRows = expensesAllRes.data || []
      const monthInvoices = invoicesMonthRes.data || []
      const latestInvoicePool = invoicesLatestRes.data || []

      const monthIncome = monthExpensesRows
        .filter((x) => String(x.type || '').toLowerCase() === 'income')
        .reduce((sum, x) => sum + Number(x.amount || 0), 0)

      const monthExpenses = monthExpensesRows
        .filter((x) => String(x.type || '').toLowerCase() === 'expense')
        .reduce((sum, x) => sum + Number(x.amount || 0), 0)

      const monthSales = monthInvoices.reduce(
        (sum, x) => sum + Number(x.total_price || 0),
        0
      )

      const monthGrossProfit = monthInvoices.reduce(
        (sum, x) => sum + Number(x.total_profit || 0),
        0
      )

      const monthNetBusiness = monthGrossProfit - monthExpenses

      const bankMap = {
        GSB: { balance: 0, income: 0, expense: 0 },
        KTB: { balance: 0, income: 0, expense: 0 },
        KBANK: { balance: 0, income: 0, expense: 0 },
      }

      for (const row of allExpenseRows) {
        const bank = String(row.bank || '')
        if (!bankMap[bank]) continue

        const amount = Number(row.amount || 0)
        const type = String(row.type || '').toLowerCase()

        if (type === 'income') {
          bankMap[bank].balance += amount
        } else {
          bankMap[bank].balance -= amount
        }
      }

      for (const row of monthExpensesRows) {
        const bank = String(row.bank || '')
        if (!bankMap[bank]) continue

        const amount = Number(row.amount || 0)
        const type = String(row.type || '').toLowerCase()

        if (type === 'income') {
          bankMap[bank].income += amount
        } else {
          bankMap[bank].expense += amount
        }
      }

      const now = new Date()
      const latestFiltered = []

      for (const inv of latestInvoicePool) {
        const pay = String(inv.pay_status || '').toLowerCase()

        if (pay === 'paid') {
          const createdAt = inv.created_at ? new Date(inv.created_at) : null
          if (createdAt) {
            const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24)
            if (diffDays > 1) continue
          }
        }

        latestFiltered.push(inv)
        if (latestFiltered.length >= 10) break
      }

      let unpaid = 0
      let partial = 0
      let amount = 0

      for (const inv of latestInvoicePool) {
        const pay = String(inv.pay_status || '').toLowerCase()
        if (pay === 'unpaid') {
          unpaid += 1
          amount += Number(inv.total_price || 0)
        } else if (pay === 'partial') {
          partial += 1
          amount += Number(inv.total_price || 0)
        }
      }

      setKpi({
        monthSales,
        monthGrossProfit,
        monthIncome,
        monthExpenses,
        monthNetBusiness,
        activeCount: Number(plantsAgg?.active_count || 0),
        activeCostSum: Number(plantsAgg?.active_cost_sum || 0),
      })

      setBankBalances(bankMap)
      setLatestInvoices(latestFiltered)
      setUnpaidStats({
        unpaid,
        partial,
        amount,
      })

      toastOk('อัปเดตแล้ว')
    } catch (e) {
      console.error(e)
      toastErr('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tax15 = Math.max(0, Math.floor(kpi.monthNetBusiness * 0.15))
  const afterTax = Math.max(0, kpi.monthNetBusiness - tax15)
  const salaryTotal = Math.min(Math.floor(afterTax * 0.3), 60000)
  const salaryTime = Math.floor(salaryTotal / 3)
  const salaryNisa = salaryTotal - salaryTime

  const donutIncomeExpense = [
    { name: 'รายรับ', value: kpi.monthIncome },
    { name: 'รายจ่าย', value: kpi.monthExpenses },
  ]

  const donutSalesCost = [
    { name: 'ยอดขาย', value: kpi.monthSales },
    { name: 'ทุนคงเหลือ', value: kpi.activeCostSum },
  ]

  const aiBuyAdvice = useMemo(() => {
    if (unpaidStats.amount > 0) return 'มีเงินค้างชำระ ควรตามลูกหนี้ก่อนซื้อเพิ่ม'
    if (kpi.activeCount < 10) return 'Stock ต่ำ ควรหาไม้เข้ามาเพิ่ม'
    if (kpi.monthNetBusiness > 20000) return 'กำไรดี สามารถซื้อไม้เพิ่มได้'
    if (kpi.activeCostSum > kpi.monthSales && kpi.monthSales > 0) return 'ทุนคงเหลือสูงกว่ายอดขาย ควรระบายของก่อน'
    return 'ระบบค่อนข้างสมดุล ยังไม่จำเป็นต้องซื้อเพิ่มมาก'
  }, [kpi.activeCount, kpi.activeCostSum, kpi.monthNetBusiness, kpi.monthSales, unpaidStats.amount])

  const aiBusinessAnalysis = useMemo(() => {
    if (kpi.monthSales <= 0 && kpi.monthIncome > 0) return 'เดือนนี้ยังไม่มีการขาย แต่มีเงินเข้า ควรแยกเงินทุนกับยอดขายให้ชัด'
    if (kpi.monthNetBusiness < 0) return 'ธุรกิจขาดทุน ต้องลดค่าใช้จ่ายหรือเพิ่มยอดขาย'
    if (unpaidStats.partial + unpaidStats.unpaid > 0) return 'มีบิลค้างชำระ ควรตามเก็บเงินเพื่อลดความเสี่ยง'
    if (kpi.monthNetBusiness > 30000) return 'ธุรกิจกำไรดี สามารถขยายได้'
    return 'ภาพรวมธุรกิจอยู่ในระดับปกติ'
  }, [kpi.monthIncome, kpi.monthNetBusiness, kpi.monthSales, unpaidStats.partial, unpaidStats.unpaid])

  const bankBg = {
    GSB: '/banks/gsb.png',
    KTB: '/banks/ktb.png',
    KBANK: '/banks/kbank.png',
  }

  return (
    <AppShell title="Dashboard">
      <PageHeader title="ภาพรวมธุรกิจ" loading={loading} onReload={loadDashboard} />

      {(ok || err) && (
        <div className="mb-4">
          {ok ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
              {ok}
            </div>
          ) : null}
          {err ? (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-100">
              {err}
            </div>
          ) : null}
        </div>
      )}

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="ยอดขายเดือนนี้" value={kpi.monthSales} />
        <StatCard title="กำไรสุทธิเดือนนี้" value={kpi.monthNetBusiness} />
        <SmallStatCard title="ไม้คงเหลือ" value={kpi.activeCount} suffix="ต้น" />
        <StatCard title="มูลค่าทุนคงเหลือ" value={kpi.activeCostSum} />
      </div>

      {/* Row 2 */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="ภาษี 15%" value={tax15} />
        <SalaryCard
          title="เงินเดือน"
          total={salaryTotal}
          time={salaryTime}
          nisa={salaryNisa}
        />
        <TextCard title="AI แนะนำการซื้อไม้" text={aiBuyAdvice} />
        <TextCard title="AI วิเคราะห์ธุรกิจ" text={aiBusinessAnalysis} />
      </div>

      {/* Row 3 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DonutCard
          title="รายรับ / รายจ่าย"
          subtitle="ดูจากหน้า รายรับ/รายจ่าย ของเดือนนี้"
          data={donutIncomeExpense}
          colors={['#10b981', '#ef4444']}
          centerTop={money(kpi.monthIncome - kpi.monthExpenses)}
          centerBottom="สุทธิเดือนนี้"
        />

        <DonutCard
          title="ยอดขาย / ทุนคงเหลือ"
          subtitle="ยอดขายเดือนนี้ เทียบกับมูลค่าทุนคงเหลือ"
          data={donutSalesCost}
          colors={['#3b82f6', '#f59e0b']}
          centerTop={money(kpi.monthSales)}
          centerBottom="ยอดขายเดือนนี้"
        />

        <UnpaidCard
          amount={unpaidStats.amount}
          unpaidCount={unpaidStats.unpaid}
          partialCount={unpaidStats.partial}
        />
      </div>

      {/* Row 4 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(['GSB', 'KTB', 'KBANK']).map((bankCode) => (
          <BankCard
            key={bankCode}
            bankCode={bankCode}
            bankData={bankBalances[bankCode]}
            bgImage={bankBg[bankCode]}
          />
        ))}
      </div>

      {/* Row 5 */}
      <div className="mt-4">
        <Card className="p-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">10 บิลล่าสุด</div>
            <div className="text-xs text-slate-500">ซ่อน paid ที่เกิน 1 วัน</div>
          </div>

          <div className="divide-y divide-slate-100">
            {latestInvoices.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">ยังไม่มีรายการ</div>
            ) : (
              latestInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {inv.invoice_no || '(no invoice)'}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {inv.sale_date || '-'} • {inv.customer_name || '-'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <InvoiceStatusPill status={inv.pay_status} />
                    <div className="text-right text-sm font-semibold text-slate-900">
                      {money(inv.total_price)} บาท
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  )
}