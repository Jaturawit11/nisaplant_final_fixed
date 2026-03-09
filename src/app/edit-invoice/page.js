'use client'

import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { PAY_THAI, SHIP_THAI } from '@/components/ThaiStatus'

const money = (n) => Number(n || 0).toLocaleString('th-TH')

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
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

function StatusChip({ tone = 'gray', children }) {
  const map = {
    green: 'border border-emerald-200/90 bg-emerald-50 text-emerald-700',
    yellow: 'border border-amber-200/90 bg-amber-50 text-amber-700',
    red: 'border border-rose-200/90 bg-rose-50 text-rose-700',
    gray: 'border border-slate-200/90 bg-white text-slate-600',
  }

  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold whitespace-nowrap',
        map[tone] || map.gray
      )}
    >
      {children}
    </span>
  )
}

function payTone(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'paid') return 'green'
  if (s === 'partial') return 'yellow'
  return 'red'
}

function shipTone(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'shipped') return 'green'
  return 'gray'
}

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100'

const primaryBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

const ghostBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'

const warnBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-amber-200/80 bg-amber-500 px-5 text-sm font-semibold text-white transition hover:bg-amber-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

const dangerBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-rose-200/80 bg-rose-500 px-5 text-sm font-semibold text-white transition hover:bg-rose-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

export default function EditInvoicePage() {
  const supabase = supabaseBrowser()

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [items, setItems] = useState([])

  // filters
  const [dateFrom, setDateFrom] = useState(daysAgoISO(90))
  const [dateTo, setDateTo] = useState(todayISO())
  const [payFilter, setPayFilter] = useState('open') // open | unpaid | partial | paid | all
  const [bankFilter, setBankFilter] = useState('all') // all | GSB | KTB | KBANK

  // edit fields
  const [payStatus, setPayStatus] = useState('unpaid')
  const [shipStatus, setShipStatus] = useState('not_shipped')
  const [bank, setBank] = useState('GSB')
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [paidDate, setPaidDate] = useState('')
  const [customerName, setCustomerName] = useState('')

  const [selectedItemIds, setSelectedItemIds] = useState(new Set())
  const [refundAmount, setRefundAmount] = useState('')
  const [refundType, setRefundType] = useState('partial')

  const totals = useMemo(() => {
    const totalCost = Number(selected?.total_cost || 0)
    const totalPrice = Number(selected?.total_price || 0)
    const totalProfit = Number(selected?.total_profit || 0)
    return { totalCost, totalPrice, totalProfit }
  }, [selected])

  const isCancelled = useMemo(() => {
    const s = String(selected?.invoice_status || '').toLowerCase()
    return s === 'cancelled'
  }, [selected?.invoice_status])

  function resetActionInputsOnly() {
    setSelectedItemIds(new Set())
    setRefundAmount('')
    setRefundType('partial')
    setPaidDate('')
  }

  function resetPageForm({ keepFilters = true } = {}) {
    setErr('')
    setLoading(false)
    setResults([])
    setSelected(null)
    setItems([])
    setSelectedItemIds(new Set())

    setPayStatus('unpaid')
    setShipStatus('not_shipped')
    setBank('GSB')
    setPaymentMethod('transfer')
    setPaidDate('')
    setCustomerName('')

    setRefundAmount('')
    setRefundType('partial')
    setQ('')

    if (!keepFilters) {
      setDateFrom(daysAgoISO(90))
      setDateTo(todayISO())
      setPayFilter('open')
      setBankFilter('all')
    }
  }

  async function loadInvoices() {
    setErr('')
    setLoading(true)
    setResults([])

    try {
      let query = supabase
        .from('invoices')
        .select(
          'id, invoice_no, sale_date, customer_name, bank, pay_status, ship_status, payment_method, paid_date, invoice_status, total_cost, total_price, total_profit'
        )
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)

      if (dateFrom) query = query.gte('sale_date', dateFrom)
      if (dateTo) query = query.lte('sale_date', dateTo)

      if (bankFilter !== 'all') {
        query = query.eq('bank', bankFilter)
      }

      if (payFilter === 'open') {
        query = query.in('pay_status', ['unpaid', 'partial'])
      } else if (payFilter !== 'all') {
        query = query.eq('pay_status', payFilter)
      }

      const keyword = q.trim()
      if (keyword) {
        query = query.or(`invoice_no.ilike.%${keyword}%,customer_name.ilike.%${keyword}%`)
      }

      const { data, error } = await query
      if (error) throw error

      setResults(data || [])
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openInvoice(inv) {
    setErr('')
    setSelected(inv)
    setSelectedItemIds(new Set())

    setPayStatus(inv.pay_status || 'unpaid')
    setShipStatus(inv.ship_status || 'not_shipped')
    setBank(inv.bank || 'GSB')
    setPaymentMethod(inv.payment_method || 'transfer')
    setPaidDate(inv.paid_date || '')
    setCustomerName(inv.customer_name || '')

    setRefundAmount('')
    setRefundType('partial')

    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('id, invoice_id, plant_id, plant_code, plant_name, cost, price, profit, item_status, created_at')
        .eq('invoice_id', inv.id)
        .or('item_status.is.null,item_status.eq.ACTIVE')
        .order('created_at', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (e) {
      setErr(e.message || String(e))
      setItems([])
    }
  }

  function toggleItem(id) {
    setSelectedItemIds((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  async function rpcCancelInvoice() {
    if (!selected?.id || isCancelled) return

    const ok = confirm(
      `ยืนยัน "ยกเลิกทั้งบิล" ${selected.invoice_no} ?\n- คืนสต๊อกไม้ทุกต้นในบิล\n- บิลจะเป็น cancelled`
    )
    if (!ok) return

    setLoading(true)
    setErr('')
    try {
      const { error } = await supabase.rpc('cancel_invoice', {
        p_invoice_id: selected.id,
        p_reason: null,
      })
      if (error) throw error

      alert('ยกเลิกบิลเรียบร้อย')
      await loadInvoices()
      setSelected(null)
      setItems([])
      resetActionInputsOnly()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function rpcRemoveItems() {
    if (!selected?.id || isCancelled) return

    const ids = Array.from(selectedItemIds)
    if (!ids.length) {
      setErr('ยังไม่ได้เลือกรายการที่จะยกเลิก')
      return
    }

    const ok = confirm(
      `ยืนยัน "ยกเลิกรายการ" ${ids.length} รายการ?\n- คืนสต๊อกเฉพาะรายการที่เลือก\n- รายการจะถูกเอาออกจากบิล`
    )
    if (!ok) return

    setLoading(true)
    setErr('')
    try {
      const { error } = await supabase.rpc('remove_items_from_invoice', {
        p_invoice_id: selected.id,
        p_sale_item_ids: ids,
      })
      if (error) throw error

      await refreshSelected()
      await loadInvoices()
      resetActionInputsOnly()
      alert('ยกเลิกรายการเรียบร้อย')
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function rpcUpdateStatus() {
    if (!selected?.id || isCancelled) return

    const ok = confirm(
      `ยืนยันอัปเดตสถานะบิล ${selected.invoice_no} ?\n` +
        `ชำระเงิน: ${PAY_THAI[payStatus]}\n` +
        `จัดส่ง: ${SHIP_THAI[shipStatus]}`
    )
    if (!ok) return

    setLoading(true)
    setErr('')
    try {
      const { error } = await supabase.rpc('update_invoice_status', {
        p_invoice_id: selected.id,
        p_pay_status: payStatus,
        p_ship_status: shipStatus,
        p_bank: bank,
        p_payment_method: paymentMethod,
        p_paid_date: paidDate ? paidDate : null,
        p_customer_name: String(customerName || '').trim() || null,
      })
      if (error) throw error

      await refreshSelected()
      await loadInvoices()
      resetActionInputsOnly()
      alert('อัปเดตสถานะเรียบร้อย')
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function rpcRefund() {
    if (!selected?.id || isCancelled) return

    const amt = Number(refundAmount || 0)
    if (amt < 0) return setErr('ยอดคืนเงินต้องมากกว่าหรือเท่ากับ 0')

    const ok = confirm(
      `ยืนยันเคลมเงิน (${refundType === 'full' ? 'เต็มจำนวน' : 'บางส่วน'})\n` +
        `ยอดคืนเงิน: ${money(amt)} บาท\n` +
        `หมายเหตุ: ตอนนี้ระบบจะปรับสถานะชำระเงินอัตโนมัติ`
    )
    if (!ok) return

    setLoading(true)
    setErr('')
    try {
      const { error } = await supabase.rpc('refund_invoice', {
        p_invoice_id: selected.id,
        p_refund_amount: amt,
        p_refund_type: refundType,
        p_note: null,
      })
      if (error) throw error

      await refreshSelected()
      await loadInvoices()
      resetActionInputsOnly()
      alert('บันทึกเคลมเงินเรียบร้อย')
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function refreshSelected() {
    if (!selected?.id) return

    const { data, error } = await supabase
      .from('invoices')
      .select(
        'id, invoice_no, sale_date, customer_name, bank, pay_status, ship_status, payment_method, paid_date, invoice_status, total_cost, total_price, total_profit'
      )
      .eq('id', selected.id)
      .single()

    if (error) throw error

    setSelected(data)
    setPayStatus(data.pay_status || 'unpaid')
    setShipStatus(data.ship_status || 'not_shipped')
    setBank(data.bank || 'GSB')
    setPaymentMethod(data.payment_method || 'transfer')
    setPaidDate(data.paid_date || '')
    setCustomerName(data.customer_name || '')

    const b = await supabase
      .from('sale_items')
      .select('id, invoice_id, plant_id, plant_code, plant_name, cost, price, profit, item_status, created_at')
      .eq('invoice_id', data.id)
      .or('item_status.is.null,item_status.eq.ACTIVE')
      .order('created_at', { ascending: true })

    if (b.error) throw b.error
    setItems(b.data || [])
  }

  return (
    <AppShell title="แก้บิล (Edit Invoice)">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant Edit Invoice
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                แก้ไขบิล
              </div>
              <div className="mt-1 text-sm leading-relaxed text-slate-500">
                ธีมเดียวกับทุกหน้า เน้นมือถือ อ่านง่าย และคง logic เดิมไว้
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="sky">ผลลัพธ์ {results.length}</Pill>
              {selected ? (
                <Pill tone={isCancelled ? 'rose' : 'emerald'}>
                  {selected.invoice_no}
                </Pill>
              ) : null}
            </div>
          </div>

          <ShellCard
            title="ค้นหาบิล / ตัวกรอง"
            subtitle="ค้นหาจากเลขบิล ชื่อลูกค้า ช่วงวันที่ สถานะ และธนาคาร"
            tint="default"
          >
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Field label="ค้นหาเลขบิล / ชื่อลูกค้า">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="เช่น B26020006 หรือชื่อลูกค้า"
                  className={inputClass}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      loadInvoices()
                    }
                  }}
                />
              </Field>

              <Field label="จากวันที่">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="ถึงวันที่">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="สถานะการชำระ">
                <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className={inputClass}>
                  <option value="open">ยังไม่จ่าย + จ่ายบางส่วน</option>
                  <option value="unpaid">ยังไม่จ่าย</option>
                  <option value="partial">จ่ายบางส่วน</option>
                  <option value="paid">จ่ายแล้ว</option>
                  <option value="all">ทั้งหมด</option>
                </select>
              </Field>

              <Field label="ธนาคาร">
                <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className={inputClass}>
                  <option value="all">ทั้งหมด</option>
                  <option value="GSB">GSB</option>
                  <option value="KTB">KTB</option>
                  <option value="KBANK">KBANK</option>
                </select>
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={loadInvoices} className={primaryBtnClass} disabled={loading}>
                {loading ? 'กำลังโหลด...' : 'ค้นหา'}
              </button>

              <button
                onClick={() => resetPageForm({ keepFilters: false })}
                className={ghostBtnClass}
                disabled={loading}
              >
                ล้างฟอร์ม
              </button>
            </div>

            {err ? (
              <div className="mt-4 rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 whitespace-pre-wrap">
                {err}
              </div>
            ) : null}
          </ShellCard>

          <ShellCard
            title={`รายการบิล (${results.length})`}
            subtitle="แตะเลือกบิลเพื่อดูรายละเอียดและแก้ไข"
            tint="sky"
          >
            {!results.length ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                ไม่พบบิลตามเงื่อนไข
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto xl:block">
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">เลขบิล</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">วันที่</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">ลูกค้า</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-right text-xs font-semibold text-slate-400">ยอดรวม</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">ชำระเงิน</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">จัดส่ง</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">ธนาคาร</th>
                        <th className="border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-400">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr
                          key={r.id}
                          className={cn(
                            'transition',
                            selected?.id === r.id ? 'bg-emerald-50/70' : ''
                          )}
                        >
                          <td className="border-b border-slate-100 px-3 py-4 text-sm font-extrabold text-slate-900">
                            {r.invoice_no}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm text-slate-600">
                            {r.sale_date}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm text-slate-600">
                            {r.customer_name || '-'}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-right text-sm font-bold text-slate-900">
                            {money(r.total_price)}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm">
                            <StatusChip tone={payTone(r.pay_status)}>
                              {PAY_THAI[r.pay_status] || r.pay_status}
                            </StatusChip>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm">
                            <StatusChip tone={shipTone(r.ship_status)}>
                              {SHIP_THAI[r.ship_status] || r.ship_status}
                            </StatusChip>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm text-slate-600">
                            {r.bank || '-'}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm">
                            <button onClick={() => openInvoice(r)} className={primaryBtnClass.replace('h-11', 'h-9').replace('px-5', 'px-4')}>
                              แก้ไข
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-2 xl:hidden">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openInvoice(r)}
                      className={cn(
                        'rounded-[22px] border px-4 py-4 text-left shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition',
                        selected?.id === r.id
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-white/85 bg-white/82 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                            {r.invoice_no}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {r.sale_date} • {r.customer_name || '-'}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusChip tone={payTone(r.pay_status)}>
                              {PAY_THAI[r.pay_status] || r.pay_status}
                            </StatusChip>
                            <StatusChip tone={shipTone(r.ship_status)}>
                              {SHIP_THAI[r.ship_status] || r.ship_status}
                            </StatusChip>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold text-slate-900">
                            {money(r.total_price)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{r.bank || '-'}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </ShellCard>

          {selected ? (
            <>
              <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1fr_1fr]">
                <ShellCard
                  title={`รายละเอียดบิล: ${selected.invoice_no}`}
                  subtitle="ข้อมูลสรุปของบิลที่เลือก"
                  tint="rose"
                >
                  {isCancelled ? (
                    <div className="mb-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      บิลนี้ถูกยกเลิกแล้ว (CANCELLED) — โหมดดูอย่างเดียว
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/70 px-4 py-3">
                      <span className="text-sm text-slate-500">วันที่ขาย</span>
                      <span className="text-sm font-bold text-slate-900">{selected.sale_date}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/70 px-4 py-3">
                      <span className="text-sm text-slate-500">ลูกค้า</span>
                      <span className="text-sm font-bold text-slate-900">{selected.customer_name || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/70 px-4 py-3">
                      <span className="text-sm text-slate-500">ธนาคาร</span>
                      <span className="text-sm font-bold text-slate-900">{selected.bank || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/70 px-4 py-3">
                      <span className="text-sm text-slate-500">สถานะชำระเงิน</span>
                      <StatusChip tone={payTone(selected.pay_status)}>
                        {PAY_THAI[selected.pay_status] || selected.pay_status}
                      </StatusChip>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/70 px-4 py-3">
                      <span className="text-sm text-slate-500">สถานะจัดส่ง</span>
                      <StatusChip tone={shipTone(selected.ship_status)}>
                        {SHIP_THAI[selected.ship_status] || selected.ship_status}
                      </StatusChip>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/70 px-4 py-3">
                      <span className="text-sm text-slate-500">invoice_status</span>
                      <span className="text-sm font-bold text-slate-900">{selected.invoice_status || '-'}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="ต้นทุนรวม" value={money(totals.totalCost)} tone="default" />
                    <MiniStat label="ยอดรวม" value={money(totals.totalPrice)} tone="sky" />
                    <MiniStat label="กำไร" value={money(totals.totalProfit)} tone="emerald" />
                  </div>

                  {!isCancelled ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={rpcCancelInvoice} className={dangerBtnClass} disabled={loading}>
                        ยกเลิกทั้งบิล (คืนสต๊อก)
                      </button>
                      <button onClick={rpcRemoveItems} className={warnBtnClass} disabled={loading}>
                        ยกเลิกรายการที่เลือก
                      </button>
                    </div>
                  ) : null}
                </ShellCard>

                <ShellCard
                  title="รายการในบิล"
                  subtitle="เลือกรายการเพื่อลบออกจากบิลและคืนสต๊อก"
                  tint="default"
                  right={<Pill tone="slate">{items.length} รายการ</Pill>}
                >
                  {!items.length ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                      ไม่มี sale_items (หรือถูกยกเลิกหมดแล้ว)
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {items.map((it) => (
                        <label
                          key={it.id}
                          className={cn(
                            'flex items-center gap-3 rounded-[22px] border px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
                            isCancelled
                              ? 'border-slate-200 bg-slate-50 opacity-65'
                              : selectedItemIds.has(it.id)
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-white/85 bg-white/82'
                          )}
                        >
                          <input
                            type="checkbox"
                            disabled={isCancelled}
                            checked={selectedItemIds.has(it.id)}
                            onChange={() => toggleItem(it.id)}
                            className="h-4 w-4"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                              {it.plant_code}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{it.plant_name}</div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-sm font-bold text-slate-900">{money(it.price)}</div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              ทุน {money(it.cost)} • กำไร {money(it.profit)}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </ShellCard>
              </div>

              {!isCancelled ? (
                <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1fr_1fr]">
                  <ShellCard
                    title="อัปเดตสถานะ"
                    subtitle="แก้ข้อมูลลูกค้า การชำระ การจัดส่ง ธนาคาร และวิธีรับเงิน"
                    tint="emerald"
                  >
                    <div className="grid gap-3">
                      <Field label="ชื่อลูกค้า">
                        <input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="พิมพ์ชื่อลูกค้า..."
                          className={inputClass}
                        />
                      </Field>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="การชำระเงิน">
                          <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)} className={inputClass}>
                            <option value="unpaid">{PAY_THAI.unpaid}</option>
                            <option value="partial">{PAY_THAI.partial}</option>
                            <option value="paid">{PAY_THAI.paid}</option>
                          </select>
                        </Field>

                        <Field label="การจัดส่ง">
                          <select value={shipStatus} onChange={(e) => setShipStatus(e.target.value)} className={inputClass}>
                            <option value="not_shipped">{SHIP_THAI.not_shipped}</option>
                            <option value="shipped">{SHIP_THAI.shipped}</option>
                          </select>
                        </Field>

                        <Field label="ธนาคารรับเงิน">
                          <select value={bank} onChange={(e) => setBank(e.target.value)} className={inputClass}>
                            <option value="GSB">GSB (ธุรกิจ)</option>
                            <option value="KTB">KTB (ส่วนตัว)</option>
                            <option value="KBANK">KBANK (เก็บกำไร)</option>
                          </select>
                        </Field>

                        <Field label="วิธีรับเงิน">
                          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
                            <option value="transfer">โอน</option>
                            <option value="cash">เงินสด</option>
                            <option value="qr">สแกน QR</option>
                          </select>
                        </Field>
                      </div>

                      <Field label="วันที่รับเงิน (ถ้ามี)">
                        <input
                          value={paidDate}
                          onChange={(e) => setPaidDate(e.target.value)}
                          type="date"
                          className={inputClass}
                        />
                      </Field>

                      <button onClick={rpcUpdateStatus} className={primaryBtnClass} disabled={loading}>
                        บันทึกสถานะ
                      </button>
                    </div>
                  </ShellCard>

                  <ShellCard
                    title="เคลมเงิน"
                    subtitle="รองรับการคืนเงินบางส่วนหรือเต็มจำนวน"
                    tint="cream"
                  >
                    <div className="grid gap-3">
                      <Field label="ประเภทการคืนเงิน">
                        <select value={refundType} onChange={(e) => setRefundType(e.target.value)} className={inputClass}>
                          <option value="partial">เคลมบางส่วน</option>
                          <option value="full">เคลมเต็มจำนวน</option>
                        </select>
                      </Field>

                      <Field label="ยอดคืนเงิน (บาท)">
                        <input
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          inputMode="numeric"
                          placeholder="เช่น 100"
                          className={inputClass}
                        />
                      </Field>

                      <button onClick={rpcRefund} className={warnBtnClass} disabled={loading}>
                        บันทึกเคลมเงิน
                      </button>

                      <div className="rounded-[20px] border border-white/85 bg-white/70 px-4 py-3 text-xs leading-6 text-slate-500">
                        * ตอนนี้ระบบจะปรับ pay_status อัตโนมัติ
                        <br />
                        full → ยังไม่จ่าย
                        <br />
                        partial → จ่ายบางส่วน
                      </div>
                    </div>
                  </ShellCard>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}