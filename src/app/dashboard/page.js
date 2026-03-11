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

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald: 'border border-emerald-200/80 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200/80 bg-amber-50 text-amber-700',
    rose: 'border border-rose-200/80 bg-rose-50 text-rose-700',
    slate: 'border border-slate-200/80 bg-white text-slate-600',
    teal: 'border border-teal-200/80 bg-teal-50 text-teal-700',
    sky: 'border border-sky-200/80 bg-sky-50 text-sky-700',
    lilac: 'border border-violet-200/80 bg-violet-50 text-violet-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-tight',
        map[tone] || map.slate
      )}
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
      className={cn(
        'relative overflow-hidden rounded-[30px] p-4 sm:p-5',
        tintMap[tint] || tintMap.default,
        className
      )}
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

        <div className="mt-3 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={safeData}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={92}
                stroke="#fff"
                strokeWidth={2}
              >
                {safeData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={total > 0 ? colors[idx % colors.length] : '#e2e8f0'}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => money(v)} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none -mt-[145px] flex h-0 items-center justify-center">
            <div className="rounded-full border border-white/85 bg-white/84 px-6 py-5 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <div className="text-[22px] font-bold tracking-tight text-slate-900">
                {centerTop}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">{centerBottom}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {data.map((item, idx) => (
            <span
              key={item.name}
              className="inline-flex items-center gap-2 rounded-full border border-white/85 bg-white/84 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colors[idx % colors.length] }}
              />
              {item.name} {money(item.value)}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}

function BankBalanceCard({ bank, balance, income, expense, tint = 'default' }) {
  return (
    <Card tint={tint} className="min-h-[170px]">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[15px] font-semibold tracking-[0.22em] text-slate-800">
            {bank}
          </div>
          <Pill tone={bank === 'GSB' ? 'rose' : bank === 'KTB' ? 'sky' : 'emerald'}>
            Balance
          </Pill>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[31px] font-bold leading-none tracking-tight text-slate-900">
            {money(balance)}
          </span>
          <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
        </div>

        <div className="mt-5 rounded-[20px] border border-white/85 bg-white/72 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">รับเดือนนี้</span>
            <span className="font-bold text-slate-900">{money(income)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-slate-500">จ่ายเดือนนี้</span>
            <span className="font-bold text-slate-900">{money(expense)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function LatestInvoicesCard({ rows }) {
  return (
    <Card tint="default" className="p-0">
      <div className="relative z-10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight text-slate-900">
              10 บิลล่าสุด
            </div>
            <div className="mt-1 text-xs leading-relaxed text-slate-500">
              รวม paid, partial, ยังไม่จ่าย
            </div>
          </div>
          <Pill tone="slate">{rows.length} รายการ</Pill>
        </div>

        <div className="mt-4">
          {!rows.length ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
              ยังไม่มีรายการ
            </div>
          ) : (
            <div className="grid gap-2">
              {rows.map((r) => {
                const tone =
                  r.pay_status === 'paid'
                    ? 'emerald'
                    : r.pay_status === 'partial'
                    ? 'amber'
                    : 'rose'

                const payLabel =
                  r.pay_status === 'paid'
                    ? 'paid'
                    : r.pay_status === 'partial'
                    ? 'partial'
                    : 'unpaid'

                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-[22px] border border-white/85 bg-white/84 px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                        {r.invoice_no}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500">
                        {r.sale_date} • {r.customer_name || '-'}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Pill tone={tone}>{payLabel}</Pill>
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-900">
                        {money(r.total_price)} บาท
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [kpi, setKpi] = useState({
    activeCount: 0,
    activeCostSum: 0,
    monthSales: 0,
    monthProfit: 0,
    taxReserve: 0,
    salaryTotal: 0,
    salaryTime: 0,
    salaryNisa: 0,
  })

  const [incomeExpenseData, setIncomeExpenseData] = useState([
    { name: 'รายรับ', value: 0 },
    { name: 'รายจ่าย', value: 0 },
  ])

  const [salesProfitData, setSalesProfitData] = useState([
    { name: 'ยอดขาย', value: 0 },
    { name: 'ทุนคงเหลือ', value: 0 },
  ])

  const [arData, setArData] = useState({
    total: 0,
    unpaidCount: 0,
    partialCount: 0,
    collectionPct: 0,
  })

  const [bankCards, setBankCards] = useState({
    GSB: { balance: 0, income: 0, expense: 0 },
    KTB: { balance: 0, income: 0, expense: 0 },
    KBANK: { balance: 0, income: 0, expense: 0 },
  })

  const [latestInvoices, setLatestInvoices] = useState([])

  const aiPlantText = useMemo(() => {
    if (kpi.activeCount <= 0) return 'มีเงินค้างชำระ ควรตามลูกหนี้ก่อนซื้อเพิ่ม'
    if (kpi.activeCount <= 5) return 'Stock ต่ำ ควรวางแผนเข้ามาเพิ่ม'
    if (kpi.activeCount <= 20) return 'สต๊อกกำลังดี คุมทุนและคุมการหมุนเงินต่อ'
    return 'สต๊อกค่อนข้างเยอะ ควรเร่งระบายและโฟกัสกำไร'
  }, [kpi.activeCount])

  const aiBizText = useMemo(() => {
    if (arData.total > 0) return 'มีบิลค้างชำระ ควรตามเก็บเงินเพื่อลดความเสี่ยง cashflow'
    if (kpi.monthProfit > 0) return 'ภาพรวมธุรกิจอยู่ในระดับปกติ'
    return 'ยังไม่มีรายได้เดือนนี้ ควรเริ่มจากบิลขายและคุมค่าใช้จ่าย'
  }, [arData.total, kpi.monthProfit])

  async function loadDashboard() {
    setLoading(true)
    setErr('')

    try {
      const { start, end } = monthRange()

      const [
        plantsRes,
        expensesMonthRes,
        invoicesMonthRes,
        invoicesLatestRes,
        bankBalancesRes,
      ] = await Promise.all([
        supabase.rpc('dashboard_plants_agg'),

        supabase
          .from('expenses')
          .select('amount, type, bank, expense_date')
          .gte('expense_date', start)
          .lt('expense_date', end),

        supabase
          .from('invoices')
          .select(
            'id, invoice_no, sale_date, customer_name, total_price, total_profit, pay_status, created_at'
          )
          .gte('sale_date', start)
          .lt('sale_date', end),

        supabase
          .from('invoices')
          .select(
            'id, invoice_no, sale_date, customer_name, total_price, pay_status, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(10),

        supabase.rpc('get_bank_balances'),
      ])

      if (plantsRes.error) throw plantsRes.error
      if (expensesMonthRes.error) throw expensesMonthRes.error
      if (invoicesMonthRes.error) throw invoicesMonthRes.error
      if (invoicesLatestRes.error) throw invoicesLatestRes.error
      if (bankBalancesRes.error) throw bankBalancesRes.error

      const plantRow = Array.isArray(plantsRes.data) ? plantsRes.data[0] || {} : plantsRes.data || {}
      const monthExpensesRows = expensesMonthRes.data || []
      const monthInvoicesRows = invoicesMonthRes.data || []
      const latestRows = invoicesLatestRes.data || []
      const bankBalanceRows = bankBalancesRes.data || []

      const activeCount = Number(
        plantRow.active_count ?? plantRow.activecount ?? plantRow.count ?? 0
      )
      const activeCostSum = Number(
        plantRow.total_cost ?? plantRow.active_cost_sum ?? plantRow.cost_sum ?? 0
      )

      let monthIncome = 0
      let monthExpense = 0

      for (const row of monthExpensesRows) {
        const amount = Number(row.amount || 0)
        const type = String(row.type || '').toLowerCase()
        if (type === 'income') monthIncome += amount
        else monthExpense += amount
      }

      const monthSales = monthInvoicesRows.reduce(
        (sum, row) => sum + Number(row.total_price || 0),
        0
      )
      const monthProfit = monthInvoicesRows.reduce(
        (sum, row) => sum + Number(row.total_profit || 0),
        0
      )

      const taxReserve = monthProfit > 0 ? monthProfit * 0.15 : 0
      const salaryTime = monthProfit > 0 ? Math.floor((monthProfit * 0.1) / 10) : 0
      const salaryNisa = monthProfit > 0 ? Math.floor((monthProfit * 0.2) / 10) : 0
      const salaryTotal = Math.min(60000, salaryTime + salaryNisa)

      const unpaidInvoices = monthInvoicesRows.filter(
        (r) => String(r.pay_status || '').toLowerCase() === 'unpaid'
      )
      const partialInvoices = monthInvoicesRows.filter(
        (r) => String(r.pay_status || '').toLowerCase() === 'partial'
      )

      const arTotal = [...unpaidInvoices, ...partialInvoices].reduce(
        (sum, row) => sum + Number(row.total_price || 0),
        0
      )

      const totalMonthInvoiceAmount = monthInvoicesRows.reduce(
        (sum, row) => sum + Number(row.total_price || 0),
        0
      )

      const collectionPct =
        totalMonthInvoiceAmount > 0
          ? Math.max(
              0,
              Math.min(
                100,
                ((totalMonthInvoiceAmount - arTotal) / totalMonthInvoiceAmount) * 100
              )
            )
          : 0

      const bankMap = {
        GSB: { balance: 0, income: 0, expense: 0 },
        KTB: { balance: 0, income: 0, expense: 0 },
        KBANK: { balance: 0, income: 0, expense: 0 },
      }

      for (const row of bankBalanceRows) {
        const bank = String(row.bank || '')
        if (!bankMap[bank]) continue
        bankMap[bank].balance = Number(row.balance || 0)
        bankMap[bank].income = Number(row.month_in || 0)
        bankMap[bank].expense = Number(row.month_out || 0)
      }

      setKpi({
        activeCount,
        activeCostSum,
        monthSales,
        monthProfit,
        taxReserve,
        salaryTotal,
        salaryTime,
        salaryNisa,
      })

      setIncomeExpenseData([
        { name: 'รายรับ', value: monthIncome },
        { name: 'รายจ่าย', value: monthExpense },
      ])

      setSalesProfitData([
        { name: 'ยอดขาย', value: monthSales },
        { name: 'ทุนคงเหลือ', value: activeCostSum },
      ])

      setArData({
        total: arTotal,
        unpaidCount: unpaidInvoices.length,
        partialCount: partialInvoices.length,
        collectionPct,
      })

      setBankCards(bankMap)
      setLatestInvoices(latestRows)
    } catch (e) {
      setErr(e?.message || 'โหลด Dashboard ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppShell title="Dashboard">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto max-w-6xl">
          <PageHeader title="ภาพรวมธุรกิจ" loading={loading} onReload={loadDashboard} />

          {err ? (
            <div className="mb-4 rounded-[24px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {err}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="ยอดขายเดือนนี้" value={kpi.monthSales} tint="rose" />
            <StatCard title="กำไรสุทธิเดือนนี้" value={kpi.monthProfit} tint="sky" />
            <SmallStatCard title="ไม้คงเหลือ" value={kpi.activeCount} suffix="ต้น" tint="cream" />
            <StatCard title="มูลค่าทุนคงเหลือ" value={kpi.activeCostSum} tint="emerald" />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="ภาษี 15%" value={kpi.taxReserve} tint="cream" />
            <SalaryCard
              title="เงินเดือน"
              total={kpi.salaryTotal}
              time={kpi.salaryTime}
              nisa={kpi.salaryNisa}
              tint="lilac"
            />
            <TextCard title="AI แนะนำการซื้อไม้" text={aiPlantText} tint="rose" icon="✿" />
            <TextCard title="AI วิเคราะห์ธุรกิจ" text={aiBizText} tint="sky" icon="◎" />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_0.95fr]">
            <DonutCard
              title="รายรับ / รายจ่าย"
              subtitle="ดูจากหน้า ค่าใช้จ่าย/รายรับ ของเดือนนี้"
              data={incomeExpenseData}
              colors={['#34d399', '#fb7185']}
              centerTop={money(
                incomeExpenseData.reduce((sum, x) => sum + Number(x.value || 0), 0) -
                  Number(incomeExpenseData[1]?.value || 0)
              )}
              centerBottom="สุทธิเดือนนี้"
              tint="emerald"
            />

            <DonutCard
              title="ยอดขาย / ทุนคงเหลือ"
              subtitle="ยอดขายเดือนนี้ เทียบกับมูลค่าทุนคงเหลือ"
              data={salesProfitData}
              colors={['#60a5fa', '#fbbf24']}
              centerTop={money(kpi.monthSales)}
              centerBottom="ยอดขายเดือนนี้"
              tint="sky"
            />

            <Card tint="rose" className="min-h-[385px]">
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                      ยอดค้างชำระ
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500">
                      ดูบิล unpaid / partial ของเดือนนี้
                    </div>
                  </div>
                  <div className="text-[36px] font-light text-rose-200">฿</div>
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="text-[38px] font-bold leading-none tracking-tight text-slate-900">
                    {money(arData.total)}
                  </span>
                  <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone="rose">unpaid {arData.unpaidCount}</Pill>
                  <Pill tone="amber">partial {arData.partialCount}</Pill>
                </div>

                <div className="mt-6 rounded-[22px] border border-white/85 bg-white/75 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>สัดส่วนที่เก็บยอดขายเดือนนี้</span>
                    <span>{Math.round(arData.collectionPct)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-rose-400 transition-all"
                      style={{ width: `${arData.collectionPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto rounded-[20px] border border-white/85 bg-white/72 px-4 py-3 text-sm leading-6 text-slate-500">
                  ติดตามยอดค้างชำระก่อนซื้อเพิ่ม จะช่วยลดความเสี่ยงของ cashflow
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <BankBalanceCard
              bank="GSB"
              balance={bankCards.GSB.balance}
              income={bankCards.GSB.income}
              expense={bankCards.GSB.expense}
              tint="rose"
            />
            <BankBalanceCard
              bank="KTB"
              balance={bankCards.KTB.balance}
              income={bankCards.KTB.income}
              expense={bankCards.KTB.expense}
              tint="sky"
            />
            <BankBalanceCard
              bank="KBANK"
              balance={bankCards.KBANK.balance}
              income={bankCards.KBANK.income}
              expense={bankCards.KBANK.expense}
              tint="emerald"
            />
          </div>

          <div className="mt-3">
            <LatestInvoicesCard rows={latestInvoices} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}