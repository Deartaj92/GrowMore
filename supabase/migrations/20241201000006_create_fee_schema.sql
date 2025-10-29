-- Drop existing tables, triggers, and functions if they exist
DROP TABLE IF EXISTS public.fee_audit_logs CASCADE;
DROP TABLE IF EXISTS public.fee_payments CASCADE;
DROP TABLE IF EXISTS public.fee_invoice_items CASCADE;
DROP TABLE IF EXISTS public.fee_invoices CASCADE;
DROP TABLE IF EXISTS public.student_fee_plans CASCADE;
DROP TABLE IF EXISTS public.fee_structures CASCADE;
DROP TABLE IF EXISTS public.fee_heads CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS fee_audit_logs_set_id() CASCADE;
DROP FUNCTION IF EXISTS fee_payments_set_id() CASCADE;
DROP FUNCTION IF EXISTS fee_invoice_items_set_id() CASCADE;
DROP FUNCTION IF EXISTS fee_invoices_set_id() CASCADE;
DROP FUNCTION IF EXISTS student_fee_plans_set_id() CASCADE;
DROP FUNCTION IF EXISTS fee_structures_set_id() CASCADE;
DROP FUNCTION IF EXISTS fee_heads_set_id() CASCADE;

-- Fee Heads (types of fees: tuition, transport, etc.)
CREATE TABLE public.fee_heads (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT TRUE,
    default_amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (name, school_id)
);

-- Fee Structures (per class/section/session)
CREATE TABLE public.fee_structures (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES public.sections(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    fee_head_id INTEGER NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (class_id, section_id, session_id, fee_head_id, school_id)
);

-- Student Fee Plans (custom per-student fees)
CREATE TABLE public.student_fee_plans (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    fee_head_id INTEGER NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (student_id, session_id, fee_head_id, school_id),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

-- Fee Invoices (generated per student per period)
CREATE TABLE public.fee_invoices (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    month VARCHAR(20),
    year INTEGER,
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (student_id, session_id, month, year, school_id),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

-- Fee Invoice Items (line items per invoice)
CREATE TABLE public.fee_invoice_items (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
    fee_head_id INTEGER NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    discount NUMERIC(10,2) DEFAULT 0,
    fine NUMERIC(10,2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fee Payments (records of payments against invoices)
CREATE TABLE public.fee_payments (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    reference_no VARCHAR(100),
    received_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fee Audit Logs (track all fee-related changes)
CREATE TABLE public.fee_audit_logs (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    entity VARCHAR(50) NOT NULL, -- 'fee_head', 'fee_structure', 'invoice', 'payment', etc.
    entity_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fee_heads_school_id ON public.fee_heads(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school_id ON public.fee_structures(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_session ON public.fee_structures(school_id, class_id, session_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_plans_school_id ON public.student_fee_plans(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_plans_student_session ON public.student_fee_plans(school_id, student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_school_id ON public.fee_invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_session ON public.fee_invoices(school_id, student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_month_year ON public.fee_invoices(school_id, month, year);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status ON public.fee_invoices(school_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_invoice_items_invoice ON public.fee_invoice_items(school_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_id ON public.fee_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice ON public.fee_payments(school_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_school_id ON public.fee_audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_entity ON public.fee_audit_logs(school_id, entity, entity_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_fee_heads_updated_at
    BEFORE UPDATE ON public.fee_heads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_structures_updated_at
    BEFORE UPDATE ON public.fee_structures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_fee_plans_updated_at
    BEFORE UPDATE ON public.student_fee_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_invoices_updated_at
    BEFORE UPDATE ON public.fee_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_invoice_items_updated_at
    BEFORE UPDATE ON public.fee_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at
    BEFORE UPDATE ON public.fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 