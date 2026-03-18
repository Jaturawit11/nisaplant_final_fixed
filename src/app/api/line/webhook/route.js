import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const OPENAI_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'

const MY_NAMES = [
  'จตุรวิชญ์ ค้อชากุล',
  'JATURAWIT KHOCHAKUL',
  'JATURAWIT KHO',
  'นายจตุรวิชญ์ ค้อชากุล',
  'นาย จตุรวิชญ์ ค้อชากุล',
]

const PARTNER_NAMES = [
  'นิสาชล วรรณทวี',
  'NISACHON WANTAWEE',
  'นางสาว นิสาชล วรรณทวี',
  'นางสาวนิสาชล วรรณทวี',
]

function normalizeText(s = '') {
  return String(s)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function upper(s = '') {
  return normalizeText(s).toUpperCase()
}

function hasAny(text, patterns) {
  const u = upper(text)
  return patterns.some((p) => u.includes(upper(p)))
}

function findBank(text) {
  const u = upper(text)

  if (u.includes('K+')) return 'KBANK'
  if (u.includes('กสิกร') || u.includes('KASIKORN') || u.includes('KBANK')) return 'KBANK'

  if (u.includes('KRUNGTHAI') || u.includes('กรุงไทย')) return 'KTB'

  if (u.includes('KRUNGSRI') || u.includes('กรุงศรี') || u.includes('BANK OF AYUDHYA')) return 'BAY'

  if (u.includes('MYMO') || u.includes('ออมสิน') || u.includes('GOVERNMENT SAVINGS BANK')) return 'GSB'

  if (u.includes('SCB') || u.includes('ไทยพาณิชย์')) return 'SCB'
  if (u.includes('TTB') || u.includes('ทหารไทยธนชาต')) return 'TTB'
  if (u.includes('กรุงเทพ') || u.includes('BANGKOK BANK')) return 'BBL'

  return 'UNKNOWN'
}

function findSourceType(text) {
  const u = upper(text)
  if (
    u.includes('รายการโอนเงินสำเร็จ') ||
    u.includes('โอนเงินสำเร็จ') ||
    u.includes('PAYMENT SUCCESSFUL') ||
    u.includes('TRANSFER SUCCESSFUL')
  ) {
    return 'transaction_screen'
  }
  return 'slip'
}

function extractDate(text) {
  const t = normalizeText(text)

  // 2026-03-17
  let m = t.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/)
  if (m) {
    const y = m[1]
    const mo = String(m[2]).padStart(2, '0')
    const d = String(m[3]).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }

  // 17 มี.ค. 69 / 17 มี.ค. 2569 / 14 ธ.ค. 2568
  const thaiMonths = {
    'ม.ค.': '01',
    'ก.พ.': '02',
    'มี.ค.': '03',
    'เม.ย.': '04',
    'พ.ค.': '05',
    'มิ.ย.': '06',
    'ก.ค.': '07',
    'ส.ค.': '08',
    'ก.ย.': '09',
    'ต.ค.': '10',
    'พ.ย.': '11',
    'ธ.ค.': '12',
  }
  m = t.match(/(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{2,4})/)
  if (m) {
    const d = String(m[1]).padStart(2, '0')
    const mo = thaiMonths[m[2]] || '01'
    let y = String(m[3])
    if (y.length === 2) y = `25${y}`
    return `${y}-${mo}-${d}`
  }

  return null
}

function extractTime(text) {
  const t = normalizeText(text)
  const m = t.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/)
  return m ? m[1] : null
}

function parseMoneyString(s = '') {
  const cleaned = String(s)
    .replace(/,/g, '')
    .replace(/บาท/g, '')
    .replace(/THB/gi, '')
    .replace(/[^\d.]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function extractAmount(text) {
  const lines = normalizeText(text).split('\n').map((x) => x.trim()).filter(Boolean)

  const keywordPatterns = [
    /จำนวนเงิน/i,
    /จำนวน:/i,
    /\bamount\b/i,
    /ยอดเงิน/i,
    /total/i,
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (keywordPatterns.some((re) => re.test(line))) {
      let m = line.match(/[\d,]+\.\d{2}/)
      if (m) return parseMoneyString(m[0])

      if (lines[i + 1]) {
        m = lines[i + 1].match(/[\d,]+\.\d{2}/)
        if (m) return parseMoneyString(m[0])
      }
    }
  }

  // fallback: เอาเลขทศนิยม 2 ตำแหน่งที่มากสุด แต่ตัด 0.00 ออกก่อน
  const all = (text.match(/[\d,]+\.\d{2}/g) || [])
    .map(parseMoneyString)
    .filter((n) => n > 0)

  if (!all.length) return 0
  return Math.max(...all)
}

function extractReferenceNo(text) {
  const lines = normalizeText(text).split('\n')

  const refKeywords = [
    'เลขที่รายการ',
    'รหัสอ้างอิง',
    'หมายเลขอ้างอิง',
    'รหัสลูกค้า',
    'CUSTOMER ID',
    'REFERENCE',
    'REF',
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (hasAny(line, refKeywords)) {
      const sameLine = line.match(/[A-Z0-9]{6,}/i)
      if (sameLine) return sameLine[0]

      const next = lines[i + 1] || ''
      const nextMatch = next.match(/[A-Z0-9-]{6,}/i)
      if (nextMatch) return nextMatch[0]
    }
  }

  return null
}

function extractTopBottomNames(text) {
  const lines = normalizeText(text).split('\n').map((x) => x.trim()).filter(Boolean)

  // พยายามหา pattern จาก/ถึง ก่อน
  let topName = null
  let bottomName = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!topName && (line === 'จาก' || line.toLowerCase() === 'from')) {
      topName = lines[i + 1] || null
    }

    if (!bottomName && (line === 'ถึง' || line === 'ไปยัง' || line.toLowerCase() === 'to')) {
      bottomName = lines[i + 1] || null
    }
  }

  // fallback ใช้ชื่อที่ระบบรู้จัก
  if (!topName) {
    const joined = lines.join('\n')
    if (hasAny(joined, MY_NAMES)) topName = MY_NAMES.find((n) => hasAny(joined, [n])) || topName
    if (!topName && hasAny(joined, PARTNER_NAMES)) {
      topName = PARTNER_NAMES.find((n) => hasAny(joined, [n])) || topName
    }
  }

  return { topName, bottomName }
}

function classifyDirection(text) {
  const u = upper(text)
  if (
    u.includes('จ่ายบิลสำเร็จ') ||
    u.includes('รายการโอนเงินสำเร็จ') ||
    u.includes('โอนเงินสำเร็จ') ||
    u.includes('PAYMENT SUCCESSFUL') ||
    u.includes('TRANSFER SUCCESSFUL')
  ) {
    return 'out'
  }
  return 'unknown'
}

function classifyBusinessType({ senderName, receiverName, rawText }) {
  const sender = senderName || ''
  const receiver = receiverName || ''
  const whole = rawText || ''

  const senderIsMe = hasAny(sender, MY_NAMES) || hasAny(whole, MY_NAMES)
  const senderIsPartner = hasAny(sender, PARTNER_NAMES) || hasAny(whole, PARTNER_NAMES)
  const receiverIsMe = hasAny(receiver, MY_NAMES)
  const receiverIsPartner = hasAny(receiver, PARTNER_NAMES)

  // ระหว่างเราสองคน
  if ((senderIsMe && receiverIsPartner) || (senderIsPartner && receiverIsMe)) {
    return 'internal_transfer'
  }

  // เราหรือคู่เราอยู่ด้านบน แล้วล่างเป็นคนอื่น = รายจ่าย
  if ((senderIsMe || senderIsPartner) && !(receiverIsMe || receiverIsPartner)) {
    return 'expense'
  }

  // เราหรือคู่เราอยู่ด้านล่าง = รายรับ
  if (receiverIsMe || receiverIsPartner) {
    return 'income'
  }

  return 'review'
}

function makeFingerprint({
  txnDate,
  txnTime,
  amount,
  bank,
  direction,
  referenceNo,
  senderName,
  receiverName,
}) {
  return [
    txnDate || '',
    txnTime || '',
    Number(amount || 0).toFixed(2),
    bank || '',
    direction || '',
    referenceNo || '',
    upper(senderName || ''),
    upper(receiverName || ''),
  ].join('|')
}

async function ocrWithOpenAI(base64) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `
อ่านข้อความทั้งหมดจากภาพสลิปหรือหน้ารายการธุรกรรมนี้ให้ครบ
ตอบเป็น plain text เท่านั้น
ห้ามตอบเป็น JSON
ห้ามสรุป
ห้ามอธิบายเพิ่ม
ถ้ามีหลายบรรทัดให้คงโครงสร้างบรรทัดไว้
              `.trim(),
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
              },
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI failed: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(req) {console.log('🔥 NEW WEBHOOK VERSION WORKING')
  try {
    const body = await req.json()
    const events = body.events || []

    for (const event of events) {
      if (event.type !== 'message' || event.message?.type !== 'image') continue

      const messageId = event.message.id

      const imgRes = await fetch(
        `https://api-data.line.me/v2/bot/message/${messageId}/content`,
        {
          headers: {
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
        }
      )

      if (!imgRes.ok) {
        throw new Error(`LINE image fetch failed: ${imgRes.status}`)
      }

      const arrayBuffer = await imgRes.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      const rawText = normalizeText(await ocrWithOpenAI(base64))
      console.log('OCR_TEXT:', rawText)

      const bank = findBank(rawText)
      const sourceType = findSourceType(rawText)
      const txnDate = extractDate(rawText)
      const txnTime = extractTime(rawText)
      const amount = extractAmount(rawText)
      const referenceNo = extractReferenceNo(rawText)
      const direction = classifyDirection(rawText)

      const { topName, bottomName } = extractTopBottomNames(rawText)
      const businessType = classifyBusinessType({
        senderName: topName,
        receiverName: bottomName,
        rawText,
      })

      const fingerprint = makeFingerprint({
        txnDate,
        txnTime,
        amount,
        bank,
        direction,
        referenceNo,
        senderName: topName,
        receiverName: bottomName,
      })

      const { data: existing } = await supabase
        .from('incoming_transactions')
        .select('id, status')
        .eq('fingerprint', fingerprint)
        .maybeSingle()

      if (existing) {
        console.log('DUPLICATE_SKIP:', fingerprint)
        continue
      }

      const insertPayload = {
        source_type: sourceType,
        txn_date: txnDate,
        txn_time: txnTime,
        amount,
        direction: direction === 'unknown' ? null : direction,
        bank: bank === 'UNKNOWN' ? null : bank,
        reference_no: referenceNo,
        sender_name: topName,
        receiver_name: bottomName,
        raw_text: rawText,
        fingerprint,
        status: amount > 0 ? 'new' : 'review',
        image_url: null,
        note:
          businessType === 'income'
            ? 'income'
            : businessType === 'expense'
            ? 'expense'
            : businessType === 'internal_transfer'
            ? 'internal_transfer'
            : 'review',
      }

      const { error } = await supabase.from('incoming_transactions').insert(insertPayload)
      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('WEBHOOK_ERROR:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}