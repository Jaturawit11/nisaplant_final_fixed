import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ✅ Route guard (ไม่แตะ logic คำนวณ/DB)
// - ต้องล็อกอินก่อนถึงเข้าได้
// - แยกสิทธิ์ 2 คน: Seller vs Admin
const SELLER_EMAIL = 'nisa@acc.com'
const ADMIN_EMAIL = 'time@acc.com'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/sell',
  '/summary',
  '/expenses',
  '/edit-invoice',
  '/receipt',
  '/plants',
  '/ar',
  '/bank',
  '/closing',
  '/salary',
]

const SELLER_ALLOWED_PREFIXES = ['/dashboard', '/sell', '/receipt']

export async function middleware(req) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isLogin = pathname === '/login' || pathname.startsWith('/login/')

  let res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()
  const isAuthed = !!data?.user
  const email = String(data?.user?.email || '').toLowerCase()
  const isSeller = email === SELLER_EMAIL
  const isAdmin = email === ADMIN_EMAIL

  if (!isAuthed && isProtected) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ✅ ล็อกอินแล้ว แต่ไม่ใช่ 2 อีเมลที่อนุญาต
  if (isAuthed && !isSeller && !isAdmin && isProtected) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('err', 'not_allowed')
    return NextResponse.redirect(url)
  }

  // ✅ Seller เข้าได้แค่ Sell + Dashboard + Receipt
  if (isAuthed && isSeller && isProtected) {
    const ok = SELLER_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!ok) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('err', 'no_permission')
      return NextResponse.redirect(url)
    }
  }

  if (isAuthed && isLogin) {
    const url = req.nextUrl.clone()
    // ✅ ให้เข้าหน้าตาม role
    url.pathname = isSeller ? '/sell' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}