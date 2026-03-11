'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

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

function normalizePlantCode(raw, forcedPrefix = '') {
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

  const digits = body.replace(/[^0-9]/g, '')
  const yymm = digits.slice(0, 4)
  const running = digits.slice(4)

  if (!prefix || !yymm || !running) return ''
  return `${prefix}-${yymm}-${pad4(running)}`
}

function parseRunning(code) {
  const parts = String(code || '').split('-')
  const run = parts?.[2] ?? ''
  const n = parseInt(run, 10)
  return Number.isFinite(n) ? n : 0
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald: 'border border-emerald-200/90 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200/90 bg-amber-50 text-amber-700',
    rose: 'border border-rose-200/90 bg-rose-50 text-rose-700',
    slate: 'border border-slate-200/90 bg-white text-slate-600',
    sky: 'border border-sky-200/90 bg-sky-50 text-sky-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-tight',
        map[tone] || map.slate
      )}
    >
      {children}
    </span>
  )
}

function ShellCard({ title, subtitle, tint = 'default', right, children, className = '' }) {
  const tintMap = {
    default:
      'border border-white/80 bg-white/92 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
    rose:
      'border border-rose-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,244,247,0.96)_46%,rgba(252,231,243,0.92)_100%)] shadow-[0_8px_24px_rgba(244,63,94,0.06)]',
    sky:
      'border border-sky-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,250,255,0.96)_46%,rgba(224,242,254,0.92)_100%)] shadow-[0_8px_24px_rgba(59,130,246,0.06)]',
    emerald:
      'border border-emerald-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,255,250,0.96)_46%,rgba(209,250,229,0.92)_100%)] shadow-[0_8px_24px_rgba(16,185,129,0.06)]',
    cream:
      'border border-amber-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,251,245,0.96)_46%,rgba(255,247,237,0.92)_100%)] shadow-[0_8px_24px_rgba(245,158,11,0.06)]',
    lilac:
      'border border-violet-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(249,247,255,0.96)_46%,rgba(243,232,255,0.92)_100%)] shadow-[0_8px_24px_rgba(139,92,246,0.06)]',
  }

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[30px] p-4 sm:p-5',
        tintMap[tint] || tintMap.default,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.66),transparent_38%)]" />
      <div className="relative z-10">
        {(title || subtitle || right) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? (
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</div>
              ) : null}
            </div>
            {right}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold tracking-tight text-slate-500">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-slate-400">{hint}</div> : null}
    </label>
  )
}

function MiniStat({ label, value, tone = 'default' }) {
  const toneMap = {
    default: 'border-white/85 bg-white/82',
    rose: 'border-rose-100/90 bg-white/72',
    sky: 'border-sky-100/90 bg-white/72',
    emerald: 'border-emerald-100/90 bg-white/72',
    cream: 'border-amber-100/90 bg-white/72',
  }

  return (
    <div
      className={cn(
        'rounded-[22px] border p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
        toneMap[tone] || toneMap.default
      )}
    >
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[26px] font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100'

export default function PlantsPage() {
  const supabase = supabaseBrowser()

  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deadLoadingId, setDeadLoadingId] = useState('')

  const [kind, setKind] = useState('NEW')
  const [dateCode, setDateCode] = useState(currentYYMM())
  const [qty, setQty] = useState(1)
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')

  const [plants, setPlants] = useState([])
  const [q, setQ] = useState('')

  const [needPrefixModal, setNeedPrefixModal] = useState(false)
  const [pendingDigits, setPendingDigits] = useState('')
  const [pendingResolved, setPendingResolved] = useState('')

  const [labelMode, setLabelMode] = useState('single')
  const [labelQ, setLabelQ] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [labelLoading, setLabelLoading] = useState(false)
  const [labelErr, setLabelErr] = useState('')
  const [labelList, setLabelList] = useState([])
  const [selectedIds, setSelectedIds] = useState([])

  const isNew = kind === 'NEW'
  const prefix = isNew ? 'N' : 'O'

  const filtered = useMemo(() => {
    const query = (q || '').trim()
    if (!query) return plants

    const up = query.toUpperCase()
    const noDash = up.replace(/-/g, '')
    const looksDigits = isDigitsOnly(noDash)

    if (looksDigits) {
      return plants.filter((p) =>
        String(p.plant_code || '').replace(/-/g, '').includes(noDash)
      )
    }

    return plants.filter(
      (p) =>
        String(p.plant_code || '').toUpperCase().includes(up) ||
        String(p.name || '').toUpperCase().includes(up)
    )
  }, [plants, q])

  const selectedLabels = useMemo(() => {
    const ids = new Set(selectedIds)
    return labelList.filter((x) => ids.has(x.id))
  }, [labelList, selectedIds])

  const activeCount = plants.length
  const totalCost = useMemo(
    () => plants.reduce((sum, p) => sum + Number(p.cost || 0), 0),
    [plants]
  )

  function toastOk(msg) {
    setOk(msg)
    setTimeout(() => setOk(''), 2500)
  }

  function toastErr(msg) {
    setErr(msg)
    setTimeout(() => setErr(''), 4000)
  }

  async function markPlantDead(id) {
    const confirmed = window.confirm('ยืนยันเปลี่ยนสถานะต้นไม้นี้เป็น "DEAD" ใช่ไหม')
    if (!confirmed) return

    setDeadLoadingId(id)
    setErr('')
    setOk('')

    try {
      const { error } = await supabase
        .from('plants')
        .update({ status: 'DEAD' })
        .eq('id', id)
        .eq('status', 'ACTIVE')

      if (error) throw error

      toastOk('อัพเดทสถานะเป็น DEAD แล้ว')
      await loadPlants()
    } catch (e) {
      toastErr(e?.message || 'อัพเดทสถานะไม่สำเร็จ')
    } finally {
      setDeadLoadingId('')
    }
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
    const { data, error } = await supabase.rpc('next_plant_code', {
      p_prefix: pfx,
      p_datecode: yymm,
    })
    if (error) throw error
    return data
  }

  async function addPlants() {
    setErr('')
    setOk('')

    const qn = Math.max(1, parseInt(qty || 1, 10) || 1)
    const costNum = Number(cost)

    if (!dateCode || String(dateCode).trim().length !== 4) {
      return toastErr('กรุณาใส่ DateCode (YYMM) เช่น 2603')
    }
    if (!name.trim()) return toastErr('กรุณาใส่ชื่อไม้')
    if (!Number.isFinite(costNum) || costNum <= 0) {
      return toastErr('กรุณาใส่ทุน (ตัวเลขมากกว่า 0)')
    }

    setSaving(true)
    try {
      let startCode = await getNextCode(prefix, dateCode)
      if (!startCode || typeof startCode !== 'string') {
        startCode = `${prefix}-${dateCode}-0001`
      }
      const startRun = parseRunning(startCode) || 1

      const codes = Array.from(
        { length: qn },
        (_, i) => `${prefix}-${dateCode}-${pad4(startRun + i)}`
      )

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

      const rows = codes.map((c) => ({
        plant_code: c,
        code_kind: isNew ? 'NEW' : 'OLD',
        name: name.trim(),
        cost: costNum,
        status: 'ACTIVE',
        acquired_date: todayISO(),
      }))

      const { error: insErr } = await supabase.from('plants').insert(rows)
      if (insErr) throw insErr

      toastOk(qn === 1 ? `เพิ่มต้นไม้สำเร็จ: ${codes[0]}` : `เพิ่มต้นไม้สำเร็จ ${qn} ต้น`)
      resetFormKeepDate()
      await loadPlants()
    } catch (e) {
      toastErr(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

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

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function clearSelected() {
    setSelectedIds([])
  }

  function selectAllResults() {
    setSelectedIds(labelList.map((x) => x.id))
  }

  async function searchLabelPlants() {
    setLabelErr('')
    setSelectedIds([])
    setLabelList([])
    setLabelLoading(true)

    try {
      if (labelMode === 'single') {
        const term = String(labelQ || '').trim()
        if (!term) {
          setLabelLoading(false)
          return
        }

        const searchTerm = term.toUpperCase()
        const compact = searchTerm.replace(/\s+/g, '').replace(/-/g, '')
        let normalized = ''

        if (compact.startsWith('N') || compact.startsWith('O')) {
          normalized = normalizePlantCode(compact, '')
        }

        let query = supabase
          .from('plants')
          .select('id, plant_code, name')
          .eq('status', 'ACTIVE')
          .order('plant_code', { ascending: true })
          .limit(200)

        if (normalized) {
          query = query.or(
            `plant_code.eq.${normalized},plant_code.ilike.%${term}%,name.ilike.%${term}%`
          )
        } else {
          query = query.or(`plant_code.ilike.%${term}%,name.ilike.%${term}%`)
        }

        const { data, error } = await query
        if (error) throw error

        const list = data || []
        setLabelList(list)
        if (list.length === 1) {
          setSelectedIds([list[0].id])
        }
      } else {
        const startRaw = String(rangeStart || '').trim()
        const endRaw = String(rangeEnd || '').trim()

        if (!startRaw || !endRaw) {
          throw new Error('กรุณากรอกรหัสเริ่มต้นและรหัสสิ้นสุด')
        }

        const startNorm = normalizePlantCode(startRaw, '')
        const endNorm = normalizePlantCode(endRaw, '')

        if (!startNorm || !endNorm) {
          throw new Error('รูปแบบรหัสช่วงไม่ถูกต้อง')
        }

        const startParts = startNorm.split('-')
        const endParts = endNorm.split('-')

        if (startParts[0] !== endParts[0] || startParts[1] !== endParts[1]) {
          throw new Error('ช่วงรหัสต้องเป็น prefix และเดือนเดียวกัน')
        }

        const startRun = parseRunning(startNorm)
        const endRun = parseRunning(endNorm)

        if (endRun < startRun) {
          throw new Error('รหัสสิ้นสุดต้องมากกว่าหรือเท่ากับรหัสเริ่มต้น')
        }

        const codes = Array.from(
          { length: endRun - startRun + 1 },
          (_, i) => `${startParts[0]}-${startParts[1]}-${pad4(startRun + i)}`
        )

        const { data, error } = await supabase
          .from('plants')
          .select('id, plant_code, name')
          .eq('status', 'ACTIVE')
          .in('plant_code', codes)
          .order('plant_code', { ascending: true })

        if (error) throw error

        const list = data || []
        setLabelList(list)
        setSelectedIds(list.map((x) => x.id))
      }
    } catch (e) {
      setLabelErr(e?.message || 'ค้นหาไม่สำเร็จ')
    } finally {
      setLabelLoading(false)
    }
  }

  function printBulkLabels() {
    if (selectedLabels.length === 0) return toastErr('กรุณาเลือกอย่างน้อย 1 รายการ')

    const labelsHtml = selectedLabels
      .map((p) => {
        const code = escapeHtml(p.plant_code)
        const nm = escapeHtml(p.name || '')
        return `
          <div class="label">
            <div class="code">${code}</div>
            <div class="name">${nm}</div>
          </div>
        `
      })
      .join('')

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print Labels</title>
  <style>
    @page { margin: 4mm; }
    html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Thai', Arial; }
    body { padding: 4mm; }
    .sheet {
      display: flex;
      flex-direction: column;
      gap: 2mm;
      align-items: flex-start;
    }
    .label {
      width: 60mm;
      height: 14mm;
      box-sizing: border-box;
      padding: 1mm 1.5mm;
      border: 1px dashed #ddd;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .code {
      font-size: 12pt;
      font-weight: 800;
      line-height: 1;
    }
    .name {
      font-size: 8pt;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta {
      margin-bottom: 4mm;
      font-size: 10pt;
      color: #444;
    }
  </style>
</head>
<body>
  <div class="meta">จำนวน ${selectedLabels.length} ใบ</div>
  <div class="sheet">${labelsHtml}</div>
  <script>
    window.onload = () => {
      window.print();
    };
  </script>
</body>
</html>`

    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
    if (!w) return toastErr('เบราว์เซอร์บล็อกหน้าต่างปริ้น กรุณาอนุญาต Pop-up')
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  function exportSelectedTxt() {
    if (selectedLabels.length === 0) return toastErr('กรุณาเลือกอย่างน้อย 1 รายการ')

    const text = selectedLabels
      .map((p) => `${p.plant_code}\t${p.name || ''}`)
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nimbot-labels-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    toastOk(`สร้างไฟล์สำเร็จ ${selectedLabels.length} รายการ`)
  }

  return (
    <AppShell title="ฐานต้นไม้">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant Plants
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                เพิ่มฐานข้อมูลต้นไม้
              </div>
              <div className="mt-1 text-sm leading-relaxed text-slate-500"></div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="emerald">ACTIVE {activeCount}</Pill>
              <Pill tone="sky">ป้าย {selectedLabels.length}</Pill>
            </div>
          </div>

          {(err || ok) && (
            <div className="space-y-2">
              {err ? (
                <div className="rounded-[24px] border border-rose-100/90 bg-rose-50/92 px-4 py-3 text-sm font-semibold text-rose-700">
                  {err}
                </div>
              ) : null}
              {ok ? (
                <div className="rounded-[24px] border border-emerald-100/90 bg-emerald-50/92 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {ok}
                </div>
              ) : null}
            </div>
          )}

          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <ShellCard
              title="เพิ่มต้นไม้"
              subtitle="กรอกน้อยที่สุด • Single/Bulk ในฟอร์มเดียว • ใช้ทุนอย่างเดียว"
              tint="rose"
              right={<Pill tone={isNew ? 'emerald' : 'sky'}>{prefix}</Pill>}
            >
              <div className="rounded-[22px] border border-white/85 bg-white/72 p-4 text-xs leading-6 text-slate-500">
                โค้ดตัวอย่าง:
                <div className="mt-2 font-mono text-sm font-extrabold tracking-tight text-slate-700">
                  {prefix}-{dateCode || 'YYMM'}-0001
                </div>
                <div className="mt-1">
                  เพิ่มต้นไม้ = เพิ่ม stock อย่างเดียว • ไม่หักเงินอัตโนมัติแล้ว
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/85 bg-white/72 p-4">
                  <div className="mb-2 text-xs font-semibold tracking-tight text-slate-500">ประเภท</div>
                  <div className="inline-flex w-full rounded-2xl border border-slate-200/90 bg-white/85 p-1">
                    <button
                      type="button"
                      onClick={() => setKind('NEW')}
                      className={cn(
                        'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition',
                        kind === 'NEW'
                          ? 'bg-emerald-500 text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      ใหม่ (N)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind('OLD')}
                      className={cn(
                        'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition',
                        kind === 'OLD'
                          ? 'bg-sky-500 text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      เก่า (O)
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/85 bg-white/72 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="เดือน (YYMM)">
                      <input
                        value={dateCode}
                        onChange={(e) =>
                          setDateCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))
                        }
                        className={cn(inputClass, 'font-mono')}
                        placeholder="2603"
                        inputMode="numeric"
                      />
                    </Field>

                    <Field label="จำนวน" hint="ใส่ 1 = เพิ่มทีละต้น">
                      <input
                        value={qty}
                        onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
                        className={inputClass}
                        placeholder="1"
                        inputMode="numeric"
                      />
                    </Field>
                  </div>
                </div>

                <Field label="ชื่อไม้">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="เช่น Alocasia..."
                  />
                </Field>

                <Field label="ทุน (บาท)" hint="ใช้คำนวณกำไรตอนขาย">
                  <input
                    value={cost}
                    onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
                    className={inputClass}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </Field>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs leading-relaxed text-slate-500">
                  ระบบจะสร้างรหัสให้เองตามลำดับล่าสุดของเดือนนั้น ๆ
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={addPlants}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </ShellCard>

            <ShellCard
              title="สรุป"
              subtitle="ภาพรวม stock ที่ยัง ACTIVE"
              tint="sky"
            >
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <MiniStat label="จำนวนต้นไม้" value={activeCount.toLocaleString('th-TH')} tone="default" />
                <MiniStat label="มูลค่าทุนรวม" value={totalCost.toLocaleString('th-TH')} tone="emerald" />
                <MiniStat label="ผลลัพธ์ค้นหาล่าสุด" value={filtered.length.toLocaleString('th-TH')} tone="sky" />
              </div>
            </ShellCard>
          </div>

          <ShellCard
            title="รายการต้นไม้ที่ยังมีอยู่"
            subtitle="แสดงเฉพาะ ACTIVE • เรียงจากน้อยไปมาก"
            tint="default"
            right={
              <div className="flex gap-2">
                <Pill tone="slate">ทั้งหมด {filtered.length}</Pill>
                <button
                  type="button"
                  onClick={loadPlants}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  รีเฟรช
                </button>
              </div>
            }
          >
            <div className="max-w-md">
              <Field label="ค้นหา">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onBlur={onSearchBlur}
                  className={inputClass}
                  placeholder="ค้นหา เช่น n26030001 หรือ O-2603-0042"
                />
              </Field>

              {pendingResolved ? (
                <div className="mt-2 text-xs font-semibold text-emerald-700">
                  แปลงรหัสเป็น: <span className="font-mono">{pendingResolved}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                  กำลังโหลด...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
                  ไม่พบรายการ
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {filtered.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-[24px] border border-white/85 bg-white/84 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-sm font-extrabold tracking-tight text-slate-900">
                            {p.plant_code}
                          </div>
                          <div className="mt-1 truncate text-sm text-slate-600">{p.name || '-'}</div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-[11px] font-semibold text-slate-400">ทุน</div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {Number(p.cost || 0).toLocaleString('th-TH')}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => markPlantDead(p.id)}
                          disabled={deadLoadingId === p.id}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deadLoadingId === p.id ? 'กำลังอัพเดท...' : 'ตาย'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ShellCard>

          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.12fr_0.88fr]">
            <ShellCard
              title="พิมพ์ / สร้างไฟล์สติ๊กเกอร์โค้ด (14×60 mm)"
              subtitle="รองรับค้นหาเดี่ยว, เลือกหลายรายการ, และเลือกเป็นช่วง"
              tint="cream"
            >
              <div className="inline-flex w-full rounded-2xl border border-slate-200/90 bg-white/85 p-1 shadow-sm md:w-[320px]">
                <button
                  type="button"
                  onClick={() => setLabelMode('single')}
                  className={cn(
                    'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition',
                    labelMode === 'single'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  ค้นหา/เลือกเอง
                </button>
                <button
                  type="button"
                  onClick={() => setLabelMode('range')}
                  className={cn(
                    'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition',
                    labelMode === 'range'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  เลือกเป็นช่วง
                </button>
              </div>

              {labelMode === 'single' ? (
                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                  <input
                    value={labelQ}
                    onChange={(e) => setLabelQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') searchLabelPlants()
                    }}
                    className={cn(inputClass, 'md:flex-1')}
                    placeholder="ค้นหา เช่น n26030001 หรือชื่อไม้"
                  />
                  <button
                    type="button"
                    onClick={searchLabelPlants}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={labelLoading}
                  >
                    {labelLoading ? 'กำลังค้นหา...' : 'ค้นหา'}
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className={inputClass}
                    placeholder="รหัสเริ่มต้น เช่น n-2603-0001"
                  />
                  <input
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className={inputClass}
                    placeholder="รหัสสิ้นสุด เช่น n-2603-0010"
                  />
                  <button
                    type="button"
                    onClick={searchLabelPlants}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={labelLoading}
                  >
                    {labelLoading ? 'กำลังค้นหา...' : 'ค้นหาช่วง'}
                  </button>
                </div>
              )}

              {labelErr ? (
                <div className="mt-3 rounded-[20px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {labelErr}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllResults}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  disabled={labelList.length === 0}
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={clearSelected}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  disabled={selectedIds.length === 0}
                >
                  ล้างที่เลือก
                </button>
                <button
                  type="button"
                  onClick={printBulkLabels}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={selectedIds.length === 0}
                >
                  พิมพ์ที่เลือก
                </button>
                <button
                  type="button"
                  onClick={exportSelectedTxt}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-sky-200/80 bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={selectedIds.length === 0}
                >
                  สร้างไฟล์ TXT
                </button>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                ใช้กับ Nimbot D110_M / label 14×60 mm ได้ และไม่ต้องไล่พิมพ์ทีละใบแล้ว
              </div>
            </ShellCard>

            <div className="grid gap-3 sm:gap-4">
              <ShellCard
                title="พรีวิว"
                subtitle={`${selectedLabels.length} รายการที่เลือก`}
                tint="sky"
              >
                <div className="space-y-2">
                  {selectedLabels.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
                      ยังไม่ได้เลือกรายการ
                    </div>
                  ) : (
                    selectedLabels.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="rounded-[18px] border border-dashed border-slate-300 bg-white p-2"
                        style={{ width: '60mm', height: '14mm' }}
                      >
                        <div className="font-mono text-[14px] font-extrabold leading-none text-slate-900">
                          {p.plant_code}
                        </div>
                        <div className="mt-1 truncate text-[10px] leading-tight text-slate-700">
                          {p.name || 'ชื่อไม้'}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {selectedLabels.length > 5 ? (
                  <div className="mt-2 text-[11px] text-slate-500">
                    และอีก {selectedLabels.length - 5} รายการ
                  </div>
                ) : null}
              </ShellCard>

              <ShellCard
                title="ผลลัพธ์"
                subtitle={`${labelList.length} รายการ`}
                tint="default"
              >
                {labelList.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
                    ยังไม่มีผลลัพธ์
                  </div>
                ) : (
                  <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                    {labelList.map((p) => {
                      const active = selectedIds.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleSelect(p.id)}
                          className={cn(
                            'w-full rounded-[20px] border p-3 text-left shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition',
                            active
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-white/85 bg-white/82 hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              readOnly
                              checked={active}
                              className="mt-1 h-4 w-4"
                            />
                            <div className="min-w-0">
                              <div className="truncate font-mono text-sm font-bold text-slate-900">
                                {p.plant_code}
                              </div>
                              <div className="mt-1 truncate text-sm text-slate-600">
                                {p.name || '-'}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </ShellCard>
            </div>
          </div>

          {needPrefixModal ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 md:items-center">
              <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                <div className="text-[18px] font-semibold tracking-tight text-slate-900">
                  เลือกว่าเป็น N หรือ O
                </div>
                <div className="mt-2 text-sm leading-relaxed text-slate-500">
                  คุณพิมพ์เป็นเลขล้วน:{' '}
                  <span className="font-mono font-semibold text-slate-800">{pendingDigits}</span>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => choosePrefix('N')}
                    className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    ใหม่ (N)
                  </button>
                  <button
                    type="button"
                    onClick={() => choosePrefix('O')}
                    className="flex-1 rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
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
                  className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}