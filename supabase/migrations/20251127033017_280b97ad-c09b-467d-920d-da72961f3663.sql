-- Create queue state table to track current queue numbers
CREATE TABLE public.queue_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_number INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create queue calls table to track which queues have been called
CREATE TABLE public.queue_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_number INTEGER NOT NULL,
  loket_number INTEGER NOT NULL CHECK (loket_number IN (1, 2, 3)),
  called_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.queue_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_calls ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this system)
CREATE POLICY "Allow public read on queue_state"
  ON public.queue_state
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on queue_state"
  ON public.queue_state
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on queue_state"
  ON public.queue_state
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public read on queue_calls"
  ON public.queue_calls
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on queue_calls"
  ON public.queue_calls
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on queue_calls"
  ON public.queue_calls
  FOR UPDATE
  USING (true);

-- Insert initial queue state
INSERT INTO public.queue_state (current_number) VALUES (0);

-- Function to reset queue at specified times (12 noon and midnight)
CREATE OR REPLACE FUNCTION public.check_and_reset_queue()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  last_reset TIMESTAMP WITH TIME ZONE;
  current_hour INTEGER;
BEGIN
  SELECT last_reset_at INTO last_reset FROM public.queue_state LIMIT 1;
  current_hour := EXTRACT(HOUR FROM NOW());
  
  -- Reset at 12:00 (noon) or 00:00 (midnight)
  IF (current_hour = 12 OR current_hour = 0) AND 
     (last_reset IS NULL OR 
      DATE_TRUNC('hour', last_reset) < DATE_TRUNC('hour', NOW())) THEN
    
    UPDATE public.queue_state SET current_number = 0, last_reset_at = NOW();
    UPDATE public.queue_calls SET is_active = false;
  END IF;
END;
$$;

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_calls;