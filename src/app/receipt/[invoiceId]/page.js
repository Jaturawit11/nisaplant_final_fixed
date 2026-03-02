'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import * as htmlToImage from 'html-to-image'

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ''))
}

// ✅ ปรับ 2 รูปนี้ให้ตรง path ในโปรเจกต์นาย
// แนะนำวางไฟล์ไว้ใน public/brand/...
const WATERMARK_SRC = '/brand/nisa-leaf.png'
const PROMPTPAY_QR_SRC = '/brand/promptpay.png'

const PAYMENT_INFO = {
  bank_th: 'ธนาคารออมสิน',
  bank_en: 'Government Savings Bank(GSBATHBK)',
  account_no: '020380596120',
  name_th: 'จตุรวิชญ์ ค้อชากุล',
  name_en: 'Jaturawit Khochakul',
}

function fmtMoney(n, lang) {
  const v = Number(n || 0)
  return lang === 'TH' ? v.toLocaleString('th-TH') : v.toLocaleString('en-US')
}

function fmtDate(d) {
  // inv.sale_date มักเป็น 'YYYY-MM-DD' อยู่แล้ว
  return String(d || '-')
}

export default function ReceiptPage() {
  const supabase = supabaseBrowser()
  const params = useParams()
  const invoiceKey = params?.invoiceId

  const [lang, setLang] = useState('TH')
  const [inv, setInv] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const printRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setErr('')

      if (!invoiceKey) {
        setErr('ไม่พบรหัสใบเสร็จในลิงก์')
        setLoading(false)
        return
      }

      let invoiceRow = null

      // 1) รับ uuid ตรง ๆ
      if (isUuid(invoiceKey)) {
        const { data, error } = await supabase.from('invoices').select('*').eq('id', invoiceKey).single()
        if (error) {
          setErr(error.message)
          setLoading(false)
          return
        }
        invoiceRow = data
      } else {
        // 2) รับเป็น invoice_no เช่น B26020009
        const { data, error } = await supabase.from('invoices').select('*').eq('invoice_no', invoiceKey).limit(1)
        if (error) {
          setErr(error.message)
          setLoading(false)
          return
        }
        invoiceRow = data?.[0]
      }

      if (!invoiceRow) {
        setErr('ไม่พบบิลนี้')
        setLoading(false)
        return
      }

      // ดึงรายการขาย
      const { data: saleItems, error: e2 } = await supabase
        .from('sale_items')
        .select('*')
        .eq('invoice_id', invoiceRow.id)
        .order('created_at', { ascending: true })

      if (e2) {
        setErr(e2.message)
        setLoading(false)
        return
      }

      if (mounted) {
        setInv(invoiceRow)
        setItems(saleItems || [])
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [invoiceKey])

  const totals = useMemo(() => {
    const qty = items.length
    const total = items.reduce((s, x) => s + Number(x.price || 0), 0)
    return { qty, total }
  }, [items])

  const H = useMemo(() => {
    const th = lang === 'TH'
    return {
      title: th ? 'ใบเสร็จรับเงิน' : 'Receipt',
      billNo: th ? 'เลขที่บิล' : 'No.Bill',
      date: th ? 'วันที่' : 'Date',
      customer: th ? 'ลูกค้า' : 'Customer',
      code: th ? 'รหัส' : 'Code',
      list: th ? 'รายการ' : 'List',
      amount: th ? 'จำนวน' : 'Amount',
      price: th ? 'ราคา' : 'Price',
      totalQty: th ? 'รวมจำนวน' : 'Total qty',
      total: th ? 'ยอดรวม' : 'Total',
      paymentTitle: th ? 'ช่องทางชำระ' : 'Payment',
      bank: th ? 'ธนาคาร' : 'Bank',
      acc: th ? 'เลขที่บัญชี' : 'Account',
      name: th ? 'ชื่อ' : 'Name',
      scan: th ? 'สแกน QR เพื่อโอนเงินเข้าบัญชี' : 'Scan QR to transfer',
    }
  }, [lang])

  async function exportImage() {
  if (!printRef.current) return

  // รอให้รูปทั้งหมดโหลดก่อน
  const images = printRef.current.querySelectorAll('img')
  await Promise.all(
    Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => {
        img.onload = resolve
        img.onerror = resolve
      })
    })
  )

  const dataUrl = await htmlToImage.toPng(printRef.current, {
    cacheBust: true,
    pixelRatio: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  })

  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${inv?.invoice_no || 'receipt'}.png`
  a.click()
}
  function printNow() {
    window.print()
  }

  return (
    <AppShell title={H.title}>
      {/* โหลดฟอนต์ Mali */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Mali:wght@300;400;500;600;700&display=swap');
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-wrap {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {loading ? <div>กำลังโหลด...</div> : null}
      {err ? <div style={{ color: '#ffb4b4', whiteSpace: 'pre-wrap' }}>{err}</div> : null}

      {inv ? (
        <div className="print-wrap" style={{ maxWidth: 860, margin: '0 auto', padding: '14px 12px' }}>
          {/* ปุ่ม (ไม่ออกตอนพิมพ์) */}
          <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
            <button onClick={exportImage} style={btnDark}>
              Export
            </button>
            <button onClick={printNow} style={btnDark}>
              Print
            </button>
            <div style={segWrap}>
              <button onClick={() => setLang('TH')} style={lang === 'TH' ? segOn : segOff}>
                TH
              </button>
              <button onClick={() => setLang('EN')} style={lang === 'EN' ? segOn : segOff}>
                EN
              </button>
            </div>
          </div>

          {/* ✅ ใบเสร็จ: เกือบจตุรัส + ไม่ยืดเป็นผืนผ้า */}
          <div
            ref={printRef}
            style={{
              ...paper,
              width: 760, // ✅ บีบลง ไม่ให้กว้างยืด
              aspectRatio: '1 / 1', // ✅ เกือบจตุรัส
              margin: '0 auto',
              fontFamily: "'Mali', sans-serif",
            }}
          >
            {/* Watermark */}
            <img
              src={WATERMARK_SRC}
              crossOrigin="anonymous"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                margin: 'auto',
                width: 420,
                opacity: 0.15,
                transform: 'rotate(-10deg)',
                pointerEvents: 'none',
              }}
            />

            {/* =========================
                ✅ HEADER (สูงขึ้น + ตามฟอร์ม)
                ใบเสร็จรับเงิน (กลาง)
                เลขที่บิล (ซ้าย) | วันที่ (ขวา)
                ลูกค้า (ซ้าย ใต้เลขบิล)
               ========================= */}
            <div style={headerBlock}>
              <div style={headerTitle}>{H.title}</div>

              <div style={headerRow2}>
                <div style={headerLeft}>
                  {H.billNo}: <b>{inv.invoice_no || '-'}</b>
                </div>
                <div style={headerRight}>
                  {H.date}: <b>{fmtDate(inv.sale_date)}</b>
                </div>
              </div>

              <div style={headerRow3}>
                <div style={headerLeft}>
                  {H.customer}: <b>{inv.customer_name || '-'}</b>
                </div>
              </div>
            </div>

            <hr style={hr} />

            {/* TABLE HEADER */}
            <div style={tableHead}>
              <div>{H.code}</div>
              <div>{H.list}</div>
              <div style={{ textAlign: 'center' }}>{H.amount}</div>
              <div style={{ textAlign: 'right' }}>{H.price}</div>
            </div>

            {/* TABLE ROWS */}
            <div style={{ marginTop: 6 }}>
              {items.map((x) => (
                <div key={x.id} style={tableRow}>
                  <div style={{ fontWeight: 700 }}>{x.plant_code}</div>
                  <div style={{ opacity: 0.95 }}>{x.plant_name}</div>
                  <div style={{ textAlign: 'center' }}>1</div>
                  <div style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(x.price, lang)}</div>
                </div>
              ))}
              {!items.length ? <div style={{ marginTop: 10, color: '#666' }}>ไม่มีรายการ</div> : null}
            </div>

            <hr style={{ ...hr, marginTop: 18 }} />

            {/* ✅ SUMMARY: รวมจำนวน + ยอดรวม */}
            <div style={summaryRow}>
              <div style={{ fontWeight: 700 }}>รวม</div>
              <div style={{ textAlign: 'right' }}>
                {H.totalQty}: <b>{totals.qty}</b> &nbsp;&nbsp; {H.total}:{' '}
                <b style={{ fontSize: 18 }}>{fmtMoney(totals.total, lang)}</b>
              </div>
            </div>

            {/* PAYMENT + QR */}
            <div style={bottomGrid}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>{H.paymentTitle}</div>

                <div style={payLine}>
                  <div style={payK}>{H.bank}:</div>
                  <div style={payV}>{lang === 'TH' ? PAYMENT_INFO.bank_th : PAYMENT_INFO.bank_en}</div>
                </div>

                <div style={payLine}>
                  <div style={payK}>{H.acc}:</div>
                  <div style={payV}>{PAYMENT_INFO.account_no}</div>
                </div>

                <div style={payLine}>
                  <div style={payK}>{H.name}:</div>
                  <div style={payV}>{lang === 'TH' ? PAYMENT_INFO.name_th : PAYMENT_INFO.name_en}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <img src={PROMPTPAY_QR_SRC} crossOrigin="anonymous" alt="PromptPay QR" style={{ width: 170 }} />
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>{H.scan}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

/* =========================
   Styles (Locked)
========================= */

const paper = {
  position: 'relative',
  background: '#fff',
  color: '#111',
  borderRadius: 22,
  padding: 34, // ✅ ช่วยให้หัวสูงขึ้นดูแพง
  overflow: 'hidden',
}

const headerBlock = {
  display: 'grid',
  gap: 10,
  paddingTop: 6,
  paddingBottom: 18, // ✅ หัวบิลสูงขึ้น
}

const headerTitle = {
  textAlign: 'center',
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: 0.2,
  lineHeight: 1.15,
}

const headerRow2 = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  alignItems: 'center',
  gap: 12,
  marginTop: 2,
}

const headerRow3 = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  alignItems: 'center',
  marginTop: 2,
}

const headerLeft = {
  fontSize: 14,
  color: '#222',
}

const headerRight = {
  fontSize: 14,
  color: '#222',
  textAlign: 'right',
}

const hr = {
  border: 0,
  borderTop: '1px solid rgba(0,0,0,0.15)',
  margin: '10px 0',
}

const tableHead = {
  display: 'grid',
  gridTemplateColumns: '170px 1fr 90px 120px',
  fontWeight: 800,
  fontSize: 14,
  marginTop: 14,
  paddingBottom: 8,
  borderBottom: '1px solid rgba(0,0,0,0.12)',
}

const tableRow = {
  display: 'grid',
  gridTemplateColumns: '170px 1fr 90px 120px',
  fontSize: 14,
  padding: '10px 0',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  alignItems: 'center',
}

const summaryRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  alignItems: 'center',
  marginTop: 12,
  fontSize: 14,
}

const bottomGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 220px',
  gap: 20,
  alignItems: 'end',
  marginTop: 34,
}

const payLine = {
  display: 'flex',
  gap: 10,
  fontSize: 13,
  marginTop: 6,
}

const payK = { width: 90, opacity: 0.85 }
const payV = { fontWeight: 700 }

const btnDark = {
  height: 42,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}

const segWrap = {
  display: 'inline-flex',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 14,
  overflow: 'hidden',
}

const segOn = {
  height: 42,
  padding: '0 14px',
  border: 'none',
  background: 'rgba(255,255,255,0.18)',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 900,
}

const segOff = {
  height: 42,
  padding: '0 14px',
  border: 'none',
  background: 'transparent',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}