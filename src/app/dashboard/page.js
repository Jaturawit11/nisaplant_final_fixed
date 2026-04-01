'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { supabaseBrowser } from '@/lib/supabase/browser'

function money(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toLocaleString('th-TH') : '0'
}

function monthRange(date = new Date()) {
  const d = new Date(date)
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const toISO = (x) => x.toISOString().slice(0, 10)
  return { start: toISO(start), end: toISO(end) }
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function roundUp1000(n) {
  const x = Number(n || 0)
  if (x <= 0) return 0
  return Math.ceil(x / 1000) * 1000
}

function isDateInRange(dateStr, start, end) {
  const d = String(dateStr || '')
  return d >= start && d < end
}

function Pill({ tone = 'slate', children }) {
  const map = {
    emerald:
      'border border-emerald-200/80 bg-emerald-50/90 text-emerald-700 shadow-[0_2px_8px_rgba(16,185,129,0.06)]',
    amber:
      'border border-amber-200/80 bg-amber-50/90 text-amber-700 shadow-[0_2px_8px_rgba(245,158,11,0.06)]',
    rose:
      'border border-rose-200/80 bg-rose-50/90 text-rose-700 shadow-[0_2px_8px_rgba(244,63,94,0.06)]',
    slate:
      'border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)]',
    sky:
      'border border-sky-200/80 bg-sky-50/90 text-sky-700 shadow-[0_2px_8px_rgba(59,130,246,0.06)]',
    lilac:
      'border border-violet-200/80 bg-violet-50/90 text-violet-700 shadow-[0_2px_8px_rgba(139,92,246,0.06)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-tight whitespace-nowrap',
        map[tone] || map.slate
      )}
    >
      {children}
    </span>
  )
}

function Card({ children, className = '', tint = 'default' }) {
  const tintMap = {
    default:
      'border border-white/80 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-[4px]',
    rose:
      'border border-rose-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,246,249,0.97)_54%,rgba(253,234,242,0.96)_100%)] shadow-[0_12px_30px_rgba(244,63,94,0.07)]',
    sky:
      'border border-sky-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(246,250,255,0.97)_54%,rgba(233,244,255,0.96)_100%)] shadow-[0_12px_30px_rgba(59,130,246,0.07)]',
    emerald:
      'border border-emerald-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(246,255,251,0.97)_54%,rgba(232,250,241,0.96)_100%)] shadow-[0_12px_30px_rgba(16,185,129,0.07)]',
    cream:
      'border border-amber-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,251,245,0.97)_54%,rgba(255,245,230,0.96)_100%)] shadow-[0_12px_30px_rgba(245,158,11,0.07)]',
    lilac:
      'border border-violet-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(249,247,255,0.97)_54%,rgba(241,235,255,0.96)_100%)] shadow-[0_12px_30px_rgba(139,92,246,0.07)]',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] p-4 sm:p-5 lg:p-6',
        tintMap[tint] || tintMap.default,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.14)_100%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[16px] font-bold tracking-tight text-slate-900">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</div>
        ) : null}
      </div>
      {right}
    </div>
  )
}

function KPIHeroCard({ title, value, suffix = 'บาท', tint = 'default', icon = '•', caption }) {
  return (
    <Card tint={tint} className="min-h-[160px]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
          {icon}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900 sm:text-[40px]">
          {money(value)}
        </span>
        {suffix ? <span className="mb-1 text-sm font-semibold text-slate-400">{suffix}</span> : null}
      </div>

      {caption ? <div className="mt-4 text-xs font-medium text-slate-500">{caption}</div> : null}
    </Card>
  )
}

function BankBalanceCard({ bank, balance, income, expense, tint = 'default', logo = '' }) {
  return (
    <Card tint={tint} className="min-h-[170px]">
      {logo ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <img
            src={logo}
            alt=""
            className="absolute bottom-2 right-2 h-[88px] w-[88px] select-none object-contain opacity-[0.06]"
          />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="text-[15px] font-bold tracking-[0.22em] text-slate-800">{bank}</div>
        <Pill tone={bank === 'GSB' ? 'rose' : bank === 'KTB' ? 'sky' : 'emerald'}>
          Balance
        </Pill>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="text-[30px] font-bold leading-none tracking-tight text-slate-900">
          {money(balance)}
        </span>
        <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
      </div>

      <div className="mt-5 rounded-[18px] border border-white/85 bg-white/72 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">รับเดือนนี้</span>
          <span className="font-bold text-slate-900">{money(income)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-slate-500">จ่ายเดือนนี้</span>
          <span className="font-bold text-slate-900">{money(expense)}</span>
        </div>
      </div>
    </Card>
  )
}

function DonutIncomeExpenseCard({ incomeExpenseData, netValue }) {
  const total = incomeExpenseData.reduce((a, b) => a + Number(b.value || 0), 0)
  const income = Number(incomeExpenseData?.[0]?.value || 0)
  const expense = Number(incomeExpenseData?.[1]?.value || 0)
  const safeData = total > 0 ? incomeExpenseData : [{ name: 'ไม่มีข้อมูล', value: 1 }]

  return (
    <Card tint="emerald" className="h-full min-h-[520px]">
      <SectionTitle
        title="รายรับ / รายจ่าย"
        subtitle="ดูจากเงินเข้าออกจริงของเดือนนี้"
        right={<Pill tone="emerald">รวม {money(total)}</Pill>}
      />

      <div className="flex h-[350px] items-center justify-center">
        <div className="relative h-[300px] w-full max-w-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={safeData}
                dataKey="value"
                nameKey="name"
                innerRadius={78}
                outerRadius={112}
                stroke="#fff"
                strokeWidth={2}
              >
                {safeData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={total > 0 ? ['#34d399', '#fb7185'][idx % 2] : '#e2e8f0'}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => money(v)} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-white/85 bg-white/90 px-7 py-6 text-center shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
              <div className="text-[24px] font-bold tracking-tight text-slate-900">{money(netValue)}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">สุทธิเดือนนี้</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-white/85 bg-white/80 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            รายรับ
          </div>
          <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">{money(income)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท</div>
        </div>

        <div className="rounded-[20px] border border-white/85 bg-white/80 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            รายจ่าย
          </div>
          <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">{money(expense)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท</div>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-white/85 bg-white/78 p-4">
        <div className="text-xs font-semibold text-slate-500">สรุปวันนี้</div>
        <div className="mt-2 text-sm leading-6 text-slate-700">
          {expense <= 0
            ? 'เดือนนี้ยังไม่มีรายจ่ายจริงเข้ามา ทำให้กระแสเงินสดดูสะอาดและอ่านง่าย'
            : netValue >= 0
            ? 'เงินเข้าในเดือนนี้ยังมากกว่ารายจ่าย ถือว่า cashflow ยังอยู่ในฝั่งที่ควบคุมได้'
            : 'รายจ่ายเดือนนี้สูงกว่ารายรับจริงแล้ว ควรชะลอการใช้เงินรอบใหม่'}
        </div>
      </div>
    </Card>
  )
}

function LatestInvoicesCard({ rows }) {
  return (
    <Card tint="default" className="p-0">
      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5 lg:px-6 lg:pb-6 lg:pt-6">
        <SectionTitle
          title="5 บิลล่าสุด"
          subtitle="รวม paid, partial, ยังไม่จ่าย"
          right={<Pill tone="slate">{rows.length} รายการ</Pill>}
        />

        {!rows.length ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm font-medium text-slate-500">
            ยังไม่มีรายการ
          </div>
        ) : (
          <>
            <div className="hidden md:grid md:grid-cols-[1.1fr_1fr_auto] md:items-center md:gap-4 md:px-4 md:pb-3 md:text-xs md:font-bold md:text-slate-400">
              <div>เลขที่บิล / วันที่</div>
              <div>ลูกค้า</div>
              <div className="text-right">สถานะ / ยอดรวม</div>
            </div>

            <div className="grid gap-2.5">
              {rows
                .filter((r) => String(r.invoice_status || '').toLowerCase() !== 'cancelled')
                .slice(0, 5)
                .map((r) => {
                  const tone =
                    r.pay_status === 'paid'
                      ? 'emerald'
                      : r.pay_status === 'partial'
                      ? 'amber'
                      : 'rose'

                  const payLabel =
                    r.pay_status === 'paid'
                      ? 'paid'
                      : r.pay_status === 'partial'
                      ? 'partial'
                      : 'unpaid'

                  return (
                    <div
                      key={r.id}
                      className="grid gap-3 rounded-[22px] border border-white/85 bg-white/84 px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)] md:grid-cols-[1.1fr_1fr_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                          {r.invoice_no}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">{r.sale_date}</div>
                      </div>

                      <div className="min-w-0 text-xs text-slate-600 md:text-sm">
                        <div className="truncate">{r.customer_name || '-'}</div>
                      </div>

                      <div className="shrink-0 md:text-right">
                        <div className="flex items-center gap-2 md:justify-end">
                          <Pill tone={tone}>{payLabel}</Pill>
                        </div>
                        <div className="mt-2 text-sm font-bold text-slate-900">
                          {money(r.total_price)} บาท
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

function AiBusinessCard({ insight }) {
  const riskTone =
    insight.riskLevel === 'เสี่ยง'
      ? 'rose'
      : insight.riskLevel === 'เฝ้าระวัง'
      ? 'amber'
      : 'emerald'

  return (
    <Card tint="sky" className="h-full min-h-[520px]">
      <SectionTitle
        title="AI ผู้ช่วยธุรกิจวันนี้"
        subtitle="วิเคราะห์จากยอดขาย กำไร เงินสด ยอดค้าง และทุนคงเหลือ"
        right={<Pill tone={riskTone}>{insight.riskLevel}</Pill>}
      />

      <div className="rounded-[22px] border border-white/85 bg-white/78 p-4">
        <div className="text-[18px] font-bold tracking-tight text-slate-900">{insight.headline}</div>
        <div className="mt-3 text-sm leading-7 text-slate-700 whitespace-pre-line">
          {insight.mainAdvice}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] border border-white/85 bg-white/78 p-4">
          <div className="text-xs font-semibold text-slate-500">ซื้อเพิ่มได้ไม่เกิน</div>
          <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">
            {money(insight.maxBuy)}
          </div>
          <div className="mt-1 text-xs text-slate-400">บาท</div>
        </div>

        <div className="rounded-[20px] border border-white/85 bg-white/78 p-4">
          <div className="text-xs font-semibold text-slate-500">เงินสำรองขั้นต่ำ</div>
          <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">
            {money(insight.reserveBase)}
          </div>
          <div className="mt-1 text-xs text-slate-400">บาท</div>
        </div>

        <div className="rounded-[20px] border border-white/85 bg-white/78 p-4">
          <div className="text-xs font-semibold text-slate-500">เงินสดใช้ได้ (GSB หลังกันสำรอง)</div>
          <div className="mt-2 text-[24px] font-bold tracking-tight text-slate-900">
            {money(insight.availableCash)}
          </div>
          <div className="mt-1 text-xs text-slate-400">บาท</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[22px] border border-white/85 bg-white/78 p-4">
          <div className="text-sm font-bold tracking-tight text-slate-900">เหตุผลหลักที่ AI ใช้ตัดสินใจ</div>
          <div className="mt-3 space-y-2">
            {insight.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-white/85 bg-white/78 p-4">
          <div className="text-sm font-bold tracking-tight text-slate-900">สิ่งที่ควรทำต่อ</div>
          <div className="mt-3 space-y-2">
            {insight.actions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function buildBusinessInsight({
  monthSales,
  monthNet,
  taxReserve,
  afterTax,
  bankCards,
  arTotal,
  activeCost,
  deadLoss,
}) {
  const gsbBalance = Number(bankCards?.GSB?.balance || 0)
  const gsbExpense = Number(bankCards?.GSB?.expense || 0)

  const reserveBase = Math.max(
    30000,
    roundUp1000(gsbExpense * 1.2),
    roundUp1000(arTotal * 0.5),
    deadLoss > 0 ? 40000 : 0
  )

  const availableCash = Math.max(0, gsbBalance - reserveBase)
  const rawMaxBuy = Math.max(0, Math.min(availableCash, Math.max(0, afterTax)))
  const maxBuy = Math.floor(rawMaxBuy)

  let riskLevel = 'ปลอดภัย'
  if (monthNet < 0 || deadLoss > 0 || arTotal > 0) riskLevel = 'เฝ้าระวัง'
  if ((monthNet < 0 && arTotal > 0) || deadLoss > 0 || gsbBalance < 30000) riskLevel = 'เสี่ยง'

  const reasons = [
    `ยอดขายเดือนนี้ ${money(monthSales)} บาท`,
    `กำไรสุทธิ ${money(monthNet)} บาท`,
    `เงินคงเหลือ GSB ${money(gsbBalance)} บาท`,
    arTotal > 0 ? `มียอดค้างชำระ ${money(arTotal)} บาท` : `ทุนคงเหลือใน stock ${money(activeCost)} บาท`,
  ]

  let headline = 'ธุรกิจเดือนนี้อยู่ในโซนปลอดภัย'
  let mainAdvice = ''
  let actions = []

  if (monthNet < 0) {
    headline = 'ธุรกิจเดือนนี้ขาดทุน'
    mainAdvice =
      `เดือนนี้ไม่ควรซื้อไม้เพิ่ม\n` +
      `เพราะกำไรสุทธิติดลบ ${money(Math.abs(monthNet))} บาท` +
      (deadLoss > 0 ? ` และมีไม้ตาย ${money(deadLoss)} บาท` : '') +
      `\nควรหยุดขยาย stock ชั่วคราว และโฟกัสทำเงินกลับมาเป็นบวกก่อน`

    actions = [
      'งดซื้อไม้ใหม่ก่อน จนกว่ากำไรสุทธิจะกลับมาเป็นบวก',
      'เร่งปิดยอดขายที่ค้างอยู่และหมุนเงินสดกลับเข้า GSB',
      'ลดค่าใช้จ่ายที่ไม่จำเป็น โดยเฉพาะค่าใช้จ่ายที่ไม่สร้างยอดขายทันที',
    ]
  } else if (afterTax <= 0) {
    headline = 'ยอดขายมี แต่กำไรหลังภาษียังไม่เหลือ'
    mainAdvice =
      `ตอนนี้ยังไม่ควรซื้อไม้เพิ่ม\n` +
      `แม้ยอดขายมีเข้ามา แต่กำไรหลังภาษียังไม่พอรองรับการขยาย stock`

    actions = [
      'รอให้ after tax กลับมาเป็นบวกก่อน',
      'เน้นขาย stock เดิมให้เร็วขึ้น',
      'คุมค่าใช้จ่ายจริงให้น้อยที่สุดในรอบนี้',
    ]
  } else if (maxBuy <= 0) {
    headline = 'เงินสำรองยังไม่พอสำหรับการซื้อเพิ่ม'
    mainAdvice =
      `ตอนนี้ยังไม่ควรซื้อไม้เพิ่ม\n` +
      `แม้กำไรยังเป็นบวก แต่เงินใน GSB หลังกันสำรองเหลือไม่พอ`

    actions = [
      'รักษาเงินสดใน GSB ให้มากกว่าเงินสำรองขั้นต่ำก่อน',
      'ถ้ามียอดค้างชำระ ให้ตามเก็บก่อนซื้อรอบใหม่',
      'ซื้อใหม่เฉพาะกรณีจำเป็นจริง ๆ เท่านั้น',
    ]
  } else if (afterTax < 1000) {
    headline = 'กำไรยังบาง'
    mainAdvice =
      `ซื้อไม้เพิ่มได้ แต่ไม่ควรเกิน ${money(maxBuy)} บาท\n` +
      `เพราะกำไรหลังภาษีเดือนนี้ยังบาง แม้เงินสดใน GSB ยังพอมี`

    actions = [
      `ถ้าจะซื้อใหม่ ควรคุมงบไม่เกิน ${money(maxBuy)} บาท`,
      'เน้นซื้อไม้หมุนเร็ว หรือไม้ที่มีโอกาสปิดขายไว',
      'หลีกเลี่ยงไม้ราคาหนักหรือไม้ที่ต้องจมทุนนาน',
    ]
  } else {
    headline = 'ธุรกิจอยู่ในโซนปลอดภัย'
    mainAdvice =
      `สามารถซื้อไม้เพิ่มได้ แต่ไม่ควรเกิน ${money(maxBuy)} บาท\n` +
      `เพดานนี้คำนวณจากกำไรหลังภาษีและเงินสดใน GSB หลังกันสำรองแล้ว`

    actions = [
      `กำหนดงบซื้อรอบนี้ไม่เกิน ${money(maxBuy)} บาท`,
      'เริ่มจากไม้ที่ขายเร็วและเสี่ยงต่ำก่อน',
      'ถ้ายอดค้างเพิ่มขึ้นในเดือนนี้ ให้ลดงบซื้อรอบถัดไปทันที',
    ]
  }

  return {
    riskLevel,
    headline,
    mainAdvice,
    maxBuy,
    reserveBase,
    availableCash,
    reasons,
    actions,
  }
}

const BANK_THEME = {
  GSB: { tint: 'rose', logo: '/banks/gsb.png' },
  KTB: { tint: 'sky', logo: '/banks/ktb.png' },
  KBANK: { tint: 'emerald', logo: '/banks/kbank.png' },
}

export default function DashboardPage() {
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [kpi, setKpi] = useState({
    activeCount: 0,
    activeCostSum: 0,
    monthSales: 0,
    deadLoss: 0,
    monthNet: 0,
    taxReserve: 0,
    afterTax: 0,
  })

  const [incomeExpenseData, setIncomeExpenseData] = useState([
    { name: 'รายรับ', value: 0 },
    { name: 'รายจ่าย', value: 0 },
  ])

  const [arData, setArData] = useState({
    total: 0,
    unpaidCount: 0,
    partialCount: 0,
    collectionPct: 0,
  })

  const [bankCards, setBankCards] = useState({
    GSB: { balance: 0, income: 0, expense: 0 },
    KTB: { balance: 0, income: 0, expense: 0 },
    KBANK: { balance: 0, income: 0, expense: 0 },
  })

  const [latestInvoices, setLatestInvoices] = useState([])

  const totalCash = useMemo(() => {
    return (
      Number(bankCards.GSB.balance || 0) +
      Number(bankCards.KTB.balance || 0) +
      Number(bankCards.KBANK.balance || 0)
    )
  }, [bankCards])

  const businessInsight = useMemo(() => {
    return buildBusinessInsight({
      monthSales: Number(kpi.monthSales || 0),
      monthNet: Number(kpi.monthNet || 0),
      taxReserve: Number(kpi.taxReserve || 0),
      afterTax: Number(kpi.afterTax || 0),
      bankCards,
      arTotal: Number(arData.total || 0),
      activeCost: Number(kpi.activeCostSum || 0),
      deadLoss: Number(kpi.deadLoss || 0),
    })
  }, [kpi, bankCards, arData])

  async function loadDashboard() {
    setLoading(true)
    setErr('')

    try {
      const { start, end } = monthRange()

      const [
        plantsRes,
        monthSummaryRes,
        invoicesMonthRes,
        invoicesLatestRes,
        openingsRes,
        paymentsAllRes,
        expensesAllRes,
      ] = await Promise.all([
        supabase.rpc('dashboard_plants_agg'),
        supabase.rpc('get_month_summary', {
          p_start: start,
          p_end: end,
        }),
        supabase
          .from('invoices')
          .select(
            'id, invoice_no, sale_date, customer_name, total_price, total_profit, pay_status, invoice_status, created_at'
          )
          .gte('sale_date', start)
          .lt('sale_date', end)
          .neq('invoice_status', 'cancelled'),
        supabase
          .from('invoices')
          .select(
            'id, invoice_no, sale_date, customer_name, total_price, pay_status, invoice_status, created_at'
          )
          .neq('invoice_status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('bank_opening_balances')
          .select('bank, opening_amount, as_of_date, created_at')
          .order('as_of_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('payments').select('bank, amount, pay_date'),
        supabase.from('expenses').select('bank, amount, type, expense_date'),
      ])

      if (plantsRes.error) throw plantsRes.error
      if (monthSummaryRes.error) throw monthSummaryRes.error
      if (invoicesMonthRes.error) throw invoicesMonthRes.error
      if (invoicesLatestRes.error) throw invoicesLatestRes.error
      if (openingsRes.error) throw openingsRes.error
      if (paymentsAllRes.error) throw paymentsAllRes.error
      if (expensesAllRes.error) throw expensesAllRes.error

      const plantRow = Array.isArray(plantsRes.data) ? plantsRes.data[0] || {} : plantsRes.data || {}
      const summaryRow = Array.isArray(monthSummaryRes.data)
        ? monthSummaryRes.data[0] || {}
        : monthSummaryRes.data || {}

      const monthInvoicesRows = invoicesMonthRes.data || []
      const latestRows = invoicesLatestRes.data || []
      const openingRows = openingsRes.data || []
      const paymentsAllRows = paymentsAllRes.data || []
      const expensesAllRows = expensesAllRes.data || []

      const activeCount = Number(
        plantRow.active_count ?? plantRow.activecount ?? plantRow.count ?? 0
      )
      const activeCostSum = Number(
        plantRow.active_cost_sum ?? plantRow.total_cost ?? plantRow.cost_sum ?? 0
      )

      const totalSales = Number(summaryRow.total_sales ?? summaryRow.sales ?? 0)
      const deadLoss = Number(summaryRow.dead_loss ?? summaryRow.dead ?? 0)
      const netProfit = Number(summaryRow.net_profit ?? summaryRow.net ?? 0)
      const tax15 = Number(summaryRow.tax_15 ?? summaryRow.tax ?? 0)
      const afterTax = Number(summaryRow.after_tax ?? summaryRow.after ?? 0)

      let monthIncome = 0
      let monthExpense = 0

      for (const row of paymentsAllRows) {
        if (isDateInRange(row.pay_date, start, end)) {
          monthIncome += Number(row.amount || 0)
        }
      }

      for (const row of expensesAllRows) {
        const amount = Number(row.amount || 0)
        const type = String(row.type || '').toLowerCase()

        if (!isDateInRange(row.expense_date, start, end)) continue
        if (type === 'purchase' || type === 'transfer') continue

        if (type === 'income') {
          monthIncome += amount
        } else {
          monthExpense += amount
        }
      }

      const unpaidInvoices = monthInvoicesRows.filter(
        (r) => String(r.pay_status || '').toLowerCase() === 'unpaid'
      )
      const partialInvoices = monthInvoicesRows.filter(
        (r) => String(r.pay_status || '').toLowerCase() === 'partial'
      )

      const arTotal = [...unpaidInvoices, ...partialInvoices].reduce(
        (sum, row) => sum + Number(row.total_price || 0),
        0
      )

      const totalMonthInvoiceAmount = monthInvoicesRows.reduce(
        (sum, row) => sum + Number(row.total_price || 0),
        0
      )

      const collectionPct =
        totalMonthInvoiceAmount > 0
          ? Math.max(
              0,
              Math.min(
                100,
                ((totalMonthInvoiceAmount - arTotal) / totalMonthInvoiceAmount) * 100
              )
            )
          : 0

      const bankMap = {
        GSB: { balance: 0, income: 0, expense: 0 },
        KTB: { balance: 0, income: 0, expense: 0 },
        KBANK: { balance: 0, income: 0, expense: 0 },
      }

      const latestOpeningMap = new Map()
      for (const row of openingRows) {
        const bank = String(row.bank || '')
        if (!bank) continue
        if (!latestOpeningMap.has(bank)) {
          latestOpeningMap.set(bank, {
            opening_amount: Number(row.opening_amount || 0),
            as_of_date: String(row.as_of_date || ''),
          })
        }
      }

      for (const bank of Object.keys(bankMap)) {
        const opening = latestOpeningMap.get(bank)
        if (opening) bankMap[bank].balance = Number(opening.opening_amount || 0)
      }

      for (const row of paymentsAllRows) {
        const bank = String(row.bank || '')
        if (!bankMap[bank]) continue

        const amount = Number(row.amount || 0)
        bankMap[bank].balance += amount

        if (isDateInRange(row.pay_date, start, end)) {
          bankMap[bank].income += amount
        }
      }

      for (const row of expensesAllRows) {
        const bank = String(row.bank || '')
        if (!bankMap[bank]) continue

        const amount = Number(row.amount || 0)
        const type = String(row.type || '').toLowerCase()

        if (type === 'transfer') continue

        if (type === 'income') {
          bankMap[bank].balance += amount
          if (isDateInRange(row.expense_date, start, end)) {
            bankMap[bank].income += amount
          }
        } else if (type === 'expense') {
          bankMap[bank].balance -= amount
          if (isDateInRange(row.expense_date, start, end)) {
            bankMap[bank].expense += amount
          }
        } else if (type === 'purchase') {
          bankMap[bank].balance -= amount
        }
      }

      setKpi({
        activeCount,
        activeCostSum,
        monthSales: totalSales,
        deadLoss,
        monthNet: netProfit,
        taxReserve: tax15,
        afterTax,
      })

      setIncomeExpenseData([
        { name: 'รายรับ', value: monthIncome },
        { name: 'รายจ่าย', value: monthExpense },
      ])

      setArData({
        total: arTotal,
        unpaidCount: unpaidInvoices.length,
        partialCount: partialInvoices.length,
        collectionPct,
      })

      setBankCards(bankMap)
      setLatestInvoices(latestRows)
    } catch (e) {
      setErr(e?.message || 'โหลด Dashboard ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppShell title="Dashboard">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffefe_0%,#fff9fb_22%,#f7fbff_58%,#f7fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 sm:mb-6 lg:mb-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  NisaPlant Dashboard
                </div>
                <div className="mt-2 text-[28px] font-bold tracking-tight text-slate-900 sm:text-[34px]">
                  ภาพรวมธุรกิจ
                </div>
              </div>

              <button
                onClick={loadDashboard}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(16,185,129,0.20)] transition hover:bg-emerald-600 active:scale-[0.99]"
              >
                <span className={cn('inline-block', loading && 'animate-spin')}>↻</span>
                {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
              </button>
            </div>
          </div>

          {err ? (
            <div className="mb-4 rounded-[24px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {err}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KPIHeroCard
              title="ยอดขายเดือนนี้"
              value={kpi.monthSales}
              tint="rose"
              icon="🧾"
              caption="รายได้จากบิลขายของเดือนนี้"
            />
            <KPIHeroCard
              title="กำไรสุทธิเดือนนี้"
              value={kpi.monthNet}
              tint="sky"
              icon="📈"
              caption="หลังหัก expense จริงและ dead loss"
            />
            <KPIHeroCard
              title="เงินสดรวมทุกบัญชี"
              value={totalCash}
              tint="emerald"
              icon="💸"
              caption="GSB + KTB + KBANK"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[0.86fr_1.14fr]">
            <DonutIncomeExpenseCard
              incomeExpenseData={incomeExpenseData}
              netValue={Number(incomeExpenseData[0]?.value || 0) - Number(incomeExpenseData[1]?.value || 0)}
            />
            <AiBusinessCard insight={businessInsight} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <BankBalanceCard
              bank="GSB"
              balance={bankCards.GSB.balance}
              income={bankCards.GSB.income}
              expense={bankCards.GSB.expense}
              tint={BANK_THEME.GSB.tint}
              logo={BANK_THEME.GSB.logo}
            />
            <BankBalanceCard
              bank="KTB"
              balance={bankCards.KTB.balance}
              income={bankCards.KTB.income}
              expense={bankCards.KTB.expense}
              tint={BANK_THEME.KTB.tint}
              logo={BANK_THEME.KTB.logo}
            />
            <BankBalanceCard
              bank="KBANK"
              balance={bankCards.KBANK.balance}
              income={bankCards.KBANK.income}
              expense={bankCards.KBANK.expense}
              tint={BANK_THEME.KBANK.tint}
              logo={BANK_THEME.KBANK.logo}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_0.9fr_1.2fr]">
            <Card tint="cream">
              <SectionTitle
                title="สต๊อกคงเหลือ"
                subtitle="ดูจำนวนต้นและมูลค่าทุนคงเหลือ"
              />
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/85 bg-white/80 p-5">
                  <div className="text-xs font-semibold text-slate-500">ไม้คงเหลือ</div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900">
                      {money(kpi.activeCount)}
                    </span>
                    <span className="mb-1 text-sm font-semibold text-slate-400">ต้น</span>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/85 bg-white/80 p-5">
                  <div className="text-xs font-semibold text-slate-500">มูลค่าทุนคงเหลือ</div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900">
                      {money(kpi.activeCostSum)}
                    </span>
                    <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card tint="rose">
              <SectionTitle
                title="ยอดค้างชำระ"
                subtitle="ดูบิล unpaid / partial ของเดือนนี้"
                right={<Pill tone="rose">AR</Pill>}
              />

              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="text-[36px] font-bold leading-none tracking-tight text-slate-900">
                  {money(arData.total)}
                </span>
                <span className="mb-1 text-sm font-semibold text-slate-400">บาท</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Pill tone="rose">unpaid {arData.unpaidCount}</Pill>
                <Pill tone="amber">partial {arData.partialCount}</Pill>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/85 bg-white/76 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>สัดส่วนที่เก็บยอดขายเดือนนี้</span>
                  <span>{Math.round(arData.collectionPct)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-300 transition-all"
                    style={{ width: `${arData.collectionPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 text-sm leading-6 text-slate-600">
                ถ้ายอดค้างยังสูง ควรตามเก็บก่อนขยาย stock รอบใหม่
              </div>
            </Card>

            <LatestInvoicesCard rows={latestInvoices} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}