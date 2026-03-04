-- =============================================
-- Garden POS (NisaPlant) - SQL Patch รอบนี้
-- ทำเฉพาะที่จำเป็น ตามที่คุยกัน
-- =============================================

-- 0) ความปลอดภัย: ใช้ schema public
set search_path = public;

-- 1) FIX: get_bank_balances ให้รองรับเรียกจาก JS และคืนค่า month_in/month_out ชัดเจน
--    (และแก้ปัญหา CREATE OR REPLACE เปลี่ยน default params ไม่ได้)
DROP FUNCTION IF EXISTS public.get_bank_balances(date, date);

CREATE FUNCTION public.get_bank_balances(
  p_start date,
  p_end   date
)
RETURNS TABLE(
  bank bank_code,
  opening_amount numeric,
  balance numeric,
  month_in numeric,
  month_out numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start date;
  v_end   date;
BEGIN
  -- ถ้าไม่ได้ส่งช่วงมา ให้ใช้เดือนปัจจุบัน
  v_start := COALESCE(p_start, date_trunc('month', now())::date);
  v_end   := COALESCE(p_end, (date_trunc('month', now()) + interval '1 month')::date);

  RETURN QUERY
  WITH latest_opening AS (
    SELECT DISTINCT ON (bob.bank)
      bob.bank,
      bob.opening_amount
    FROM public.bank_opening_balances bob
    ORDER BY bob.bank, bob.as_of_date DESC, bob.created_at DESC
  ),
  total_in AS (
    SELECT p.bank, COALESCE(SUM(p.amount),0) AS amt
    FROM public.payments p
    WHERE p.pay_date >= v_start AND p.pay_date < v_end
    GROUP BY p.bank
  ),
  total_out AS (
    SELECT e.bank, COALESCE(SUM(e.amount),0) AS amt
    FROM public.expenses e
    WHERE e.expense_date >= v_start AND e.expense_date < v_end
    GROUP BY e.bank
  )
  SELECT
    lo.bank,
    lo.opening_amount,
    (lo.opening_amount + COALESCE(ti.amt,0) - COALESCE(to2.amt,0)) AS balance,
    COALESCE(ti.amt,0) AS month_in,
    COALESCE(to2.amt,0) AS month_out
  FROM latest_opening lo
  LEFT JOIN total_in ti ON ti.bank = lo.bank
  LEFT JOIN total_out to2 ON to2.bank = lo.bank
  ORDER BY lo.bank;
END;
$$;

REVOKE ALL ON FUNCTION public.get_bank_balances(date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bank_balances(date,date) TO authenticated;


-- 2) AUTO: เพิ่มต้นไม้ -> บันทึกค่าใช้จ่าย "ซื้อไม้เข้า" (GSB) แบบอัตโนมัติ
--    + กันซ้ำด้วย partial unique index บน note
CREATE UNIQUE INDEX IF NOT EXISTS expenses_auto_plant_purchase_note_uq
ON public.expenses (note)
WHERE note LIKE 'AUTO_PLANT_PURCHASE:%';

CREATE OR REPLACE FUNCTION public.tg_plants_auto_purchase_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_note text;
  v_amt numeric;
BEGIN
  -- plants ไม่มี created_by -> ใช้ auth.uid()
  v_amt := COALESCE(NEW.cost, 0);
  IF v_amt <= 0 THEN
    RETURN NEW;
  END IF;

  v_note := 'AUTO_PLANT_PURCHASE:' || COALESCE(NEW.plant_code, '');

  INSERT INTO public.expenses(
    expense_date,
    category,
    amount,
    bank,
    note,
    created_by
  )
  VALUES(
    COALESCE(NEW.acquired_date, now()::date),
    'ซื้อไม้เข้า',
    v_amt,
    'GSB',
    v_note,
    auth.uid()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plants_auto_purchase_expense ON public.plants;
CREATE TRIGGER trg_plants_auto_purchase_expense
AFTER INSERT ON public.plants
FOR EACH ROW
EXECUTE FUNCTION public.tg_plants_auto_purchase_expense();


-- 3) AUTO: แก้บิลจาก "partial" -> "paid" ให้เติมยอดส่วนที่เหลือเข้าตาราง payments อัตโนมัติ
--    (เพื่อให้ bank balances รีลไทม์ตามที่ต้องการ)
CREATE UNIQUE INDEX IF NOT EXISTS payments_auto_remaining_note_uq
ON public.payments (note)
WHERE note LIKE 'AUTO_INVOICE_REMAINING:%';

CREATE OR REPLACE FUNCTION public.tg_invoice_payments_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_paid numeric;
  v_total numeric;
  v_need numeric;
  v_note text;
  v_date date;
BEGIN
  -- ทำงานเฉพาะตอนสถานะเปลี่ยนเป็น paid
  IF NEW.pay_status <> 'paid' THEN
    RETURN NEW;
  END IF;

  v_total := COALESCE(NEW.total_price, 0);
  IF v_total <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(p.amount),0)
    INTO v_paid
  FROM public.payments p
  WHERE p.invoice_id = NEW.id;

  v_need := v_total - v_paid;
  IF v_need <= 0 THEN
    RETURN NEW;
  END IF;

  v_date := COALESCE(NEW.paid_date, NEW.sale_date, now()::date);
  v_note := 'AUTO_INVOICE_REMAINING:' || COALESCE(NEW.invoice_no, NEW.id::text);

  INSERT INTO public.payments(
    invoice_id,
    pay_date,
    bank,
    amount,
    payment_method,
    note,
    created_by
  )
  VALUES(
    NEW.id,
    v_date,
    NEW.bank,
    v_need,
    NEW.payment_method,
    v_note,
    auth.uid()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_payments_sync ON public.invoices;
CREATE TRIGGER trg_invoice_payments_sync
AFTER UPDATE OF pay_status, total_price, bank, payment_method, paid_date ON public.invoices
FOR EACH ROW
WHEN (OLD.pay_status IS DISTINCT FROM NEW.pay_status)
EXECUTE FUNCTION public.tg_invoice_payments_sync();


-- 4) FIX: update_invoice_status เพิ่มพารามิเตอร์ชื่อลูกค้า (optional)
--    (ต้อง DROP ก่อน เพราะเปลี่ยน signature)
DROP FUNCTION IF EXISTS public.update_invoice_status(uuid, pay_status, ship_status, bank_code, payment_method, date);

CREATE FUNCTION public.update_invoice_status(
  p_invoice_id uuid,
  p_pay_status pay_status,
  p_ship_status ship_status,
  p_bank bank_code,
  p_payment_method payment_method,
  p_paid_date date,
  p_customer_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.invoices
  SET
    pay_status = p_pay_status,
    ship_status = p_ship_status,
    bank = p_bank,
    payment_method = p_payment_method,
    paid_date = p_paid_date,
    customer_name = COALESCE(NULLIF(p_customer_name, ''), customer_name),
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_invoice_status(uuid,pay_status,ship_status,bank_code,payment_method,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_invoice_status(uuid,pay_status,ship_status,bank_code,payment_method,date,text) TO authenticated;

-- Done.
