'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { PAY_THAI, SHIP_THAI } from '@/components/ThaiStatus'
import { supabaseBrowser } from '@/lib/supabase/browser'

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ''))
}

/**
 * Normalize Plant Code ให้เป็นมาตรฐานเดียวกันก่อน query
 * รองรับ:
 *  - N26020010 -> N-2602-0010
 *  - N-2602-0010 -> N-2602-0010
 *  - n 2602 0010 -> N-2602-0010
 */
function normalizeCode(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return ''

  // เอาเฉพาะ A-Z 0-9 และ -
  const cleaned = raw.replace(/[^A-Z0-9-]/g, '')

  // แบบไม่มีขีด: N26020010 (1 + 4 + 4)
  let m = cleaned.match(/^([NO])(\d{4})(\d{4})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  // แบบมี/ไม่มีขีดปนกัน: N-2602-0010, N2602-0010, N-26020010
  m = cleaned.match(/^([NO])\-?(\d{4})\-?(\d{4})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  // ถ้าไม่เข้าแพทเทิร์น ก็คืนแบบ cleaned (อย่างน้อยให้ตรงกับที่พิมพ์)
  return cleaned
}

// รับโค้ดหลายรูปแบบ: newline / space / comma / ; / tab แล้ว normalize ทุกตัว
function parseCodes(input) {
  return String(input || '')
    .replace(/\r/g, '\n')
    .split(/[\n,\t; ]+/g)
    .map((s) => normalizeCode(s))
    .filter(Boolean)
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

  const [plantCode, setPlantCode] = useState('')
  const [bulkText, setBulkText] = useState('')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // realtime lookup
  const [lookupErr, setLookupErr] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupMap, setLookupMap] = useState({}) // normalizedCode -> { found, plant_code, name, cost, status }
  const lastLookupKeyRef = useRef('')

  const totals = useMemo(() => {
    const totalCost = items.reduce((s, x) => s + Number(x.cost || 0), 0)
    const totalPrice = items.reduce((s, x) => s + Number(x.price || 0), 0)
    const profit = totalPrice - totalCost
    return { totalCost, totalPrice, profit }
  }, [items])

  const existingSet = useMemo(() => new Set(items.map((x) => normalizeCode(x.plant_code))), [items])

  const previewCodes = useMemo(() => {
    const single = parseCodes(plantCode)
    const bulk = parseCodes(bulkText)

    const uniq = []
    const seen = new Set()
    for (const c of [...single, ...bulk]) {
      if (!seen.has(c)) {
        seen.add(c)
        uniq.push(c)
      }
      if (uniq.length >= 120) break
    }
    return uniq
  }, [plantCode, bulkText])

  // --- Realtime Lookup (debounce) ---
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
        // query ด้วย normalized codes (ซึ่งตรงกับใน DB ที่เป็น N-2602-xxxx)
        const { data, error } = await supabase
          .from('plants')
          .select('plant_code,name,cost,status')
          .in('plant_code', previewCodes)
          .limit(200)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewCodes.join('|')])

  async function addOne(codeRaw) {
    setErr('')
    const code = normalizeCode(codeRaw)
    if (!code) return

    const cached = lookupMap?.[code]
    if (cached && cached.found === false) return setErr('ไม่พบรหัสต้นไม้นี้')
    if (existingSet.has(code)) return setErr('เพิ่มรหัสนี้แล้ว')

    if (cached && cached.found) {
      if (cached.status !== 'ACTIVE') return setErr('ต้นไม้นี้ไม่อยู่สถานะขายได้ (ACTIVE)')
      setItems((prev) => [...prev, { plant_code: cached.plant_code, name: cached.name, cost: cached.cost, price: '' }])
      setPlantCode('')
      return
    }

    // fallback query
    const { data, error } = await supabase.from('plants').select('plant_code,name,cost,status').eq('plant_code', code).limit(1)
    if (error) return setErr(error.message)
    if (!data?.length) return setErr('ไม่พบรหัสต้นไม้นี้')
    if (data[0].status !== 'ACTIVE') return setErr('ต้นไม้นี้ไม่อยู่สถานะขายได้ (ACTIVE)')
    if (existingSet.has(code)) return setErr('เพิ่มรหัสนี้แล้ว')

    setItems((prev) => [...prev, { plant_code: data[0].plant_code, name: data[0].name, cost: data[0].cost, price: '' }])
    setPlantCode('')
  }

  async function addByCode() {
    await addOne(plantCode)
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
    const { data, error } = await supabase.from('invoices').select('id,created_at').order('created_at', { ascending: false }).limit(1)
    if (error) return null
    const id = data?.[0]?.id
    return isUuid(id) ? id : null
  }

  async function resolveInvoiceId(candidate) {
    if (isUuid(candidate)) return candidate

    if (typeof candidate === 'string' && candidate.startsWith('B')) {
      const { data, error } = await supabase.from('invoices').select('id,invoice_no').eq('invoice_no', candidate).limit(1)
      if (!error) {
        const id = data?.[0]?.id
        if (isUuid(id)) return id
      }
    }

    return await getLatestInvoiceIdSafe()
  }

  async function addBulkValid() {
    setErr('')
    const codes = parseCodes(bulkText)
    if (!codes.length) return

    const canAdd = []
    for (const code of codes) {
      if (existingSet.has(code)) continue
      const info = lookupMap?.[code]
      if (info?.found && info.status === 'ACTIVE') {
        canAdd.push({ plant_code: info.plant_code, name: info.name, cost: info.cost, price: '' })
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
    setBulkText('')
  }

  async function submit() {
    setErr('')
    if (!items.length) return setErr('ยังไม่มีรายการขาย')

    const bad = items.find((x) => Number(x.price) <= 0)
    if (bad) return setErr(`กรุณาใส่ราคาขายให้ครบ: ${bad.plant_code}`)

    setLoading(true)

    const payloadItems = items.map((x) => ({ plant_code: x.plant_code, price: Number(x.price) }))

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

    setLoading(false)

    if (error) return setErr(error.message)

    const candidate = pickCandidateFromRpc(data)
    const invoiceId = await resolveInvoiceId(candidate)

    if (!isUuid(invoiceId)) {
      return setErr(
        `สร้างบิลแล้ว แต่ระบบยังหา invoiceId (UUID) ไม่เจอ\n` +
          `RPC raw data: ${JSON.stringify(data)}\n` +
          `candidate: ${String(candidate)}`
      )
    }

    router.push(`/receipt/${invoiceId}`)
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
    <AppShell title="ขาย (Sell)">
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
              <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)} style={inputCompact}>
                <option value="unpaid">{PAY_THAI.unpaid}</option>
                <option value="partial">{PAY_THAI.partial}</option>
                <option value="paid">{PAY_THAI.paid}</option>
              </select>
            </Field>

            <Field label="การจัดส่ง">
              <select value={shipStatus} onChange={(e) => setShipStatus(e.target.value)} style={inputCompact}>
                <option value="not_shipped">{SHIP_THAI.not_shipped}</option>
                <option value="shipped">{SHIP_THAI.shipped}</option>
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
          </div>
        </Card>

        <Card title="เพิ่มรายการขาย (Plant Code) — เร็ว + เช็คเรียลไทม์">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={plantCode}
              onChange={(e) => setPlantCode(e.target.value)}
              placeholder="พิมพ์รหัสแล้วกด Enter (เช่น N-2602-0010 หรือ N26020010)"
              style={{ ...inputCompact, flex: 1, minWidth: 220 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  // auto-format ก่อนเพิ่ม
                  const norm = normalizeCode(plantCode)
                  setPlantCode(norm)
                  addOne(norm)
                }
              }}
              onBlur={() => {
                const norm = normalizeCode(plantCode)
                if (norm && norm !== plantCode) setPlantCode(norm)
              }}
            />
            <button
              onClick={() => {
                const norm = normalizeCode(plantCode)
                setPlantCode(norm)
                addOne(norm)
              }}
              style={primaryBtnCompact}
            >
              เพิ่ม 1 ตัว
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
              เพิ่มหลายรหัสในทีเดียว (วางได้หลายบรรทัด / คั่นด้วยเว้นวรรค / คอมม่า)
            </div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`ตัวอย่าง:\nN26020001\nN-2602-0002\nN 2602 0003`}
              style={textareaCompact}
              rows={4}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {lookupLoading ? 'กำลังตรวจสอบ...' : `เพิ่มได้ (ACTIVE): ${canAddCount} / ${previewRows.length}`}
                {lookupErr ? <span style={{ color: '#ffb4b4' }}> • {lookupErr}</span> : null}
              </div>
              <button onClick={addBulkValid} style={primaryBtnCompact} disabled={!canAddCount}>
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
          </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {items.map((x, idx) => (
              <div key={x.plant_code} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{x.plant_code}</div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>{x.name}</div>
                  </div>
                  <button onClick={() => removeItem(idx)} style={ghostBtn}>ลบ</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <Mini label="ทุน">{Number(x.cost || 0).toLocaleString()}</Mini>
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
            <Mini label="ต้นทุนรวม">{totals.totalCost.toLocaleString()}</Mini>
            <Mini label="ยอดขายรวม">{totals.totalPrice.toLocaleString()}</Mini>
            <Mini label="กำไร">{totals.profit.toLocaleString()}</Mini>
          </div>

          {err ? <pre style={{ marginTop: 10, color: '#ffb4b4', whiteSpace: 'pre-wrap' }}>{err}</pre> : null}

          <button disabled={loading} onClick={submit} style={{ ...primaryBtn, width: '100%', height: 48, marginTop: 12 }}>
            {loading ? 'กำลังบันทึก...' : 'ยืนยันการขาย'}
          </button>
        </Card>
      </div>
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