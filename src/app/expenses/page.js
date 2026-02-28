'use client'

import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

const money = (n) => Number(n || 0).toLocaleString()

const CATS = [
  { v: 'electricity', t: 'ค่าไฟ' },
  { v: 'water', t: 'ค่าน้ำ' },
  { v: 'internet', t: 'อินเทอร์เน็ต' },
  { v: 'fertilizer', t: 'ค่าปุ๋ย' },
  { v: 'plant_supplies', t: 'ค่าอุปกรณ์ต้นไม้' },
  { v: 'shipping', t: 'ค่าขนส่ง' },
  { v: 'labor', t: 'ค่าแรง' },
  { v: 'rent', t: 'ค่าเช่าบ้าน' },
  { v: 'other', t: 'อื่นๆ' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function monthStartISO(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1)
  return x.toISOString().slice(0, 10)
}
function monthEndISO(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  return x.toISOString().slice(0, 10) // exclusive
}

export default function ExpensesPage() {
  const supabase = supabaseBrowser()

  const [expenseDate, setExpenseDate] = useState(() => todayISO())
  const [category, setCategory] = useState('electricity')
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState('GSB')
  const [note, setNote] = useState('')

  const [rangeStart, setRangeStart] = useState(() => monthStartISO())
  const [rangeEnd, setRangeEnd] = useState(() => monthEndISO())

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const totalInRange = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows])

  async function load() {
    setErr('')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, expense_date, category, amount, bank, note, created_at')
        .gte('expense_date', rangeStart)
        .lt('expense_date', rangeEnd)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setErr(e.message || String(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd])

  async function addExpense() {
    setErr('')
    const amt = Number(amount || 0)
    if (!expenseDate) return setErr('กรุณาเลือกวันที่')
    if (!category) return setErr('กรุณาเลือกหมวด')
    if (!bank) return setErr('กรุณาเลือกธนาคาร')
    if (!(amt > 0)) return setErr('กรุณากรอกจำนวนเงินให้มากกว่า 0')

    const ok = confirm(
      `ยืนยันบันทึกค่าใช้จ่าย?\n` +
        `วันที่: ${expenseDate}\n` +
        `หมวด: ${CATS.find((x) => x.v === category)?.t || category}\n` +
        `จำนวน: ${money(amt)} บาท\n` +
        `ธนาคาร: ${bank}`
    )
    if (!ok) return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('create_expense', {
        p_expense_date: expenseDate,
        p_category: category,
        p_amount: amt,
        p_bank: bank,
        p_note: note ? note : null,
      })
      if (error) throw error

      // ✅ ตามสเปก: หลังทำรายการเสร็จให้รีเฟรชหน้า (ไม่ให้ข้อมูลค้าง)
      alert('บันทึกค่าใช้จ่ายเรียบร้อย')
      window.location.reload()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function deleteExpense(id) {
    const ok = confirm('ลบรายการนี้เลยไหม?')
    if (!ok) return
    setLoading(true)
    setErr('')
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      // ✅ รีเฟรชหน้า หลังลบ
      window.location.reload()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const catLabel = (v) => CATS.find((x) => x.v === v)?.t || v

  return (
    <AppShell title="ค่าใช้จ่าย (Expenses)">
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 12 }}>
        <Card title="เพิ่มค่าใช้จ่าย">
          <div style={{ display: 'grid', gap: 10 }}>
            <Field label="วันที่">
              <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} style={input} />
            </Field>

            <Field label="หมวด">
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
                {CATS.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="จำนวนเงิน (บาท)">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="เช่น 350" style={input} />
            </Field>

            <Field label="ธนาคารที่จ่าย">
              <select value={bank} onChange={(e) => setBank(e.target.value)} style={input}>
                <option value="GSB">GSB (ธุรกิจ)</option>
                <option value="KTB">KTB (ส่วนตัว)</option>
                <option value="KBANK">KBANK (เก็บกำไร)</option>
              </select>
            </Field>

            <Field label="หมายเหตุ (ถ้ามี)">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ค่ากล่อง + เทป" style={input} />
            </Field>

            {err ? <pre style={errBox}>{err}</pre> : null}

            <button onClick={addExpense} disabled={loading} style={{ ...btnPrimary, width: '100%' }}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกค่าใช้จ่าย'}
            </button>
          </div>
        </Card>

        <Card title="ดูรายการ (ช่วงวันที่)">
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="เริ่ม (รวมวันนี้)">
                <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} style={input} />
              </Field>
              <Field label="ถึง (ไม่รวมวันนี้)">
                <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} style={input} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Mini label="รวมค่าใช้จ่ายช่วงนี้">{money(totalInRange)}</Mini>
              <Mini label="ภาษีกันไว้ 15% (จาก “กำไรสุทธิ” ใน Phase 6)">{money(0)}</Mini>
            </div>

            <button onClick={load} disabled={loading} style={btnGhost}>
              รีเฟรชรายการ
            </button>

            {!rows.length ? (
              <div style={{ opacity: 0.75 }}>{loading ? 'กำลังโหลด...' : 'ยังไม่มีรายการในช่วงนี้'}</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {rows.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.04)',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>{catLabel(r.category)}</div>
                      <div style={{ fontWeight: 900 }}>{money(r.amount)}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, opacity: 0.9 }}>
                      <div>วันที่: <b>{r.expense_date}</b></div>
                      <div>ธนาคาร: <b>{r.bank}</b></div>
                    </div>

                    {r.note ? <div style={{ fontSize: 13, opacity: 0.85 }}>หมายเหตุ: {r.note}</div> : null}

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => deleteExpense(r.id)} disabled={loading} style={btnDangerSm}>
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
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
  height: 46,
  borderRadius: 14,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const btnGhost = {
  height: 44,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: 'white',
  cursor: 'pointer',
}

const btnDangerSm = {
  height: 36,
  padding: '0 12px',
  borderRadius: 12,
  border: 'none',
  background: '#b02a2a',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
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