import { supabase } from "@/integrations/supabase/client";

export interface QueueCall {
  id: string;
  queue_number: number;
  loket_number: number;
  called_at: string;
  is_active: boolean;
}

export interface QueueState {
  id: string;
  current_number: number;
  last_reset_at: string;
}

export const getNextQueueNumber = async (): Promise<number> => {
  const { data: state, error } = await supabase
    .from('queue_state')
    .select('*')
    .single();

  if (error) throw error;
  
  const nextNumber = state.current_number + 1;
  
  await supabase
    .from('queue_state')
    .update({ current_number: nextNumber })
    .eq('id', state.id);
  
  return nextNumber;
};

export const callQueue = async (loketNumber: number): Promise<QueueCall | null> => {
  try {
    // Get next queue number
    const queueNumber = await getNextQueueNumber();
    
    // Check if this queue number was already called by another loket
    const { data: existingCall } = await supabase
      .from('queue_calls')
      .select('*')
      .eq('queue_number', queueNumber)
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

export const getActiveQueueCalls = async (): Promise<QueueCall[]> => {
  const { data, error } = await supabase
    .from('queue_calls')
    .select('*')
    .eq('is_active', true)
    .order('called_at', { ascending: false })
    .limit(3);
  
  if (error) throw error;
  return data || [];
};

export const getCurrentQueueNumber = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('queue_state')
    .select('current_number')
    .single();
  
  if (error) throw error;
  return data.current_number;
};

export const speakQueueNumber = (queueNumber: number, loketNumber: number) => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Wait a bit before speaking to ensure cancel is processed
    setTimeout(() => {
      const formattedNumber = formatQueueNumber(queueNumber);
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

export const formatQueueNumber = (num: number): string => {
  return `A${String(num).padStart(3, '0')}`;
};

export const checkAndResetQueue = async () => {
  const { error } = await supabase.rpc('check_and_reset_queue');
  if (error) console.error('Error checking queue reset:', error);
};
