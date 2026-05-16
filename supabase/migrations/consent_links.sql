-- Create the consent_links table
CREATE TABLE IF NOT EXISTS public.consent_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni TEXT NOT NULL,
    worker_name TEXT,
    testigo_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    signed BOOLEAN DEFAULT false,
    pdf_url TEXT,
    phone TEXT -- To store the phone number if needed
);

-- Add RLS policies for public access (only for selecting by ID and updating)
ALTER TABLE public.consent_links ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read a link if they have the ID
CREATE POLICY "Allow public read of consent_links by ID" ON public.consent_links
    FOR SELECT
    USING (true);

-- Allow public update of consent_links (to mark as signed)
CREATE POLICY "Allow public update of consent_links" ON public.consent_links
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users (admins) to do everything
CREATE POLICY "Allow authenticated full access" ON public.consent_links
    FOR ALL
    USING (auth.role() = 'authenticated');
