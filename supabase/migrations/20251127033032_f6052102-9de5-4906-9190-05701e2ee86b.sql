-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.check_and_reset_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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