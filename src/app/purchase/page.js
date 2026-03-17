'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function PurchasePage() {
  const supabase = supabaseBrowser()

  const [supplier, setSupplier] = useState('')
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState('GSB')
  const [note, setNote] = useState('')
  const [batchId, setBatchId] = useState(null)

  const [items, setItems] = useState([
    { name: '', qty: 1, cost: '' }
  ])

  const [msg, setMsg] = useState('')

  // ------------------------
  // สร้าง batch
  // ------------------------
  async function createBatch() {
    setMsg('')

    const { data, error } = await supabase
      .from('purchase_batches')
      .insert({
        supplier_name: supplier,
        slip_amount: Number(amount || 0),
        bank,
        note
      })
      .select()
      .single()

    if (error) return setMsg(error.message)

    setBatchId(data.id)
    setMsg('สร้างบิลสำเร็จ')
  }

  // ------------------------
  // เพิ่มแถว
  // ------------------------
  function addRow() {
    setItems(prev => [...prev, { name: '', qty: 1, cost: '' }])
  }

  function updateItem(i, field, value) {
    setItems(prev =>
      prev.map((x, idx) =>
        idx === i ? { ...x, [field]: value } : x
      )
    )
  }

  // ------------------------
  // บันทึกต้นไม้
  // ------------------------
  async function savePlants() {
    setMsg('')
    if (!batchId) return setMsg('ยังไม่ได้สร้าง batch')

    let rows = []
    let codeIndex = 1

    for (let item of items) {
      const qty = Number(item.qty || 0)
      const cost = Number(item.cost || 0)

      for (let i = 0; i < qty; i++) {
        rows.push({
          plant_code: `N-${Date.now().toString().slice(-4)}-${String(codeIndex).padStart(4,'0')}`,
          name: item.name,
          cost
        })
        codeIndex++
      }
    }

    const { error } = await supabase.rpc('add_plants_from_batch', {
      p_batch_id: batchId,
      p_rows: rows
    })

    if (error) return setMsg(error.message)

    setMsg('เพิ่มต้นไม้สำเร็จ')
    setItems([{ name: '', qty: 1, cost: '' }])
  }

  // ------------------------
  // คำนวณ
  // ------------------------
  const total = items.reduce((sum, x) => {
    return sum + (Number(x.qty || 0) * Number(x.cost || 0))
  }, 0)

  const diff = Number(amount || 0) - total

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      <h1 className="text-xl font-bold">ซื้อไม้</h1>

      {/* batch */}
      <div className="space-y-2 border p-3 rounded">
        <input placeholder="Supplier"
          value={supplier}
          onChange={e => setSupplier(e.target.value)}
          className="w-full border p-2"
        />

        <input placeholder="ยอดสลิป"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full border p-2"
        />

        <select value={bank} onChange={e => setBank(e.target.value)} className="w-full border p-2">
          <option>GSB</option>
          <option>KTB</option>
          <option>KBANK</option>
        </select>

        <input placeholder="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full border p-2"
        />

        <button onClick={createBatch} className="bg-black text-white px-3 py-2 rounded">
          สร้างบิล
        </button>
      </div>

      {/* items */}
      {batchId && (
        <div className="space-y-2 border p-3 rounded">
          <h2 className="font-bold">รายการต้นไม้</h2>

          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input placeholder="ชื่อ"
                value={item.name}
                onChange={e => updateItem(i, 'name', e.target.value)}
                className="border p-2"
              />
              <input placeholder="จำนวน"
                value={item.qty}
                onChange={e => updateItem(i, 'qty', e.target.value)}
                className="border p-2"
              />
              <input placeholder="ต้นทุน/ต้น"
                value={item.cost}
                onChange={e => updateItem(i, 'cost', e.target.value)}
                className="border p-2"
              />
            </div>
          ))}

          <button onClick={addRow} className="bg-gray-200 px-2 py-1 rounded">
            + เพิ่มรายการ
          </button>

          <div className="text-sm">
            รวม: {total.toLocaleString()}
          </div>

          <div className={`text-sm ${diff === 0 ? 'text-green-600' : 'text-red-500'}`}>
            ส่วนต่าง: {diff.toLocaleString()}
          </div>

          <button onClick={savePlants} className="bg-green-600 text-white px-3 py-2 rounded">
            เพิ่มต้นไม้เข้า stock
          </button>
        </div>
      )}

      {msg && <div className="text-sm">{msg}</div>}
    </div>
  )
}