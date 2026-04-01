'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

function money(n) {
  return Number(n || 0).toLocaleString('th-TH')
}

export default function SellPage() {
  const supabase = supabaseBrowser()

  const [customer, setCustomer] = useState('')
  const [bank, setBank] = useState('GSB')
  const [payStatus, setPayStatus] = useState('unpaid')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const [codeInput, setCodeInput] = useState('')
  const [items, setItems] = useState([])

  // =========================
  // เพิ่มสินค้า (mock ก่อน)
  // =========================
  function handleAdd() {
    if (!codeInput) return

    const newItem = {
      code: codeInput,
      cost: 1000,
      price: 1500,
    }

    setItems([...items, newItem])
    setCodeInput('')
  }

  const totalCost = items.reduce((a, b) => a + b.cost, 0)
  const totalPrice = items.reduce((a, b) => a + b.price, 0)
  const profit = totalPrice - totalCost
  const avgProfit = items.length ? profit / items.length : 0

  return (
    <AppShell title="ขายสินค้า">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* 🔹 ข้อมูลบิล */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />

          <input
            placeholder="ชื่อลูกค้า"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="input"
          />

          <select value={bank} onChange={(e) => setBank(e.target.value)} className="input">
            <option>GSB</option>
            <option>KTB</option>
            <option>KBANK</option>
          </select>

          <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)} className="input">
            <option value="unpaid">ยังไม่จ่าย</option>
            <option value="paid">จ่ายแล้ว</option>
            <option value="partial">จ่ายบางส่วน</option>
          </select>
        </div>

        {/* 🔹 เพิ่มสินค้า */}
        <div className="bg-white rounded-2xl p-5 shadow">
          <div className="text-lg font-bold mb-3">เพิ่มรหัสสินค้า</div>

          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="เช่น N-2603-0001 หรือ 26030001"
              className="flex-1 input text-lg"
            />

            <button
              onClick={handleAdd}
              className="bg-green-500 text-white px-6 rounded-xl"
            >
              เพิ่ม
            </button>
          </div>
        </div>

        {/* 🔹 สรุป */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* รายการ */}
          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="font-bold mb-3">รายการที่เลือก</div>

            {!items.length && <div className="text-gray-400">ยังไม่มีรายการ</div>}

            {items.map((i, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b">
                <span>{i.code}</span>
                <span>{money(i.price)}</span>
              </div>
            ))}
          </div>

          {/* สรุป */}
          <div className="bg-white rounded-2xl p-5 shadow space-y-3">
            <div className="text-lg font-bold">สรุป</div>

            <div>จำนวน: {items.length} ต้น</div>
            <div>ต้นทุน: {money(totalCost)}</div>
            <div>ยอดขาย: {money(totalPrice)}</div>
            <div>กำไร: {money(profit)}</div>
            <div className="text-sm text-gray-500">
              เฉลี่ย/ต้น: {money(avgProfit)}
            </div>

            <button className="w-full bg-green-600 text-white py-3 rounded-xl mt-3">
              ยืนยันการขาย
            </button>
          </div>

        </div>
      </div>
    </AppShell>
  )
}