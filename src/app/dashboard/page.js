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
    emerald: 'border border-emerald-200/80 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200/80 bg-amber-50 text-amber-700',
    rose: 'border border-rose-200/80 bg-rose-50 text-rose-700',
    slate: 'border border-slate-200/80 bg-white text-slate-600',
    teal: 'border border-teal-200/80 bg-teal-50 text-teal-700',
    sky: 'border border-sky-200/80 bg-sky-50 text-sky-700',
  }

  return (
    <span
      className={
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-tight ' +
        (map[tone] || map.slate)
      }
    >
      {children}
    </span>
  )
}

function Card({ children, className = '', style, tint = 'default' }) {
  const tintMap = {
    default:
      'border border-white/80 bg-white/92 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
    rose:
      'border border-rose-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,244,247,0.96)_46%,rgba(252,231,243,0.92)_100%)] shadow-[0_8px_24px_rgba(244,63,94,0.06)]',
    sky:
      'border border-sky-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,250,255,0.96)_46%,rgba(224,242,254,0.92)_100%)] shadow-[0_8px_24px_rgba(59,130,246,0.06)]',
    emerald:
      'border border-emerald-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,255,250,0.96)_46%,rgba(209,250,229,0.92)_100%)] shadow-[0_8px_24px_rgba(16,185,129,0.06)]',
    cream:
      'border border-amber-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,251,245,0.96)_46%,rgba(255,247,237,0.92)_100%)] shadow-[0_8px_24px_rgba(245,158,11,0.06)]',
    lilac:
      'border border-violet-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(249,247,255,0.96)_46%,rgba(243,232,255,0.92)_100%)] shadow-[0_8px_24px_rgba(139,92,246,0.06)]',
  }

  return (
    <div
      style={style}
      className={
        'relative overflow-hidden rounded-[30px] p-4 sm:p-5 ' +
        (tintMap[tint] || tintMap.default) +
        ' ' +
        className
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.66),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.12)_100%)]" />
      {children}
    </div>
  )
}

function PageHeader({ title, loading, onReload }) {
  return (
    <div className="mb-5 sm:mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            NisaPlant Dashboard
          </div>
          <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
            {title}
          </div>
          <div className="mt-1 text-sm leading-relaxed text-slate-500">
          
          </div>
        </div>

        <button
          onClick={onReload}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99]"
        >
          {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
      </div>
    </div>
  )
}

function StatCard({ title, value, suffix = 'บาท', tint = 'default' }) {
  return (
    <Card tint={tint} className="min-h-[132px] sm:min-h-[142px]">
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="text-sm font-medium text-slate-500">{title}</div>

        <div className="mt-4">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-[31px] font-bold leading-none tracking-tight text-slate-900 sm:text-[36px]">
              {money(value)}
            </span>
            {suffix ? (
              <span className="mb-1 text-sm font-semibold text-slate-400">{suffix}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}

function SmallStatCard({ title, value, suffix = '', tint = 'default' }) {
  return (
    <Card tint={tint} className="min-h-[132px] sm:min-h-[142px]">
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="text-sm font-medium text-slate-500">{title}</div>

        <div className="mt-4">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-[31px] font-bold leading-none tracking-tight text-slate-900 sm:text-[36px]">
              {money(value)}
            </span>
            {suffix ? (
              <span className="mb-1 text-sm font-semibold text-slate-400">{suffix}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}

function TextCard({ title, text, tint = 'default', icon = '✦' }) {
  return (
    <Card tint={tint} className="min-h-[150px] sm:min-h-[162px]">
      <div className="pointer-events-none absolute right-5 top-4 text-[42px] font-light text-slate-300/35">
        {icon}
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="text-sm font-medium text-slate-500">{title}</div>

        <div className="mt-3 inline-flex w-fit rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-slate-500">
          Insight
        </div>

        <div className="mt-4 text-base font-semibold leading-7 tracking-tight text-slate-900 sm:text-[17px]">
          {text || '-'}
        </div>
      </div>
    </Card>
  )
}

function SalaryCard({ title, total, time, nisa, tint = 'default' }) {
  return (
    <Card tint={tint} className="min-h-[150px] sm:min-h-[162px]">
      <div className="relative z-10">
        <div className="text-sm font-medium text-slate-500">{title}</div>

        <div className="mt-2 inline-flex rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-500">
          Time {money(time)} / Nisa {money(nisa)}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[31px] font-bold leading-none tracking-tight text-slate-900 sm:text-[36px]">
            {money(total)}
          </span>
          <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
        </div>
      </div>
    </Card>
  )
}

function DonutCard({ title, subtitle, data, colors, centerTop, centerBottom, tint = 'default' }) {
  const total = data.reduce((a, b) => a + Number(b.value || 0), 0)
  const safeData = total > 0 ? data : [{ name: 'ไม่มีข้อมูล', value: 1 }]

  return (
    <Card tint={tint} className="p-0">
      <div className="relative z-10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 truncate text-xs leading-relaxed text-slate-500">
                {subtitle}
              </div>
            ) : null}
          </div>

          <span className="inline-flex items-center rounded-full border border-white/85 bg-white/84 px-3 py-1 text-[11px] font-semibold text-slate-600">
            รวม {money(total)}
          </span>
        </div>

        <div className="mt-4">
          <div className="relative overflow-hidden rounded-[26px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.72)_100%)] ring-1 ring-slate-900/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_55%)]" />
            <div className="relative h-[250px] p-3 sm:h-[275px] sm:p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={safeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={72}
                    outerRadius={104}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.96)"
                    strokeWidth={3}
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

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
              <div className="rounded-[24px] border border-white/88 bg-white/88 px-5 py-3 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
                <div className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 sm:text-[34px]">
                  {centerTop}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500 sm:text-xs">
                  {centerBottom}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.map((d, i) => (
              <span
                key={d.name}
                className="inline-flex items-center gap-2 rounded-full border border-white/85 bg-white/86 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm sm:text-[12px]"
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
      </div>
    </Card>
  )
}

function UnpaidCard({ amount, unpaidCount, partialCount, monthSales }) {
  const percent =
    Number(monthSales) > 0
      ? Math.min(100, Math.round((Number(amount || 0) / Number(monthSales || 0)) * 100))
      : 0

  return (
    <Card tint="rose" className="min-h-[250px] lg:min-h-full">
      <div className="pointer-events-none absolute right-5 top-5 text-[56px] text-rose-200/30">
        ₿
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="text-sm font-medium text-slate-500">ยอดค้างชำระ</div>

        <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900 sm:text-[38px]">
            {money(amount)}
          </span>
          <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Pill tone="rose">unpaid {money(unpaidCount)}</Pill>
          <Pill tone="amber">partial {money(partialCount)}</Pill>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="text-slate-500">สัดส่วนเทียบยอดขายเดือนนี้</span>
            <span className="text-slate-700">{percent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-rose-100">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#fb7185_0%,#f43f5e_100%)]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="mt-5 rounded-[20px] border border-white/85 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-500">
          ติดตามยอดค้างชำระก่อนซื้อเพิ่ม จะช่วยลดความเสี่ยงของ cashflow
        </div>
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
  const tone = bankCode === 'GSB' ? 'rose' : bankCode === 'KTB' ? 'sky' : 'emerald'
  const tint = bankCode === 'GSB' ? 'rose' : bankCode === 'KTB' ? 'sky' : 'emerald'

  return (
    <Card tint={tint} className="min-h-[194px] sm:min-h-[206px]">
      <div
        className="absolute inset-0 bg-no-repeat opacity-[0.05] blur-[1px]"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundPosition: 'center right',
          backgroundSize: 'cover',
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_42%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-[0.16em] text-slate-700">{bankCode}</div>

            <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
              <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900 sm:text-[38px]">
                {money(bankData.balance)}
              </span>
              <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
            </div>
          </div>

          <Pill tone={tone}>Balance</Pill>
        </div>

        <div className="mt-5 space-y-2 rounded-[22px] border border-white/82 bg-white/62 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">รับเดือนนี้</span>
            <span className="font-semibold text-slate-900">{money(bankData.income)}</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
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
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <PageHeader title="ภาพรวมธุรกิจ" loading={loading} onReload={loadDashboard} />

        {(ok || err) && (
          <div className="mb-4 sm:mb-5">
            {ok ? (
              <div className="rounded-[24px] border border-emerald-100/90 bg-emerald-50/92 px-4 py-3 text-sm font-semibold text-emerald-700">
                {ok}
              </div>
            ) : null}

            {err ? (
              <div className="rounded-[24px] border border-rose-100/90 bg-rose-50/92 px-4 py-3 text-sm font-semibold text-rose-700">
                {err}
              </div>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="ยอดขายเดือนนี้" value={kpi.monthSales} tint="rose" />
          <StatCard title="กำไรสุทธิเดือนนี้" value={kpi.monthNetBusiness} tint="sky" />
          <SmallStatCard title="ไม้คงเหลือ" value={kpi.activeCount} suffix="ต้น" tint="cream" />
          <StatCard title="มูลค่าทุนคงเหลือ" value={kpi.activeCostSum} tint="emerald" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="ภาษี 15%" value={tax15} tint="cream" />
          <SalaryCard
            title="เงินเดือน"
            total={salaryTotal}
            time={salaryTime}
            nisa={salaryNisa}
            tint="lilac"
          />
          <TextCard title="AI แนะนำการซื้อไม้" text={aiBuyAdvice} tint="rose" icon="✿" />
          <TextCard title="AI วิเคราะห์ธุรกิจ" text={aiBusinessAnalysis} tint="sky" icon="◎" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-3">
          <DonutCard
            title="รายรับ / รายจ่าย"
            subtitle="ดูจากหน้า รายรับ/รายจ่าย ของเดือนนี้"
            data={donutIncomeExpense}
            colors={['#34d399', '#fb7185']}
            centerTop={money(kpi.monthIncome - kpi.monthExpenses)}
            centerBottom="สุทธิเดือนนี้"
            tint="emerald"
          />

          <DonutCard
            title="ยอดขาย / ทุนคงเหลือ"
            subtitle="ยอดขายเดือนนี้ เทียบกับมูลค่าทุนคงเหลือ"
            data={donutSalesCost}
            colors={['#60a5fa', '#fbbf24']}
            centerTop={money(kpi.monthSales)}
            centerBottom="ยอดขายเดือนนี้"
            tint="sky"
          />

          <UnpaidCard
            amount={unpaidStats.amount}
            unpaidCount={unpaidStats.unpaid}
            partialCount={unpaidStats.partial}
            monthSales={kpi.monthSales}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-3">
          {(['GSB', 'KTB', 'KBANK']).map((bankCode) => (
            <BankCard
              key={bankCode}
              bankCode={bankCode}
              bankData={bankBalances[bankCode]}
              bgImage={bankBg[bankCode]}
            />
          ))}
        </div>

        <div className="mt-3 sm:mt-4">
          <Card tint="default" className="p-0">
            <div className="flex flex-col gap-2 border-b border-slate-100/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">
                  10 บิลล่าสุด
                </div>
                <div className="mt-1 text-xs text-slate-500">ซ่อน paid ที่เกิน 1 วัน</div>
              </div>
            </div>

            <div className="p-2.5 sm:p-3">
              {latestInvoices.length === 0 ? (
                <div className="rounded-[22px] px-4 py-8 text-sm text-slate-500">
                  ยังไม่มีรายการ
                </div>
              ) : (
                <div className="space-y-2.5">
                  {latestInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 rounded-[22px] border border-white/85 bg-white/82 px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-[15px]">
                          {inv.invoice_no || '(no invoice)'}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                          {inv.sale_date || '-'} • {inv.customer_name || '-'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <InvoiceStatusPill status={inv.pay_status} />
                        <div className="text-right text-sm font-semibold text-slate-900 sm:text-[15px]">
                          {money(inv.total_price)} บาท
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}