'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/browser'

const SELLER_EMAIL = 'nisa@acc.com'
const ADMIN_EMAIL = 'time@acc.com'

function roleFromEmail(email) {
  const e = String(email || '').toLowerCase()
  if (e === SELLER_EMAIL) return 'seller'
  if (e === ADMIN_EMAIL) return 'admin'
  return 'unknown'
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const supabase = supabaseBrowser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const guardErr = sp?.get('err')

  async function onLogin(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) return setErr(error.message)

    const { data } = await supabase.auth.getUser()
    const r = roleFromEmail(data?.user?.email)
    if (r === 'seller') return router.replace('/sell')
    if (r === 'admin') return router.replace('/dashboard')

    await supabase.auth.signOut()
    return setErr('บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งาน')
  }

  return (
    <div className="-m-3 min-h-screen bg-[linear-gradient(180deg,#fffdfd_0%,#fff8fb_24%,#f7fbff_58%,#f8fff9_100%)] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-5">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden lg:flex">
            <div className="relative w-full overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,250,255,0.96)_46%,rgba(252,231,243,0.92)_100%)] p-8 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_38%)]" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    NisaPlant System
                  </div>
                  <div className="mt-3 text-[34px] font-semibold leading-tight tracking-tight text-slate-900">
                    Login
                    <br />
                    เข้าสู่ระบบ
                  </div>
                  <div className="mt-4 max-w-md text-sm leading-7 text-slate-600">
                    ระบบจัดการธุรกิจไม้ในธีมเดียวกับทุกหน้า
                    เรียบ สะอาด อ่านง่าย และใช้งานได้ทั้งมือถือกับจอใหญ่
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[26px] border border-white/85 bg-white/78 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                    <div className="text-xs font-semibold text-slate-500">Admin</div>
                    <div className="mt-2 text-base font-semibold tracking-tight text-slate-900">
                      เข้าหน้า Dashboard และจัดการระบบทั้งหมด
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/85 bg-white/78 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                    <div className="text-xs font-semibold text-slate-500">Seller</div>
                    <div className="mt-2 text-base font-semibold tracking-tight text-slate-900">
                      เข้าหน้า Sell เพื่อขายสินค้าได้อย่างรวดเร็ว
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex">
            <form
              onSubmit={onLogin}
              className="relative w-full overflow-hidden rounded-[34px] border border-white/80 bg-white/92 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.68),transparent_38%)]" />
              <div className="relative z-10">
                <div className="mb-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Welcome back
                  </div>
                  <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">
                    Nisa Plant POS
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    เข้าสู่ระบบเพื่อใช้งาน
                  </p>
                </div>

                {(guardErr === 'no_permission' || guardErr === 'not_allowed') && (
                  <div className="mb-4 rounded-[22px] border border-rose-100/90 bg-rose-50/92 px-4 py-3 text-sm font-semibold text-rose-700">
                    {guardErr === 'no_permission'
                      ? 'สิทธิ์ไม่พอ: Seller เข้าได้แค่หน้า Sell และ Dashboard'
                      : 'บัญชีนี้ไม่ได้รับอนุญาต'}
                  </div>
                )}

                {err ? (
                  <div className="mb-4 rounded-[22px] border border-rose-100/90 bg-rose-50/92 px-4 py-3 text-sm font-semibold text-rose-700">
                    {err}
                  </div>
                ) : null}

                <label className="block">
                  <div className="mb-2 text-xs font-semibold tracking-tight text-slate-500">
                    อีเมล
                  </div>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    inputMode="email"
                    autoComplete="email"
                    className="h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                    required
                    placeholder="name@example.com"
                  />
                </label>

                <label className="mt-4 block">
                  <div className="mb-2 text-xs font-semibold tracking-tight text-slate-500">
                    รหัสผ่าน
                  </div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-2xl border border-slate-200/90 bg-white/85 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                    required
                    placeholder="••••••••"
                  />
                </label>

                <button
                  disabled={loading}
                  className={cn(
                    'mt-5 inline-flex h-12 w-full items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-500 px-5 text-[15px] font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] transition hover:bg-emerald-600 active:scale-[0.99]',
                    'disabled:cursor-not-allowed disabled:opacity-60'
                  )}
                >
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    Apple style UI
                  </span>
                  <span className="inline-flex items-center rounded-full border border-sky-200/90 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                    Mobile friendly
                  </span>
                  <span className="inline-flex items-center rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                    Secure login
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}