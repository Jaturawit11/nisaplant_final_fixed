'use client'

import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'

const money = (n) => Number(n || 0).toLocaleString('th-TH')

function pad2(n){ return String(n).padStart(2,'0') }
function monthKey(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}` }

function startOfMonth(m){
  const [y,mm]=m.split('-').map(Number)
  return new Date(y,mm-1,1)
}

function endOfMonthExclusive(m){
  const [y,mm]=m.split('-').map(Number)
  return new Date(y,mm,1)
}

function toISODate(d){
  return d.toISOString().slice(0,10)
}

function addDays(d,n){
  const x=new Date(d)
  x.setDate(x.getDate()+n)
  return x
}

function startOfDay(d=new Date()){
  const x=new Date(d)
  x.setHours(0,0,0,0)
  return x
}

function pickRow(d){
  const r=Array.isArray(d)?d[0]:d
  return r||null
}

export default function SummaryPage(){

  const supabase=supabaseBrowser()

  const [month,setMonth]=useState(()=>monthKey(new Date()))
  const [loading,setLoading]=useState(false)
  const [err,setErr]=useState('')

  const [sumMonth,setSumMonth]=useState(null)
  const [sumToday,setSumToday]=useState(null)

  const [series30,setSeries30]=useState([])
  const [series30Note,setSeries30Note]=useState('')

  const [top10,setTop10]=useState([])
  const [top10Note,setTop10Note]=useState('')

  const rangeMonth=useMemo(()=>{
    const s=startOfMonth(month)
    const e=endOfMonthExclusive(month)
    return {start:toISODate(s),end:toISODate(e)}
  },[month])

  const rangeToday=useMemo(()=>{
    const s=startOfDay(new Date())
    const e=startOfDay(addDays(s,1))
    return {start:toISODate(s),end:toISODate(e)}
  },[])

  const range30=useMemo(()=>{
    const end=startOfDay(addDays(new Date(),1))
    const start=startOfDay(addDays(end,-30))
    return {start:toISODate(start),end:toISODate(end)}
  },[])

  async function rpcSafe(name,args){
    const {data,error}=await supabase.rpc(name,args)
    if(error)throw error
    return data
  }

  async function loadAll(){

    setErr('')
    setLoading(true)

    try{

      const dataMonth=await rpcSafe('get_month_summary',{
        p_start:rangeMonth.start,
        p_end:rangeMonth.end
      })
      setSumMonth(pickRow(dataMonth))

      const dataToday=await rpcSafe('get_month_summary',{
        p_start:rangeToday.start,
        p_end:rangeToday.end
      })
      setSumToday(pickRow(dataToday))

      try{
        const s=await rpcSafe('get_daily_profit_series',{
          p_start:range30.start,
          p_end:range30.end
        })
        setSeries30(Array.isArray(s)?s:[])
      }catch(e){
        setSeries30([])
        setSeries30Note('ยังไม่ได้เปิดใช้กราฟ 30 วัน')
      }

      try{
        const t=await rpcSafe('get_top_profit_items',{
          p_start:rangeMonth.start,
          p_end:rangeMonth.end,
          p_limit:10
        })
        setTop10(Array.isArray(t)?t:[])
      }catch(e){
        setTop10([])
        setTop10Note('ยังไม่ได้เปิดใช้ Top 10')
      }

    }catch(e){
      setErr(e.message||String(e))
    }finally{
      setLoading(false)
    }

  }

  useEffect(()=>{loadAll()},[rangeMonth.start])

  const m=normalize(sumMonth)
  const t=normalize(sumToday)

  return(

<AppShell title="Summary">

<div className="max-w-6xl mx-auto grid gap-4">

{/* header */}

<div className="flex flex-wrap gap-2 items-center">

<button onClick={()=>setMonth(monthKey(addDays(startOfMonth(month),-30)))} className="btn-ghost">
◀ เดือนก่อน
</button>

<input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="input"/>

<button onClick={()=>setMonth(monthKey(addDays(startOfMonth(month),30)))} className="btn-ghost">
เดือนถัดไป ▶
</button>

<button onClick={loadAll} className="btn-primary">
{loading?'กำลังโหลด...':'รีเฟรช'}
</button>

</div>

{err?<div className="text-red-400">{err}</div>:null}

{/* KPI */}

<div className="grid md:grid-cols-4 gap-3">

<KPI title="ยอดขายวันนี้" value={money(t.totalSales)}/>
<KPI title="กำไรวันนี้" value={money(t.netProfit)}/>

<KPI title="ยอดขายเดือนนี้" value={money(m.totalSales)}/>
<KPI title="กำไรเดือนนี้" value={money(m.netProfit)}/>

</div>

{/* month breakdown */}

<Card title="ภาพรวมรายเดือน">

<div className="grid md:grid-cols-2 gap-3">

<Mini label="ยอดขายรวม">{money(m.totalSales)}</Mini>
<Mini label="ต้นทุนรวม">{money(m.totalCost)}</Mini>
<Mini label="กำไรจากการขาย">{money(m.grossProfit)}</Mini>
<Mini label="ค่าใช้จ่ายรวม">{money(m.totalExpenses)}</Mini>

</div>

</Card>

{/* net tax */}

<Card title="กำไรสุทธิจริง + ภาษี">

<Big label="กำไรสุทธิ">{money(m.netProfit)}</Big>
<Big label="ภาษี 15%">{money(m.tax15)}</Big>
<Big label="หลังภาษี">{money(m.afterTax)}</Big>

</Card>

{/* chart */}

<Card title="แนวโน้มกำไร 30 วัน">

{series30.length
? <Chart rows={series30}/>
: <div className="text-sm text-slate-500">{series30Note||'ยังไม่มีข้อมูล'}</div>}

</Card>

{/* top 10 */}

<Card title="Top 10 กำไรสูงสุด">

{top10.length
? <table className="w-full text-sm">
<thead>
<tr>
<th>#</th>
<th>รายการ</th>
<th className="text-right">ยอดขาย</th>
<th className="text-right">กำไร</th>
</tr>
</thead>
<tbody>

{top10.map((r,i)=>(

<tr key={i}>
<td>{i+1}</td>
<td>{r.name||r.plant_name||'-'}</td>
<td className="text-right">{money(r.total_sales||0)}</td>
<td className="text-right">{money(r.profit||0)}</td>
</tr>

))}

</tbody>
</table>

: <div className="text-sm text-slate-500">{top10Note||'ยังไม่มีข้อมูล'}</div>}

</Card>

</div>

</AppShell>

)

}

function normalize(s){

return{
totalSales:Number(s?.total_sales||0),
totalCost:Number(s?.total_cost||0),
grossProfit:Number(s?.gross_profit||0),
totalExpenses:Number(s?.total_expenses||0),
netProfit:Number(s?.net_profit||0),
tax15:Number(s?.tax_15||0),
afterTax:Number(s?.after_tax||0)
}

}

function Card({title,children}){

return(
<div className="rounded-[28px] border bg-white p-4 shadow-sm">
<div className="font-semibold mb-3">{title}</div>
{children}
</div>
)

}

function KPI({title,value}){

return(
<div className="rounded-[28px] border bg-white p-4 shadow-sm">
<div className="text-xs text-slate-500">{title}</div>
<div className="text-2xl font-bold">{value}</div>
</div>
)

}

function Mini({label,children}){

return(
<div className="rounded-[22px] border p-3">
<div className="text-xs text-slate-500">{label}</div>
<div className="text-lg font-bold">{children}</div>
</div>
)

}

function Big({label,children}){

return(
<div className="flex justify-between border rounded-[18px] p-3">
<span>{label}</span>
<b>{children}</b>
</div>
)

}

function Chart({rows}){

return(

<div className="h-40 flex items-end gap-1">

{rows.map((r,i)=>{

const h=Math.min(100,Math.abs(r.net_profit)/1000)

return(
<div
key={i}
style={{height:`${h}%`}}
className="flex-1 bg-emerald-400 rounded"
/>
)

})}

</div>

)

}