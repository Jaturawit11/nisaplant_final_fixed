'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

const money = (n) => Number(n || 0).toLocaleString('th-TH')

function todayISO() {
  return new Date().toISOString().slice(0, 10)
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
    emerald: 'border border-emerald-200/90 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200/90 bg-amber-50 text-amber-700',
    rose: 'border border-rose-200/90 bg-rose-50 text-rose-700',
    slate: 'border border-slate-200/90 bg-white text-slate-600',
    sky: 'border border-sky-200/90 bg-sky-50 text-sky-700',
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

function ShellCard({ title, subtitle, tint = 'default', children, className = '' }) {
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
  }

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[30px] p-4 sm:p-5',
        tintMap[tint] || tintMap.default,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.66),transparent_38%)]" />
      <div className="relative z-10">
        {(title || subtitle) && (
          <div className="mb-4">
            {title ? (
              <div className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</div>
            ) : null}
            {subtitle ? (
              <div className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</div>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold tracking-tight text-slate-500">{label}</div>
      {children}
    </label>
  )
}

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100'

const primaryBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

function BankCard({ bank, balance, monthIn, monthOut }) {
  return (
    <div className="rounded-[24px] border border-white/85 bg-white/72 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-extrabold tracking-tight text-slate-900">{bank}</div>
        <Pill tone="sky">Balance</Pill>
      </div>

      <div className="mt-3 text-[20px] font-bold tracking-tight text-slate-900">
        {money(balance)}
      </div>

      <div className="mt-2 text-xs text-slate-500">
        รับ {money(monthIn)} | จ่าย {money(monthOut)}
      </div>
    </div>
  )
}

function SummaryBox({ label, value, tone = 'default' }) {
  const toneMap = {
    default: 'border-slate-100/90',
    emerald: 'border-emerald-100/90',
    rose: 'border-rose-100/90',
    sky: 'border-sky-100/90',
  }

  return (
    <div className={cn('rounded-[22px] border bg-white/72 p-4', toneMap[tone] || toneMap.default)}>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-3 text-[20px] font-bold tracking-tight text-slate-900">{money(value)}</div>
    </div>
  )
}

export default function ExpensesPage() {
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const [expenseDate, setExpenseDate] = useState(todayISO())
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('ค่าไฟ')
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState('GSB')
  const [note, setNote] = useState('')

  const [bankCards, setBankCards] = useState({
    GSB: { balance: 0, monthIn: 0, monthOut: 0 },
    KTB: { balance: 0, monthIn: 0, monthOut: 0 },
    KBANK: { balance: 0, monthIn: 0, monthOut: 0 },
  })

  const [recentRows, setRecentRows] = useState([])
  const [summary, setSummary] = useState({
    incomeTotal: 0,
    expenseTotal: 0,
    netTotal: 0,
  })

  const { start, end } = useMemo(() => monthRange(), [])

  async function loadPage() {
    setLoading(true)
    setErr('')
    setOk('')

    try {
      const [openingsRes, paymentsRes, expensesRes] = await Promise.all([
        supabase
          .from('bank_opening_balances')
          .select('bank, opening_amount, as_of_date, created_at')
          .order('as_of_date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase.from('payments').select('bank, amount, pay_date'),

        supabase
          .from('expenses')
          .select('id, expense_date, category, amount, bank, note, type, created_at')
          .order('expense_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (openingsRes.error) throw openingsRes.error
      if (paymentsRes.error) throw paymentsRes.error
      if (expensesRes.error) throw expensesRes.error

      const openingRows = openingsRes.data || []
      const paymentRows = paymentsRes.data || []
      const expenseRows = expensesRes.data || []

      const latestOpeningMap = new Map()
      for (const row of openingRows) {
        const key = String(row.bank || '')
        if (!key) continue
        if (!latestOpeningMap.has(key)) {
          latestOpeningMap.set(key, Number(row.opening_amount || 0))
        }
      }

      const bankMap = {
        GSB: { balance: latestOpeningMap.get('GSB') || 0, monthIn: 0, monthOut: 0 },
        KTB: { balance: latestOpeningMap.get('KTB') || 0, monthIn: 0, monthOut: 0 },
        KBANK: { balance: latestOpeningMap.get('KBANK') || 0, monthIn: 0, monthOut: 0 },
      }

      // ยอดเงินจริงปัจจุบัน = opening + payments + expenses(income) - expenses(expense)
      for (const row of paymentRows) {
        const b = String(row.bank || '')
        if (!bankMap[b]) continue
        bankMap[b].balance += Number(row.amount || 0)
      }

      let incomeTotal = 0
      let expenseTotal = 0

      for (const row of expenseRows) {
        const b = String(row.bank || '')
        const amt = Number(row.amount || 0)
        const rowType = String(row.type || '').toLowerCase()

        if (bankMap[b]) {
          if (rowType === 'income') {
            bankMap[b].balance += amt
            if (String(row.expense_date || '') >= start && String(row.expense_date || '') < end) {
              bankMap[b].monthIn += amt
            }
          } else {
            bankMap[b].balance -= amt
            if (String(row.expense_date || '') >= start && String(row.expense_date || '') < end) {
              bankMap[b].monthOut += amt
            }
          }
        }

        if (String(row.expense_date || '') >= start && String(row.expense_date || '') < end) {
          if (rowType === 'income') incomeTotal += amt
          else expenseTotal += amt
        }
      }

      setBankCards(bankMap)
      setRecentRows(expenseRows)
      setSummary({
        incomeTotal,
        expenseTotal,
        netTotal: incomeTotal - expenseTotal,
      })
    } catch (e) {
      setErr(e.message || 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSave() {
    setErr('')
    setOk('')

    const amt = Number(amount || 0)
    if (!amt || amt <= 0) {
      setErr('กรุณากรอกจำนวนเงินให้มากกว่า 0')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.rpc('create_expense', {
        p_expense_date: expenseDate,
        p_category: category,
        p_amount: amt,
        p_bank: bank,
        p_note: note || null,
        p_type: type,
      })

      if (error) throw error

      setAmount('')
      setNote('')
      setOk('บันทึกรายการเรียบร้อย')
      await loadPage()
    } catch (e) {
      setErr(e.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="ค่าใช้จ่าย">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant Income & Expense
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                เงินเข้าออกพิเศษ
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="emerald">รับ {money(summary.incomeTotal)}</Pill>
              <Pill tone="rose">จ่าย {money(summary.expenseTotal)}</Pill>
              <Pill tone="sky">สุทธิ {money(summary.netTotal)}</Pill>
            </div>
          </div>

          {err ? (
            <div className="rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {err}
            </div>
          ) : null}

          {ok ? (
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {ok}
            </div>
          ) : null}

          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1fr_0.9fr]">
            <ShellCard
              title="เพิ่มรายการรายรับ / รายจ่าย"
              subtitle="กรอกวันที่ ประเภท หมวด จำนวนเงิน ธนาคาร และหมายเหตุ"
              tint="default"
              className="min-h-[560px]"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="วันที่">
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="ประเภท">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={cn(
                        'h-11 rounded-2xl border text-sm font-semibold transition',
                        type === 'income'
                          ? 'border-emerald-200 bg-emerald-500 text-white'
                          : 'border-slate-200 bg-white/85 text-slate-700'
                      )}
                    >
                      รายรับ
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={cn(
                        'h-11 rounded-2xl border text-sm font-semibold transition',
                        type === 'expense'
                          ? 'border-rose-200 bg-rose-500 text-white'
                          : 'border-slate-200 bg-white/85 text-slate-700'
                      )}
                    >
                      รายจ่าย
                    </button>
                  </div>
                </Field>

                <Field label="หมวดหมู่">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                    <option value="ค่าไฟ">ค่าไฟ</option>
                    <option value="ค่าน้ำ">ค่าน้ำ</option>
                    <option value="ค่ากล่อง/อุปกรณ์">ค่ากล่อง/อุปกรณ์</option>
                    <option value="ค่าส่ง">ค่าส่ง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </Field>

                <Field label="จำนวนเงิน">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="numeric"
                    placeholder="จำนวนเงิน"
                    className={inputClass}
                  />
                </Field>

                <Field label="ธนาคาร">
                  <select value={bank} onChange={(e) => setBank(e.target.value)} className={inputClass}>
                    <option value="GSB">GSB</option>
                    <option value="KTB">KTB</option>
                    <option value="KBANK">KBANK</option>
                  </select>
                </Field>

                <Field label="หมายเหตุ">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="หมายเหตุ"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <button onClick={onSave} className={primaryBtnClass} disabled={loading}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </ShellCard>

            <div className="grid gap-3 sm:gap-4">
              <ShellCard
                title="ยอดเงินจริงในธนาคาร"
                subtitle="คำนวณจาก opening + payments + expenses"
                tint="sky"
              >
                <div className="grid gap-3">
                  <BankCard
                    bank="GSB"
                    balance={bankCards.GSB.balance}
                    monthIn={bankCards.GSB.monthIn}
                    monthOut={bankCards.GSB.monthOut}
                  />
                  <BankCard
                    bank="KTB"
                    balance={bankCards.KTB.balance}
                    monthIn={bankCards.KTB.monthIn}
                    monthOut={bankCards.KTB.monthOut}
                  />
                  <BankCard
                    bank="KBANK"
                    balance={bankCards.KBANK.balance}
                    monthIn={bankCards.KBANK.monthIn}
                    monthOut={bankCards.KBANK.monthOut}
                  />
                </div>
              </ShellCard>

              <ShellCard
                title="สรุปภาพรวม"
                subtitle="รวมจากรายการพิเศษทั้งหมดที่กรอกมา"
                tint="cream"
              >
                <div className="grid gap-3">
                  <SummaryBox label="รายรับรวม" value={summary.incomeTotal} tone="emerald" />
                  <SummaryBox label="รายจ่ายรวม" value={summary.expenseTotal} tone="rose" />
                  <SummaryBox label="สุทธิ" value={summary.netTotal} tone="sky" />
                </div>
              </ShellCard>
            </div>
          </div>

          <ShellCard
            title="รายการล่าสุด 10 รายการ"
            subtitle="แสดงรายการรายรับและรายจ่ายล่าสุด พร้อมธนาคารที่ใช้"
            tint="default"
          >
            {!recentRows.length ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                ยังไม่มีรายการ
              </div>
            ) : (
              <div className="grid gap-2">
                {recentRows.map((row) => {
                  const isIncome = String(row.type || '').toLowerCase() === 'income'
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-[22px] border px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
                        isIncome
                          ? 'border-emerald-100/90 bg-emerald-50/70'
                          : 'border-rose-100/90 bg-rose-50/70'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={isIncome ? 'emerald' : 'rose'}>
                            {isIncome ? 'รับ' : 'จ่าย'}
                          </Pill>
                          <div className="text-sm font-bold text-slate-900">{row.category || '-'}</div>
                          <div className="text-xs text-slate-500">{row.bank || '-'}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {row.expense_date} {row.note ? `• ${row.note}` : ''}
                        </div>
                      </div>

                      <div className={cn('text-right text-sm font-bold', isIncome ? 'text-emerald-700' : 'text-rose-700')}>
                        {isIncome ? '+' : '-'}{money(row.amount)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ShellCard>
        </div>
      </div>
    </AppShell>
  )
}