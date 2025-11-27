import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import QueueHeader from '@/components/QueueHeader';
import { getActiveQueueCalls, formatQueueNumber, checkAndResetQueue, speakQueueNumber } from '@/lib/queueManager';
import { supabase } from '@/integrations/supabase/client';
import type { QueueCall } from '@/lib/queueManager';

const Display: React.FC = () => {
  const [queueCalls, setQueueCalls] = useState<QueueCall[]>([]);
  const [latestCall, setLatestCall] = useState<QueueCall | null>(null);

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
          event: 'INSERT',
          schema: 'public',
          table: 'queue_calls',
        },
        async (payload) => {
          console.log('New queue call received:', payload);
          if (payload.new) {
            const newCall = payload.new as QueueCall;
            setLatestCall(newCall);
            
            // Speak the queue number
            speakQueueNumber(newCall.queue_number, newCall.loket_number);
            
            // Update the list
            const calls = await getActiveQueueCalls();
            setQueueCalls(calls);
          }
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
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--display-border)) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <QueueHeader />
      
      <div className="bg-destructive py-4 px-8 relative z-10 animate-pulse">
        <p className="text-center text-destructive-foreground text-xl font-semibold tracking-wide">
          SELAMAT DATANG DI LAYANAN KUNJUNGAN - HARAP PERHATIKAN NOMOR ANTRIAN ANDA
        </p>
      </div>

      <main className="flex-1 container mx-auto px-8 py-12 flex items-center justify-center relative z-10">
        <Card className="w-full max-w-6xl p-16 bg-gradient-to-br from-card to-card/80 border-4 border-display-border shadow-2xl relative overflow-hidden">
          {/* Glowing effect for active call */}
          {latestCall && (
            <div className="absolute inset-0 animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-r from-queue-number/20 via-transparent to-queue-loket/20" />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-20 relative z-10">
            {/* Queue Numbers Section */}
            <div className="space-y-10">
              <div className="text-center mb-8">
                <h2 className="text-5xl font-bold text-queue-number tracking-wider mb-2 drop-shadow-lg">
                  ANTRIAN
                </h2>
                <div className="h-1 w-32 bg-queue-number mx-auto rounded-full" />
              </div>
              
              <div className="space-y-8">
                {queueCalls.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl text-muted-foreground/30">---</div>
                    <p className="text-muted-foreground mt-4">Belum ada antrian</p>
                  </div>
                ) : (
                  queueCalls.map((call, index) => (
                    <div 
                      key={call.id}
                      className={`text-center transform transition-all duration-700 ${
                        index === 0 ? 'scale-110' : 'scale-100'
                      }`}
                      style={{
                        animation: index === 0 ? 'glow 2s ease-in-out infinite' : 'none'
                      }}
                    >
                      <div className={`
                        text-9xl font-black tracking-wider
                        ${index === 0 ? 'text-queue-number drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'text-queue-number/60'}
                        transition-all duration-500
                      `}>
                        {formatQueueNumber(call.queue_number)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Arrow and Loket Section */}
            <div className="flex flex-col justify-center">
              <div className="space-y-10">
                <div className="flex items-center justify-center mb-12">
                  <div className="text-9xl text-accent animate-pulse drop-shadow-lg">
                    →
                  </div>
                </div>
                
                <div className="text-center mb-8">
                  <h2 className="text-5xl font-bold text-queue-loket tracking-wider mb-2 drop-shadow-lg">
                    LOKET
                  </h2>
                  <div className="h-1 w-32 bg-queue-loket mx-auto rounded-full" />
                </div>
                
                <div className="space-y-8">
                  {queueCalls.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl text-muted-foreground/30">-</div>
                    </div>
                  ) : (
                    queueCalls.map((call, index) => (
                      <div 
                        key={call.id} 
                        className={`text-center transform transition-all duration-700 ${
                          index === 0 ? 'scale-110' : 'scale-100'
                        }`}
                      >
                        <div className={`
                          text-9xl font-black tracking-wider
                          ${index === 0 ? 'text-queue-loket drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'text-queue-loket/60'}
                          transition-all duration-500
                        `}>
                          {String(call.loket_number).padStart(3, '0')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </main>

      <footer className="bg-header-bg py-8 px-8 relative z-10 border-t-4 border-accent">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-3xl">🦅</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-accent tracking-wide drop-shadow-lg">
              PEMASYARAKATAN PASTI
            </p>
            <p className="text-3xl font-bold text-accent tracking-wide drop-shadow-lg">
              BERMANFAAT UNTUK MASYARAKAT
            </p>
          </div>
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-3xl">⚖️</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes glow {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.02);
            filter: brightness(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default Display;
