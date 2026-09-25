-- ==============================================================================
-- Migration: 20260911100000_create_ledger_fee_system.sql
-- Description: Enterprise Ledger-Based Fee System Canonical Schema & RPC Engine
-- ==============================================================================

-- 1. STUDENT ENROLLMENTS (Separation of Permanent Identity from Placement)
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES public.sections(id) ON DELETE SET NULL,
    roll_number VARCHAR(50),
    enrollment_type VARCHAR(30) DEFAULT 'new_admission' CHECK (enrollment_type IN ('new_admission', 'promoted', 'demoted', 'retained', 'transfer')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    exit_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred', 'withdrawn', 'suspended')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE (school_id, student_id, session_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON public.student_enrollments(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_session ON public.student_enrollments(school_id, session_id, class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status ON public.student_enrollments(school_id, status);

-- 2. FAMILY BILLING ACCOUNTS & SIBLING RELATIONS
CREATE TABLE IF NOT EXISTS public.family_billing_accounts (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    primary_payer_name VARCHAR(255) NOT NULL,
    primary_phone VARCHAR(50),
    primary_cnic VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (school_id, account_code)
);

CREATE TABLE IF NOT EXISTS public.student_billing_accounts (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    billing_account_id BIGINT NOT NULL REFERENCES public.family_billing_accounts(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE (school_id, student_id, billing_account_id)
);

-- 3. FEE HEADS (Configurable Financial Catalog)
CREATE TABLE IF NOT EXISTS public.fee_heads (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'academic' CHECK (category IN ('academic', 'admission', 'transport', 'hostel', 'lab', 'library', 'activity', 'fine', 'security_deposit', 'one_time', 'custom')),
    is_refundable BOOLEAN DEFAULT FALSE,
    gl_account_code VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (school_id, code)
);

-- 4. FEE POLICY VERSIONS (Versioned Financial Policies)
CREATE TABLE IF NOT EXISTS public.fee_policy_versions (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    fee_head_id BIGINT NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    frequency VARCHAR(30) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'biannual', 'annual', 'one_time', 'custom')),
    amount_rule VARCHAR(30) NOT NULL DEFAULT 'class_based' CHECK (amount_rule IN ('fixed', 'class_based', 'route_based', 'student_specific')),
    base_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    class_id INTEGER REFERENCES public.classes(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES public.sections(id) ON DELETE SET NULL,
    due_day_of_month INTEGER DEFAULT 10 CHECK (due_day_of_month BETWEEN 1 AND 31),
    grace_period_days INTEGER DEFAULT 5 CHECK (grace_period_days >= 0),
    late_fine_type VARCHAR(20) DEFAULT 'fixed' CHECK (late_fine_type IN ('none', 'fixed', 'daily_rate', 'percentage')),
    late_fine_amount NUMERIC(12,2) DEFAULT 0.00,
    max_late_fine NUMERIC(12,2) DEFAULT 0.00,
    allow_partial_payment BOOLEAN DEFAULT TRUE,
    allow_concessions BOOLEAN DEFAULT TRUE,
    rolls_into_arrears BOOLEAN DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'superseded')),
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_policy_class_session ON public.fee_policy_versions(school_id, session_id, class_id, fee_head_id);

-- 5. STUDENT FEE PLANS (Custom Additions / Overrides)
CREATE TABLE IF NOT EXISTS public.student_fee_plans (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    enrollment_id BIGINT REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    fee_head_id BIGINT NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    custom_amount NUMERIC(12,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    reason TEXT,
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE (school_id, student_id, session_id, fee_head_id)
);

-- 6. STUDENT CONCESSIONS (Scholarships, Sibling discounts, Staff children)
CREATE TABLE IF NOT EXISTS public.student_concessions (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    enrollment_id BIGINT REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
    fee_head_id BIGINT NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    concession_type VARCHAR(30) NOT NULL CHECK (concession_type IN ('percentage', 'fixed_amount', 'sibling', 'staff_child', 'scholarship', 'need_based')),
    concession_value NUMERIC(12,2) NOT NULL CHECK (concession_value >= 0),
    reason TEXT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approval_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

-- 7. CASHIER SHIFTS (Cash Drawer Tracking & Reconciliation)
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    cashier_user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opening_cash_float NUMERIC(12,2) DEFAULT 0.00,
    total_cash_collected NUMERIC(12,2) DEFAULT 0.00,
    total_bank_collected NUMERIC(12,2) DEFAULT 0.00,
    total_online_collected NUMERIC(12,2) DEFAULT 0.00,
    actual_cash_counted NUMERIC(12,2),
    variance_amount NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
    reconciled_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cashier_shifts_user_status ON public.cashier_shifts(school_id, cashier_user_id, status);

-- 8. FEE DEMANDS (Authoritative Challans)
CREATE TABLE IF NOT EXISTS public.fee_demands (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    challan_no VARCHAR(60) NOT NULL,
    student_id INTEGER NOT NULL,
    enrollment_id BIGINT REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
    billing_account_id BIGINT REFERENCES public.family_billing_accounts(id) ON DELETE SET NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    billing_month INTEGER CHECK (billing_month BETWEEN 1 AND 12),
    billing_year INTEGER NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    validity_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void', 'cancelled')),
    total_gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_late_fine NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_waiver_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_net_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    snapshot_data JSONB,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE (school_id, challan_no)
);

CREATE INDEX IF NOT EXISTS idx_fee_demands_student ON public.fee_demands(school_id, student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_fee_demands_status ON public.fee_demands(school_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_demands_due_date ON public.fee_demands(school_id, due_date);
CREATE INDEX IF NOT EXISTS idx_fee_demands_month_year ON public.fee_demands(school_id, billing_year, billing_month);

-- 9. FEE DEMAND ITEMS (Individual Line Items with Granular Balances)
CREATE TABLE IF NOT EXISTS public.fee_demand_items (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    demand_id BIGINT NOT NULL REFERENCES public.fee_demands(id) ON DELETE CASCADE,
    fee_head_id BIGINT NOT NULL REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
    policy_version_id BIGINT REFERENCES public.fee_policy_versions(id) ON DELETE SET NULL,
    head_title_snapshot VARCHAR(150) NOT NULL,
    priority_order INTEGER DEFAULT 10,
    gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    late_fine_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    waiver_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'waived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_demand_items_demand ON public.fee_demand_items(school_id, demand_id);
CREATE INDEX IF NOT EXISTS idx_fee_demand_items_head ON public.fee_demand_items(school_id, fee_head_id);

-- 10. FEE RECEIPTS (Immutable Payment Records)
CREATE TABLE IF NOT EXISTS public.fee_receipts (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    receipt_no VARCHAR(60) NOT NULL,
    shift_id BIGINT REFERENCES public.cashier_shifts(id) ON DELETE SET NULL,
    student_id INTEGER NOT NULL,
    billing_account_id BIGINT REFERENCES public.family_billing_accounts(id) ON DELETE SET NULL,
    demand_id BIGINT REFERENCES public.fee_demands(id) ON DELETE SET NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'easypaisa', 'jazzcash', 'pos_card', 'advance_wallet')),
    received_amount NUMERIC(12,2) NOT NULL CHECK (received_amount > 0),
    reference_no VARCHAR(100),
    instrument_date DATE,
    bank_name VARCHAR(150),
    payer_name VARCHAR(255),
    collector_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(100),
    status VARCHAR(20) DEFAULT 'posted' CHECK (status IN ('posted', 'voided', 'refunded')),
    void_reason TEXT,
    receipt_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE (school_id, receipt_no),
    UNIQUE (school_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_fee_receipts_student ON public.fee_receipts(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_date ON public.fee_receipts(school_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_shift ON public.fee_receipts(school_id, shift_id);

-- 11. FEE ALLOCATIONS (Item-Level Payment Application)
CREATE TABLE IF NOT EXISTS public.fee_allocations (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    receipt_id BIGINT NOT NULL REFERENCES public.fee_receipts(id) ON DELETE CASCADE,
    demand_item_id BIGINT NOT NULL REFERENCES public.fee_demand_items(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    allocation_timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_allocations_receipt ON public.fee_allocations(school_id, receipt_id);
CREATE INDEX IF NOT EXISTS idx_fee_allocations_item ON public.fee_allocations(school_id, demand_item_id);

-- 12. FEE LEDGER ENTRIES (Double-Entry Subledger Journal)
CREATE TABLE IF NOT EXISTS public.fee_ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    billing_account_id BIGINT REFERENCES public.family_billing_accounts(id) ON DELETE SET NULL,
    demand_id BIGINT REFERENCES public.fee_demands(id) ON DELETE SET NULL,
    receipt_id BIGINT REFERENCES public.fee_receipts(id) ON DELETE SET NULL,
    entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('DEMAND', 'PAYMENT', 'CONCESSION', 'LATE_FINE', 'WAIVER', 'VOID_REVERSAL', 'REFUND', 'OPENING_BALANCE')),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    debit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    running_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    description TEXT NOT NULL,
    performed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fee_ledger_student_date ON public.fee_ledger_entries(school_id, student_id, entry_date);

-- 13. FEE WAIVERS & POST-DEMAND ADJUSTMENTS
CREATE TABLE IF NOT EXISTS public.fee_waivers_adjustments (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    demand_item_id BIGINT NOT NULL REFERENCES public.fee_demand_items(id) ON DELETE CASCADE,
    waiver_type VARCHAR(30) NOT NULL CHECK (waiver_type IN ('fine_waiver', 'management_discount', 'hardship_adjustment')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    requested_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. FEE REVERSALS & REFUNDS
CREATE TABLE IF NOT EXISTS public.fee_reversals_refunds (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    receipt_id BIGINT NOT NULL REFERENCES public.fee_receipts(id) ON DELETE CASCADE,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('void_payment', 'cash_refund', 'credit_wallet_refund')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    authorized_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. FEE AUDIT EVENTS
CREATE TABLE IF NOT EXISTS public.fee_audit_events (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    entity_name VARCHAR(60) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(30) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- DATABASE STORED PROCEDURES / RPC FUNCTIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- RPC 1: ATOMIC PAYMENT COLLECTION (fn_collect_fee_payment)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_collect_fee_payment(
    p_school_id BIGINT,
    p_demand_id BIGINT,
    p_received_amount NUMERIC(12,2),
    p_payment_method VARCHAR(30),
    p_collector_user_id INTEGER,
    p_idempotency_key VARCHAR(100),
    p_reference_no VARCHAR(100) DEFAULT NULL,
    p_bank_name VARCHAR(150) DEFAULT NULL,
    p_payer_name VARCHAR(255) DEFAULT NULL,
    p_shift_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_demand RECORD;
    v_item RECORD;
    v_remaining_to_allocate NUMERIC(12,2);
    v_allocation_amount NUMERIC(12,2);
    v_receipt_id BIGINT;
    v_receipt_no VARCHAR(60);
    v_new_item_paid NUMERIC(12,2);
    v_new_item_balance NUMERIC(12,2);
    v_new_item_status VARCHAR(20);
    v_student_balance NUMERIC(12,2);
    v_new_running_balance NUMERIC(12,2);
    v_receipt_snapshot JSONB;
    v_allocations_json JSONB := '[]'::JSONB;
BEGIN
    -- 1. Check Idempotency Key (Return existing receipt if duplicate)
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, receipt_no, status, receipt_snapshot INTO v_receipt_id, v_receipt_no, v_new_item_status, v_receipt_snapshot
        FROM public.fee_receipts
        WHERE school_id = p_school_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_duplicate', true,
                'receipt_id', v_receipt_id,
                'receipt_no', v_receipt_no,
                'message', 'Payment already processed with this idempotency key',
                'snapshot', v_receipt_snapshot
            );
        END IF;
    END IF;

    -- 2. Lock Demand for UPDATE to prevent race conditions
    SELECT * INTO v_demand
    FROM public.fee_demands
    WHERE id = p_demand_id AND school_id = p_school_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fee Demand ID % not found for school %', p_demand_id, p_school_id;
    END IF;

    IF v_demand.status = 'paid' OR v_demand.total_balance_amount <= 0 THEN
        RAISE EXCEPTION 'Fee Demand % is already fully paid.', v_demand.challan_no;
    END IF;

    IF p_received_amount > v_demand.total_balance_amount THEN
        RAISE EXCEPTION 'Received amount (%) exceeds outstanding balance (%)', p_received_amount, v_demand.total_balance_amount;
    END IF;

    -- 3. Generate Sequential Receipt Number
    v_receipt_no := 'REC-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(COALESCE((
        SELECT COUNT(*) + 1 FROM public.fee_receipts WHERE school_id = p_school_id
    ), 1)::TEXT, 6, '0');

    -- 4. Insert Receipt Record
    INSERT INTO public.fee_receipts (
        school_id, receipt_no, shift_id, student_id, billing_account_id, demand_id,
        payment_date, payment_method, received_amount, reference_no, bank_name,
        payer_name, collector_user_id, idempotency_key, status
    ) VALUES (
        p_school_id, v_receipt_no, p_shift_id, v_demand.student_id, v_demand.billing_account_id, v_demand.id,
        now(), p_payment_method, p_received_amount, p_reference_no, p_bank_name,
        COALESCE(p_payer_name, (v_demand.snapshot_data->>'student_name')), p_collector_user_id, p_idempotency_key, 'posted'
    ) RETURNING id INTO v_receipt_id;

    -- 5. Waterfall Allocation Across Line Items (Ordered by priority_order ASC, id ASC)
    v_remaining_to_allocate := p_received_amount;

    FOR v_item IN
        SELECT * FROM public.fee_demand_items
        WHERE demand_id = p_demand_id AND school_id = p_school_id AND balance_amount > 0
        ORDER BY priority_order ASC, id ASC
        FOR UPDATE
    LOOP
        IF v_remaining_to_allocate <= 0 THEN
            EXIT;
        END IF;

        IF v_remaining_to_allocate >= v_item.balance_amount THEN
            v_allocation_amount := v_item.balance_amount;
        ELSE
            v_allocation_amount := v_remaining_to_allocate;
        END IF;

        -- Record Allocation
        INSERT INTO public.fee_allocations (
            school_id, receipt_id, demand_item_id, allocated_amount, allocation_timestamp
        ) VALUES (
            p_school_id, v_receipt_id, v_item.id, v_allocation_amount, now()
        );

        -- Update Item Paid and Balance
        v_new_item_paid := v_item.paid_amount + v_allocation_amount;
        v_new_item_balance := v_item.balance_amount - v_allocation_amount;
        v_new_item_status := CASE WHEN v_new_item_balance = 0 THEN 'paid' ELSE 'partially_paid' END;

        UPDATE public.fee_demand_items
        SET paid_amount = v_new_item_paid,
            balance_amount = v_new_item_balance,
            status = v_new_item_status,
            updated_at = now()
        WHERE id = v_item.id;

        v_remaining_to_allocate := v_remaining_to_allocate - v_allocation_amount;

        -- Append to allocation summary JSON
        v_allocations_json := v_allocations_json || jsonb_build_object(
            'item_id', v_item.id,
            'head_title', v_item.head_title_snapshot,
            'allocated', v_allocation_amount,
            'remaining_balance', v_new_item_balance
        );
    END LOOP;

    -- 6. Update Master Demand Totals & Status
    UPDATE public.fee_demands
    SET total_paid_amount = total_paid_amount + p_received_amount,
        total_balance_amount = total_balance_amount - p_received_amount,
        status = CASE WHEN (total_balance_amount - p_received_amount) <= 0 THEN 'paid' ELSE 'partially_paid' END,
        updated_at = now()
    WHERE id = p_demand_id;

    -- 7. Calculate and Post Double-Entry Ledger Entry
    SELECT COALESCE(running_balance, 0.00) INTO v_student_balance
    FROM public.fee_ledger_entries
    WHERE school_id = p_school_id AND student_id = v_demand.student_id
    ORDER BY id DESC LIMIT 1;

    v_new_running_balance := COALESCE(v_student_balance, 0.00) - p_received_amount;

    INSERT INTO public.fee_ledger_entries (
        school_id, student_id, billing_account_id, demand_id, receipt_id,
        entry_type, entry_date, debit_amount, credit_amount, running_balance,
        description, performed_by
    ) VALUES (
        p_school_id, v_demand.student_id, v_demand.billing_account_id, p_demand_id, v_receipt_id,
        'PAYMENT', now(), 0.00, p_received_amount, v_new_running_balance,
        'Payment received for Challan #' || v_demand.challan_no || ' via ' || UPPER(p_payment_method),
        p_collector_user_id
    );

    -- 8. If Shift ID provided, update cashier shift collected amount
    IF p_shift_id IS NOT NULL THEN
        IF p_payment_method = 'cash' THEN
            UPDATE public.cashier_shifts
            SET total_cash_collected = total_cash_collected + p_received_amount
            WHERE id = p_shift_id;
        ELSIF p_payment_method IN ('bank_transfer', 'cheque') THEN
            UPDATE public.cashier_shifts
            SET total_bank_collected = total_bank_collected + p_received_amount
            WHERE id = p_shift_id;
        ELSE
            UPDATE public.cashier_shifts
            SET total_online_collected = total_online_collected + p_received_amount
            WHERE id = p_shift_id;
        END IF;
    END IF;

    -- 9. Store Snapshot in Receipt
    v_receipt_snapshot := jsonb_build_object(
        'receipt_id', v_receipt_id,
        'receipt_no', v_receipt_no,
        'challan_no', v_demand.challan_no,
        'student_id', v_demand.student_id,
        'student_info', v_demand.snapshot_data,
        'payment_method', p_payment_method,
        'reference_no', p_reference_no,
        'received_amount', p_received_amount,
        'previous_demand_balance', v_demand.total_balance_amount,
        'new_demand_balance', v_demand.total_balance_amount - p_received_amount,
        'allocations', v_allocations_json,
        'collector_id', p_collector_user_id,
        'payment_time', now()
    );

    UPDATE public.fee_receipts
    SET receipt_snapshot = v_receipt_snapshot
    WHERE id = v_receipt_id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_no', v_receipt_no,
        'received_amount', p_received_amount,
        'remaining_balance', v_demand.total_balance_amount - p_received_amount,
        'snapshot', v_receipt_snapshot
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 2: ATOMIC PAYMENT VOIDING / REVERSAL (fn_void_fee_payment)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_void_fee_payment(
    p_school_id BIGINT,
    p_receipt_id BIGINT,
    p_reason TEXT,
    p_authorized_by INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_receipt RECORD;
    v_alloc RECORD;
    v_demand RECORD;
    v_student_balance NUMERIC(12,2);
    v_new_running_balance NUMERIC(12,2);
BEGIN
    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'A mandatory justification reason is required to void a receipt.';
    END IF;

    -- 1. Lock Receipt
    SELECT * INTO v_receipt
    FROM public.fee_receipts
    WHERE id = p_receipt_id AND school_id = p_school_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Receipt ID % not found.', p_receipt_id;
    END IF;

    IF v_receipt.status = 'voided' THEN
        RAISE EXCEPTION 'Receipt % is already voided.', v_receipt.receipt_no;
    END IF;

    -- 2. Reverse All Allocations to Demand Items
    FOR v_alloc IN
        SELECT * FROM public.fee_allocations
        WHERE receipt_id = p_receipt_id AND school_id = p_school_id
    LOOP
        UPDATE public.fee_demand_items
        SET paid_amount = paid_amount - v_alloc.allocated_amount,
            balance_amount = balance_amount + v_alloc.allocated_amount,
            status = CASE 
                WHEN (balance_amount + v_alloc.allocated_amount) = net_amount THEN 'unpaid'
                ELSE 'partially_paid'
            END,
            updated_at = now()
        WHERE id = v_alloc.demand_item_id;
    END LOOP;

    -- 3. Restore Demand Balance
    IF v_receipt.demand_id IS NOT NULL THEN
        UPDATE public.fee_demands
        SET total_paid_amount = total_paid_amount - v_receipt.received_amount,
            total_balance_amount = total_balance_amount + v_receipt.received_amount,
            status = CASE 
                WHEN (total_paid_amount - v_receipt.received_amount) <= 0 THEN 'issued'
                ELSE 'partially_paid'
            END,
            updated_at = now()
        WHERE id = v_receipt.demand_id;
    END IF;

    -- 4. Mark Receipt as Voided
    UPDATE public.fee_receipts
    SET status = 'voided',
        void_reason = p_reason
    WHERE id = p_receipt_id;

    -- 5. Record Reversal Entry in Reversals Table
    INSERT INTO public.fee_reversals_refunds (
        school_id, receipt_id, action_type, amount, reason, authorized_by
    ) VALUES (
        p_school_id, p_receipt_id, 'void_payment', v_receipt.received_amount, p_reason, p_authorized_by
    );

    -- 6. Post Double-Entry Ledger Reversing Debit
    SELECT COALESCE(running_balance, 0.00) INTO v_student_balance
    FROM public.fee_ledger_entries
    WHERE school_id = p_school_id AND student_id = v_receipt.student_id
    ORDER BY id DESC LIMIT 1;

    v_new_running_balance := COALESCE(v_student_balance, 0.00) + v_receipt.received_amount;

    INSERT INTO public.fee_ledger_entries (
        school_id, student_id, billing_account_id, demand_id, receipt_id,
        entry_type, entry_date, debit_amount, credit_amount, running_balance,
        description, performed_by
    ) VALUES (
        p_school_id, v_receipt.student_id, v_receipt.billing_account_id, v_receipt.demand_id, p_receipt_id,
        'VOID_REVERSAL', now(), v_receipt.received_amount, 0.00, v_new_running_balance,
        'Reversal of Receipt #' || v_receipt.receipt_no || '. Reason: ' || p_reason,
        p_authorized_by
    );

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', p_receipt_id,
        'receipt_no', v_receipt.receipt_no,
        'reversed_amount', v_receipt.received_amount,
        'restored_student_balance', v_new_running_balance
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 3: BULK GENERATE MONTHLY DEMANDS (fn_generate_monthly_demands)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_generate_monthly_demands(
    p_school_id BIGINT,
    p_session_id INTEGER,
    p_class_id INTEGER,
    p_section_id INTEGER,
    p_billing_month INTEGER,
    p_billing_year INTEGER,
    p_issue_date DATE,
    p_due_date DATE,
    p_validity_date DATE,
    p_created_by INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enrollment RECORD;
    v_policy RECORD;
    v_plan RECORD;
    v_concession RECORD;
    v_challan_no VARCHAR(60);
    v_demand_id BIGINT;
    v_gross NUMERIC(12,2);
    v_concession_amt NUMERIC(12,2);
    v_net NUMERIC(12,2);
    v_total_gross NUMERIC(12,2);
    v_total_concession NUMERIC(12,2);
    v_total_net NUMERIC(12,2);
    v_generated_count INTEGER := 0;
    v_student_snapshot JSONB;
    v_existing_demand_id BIGINT;
BEGIN
    -- Iterate over active enrollments matching criteria
    FOR v_enrollment IN
        SELECT e.*, s.name as student_name, s.father_name, s.phone as student_phone,
               c.name as class_name, sec.name as section_name
        FROM public.student_enrollments e
        JOIN public.students s ON s.id = e.student_id AND s.school_id = e.school_id
        JOIN public.classes c ON c.id = e.class_id AND c.school_id = e.school_id
        LEFT JOIN public.sections sec ON sec.id = e.section_id AND sec.school_id = e.school_id
        WHERE e.school_id = p_school_id
          AND e.session_id = p_session_id
          AND (p_class_id IS NULL OR e.class_id = p_class_id)
          AND (p_section_id IS NULL OR e.section_id = p_section_id)
          AND e.status = 'active'
    LOOP
        -- Check if demand already exists for this student/month/year
        SELECT id INTO v_existing_demand_id
        FROM public.fee_demands
        WHERE school_id = p_school_id
          AND student_id = v_enrollment.student_id
          AND session_id = p_session_id
          AND billing_month = p_billing_month
          AND billing_year = p_billing_year
          AND status != 'void';

        IF FOUND THEN
            CONTINUE; -- Skip already generated demands
        END IF;

        -- Build Student Snapshot
        v_student_snapshot := jsonb_build_object(
            'student_id', v_enrollment.student_id,
            'student_name', v_enrollment.student_name,
            'father_name', v_enrollment.father_name,
            'class_id', v_enrollment.class_id,
            'class_name', v_enrollment.class_name,
            'section_id', v_enrollment.section_id,
            'section_name', v_enrollment.section_name,
            'roll_number', v_enrollment.roll_number,
            'phone', v_enrollment.student_phone
        );

        -- Generate Sequential Challan Number
        v_challan_no := 'CH-' || p_billing_year || LPAD(p_billing_month::TEXT, 2, '0') || '-' || LPAD(COALESCE((
            SELECT COUNT(*) + 1 FROM public.fee_demands WHERE school_id = p_school_id
        ), 1)::TEXT, 6, '0');

        -- Insert Demand Master
        INSERT INTO public.fee_demands (
            school_id, challan_no, student_id, enrollment_id, session_id,
            billing_month, billing_year, issue_date, due_date, validity_date,
            status, total_gross_amount, total_concession_amount, total_late_fine,
            total_waiver_amount, total_net_amount, total_paid_amount, total_balance_amount,
            snapshot_data, created_by
        ) VALUES (
            p_school_id, v_challan_no, v_enrollment.student_id, v_enrollment.id, p_session_id,
            p_billing_month, p_billing_year, p_issue_date, p_due_date, p_validity_date,
            'issued', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            v_student_snapshot, p_created_by
        ) RETURNING id INTO v_demand_id;

        v_total_gross := 0.00;
        v_total_concession := 0.00;
        v_total_net := 0.00;

        -- Process Standard Policies for this class/session
        FOR v_policy IN
            SELECT p.*, h.title as head_title, h.code as head_code
            FROM public.fee_policy_versions p
            JOIN public.fee_heads h ON h.id = p.fee_head_id
            WHERE p.school_id = p_school_id
              AND p.session_id = p_session_id
              AND p.status = 'active'
              AND (p.class_id IS NULL OR p.class_id = v_enrollment.class_id)
              AND (p.section_id IS NULL OR p.section_id = v_enrollment.section_id)
        LOOP
            v_gross := v_policy.base_amount;

            -- Check for student-specific override plan
            SELECT custom_amount INTO v_plan
            FROM public.student_fee_plans
            WHERE school_id = p_school_id
              AND student_id = v_enrollment.student_id
              AND session_id = p_session_id
              AND fee_head_id = v_policy.fee_head_id
              AND is_active = true;

            IF FOUND THEN
                v_gross := v_plan.custom_amount;
            END IF;

            -- Calculate Concession
            v_concession_amt := 0.00;
            SELECT * INTO v_concession
            FROM public.student_concessions
            WHERE school_id = p_school_id
              AND student_id = v_enrollment.student_id
              AND fee_head_id = v_policy.fee_head_id
              AND approval_status = 'approved'
              AND (end_date IS NULL OR end_date >= p_issue_date)
            ORDER BY id DESC LIMIT 1;

            IF FOUND THEN
                IF v_concession.concession_type = 'percentage' THEN
                    v_concession_amt := ROUND((v_gross * v_concession.concession_value / 100.0), 2);
                ELSE
                    v_concession_amt := LEAST(v_concession.concession_value, v_gross);
                END IF;
            END IF;

            v_net := GREATEST(0.00, v_gross - v_concession_amt);

            -- Insert Line Item
            INSERT INTO public.fee_demand_items (
                school_id, demand_id, fee_head_id, policy_version_id, head_title_snapshot,
                priority_order, gross_amount, concession_amount, late_fine_amount,
                waiver_amount, net_amount, paid_amount, balance_amount, status
            ) VALUES (
                p_school_id, v_demand_id, v_policy.fee_head_id, v_policy.id, v_policy.head_title,
                10, v_gross, v_concession_amt, 0.00, 0.00, v_net, 0.00, v_net, 'unpaid'
            );

            v_total_gross := v_total_gross + v_gross;
            v_total_concession := v_total_concession + v_concession_amt;
            v_total_net := v_total_net + v_net;
        END LOOP;

        -- Update Demand Totals
        UPDATE public.fee_demands
        SET total_gross_amount = v_total_gross,
            total_concession_amount = v_total_concession,
            total_net_amount = v_total_net,
            total_balance_amount = v_total_net
        WHERE id = v_demand_id;

        -- Post Demand to Ledger (Debit)
        INSERT INTO public.fee_ledger_entries (
            school_id, student_id, billing_account_id, demand_id, receipt_id,
            entry_type, entry_date, debit_amount, credit_amount, running_balance,
            description, performed_by
        ) VALUES (
            p_school_id, v_enrollment.student_id, NULL, v_demand_id, NULL,
            'DEMAND', now(), v_total_net, 0.00,
            COALESCE((SELECT running_balance FROM public.fee_ledger_entries WHERE school_id = p_school_id AND student_id = v_enrollment.student_id ORDER BY id DESC LIMIT 1), 0.00) + v_total_net,
            'Fee Demand issued: ' || v_challan_no || ' for ' || TO_CHAR(TO_DATE(p_billing_month::TEXT, 'MM'), 'Month') || ' ' || p_billing_year,
            p_created_by
        );

        v_generated_count := v_generated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'generated_count', v_generated_count,
        'message', 'Successfully generated ' || v_generated_count || ' fee demands.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 4: OPENING ARREARS CARRY-FORWARD ACROSS SESSIONS (fn_carry_forward_arrears)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_carry_forward_arrears(
    p_school_id BIGINT,
    p_source_session_id INTEGER,
    p_target_session_id INTEGER,
    p_performed_by INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_outstanding NUMERIC(12,2);
    v_carried_count INTEGER := 0;
    v_opening_head_id BIGINT;
    v_demand_id BIGINT;
    v_challan_no VARCHAR(60);
BEGIN
    -- Ensure an 'Arrears' fee head exists
    SELECT id INTO v_opening_head_id
    FROM public.fee_heads
    WHERE school_id = p_school_id AND code = 'ARREARS';

    IF NOT FOUND THEN
        INSERT INTO public.fee_heads (school_id, code, title, category, is_refundable, is_active)
        VALUES (p_school_id, 'ARREARS', 'Previous Session Arrears', 'academic', false, true)
        RETURNING id INTO v_opening_head_id;
    END IF;

    -- Find all students who have an active enrollment in target session and outstanding balance
    FOR v_student IN
        SELECT DISTINCT e.student_id, e.id as enrollment_id
        FROM public.student_enrollments e
        WHERE e.school_id = p_school_id AND e.session_id = p_target_session_id AND e.status = 'active'
    LOOP
        -- Calculate unsettled balance from source session
        SELECT COALESCE(SUM(total_balance_amount), 0.00) INTO v_outstanding
        FROM public.fee_demands
        WHERE school_id = p_school_id
          AND student_id = v_student.student_id
          AND session_id = p_source_session_id
          AND status IN ('issued', 'partially_paid', 'overdue');

        IF v_outstanding > 0 THEN
            v_challan_no := 'ARR-' || p_target_session_id || '-' || LPAD(COALESCE((
                SELECT COUNT(*) + 1 FROM public.fee_demands WHERE school_id = p_school_id
            ), 1)::TEXT, 6, '0');

            -- Create an opening arrears demand
            INSERT INTO public.fee_demands (
                school_id, challan_no, student_id, enrollment_id, session_id,
                billing_year, issue_date, due_date, validity_date, status,
                total_gross_amount, total_net_amount, total_balance_amount, snapshot_data, created_by
            ) VALUES (
                p_school_id, v_challan_no, v_student.student_id, v_student.enrollment_id, p_target_session_id,
                EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, CURRENT_DATE, CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '30 days',
                'issued', v_outstanding, v_outstanding, v_outstanding,
                jsonb_build_object('type', 'opening_arrears', 'source_session_id', p_source_session_id),
                p_performed_by
            ) RETURNING id INTO v_demand_id;

            -- Line item
            INSERT INTO public.fee_demand_items (
                school_id, demand_id, fee_head_id, head_title_snapshot, priority_order,
                gross_amount, net_amount, balance_amount, status
            ) VALUES (
                p_school_id, v_demand_id, v_opening_head_id, 'Opening Arrears Carry-Forward', 1,
                v_outstanding, v_outstanding, v_outstanding, 'unpaid'
            );

            -- Ledger Entry
            INSERT INTO public.fee_ledger_entries (
                school_id, student_id, demand_id, entry_type, entry_date,
                debit_amount, credit_amount, running_balance, description, performed_by
            ) VALUES (
                p_school_id, v_student.student_id, v_demand_id, 'OPENING_BALANCE', now(),
                v_outstanding, 0.00,
                COALESCE((SELECT running_balance FROM public.fee_ledger_entries WHERE school_id = p_school_id AND student_id = v_student.student_id ORDER BY id DESC LIMIT 1), 0.00) + v_outstanding,
                'Opening Arrears carried forward from previous session into Session ID ' || p_target_session_id,
                p_performed_by
            );

            v_carried_count := v_carried_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'carried_count', v_carried_count,
        'message', 'Carried forward arrears for ' || v_carried_count || ' students.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 5: GET STUDENT LEDGER (fn_get_student_ledger)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_student_ledger(
    p_school_id BIGINT,
    p_student_id INTEGER
)
RETURNS TABLE (
    entry_id BIGINT,
    entry_date TIMESTAMPTZ,
    entry_type VARCHAR(30),
    description TEXT,
    debit_amount NUMERIC(12,2),
    credit_amount NUMERIC(12,2),
    running_balance NUMERIC(12,2),
    challan_no VARCHAR(60),
    receipt_no VARCHAR(60),
    performed_by_name VARCHAR(255)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        l.id as entry_id,
        l.entry_date,
        l.entry_type,
        l.description,
        l.debit_amount,
        l.credit_amount,
        l.running_balance,
        d.challan_no,
        r.receipt_no,
        u.name as performed_by_name
    FROM public.fee_ledger_entries l
    LEFT JOIN public.fee_demands d ON d.id = l.demand_id
    LEFT JOIN public.fee_receipts r ON r.id = l.receipt_id
    LEFT JOIN public.users u ON u.id = l.performed_by
    WHERE l.school_id = p_school_id AND l.student_id = p_student_id
    ORDER BY l.id ASC;
$$;

-- ==============================================================================
-- REGISTER NEW SYSTEM PERMISSIONS
-- ==============================================================================

INSERT INTO public.permissions (key, name, description, category, path)
VALUES 
    ('fee-ledger-dashboard', 'Fee Ledger Dashboard', 'Overview of enterprise fee ledger analytics and totals', 'Fee Ledger', '/fee-ledger'),
    ('fee-catalog-manage', 'Fee Catalog & Policies', 'Configure fee heads, rules, and policy versions', 'Fee Ledger', '/fee-catalog'),
    ('fee-concessions-manage', 'Fee Concessions & Scholarships', 'Manage student fee plans and approved concessions', 'Fee Ledger', '/fee-concessions'),
    ('fee-demands-generate', 'Generate Fee Demands', 'Generate bulk and individual student challans', 'Fee Ledger', '/fee-demands'),
    ('fee-counter-pos', 'Fee Counter (POS)', 'Collect fee payments, issue receipts, and manage drawer', 'Fee Ledger', '/fee-counter'),
    ('fee-reversals-refunds', 'Reversals & Refunds', 'Authorize payment voiding, cash refunds, and adjustments', 'Fee Ledger', '/fee-adjustments'),
    ('fee-cashier-shifts', 'Cashier Shift Reconciliations', 'Shift open/close, drawer variance, and daily handover', 'Fee Ledger', '/fee-shifts'),
    ('fee-aged-receivables', 'Aged Receivables & Defaulters', 'View 30/60/90+ day ageing and defaulter breakdown', 'Fee Ledger', '/fee-ageing'),
    ('fee-family-billing', 'Family & Sibling Billing', 'Consolidated billing and collection for families', 'Fee Ledger', '/fee-family-billing')
ON CONFLICT (key) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    path = EXCLUDED.path;

-- Assign permissions to Admin role (role_id = 1 or matching Admin roles)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Admin', 'Super Admin', 'Principal')
  AND p.category = 'Fee Ledger'
ON CONFLICT DO NOTHING;
