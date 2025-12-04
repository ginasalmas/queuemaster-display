import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatQueueNumber } from '@/lib/queueManager';
import { jsPDF } from 'jspdf';
import { toast } from '@/hooks/use-toast';
import QueueHeader from '@/components/QueueHeader';

interface QueueType {
  id: string;
  label: string;
  description: string;
  prefix: string;
  icon: string;
}

const queueTypes: QueueType[] = [
  {
    id: 'A',
    label: 'Pendaftaran Kunjungan',
    description: 'Untuk pendaftaran kunjungan baru',
    prefix: 'A',
    icon: '📝',
  },
  {
    id: 'B',
    label: 'Informasi',
    description: 'Untuk pertanyaan dan informasi umum',
    prefix: 'B',
    icon: 'ℹ️',
  },
];

const Kiosk = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const generateTicketPDF = (queueNumber: number, queueType: QueueType) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150], // Thermal printer size
    });

    const formattedNumber = `${queueType.prefix}${String(queueNumber).padStart(3, '0')}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEM ANTRIAN', 40, 15, { align: 'center' });
    doc.text('KUNJUNGAN', 40, 22, { align: 'center' });

    // Divider
    doc.setLineWidth(0.5);
    doc.line(5, 28, 75, 28);

    // Queue Type
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(queueType.label.toUpperCase(), 40, 38, { align: 'center' });

    // Queue Number (Large)
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(formattedNumber, 40, 65, { align: 'center' });

    // Divider
    doc.line(5, 75, 75, 75);

    // Date and Time
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, 40, 85, { align: 'center' });
    doc.text(`Waktu: ${timeStr}`, 40, 92, { align: 'center' });

    // Instructions
    doc.setFontSize(8);
    doc.text('Silahkan tunggu nomor Anda', 40, 105, { align: 'center' });
    doc.text('dipanggil di layar monitor', 40, 111, { align: 'center' });

    // Footer
    doc.line(5, 120, 75, 120);
    doc.setFontSize(7);
    doc.text('Terima kasih atas kunjungan Anda', 40, 128, { align: 'center' });

    // Save PDF
    doc.save(`Antrian-${formattedNumber}.pdf`);
  };

  const handleSelectQueue = async (queueType: QueueType) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setSelectedType(queueType.id);

    try {
      // Get current queue number for this type
      const { data: state, error: stateError } = await supabase
        .from('queue_state')
        .select('*')
        .eq('queue_type', queueType.id)
        .maybeSingle();

      if (stateError) {
        // If no state exists for this type, create it
        if (stateError.code === 'PGRST116') {
          const { data: newState, error: insertError } = await supabase
            .from('queue_state')
            .insert({ queue_type: queueType.id, current_number: 1 })
            .select()
            .single();

          if (insertError) throw insertError;

          generateTicketPDF(1, queueType);
          toast({
            title: 'Tiket Berhasil Dicetak',
            description: `Nomor antrian Anda: ${queueType.prefix}001`,
          });
          return;
        }
        throw stateError;
      }

      const nextNumber = state.current_number + 1;

      // Update queue state
      await supabase
        .from('queue_state')
        .update({ current_number: nextNumber })
        .eq('id', state.id);

      // Generate and download PDF
      generateTicketPDF(nextNumber, queueType);

      toast({
        title: 'Tiket Berhasil Dicetak',
        description: `Nomor antrian Anda: ${queueType.prefix}${String(nextNumber).padStart(3, '0')}`,
      });
    } catch (error) {
      console.error('Error generating ticket:', error);
      toast({
        title: 'Error',
        description: 'Gagal mencetak tiket. Silahkan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setSelectedType(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20">
      <QueueHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Selamat Datang
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Silahkan pilih jenis layanan yang Anda butuhkan
            </p>
          </div>

          {/* Queue Type Selection */}
          <div className="grid md:grid-cols-2 gap-8">
            {queueTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectQueue(type)}
                disabled={isProcessing}
                className={`
                  group relative overflow-hidden rounded-3xl p-8 md:p-12
                  transition-all duration-300 transform
                  ${isProcessing && selectedType === type.id
                    ? 'scale-95 opacity-70'
                    : 'hover:scale-105 hover:shadow-2xl'
                  }
                  ${type.id === 'A'
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                    : 'bg-gradient-to-br from-accent to-accent/80 text-accent-foreground'
                  }
                  shadow-xl
                  disabled:cursor-not-allowed
                `}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  <span className="text-6xl md:text-8xl">{type.icon}</span>
                  
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">
                      {type.label}
                    </h2>
                    <p className="text-lg opacity-90">
                      {type.description}
                    </p>
                  </div>

                  <div className={`
                    px-8 py-3 rounded-full font-semibold text-lg
                    transition-all duration-300
                    ${type.id === 'A'
                      ? 'bg-white/20 group-hover:bg-white/30'
                      : 'bg-white/20 group-hover:bg-white/30'
                    }
                  `}>
                    {isProcessing && selectedType === type.id
                      ? 'Memproses...'
                      : 'Ambil Nomor Antrian'
                    }
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-card/80 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Petunjuk Penggunaan
              </h3>
              <ul className="text-muted-foreground space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Pilih jenis layanan yang Anda butuhkan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Tiket antrian akan otomatis terunduh
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Tunggu nomor Anda dipanggil di layar monitor
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Kiosk;
