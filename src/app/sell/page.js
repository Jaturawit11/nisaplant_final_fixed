'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

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

/**
 * Normalize Plant Code ให้เป็นมาตรฐานเดียวกันก่อน query
 * รองรับ:
 *  - N26020010 -> N-2602-0010
 *  - N-2602-0010 -> N-2602-0010
 *  - n 2602 0010 -> N-2602-0010
 *  - o26030042 -> O-2603-0042
 *
 * ถ้าเป็นเลขล้วน (ไม่มี N/O) จะคืนค่าเลขล้วนไว้ก่อน
 */
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

function parseParts(code /* N-2603-0002 */) {
  const s = String(code || '')
  const m = s.match(/^([NO])-(\d{4})-(\d{4})$/)
  if (!m) return null
  return { prefix: m[1], yymm: m[2], run: parseInt(m[3], 10) || 0 }
}

/**
 * รองรับ 1 ช่อง แต่พิมพ์ได้หลายแบบ
 * - ทีละรหัส
 * - หลายรหัสคั่นด้วย newline / comma / ; / tab
 * - ช่วงรหัส เช่น N-2603-0005 ถึง N-2603-0015
 */
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

  // ✅ ใช้เมื่อ payStatus = partial
  const [receivedAmount, setReceivedAmount] = useState('')

  // ✅ เหลือช่องเดียว
  const [codeInput, setCodeInput] = useState('')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // realtime lookup
  const [lookupErr, setLookupErr] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupMap, setLookupMap] = useState({})
  const lastLookupKeyRef = useRef('')

  // ✅ Digits-only popup
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

  function choosePrefix(pfx /* 'N'|'O' */) {
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
    if (payStatus === 'unpaid') return

    const total = Number(totals.totalPrice || 0)
    if (total <= 0) return

    let amt = 0
    if (payStatus === 'paid') {
      amt = total
    } else if (payStatus === 'partial') {
      amt = parseMoneyInput(receivedAmount || 0)
      if (!amt || amt <= 0) throw new Error('กรุณากรอก “ยอดที่รับจริง” (จ่ายบางส่วน)')
      if (amt > total) throw new Error('ยอดที่รับจริงมากกว่ายอดขายรวมของบิล')
    }

    const payDate = paidDate ? paidDate : saleDate

    const { error } = await supabase.from('payments').insert({
      invoice_id: invoiceId,
      pay_date: payDate,
      bank,
      amount: amt,
      payment_method: paymentMethod || null,
      note: 'รับเงินจากการขาย',
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
      <div style={{ display: 'grid', gap: 12, maxWidth: 880, margin: '0 auto' }}>
        <Card title="ข้อมูลบิล">
          <div style={grid2}>
            <Field label="วันที่ขาย">
              <input value={saleDate} onChange={(e) => setSaleDate(e.target.value)} type="date" style={inputCompact} />
            </Field>

            <Field label="ชื่อลูกค้า">
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="พิมพ์ชื่อ..." style={inputCompact} />
            </Field>

            <Field label="ธนาคารรับเงิน">
              <select value={bank} onChange={(e) => setBank(e.target.value)} style={inputCompact}>
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
                style={inputCompact}
              >
                <option value="unpaid">{TH.pay.unpaid}</option>
                <option value="partial">{TH.pay.partial}</option>
                <option value="paid">{TH.pay.paid}</option>
              </select>
            </Field>

            <Field label="การจัดส่ง">
              <select value={shipStatus} onChange={(e) => setShipStatus(e.target.value)} style={inputCompact}>
                <option value="not_shipped">{TH.ship.not_shipped}</option>
                <option value="shipped">{TH.ship.shipped}</option>
              </select>
            </Field>

            <Field label="วิธีรับเงิน">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputCompact}>
                <option value="transfer">โอน</option>
                <option value="cash">เงินสด</option>
                <option value="qr">สแกน QR</option>
              </select>
            </Field>

            <Field label="วันที่รับเงิน (ถ้ามี)">
              <input value={paidDate} onChange={(e) => setPaidDate(e.target.value)} type="date" style={inputCompact} />
            </Field>

            {payStatus === 'partial' ? (
              <Field label="ยอดที่รับจริง (จ่ายบางส่วน)">
                <input
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="เช่น 3000"
                  style={inputCompact}
                />
              </Field>
            ) : null}
          </div>
        </Card>

        <Card title="เพิ่มรายการขาย (Plant Code) — ช่องเดียว รองรับหลายแบบ">
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
            พิมพ์ได้ทั้งรหัสเดี่ยว / หลายรหัส / หลายบรรทัด / คั่นด้วยคอมม่า / ช่วงรหัส เช่น
            <br />
            <span style={{ fontWeight: 900 }}>
              N-2603-0002
              {' / '}
              n26030002
              {' / '}
              26030002
              {' / '}
              N-2603-0005 ถึง N-2603-0015
            </span>
          </div>

          <textarea
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={`ตัวอย่าง:
N-2603-0002
n26030003
26030004
N-2603-0005 ถึง N-2603-0010
O-2603-0042, o26030043`}
            style={textareaCompact}
            rows={5}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {lookupLoading ? 'กำลังตรวจสอบ...' : `เพิ่มได้ (ACTIVE): ${canAddCount} / ${previewRows.length}`}
              {parsedInput.unresolvedDigits.length ? (
                <span style={{ color: '#ffd37a' }}>
                  {' '}• มีรหัสเลขล้วน {parsedInput.unresolvedDigits.length} ตัว
                </span>
              ) : null}
              {lookupErr ? <span style={{ color: '#ffb4b4' }}> • {lookupErr}</span> : null}
            </div>

            <button onClick={addParsed} style={primaryBtnCompact} disabled={!previewRows.length && !parsedInput.unresolvedDigits.length}>
              เพิ่มที่ขายได้ทั้งหมด
            </button>
          </div>

          {previewRows.length ? (
            <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
              {previewRows.slice(0, 40).map((r) => (
                <div key={r.code} style={{ ...previewRow, borderColor: borderByState(r.state) }}>
                  <div style={{ fontWeight: 900 }}>{r.code}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{r.label}</div>
                </div>
              ))}
              {previewRows.length > 40 ? <div style={{ fontSize: 12, opacity: 0.7 }}>แสดง 40 รายการแรก</div> : null}
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {items.map((x, idx) => (
              <div key={x.plant_code} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{x.plant_code}</div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>{x.name}</div>
                  </div>
                  <button onClick={() => removeItem(idx)} style={ghostBtn}>
                    ลบ
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <Mini label="ทุน">{Number(x.cost || 0).toLocaleString('th-TH')}</Mini>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>ราคาขาย</div>
                    <input value={x.price} onChange={(e) => updatePrice(idx, e.target.value)} inputMode="numeric" style={inputCompact} />
                  </div>
                </div>
              </div>
            ))}
            {!items.length ? <div style={{ opacity: 0.75 }}>ยังไม่มีรายการ</div> : null}
          </div>
        </Card>

        <Card title="สรุป">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Mini label="ต้นทุนรวม">{totals.totalCost.toLocaleString('th-TH')}</Mini>
            <Mini label="ยอดขายรวม">{totals.totalPrice.toLocaleString('th-TH')}</Mini>
            <Mini label="กำไร">{totals.profit.toLocaleString('th-TH')}</Mini>
          </div>

          {err ? <pre style={{ marginTop: 10, color: '#ffb4b4', whiteSpace: 'pre-wrap' }}>{err}</pre> : null}

          <button disabled={loading} onClick={submit} style={{ ...primaryBtn, width: '100%', height: 48, marginTop: 12 }}>
            {loading ? 'กำลังบันทึก...' : 'ยืนยันการขาย'}
          </button>
        </Card>
      </div>

      {needPrefixModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 md:items-center">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b1a14] p-4">
            <div className="text-base font-semibold text-white">เลือกว่าเป็น N หรือ O</div>
            <div className="mt-1 text-xs text-white/70">
              คุณพิมพ์เป็นเลขล้วน: <span className="font-mono text-white/90">{pendingDigits}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => choosePrefix('N')}
                className="flex-1 rounded-2xl bg-emerald-600/80 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                ใหม่ (N)
              </button>
              <button
                type="button"
                onClick={() => choosePrefix('O')}
                className="flex-1 rounded-2xl bg-sky-600/80 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
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
              className="mt-3 w-full rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/15"
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
  if (state === 'ok') return 'rgba(40, 200, 120, 0.55)'
  if (state === 'missing') return 'rgba(255, 120, 120, 0.55)'
  if (state === 'bad') return 'rgba(255, 200, 80, 0.55)'
  if (state === 'dup') return 'rgba(140, 200, 255, 0.45)'
  return 'rgba(255,255,255,0.12)'
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  )
}

function Mini({ label, children }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{children}</div>
    </div>
  )
}

const grid2 = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
}

const inputCompact = {
  width: '100%',
  height: 40,
  padding: '0 10px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.2)',
}

const textareaCompact = {
  width: '100%',
  padding: '10px 10px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.2)',
  resize: 'vertical',
}

const previewRow = {
  padding: '10px 12px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 10,
}

const primaryBtn = {
  height: 44,
  padding: '0 16px',
  borderRadius: 14,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const primaryBtnCompact = {
  height: 40,
  padding: '0 14px',
  borderRadius: 12,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const ghostBtn = {
  height: 36,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: 'white',
  cursor: 'pointer',
}