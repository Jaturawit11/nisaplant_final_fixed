'use client'

import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Tab({ href, label }) {
  const path = usePathname()
  const active = path === href
  return (
    <Link
      href={href}
      className={
        (active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-black/10 bg-white text-slate-700 hover:bg-slate-50') +
        ' rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm'
      }
    >
      {label}
    </Link>
  )
}

function CardLink({ href, title, desc }) {
  return (
    <Link
      href={href}
      className="block rounded-3xl border border-black/10 bg-white p-4 shadow-sm hover:bg-slate-50"
    >
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
      <div className="mt-3 text-xs font-semibold text-emerald-700">เปิดหน้า →</div>
    </Link>
  )
}

export default function FinancePage() {
  return (
    <AppShell title="การเงิน">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm md:p-5">
          <div className="text-sm font-semibold text-slate-900">แท็บการเงิน</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Tab href="/bank" label="ภาพรวมธนาคาร" />
            <Tab href="/ar" label="ลูกหนี้ (AR)" />
            <Tab href="/salary" label="เงินเดือน" />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            หมายเหตุ: ยุบเมนูให้ใช้ง่ายขึ้น และคงหน้าเดิมที่ใช้งานอยู่
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <CardLink
            href="/bank"
            title="ภาพรวมธนาคาร"
            desc="ดูยอดรวม/กราฟแยกธนาคาร (GSB/KTB/KBANK) และภาพรวมเงินเข้าออก"
          />
          <CardLink
            href="/ar"
            title="ลูกหนี้ (AR)"
            desc="ดูบิลที่ยังไม่จ่าย / แบ่งจ่าย / ติดตามสถานะเงินเข้า"
          />
          <CardLink
            href="/salary"
            title="เงินเดือน"
            desc="คำนวณเงินเดือนตามกติกาของระบบ"
          />
        </div>
      </div>
    </AppShell>
  )
}