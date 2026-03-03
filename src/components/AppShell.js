'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { Button, Pill, cx } from '@/components/ui/ui'

const SELLER_EMAIL = 'nisa@acc.com'
const ADMIN_EMAIL = 'time@acc.com'

function getRoleFromEmail(email) {
  const e = String(email || '').toLowerCase()
  if (e === SELLER_EMAIL) return 'seller'
  if (e === ADMIN_EMAIL) return 'admin'
  return 'unknown'
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

  // client guard
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
    { href: '/bank', label: 'บัญชี' },
    { href: '/salary', label: 'เงินเดือน' },
    { href: '/closing', label: 'ปิดเดือน' },
    { href: '/ar', label: 'ลูกหนี้' },
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

  const rolePill =
    role === 'admin' ? (
      <Pill tone="green">ADMIN</Pill>
    ) : role === 'seller' ? (
      <Pill tone="yellow">SELLER</Pill>
    ) : (
      <Pill tone="red">UNKNOWN</Pill>
    )

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20 border-b border-black/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-3 md:px-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-900 md:text-lg">{title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {userEmail ? (
                <>
                  <span className="truncate">ล็อกอิน: <b className="text-slate-900">{userEmail}</b></span>
                  {rolePill}
                </>
              ) : (
                <span>Nisa Plant POS</span>
              )}
            </div>
          </div>
          <Button variant="ghost" className="no-print" onClick={logout}>
            ออกจากระบบ
          </Button>
        </div>

        <div className="mx-auto w-full max-w-6xl px-3 pb-3 md:px-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {nav.map((n) => {
              const active = isActive(n.href)
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cx(
                    'whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm',
                    active
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-black/10 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {n.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-4 md:px-4">{children}</div>
    </div>
  )
}
