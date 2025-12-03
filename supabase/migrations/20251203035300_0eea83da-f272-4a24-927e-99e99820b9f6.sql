-- Add queue_type column to queue_state table
ALTER TABLE public.queue_state ADD COLUMN IF NOT EXISTS queue_type TEXT DEFAULT 'A';

-- Add queue_type column to queue_calls table  
ALTER TABLE public.queue_calls ADD COLUMN IF NOT EXISTS queue_type TEXT DEFAULT 'A';

-- Insert separate queue state for type B (Informasi)
INSERT INTO public.queue_state (queue_type, current_number) 
VALUES ('B', 0)
ON CONFLICT DO NOTHING;

-- Create unique constraint on queue_type for queue_state
CREATE UNIQUE INDEX IF NOT EXISTS queue_state_type_unique ON public.queue_state(queue_type);