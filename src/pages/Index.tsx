import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import QueueHeader from '@/components/QueueHeader';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <QueueHeader />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Sistem Antrian Kunjungan
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Pilih mode yang Anda butuhkan
          </p>
          
          <div className="grid gap-6">
            <Link to="/admin">
              <Button 
                className="w-full bg-queue-loket hover:bg-queue-loket/90 text-white text-2xl py-8"
                size="lg"
              >
                Admin Control Panel
              </Button>
            </Link>
            
            <Link to="/display">
              <Button 
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-2xl py-8"
                size="lg"
              >
                TV Display
              </Button>
            </Link>
          </div>

          <div className="mt-12 p-6 bg-card rounded-lg border border-border">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Cara Penggunaan:</h3>
            <ul className="text-left text-muted-foreground space-y-2">
              <li>• Admin: Tekan keyboard 1, 2, atau 3 untuk memanggil antrian</li>
              <li>• Display: Tampilkan di TV untuk pengunjung</li>
              <li>• Antrian akan reset otomatis setiap jam 12 siang dan malam</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
