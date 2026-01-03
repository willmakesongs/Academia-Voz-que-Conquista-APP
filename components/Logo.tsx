
import React from 'react';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 24,
    md: 40,
    lg: 64,
    xl: 120
  };

  const s = sizeMap[size];

  // Design baseado em "VQC-LOGO MINIMALISTA.PNG":
  // 6 Barras verticais com gradiente de cor (Azul -> Roxo -> Rosa)
  return (
    <svg 
      width={s} 
      height={s} 
      viewBox="0 0 115 130" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Barra 1: Azul Principal - Alta */}
      <rect x="0" y="0" width="15" height="70" rx="7.5" fill="#0081FF" />
      
      {/* Barra 2: Azul - Média */}
      <rect x="20" y="40" width="15" height="35" rx="7.5" fill="#0081FF" />
      
      {/* Barra 3: Roxo Azulado - Curta */}
      <rect x="40" y="45" width="15" height="25" rx="7.5" fill="#6F4CE7" />
      
      {/* Barra 4: Roxo - Longa Descendente (Destaque visual) */}
      <rect x="60" y="45" width="15" height="85" rx="7.5" fill="#9333EA" />
      
      {/* Barra 5: Rosa - Média */}
      <rect x="80" y="45" width="15" height="45" rx="7.5" fill="#EE13CA" />
      
      {/* Barra 6: Magenta - Curta */}
      <rect x="100" y="60" width="15" height="25" rx="7.5" fill="#FF00BC" />
    </svg>
  );
};
