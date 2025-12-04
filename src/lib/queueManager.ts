import { supabase } from "@/integrations/supabase/client";

export interface QueueCall {
  id: string;
  queue_number: number;
  loket_number: number;
  called_at: string;
  is_active: boolean;
  queue_type?: string;
}

export interface QueueState {
  id: string;
  current_number: number;
  last_reset_at: string;
  queue_type?: string;
}

export const getNextQueueNumber = async (queueType: string = 'A'): Promise<number> => {
  const { data: state, error } = await supabase
    .from('queue_state')
    .select('*')
    .eq('queue_type', queueType)
    .maybeSingle();

  if (error) throw error;
  if (!state) throw new Error(`Queue state not found for type ${queueType}`);
  
  const nextNumber = state.current_number + 1;
  
  await supabase
    .from('queue_state')
    .update({ current_number: nextNumber })
    .eq('id', state.id);
  
  return nextNumber;
};

export const callQueue = async (loketNumber: number, queueType: string = 'A'): Promise<QueueCall | null> => {
  try {
    // Get next queue number
    const queueNumber = await getNextQueueNumber(queueType);
    
    // Check if this queue number was already called by another loket
    const { data: existingCall } = await supabase
      .from('queue_calls')
      .select('*')
      .eq('queue_number', queueNumber)
      .eq('queue_type', queueType)
      .eq('is_active', true)
      .maybeSingle();
    
    if (existingCall) {
      console.log('Queue number already called by another loket');
      return null;
    }
    
    // Create new queue call
    const { data, error } = await supabase
      .from('queue_calls')
      .insert({
        queue_number: queueNumber,
        loket_number: loketNumber,
        queue_type: queueType,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error calling queue:', error);
    return null;
  }
};

export const getActiveQueueCalls = async (queueType: string = 'A'): Promise<QueueCall[]> => {
  const { data, error } = await supabase
    .from('queue_calls')
    .select('*')
    .eq('is_active', true)
    .eq('queue_type', queueType)
    .order('called_at', { ascending: false })
    .limit(3);
  
  if (error) throw error;
  return data || [];
};

export const getCurrentQueueNumber = async (queueType: string = 'A'): Promise<number> => {
  const { data, error } = await supabase
    .from('queue_state')
    .select('current_number')
    .eq('queue_type', queueType)
    .maybeSingle();
  
  if (error) throw error;
  return data?.current_number || 0;
};

export const speakQueueNumber = (queueNumber: number, loketNumber: number, queueType: string = 'A') => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Wait a bit before speaking to ensure cancel is processed
    setTimeout(() => {
      const formattedNumber = formatQueueNumber(queueNumber, queueType);
      const text = `Nomor antrian ${formattedNumber}, silahkan menuju ke loket ${loketNumber}`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Event handlers for debugging
      utterance.onstart = () => {
        console.log('Speech started:', text);
      };
      
      utterance.onend = () => {
        console.log('Speech ended');
      };
      
      utterance.onerror = (event) => {
        console.error('Speech error:', event);
      };
      
      window.speechSynthesis.speak(utterance);
    }, 100);
  } else {
    console.warn('Speech synthesis not supported');
  }
};

export const formatQueueNumber = (num: number, queueType: string = 'A'): string => {
  return `${queueType}${String(num).padStart(3, '0')}`;
};

export const checkAndResetQueue = async () => {
  const { error } = await supabase.rpc('check_and_reset_queue');
  if (error) console.error('Error checking queue reset:', error);
};

export const resetQueue = async (queueType: string = 'A'): Promise<boolean> => {
  try {
    // Reset queue state to 0 for specific queue type
    const { error: stateError } = await supabase
      .from('queue_state')
      .update({ current_number: 0, last_reset_at: new Date().toISOString() })
      .eq('queue_type', queueType);

    if (stateError) throw stateError;

    // Deactivate all active queue calls for specific queue type
    const { error: callsError } = await supabase
      .from('queue_calls')
      .update({ is_active: false })
      .eq('is_active', true)
      .eq('queue_type', queueType);

    if (callsError) throw callsError;

    return true;
  } catch (error) {
    console.error('Error resetting queue:', error);
    return false;
  }
};

export const recallLastQueue = async (loketNumber: number, queueType: string = 'A'): Promise<{ queueNumber: number } | null> => {
  try {
    const { data, error } = await supabase
      .from('queue_calls')
      .select('queue_number')
      .eq('loket_number', loketNumber)
      .eq('queue_type', queueType)
      .order('called_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Trigger speech again
    speakQueueNumber(data.queue_number, loketNumber, queueType);
    return { queueNumber: data.queue_number };
  } catch (error) {
    console.error('Error recalling queue:', error);
    return null;
  }
};
