CREATE TABLE public.student_fee_concessions (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    fee_head_id INTEGER NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    concession_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (school_id, student_id, fee_head_id),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

-- Assumes the function `update_updated_at_column` already exists from a previous migration.
CREATE TRIGGER update_student_fee_concessions_updated_at
    BEFORE UPDATE ON public.student_fee_concessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_student_fee_concessions_student ON public.student_fee_concessions(school_id, student_id); 