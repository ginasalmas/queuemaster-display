import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import QueueHeader from '@/components/QueueHeader';
import { getActiveQueueCalls, formatQueueNumber, checkAndResetQueue, speakQueueNumber } from '@/lib/queueManager';
import { supabase } from '@/integrations/supabase/client';
import type { QueueCall } from '@/lib/queueManager';

const Display: React.FC = () => {
  const [queueCalls, setQueueCalls] = useState<QueueCall[]>([]);
  const [latestCall, setLatestCall] = useState<QueueCall | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
            
            // Speak the queue number - IMPORTANT: Call this on display
            setTimeout(() => {
              speakQueueNumber(newCall.queue_number, newCall.loket_number);
            }, 500);
            
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
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).toUpperCase();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Group queue calls by loket
  const loketQueues = {
    1: queueCalls.find(call => call.loket_number === 1),
    2: queueCalls.find(call => call.loket_number === 2),
    3: queueCalls.find(call => call.loket_number === 3),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <QueueHeader />
      
      <div className="bg-destructive py-4 px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        <p className="text-center text-destructive-foreground text-xl font-bold tracking-wide relative z-10">
          SELAMAT DATANG DI LAYANAN KUNJUNGAN - HARAP PERHATIKAN NOMOR ANTRIAN ANDA
        </p>
      </div>

      <main className="flex-1 container mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left Side - Current Queue and Time */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date and Time */}
            <Card className="bg-gradient-to-br from-card to-primary border-2 border-display-border p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-queue-loket mb-2">
                  {formatDate(currentTime)}
                </p>
                <p className="text-5xl font-bold text-foreground font-mono tracking-wider">
                  {formatTime(currentTime)}
                </p>
              </div>
            </Card>

            {/* Main Display - Current Queue Being Called */}
            <Card className="bg-gradient-to-br from-accent/10 via-card to-card border-4 border-accent p-10 relative overflow-hidden h-[500px] flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-queue-loket/5 animate-pulse" />
              
              <div className="relative z-10 text-center space-y-6">
                <div className="inline-block bg-accent px-8 py-3 rounded-full shadow-lg">
                  <h2 className="text-3xl font-black text-accent-foreground tracking-wider">
                    ANTRIAN DIPANGGIL
                  </h2>
                </div>

                {latestCall ? (
                  <div className="space-y-8 animate-scale-in">
                    <div>
                      <p className="text-2xl font-semibold text-queue-number mb-4">
                        NO ANTRIAN
                      </p>
                      <div className="text-[10rem] font-black text-queue-number leading-none drop-shadow-2xl animate-pulse">
                        {formatQueueNumber(latestCall.queue_number).replace('A', '')}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-8">
                      <div className="text-8xl text-accent animate-pulse">→</div>
                    </div>

                    <div>
                      <p className="text-2xl font-semibold text-queue-loket mb-4">
                        NO LOKET
                      </p>
                      <div className="inline-block bg-queue-loket px-12 py-6 rounded-3xl shadow-2xl">
                        <div className="text-[8rem] font-black text-white leading-none">
                          {formatQueueNumber(latestCall.loket_number).replace('A', '')}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-4">
                      <div className="text-8xl opacity-20">⏳</div>
                      <p className="text-3xl text-muted-foreground">
                        Menunggu Antrian...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Side - Loket List */}
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-3xl font-bold text-foreground">
                ANTRIAN PER LOKET
              </h3>
            </div>

            {[1, 2, 3].map((loketNum) => (
              <Card 
                key={loketNum}
                className={`p-6 border-2 transition-all duration-500 ${
                  latestCall?.loket_number === loketNum
                    ? 'bg-gradient-to-br from-queue-loket/20 to-card border-queue-loket shadow-lg scale-105'
                    : 'bg-gradient-to-br from-card to-primary border-display-border'
                }`}
              >
                <div className="space-y-4">
                  <div className="inline-block bg-queue-loket px-6 py-2 rounded-full">
                    <p className="text-xl font-bold text-white">
                      LOKET {String(loketNum).padStart(3, '0')}
                    </p>
                  </div>
                  
                  {loketQueues[loketNum as keyof typeof loketQueues] ? (
                    <div className="text-center">
                      <div className={`text-7xl font-black transition-all duration-500 ${
                        latestCall?.loket_number === loketNum
                          ? 'text-queue-loket drop-shadow-lg scale-110'
                          : 'text-foreground'
                      }`}>
                        {formatQueueNumber(loketQueues[loketNum as keyof typeof loketQueues]!.queue_number)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-5xl text-muted-foreground/30">---</div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Belum ada antrian
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-header-bg py-6 px-8 border-t-4 border-accent">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">🦅</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-accent tracking-wider drop-shadow-lg">
              PEMASYARAKATAN PASTI
            </p>
            <p className="text-3xl font-black text-accent tracking-wider drop-shadow-lg">
              BERMANFAAT UNTUK MASYARAKAT
            </p>
          </div>
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center shadow-lg">
            <span className="text-3xl">⚖️</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Display;
