import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()
    const events = body.events || []

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'image') {

        // 🔥 mock ก่อน
        const amount = 50000

        await supabase.from('purchase_batches').insert({
          supplier_name: 'LINE_AUTO',
          slip_amount: amount,
          note: 'auto from line'
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message })
  }
}