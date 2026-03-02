'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

/**
 * Plants Page (Locked scope)
 * ✅ รวมเพิ่มต้นไม้ Single + Bulk ในฟอร์มเดียว
 * ✅ ใช้เฉพาะ "ทุน (cost)" — ตัด price_hint / notes / legacy_code ออก
 * ✅ ถ้าเป็น NEW (N) -> บันทึกรายจ่ายหัก GSB อัตโนมัติ (ตาราง expenses)
 * ✅ รายการต้นไม้โชว์เฉพาะ ACTIVE และเรียง plant_code จากน้อย -> มาก
 * ✅ รองรับค้นหารหัสแบบพิมพ์ง่าย (n/o ตัวเล็ก, ไม่ต้องใส่ขีด)
 *    - ถ้าเป็น "เลขล้วน" จะเด้ง popup ให้เลือก N/O (ไม่เดาเอง)
 */

function pad4(n) {
  const s = String(n ?? '')
  return s.padStart(4, '0')
}

function currentYYMM() {
  const d = new Date()
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yy}${mm}`
}

function isDigitsOnly(s) {
  return /^[0-9]+$/.test(s)
}

/**
 * รับอินพุตหลายแบบ:
 * - n26030001 / N26030001
 * - n-2603-0001 / O-2603-0042
 * - 26030001 (เลขล้วน) -> ต้องเลือก prefix ก่อน
 *
 * คืนค่า format มาตรฐาน: N-2603-0001
 */
function normalizePlantCode(raw, forcedPrefix /* 'N' | 'O' | '' */) {
  if (!raw) return ''
  let s = String(raw).trim().toUpperCase()
  s = s.replace(/\s+/g, '')
  s = s.replace(/-/g, '')

  if (!s) return ''

  let prefix = ''
  let body = s

  if (s.startsWith('N') || s.startsWith('O')) {
    prefix = s[0]
    body = s.slice(1)
  } else {
    prefix = forcedPrefix || ''
    body = s
  }

  // body should be YYMM + RUNNING(4)
  const digits = body.replace(/[^0-9]/g, '')
  const yymm = digits.slice(0, 4)
  const running = digits.slice(4)

  if (!prefix) return '' // ยังไม่รู้ว่า N/O

  return `${prefix}-${yymm}-${pad4(running)}`
}

function parseRunning(code /* N-2603-0001 */) {
  const parts = String(code || '').split('-')
  const run = parts?.[2] ?? ''
  const n = parseInt(run, 10)
  return Number.isFinite(n) ? n : 0
}

export default function PlantsPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ---------- Add form (single+bulk) ----------
  const [kind, setKind] = useState('NEW') // NEW | OLD
  const [dateCode, setDateCode] = useState(currentYYMM()) // YYMM
  const [qty, setQty] = useState(1)
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')

  // ---------- List ----------
  const [plants, setPlants] = useState([])
  const [q, setQ] = useState('')

  // ---------- Search normalize modal (digits only) ----------
  const [needPrefixModal, setNeedPrefixModal] = useState(false)
  const [pendingDigits, setPendingDigits] = useState('') // digits-only input waiting for N/O
  const [pendingResolved, setPendingResolved] = useState('') // final normalized code to set as query

  const isNew = kind === 'NEW'
  const prefix = isNew ? 'N' : 'O'

  const filtered = useMemo(() => {
    const query = (q || '').trim()
    if (!query) return plants

    const up = query.toUpperCase()
    const noDash = up.replace(/-/g, '')
    const looksDigits = isDigitsOnly(noDash)

    if (looksDigits) {
      return plants.filter((p) => String(p.plant_code || '').replace(/-/g, '').includes(noDash))
    }

    return plants.filter(
      (p) =>
        String(p.plant_code || '').toUpperCase().includes(up) ||
        String(p.name || '').toUpperCase().includes(up)
    )
  }, [plants, q])

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2500)
  }

  function toastErr(msg) {
    setErr(msg)
    setTimeout(() => setErr(''), 4000)
  }

  async function loadPlants() {
    setLoading(true)
    setErr('')
    try {
      const { data, error } = await supabase
        .from('plants')
        .select('id, plant_code, name, cost, status, created_at')
        .eq('status', 'ACTIVE')
        .order('plant_code', { ascending: true })

      if (error) throw error
      setPlants(data || [])
    } catch (e) {
      toastErr(e?.message || 'โหลดรายการต้นไม้ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetFormKeepDate() {
    setQty(1)
    setName('')
    setCost('')
  }

  async function getNextCode(pfx, yymm) {
    // RPC: public.next_plant_code(p_prefix text, p_datecode text)
    const { data, error } = await supabase.rpc('next_plant_code', { p_prefix: pfx, p_datecode: yymm })
    if (error) throw error
    return data // string
  }

  async function addPlants() {
    setErr('')
    setOk('')

    const qn = Math.max(1, parseInt(qty || 1, 10) || 1)
    const costNum = Number(cost)
    if (!dateCode || String(dateCode).trim().length !== 4) return toastErr('กรุณาใส่ DateCode (YYMM) เช่น 2603')
    if (!name.trim()) return toastErr('กรุณาใส่ชื่อไม้')
    if (!Number.isFinite(costNum) || costNum <= 0) return toastErr('กรุณาใส่ทุน (ตัวเลขมากกว่า 0)')

    setSaving(true)
    try {
      // 1) หาโค้ดเริ่มต้นจาก DB
      const startCode = await getNextCode(prefix, dateCode)
      const startRun = parseRunning(startCode)
      if (!startRun) throw new Error('อ่านเลข running ไม่สำเร็จ')

      // 2) สร้างชุดโค้ดตามจำนวน
      const codes = Array.from({ length: qn }, (_, i) => `${prefix}-${dateCode}-${pad4(startRun + i)}`)

      // 3) กันซ้ำก่อน insert
      const { data: existed, error: existErr } = await supabase
        .from('plants')
        .select('plant_code')
        .in('plant_code', codes)
        .limit(2000)

      if (existErr) throw existErr
      const existedCodes = new Set((existed || []).map((x) => x.plant_code))
      if (existedCodes.size > 0) {
        const sample = Array.from(existedCodes).slice(0, 10).join(', ')
        throw new Error(`โค้ดซ้ำในระบบ: ${sample}${existedCodes.size > 10 ? ' ...' : ''}`)
      }

      // 4) insert plants (ACTIVE only)
      const rows = codes.map((c) => ({
        plant_code: c,
        code_kind: isNew ? 'NEW' : 'OLD',
        name: name.trim(),
        cost: costNum,
        status: 'ACTIVE',
        acquired_date: isNew ? new Date().toISOString().slice(0, 10) : null,
      }))

      const { error: insErr } = await supabase.from('plants').insert(rows)
      if (insErr) throw insErr

      // 5) ถ้า NEW -> บันทึกรายจ่ายหัก GSB อัตโนมัติ (รวมยอดครั้งเดียว)
      if (isNew) {
        const total = costNum * qn
        const note =
          qn === 1
            ? `ซื้อไม้เข้า: ${codes[0]}`
            : `ซื้อไม้เข้า: ${codes[0]} ถึง ${codes[codes.length - 1]} (${qn} ต้น)`

        const { error: expErr } = await supabase.from('expenses').insert([
          {
            expense_date: new Date().toISOString().slice(0, 10),
            category: 'ซื้อไม้เข้า',
            amount: total,
            bank: 'GSB',
            note,
          },
        ])

        // ถ้ารายจ่ายพัง: แจ้งเตือนให้ไปเพิ่มเอง (แต่ plants insert ไปแล้ว)
        if (expErr) {
          toastErr(`เพิ่มต้นไม้สำเร็จ แต่บันทึกรายจ่ายอัตโนมัติไม่สำเร็จ: ${expErr.message}`)
        }
      }

      toastOk(qn === 1 ? `เพิ่มต้นไม้สำเร็จ: ${codes[0]}` : `เพิ่มต้นไม้สำเร็จ ${qn} ต้น`)
      resetFormKeepDate()
      await loadPlants()
    } catch (e) {
      toastErr(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  // ---------- Search helpers ----------
  function onSearchBlur() {
    const raw = (q || '').trim()
    if (!raw) return

    const compact = raw.toUpperCase().replace(/\s+/g, '').replace(/-/g, '')
    if (compact && isDigitsOnly(compact)) {
      setPendingDigits(compact)
      setNeedPrefixModal(true)
      return
    }

    if (compact.startsWith('N') || compact.startsWith('O')) {
      const norm = normalizePlantCode(raw, '')
      if (norm) setQ(norm)
    }
  }

  function choosePrefix(pfx) {
    const norm = normalizePlantCode(pendingDigits, pfx)
    setNeedPrefixModal(false)
    setPendingDigits('')
    if (norm) {
      setQ(norm)
      setPendingResolved(norm)
      setTimeout(() => setPendingResolved(''), 1200)
    }
  }

  return (
    <AppShell title="ฐานต้นไม้">
      <div className="mx-auto w-full max-w-5xl px-3 pb-10">
        {(err || ok) && (
          <div className="mt-3 space-y-2">
            {err ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {err}
              </div>
            ) : null}
            {ok ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {ok}
              </div>
            ) : null}
          </div>
        )}

        {/* Add form */}
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-white">เพิ่มต้นไม้</div>
              <div className="text-xs text-white/60">กรอกน้อยที่สุด • Single/Bulk ในฟอร์มเดียว • ใช้ทุนอย่างเดียว</div>
            </div>
            <div className="text-xs text-white/60">
              โค้ดตัวอย่าง: <span className="font-mono text-white/80">{prefix}-{dateCode}-0001</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Kind toggle */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs text-white/70">ประเภท</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKind('NEW')}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm ${
                    kind === 'NEW' ? 'bg-emerald-600/80 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  ใหม่ (N)
                </button>
                <button
                  type="button"
                  onClick={() => setKind('OLD')}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm ${
                    kind === 'OLD' ? 'bg-sky-600/80 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  เก่า (O)
                </button>
              </div>
              <div className="mt-2 text-[11px] text-white/55">
                {isNew ? '✅ จะบันทึกรายจ่ายหัก GSB อัตโนมัติ' : 'ℹ️ ไม้เก่าไม่หักเงิน'}
              </div>
            </div>

            {/* DateCode + Qty */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-2 text-xs text-white/70">เดือน (YYMM)</div>
                  <input
                    value={dateCode}
                    onChange={(e) => setDateCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-white/20"
                    placeholder="2603"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs text-white/70">จำนวน</div>
                  <input
                    value={qty}
                    onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    placeholder="1"
                    inputMode="numeric"
                  />
                  <div className="mt-1 text-[11px] text-white/50">ใส่ 1 = เพิ่มทีละต้น</div>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs text-white/70">ชื่อไม้</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                placeholder="เช่น Alocasia..."
              />
            </div>

            {/* Cost */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs text-white/70">ทุน (บาท)</div>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                placeholder="0"
                inputMode="decimal"
              />
              <div className="mt-1 text-[11px] text-white/50">
                {isNew ? 'จะถูกนำไปหักออกจาก GSB อัตโนมัติ' : 'ใช้คำนวณกำไรตอนขาย'}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-white/60">
              ระบบจะสร้างรหัสให้เองตามลำดับล่าสุดของเดือนนั้น ๆ (ไม่ต้องพิมพ์รหัส)
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={addPlants}
              className="rounded-2xl bg-emerald-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-base font-semibold text-white">รายการต้นไม้ที่ยังมีอยู่</div>
              <div className="text-xs text-white/60">แสดงเฉพาะ ACTIVE • เรียงจากน้อยไปมาก</div>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={onSearchBlur}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20 md:w-[280px]"
                placeholder="ค้นหา (รหัส/ชื่อ) เช่น n26030001 หรือ O-2603-0042"
              />
              <button
                type="button"
                onClick={loadPlants}
                className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/15"
              >
                รีเฟรช
              </button>
            </div>
          </div>

          {pendingResolved ? (
            <div className="mt-2 text-xs text-emerald-200">
              แปลงรหัสเป็น: <span className="font-mono">{pendingResolved}</span>
            </div>
          ) : null}

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-white/70">กำลังโหลด...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                ไม่พบรายการ (ตอนนี้แสดงเฉพาะ ACTIVE)
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filtered.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-emerald-500/30 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm text-white">{p.plant_code}</div>
                        <div className="truncate text-sm text-white/85">{p.name || '-'}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-white/55">ทุน</div>
                        <div className="text-sm font-semibold text-white">
                          {Number(p.cost || 0).toLocaleString('th-TH')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prefix modal (digits-only search) */}
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
                }}
                className="mt-3 w-full rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/15"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}