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
    <AppShell title="รายรับ / รายจ่าย">
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }}>
        {(err || ok) && (
          <div style={{ display: 'grid', gap: 8 }}>
            {err ? <div style={errBox}>{err}</div> : null}
            {ok ? <div style={okBox}>{ok}</div> : null}
          </div>
        )}

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

        {/* สรุป */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <div style={summaryIncomeCard}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>รายรับรวม</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{money(incomeTotal)}</div>
          </div>
          <div style={summaryExpenseCard}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>รายจ่ายรวม</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{money(expenseTotal)}</div>
          </div>
          <div style={summaryNetCard}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>สุทธิ</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{money(netTotal)}</div>
          </div>
        </div>

        {/* ฟอร์ม */}
        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            เพิ่มรายการรายรับ / รายจ่าย
          </div>

          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            style={input}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setType('income')}
              style={type === 'income' ? typeBtnActiveGreen : typeBtn}
            >
              รายรับ
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              style={type === 'expense' ? typeBtnActiveRed : typeBtn}
            >
              รายจ่าย
            </button>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={input}
          >
            {categoryOptions.map((c) => (
              <option key={c.v} value={c.v}>
                {c.t}
              </option>
            ))}
          </select>

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="จำนวนเงิน"
            style={input}
            inputMode="decimal"
          />

          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            style={input}
          >
            <option value="GSB">GSB</option>
            <option value="KTB">KTB</option>
            <option value="KBANK">KBANK</option>
          </select>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="หมายเหตุ"
            style={input}
          />

          <button onClick={addEntry} disabled={loading} style={btn}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>

        {/* รายการล่าสุด 10 */}
        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>รายการล่าสุด 10 รายการ</div>

          <div style={{ display: 'grid', gap: 10 }}>
            {latest10.length === 0 ? (
              <div style={{ color: '#64748b' }}>ยังไม่มีรายการ</div>
            ) : (
              latest10.map((r) => {
                const green = r.type === 'income'
                return (
                  <div
                    key={r.id}
                    style={{
                      ...row,
                      border: green
                        ? '1px solid rgba(34,197,94,0.25)'
                        : '1px solid rgba(239,68,68,0.25)',
                      background: green ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={green ? badgeIncome : badgeExpense}>
                          {green ? 'รับ' : 'จ่าย'}
                        </span>
                        <span style={{ fontWeight: 700 }}>
                          {catLabel(r.type, r.category)}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {r.bank}
                        </span>
                      </div>

                      <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                        {r.expense_date}
                        {r.note ? ` • ${r.note}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 10 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          color: green ? '#15803d' : '#b91c1c',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {green ? '+' : '-'}{money(r.amount)}
                      </div>
                      <button onClick={() => deleteEntry(r.id)} style={delBtn}>
                        ลบ
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

const card = {
  background: 'rgba(255,255,255,0.06)',
  padding: 14,
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.1)',
}

const input = {
  width: '100%',
  height: 44,
  marginBottom: 10,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.2)',
}

const btn = {
  height: 44,
  borderRadius: 12,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 900,
  width: '100%',
}

const row = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 12,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
}

const delBtn = {
  marginLeft: 4,
  background: '#b02a2a',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '6px 10px',
  cursor: 'pointer',
}

const badgeIncome = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 42,
  height: 24,
  borderRadius: 999,
  background: 'rgba(34,197,94,0.14)',
  color: '#15803d',
  fontSize: 12,
  fontWeight: 900,
  padding: '0 10px',
}

const badgeExpense = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 42,
  height: 24,
  borderRadius: 999,
  background: 'rgba(239,68,68,0.14)',
  color: '#b91c1c',
  fontSize: 12,
  fontWeight: 900,
  padding: '0 10px',
}

const typeBtn = {
  height: 44,
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.12)',
  background: 'white',
  color: '#0f172a',
  fontWeight: 900,
  cursor: 'pointer',
}

const typeBtnActiveGreen = {
  ...typeBtn,
  background: '#16a34a',
  color: 'white',
  border: '1px solid #16a34a',
}

const typeBtnActiveRed = {
  ...typeBtn,
  background: '#dc2626',
  color: 'white',
  border: '1px solid #dc2626',
}

const summaryIncomeCard = {
  ...card,
  background: 'rgba(34,197,94,0.08)',
  border: '1px solid rgba(34,197,94,0.18)',
}

const summaryExpenseCard = {
  ...card,
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.18)',
}

const summaryNetCard = {
  ...card,
  background: 'rgba(59,130,246,0.08)',
  border: '1px solid rgba(59,130,246,0.18)',
}

const errBox = {
  borderRadius: 16,
  padding: '12px 14px',
  border: '1px solid rgba(239,68,68,0.25)',
  background: 'rgba(239,68,68,0.08)',
  color: '#b91c1c',
}

const okBox = {
  borderRadius: 16,
  padding: '12px 14px',
  border: '1px solid rgba(34,197,94,0.25)',
  background: 'rgba(34,197,94,0.08)',
  color: '#15803d',
}