'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

function money(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toLocaleString('th-TH') : '0'
}

function num(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toLocaleString('th-TH') : '0'
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    rose: 'bg-rose-100 text-rose-800 ring-rose-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    teal: 'bg-teal-100 text-teal-800 ring-teal-200',
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

function Card({ children, className = '' }) {
  return <div className={'rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ' + className}>{children}</div>
}

function PageHeader({ title, subtitle, loading, onReload }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="text-xl font-semibold tracking-tight text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
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

function SmallStatCard({ title, value }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{num(value)}</div>
    </Card>
  )
}

function DonutCard({ title, subtitle, data, colors, centerTop, centerBottom }) {
  const total = data.reduce((a, b) => a + Number(b.value || 0), 0)

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        <Pill tone="slate">รวม {money(total)} </Pill>
      </div>

      <div className="mt-3 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={72}
              outerRadius={98}
              paddingAngle={3}
              stroke="rgba(0,0,0,0.04)"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => money(v)} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label overlay */}
        <div className="pointer-events-none -mt-[180px] flex h-[180px] items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{centerTop}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">{centerBottom}</div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {data.map((d, i) => (
          <Pill key={d.name} tone="slate">
            <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: colors[i % colors.length] }} />
            {d.name}: {money(d.value)}
          </Pill>
        ))}
      </div>
    </Card>
  )
}

function SoftTable({ title, rows, rightTitle }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {rightTitle ? <div className="text-xs text-slate-500">{rightTitle}</div> : null}
      </div>

      <div className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">ยังไม่มีรายการ</div>
        ) : (
          rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{r.leftTop}</div>
                <div className="truncate text-xs text-slate-500">{r.leftBottom}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{r.rightTop}</div>
                {r.rightBottom ? <div className="mt-0.5 text-xs text-slate-500">{r.rightBottom}</div> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const supabase = supabaseBrowser()

  // ✅ กัน Recharts เตือนตอน build/prerender (ResponsiveContainer วัดขนาดไม่ได้บน server)
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
    monthProfit: 0, // gross
    monthExpenses: 0,
    monthNet: 0,
  })

  const [latestInvoices, setLatestInvoices] = useState([])

  const [bankBalances, setBankBalances] = useState({
    GSB: { balance: 0, income: 0, expense: 0 },
    KTB: { balance: 0, income: 0, expense: 0 },
    KBANK: { balance: 0, income: 0, expense: 0 },
  })

  // ✅ เพิ่มแค่ meta สำหรับ “ภาพธนาคารให้พอดีกรอบ”
  const bankMeta = {
    GSB: { img: '/banks/gsb.png', tone: 'rose', bg: 'bg-rose-50' },
    KTB: { img: '/banks/ktb.png', tone: 'teal', bg: 'bg-sky-50' },
    KBANK: { img: '/banks/kbank.png', tone: 'emerald', bg: 'bg-emerald-50' },
  }

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
      const { data: plantsAgg } = await supabase.rpc('dashboard_plants_agg')
      const { data: monthSum } = await supabase.rpc('get_month_summary')

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

  // ===== Calculations (เหมือนเดิม แต่โชว์สวยขึ้น) =====
  const tax15 = Math.max(0, Math.floor(kpi.monthNet * 0.15))
  const afterTax = Math.max(0, kpi.monthNet - tax15)
  const salaryTotal = Math.min(Math.floor(afterTax * 0.3), 60000)
  const salaryHusband = Math.floor(salaryTotal / 3)
  const salaryWife = salaryTotal - salaryHusband
  const afterSalary = Math.max(0, afterTax - salaryTotal)

  const totalCash = bankBalances.GSB.balance + bankBalances.KTB.balance + bankBalances.KBANK.balance

  // ===== Donut datasets =====
  const donutProfit = [
    { name: 'กำไรขั้นต้น', value: kpi.monthProfit },
    { name: 'ค่าใช้จ่าย', value: kpi.monthExpenses },
    { name: 'กำไรสุทธิ', value: kpi.monthNet },
  ]

  const donutBank = [
    { name: 'GSB', value: bankBalances.GSB.balance },
    { name: 'KTB', value: bankBalances.KTB.balance },
    { name: 'KBANK', value: bankBalances.KBANK.balance },
  ]

  // สถานะจ่ายจาก invoice ล่าสุด (สรุปแบบเร็ว)
  const payAgg = useMemo(() => {
    let paid = 0
    let partial = 0
    let unpaid = 0
    for (const x of latestInvoices || []) {
      const s = String(x.pay_status || '').toLowerCase()
      if (s === 'paid') paid++
      else if (s === 'partial') partial++
      else unpaid++
    }
    return [
      { name: 'PAID', value: paid },
      { name: 'PARTIAL', value: partial },
      { name: 'UNPAID', value: unpaid },
    ]
  }, [latestInvoices])

  const invoiceRows = (latestInvoices || []).map((x) => {
    const pay = String(x.pay_status || '').toLowerCase()
    const ship = String(x.ship_status || '').toLowerCase()
    const payLabel = pay === 'paid' ? 'จ่ายแล้ว' : pay === 'partial' ? 'แบ่งจ่าย' : 'ยังไม่จ่าย'
    const shipLabel = ship === 'shipped' ? 'ส่งแล้ว' : 'ยังไม่ส่ง'

    return {
      key: x.id,
      leftTop: x.invoice_no || '(no invoice)',
      leftBottom: `${x.sale_date || '-'} • ${x.customer_name || '-'}`,
      rightTop: `${money(x.total_price)} บาท`,
      rightBottom: `${payLabel} • ${shipLabel}`,
    }
  })

  return (
    <AppShell title="Dashboard">
      <PageHeader title="ศูนย์บัญชาการ" subtitle="ภาพรวมธุรกิจเดือนนี้ (iOS Clean • Donut)" loading={loading} onReload={loadDashboard} />

      {/* Toast */}
      {(ok || err) && (
        <div className="mb-4">
          {ok ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">{ok}</div>
          ) : null}
          {err ? (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-100">{err}</div>
          ) : null}
        </div>
      )}

      {/* KPI rows */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="ยอดขายเดือนนี้" value={kpi.monthSales} />
        <StatCard title="กำไรสุทธิเดือนนี้" value={kpi.monthNet} />
        <SmallStatCard title="ไม้คงเหลือ" value={kpi.activeCount} />
        <StatCard title="มูลค่าทุนคงเหลือ" value={kpi.activeCostSum} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="กันภาษี 15%" value={tax15} />
        <StatCard title="เงินเดือนรวม" value={salaryTotal} />
        <StatCard title="เหลือหลังเงินเดือน" value={afterSalary} />
        <StatCard title="เงินสดรวมทั้งหมด" value={totalCash} />
      </div>

      {/* Donuts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {mounted ? (
          <>
            <DonutCard
              title="ภาพรวมกำไร"
              subtitle="กำไรขั้นต้น / ค่าใช้จ่าย / กำไรสุทธิ"
              data={donutProfit}
              colors={['#10b981', '#f59e0b', '#0ea5e9']}
              centerTop={money(kpi.monthNet)}
              centerBottom="กำไรสุทธิ"
            />

            <DonutCard
              title="เงินแยกธนาคาร"
              subtitle="ยอดคงเหลือ 3 บัญชี"
              data={donutBank}
              // ✅ สีตามธนาคาร (GSB ชมพู / KTB ฟ้า / KBANK เขียว)
              colors={['#ec4899', '#3b82f6', '#22c55e']}
              centerTop={money(totalCash)}
              centerBottom="รวมทั้งหมด"
            />

            <DonutCard
              title="สถานะการชำระ"
              subtitle="ดูจากบิลล่าสุด"
              data={payAgg}
              colors={['#10b981', '#f59e0b', '#94a3b8']}
              centerTop={String((latestInvoices || []).length)}
              centerBottom="บิลล่าสุด"
            />
          </>
        ) : (
          <>
            <Card className="h-[320px] animate-pulse" />
            <Card className="h-[320px] animate-pulse" />
            <Card className="h-[320px] animate-pulse" />
          </>
        )}
      </div>

      {/* Bank cards (soft) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(['GSB', 'KTB', 'KBANK']).map((b) => {
          const meta = bankMeta[b] || { img: '', tone: 'slate', bg: 'bg-slate-50' }

          return (
            <Card key={b}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{b}</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{money(bankBalances[b].balance)} บาท</div>
                </div>

                {/* ✅ แก้ตามสั่ง: “ภาพธนาคารให้พอดีกรอบ” */}
                <div className="flex items-start gap-2">
                  <div className={'relative h-[72px] w-[130px] overflow-hidden rounded-xl ' + meta.bg}>
                    <img
                      src={meta.img}
                      alt={b}
                      className="h-full w-full object-contain p-2 opacity-85"
                      draggable={false}
                    />
                  </div>
                  <Pill tone={meta.tone}>Balance</Pill>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">รับเดือนนี้</span>
                <span className="font-semibold text-slate-900">{money(bankBalances[b].income)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-500">จ่ายเดือนนี้</span>
                <span className="font-semibold text-slate-900">{money(bankBalances[b].expense)}</span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Latest invoices */}
      <div className="mt-4">
        <SoftTable title="บิลล่าสุด" rightTitle="แสดง 6 รายการล่าสุด" rows={invoiceRows} />
      </div>

      {/* Salary note (ไม่บังคับ แต่ช่วยจำ) */}
      <div className="mt-4">
        <Card>
          <div className="text-sm font-semibold text-slate-900">สรุปเงินเดือน (จากกำไรหลังภาษี)</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Pill tone="slate">หลังภาษี: {money(afterTax)}</Pill>
            <Pill tone="emerald">เงินเดือนรวม: {money(salaryTotal)} (Max 60,000)</Pill>
            <Pill tone="slate">ผัว: {money(salaryHusband)}</Pill>
            <Pill tone="slate">เมีย: {money(salaryWife)}</Pill>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}