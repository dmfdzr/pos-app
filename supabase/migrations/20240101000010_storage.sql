-- Create a new bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for storage (allow authenticated users to upload, allow public to read)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'products');

CREATE POLICY "Auth Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'products' AND 
    auth.role() = 'authenticated'
);

CREATE POLICY "Auth Update" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'products' AND 
    auth.role() = 'authenticated'
);

CREATE POLICY "Auth Delete" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'products' AND 
    auth.role() = 'authenticated'
);
