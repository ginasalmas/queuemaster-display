import React from 'react';

interface QueueHeaderProps {
  className?: string;
}

const QueueHeader: React.FC<QueueHeaderProps> = ({ className = '' }) => {
  return (
    <header className={`bg-header-bg py-6 px-8 ${className}`}>
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
          <div className="w-16 h-16 border-2 border-accent-foreground rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-accent-foreground">🦅</span>
          </div>
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-accent uppercase tracking-wide">
            PELAYANAN KUNJUNGAN RUTAN KELAS 1 DEPOK
          </h1>
          <p className="text-foreground text-sm md:text-base mt-1">
            Jl. M. Nasir No. 55, Cilodong, Kota Depok, Jawab barat 164114
          </p>
        </div>
      </div>
    </header>
  );
};

export default QueueHeader;
