'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import Link from 'next/link'

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ''))
}

/** UI ภาษาไทย (ไม่แตะค่าที่เก็บใน DB/RPC) */
const TH = {
  pay: { unpaid: 'ยังไม่จ่าย', partial: 'จ่ายบางส่วน', paid: 'จ่ายแล้ว' },
  ship: { not_shipped: 'ยังไม่ส่ง', shipped: 'ส่งแล้ว' },
}

function pad4(n) {
  const s = String(n ?? '')
  return s.padStart(4, '0')
}

function digitsOnly(s) {
  return /^[0-9]+$/.test(String(s || ''))
}

function parseMoneyInput(v) {
  if (v === null || v === undefined) return 0
  const s = String(v).replace(/[,\s]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function normalizeCode(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return ''

  const cleaned = raw.replace(/[^A-Z0-9-]/g, '')
  const compact = cleaned.replace(/-/g, '')

  if (compact && digitsOnly(compact) && !compact.startsWith('N') && !compact.startsWith('O')) {
    return compact
  }

  let m = cleaned.match(/^([NO])(\d{4})(\d{1,4})$/)
  if (m) return `${m[1]}-${m[2]}-${pad4(m[3])}`

  m = cleaned.match(/^([NO])\-?(\d{4})\-?(\d{1,4})$/)
  if (m) return `${m[1]}-${m[2]}-${pad4(m[3])}`

  return cleaned
}

function parseParts(code) {
  const s = String(code || '')
  const m = s.match(/^([NO])-(\d{4})-(\d{4})$/)
  if (!m) return null
  return { prefix: m[1], yymm: m[2], run: parseInt(m[3], 10) || 0 }
}

function parseUnifiedInput(input) {
  const raw = String(input || '').replace(/\r/g, '\n').trim()
  if (!raw) {
    return {
      codes: [],
      unresolvedDigits: [],
      invalidRanges: [],
      tooLongRange: false,
    }
  }

  const pieces = raw
    .split(/[\n,;\t]+/g)
    .map((s) => s.trim())
    .filter(Boolean)

  const codes = []
  const unresolvedDigits = []
  const invalidRanges = []
  let tooLongRange = false
  const seen = new Set()

  function pushCode(code) {
    if (!code) return
    if (!seen.has(code)) {
      seen.add(code)
      codes.push(code)
    }
  }

  for (const piece of pieces) {
    const rangeMatch = piece.match(/(.+?)\s*(?:ถึง|TO|to|~|>)\s*(.+)/)
    if (rangeMatch) {
      const left = normalizeCode(rangeMatch[1])
      const right = normalizeCode(rangeMatch[2])

      if (digitsOnly(left) || digitsOnly(right)) {
        invalidRanges.push(piece)
        continue
      }

      const ps = parseParts(left)
      const pe = parseParts(right)

      if (!ps || !pe) {
        invalidRanges.push(piece)
        continue
      }

      if (ps.prefix !== pe.prefix || ps.yymm !== pe.yymm || ps.run > pe.run) {
        invalidRanges.push(piece)
        continue
      }

      const count = pe.run - ps.run + 1
      if (count > 220) {
        tooLongRange = true
        continue
      }

      for (let i = 0; i < count; i++) {
        pushCode(`${ps.prefix}-${ps.yymm}-${pad4(ps.run + i)}`)
      }
      continue
    }

    const norm = normalizeCode(piece)
    if (!norm) continue

    if (digitsOnly(norm)) {
      unresolvedDigits.push(norm)
      continue
    }

    pushCode(norm)
  }

  return { codes, unresolvedDigits, invalidRanges, tooLongRange }
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
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</div>
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

const textareaClass =
  'w-full rounded-[22px] border border-slate-200/90 bg-white/85 px-4 py-3 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 resize-y'

const primaryBtnClass =
  'inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

const ghostBtnClass =
  'inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'

export default function SellPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [customer, setCustomer] = useState('')
  const [bank, setBank] = useState('GSB')
  const [payStatus, setPayStatus] = useState('unpaid')
  const [shipStatus, setShipStatus] = useState('not_shipped')
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [paidDate, setPaidDate] = useState('')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [lookupErr, setLookupErr] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupMap, setLookupMap] = useState({})
  const lastLookupKeyRef = useRef('')
  const [needPrefixModal, setNeedPrefixModal] = useState(false)
  const [pendingDigits, setPendingDigits] = useState('')
  const pendingSetterRef = useRef(null)

  const totals = useMemo(() => {
    const totalCost = items.reduce((s, x) => s + Number(x.cost || 0), 0)
    const totalPrice = items.reduce((s, x) => s + parseMoneyInput(x.price), 0)
    const profit = totalPrice - totalCost
    return { totalCost, totalPrice, profit }
  }, [items])

  const existingSet = useMemo(() => new Set(items.map((x) => normalizeCode(x.plant_code))), [items])
  const parsedInput = useMemo(() => parseUnifiedInput(codeInput), [codeInput])
  const previewCodes = useMemo(() => parsedInput.codes.slice(0, 220), [parsedInput.codes])

  function openPrefixModal(digits, setterFn) {
    setPendingDigits(digits)
    pendingSetterRef.current = setterFn
    setNeedPrefixModal(true)
  }

  function choosePrefix(pfx) {
    const digits = String(pendingDigits || '').replace(/[^0-9]/g, '')
    const yymm = digits.slice(0, 4)
    const run = digits.slice(4)
    const norm = `${pfx}-${yymm}-${pad4(run)}`
    setNeedPrefixModal(false)
    setPendingDigits('')
    const fn = pendingSetterRef.current
    pendingSetterRef.current = null
    if (typeof fn === 'function') fn(norm)
  }

  useEffect(() => {
    setLookupErr('')
    if (!previewCodes.length) {
      setLookupMap({})
      return
    }

    const key = previewCodes.join('|')
    if (key === lastLookupKeyRef.current) return
    lastLookupKeyRef.current = key

    const t = setTimeout(async () => {
      setLookupLoading(true)
      try {
        const { data, error } = await supabase
          .from('plants')
          .select('plant_code,name,cost,status')
          .in('plant_code', previewCodes)
          .limit(300)

        if (error) throw error

        const map = {}
        for (const code of previewCodes) {
          map[code] = { found: false }
        }

        for (const r of data || []) {
          const keyCode = normalizeCode(r.plant_code)
          map[keyCode] = { found: true, ...r }
        }

        setLookupMap(map)
      } catch (e) {
        setLookupErr(e.message || String(e))
      } finally {
        setLookupLoading(false)
      }
    }, 250)

    return () => clearTimeout(t)
  }, [previewCodes, supabase])

  function replaceOneDigitsOnlyWithPrefix(normCode) {
    setCodeInput((prev) => {
      const parts = String(prev || '')
        .replace(/\r/g, '\n')
        .split(/([\n,;\t]+)/g)

      let done = false
      const next = parts.map((part) => {
        if (done) return part
        const cleaned = String(part).trim()
        if (!cleaned) return part
        const normalized = normalizeCode(cleaned)
        if (digitsOnly(normalized)) {
          done = true
          return part.replace(cleaned, normCode)
        }
        return part
      })

      return next.join('')
    })
  }

  async function addParsed() {
    setErr('')

    if (parsedInput.tooLongRange) {
      return setErr('ช่วงรหัสยาวเกินไป จำกัดไม่เกิน 220 รายการต่อครั้ง')
    }

    if (parsedInput.invalidRanges.length) {
      return setErr(`ช่วงรหัสไม่ถูกต้อง: ${parsedInput.invalidRanges[0]}`)
    }

    if (parsedInput.unresolvedDigits.length === 1) {
      return openPrefixModal(parsedInput.unresolvedDigits[0], (norm) => {
        replaceOneDigitsOnlyWithPrefix(norm)
      })
    }

    if (parsedInput.unresolvedDigits.length > 1) {
      return setErr('มีรหัสเลขล้วนหลายตัว กรุณาใส่ N หรือ O ให้รหัสเหล่านั้นก่อน')
    }

    if (!previewCodes.length) {
      return setErr('ยังไม่มีรหัสที่พร้อมเพิ่ม')
    }

    const canAdd = []
    for (const code of previewCodes) {
      if (existingSet.has(code)) continue
      const info = lookupMap?.[code]
      if (info?.found && info.status === 'ACTIVE') {
        canAdd.push({
          plant_code: info.plant_code,
          name: info.name,
          cost: info.cost,
          price: '',
        })
      }
    }

    if (!canAdd.length) return setErr('ไม่มีรหัสที่ขายได้ (ACTIVE) ให้เพิ่ม')

    const seen = new Set(items.map((x) => normalizeCode(x.plant_code)))
    const merged = []
    for (const it of canAdd) {
      const k = normalizeCode(it.plant_code)
      if (!seen.has(k)) {
        seen.add(k)
        merged.push(it)
      }
    }

    setItems((prev) => [...prev, ...merged])
    setCodeInput('')
  }

  function updatePrice(idx, v) {
    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, price: v } : x)))
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function pickCandidateFromRpc(data) {
    if (!data) return null
    if (typeof data === 'string') return data

    if (Array.isArray(data)) {
      const first = data[0]
      if (!first) return null
      if (typeof first === 'string') return first
      if (first?.id) return first.id
      if (first?.create_sale_invoice) return first.create_sale_invoice
      if (first?.invoice_no) return first.invoice_no
      return null
    }

    if (typeof data === 'object') {
      if (data.create_sale_invoice) return data.create_sale_invoice
      if (data.id) return data.id
      if (data.invoice_no) return data.invoice_no
    }

    return null
  }

  async function getLatestInvoiceIdSafe() {
    const { data, error } = await supabase
      .from('invoices')
      .select('id,created_at')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) return null
    const id = data?.[0]?.id
    return isUuid(id) ? id : null
  }

  async function resolveInvoiceId(candidate) {
    if (isUuid(candidate)) return candidate

    if (typeof candidate === 'string' && candidate.startsWith('B')) {
      const { data, error } = await supabase
        .from('invoices')
        .select('id,invoice_no')
        .eq('invoice_no', candidate)
        .limit(1)

      if (!error) {
        const id = data?.[0]?.id
        if (isUuid(id)) return id
      }
    }

    return await getLatestInvoiceIdSafe()
  }

  async function createPaymentRecord({ invoiceId }) {
  if (payStatus !== 'partial') return

  const total = Number(totals.totalPrice || 0)
  if (total <= 0) return

  const amt = parseMoneyInput(receivedAmount || 0)
  if (!amt || amt <= 0) throw new Error('กรุณากรอก “ยอดที่รับจริง” (จ่ายบางส่วน)')
  if (amt > total) throw new Error('ยอดที่รับจริงมากกว่ายอดขายรวมของบิล')

  const payDate = paidDate ? paidDate : saleDate

  const { error } = await supabase.from('payments').insert({
    invoice_id: invoiceId,
    pay_date: payDate,
    bank,
    amount: amt,
    payment_method: paymentMethod || null,
    note: 'รับเงินบางส่วนจากการขาย',
  })
  if (error) throw error
}

  async function submit() {
    setErr('')
    if (!items.length) return setErr('ยังไม่มีรายการขาย')

    const bad = items.find((x) => parseMoneyInput(x.price) <= 0)
    if (bad) return setErr(`กรุณาใส่ราคาขายให้ครบ: ${bad.plant_code}`)

    if (payStatus === 'partial') {
      const ra = parseMoneyInput(receivedAmount || 0)
      if (!ra || ra <= 0) return setErr('กรุณากรอก “ยอดที่รับจริง” (จ่ายบางส่วน)')
      if (ra > Number(totals.totalPrice || 0)) return setErr('ยอดที่รับจริงมากกว่ายอดขายรวมของบิล')
    }

    setLoading(true)

    const payloadItems = items.map((x) => ({
      plant_code: x.plant_code,
      price: parseMoneyInput(x.price),
    }))

    const { data, error } = await supabase.rpc('create_sale_invoice', {
      p_sale_date: saleDate,
      p_customer_name: customer,
      p_bank: bank,
      p_pay_status: payStatus,
      p_ship_status: shipStatus,
      p_payment_method: paymentMethod,
      p_paid_date: paidDate ? paidDate : null,
      p_items: payloadItems,
    })

    if (error) {
      setLoading(false)
      return setErr(error.message)
    }

    try {
      const candidate = pickCandidateFromRpc(data)
      const invoiceId = await resolveInvoiceId(candidate)

      if (!isUuid(invoiceId)) {
        setLoading(false)
        return setErr(
          `สร้างบิลแล้ว แต่ระบบยังหา invoiceId (UUID) ไม่เจอ\n` +
            `RPC raw data: ${JSON.stringify(data)}\n` +
            `candidate: ${String(candidate)}`
        )
      }

      await createPaymentRecord({ invoiceId })

      setLoading(false)
      router.push(`/receipt/${invoiceId}`)
    } catch (e) {
      setLoading(false)
      setErr(e?.message || String(e))
    }
  }

  const previewRows = useMemo(() => {
    if (!previewCodes.length) return []

    return previewCodes.map((code) => {
      const info = lookupMap?.[code]
      const isDup = existingSet.has(code)

      if (isDup) return { code, state: 'dup', label: 'ซ้ำ (เพิ่มแล้ว)' }
      if (!info) return { code, state: 'loading', label: 'กำลังตรวจสอบ...' }
      if (info.found === false) return { code, state: 'missing', label: 'ไม่พบรหัส' }
      if (info.status !== 'ACTIVE') return { code, state: 'bad', label: `สถานะ ${info.status} (ขายไม่ได้)` }
      return { code, state: 'ok', label: `เจอแล้ว: ${info.name || '-'} (ACTIVE)` }
    })
  }, [previewCodes, lookupMap, existingSet])

  const canAddCount = useMemo(() => previewRows.filter((r) => r.state === 'ok').length, [previewRows])

  return (
    <AppShell title="ขาย">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant Sell
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                ขายสินค้า
              </div>
              <div className="mt-1 text-sm leading-relaxed text-slate-500">
              
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="emerald">รวม {items.length} รายการ</Pill>
              <Pill tone="sky">ขายได้ {canAddCount}</Pill>
            </div>
          </div>

          <ShellCard
            title="ข้อมูลบิล"
            subtitle="กรอกข้อมูลลูกค้า การรับเงิน และสถานะการชำระ"
            tint="default"
          >
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="วันที่ขาย">
                <input
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  type="date"
                  className={inputClass}
                />
              </Field>

              <Field label="ชื่อลูกค้า">
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="พิมพ์ชื่อ..."
                  className={inputClass}
                />
              </Field>

              <Field label="ธนาคารรับเงิน">
                <select value={bank} onChange={(e) => setBank(e.target.value)} className={inputClass}>
                  <option value="GSB">GSB (ธุรกิจ)</option>
                  <option value="KTB">KTB (ส่วนตัว)</option>
                  <option value="KBANK">KBANK (เก็บกำไร)</option>
                </select>
              </Field>

              <Field label="การชำระเงิน">
                <select
                  value={payStatus}
                  onChange={(e) => {
                    const v = e.target.value
                    setPayStatus(v)
                    if (v !== 'partial') setReceivedAmount('')
                  }}
                  className={inputClass}
                >
                  <option value="unpaid">{TH.pay.unpaid}</option>
                  <option value="partial">{TH.pay.partial}</option>
                  <option value="paid">{TH.pay.paid}</option>
                </select>
              </Field>

              <Field label="การจัดส่ง">
                <select
                  value={shipStatus}
                  onChange={(e) => setShipStatus(e.target.value)}
                  className={inputClass}
                >
                  <option value="not_shipped">{TH.ship.not_shipped}</option>
                  <option value="shipped">{TH.ship.shipped}</option>
                </select>
              </Field>

              <Field label="วิธีรับเงิน">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={inputClass}
                >
                  <option value="transfer">โอน</option>
                  <option value="cash">เงินสด</option>
                  <option value="qr">สแกน QR</option>
                </select>
              </Field>

              <Field label="วันที่รับเงิน (ถ้ามี)">
                <input
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  type="date"
                  className={inputClass}
                />
              </Field>

              {payStatus === 'partial' ? (
                <Field label="ยอดที่รับจริง (จ่ายบางส่วน)">
                  <input
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    inputMode="numeric"
                    placeholder="เช่น 3000"
                    className={inputClass}
                  />
                </Field>
              ) : null}
            </div>
          </ShellCard>
<Link
  href="/stock"
  className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
>
  เปิดคลังไม้พร้อมขาย
</Link>
          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <ShellCard
              title="เพิ่มรายการขาย (Plant Code)"
              subtitle="ช่องเดียว รองรับรหัสเดี่ยว หลายรหัส หลายบรรทัด คั่นด้วยคอมม่า และช่วงรหัส"
              tint="rose"
            >
              <div className="rounded-[22px] border border-white/85 bg-white/72 p-4 text-xs leading-6 text-slate-500">
                พิมพ์ได้ทั้งรหัสเดี่ยว / หลายรหัส / หลายบรรทัด / คั่นด้วยคอมม่า / ช่วงรหัส เช่น
                <div className="mt-2 font-extrabold tracking-tight text-slate-700">
                  N-2603-0002 / n26030002 / 26030002 / N-2603-0005 ถึง N-2603-0015
                </div>
              </div>

              <div className="mt-4">
                <textarea
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder={`ตัวอย่าง:
N-2603-0002
n26030003
26030004
N-2603-0005 ถึง N-2603-0010
O-2603-0042, o26030043`}
                  className={textareaClass}
                  rows={6}
                />
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs leading-relaxed text-slate-500">
                  {lookupLoading ? 'กำลังตรวจสอบ...' : `เพิ่มได้ (ACTIVE): ${canAddCount} / ${previewRows.length}`}
                  {parsedInput.unresolvedDigits.length ? (
                    <span className="font-semibold text-amber-600">
                      {' '}• มีรหัสเลขล้วน {parsedInput.unresolvedDigits.length} ตัว
                    </span>
                  ) : null}
                  {lookupErr ? (
                    <span className="font-semibold text-rose-600">
                      {' '}• {lookupErr}
                    </span>
                  ) : null}
                </div>

                <button
                  onClick={addParsed}
                  className={primaryBtnClass}
                  disabled={!previewRows.length && !parsedInput.unresolvedDigits.length}
                >
                  เพิ่มที่ขายได้ทั้งหมด
                </button>
              </div>

              {previewRows.length ? (
                <div className="mt-4 grid gap-2">
                  {previewRows.slice(0, 40).map((r) => (
                    <div
                      key={r.code}
                      className="flex items-center justify-between gap-3 rounded-[20px] border bg-white/80 px-4 py-3"
                      style={{ borderColor: borderByState(r.state) }}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                          {r.code}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{r.label}</div>
                      </div>

                      <div className="shrink-0">
                        {r.state === 'ok' ? <Pill tone="emerald">ACTIVE</Pill> : null}
                        {r.state === 'dup' ? <Pill tone="sky">ซ้ำ</Pill> : null}
                        {r.state === 'missing' ? <Pill tone="rose">ไม่พบ</Pill> : null}
                        {r.state === 'bad' ? <Pill tone="amber">ขายไม่ได้</Pill> : null}
                        {r.state === 'loading' ? <Pill tone="slate">ตรวจสอบ</Pill> : null}
                      </div>
                    </div>
                  ))}
                  {previewRows.length > 40 ? (
                    <div className="pt-1 text-xs text-slate-400">แสดง 40 รายการแรก</div>
                  ) : null}
                </div>
              ) : null}
            </ShellCard>

            <ShellCard title="สรุป" subtitle="รวมต้นทุน ยอดขาย และกำไรของบิลนี้" tint="sky">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <MiniStat label="ต้นทุนรวม" value={totals.totalCost.toLocaleString('th-TH')} tone="default" />
                <MiniStat label="ยอดขายรวม" value={totals.totalPrice.toLocaleString('th-TH')} tone="sky" />
                <MiniStat label="กำไร" value={totals.profit.toLocaleString('th-TH')} tone="emerald" />
              </div>

              {err ? (
                <div className="mt-4 rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 whitespace-pre-wrap">
                  {err}
                </div>
              ) : null}

              <button
                disabled={loading}
                onClick={submit}
                className={cn(primaryBtnClass, 'mt-4 h-12 w-full text-[15px]')}
              >
                {loading ? 'กำลังบันทึก...' : 'ยืนยันการขาย'}
              </button>
            </ShellCard>
          </div>

          <ShellCard
            title="รายการที่เลือกขาย"
            subtitle="ตรวจสอบชื่อ ทุน และกรอกราคาขายของแต่ละต้น"
            tint="default"
            right={<Pill tone="slate">{items.length} รายการ</Pill>}
          >
            {items.length ? (
              <div className="grid gap-3">
                {items.map((x, idx) => (
                  <div
                    key={x.plant_code}
                    className="rounded-[24px] border border-white/85 bg-white/84 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-[15px] font-extrabold tracking-tight text-slate-900">
                          {x.plant_code}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">{x.name}</div>
                      </div>

                      <button onClick={() => removeItem(idx)} className={ghostBtnClass}>
                        ลบ
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[20px] border border-slate-100 bg-white/70 p-4">
                        <div className="text-xs font-semibold text-slate-500">ทุน</div>
                        <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">
                          {Number(x.cost || 0).toLocaleString('th-TH')}
                        </div>
                      </div>

                      <Field label="ราคาขาย">
                        <input
                          value={x.price}
                          onChange={(e) => updatePrice(idx, e.target.value)}
                          inputMode="numeric"
                          className={inputClass}
                          placeholder="กรอกราคาขาย"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                ยังไม่มีรายการ
              </div>
            )}
          </ShellCard>
        </div>
      </div>

      {needPrefixModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 md:items-center">
          <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
            <div className="text-[18px] font-semibold tracking-tight text-slate-900">เลือกว่าเป็น N หรือ O</div>
            <div className="mt-2 text-sm leading-relaxed text-slate-500">
              คุณพิมพ์เป็นเลขล้วน:{' '}
              <span className="font-mono font-semibold text-slate-800">{pendingDigits}</span>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => choosePrefix('N')}
                className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                ใหม่ (N)
              </button>
              <button
                type="button"
                onClick={() => choosePrefix('O')}
                className="flex-1 rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                เก่า (O)
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setNeedPrefixModal(false)
                setPendingDigits('')
                pendingSetterRef.current = null
              }}
              className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

function borderByState(state) {
  if (state === 'ok') return 'rgba(16,185,129,0.42)'
  if (state === 'missing') return 'rgba(244,63,94,0.42)'
  if (state === 'bad') return 'rgba(245,158,11,0.42)'
  if (state === 'dup') return 'rgba(59,130,246,0.34)'
  return 'rgba(148,163,184,0.22)'
}