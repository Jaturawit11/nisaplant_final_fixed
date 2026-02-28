'use client'

import React, { useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { PAY_THAI, SHIP_THAI } from '@/components/ThaiStatus'

const money = (n) => Number(n || 0).toLocaleString()

export default function EditInvoicePage() {
  const supabase = supabaseBrowser()

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null) // invoice row
  const [items, setItems] = useState([])

  // edit fields
  const [payStatus, setPayStatus] = useState('unpaid')
  const [shipStatus, setShipStatus] = useState('not_shipped')
  const [bank, setBank] = useState('GSB')
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [paidDate, setPaidDate] = useState('')

  const [selectedItemIds, setSelectedItemIds] = useState(new Set())
  const [refundAmount, setRefundAmount] = useState('')
  const [refundType, setRefundType] = useState('partial') // partial | full

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

  function resetPageForm({ keepQuery = true } = {}) {
    setErr('')
    setLoading(false)
    setResults([])
    setSelected(null)
    setItems([])
    setSelectedItemIds(new Set())

    // reset edit fields
    setPayStatus('unpaid')
    setShipStatus('not_shipped')
    setBank('GSB')
    setPaymentMethod('transfer')
    setPaidDate('')

    // reset refund
    setRefundAmount('')
    setRefundType('partial')

    if (!keepQuery) setQ('')
  }

  function resetActionInputsOnly() {
    // ใช้หลังทำ action สำเร็จ เพื่อไม่ให้ค้างค่าที่เพิ่งกรอก
    setSelectedItemIds(new Set())
    setRefundAmount('')
    setRefundType('partial')
    setPaidDate('') // กันคนลืมค้างวัน
  }

  async function search() {
    setErr('')
    setLoading(true)
    setResults([])
    setSelected(null)
    setItems([])
    setSelectedItemIds(new Set())

    const keyword = q.trim()

    try {
      if (!keyword) {
        setLoading(false)
        setErr('พิมพ์เลขบิล (Bxxxx) หรือชื่อลูกค้าเพื่อค้นหา')
        return
      }

      const { data, error } = await supabase
        .from('invoices')
        .select(
          'id, invoice_no, sale_date, customer_name, bank, pay_status, ship_status, payment_method, paid_date, invoice_status, total_cost, total_price, total_profit'
        )
        .or(`invoice_no.ilike.%${keyword}%,customer_name.ilike.%${keyword}%`)
        .order('sale_date', { ascending: false })
        .limit(30)

      if (error) throw error
      setResults(data || [])
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function openInvoice(inv) {
    setErr('')
    setSelected(inv)
    setSelectedItemIds(new Set())

    // hydrate edit fields
    setPayStatus(inv.pay_status || 'unpaid')
    setShipStatus(inv.ship_status || 'not_shipped')
    setBank(inv.bank || 'GSB')
    setPaymentMethod(inv.payment_method || 'transfer')
    setPaidDate(inv.paid_date || '')

    // reset refund inputs when opening a new invoice
    setRefundAmount('')
    setRefundType('partial')

    try {
      // ✅ แสดงเฉพาะรายการที่ยัง ACTIVE (หรือของเก่าที่ item_status ยังเป็น null)
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
    if (!selected?.id) return
    if (isCancelled) return

    const ok = confirm(`ยืนยัน "ยกเลิกทั้งบิล" ${selected.invoice_no} ?\n- คืนสต๊อกไม้ทุกต้นในบิล\n- บิลจะเป็น cancelled`)
    if (!ok) return

    setLoading(true)
    setErr('')
    try {
      const { error } = await supabase.rpc('cancel_invoice', { p_invoice_id: selected.id, p_reason: null })
      if (error) throw error

      // หลังสำเร็จ: รีเซ็ตหน้าให้กลับไปเริ่มต้น (ไม่ค้างข้อมูลเดิม)
      alert('ยกเลิกบิลเรียบร้อย')
      window.location.reload()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function rpcRemoveItems() {
    if (!selected?.id) return
    if (isCancelled) return

    const ids = Array.from(selectedItemIds)
    if (!ids.length) {
      setErr('ยังไม่ได้เลือกรายการที่จะยกเลิก')
      return
    }

    const ok = confirm(`ยืนยัน "ยกเลิกรายการ" ${ids.length} รายการ?\n- คืนสต๊อกเฉพาะรายการที่เลือก\n- รายการจะถูกเอาออกจากบิล`)
    if (!ok) return

    setLoading(true)
    setErr('')
    try {
      const { error } = await supabase.rpc('remove_items_from_invoice', {
        p_invoice_id: selected.id,
        p_sale_item_ids: ids,
      })
      if (error) throw error

      // reload invoice + items (ยังอยู่หน้าเดิมได้)
      await refreshSelected()
      resetActionInputsOnly()
      alert('ยกเลิกรายการเรียบร้อย')
      window.location.reload()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function rpcUpdateStatus() {
    if (!selected?.id) return
    if (isCancelled) return

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
      })
      if (error) throw error

      await refreshSelected()
      resetActionInputsOnly()
      alert('อัปเดตสถานะเรียบร้อย')
      window.location.reload()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function rpcRefund() {
    if (!selected?.id) return
    if (isCancelled) return

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
      resetActionInputsOnly()
      alert('บันทึกเคลมเงินเรียบร้อย')
      window.location.reload()
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

    const b = await supabase
      .from('sale_items')
      .select('id, invoice_id, plant_id, plant_code, plant_name, cost, price, profit, item_status, created_at')
      .eq('invoice_id', selected.id)
      .or('item_status.is.null,item_status.eq.ACTIVE')
      .order('created_at', { ascending: true })
    if (b.error) throw b.error
    setItems(b.data || [])
  }

  return (
    <AppShell title="แก้บิล (Edit Invoice)">
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 12 }}>
        <Card title="ค้นหาบิล">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="พิมพ์เลขบิล เช่น B26020006 หรือชื่อลูกค้า"
              style={{ ...input, flex: 1, minWidth: 260 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  search()
                }
              }}
            />
            <button onClick={search} style={btnPrimary} disabled={loading}>
              {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
            </button>

            <button
              onClick={() => resetPageForm({ keepQuery: false })}
              style={btnGhost}
              disabled={loading}
              title="ล้างฟอร์มทั้งหมด"
            >
              ล้างฟอร์ม
            </button>
          </div>

          {err ? <pre style={errBox}>{err}</pre> : null}

          {results.length ? (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openInvoice(r)}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{r.invoice_no}</div>
                    <div style={{ opacity: 0.85 }}>{r.sale_date}</div>
                  </div>
                  <div style={{ opacity: 0.9, marginTop: 4 }}>
                    ลูกค้า: <b>{r.customer_name || '-'}</b> • {PAY_THAI[r.pay_status]} • {SHIP_THAI[r.ship_status]}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        {selected ? (
          <>
            <Card title={`รายละเอียดบิล: ${selected.invoice_no}`}>
              {/* ✅ badge CANCELLED */}
              {isCancelled ? (
                <div style={badgeCancelled}>
                  บิลนี้ถูกยกเลิกแล้ว (CANCELLED) — โหมดดูอย่างเดียว
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: 8, marginTop: isCancelled ? 10 : 0 }}>
                <Row k="วันที่ขาย" v={selected.sale_date} />
                <Row k="ลูกค้า" v={selected.customer_name || '-'} />
                <Row k="ธนาคาร" v={selected.bank || '-'} />
                <Row k="สถานะชำระเงิน" v={PAY_THAI[selected.pay_status] || selected.pay_status} />
                <Row k="สถานะจัดส่ง" v={SHIP_THAI[selected.ship_status] || selected.ship_status} />
                <Row k="invoice_status" v={selected.invoice_status || '-'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
                <Mini label="ต้นทุนรวม">{money(totals.totalCost)}</Mini>
                <Mini label="ยอดรวม">{money(totals.totalPrice)}</Mini>
                <Mini label="กำไร">{money(totals.totalProfit)}</Mini>
              </div>

              {/* ✅ ซ่อน action ทั้งหมดถ้า cancelled */}
              {!isCancelled ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <button onClick={rpcCancelInvoice} style={btnDanger} disabled={loading}>
                    ยกเลิกทั้งบิล (คืนสต๊อก)
                  </button>
                  <button onClick={rpcRemoveItems} style={btnWarn} disabled={loading}>
                    ยกเลิกรายการที่เลือก
                  </button>
                </div>
              ) : null}
            </Card>

            <Card title="รายการในบิล (เลือกเพื่อลบ/คืนสต๊อก)">
              {!items.length ? (
                <div style={{ opacity: 0.8 }}>ไม่มี sale_items (หรือถูกยกเลิกหมดแล้ว)</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {items.map((it) => (
                    <label
                      key={it.id}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 16,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.04)',
                        opacity: isCancelled ? 0.65 : 1,
                      }}
                    >
                      {/* ✅ ถ้า cancelled ให้ disable checkbox */}
                      <input
                        type="checkbox"
                        disabled={isCancelled}
                        checked={selectedItemIds.has(it.id)}
                        onChange={() => toggleItem(it.id)}
                        style={{ width: 18, height: 18 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900 }}>{it.plant_code}</div>
                        <div style={{ fontSize: 13, opacity: 0.85 }}>{it.plant_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900 }}>{money(it.price)}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>ทุน {money(it.cost)} • กำไร {money(it.profit)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </Card>

            {/* ✅ ซ่อนทั้งก้อนถ้า cancelled */}
            {!isCancelled ? (
              <Card title="อัปเดตสถานะ (ไทย)">
                <div style={{ display: 'grid', gap: 10 }}>
                  <Field label="การชำระเงิน">
                    <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)} style={input}>
                      <option value="unpaid">{PAY_THAI.unpaid}</option>
                      <option value="partial">{PAY_THAI.partial}</option>
                      <option value="paid">{PAY_THAI.paid}</option>
                    </select>
                  </Field>

                  <Field label="การจัดส่ง">
                    <select value={shipStatus} onChange={(e) => setShipStatus(e.target.value)} style={input}>
                      <option value="not_shipped">{SHIP_THAI.not_shipped}</option>
                      <option value="shipped">{SHIP_THAI.shipped}</option>
                    </select>
                  </Field>

                  <Field label="ธนาคารรับเงิน">
                    <select value={bank} onChange={(e) => setBank(e.target.value)} style={input}>
                      <option value="GSB">GSB (ธุรกิจ)</option>
                      <option value="KTB">KTB (ส่วนตัว)</option>
                      <option value="KBANK">KBANK (เก็บกำไร)</option>
                    </select>
                  </Field>

                  <Field label="วิธีรับเงิน">
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={input}>
                      <option value="transfer">โอน</option>
                      <option value="cash">เงินสด</option>
                      <option value="qr">สแกน QR</option>
                    </select>
                  </Field>

                  <Field label="วันที่รับเงิน (ถ้ามี)">
                    <input value={paidDate} onChange={(e) => setPaidDate(e.target.value)} type="date" style={input} />
                  </Field>

                  <button onClick={rpcUpdateStatus} style={btnPrimary} disabled={loading}>
                    บันทึกสถานะ
                  </button>
                </div>
              </Card>
            ) : null}

            {!isCancelled ? (
              <Card title="เคลมเงิน (บางส่วน/เต็มจำนวน)">
                <div style={{ display: 'grid', gap: 10 }}>
                  <Field label="ประเภทการคืนเงิน">
                    <select value={refundType} onChange={(e) => setRefundType(e.target.value)} style={input}>
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
                      style={input}
                    />
                  </Field>

                  <button onClick={rpcRefund} style={btnWarn} disabled={loading}>
                    บันทึกเคลมเงิน
                  </button>

                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    * ตอนนี้ระบบจะปรับ pay_status อัตโนมัติ (full → ยังไม่จ่าย, partial → จ่ายบางส่วน)
                  </div>
                </div>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </AppShell>
  )
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

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ opacity: 0.8 }}>{k}</div>
      <div style={{ fontWeight: 900 }}>{v}</div>
    </div>
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

const input = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 14,
  border: '1px solid rgba(0,0,0,0.2)',
}

const btnPrimary = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const btnWarn = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: 'none',
  background: '#a67c00',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const btnDanger = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: 'none',
  background: '#b02a2a',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const btnGhost = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.20)',
  background: 'transparent',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const badgeCancelled = {
  border: '1px solid rgba(255,60,60,0.45)',
  background: 'rgba(255,60,60,0.10)',
  color: 'white',
  borderRadius: 14,
  padding: '10px 12px',
  fontWeight: 900,
}

const errBox = {
  marginTop: 10,
  color: '#ffb4b4',
  whiteSpace: 'pre-wrap',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  padding: 10,
}