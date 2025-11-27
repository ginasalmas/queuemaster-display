import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import QueueHeader from '@/components/QueueHeader';
import { callQueue, formatQueueNumber, speakQueueNumber, checkAndResetQueue } from '@/lib/queueManager';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LoketState {
  currentQueue: string;
  lastCalled: number;
}

const Admin: React.FC = () => {
  const { toast } = useToast();
  const [lokets, setLokets] = useState<Record<number, LoketState>>({
    1: { currentQueue: 'A000', lastCalled: 0 },
    2: { currentQueue: 'A000', lastCalled: 0 },
    3: { currentQueue: 'A000', lastCalled: 0 },
  });
  const [nextQueue, setNextQueue] = useState('A000');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Check for queue reset every minute
    const resetChecker = setInterval(() => {
      checkAndResetQueue();
    }, 60000);

    // Subscribe to queue calls
    const channel = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_calls',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const call = payload.new;
            setLokets(prev => ({
              ...prev,
              [call.loket_number]: {
                currentQueue: formatQueueNumber(call.queue_number),
                lastCalled: call.queue_number,
              },
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue_state',
        },
        (payload) => {
          if (payload.new) {
            setNextQueue(formatQueueNumber(payload.new.current_number + 1));
          }
        }
      )
      .subscribe();

    // Load initial state
    const loadInitialState = async () => {
      const { data: state } = await supabase
        .from('queue_state')
        .select('*')
        .single();
      
      if (state) {
        setNextQueue(formatQueueNumber(state.current_number + 1));
      }

      const { data: calls } = await supabase
        .from('queue_calls')
        .select('*')
        .eq('is_active', true)
        .order('called_at', { ascending: false });
      
      if (calls) {
        const loketStates: Record<number, LoketState> = {
          1: { currentQueue: 'A000', lastCalled: 0 },
          2: { currentQueue: 'A000', lastCalled: 0 },
          3: { currentQueue: 'A000', lastCalled: 0 },
        };
        
        calls.forEach(call => {
          if (!loketStates[call.loket_number].lastCalled || 
              call.queue_number > loketStates[call.loket_number].lastCalled) {
            loketStates[call.loket_number] = {
              currentQueue: formatQueueNumber(call.queue_number),
              lastCalled: call.queue_number,
            };
          }
        });
        
        setLokets(loketStates);
      }
    };

    loadInitialState();

    return () => {
      clearInterval(timer);
      clearInterval(resetChecker);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '1') handleCallNext(1);
      else if (e.key === '2') handleCallNext(2);
      else if (e.key === '3') handleCallNext(3);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleCallNext = async (loketNumber: number) => {
    const result = await callQueue(loketNumber);
    
    if (result) {
      speakQueueNumber(result.queue_number, loketNumber);
      toast({
        title: "Antrian Dipanggil",
        description: `${formatQueueNumber(result.queue_number)} dipanggil ke Loket ${loketNumber}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Nomor antrian sudah dipanggil oleh loket lain",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <QueueHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Admin Control Panel</h2>
          <p className="text-muted-foreground">
            Tekan Keyboard 1, 2, Atau 3 Untuk Memanggil Antrian Selanjutnya
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 bg-primary border-display-border border-2">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-muted-foreground mb-4">
                {formatDate(currentTime)}
              </h3>
              <div className="text-5xl font-bold text-foreground font-mono">
                {formatTime(currentTime)}
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-primary border-display-border border-2">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-muted-foreground mb-4">
                ANTRIAN SELANJUTNYA
              </h3>
              <div className="text-7xl font-bold text-foreground">
                {nextQueue}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((loketNum) => (
            <Card key={loketNum} className="p-6 bg-secondary border-display-border border-2">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-foreground">
                  LOKET {loketNum}
                </h3>
                
                <div className="bg-primary rounded-xl p-6 border-2 border-display-border">
                  <div className="text-6xl font-bold text-foreground">
                    {lokets[loketNum].currentQueue}
                  </div>
                </div>

                <Button
                  onClick={() => handleCallNext(loketNum)}
                  className="w-full bg-queue-loket hover:bg-queue-loket/90 text-white text-lg py-6 rounded-xl font-semibold"
                  size="lg"
                >
                  Call Next ({loketNum})
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Admin;
