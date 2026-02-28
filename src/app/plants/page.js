'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function PlantsPage() {
  const supabase = supabaseBrowser()

  // ---------- View mode (UI only) ----------
  const [view, setView] = useState('single') // single | bulk | list

  // ---------- Single add ----------
  const [kind, setKind] = useState('LEGACY') // NEW | OLD | LEGACY
  const [plantCode, setPlantCode] = useState('')
  const [legacyCode, setLegacyCode] = useState('')
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [priceHint, setPriceHint] = useState('')
  const [acquiredDate, setAcquiredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [savingOne, setSavingOne] = useState(false)

  // ---------- Bulk ----------
  const [bulkKind, setBulkKind] = useState('NEW') // NEW | OLD
  const [bulkCount, setBulkCount] = useState('10')
  const [bulkName, setBulkName] = useState('')
  const [bulkCost, setBulkCost] = useState('')
  const [bulkPriceHint, setBulkPriceHint] = useState('')
  const [bulkAcquiredDate, setBulkAcquiredDate] = useState('')
  const [bulkNotes, setBulkNotes] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [creatingBulk, setCreatingBulk] = useState(false)
  const [previewCodes, setPreviewCodes] = useState([]) // [{code}]
  // ✅ Label print offsets / sizes (14x60mm)
const [labelX, setLabelX] = useState(0)        // mm
const [labelY, setLabelY] = useState(0)        // mm
const [labelCodeSize, setLabelCodeSize] = useState(16) // px
const [labelNameSize, setLabelNameSize] = useState(10) // px

  // ---------- Labels queue (local only) ----------
  const [labelQueue, setLabelQueue] = useState([]) // [{plant_code,name}]

  const labelsToPrint = useMemo(() => {
    const items = []

    // current single preview
    if (view === 'single' && plantCode.trim() && name.trim()) {
      items.push({ plant_code: plantCode.trim(), name: name.trim() })
    }

    // bulk preview codes
    if (view === 'bulk' && previewCodes?.length) {
      previewCodes.forEach((x) => items.push({ plant_code: String(x.code || '').trim(), name: bulkName.trim() }))
    }

    // fallback: last added queue
    labelQueue.forEach((x) => items.push({ plant_code: x.plant_code, name: x.name }))

    // uniq by code (keep first)
    const seen = new Set()
    const uniq = []
    for (const it of items) {
      const key = it.plant_code
      if (!key) continue
      if (seen.has(key)) continue
      seen.add(key)
      uniq.push(it)
    }
    return uniq.slice(0, 48)
  }, [view, plantCode, name, previewCodes, bulkName, labelQueue])

  // ---------- List ----------
  const [loadingList, setLoadingList] = useState(true)
  const [plants, setPlants] = useState([])
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  // ---------- Summary (ACTIVE only) ----------
  const [summary, setSummary] = useState({ activeCount: 0, totalCost: 0 })
  const [loadingSummary, setLoadingSummary] = useState(false)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return plants
    return plants.filter((p) => {
      return (
        String(p.plant_code || '').toLowerCase().includes(s) ||
        String(p.legacy_code || '').toLowerCase().includes(s) ||
        String(p.name || '').toLowerCase().includes(s)
      )
    })
  }, [plants, q])

  async function loadPlants() {
    setErr('')
    setLoadingList(true)
    const { data, error } = await supabase
      .from('plants')
      .select('id,plant_code,legacy_code,code_kind,name,cost,price_hint,status,acquired_date,notes,created_at')
      .order('created_at', { ascending: false })
      .limit(100) // ✅ ล่าสุด 100 ตามที่ขอ

    setLoadingList(false)
    if (error) return setErr(error.message)
    setPlants(data || [])
  }

  async function loadActiveSummary() {
    setErr('')
    setLoadingSummary(true)

    const { data, error } = await supabase.from('plants').select('cost').eq('status', 'ACTIVE').limit(10000)

    setLoadingSummary(false)
    if (error) return setErr(error.message)

    const rows = data || []
    const totalCost = rows.reduce((sum, r) => sum + Number(r.cost || 0), 0)
    setSummary({ activeCount: rows.length, totalCost })
  }

  useEffect(() => {
    loadPlants()

    // label print settings (local only)
    try {
      const raw = localStorage.getItem('np_label_cfg')
      if (raw) {
        const cfg = JSON.parse(raw)
        if (typeof cfg.x === 'number') setLabelX(cfg.x)
        if (typeof cfg.y === 'number') setLabelY(cfg.y)
        if (typeof cfg.codeSize === 'number') setLabelCodeSize(cfg.codeSize)
        if (typeof cfg.nameSize === 'number') setLabelNameSize(cfg.nameSize)
      }
    } catch {}

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        'np_label_cfg',
        JSON.stringify({ x: labelX, y: labelY, codeSize: labelCodeSize, nameSize: labelNameSize })
      )
    } catch {}
  }, [labelX, labelY, labelCodeSize, labelNameSize])

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2500)
  }

  // ✅ FIX: เพิ่มฟังก์ชันนี้ เพื่อให้ createBulk() เรียกได้จริง และให้ฟอร์ม bulk รีเซ็ตหลังสร้างเสร็จ
  function resetBulkForm() {
    // รีเซ็ตเฉพาะฟอร์ม Bulk (ไม่กระทบ logic อื่น)
    setBulkKind('NEW')
    setBulkCount('10')
    setBulkName('')
    setBulkCost('')
    setBulkPriceHint('')
    setBulkAcquiredDate('')
    setBulkNotes('')
    setPreviewCodes([])
  }

  async function addOne() {
    setErr('')
    setOk('')

    if (!name.trim()) return setErr('กรุณาใส่ชื่อไม้')
    if (!plantCode.trim()) return setErr('กรุณาใส่ Plant Code')

    setSavingOne(true)
    const { error } = await supabase.from('plants').insert([
      {
        plant_code: plantCode.trim(),
        legacy_code: legacyCode.trim() ? legacyCode.trim() : null,
        code_kind: kind,
        name: name.trim(),
        cost: Number(cost || 0),
        price_hint: Number(priceHint || 0),
        status: 'ACTIVE',
        acquired_date: acquiredDate ? acquiredDate : null,
        notes: notes.trim() ? notes.trim() : null,
      },
    ])
    setSavingOne(false)

    if (error) return setErr(error.message)

    // push to label queue (for quick print)
    setLabelQueue((q) => [{ plant_code: plantCode.trim(), name: name.trim() }, ...q].slice(0, 24))

    setPlantCode('')
    setLegacyCode('')
    setName('')
    setCost('')
    setPriceHint('')
    setAcquiredDate('')
    setNotes('')
    toastOk('เพิ่มต้นไม้สำเร็จ')
    // ✅ ตามสเปก: ทำรายการเสร็จให้รีเฟรชหน้า
    window.location.reload()
  }

  async function previewBulkCodes() {
    setErr('')
    setOk('')
    setPreviewCodes([])

    const n = Number(bulkCount || 0)
    if (!bulkName.trim()) return setErr('กรุณาใส่ชื่อไม้ (สำหรับ bulk)')
    if (!n || n <= 0 || n > 500) return setErr('จำนวนต้องอยู่ระหว่าง 1 - 500')
    if (bulkKind !== 'NEW' && bulkKind !== 'OLD') return setErr('bulkKind ต้องเป็น NEW หรือ OLD')

    setPreviewing(true)
    const { data, error } = await supabase.rpc('preview_plant_codes', {
      p_kind: bulkKind,
      p_count: n,
    })
    setPreviewing(false)

    if (error) return setErr(error.message)
    setPreviewCodes(data || [])
    toastOk('พรีวิวโค้ดเรียบร้อย')
  }

  async function createBulk() {
    setErr('')
    setOk('')

    if (!previewCodes.length) return setErr('ยังไม่ได้พรีวิวโค้ด')
    const n = previewCodes.length

    setCreatingBulk(true)
    const rows = previewCodes.map((x) => ({
      plant_code: x.code,
      legacy_code: null,
      name: bulkName.trim(),
      cost: Number(bulkCost || 0),
      price_hint: Number(bulkPriceHint || 0),
      status: 'ACTIVE',
      acquired_date: bulkAcquiredDate ? bulkAcquiredDate : null,
      notes: bulkNotes.trim() ? bulkNotes.trim() : null,
    }))

    const { data, error } = await supabase.rpc('add_plants_bulk', {
      p_rows: rows,
      p_kind: bulkKind,
    })
    setCreatingBulk(false)

    if (error) return setErr(error.message)

    toastOk(`เพิ่มแบบ bulk สำเร็จ ${data || n} รายการ`)
    // ✅ ตามสเปก: ทำรายการเสร็จให้รีเฟรชหน้า (ไม่ให้ข้อมูลค้าง)
    window.location.reload()
  }

  async function markSold(id) {
    setErr('')
    const { error } = await supabase.from('plants').update({ status: 'SOLD' }).eq('id', id)
    if (error) return setErr(error.message)
    toastOk('เปลี่ยนเป็น SOLD แล้ว')
    window.location.reload()
  }

  async function markActive(id) {
    setErr('')
    const { error } = await supabase.from('plants').update({ status: 'ACTIVE' }).eq('id', id)
    if (error) return setErr(error.message)
    toastOk('เปลี่ยนเป็น ACTIVE แล้ว')
    window.location.reload()
  }

  return (
    <AppShell title="ฐานต้นไม้ (Plants)">
      <div style={wrap}>
        {err ? <Banner type="err">{err}</Banner> : null}
        {ok ? <Banner type="ok">{ok}</Banner> : null}

        {/* ✅ เลือกหมวด (แทนการเลื่อนยาว) */}
        <div style={segWrap}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>เลือกหมวด</div>
          <div style={segRow}>
            <SegBtn active={view === 'single'} onClick={() => setView('single')}>
              เพิ่มทีละต้น
            </SegBtn>
            <SegBtn active={view === 'bulk'} onClick={() => setView('bulk')}>
              เพิ่มแบบ Bulk
            </SegBtn>
            <SegBtn
              active={view === 'list'}
              onClick={() => {
                setView('list')
                loadPlants()
                loadActiveSummary()
              }}
            >
              รายการล่าสุด 100
            </SegBtn>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            * หน้านี้จะแสดงเฉพาะหมวดที่เลือก เพื่อไม่ให้ยาวและไม่รก
          </div>
        </div>

        {view === 'single' ? (
          <Card title="เพิ่มต้นไม้ (ทีละต้น)">
            <GridForm>
              <Field label="ชนิดโค้ด">
                <select value={kind} onChange={(e) => setKind(e.target.value)} style={inputStyle}>
                  <option value="LEGACY">LEGACY (โค้ดเดิมที่มีอยู่แล้ว)</option>
                  <option value="NEW">NEW (ของใหม่)</option>
                  <option value="OLD">OLD (ของเก่าในระบบใหม่)</option>
                </select>
              </Field>

              <Field label="Plant Code (โค้ดหลักที่ใช้ขาย/ค้นหา)">
                <input
                  value={plantCode}
                  onChange={(e) => setPlantCode(e.target.value)}
                  placeholder="เช่น N-2602-0001 หรือ โค้ดเดิมของนาย"
                  style={inputStyle}
                />
              </Field>

              <Field label="Legacy Code (ถ้ามี)">
                <input value={legacyCode} onChange={(e) => setLegacyCode(e.target.value)} placeholder="ใส่ได้/ไม่ใส่ก็ได้" style={inputStyle} />
              </Field>

              <Field label="ชื่อไม้">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Alocasia Maharani Var" style={inputStyle} />
              </Field>

              <Field label="ทุน">
                <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" placeholder="0" style={inputStyle} />
              </Field>

              <Field label="ราคาตั้งต้น (ถ้ามี)">
                <input value={priceHint} onChange={(e) => setPriceHint(e.target.value)} inputMode="numeric" placeholder="0" style={inputStyle} />
              </Field>

              <Field label="วันที่ได้มา (ถ้ามี)">
                <input value={acquiredDate} onChange={(e) => setAcquiredDate(e.target.value)} type="date" style={inputStyle} />
              </Field>

              <Field label="หมายเหตุ (ถ้ามี)">
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="เช่น ไม้แม่/ลูก, ตำหนิ, ฯลฯ" style={inputStyle} />
              </Field>
            </GridForm>

            <button disabled={savingOne} onClick={addOne} style={{ ...primaryBtn, width: '100%', height: 46, marginTop: 10 }}>
              {savingOne ? 'กำลังบันทึก...' : 'เพิ่มต้นไม้'}
            </button>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              * ถ้าอยากให้ระบบ generate โค้ด NEW/OLD อัตโนมัติ ให้ใช้ “เพิ่มแบบ Bulk”
            </div>
          </Card>
        ) : null}

        {view === 'bulk' ? (
          <Card title="เพิ่มแบบ Bulk (สร้างโค้ด NEW/OLD อัตโนมัติ)">
            <GridForm>
              <Field label="ชนิดโค้ด (Bulk)">
                <select value={bulkKind} onChange={(e) => setBulkKind(e.target.value)} style={inputStyle}>
                  <option value="NEW">NEW (N-YYMM-XXXX)</option>
                  <option value="OLD">OLD (O-YYMM-XXXX)</option>
                </select>
              </Field>

              <Field label="จำนวน (1-500)">
                <input value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} inputMode="numeric" style={inputStyle} />
              </Field>

              <Field label="ชื่อไม้ (ใช้ให้ทุกต้นในชุดนี้)">
                <input value={bulkName} onChange={(e) => setBulkName(e.target.value)} placeholder="เช่น Monstera Albo" style={inputStyle} />
              </Field>

              <Field label="ทุน (ใช้ให้ทุกต้น)">
                <input value={bulkCost} onChange={(e) => setBulkCost(e.target.value)} inputMode="numeric" placeholder="0" style={inputStyle} />
              </Field>

              <Field label="ราคาตั้งต้น (ถ้ามี)">
                <input value={bulkPriceHint} onChange={(e) => setBulkPriceHint(e.target.value)} inputMode="numeric" placeholder="0" style={inputStyle} />
              </Field>

              <Field label="วันที่ได้มา (ถ้ามี)">
                <input value={bulkAcquiredDate} onChange={(e) => setBulkAcquiredDate(e.target.value)} type="date" style={inputStyle} />
              </Field>

              <Field label="หมายเหตุ (ถ้ามี)">
                <input value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} placeholder="ใส่ได้" style={inputStyle} />
              </Field>
            </GridForm>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button disabled={previewing} onClick={previewBulkCodes} style={primaryBtn}>
                {previewing ? 'กำลังพรีวิว...' : 'พรีวิวโค้ด'}
              </button>
              <button disabled={creatingBulk || !previewCodes.length} onClick={createBulk} style={secondaryBtn}>
                {creatingBulk ? 'กำลังสร้าง...' : 'สร้างต้นไม้ (Bulk)'}
              </button>
            </div>

            {previewCodes.length ? (
              <div style={previewBox}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>พรีวิวโค้ด ({previewCodes.length})</div>
                <div style={previewGrid}>
                  {previewCodes.map((x) => (
                    <div key={x.code} style={chipCard}>
                      <div style={{ fontWeight: 900 }}>{x.code}</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>{bulkName || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}

        {view === 'list' ? (
          <>
            {/* ✅ สรุปสต๊อก ACTIVE (คงเหลือทั้งหมด) */}
            <div style={summaryBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 950 }}>สรุปสต๊อก (ยังไม่ขาย)</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>นับเฉพาะสถานะ ACTIVE (คงเหลือ)</div>
                </div>

                <button onClick={loadActiveSummary} style={ghostBtn} disabled={loadingSummary}>
                  {loadingSummary ? 'กำลังคำนวณ...' : 'รีเฟรชสรุป'}
                </button>
              </div>

              <div style={summaryGrid}>
                <Mini label="จำนวนไม้คงเหลือ (ACTIVE)">{loadingSummary ? '...' : summary.activeCount.toLocaleString()}</Mini>
                <Mini label="มูลค่าไม้ (ทุนรวม)">{loadingSummary ? '...' : summary.totalCost.toLocaleString()}</Mini>
                <Mini label="หน่วย">บาท (THB)</Mini>
              </div>
            </div>

            <Card title="รายการต้นไม้ (ล่าสุด 100)">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา: code / legacy / name" style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
                <button onClick={loadPlants} style={ghostBtn}>
                  รีเฟรช
                </button>
              </div>

              {loadingList ? <div style={{ marginTop: 10, opacity: 0.85 }}>กำลังโหลด...</div> : null}

              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {filtered.map((p) => {
                  const isActive = String(p.status || '').toUpperCase() === 'ACTIVE'
                  const bd = isActive ? 'rgba(0,255,120,0.35)' : 'rgba(255,60,60,0.45)'
                  const glow = isActive ? 'rgba(0,255,120,0.10)' : 'rgba(255,60,60,0.10)'

                  return (
                    <div
                      key={p.id}
                      style={{
                        border: `1px solid ${bd}`,
                        background: glow,
                        borderRadius: 16,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 220 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 950, fontSize: 16 }}>{p.plant_code}</div>
                            <StatusPill status={p.status} />
                          </div>
                          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>{p.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                            kind: {p.code_kind}
                            {p.legacy_code ? ` • legacy: ${p.legacy_code}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'start', flexWrap: 'wrap' }}>
                          {isActive ? (
                            <button onClick={() => markSold(p.id)} style={smallBtn}>
                              Mark SOLD
                            </button>
                          ) : (
                            <button onClick={() => markActive(p.id)} style={smallBtn}>
                              Mark ACTIVE
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={miniGrid}>
                        <Mini label="ทุน">{Number(p.cost || 0).toLocaleString()}</Mini>
                        <Mini label="สถานะ">
                          <span style={{ fontWeight: 950 }}>{String(p.status || '-').toUpperCase()}</span>
                        </Mini>
                        <Mini label="วันที่ได้มา">{p.acquired_date || '-'}</Mini>
                      </div>
                    </div>
                  )
                })}

                {!filtered.length && !loadingList ? <div style={{ opacity: 0.8 }}>ไม่พบข้อมูล</div> : null}
              </div>
            </Card>
          </>
        ) : null}

        {/* Label Print (14x60mm) */}
        <Card title="พรีวิวสติ๊กเกอร์ (14×60 mm)">
          <div style={{ display: 'grid', gap: 10 }} className="no-print">
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              พิมพ์เฉพาะ <b>Plant Code</b> และ <b>ชื่อไม้</b> • ปรับระยะขยับได้เผื่อเครื่องกินขอบไม่เท่ากัน
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
              <Field label="เลื่อนซ้าย/ขวา (mm)">
                <input className="input" type="number" step="0.5" value={labelX} onChange={(e) => setLabelX(Number(e.target.value || 0))} />
              </Field>
              <Field label="เลื่อนขึ้น/ลง (mm)">
                <input className="input" type="number" step="0.5" value={labelY} onChange={(e) => setLabelY(Number(e.target.value || 0))} />
              </Field>
              <Field label="ขนาดโค้ด (px)">
                <input className="input" type="number" step="1" value={labelCodeSize} onChange={(e) => setLabelCodeSize(Number(e.target.value || 16))} />
              </Field>
              <Field label="ขนาดชื่อ (px)">
                <input className="input" type="number" step="1" value={labelNameSize} onChange={(e) => setLabelNameSize(Number(e.target.value || 10))} />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!labelsToPrint.length) return toastErr('ยังไม่มีรายการสำหรับพิมพ์')
                  window.print()
                }}
              >
                พิมพ์สติ๊กเกอร์
              </button>
              <button className="btn" onClick={() => setLabelQueue([])}>
                เคลียร์คิวล่าสุด
              </button>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                รายการสำหรับพิมพ์: <b>{labelsToPrint.length}</b>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {labelsToPrint.slice(0, 10).map((it) => (
                <div
                  key={it.plant_code}
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    padding: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 950 }}>{it.plant_code}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>{it.name || '-'}</div>
                  </div>
                </div>
              ))}
              {labelsToPrint.length > 10 ? (
                <div style={{ fontSize: 12, opacity: 0.75 }}>…และอีก {labelsToPrint.length - 10} รายการ</div>
              ) : null}
              {!labelsToPrint.length ? <div style={{ opacity: 0.8 }}>ยังไม่มีรายการสำหรับพิมพ์</div> : null}
            </div>
          </div>

          {/* Print-only area */}
          <div id="label-print-area">
            {labelsToPrint.map((it, idx) => (
              <div
                key={it.plant_code + idx}
                className="label-page"
                style={{
                  width: '60mm',
                  height: '14mm',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    transform: `translate(${labelX}mm, ${labelY}mm)`,
                    paddingLeft: '1.5mm',
                    paddingRight: '1.5mm',
                  }}
                >
                  <div
                    style={{
                      fontSize: labelCodeSize,
                      fontWeight: 900,
                      lineHeight: 1.05,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {it.plant_code}
                  </div>
                  <div
                    style={{
                      marginTop: 1,
                      fontSize: labelNameSize,
                      fontWeight: 700,
                      lineHeight: 1.05,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      opacity: 0.95,
                    }}
                  >
                    {it.name || ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <style jsx global>{`
            @media print {
              /* Print only the label area on this page */
              @page { size: 60mm 14mm; margin: 0; }
              body { background: #fff !important; }
              body * { visibility: hidden !important; }
              #label-print-area, #label-print-area * { visibility: visible !important; }
              #label-print-area { position: absolute; left: 0; top: 0; }
              .label-page { page-break-after: always; }
              .label-page:last-child { page-break-after: auto; }
            }
          `}</style>
        </Card>

      </div>
    </AppShell>
  )
}

function Banner({ type, children }) {
  const bg = type === 'err' ? 'rgba(255,0,0,0.12)' : 'rgba(0,255,120,0.10)'
  const bd = type === 'err' ? 'rgba(255,0,0,0.25)' : 'rgba(0,255,120,0.22)'
  return <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 14, padding: 12 }}>{children}</div>
}

function Card({ title, children }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 950, marginBottom: 10, fontSize: 14 }}>{title}</div>
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

function GridForm({ children }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      }}
    >
      <div style={{ display: 'contents' }}>{children}</div>
      <style jsx>{`
        @media (max-width: 820px) {
          div[style*='grid-template-columns: repeat(2'] {
            grid-template-columns: 1fr !important;
          }
          div[style*='grid-template-columns: repeat(3'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function Mini({ label, children }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: 10, background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 900, marginTop: 2 }}>{children}</div>
    </div>
  )
}

function StatusPill({ status }) {
  const s = String(status || '').toUpperCase()
  const isActive = s === 'ACTIVE'
  return (
    <span
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 950,
        border: `1px solid ${isActive ? 'rgba(0,255,120,0.45)' : 'rgba(255,60,60,0.55)'}`,
        background: isActive ? 'rgba(0,255,120,0.10)' : 'rgba(255,60,60,0.12)',
      }}
    >
      {s || '-'}
    </span>
  )
}

function SegBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...segBtnBase,
        ...(active ? segBtnActive : {}),
      }}
    >
      {children}
    </button>
  )
}

const wrap = {
  display: 'grid',
  gap: 12,
  maxWidth: 980,
  margin: '0 auto',
  paddingBottom: 30,
}

const segWrap = {
  borderRadius: 18,
  padding: 14,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.06)',
}

const segRow = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const segBtnBase = {
  height: 40,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.06)',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
}

const segBtnActive = {
  background: 'rgba(0,255,120,0.12)',
  border: '1px solid rgba(0,255,120,0.35)',
}

const summaryBox = {
  borderRadius: 18,
  padding: 14,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.06)',
}

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  marginTop: 10,
}

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 18,
  padding: 14,
}

const miniGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  marginTop: 10,
}

const previewBox = {
  marginTop: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 12,
  background: 'rgba(255,255,255,0.04)',
}

const previewGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 8,
}

const chipCard = {
  padding: 10,
  borderRadius: 14,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
}

const inputStyle = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(0,0,0,0.20)',
  color: 'white',
  outline: 'none',
}

const primaryBtn = {
  height: 44,
  padding: '0 16px',
  borderRadius: 14,
  border: 'none',
  background: '#1f8a5b',
  color: 'white',
  fontWeight: 950,
  cursor: 'pointer',
}

const secondaryBtn = {
  height: 44,
  padding: '0 16px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(255,255,255,0.08)',
  color: 'white',
  fontWeight: 950,
  cursor: 'pointer',
}

const ghostBtn = {
  height: 40,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: 'white',
  cursor: 'pointer',
}

const smallBtn = {
  height: 34,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: 'white',
  cursor: 'pointer',
}