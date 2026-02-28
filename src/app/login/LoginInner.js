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

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const supabase = supabaseBrowser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // แจ้งเตือนจาก middleware (เช่น สิทธิ์ไม่พอ)
  const guardErr = sp?.get('err')

  async function onLogin(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) return setErr(error.message)

    // ✅ login สำเร็จ -> route ตาม role
    const { data } = await supabase.auth.getUser()
    const r = roleFromEmail(data?.user?.email)
    if (r === 'seller') return router.replace('/sell')
    if (r === 'admin') return router.replace('/dashboard')

    // ถ้าไม่ใช่ 2 คนนี้ ให้ sign out แล้วแจ้ง
    await supabase.auth.signOut()
    return setErr('บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งาน')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form onSubmit={onLogin} style={{ width: '100%', maxWidth: 420, border: '1px solid #ddd', borderRadius: 16, padding: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Nisa Plant POS</h1>
        <p style={{ marginTop: 6, color: '#666' }}>เข้าสู่ระบบเพื่อใช้งาน</p>

        {guardErr === 'no_permission' ? (
          <div style={{ marginTop: 10, color: 'crimson', fontSize: 14 }}>สิทธิ์ไม่พอ: Seller เข้าได้แค่หน้า Sell และ Dashboard</div>
        ) : null}
        {guardErr === 'not_allowed' ? <div style={{ marginTop: 10, color: 'crimson', fontSize: 14 }}>บัญชีนี้ไม่ได้รับอนุญาต</div> : null}

        <label style={{ display: 'block', marginTop: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>อีเมล</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1px solid #ccc' }}
            required
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>รหัสผ่าน</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1px solid #ccc' }}
            required
          />
        </label>

        {err ? <div style={{ marginTop: 10, color: 'crimson', fontSize: 14 }}>{err}</div> : null}

        <button
          disabled={loading}
          style={{
            marginTop: 14,
            width: '100%',
            height: 46,
            borderRadius: 14,
            border: 'none',
            background: '#0f3d2e',
            color: 'white',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}