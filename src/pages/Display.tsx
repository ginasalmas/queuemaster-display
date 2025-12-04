import React, { useEffect, useState } from 'react';
import QueueHeader from '@/components/QueueHeader';
import { getActiveQueueCalls, formatQueueNumber, checkAndResetQueue, speakQueueNumber } from '@/lib/queueManager';
import { supabase } from '@/integrations/supabase/client';
import type { QueueCall } from '@/lib/queueManager';

const Display: React.FC = () => {
  const [queueCalls, setQueueCalls] = useState<QueueCall[]>([]);
  const [latestCall, setLatestCall] = useState<QueueCall | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const resetChecker = setInterval(() => {
      checkAndResetQueue();
    }, 60000);

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
            
            setTimeout(() => {
              speakQueueNumber(newCall.queue_number, newCall.loket_number, newCall.queue_type || 'A');
            }, 500);
            
            const calls = await getActiveQueueCalls('A');
            setQueueCalls(calls);
          }
        }
      )
      .subscribe();

    const loadInitialData = async () => {
      const calls = await getActiveQueueCalls('A');
      setQueueCalls(calls);
      if (calls.length > 0) {
        setLatestCall(calls[0]);
      }
    };

    loadInitialData();

    return () => {
      clearInterval(resetChecker);
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
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

  const loketQueues = {
    1: queueCalls.find(call => call.loket_number === 1),
    2: queueCalls.find(call => call.loket_number === 2),
    3: queueCalls.find(call => call.loket_number === 3),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <QueueHeader />
      
      {/* Running Text Banner */}
      <div className="bg-destructive py-3 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap">
          <span className="text-destructive-foreground text-lg font-semibold mx-8">
            ★ SELAMAT DATANG DI LAYANAN KUNJUNGAN - HARAP PERHATIKAN NOMOR ANTRIAN ANDA ★
          </span>
          <span className="text-destructive-foreground text-lg font-semibold mx-8">
            ★ SELAMAT DATANG DI LAYANAN KUNJUNGAN - HARAP PERHATIKAN NOMOR ANTRIAN ANDA ★
          </span>
          <span className="text-destructive-foreground text-lg font-semibold mx-8">
            ★ SELAMAT DATANG DI LAYANAN KUNJUNGAN - HARAP PERHATIKAN NOMOR ANTRIAN ANDA ★
          </span>
        </div>
      </div>

      <main className="flex-1 p-6">
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left Side - Main Display */}
          <div className="col-span-8 flex flex-col gap-6">
            {/* Date and Time */}
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-lg text-muted-foreground">{formatDate(currentTime)}</p>
              <p className="text-4xl font-bold text-foreground font-mono">{formatTime(currentTime)}</p>
            </div>

            {/* Current Queue Being Called */}
            <div className="flex-1 bg-card border border-border rounded-lg p-8 flex flex-col items-center justify-center">
              <div className="bg-accent/10 px-6 py-2 rounded-full mb-6">
                <h2 className="text-xl font-bold text-accent">NOMOR ANTRIAN DIPANGGIL</h2>
              </div>

              {latestCall ? (
                <div className="text-center animate-scale-in">
                  <div className="text-[8rem] font-black text-foreground leading-none mb-4">
                    {formatQueueNumber(latestCall.queue_number, latestCall.queue_type || 'A')}
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 text-muted-foreground">
                    <span className="text-2xl">→</span>
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-lg text-muted-foreground">Menuju</span>
                    <div className="inline-flex items-center gap-2 bg-primary px-6 py-3 rounded-lg ml-3">
                      <span className="text-3xl font-bold text-primary-foreground">
                        LOKET {latestCall.loket_number}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-6xl opacity-20 mb-4">⏳</div>
                  <p className="text-xl text-muted-foreground">Menunggu Antrian...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Loket List */}
          <div className="col-span-4 flex flex-col gap-4">
            <div className="bg-muted px-4 py-3 rounded-lg text-center">
              <h3 className="text-lg font-bold text-foreground">ANTRIAN PER LOKET</h3>
            </div>

            {[1, 2, 3].map((loketNum) => (
              <div 
                key={loketNum}
                className={`flex-1 rounded-lg p-4 border transition-all duration-300 ${
                  latestCall?.loket_number === loketNum
                    ? 'bg-accent/10 border-accent'
                    : 'bg-card border-border'
                }`}
              >
                <div className="h-full flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      latestCall?.loket_number === loketNum
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      LOKET {loketNum}
                    </span>
                  </div>
                  
                  <div className="text-center">
                    {loketQueues[loketNum as keyof typeof loketQueues] ? (
                      <div className={`text-4xl font-bold ${
                        latestCall?.loket_number === loketNum
                          ? 'text-accent'
                          : 'text-foreground'
                      }`}>
                        {formatQueueNumber(loketQueues[loketNum as keyof typeof loketQueues]!.queue_number, 'A')}
                      </div>
                    ) : (
                      <div className="text-3xl text-muted-foreground/40">---</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-4 px-6 border-t border-border">
        <div className="flex items-center justify-center gap-6">
          <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
            <span className="text-xl">🦅</span>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">PEMASYARAKATAN PASTI BERMANFAAT UNTUK MASYARAKAT</p>
          </div>
          <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
            <span className="text-xl">⚖️</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Display;
