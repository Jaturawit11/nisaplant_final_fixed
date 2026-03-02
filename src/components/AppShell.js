'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

const SELLER_EMAIL = 'nisa@acc.com'
const ADMIN_EMAIL = 'time@acc.com'

function getRoleFromEmail(email) {
  const e = String(email || '').toLowerCase()
  if (e === SELLER_EMAIL) return 'seller'
  if (e === ADMIN_EMAIL) return 'admin'
  return 'unknown'
}

function RolePill({ role }) {
  const label = role === 'seller' ? 'SELLER' : role === 'admin' ? 'ADMIN' : 'UNKNOWN'
  const cls =
    role === 'admin'
      ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
      : role === 'seller'
        ? 'bg-amber-100 text-amber-800 ring-amber-200'
        : 'bg-rose-100 text-rose-800 ring-rose-200'

  return (
    <span
      className={
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ring-1 ' +
        cls
      }
      style={{ textTransform: 'uppercase' }}
    >
      {label}
    </span>
  )
}

export default function AppShell({ children, title }) {
  const path = usePathname()
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [userEmail, setUserEmail] = useState('')
  const role = useMemo(() => getRoleFromEmail(userEmail), [userEmail])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // โหลด user (เพื่อแสดงว่าใครล็อกอินอยู่)
  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUserEmail(data?.user?.email || '')
    }
    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || '')
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Guard ฝั่ง client เพิ่มอีกชั้น (Seller เข้าได้แค่ dashboard/sell/receipt)
  useEffect(() => {
    if (role !== 'seller') return
    const ok = path === '/dashboard' || path === '/sell' || path?.startsWith('/receipt')
    if (!ok) router.replace('/dashboard')
  }, [role, path, router])

  const navAll = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/sell', label: 'ขาย' },
    { href: '/plants', label: 'ฐานต้นไม้' },
    { href: '/edit-invoice', label: 'แก้บิล' },
    { href: '/expenses', label: 'ค่าใช้จ่าย' },
    { href: '/summary', label: 'สรุป' },
  ]

  const nav = useMemo(() => {
    if (role === 'seller') return navAll.filter((n) => n.href === '/dashboard' || n.href === '/sell')
    return navAll
  }, [role])

  function isActive(href) {
    if (href === '/dashboard') return path === '/dashboard'
    if (path === href) return true
    return path?.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight">{title || 'Nisa Plant POS'}</div>

              <div className="mt-1 text-xs text-slate-500">
                {userEmail ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>ล็อกอิน:</span>
                    <b className="text-slate-900">{userEmail}</b>
                    <RolePill role={role} />
                  </div>
                ) : (
                  <span>Nisa Plant POS</span>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              ออกจากระบบ
            </button>
          </div>

          {/* Nav pills */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {nav.map((n) => {
              const active = isActive(n.href)
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ' +
                    (active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                  }
                >
                  {n.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  )
}