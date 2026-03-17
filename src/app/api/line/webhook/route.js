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

        const messageId = event.message.id

        // 🔥 ดึงรูปจาก LINE
        const imgRes = await fetch(
          `https://api-data.line.me/v2/bot/message/${messageId}/content`,
          {
            headers: {
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
            }
          }
        )

        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')

        // 🔥 ส่งไปให้ AI อ่านสลิป
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'อ่านจำนวนเงินจากสลิปนี้ ตอบเป็นตัวเลขเท่านั้น' },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64}`
                    }
                  }
                ]
              }
            ]
          })
        })

        const aiData = await aiRes.json()

        const text = aiData.choices?.[0]?.message?.content || '0'
        const amount = parseFloat(text.replace(/[^0-9.]/g, '')) || 0

        // 🔥 บันทึก DB
        await supabase.from('purchase_batches').insert({
          supplier_name: 'LINE_AUTO',
          slip_amount: amount,
          note: 'AI OCR'
        })
      }
    }

    return NextResponse.json({ ok: true })

  } catch (e) {
    return NextResponse.json({ error: e.message })
  }
}