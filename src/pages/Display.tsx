import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import QueueHeader from '@/components/QueueHeader';
import { getActiveQueueCalls, formatQueueNumber, checkAndResetQueue } from '@/lib/queueManager';
import { supabase } from '@/integrations/supabase/client';
import type { QueueCall } from '@/lib/queueManager';

const Display: React.FC = () => {
  const [queueCalls, setQueueCalls] = useState<QueueCall[]>([]);

  useEffect(() => {
    // Check for queue reset every minute
    const resetChecker = setInterval(() => {
      checkAndResetQueue();
    }, 60000);

    // Subscribe to queue calls
    const channel = supabase
      .channel('display-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_calls',
        },
        async () => {
          const calls = await getActiveQueueCalls();
          setQueueCalls(calls);
        }
      )
      .subscribe();

    // Load initial data
    const loadInitialData = async () => {
      const calls = await getActiveQueueCalls();
      setQueueCalls(calls);
    };

    loadInitialData();

    return () => {
      clearInterval(resetChecker);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <QueueHeader />
      
      <div className="bg-destructive py-4 px-8">
        <p className="text-center text-destructive-foreground text-xl font-semibold">
          SELAMAT DATANG DI LAYANAN KUNJUNGAN - HARAP PERHATIKAN NOMOR ANTRIAN ANDA
        </p>
      </div>

      <main className="flex-1 container mx-auto px-8 py-12 flex items-center justify-center">
        <Card className="w-full max-w-6xl p-12 bg-card border-4 border-display-border">
          <div className="grid grid-cols-2 gap-16">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold text-queue-number text-center">
                ANTRIAN
              </h2>
              <div className="space-y-6">
                {queueCalls.map((call, index) => (
                  <div 
                    key={call.id}
                    className="text-center transform transition-all duration-500"
                    style={{
                      animation: index === 0 ? 'pulse 2s infinite' : 'none'
                    }}
                  >
                    <div className="text-8xl font-bold text-queue-number">
                      {formatQueueNumber(call.queue_number)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="space-y-8">
                <div className="flex items-center justify-center mb-12">
                  <div className="text-8xl text-accent">→</div>
                </div>
                <h2 className="text-4xl font-bold text-queue-loket text-center mb-8">
                  LOKET
                </h2>
                <div className="space-y-6">
                  {queueCalls.map((call) => (
                    <div key={call.id} className="text-center">
                      <div className="text-8xl font-bold text-queue-loket">
                        {String(call.loket_number).padStart(3, '0')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </main>

      <footer className="bg-header-bg py-6 px-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
              <span className="text-2xl">🦅</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">
              PEMASYARAKATAN PASTI
            </p>
            <p className="text-2xl font-bold text-accent">
              BERMANFAAT UNTUK MASYARAKAT
            </p>
          </div>
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
            <span className="text-2xl">⚖️</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};

export default Display;
