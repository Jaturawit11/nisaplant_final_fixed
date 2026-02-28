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

  // ✅ Guard ฝั่ง client เพิ่มอีกชั้น (กันพลาดกรณี nav โผล่/กดลิงก์ผิด)
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
    <div style={{ minHeight: '100vh', background: '#0b1f18', color: 'white' }}>
      <div style={{ padding: 14, position: 'sticky', top: 0, background: '#0b1f18', borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {userEmail ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ opacity: 0.9 }}>ล็อกอิน:</span>
                  <b>{userEmail}</b>
                  <span
                    className={
                      'status-pill ' +
                      (role === 'admin' ? 'status-success' : role === 'seller' ? 'status-warning' : 'status-danger')
                    }
                    style={{ textTransform: 'uppercase' }}
                  >
                    {role === 'seller' ? 'SELLER' : role === 'admin' ? 'ADMIN' : 'UNKNOWN'}
                  </span>
                </div>
              ) : (
                <>Nisa Plant POS</>
              )}
            </div>
          </div>
          <button onClick={logout} className="btn no-print" style={{ height: 40, padding: '0 14px' }}>
            ออกจากระบบ
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12 }}>
          {nav.map((n) => {
            const active = isActive(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  color: 'white',
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                }}
              >
                {n.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ padding: 14 }}>{children}</div>
    </div>
  )
}