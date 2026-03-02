# NISAPLANT SYSTEM SNAPSHOT
Last Updated: 2026-03-02

---

# PROJECT STRUCTURE

src/
  app/
    ar/
    bank/
    closing/
    dashboard/
    edit-invoice/
    expenses/
    login/
    plants/
    receipt/
    salary/
    sell/
    summary/

    favicon.ico
    globals.css
    layout.js
    page.js
    page.module.css

  components/
  lib/

---

# CORE MODULES

## SELL
Path: src/app/sell
หน้าขายหลัก
- สร้าง invoice
- เลือก plant
- คำนวณกำไร
- pay_status
- ship_status

## EDIT INVOICE
Path: src/app/edit-invoice
- ยกเลิกบิล
- เคลมไม้
- เคลมเงิน
- เปลี่ยนสถานะส่ง

## PLANTS
Path: src/app/plants
- เพิ่มต้นไม้
- bulk add
- แสดง active / sold

## EXPENSES
Path: src/app/expenses
- บันทึกค่าใช้จ่ายอื่นๆ

## SUMMARY
Path: src/app/summary
- KPI
- ยอดขายเดือนนี้
- กำไรสุทธิ
- สถานะบิล

## DASHBOARD
Path: src/app/dashboard
- ภาพรวมระบบ

## SALARY
Path: src/app/salary
- คำนวณเงินเดือน
- ผัว 10%
- เมีย 20%
- รวมไม่เกิน 60,000
- ปัดลง

## BANK
Path: src/app/bank
- GSB = ธุรกิจ
- KTB = ส่วนตัว
- KBANK = เก็บกำไร

## CLOSING
Path: src/app/closing
- ปิดรอบเดือน

---

# BUSINESS RULES

## Pay Status
- paid
- partial
- unpaid

## Ship Status
- shipped
- not_shipped

## Invoice Status
- confirmed
- cancelled

## Tax
5%

---

# DATABASE (Logical)

Tables:
- plants
- invoices
- sale_items
- expenses

RPC:
- create_sale_invoice()
- get_month_summary()
- preview_plant_codes()
- add_plants_bulk()

---

# IMPORTANT
- ใช้งานจริงบน Vercel
- ห้ามแก้ logic โดยไม่ระบุผลกระทบ
- ส่งโค้ดแบบทั้งไฟล์เมื่อมีการแก้