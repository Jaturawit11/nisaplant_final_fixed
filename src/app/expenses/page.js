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
    lilac: 'border border-violet-200/90 bg-violet-50 text-violet-700',
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
    lilac:
      'border border-violet-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(249,247,255,0.96)_46%,rgba(243,232,255,0.92)_100%)] shadow-[0_8px_24px_rgba(139,92,246,0.06)]',
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

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold tracking-tight text-slate-500">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-slate-400">{hint}</div> : null}
    </label>
  )
}

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100'

const primaryBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

function BankCard({ bank, label, balance, monthIn, monthOut }) {
  return (
    <div className="rounded-[24px] border border-white/85 bg-white/72 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold tracking-tight text-slate-900">{bank}</div>
          <div className="mt-1 text-xs text-slate-500">{label}</div>
        </div>
        <Pill tone={bank === 'GSB' ? 'rose' : bank === 'KTB' ? 'sky' : 'emerald'}>
          Balance
        </Pill>
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
    lilac: 'border-violet-100/90',
    amber: 'border-amber-100/90',
  }

  return (
    <div className={cn('rounded-[22px] border bg-white/72 p-4', toneMap[tone] || toneMap.default)}>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-3 text-[20px] font-bold tracking-tight text-slate-900">{money(value)}</div>
    </div>
  )
}

const TYPE_META = {
  income: { label: 'รายรับ', pill: 'emerald' },
  expense: { label: 'รายจ่าย', pill: 'rose' },
  purchase: { label: 'ซื้อของเข้า', pill: 'amber' },
  transfer: { label: 'โยกเงิน', pill: 'sky' },
  salary: { label: 'เงินเดือน', pill: 'lilac' },
}

const CATEGORY_PRESETS = {
  income: ['รายรับอื่นๆ', 'คืนเงิน', 'ขายของเก่า', 'รายรับพิเศษ'],
  expense: ['ค่าไฟ', 'ค่าน้ำ', 'ค่ากล่อง/อุปกรณ์', 'ค่าส่ง', 'อื่นๆ'],
  purchase: ['ซื้อไม้เข้าสวน', 'ค่าต้นไม้เก่าที่ค้าง', 'ซื้อวัสดุปลูก'],
  transfer: ['โยกเงินระหว่างบัญชี', 'สำรองจ่าย', 'โอนคืน'],
  salary: ['เงินเดือนผู้ดูแลระบบ', 'เงินเดือนผู้ช่วยขาย', 'เงินเดือนเจ้าของ'],
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
    purchaseTotal: 0,
    transferTotal: 0,
    salaryTotal: 0,
    businessNet: 0,
    afterSalary: 0,
  })

  const { start, end } = useMemo(() => monthRange(), [])

  const currentCategoryOptions = useMemo(() => {
    return CATEGORY_PRESETS[type] || []
  }, [type])

  useEffect(() => {
    if (!currentCategoryOptions.includes(category)) {
      setCategory(currentCategoryOptions[0] || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  async function loadPage() {
    setLoading(true)
    setErr('')
    setOk('')

    try {
      const [openingsRes, paymentsRes, expensesCalcRes, expensesRecentRes] = await Promise.all([
        supabase
          .from('bank_opening_balances')
          .select('bank, opening_amount, as_of_date, created_at')
          .order('as_of_date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('payments')
          .select('bank, amount, pay_date'),

        supabase
          .from('expenses')
          .select('id, expense_date, category, amount, bank, note, type, created_at'),

        supabase
          .from('expenses')
          .select('id, expense_date, category, amount, bank, note, type, created_at')
          .order('expense_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (openingsRes.error) throw openingsRes.error
      if (paymentsRes.error) throw paymentsRes.error
      if (expensesCalcRes.error) throw expensesCalcRes.error
      if (expensesRecentRes.error) throw expensesRecentRes.error

      const openingRows = openingsRes.data || []
      const paymentRows = paymentsRes.data || []
      const expenseCalcRows = expensesCalcRes.data || []
      const expenseRecentRows = expensesRecentRes.data || []

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

      for (const row of paymentRows) {
        const b = String(row.bank || '')
        const amt = Number(row.amount || 0)
        if (!bankMap[b]) continue
        bankMap[b].balance += amt
      }

      let incomeTotal = 0
      let expenseTotal = 0
      let purchaseTotal = 0
      let transferTotal = 0
      let salaryTotal = 0

      for (const row of expenseCalcRows) {
        const b = String(row.bank || '')
        const amt = Number(row.amount || 0)
        const rowType = String(row.type || '').toLowerCase()
        const rowDate = String(row.expense_date || '')

        if (bankMap[b]) {
          if (rowType === 'income') {
            bankMap[b].balance += amt
            if (rowDate >= start && rowDate < end) {
              bankMap[b].monthIn += amt
            }
          } else {
            bankMap[b].balance -= amt
            if (rowDate >= start && rowDate < end) {
              bankMap[b].monthOut += amt
            }
          }
        }

        if (rowDate >= start && rowDate < end) {
          if (rowType === 'income') incomeTotal += amt
          else if (rowType === 'expense') expenseTotal += amt
          else if (rowType === 'purchase') purchaseTotal += amt
          else if (rowType === 'transfer') transferTotal += amt
          else if (rowType === 'salary') salaryTotal += amt
        }
      }

      const businessNet = incomeTotal - expenseTotal
      const afterSalary = businessNet - salaryTotal

      setBankCards(bankMap)
      setRecentRows(expenseRecentRows)
      setSummary({
        incomeTotal,
        expenseTotal,
        purchaseTotal,
        transferTotal,
        salaryTotal,
        businessNet,
        afterSalary,
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

    const amt = Number(String(amount || '').replace(/,/g, ''))
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

  const insightText = useMemo(() => {
    if (type === 'salary') {
      return 'เงินเดือนเป็นเงินออกจริงจากธนาคาร แต่ไม่ควรไปรวมเป็นค่าใช้จ่ายธุรกิจปกติ'
    }
    if (type === 'transfer') {
      return 'โยกเงินควรใช้แยกจากค่าใช้จ่ายธุรกิจ เพื่อไม่ให้กำไรดูติดลบปลอม'
    }
    if (type === 'purchase') {
      return 'ซื้อของเข้าเป็นเงินออกจริง แต่ควรแยกจากค่าใช้จ่ายธุรกิจรายวัน'
    }
    if (type === 'income') {
      return 'รายรับพิเศษจะเพิ่มเงินในธนาคาร และถูกแยกจากยอดขายหน้าขาย'
    }
    return 'รายจ่ายธุรกิจปกติจะถูกใช้ประกอบการคำนวณกำไรธุรกิจจริง'
  }, [type])

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
              <div className="mt-1 text-sm leading-relaxed text-slate-500">
                จัดการรายรับ รายจ่าย ซื้อของเข้า โยกเงิน และเงินเดือน แยกหน้าที่ให้ชัดขึ้น
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="emerald">รับ {money(summary.incomeTotal)}</Pill>
              <Pill tone="rose">จ่ายธุรกิจ {money(summary.expenseTotal)}</Pill>
              <Pill tone="lilac">เงินเดือน {money(summary.salaryTotal)}</Pill>
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

          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-3 sm:gap-4">
              <ShellCard
                title="เพิ่มรายการรายรับ / รายจ่าย"
                subtitle="เลือกประเภทก่อน แล้วระบบจะปรับหมวดที่เหมาะให้"
                tint="default"
              >
                <div className="grid gap-3">
                  <Field label="ประเภท">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      {Object.entries(TYPE_META).map(([key, meta]) => {
                        const active = type === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setType(key)}
                            className={cn(
                              'h-11 rounded-2xl border text-sm font-semibold transition',
                              active
                                ? key === 'income'
                                  ? 'border-emerald-200 bg-emerald-500 text-white'
                                  : key === 'expense'
                                  ? 'border-rose-200 bg-rose-500 text-white'
                                  : key === 'purchase'
                                  ? 'border-amber-200 bg-amber-500 text-white'
                                  : key === 'salary'
                                  ? 'border-violet-200 bg-violet-500 text-white'
                                  : 'border-sky-200 bg-sky-500 text-white'
                                : 'border-slate-200 bg-white/85 text-slate-700'
                            )}
                          >
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                  </Field>

                  <div className="rounded-[22px] border border-white/85 bg-white/72 px-4 py-3 text-sm text-slate-600">
                    {insightText}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="วันที่">
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
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

                    <Field label="หมวดหมู่" hint="กดเลือกเร็วได้จากปุ่มด้านล่าง">
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                        {currentCategoryOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
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

                    <Field label="หมายเหตุ" hint="ใส่เพิ่มเฉพาะถ้าจำเป็น">
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="หมายเหตุ"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold tracking-tight text-slate-500">หมวดแนะนำ</div>
                    <div className="flex flex-wrap gap-2">
                      {currentCategoryOptions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c)}
                          className={cn(
                            'inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-semibold transition',
                            category === c
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white/85 text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1">
                    <button onClick={onSave} className={primaryBtnClass} disabled={loading}>
                      {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                </div>
              </ShellCard>

              <ShellCard
                title="วิเคราะห์วันนี้"
                subtitle="กล่องนี้ช่วยให้หน้านี้มีมุมตัดสินใจ ไม่ใช่แค่ฟอร์มกรอก"
                tint="lilac"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryBox label="สุทธิธุรกิจเดือนนี้" value={summary.businessNet} tone="sky" />
                  <SummaryBox label="เหลือหลังเงินเดือน" value={summary.afterSalary} tone="lilac" />
                  <SummaryBox label="ซื้อของเข้าเดือนนี้" value={summary.purchaseTotal} tone="amber" />
                  <SummaryBox label="โยกเงินเดือนนี้" value={summary.transferTotal} tone="sky" />
                </div>

                <div className="mt-4 rounded-[22px] border border-white/85 bg-white/74 px-4 py-4 text-sm leading-7 text-slate-700">
                  {summary.salaryTotal > 0 ? (
                    <>
                      เดือนนี้มีการจ่ายเงินเดือนแล้ว <b>{money(summary.salaryTotal)}</b> บาท
                      ดังนั้นเวลามองกำไรธุรกิจ ควรดูที่ <b>สุทธิธุรกิจเดือนนี้</b> ก่อน
                      แล้วค่อยดู <b>เหลือหลังเงินเดือน</b> เพื่อประเมินเงินใช้จริง
                    </>
                  ) : (
                    <>
                      เดือนนี้ยังไม่มีเงินเดือนถูกบันทึก ถ้าจะเริ่มแบ่งกำไรออกมาใช้
                      ควรลงเป็นประเภท <b>เงินเดือน</b> แยกจากรายจ่ายธุรกิจปกติ
                    </>
                  )}
                </div>
              </ShellCard>
            </div>

            <div className="grid gap-3 sm:gap-4">
              <ShellCard
                title="ยอดเงินจริงในธนาคาร"
                subtitle="คำนวณจาก opening + payments + expenses ทั้งหมด"
                tint="sky"
              >
                <div className="grid gap-3">
                  <BankCard
                    bank="GSB"
                    label="ธุรกิจ"
                    balance={bankCards.GSB.balance}
                    monthIn={bankCards.GSB.monthIn}
                    monthOut={bankCards.GSB.monthOut}
                  />
                  <BankCard
                    bank="KTB"
                    label="ส่วนตัว"
                    balance={bankCards.KTB.balance}
                    monthIn={bankCards.KTB.monthIn}
                    monthOut={bankCards.KTB.monthOut}
                  />
                  <BankCard
                    bank="KBANK"
                    label="เก็บกำไร"
                    balance={bankCards.KBANK.balance}
                    monthIn={bankCards.KBANK.monthIn}
                    monthOut={bankCards.KBANK.monthOut}
                  />
                </div>
              </ShellCard>

              <ShellCard
                title="สรุปเดือนนี้"
                subtitle="แยกบทบาทของตัวเลขให้ชัด ไม่ปนกัน"
                tint="cream"
              >
                <div className="grid gap-3">
                  <SummaryBox label="รายรับรวม" value={summary.incomeTotal} tone="emerald" />
                  <SummaryBox label="รายจ่ายธุรกิจรวม" value={summary.expenseTotal} tone="rose" />
                  <SummaryBox label="เงินเดือนรวม" value={summary.salaryTotal} tone="lilac" />
                  <SummaryBox label="สุทธิธุรกิจ" value={summary.businessNet} tone="sky" />
                  <SummaryBox label="เหลือหลังเงินเดือน" value={summary.afterSalary} tone="amber" />
                </div>
              </ShellCard>
            </div>
          </div>

          <ShellCard
            title="รายการล่าสุด 10 รายการ"
            subtitle="แสดงรายการพิเศษล่าสุด พร้อมแยกประเภทชัดเจน"
            tint="default"
          >
            {!recentRows.length ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                ยังไม่มีรายการ
              </div>
            ) : (
              <div className="grid gap-2">
                {recentRows.map((row) => {
                  const rowType = String(row.type || '').toLowerCase()
                  const meta = TYPE_META[rowType] || TYPE_META.expense
                  const positive = rowType === 'income'

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-[22px] border px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
                        rowType === 'income'
                          ? 'border-emerald-100/90 bg-emerald-50/70'
                          : rowType === 'salary'
                          ? 'border-violet-100/90 bg-violet-50/70'
                          : rowType === 'transfer'
                          ? 'border-sky-100/90 bg-sky-50/70'
                          : rowType === 'purchase'
                          ? 'border-amber-100/90 bg-amber-50/70'
                          : 'border-rose-100/90 bg-rose-50/70'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={meta.pill}>{meta.label}</Pill>
                          <div className="text-sm font-bold text-slate-900">{row.category || '-'}</div>
                          <div className="text-xs text-slate-500">{row.bank || '-'}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {row.expense_date} {row.note ? `• ${row.note}` : ''}
                        </div>
                      </div>

                      <div
                        className={cn(
                          'text-right text-sm font-bold',
                          positive ? 'text-emerald-700' : 'text-slate-700'
                        )}
                      >
                        {positive ? '+' : '-'}
                        {money(row.amount)}
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