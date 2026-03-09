'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import * as htmlToImage from 'html-to-image'

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || '')
  )
}

const WATERMARK_SRC = '/brand/nisa-leaf.png'
const PROMPTPAY_QR_SRC = '/brand/promptpay.png'

const PAYMENT_INFO = {
  bank_th: 'ธนาคารออมสิน',
  bank_en: 'Government Savings Bank (GSBATHBK)',
  account_no: '020380596120',
  name_th: 'จตุรวิชญ์ ค้อชากุล',
  name_en: 'Jaturawit Khochakul',
}

function fmtMoney(n, lang) {
  const v = Number(n || 0)
  return lang === 'TH' ? v.toLocaleString('th-TH') : v.toLocaleString('en-US')
}

function fmtDate(d) {
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
  const [busy, setBusy] = useState(false)

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

      if (isUuid(invoiceKey)) {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceKey)
          .single()

        if (error) {
          setErr(error.message)
          setLoading(false)
          return
        }
        invoiceRow = data
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('invoice_no', invoiceKey)
          .limit(1)

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
  }, [invoiceKey, supabase])

  const totals = useMemo(() => {
    const qty = items.length
    const total = items.reduce((s, x) => s + Number(x.price || 0), 0)
    return { qty, total }
  }, [items])

  const H = useMemo(() => {
    const th = lang === 'TH'
    return {
      title: th ? 'ใบเสร็จรับเงิน' : 'Receipt',
      billNo: th ? 'เลขที่บิล' : 'Bill No.',
      date: th ? 'วันที่' : 'Date',
      customer: th ? 'ลูกค้า' : 'Customer',
      code: th ? 'รหัส' : 'Code',
      list: th ? 'รายการ' : 'List',
      amount: th ? 'จำนวน' : 'Qty',
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

  async function waitForFontsAndImages(node) {
    try {
      if (document?.fonts?.ready) await document.fonts.ready
    } catch {}

    const images = node.querySelectorAll('img')
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve()
        return new Promise((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
      })
    )
  }

  async function inlineImagesTemporarily(node) {
    const images = node.querySelectorAll('img')
    const restore = []

    async function imgToDataUrl(absUrl) {
      try {
        const res = await fetch(absUrl, { cache: 'no-store' })
        const blob = await res.blob()
        return await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(blob)
        })
      } catch {
        return null
      }
    }

    for (const img of Array.from(images)) {
      const src = img.currentSrc || img.getAttribute('src') || ''
      if (!src || src.startsWith('data:')) continue

      restore.push([img, img.getAttribute('src') || ''])

      let abs = ''
      try {
        abs = new URL(src, window.location.href).toString()
      } catch {
        abs = src.startsWith('http')
          ? src
          : `${window.location.origin}${src.startsWith('/') ? '' : '/'}${src}`
      }

      const dataUrl = await imgToDataUrl(abs)
      if (dataUrl) img.setAttribute('src', dataUrl)
    }

    return () => {
      for (const [img, src] of restore) {
        if (src) img.setAttribute('src', src)
      }
    }
  }

  async function buildPngDataUrl() {
    if (!printRef.current) throw new Error('ไม่พบพื้นที่ใบเสร็จ')

    const node = printRef.current
    await waitForFontsAndImages(node)
    const restore = await inlineImagesTemporarily(node)

    try {
      const rect = node.getBoundingClientRect()

      const dataUrl = await htmlToImage.toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        canvasWidth: Math.round(rect.width * 2),
        canvasHeight: Math.round(rect.height * 2),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${Math.round(rect.width)}px`,
          height: `${Math.round(rect.height)}px`,
        },
      })

      return dataUrl
    } finally {
      restore()
    }
  }

  async function exportImage() {
    if (busy) return
    setBusy(true)
    try {
      const dataUrl = await buildPngDataUrl()
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${inv?.invoice_no || 'receipt'}.png`
      a.click()
    } catch (e) {
      console.error(e)
      alert('Export ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function shareImage() {
    if (busy) return
    setBusy(true)
    try {
      const dataUrl = await buildPngDataUrl()
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `${inv?.invoice_no || 'receipt'}.png`, {
        type: 'image/png',
      })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: inv?.invoice_no || 'Receipt',
          text: inv?.invoice_no || 'Receipt',
        })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${inv?.invoice_no || 'receipt'}.png`
        a.click()
        alert('อุปกรณ์นี้ไม่รองรับ Share โดยตรง จึงดาวน์โหลดรูปให้แทน')
      }
    } catch (e) {
      console.error(e)
      alert('แชร์ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const printNow = () => {
    window.print()
  }

  return (
    <AppShell title={H.title}>
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
          .receipt-paper {
            width: 100% !important;
            max-width: 860px !important;
            border-radius: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
          }
        }

        .receipt-paper {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          font-family: 'Mali', sans-serif;
          box-sizing: border-box;
        }

        @media (max-width: 520px) {
          .receipt-paper {
            padding: 18px !important;
            border-radius: 18px !important;
          }
          .receipt-title {
            font-size: 26px !important;
          }
          .receipt-table-head,
          .receipt-table-row {
            grid-template-columns: 110px 1fr 50px 80px !important;
            font-size: 12px !important;
            gap: 8px !important;
          }
          .receipt-bottom-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .receipt-qr img {
            width: 150px !important;
          }
          .receipt-summary {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .receipt-watermark {
            width: 260px !important;
          }
        }
      `}</style>

      {loading ? <div>กำลังโหลด...</div> : null}
      {err ? <div style={{ color: '#ffb4b4', whiteSpace: 'pre-wrap' }}>{err}</div> : null}

      {inv ? (
        <div className="print-wrap" style={{ maxWidth: 860, margin: '0 auto', padding: '14px 12px' }}>
          <div
            className="no-print"
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <button onClick={exportImage} disabled={busy} style={btnDark}>
              {busy ? 'กำลังทำ...' : 'Export'}
            </button>

            <button onClick={shareImage} disabled={busy} style={btnDark}>
              {busy ? 'กำลังทำ...' : 'Share'}
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

          <div
            ref={printRef}
            className="receipt-paper"
            style={{
              ...paper,
            }}
          >
            <img
              className="receipt-watermark"
              src={WATERMARK_SRC}
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

            <div style={headerBlock}>
              <div className="receipt-title" style={headerTitle}>
                {H.title}
              </div>

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

            <div className="receipt-table-head" style={tableHead}>
              <div>{H.code}</div>
              <div>{H.list}</div>
              <div style={{ textAlign: 'center' }}>{H.amount}</div>
              <div style={{ textAlign: 'right' }}>{H.price}</div>
            </div>

            <div style={{ marginTop: 6 }}>
              {items.map((x) => (
                <div key={x.id} className="receipt-table-row" style={tableRow}>
                  <div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{x.plant_code}</div>
                  <div style={{ opacity: 0.95, wordBreak: 'break-word' }}>{x.plant_name}</div>
                  <div style={{ textAlign: 'center' }}>1</div>
                  <div style={{ textAlign: 'right', fontWeight: 700 }}>
                    {fmtMoney(x.price, lang)}
                  </div>
                </div>
              ))}
              {!items.length ? <div style={{ marginTop: 10, color: '#666' }}>ไม่มีรายการ</div> : null}
            </div>

            <hr style={{ ...hr, marginTop: 18 }} />

            <div className="receipt-summary" style={summaryRow}>
              <div style={{ fontWeight: 700 }}>รวม</div>
              <div style={{ textAlign: 'right' }}>
                {H.totalQty}: <b>{totals.qty}</b> &nbsp;&nbsp; {H.total}:{' '}
                <b style={{ fontSize: 18 }}>{fmtMoney(totals.total, lang)}</b>
              </div>
            </div>

            <div className="receipt-bottom-grid" style={bottomGrid}>
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

              <div className="receipt-qr" style={{ textAlign: 'center' }}>
                <img src={PROMPTPAY_QR_SRC} alt="PromptPay QR" style={{ width: 170 }} />
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>{H.scan}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

const paper = {
  position: 'relative',
  background: '#fff',
  color: '#111',
  borderRadius: 22,
  padding: 34,
  overflow: 'hidden',
}

const headerBlock = {
  display: 'grid',
  gap: 10,
  paddingTop: 6,
  paddingBottom: 18,
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
  gap: 10,
  fontWeight: 800,
  fontSize: 14,
  marginTop: 14,
  paddingBottom: 8,
  borderBottom: '1px solid rgba(0,0,0,0.12)',
}

const tableRow = {
  display: 'grid',
  gridTemplateColumns: '170px 1fr 90px 120px',
  gap: 10,
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
  opacity: 1,
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