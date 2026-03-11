'use client'

import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

const money = (n) => Number(n || 0).toLocaleString('th-TH')

const INCOME_CATS = [
  { v: 'sell_plant', t: 'ขายไม้' },
  { v: 'lottery', t: 'ถูกรางวัล' },
  { v: 'difference_received', t: 'ได้รับเงินส่วนต่าง' },
  { v: 'other', t: 'อื่นๆ' },
]

const EXPENSE_CATS = [
  { v: 'electricity', t: 'ค่าไฟ' },
  { v: 'water', t: 'ค่าน้ำ' },
  { v: 'internet', t: 'อินเทอร์เน็ต' },
  { v: 'fertilizer', t: 'ค่าปุ๋ย' },
  { v: 'plant_supplies', t: 'ค่าอุปกรณ์ต้นไม้' },
  { v: 'shipping', t: 'ค่าขนส่ง' },
  { v: 'labor', t: 'ค่าแรง' },
  { v: 'rent', t: 'ค่าเช่า' },
  { v: 'other', t: 'อื่นๆ' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function isIncome(type) {
  return type === 'income'
}

function catLabel(type, v) {
  const source = isIncome(type) ? INCOME_CATS : EXPENSE_CATS
  return source.find((x) => x.v === v)?.t || v
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

function ShellCard({ title, subtitle, tint = 'default', right, children, className = '' }) {
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
        {(title || subtitle || right) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? (
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</div>
              ) : null}
            </div>
            {right}
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

function MiniStat({ label, value, tone = 'default' }) {
  const toneMap = {
    default: 'border-white/85 bg-white/82',
    rose: 'border-rose-100/90 bg-white/72',
    sky: 'border-sky-100/90 bg-white/72',
    emerald: 'border-emerald-100/90 bg-white/72',
    cream: 'border-amber-100/90 bg-white/72',
  }

  return (
    <div
      className={cn(
        'rounded-[22px] border p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
        toneMap[tone] || toneMap.default
      )}
    >
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[26px] font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100'

const primaryBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

const dangerSmallBtnClass =
  'inline-flex h-9 items-center justify-center rounded-full border border-rose-200/80 bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

export default function ExpensesPage() {
  const supabase = supabaseBrowser()

  const [entryDate, setEntryDate] = useState(todayISO())
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('electricity')
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState('GSB')
  const [note, setNote] = useState('')

  const [rows, setRows] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const categoryOptions = useMemo(
    () => (isIncome(type) ? INCOME_CATS : EXPENSE_CATS),
    [type]
  )

  useEffect(() => {
    const first = isIncome(type) ? INCOME_CATS[0]?.v : EXPENSE_CATS[0]?.v
    setCategory(first || 'other')
  }, [type])

  const incomeTotal = useMemo(
    () =>
      rows
        .filter((r) => r.type === 'income')
        .reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows]
  )

  const expenseTotal = useMemo(
    () =>
      rows
        .filter((r) => r.type !== 'income')
        .reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows]
  )

  const netTotal = useMemo(
    () => incomeTotal - expenseTotal,
    [incomeTotal, expenseTotal]
  )

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2500)
  }

  function toastErr(msg) {
    setErr(msg)
    setTimeout(() => setErr(''), 4000)
  }

  async function loadEntries() {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, expense_date, type, category, amount, bank, note, created_at')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    setRows(data || [])
  }

  async function loadBalances() {
    const { data, error } = await supabase.rpc('get_bank_balances')
    if (error) throw error
    setBalances(data || [])
  }

  async function loadAll() {
    try {
      await Promise.all([loadEntries(), loadBalances()])
    } catch (e) {
      toastErr(e?.message || 'โหลดข้อมูลไม่สำเร็จ')
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addEntry() {
    setErr('')
    setOk('')

    const amt = Number(amount || 0)
    if (!amt || amt <= 0) return toastErr('กรอกจำนวนเงินให้ถูกต้อง')

    setLoading(true)
    try {
      const payload = {
        expense_date: entryDate,
        type,
        category,
        amount: amt,
        bank,
        note: note?.trim() || null,
      }

      const { error } = await supabase.from('expenses').insert(payload)
      if (error) throw error

      setAmount('')
      setNote('')
      await loadAll()
      toastOk(isIncome(type) ? 'บันทึกรายรับสำเร็จ' : 'บันทึกรายจ่ายสำเร็จ')
    } catch (e) {
      toastErr(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function deleteEntry(id) {
    if (!confirm('ลบรายการนี้?')) return
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      await loadAll()
      toastOk('ลบรายการสำเร็จ')
    } catch (e) {
      toastErr(e?.message || 'ลบรายการไม่สำเร็จ')
    }
  }

  const latest10 = rows.slice(0, 10)

  return (
    <AppShell title="เงินเข้าออกพิเศษ">
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
                
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="emerald">รับ {money(incomeTotal)}</Pill>
              <Pill tone="rose">จ่าย {money(expenseTotal)}</Pill>
              <Pill tone="sky">สุทธิ {money(netTotal)}</Pill>
            </div>
          </div>

          {(err || ok) && (
            <div className="space-y-2">
              {err ? (
                <div className="rounded-[24px] border border-rose-100/90 bg-rose-50/92 px-4 py-3 text-sm font-semibold text-rose-700">
                  {err}
                </div>
              ) : null}
              {ok ? (
                <div className="rounded-[24px] border border-emerald-100/90 bg-emerald-50/92 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {ok}
                </div>
              ) : null}
            </div>
          )}

          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <ShellCard
              title="เพิ่มรายการรายรับ / รายจ่าย"
              subtitle="กรอกวันที่ ประเภท หมวด จำนวนเงิน ธนาคาร และหมายเหตุ"
              tint="default"
            >
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <Field label="วันที่">
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <div className="rounded-[24px] border border-white/85 bg-white/72 p-4">
                  <div className="mb-2 text-xs font-semibold tracking-tight text-slate-500">ประเภท</div>
                  <div className="inline-flex w-full rounded-2xl border border-slate-200/90 bg-white/85 p-1">
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={cn(
                        'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition',
                        type === 'income'
                          ? 'bg-emerald-500 text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      รายรับ
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={cn(
                        'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition',
                        type === 'expense'
                          ? 'bg-rose-500 text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      รายจ่าย
                    </button>
                  </div>
                </div>

                <Field label="หมวดหมู่">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.v} value={c.v}>
                        {c.t}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="จำนวนเงิน">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="จำนวนเงิน"
                    className={inputClass}
                    inputMode="decimal"
                  />
                </Field>

                <Field label="ธนาคาร">
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className={inputClass}
                  >
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

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={addEntry} disabled={loading} className={primaryBtnClass}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </ShellCard>

            <div className="grid gap-3 sm:gap-4">
              <ShellCard
                title="ยอดเงินจริงในธนาคาร"
                subtitle="คำนวณจากรายรับและรายจ่ายที่บันทึกไว้"
                tint="sky"
              >
                <div className="grid gap-3">
                  {balances.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
                      ยังไม่มีข้อมูลยอดธนาคาร
                    </div>
                  ) : (
                    balances.map((b) => (
                      <div
                        key={b.bank}
                        className="rounded-[22px] border border-white/85 bg-white/82 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-500">{b.bank}</div>
                            <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">
                              {money(b.balance)}
                            </div>
                          </div>
                          <Pill tone="sky">Balance</Pill>
                        </div>

                        <div className="mt-3 text-xs leading-6 text-slate-500">
                          รับ {money(b.income)} | จ่าย {money(b.expense)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ShellCard>

              <ShellCard
                title="สรุปภาพรวม"
                subtitle="รวมจากรายการทั้งหมดที่โหลดมา"
                tint="cream"
              >
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <MiniStat label="รายรับรวม" value={money(incomeTotal)} tone="emerald" />
                  <MiniStat label="รายจ่ายรวม" value={money(expenseTotal)} tone="rose" />
                  <MiniStat label="สุทธิ" value={money(netTotal)} tone="sky" />
                </div>
              </ShellCard>
            </div>
          </div>

          <ShellCard
            title="รายการล่าสุด 10 รายการ"
            subtitle="แสดงรายการรายรับและรายจ่ายล่าสุด พร้อมลบรายการได้"
            tint="default"
            right={<Pill tone="slate">{latest10.length} รายการ</Pill>}
          >
            <div className="grid gap-2">
              {latest10.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                  ยังไม่มีรายการ
                </div>
              ) : (
                latest10.map((r) => {
                  const green = r.type === 'income'
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-[24px] border px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between',
                        green
                          ? 'border-emerald-200/70 bg-emerald-50/50'
                          : 'border-rose-200/70 bg-rose-50/50'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold',
                              green
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            )}
                          >
                            {green ? 'รับ' : 'จ่าย'}
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {catLabel(r.type, r.category)}
                          </span>

                          <span className="text-xs text-slate-500">{r.bank}</span>
                        </div>

                        <div className="mt-2 text-xs leading-6 text-slate-500">
                          {r.expense_date}
                          {r.note ? ` • ${r.note}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <div
                          className={cn(
                            'text-sm font-extrabold whitespace-nowrap',
                            green ? 'text-emerald-700' : 'text-rose-700'
                          )}
                        >
                          {green ? '+' : '-'}
                          {money(r.amount)}
                        </div>

                        <button onClick={() => deleteEntry(r.id)} className={dangerSmallBtnClass}>
                          ลบ
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ShellCard>
        </div>
      </div>
    </AppShell>
  )
}