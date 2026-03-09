'use client'

import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

function Tab({ href, label }) {
  const path = usePathname()
  const active = path === href

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition',
        active
          ? 'border-emerald-200/90 bg-emerald-50 text-emerald-700 shadow-[0_6px_16px_rgba(16,185,129,0.12)]'
          : 'border-slate-200/90 bg-white/85 text-slate-600 hover:bg-slate-50'
      )}
    >
      {label}
    </Link>
  )
}

function QuickCard({ href, title, desc, tone = 'default', icon = '◦' }) {
  const toneMap = {
    default: 'border-white/85 bg-white/82',
    rose: 'border-rose-100/90 bg-white/75',
    sky: 'border-sky-100/90 bg-white/75',
    emerald: 'border-emerald-100/90 bg-white/75',
    cream: 'border-amber-100/90 bg-white/75',
    lilac: 'border-violet-100/90 bg-white/75',
  }

  return (
    <Link
      href={href}
      className={cn(
        'group relative block overflow-hidden rounded-[28px] border p-5 shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-[1px] hover:bg-slate-50',
        toneMap[tone] || toneMap.default
      )}
    >
      <div className="pointer-events-none absolute right-4 top-3 text-[42px] font-light text-slate-300/35 transition group-hover:text-slate-300/50">
        {icon}
      </div>

      <div className="relative z-10">
        <div className="text-base font-semibold tracking-tight text-slate-900">{title}</div>
        <div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div>
        <div className="mt-4 inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          เปิดหน้า →
        </div>
      </div>
    </Link>
  )
}

export default function FinancePage() {
  return (
    <AppShell title="การเงิน">
      <div className="-m-3 min-h-full rounded-[34px] bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4">
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                NisaPlant Finance
              </div>
              <div className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[29px]">
                การเงิน
              </div>
              <div className="mt-1 text-sm leading-relaxed text-slate-500">
                รวมเมนูการเงินไว้ให้เข้าใช้งานง่ายขึ้นในธีมเดียวกับทั้งระบบ
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="sky">Bank</Pill>
              <Pill tone="amber">AR</Pill>
              <Pill tone="emerald">Salary</Pill>
            </div>
          </div>

          <ShellCard
            title="แท็บการเงิน"
            subtitle="ยุบเมนูให้ใช้ง่ายขึ้น และคงหน้าเดิมที่ใช้งานอยู่"
            tint="default"
          >
            <div className="flex flex-wrap gap-2">
              <Tab href="/bank" label="ภาพรวมธนาคาร" />
              <Tab href="/ar" label="ลูกหนี้ (AR)" />
              <Tab href="/salary" label="เงินเดือน" />
            </div>

            <div className="mt-3 rounded-[20px] border border-white/85 bg-white/70 px-4 py-3 text-xs leading-6 text-slate-500">
              หน้านี้เป็นศูนย์รวมทางลัดไปยังระบบการเงินที่ใช้งานจริง โดยยังคงเส้นทางเดิมของแต่ละหน้าไว้
            </div>
          </ShellCard>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <QuickCard
              href="/bank"
              title="ภาพรวมธนาคาร"
              desc="ดูยอดรวมและภาพรวมเงินเข้าออกแยกตาม GSB / KTB / KBANK"
              tone="rose"
              icon="◔"
            />

            <QuickCard
              href="/ar"
              title="ลูกหนี้ (AR)"
              desc="ดูบิลที่ยังไม่จ่าย แบ่งจ่าย และติดตามสถานะเงินที่ยังไม่เข้า"
              tone="sky"
              icon="◎"
            />

            <QuickCard
              href="/salary"
              title="เงินเดือน"
              desc="คำนวณเงินเดือนตามกติกาของระบบ และดูภาพรวมการจัดสรรเงิน"
              tone="emerald"
              icon="✦"
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}