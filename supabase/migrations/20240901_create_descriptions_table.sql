CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.specialfines_descriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
