'use client'

import { useEffect, useState, useMemo } from 'react'
import AppShell from '@/components/AppShell'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

function money(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toLocaleString('th-TH') : '0'
}

function monthRange() {
  const d = new Date()
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)

  const toISO = (x) => x.toISOString().slice(0, 10)

  return {
    start: toISO(start),
    end: toISO(end)
  }
}

export default function DashboardPage() {

  const supabase = supabaseBrowser()

  const [loading,setLoading] = useState(true)

  const [kpi,setKpi] = useState({
    sales:0,
    profit:0,
    stock:0,
    stockCost:0,
    expenses:0
  })

  const [banks,setBanks] = useState({
    GSB:{balance:0,income:0,expense:0},
    KTB:{balance:0,income:0,expense:0},
    KBANK:{balance:0,income:0,expense:0}
  })

  const [latestInvoices,setLatestInvoices] = useState([])

  const [unpaidStats,setUnpaidStats] = useState({
    unpaid:0,
    partial:0,
    amount:0
  })

  async function loadData(){

    setLoading(true)

    const {start,end} = monthRange()

    try{

      /* ==========================
      plants
      ========================== */

      const {data:plantsAgg} =
      await supabase.rpc('dashboard_plants_agg')

      const plants = plantsAgg?.[0] || {}

      /* ==========================
      monthly summary
      ========================== */

      const {data:summary} =
      await supabase.rpc('get_month_summary',{
        p_start:start,
        p_end:end
      })

      const m = summary?.[0] || {}

      /* ==========================
      bank balances
      ========================== */

      const {data:bankData} =
      await supabase.rpc('get_bank_balances',{
        p_start:start,
        p_end:end
      })

      const bankMap = {}

      for(const b of bankData || []){

        bankMap[b.bank] = {

          balance:Number(b.balance || 0),

          income:Number(b.month_in || 0),

          expense:Number(b.month_out || 0)

        }

      }

      /* ==========================
      invoices
      ========================== */

      const {data:inv} = await supabase
      .from('invoices')
      .select('id,invoice_no,sale_date,customer_name,total_price,pay_status,created_at')
      .order('created_at',{ascending:false})
      .limit(20)

      const filtered = []

      const now = new Date()

      for(const i of inv || []){

        const pay = (i.pay_status || '').toLowerCase()

        if(pay === 'paid'){

          const created = new Date(i.created_at)

          const diff =
          (now - created) / (1000*60*60*24)

          if(diff > 1) continue
        }

        filtered.push(i)

        if(filtered.length === 10) break
      }

      /* ==========================
      unpaid calculation
      ========================== */

      let unpaid = 0
      let partial = 0
      let amount = 0

      for(const i of inv || []){

        const s = (i.pay_status || '').toLowerCase()

        if(s === 'unpaid'){
          unpaid++
          amount += Number(i.total_price || 0)
        }

        if(s === 'partial'){
          partial++
          amount += Number(i.total_price || 0)
        }

      }

      setUnpaidStats({
        unpaid,
        partial,
        amount
      })

      setLatestInvoices(filtered)

      setBanks({
        GSB:bankMap.GSB || {balance:0,income:0,expense:0},
        KTB:bankMap.KTB || {balance:0,income:0,expense:0},
        KBANK:bankMap.KBANK || {balance:0,income:0,expense:0}
      })

      setKpi({

        sales:Number(m.sales || 0),

        profit:Number(m.net || 0),

        stock:Number(plants.active_count || 0),

        stockCost:Number(plants.active_cost_sum || 0),

        expenses:Number(m.expenses || 0)

      })

    }

    catch(e){

      console.error(e)

    }

    setLoading(false)

  }

  useEffect(()=>{
    loadData()
  },[])

  /* ==========================
  TAX / SALARY
  ========================== */

  const tax = Math.floor(kpi.profit * 0.15)

  const afterTax = kpi.profit - tax

  const salaryTotal = Math.min(Math.floor(afterTax*0.3),60000)

  const salaryTime = Math.floor(salaryTotal/3)

  const salaryNisa = salaryTotal - salaryTime

  /* ==========================
  BANK TOTAL
  ========================== */

  const totalCash =
  banks.GSB.balance +
  banks.KTB.balance +
  banks.KBANK.balance

  /* ==========================
  DONUT DATA
  ========================== */

  const donutIncomeExpense = [

    {name:'รายรับ',value:kpi.sales},

    {name:'รายจ่าย',value:kpi.expenses}

  ]

  const donutSalesCost = [

    {name:'ยอดขาย',value:kpi.sales},

    {name:'ทุนคงเหลือ',value:kpi.stockCost}

  ]

  /* ==========================
  AI ANALYSIS
  ========================== */

  function aiBuyAdvice(){

    if(kpi.stock < 10)
      return "Stock ต่ำ ควรหาไม้เข้ามาเพิ่ม"

    if(kpi.profit > 20000)
      return "กำไรดี สามารถลงทุนเพิ่มได้"

    if(unpaidStats.amount > 0)
      return "มีเงินค้างชำระ ควรตามลูกหนี้ก่อนซื้อเพิ่ม"

    return "ระบบสมดุล ยังไม่จำเป็นต้องซื้อเพิ่ม"
  }

  function aiBusinessAnalysis(){

    if(kpi.profit < 0)
      return "ธุรกิจขาดทุน ต้องลดค่าใช้จ่าย"

    if(kpi.sales === 0)
      return "ยังไม่มีการขาย ควรเร่งทำตลาด"

    if(kpi.profit > 30000)
      return "ธุรกิจกำไรดี สามารถขยายได้"

    return "ธุรกิจอยู่ในระดับปกติ"
  }

  return(

  <AppShell title="Dashboard">

  {/* ==========================
  ROW 1
  ========================== */}

  <div className="grid grid-cols-4 gap-4">

  <Stat title="ยอดขายเดือนนี้" value={kpi.sales}/>
  <Stat title="กำไรสุทธิเดือนนี้" value={kpi.profit}/>
  <Stat title="ไม้คงเหลือ" value={kpi.stock} suffix="ต้น"/>
  <Stat title="มูลค่าทุนคงเหลือ" value={kpi.stockCost}/>

  </div>

  {/* ==========================
  ROW 2
  ========================== */}

  <div className="grid grid-cols-4 gap-4 mt-4">

  <Stat title="ภาษี 15%" value={tax}/>
  <Stat title={`เงินเดือน Time ${money(salaryTime)} / Nisa ${money(salaryNisa)}`} value={salaryTotal}/>
  <Stat title="AI แนะนำการซื้อไม้" value={aiBuyAdvice()} text/>
  <Stat title="AI วิเคราะห์ธุรกิจ" value={aiBusinessAnalysis()} text/>

  </div>

  {/* ==========================
  ROW 3
  ========================== */}

  <div className="grid grid-cols-3 gap-4 mt-4">

  <Donut
  title="รายรับ / รายจ่าย"
  data={donutIncomeExpense}
  colors={['#10b981','#ef4444']}
  />

  <Donut
  title="ยอดขาย / ทุนคงเหลือ"
  data={donutSalesCost}
  colors={['#3b82f6','#f59e0b']}
  />

  <div className="bg-white p-4 rounded-xl border">

  <div className="text-sm text-gray-500">
  ยอดค้างชำระ
  </div>

  <div className="text-3xl font-bold mt-2">
  {money(unpaidStats.amount)}
  </div>

  <div className="mt-3 text-sm">

  unpaid {unpaidStats.unpaid}  
  partial {unpaidStats.partial}

  </div>

  </div>

  </div>

  {/* ==========================
  ROW 4
  ========================== */}

  <div className="grid grid-cols-3 gap-4 mt-4">

{['GSB','KTB','KBANK'].map(b=>{

const bank = banks[b]

const bg = {
GSB:'/banks/gsb.png',
KTB:'/banks/ktb.png',
KBANK:'/banks/kbank.png'
}

return(

<div
key={b}
className="p-4 rounded-xl border relative overflow-hidden bg-white"
>

<img
src={bg[b]}
className="absolute opacity-10 right-2 bottom-2 w-40 pointer-events-none"
/>

<div className="text-sm text-gray-500 relative z-10">
{b}
</div>

<div className="text-2xl font-bold mt-2 relative z-10">
{money(bank.balance)} บาท
</div>

<div className="text-sm mt-3 relative z-10">
รับเดือนนี้ {money(bank.income)}
</div>

<div className="text-sm relative z-10">
จ่ายเดือนนี้ {money(bank.expense)}
</div>

</div>

)

})}

</div>

  {/* ==========================
  ROW 5
  ========================== */}

  <div className="mt-4 bg-white rounded-xl border">

  <div className="p-4 font-semibold">
  10 บิลล่าสุด
  </div>

  {(latestInvoices || []).map(i=>{

  const s = (i.pay_status || '').toLowerCase()

  let color = 'gray'

  if(s === 'paid') color = 'green'
  if(s === 'partial') color = 'yellow'
  if(s === 'unpaid') color = 'red'

  return(

  <div
  key={i.id}
  className="flex justify-between p-4 border-t text-sm"
  >

  <div>

  <div>{i.invoice_no}</div>

  <div className="text-gray-500">
  {i.sale_date} • {i.customer_name}
  </div>

  </div>

  <div className={`font-bold text-${color}-600`}>

  {money(i.total_price)}

  </div>

  </div>

  )

  })}

  </div>

  </AppShell>

  )

}

/* ==========================
components
========================== */

function Stat({title,value,suffix="บาท",text}){

return(

<div className="bg-white border rounded-xl p-4">

<div className="text-sm text-gray-500">
{title}
</div>

<div className={text 
  ? "text-lg font-semibold mt-2 leading-snug"
  : "text-3xl font-bold mt-2"}>

{text ? value : money(value)}

{!text && suffix && (
<span className="text-sm ml-1">
{suffix}
</span>
)}

</div>

</div>

)

}

function Donut({title,data,colors}){

return(

<div className="bg-white border rounded-xl p-4">

<div className="text-sm text-gray-500 mb-2">
{title}
</div>

<div style={{height:220}}>

<ResponsiveContainer>

<PieChart>

<Pie
data={data}
dataKey="value"
innerRadius={60}
outerRadius={90}
>

{data.map((_,i)=>(
<Cell key={i} fill={colors[i]}/>
))}

</Pie>

<Tooltip/>

</PieChart>

</ResponsiveContainer>

</div>

</div>

)

}