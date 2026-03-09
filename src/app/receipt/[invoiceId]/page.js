'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import * as htmlToImage from 'html-to-image'

function isUuid(v) {
  return /^[0-9a-f-]{36}$/i.test(String(v || ''))
}

const WATERMARK_SRC = '/brand/nisa-leaf.png'
const PROMPTPAY_QR_SRC = '/brand/promptpay.png'

const PAYMENT_INFO = {
  bank_th: 'ธนาคารออมสิน',
  bank_en: 'Government Savings Bank',
  account_no: '020380596120',
  name_th: 'จตุรวิชญ์ ค้อชากุล',
  name_en: 'Jaturawit Khochakul',
}

function money(n, lang) {
  const v = Number(n || 0)
  return lang === 'TH' ? v.toLocaleString('th-TH') : v.toLocaleString('en-US')
}

export default function ReceiptPage() {

  const supabase = supabaseBrowser()
  const params = useParams()
  const invoiceKey = params?.invoiceId

  const [lang,setLang]=useState('TH')
  const [inv,setInv]=useState(null)
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)

  const printRef=useRef(null)

  useEffect(()=>{

    async function load(){

      if(!invoiceKey)return

      let invoiceRow=null

      if(isUuid(invoiceKey)){

        const {data}=await supabase
        .from('invoices')
        .select('*')
        .eq('id',invoiceKey)
        .single()

        invoiceRow=data

      }else{

        const {data}=await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_no',invoiceKey)
        .limit(1)

        invoiceRow=data?.[0]

      }

      if(!invoiceRow){
        setLoading(false)
        return
      }

      const {data:saleItems}=await supabase
      .from('sale_items')
      .select('*')
      .eq('invoice_id',invoiceRow.id)

      setInv(invoiceRow)
      setItems(saleItems||[])
      setLoading(false)

    }

    load()

  },[invoiceKey])

  const totals=useMemo(()=>{

    const qty=items.length
    const total=items.reduce((s,x)=>s+Number(x.price||0),0)

    return {qty,total}

  },[items])

  async function exportImage(){

    if(busy)return
    setBusy(true)

    const node=printRef.current

    const dataUrl=await htmlToImage.toPng(node,{
      pixelRatio:2,
      backgroundColor:'#ffffff'
    })

    const a=document.createElement('a')
    a.href=dataUrl
    a.download=`${inv?.invoice_no||'receipt'}.png`
    a.click()

    setBusy(false)

  }

  const printNow=()=>window.print()

  if(loading)return <AppShell title="Receipt">กำลังโหลด...</AppShell>

  return (

<AppShell title="Receipt">

<div className="max-w-4xl mx-auto space-y-3">

{/* action bar */}

<div className="flex flex-wrap gap-2 justify-center">

<button onClick={exportImage} className="btn-primary">
Export
</button>

<button onClick={printNow} className="btn-ghost">
Print
</button>

<div className="flex rounded-full border overflow-hidden">

<button
onClick={()=>setLang('TH')}
className={lang==='TH'?'btn-seg-active':'btn-seg'}
>
TH
</button>

<button
onClick={()=>setLang('EN')}
className={lang==='EN'?'btn-seg-active':'btn-seg'}
>
EN
</button>

</div>

</div>

{/* receipt */}

<div
ref={printRef}
className="bg-white rounded-[28px] p-8 shadow-sm relative"
>

<img
src={WATERMARK_SRC}
className="absolute opacity-10 w-[380px] inset-0 m-auto pointer-events-none"
/>

<div className="text-center text-3xl font-bold mb-4">
{lang==='TH'?'ใบเสร็จรับเงิน':'Receipt'}
</div>

<div className="flex justify-between text-sm mb-3">
<div>Bill: <b>{inv.invoice_no}</b></div>
<div>Date: <b>{inv.sale_date}</b></div>
</div>

<div className="text-sm mb-4">
Customer: <b>{inv.customer_name||'-'}</b>
</div>

<div className="grid grid-cols-[150px_1fr_80px_120px] gap-2 border-b pb-2 text-sm font-semibold">

<div>Code</div>
<div>Item</div>
<div className="text-center">Qty</div>
<div className="text-right">Price</div>

</div>

{items.map(x=>(
<div
key={x.id}
className="grid grid-cols-[150px_1fr_80px_120px] gap-2 py-2 border-b text-sm"
>

<div className="font-semibold">{x.plant_code}</div>
<div>{x.plant_name}</div>
<div className="text-center">1</div>
<div className="text-right">{money(x.price,lang)}</div>

</div>
))}

<div className="flex justify-between mt-4 font-semibold">

<div>Total qty: {totals.qty}</div>

<div>
Total:
<span className="text-lg ml-2">
{money(totals.total,lang)}
</span>
</div>

</div>

<div className="grid md:grid-cols-2 gap-6 mt-6">

<div>

<div className="font-semibold mb-2">
{lang==='TH'?'ช่องทางชำระ':'Payment'}
</div>

<div className="text-sm">
Bank: {PAYMENT_INFO.bank_th}
</div>

<div className="text-sm">
Account: {PAYMENT_INFO.account_no}
</div>

<div className="text-sm">
Name: {PAYMENT_INFO.name_th}
</div>

</div>

<div className="text-center">

<img
src={PROMPTPAY_QR_SRC}
className="w-[160px] mx-auto"
/>

<div className="text-xs mt-2 opacity-70">
{lang==='TH'
?'สแกน QR เพื่อโอนเงิน'
:'Scan QR to transfer'}
</div>

</div>

</div>

</div>

</div>

</AppShell>

)

}