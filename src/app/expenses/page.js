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
  { v: 'rent', t: 'ค่าเช่า' },
  { v: 'other', t: 'อื่นๆ' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpensesPage() {
  const supabase = supabaseBrowser()

  const [expenseDate, setExpenseDate] = useState(todayISO())
  const [category, setCategory] = useState('electricity')
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState('GSB')
  const [note, setNote] = useState('')

  const [rows, setRows] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const total = useMemo(
    () => rows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows]
  )

  async function loadExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, expense_date, category, amount, bank, note')
      .order('expense_date', { ascending: false })
      .limit(100)

    if (!error) setRows(data || [])
  }

  async function loadBalances() {
    const { data } = await supabase.rpc('get_bank_balances')
    setBalances(data || [])
  }

  async function loadAll() {
    await Promise.all([loadExpenses(), loadBalances()])
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function addExpense() {
    setErr('')
    const amt = Number(amount || 0)
    if (!amt || amt <= 0) return setErr('กรอกจำนวนเงินให้ถูกต้อง')

    setLoading(true)
    try {
      const { error } = await supabase.from('expenses').insert({
        expense_date: expenseDate,
        category,
        amount: amt,
        bank,
        note: note || null,
      })
      if (error) throw error

      setAmount('')
      setNote('')
      await loadAll()
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteExpense(id) {
    if (!confirm('ลบรายการนี้?')) return
    await supabase.from('expenses').delete().eq('id', id)
    await loadAll()
  }

  const catLabel = (v) => CATS.find((x) => x.v === v)?.t || v

  return (
    <AppShell title="ค่าใช้จ่าย">
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* ยอดเงินจริง */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {balances.map((b) => (
            <div key={b.bank} style={card}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{b.bank}</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {money(b.balance)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                รับ {money(b.income)} | จ่าย {money(b.expense)}
              </div>
            </div>
          ))}
        </div>

        {/* เพิ่มค่าใช้จ่าย */}
        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>เพิ่มค่าใช้จ่าย</div>

          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} style={input} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
            {CATS.map((c) => (
              <option key={c.v} value={c.v}>{c.t}</option>
            ))}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="จำนวนเงิน" style={input} />
          <select value={bank} onChange={(e) => setBank(e.target.value)} style={input}>
            <option value="GSB">GSB</option>
            <option value="KTB">KTB</option>
            <option value="KBANK">KBANK</option>
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ" style={input} />

          {err && <div style={{ color: 'red' }}>{err}</div>}

          <button onClick={addExpense} disabled={loading} style={btn}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>

        {/* รายการ */}
        <div style={card}>
          <div style={{ fontWeight: 900 }}>รายการล่าสุด</div>
          <div style={{ marginTop: 10 }}>
            รวมทั้งหมด: {money(total)} บาท
          </div>

          {rows.map((r) => (
            <div key={r.id} style={row}>
              <div>
                {r.expense_date} - {catLabel(r.category)} ({r.bank})
              </div>
              <div>
                {money(r.amount)}
                <button onClick={() => deleteExpense(r.id)} style={delBtn}>ลบ</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

const card = {
  background: 'rgba(255,255,255,0.06)',
  padding: 14,
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.1)'
}

const input = {
  width: '100%',
  height: 44,
  marginBottom: 10,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.2)'
}

const btn = {
  height: 44,
  borderRadius: 12,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 900,
  width: '100%'
}

const row = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: 8,
  borderBottom: '1px solid rgba(255,255,255,0.1)'
}

const delBtn = {
  marginLeft: 10,
  background: '#b02a2a',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '2px 8px'
}