// Farmacia Context for Multi-tenant Support
// This will replace hardcoded NEXT_PUBLIC_FARMACIA_ID usage

interface FarmaciaInfo {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  whatsapp: string;
  ativo: boolean;
}

// For now, return the environment variable
// TODO: Replace with actual authentication context
export function getCurrentFarmaciaId(): string {
  const farmaciaId = process.env.NEXT_PUBLIC_FARMACIA_ID;
  
  if (!farmaciaId) {
    console.warn('⚠️ NEXT_PUBLIC_FARMACIA_ID not configured. Using Farmácia Saúde Total.');
    return '550e8400-e29b-41d4-a716-446655440001'; // Farmácia Saúde Total (SP)
  }
  
  return farmaciaId;
}

// TODO: Implement actual authentication and context
export function getFarmaciaInfo(): FarmaciaInfo | null {
  const farmaciaId = getCurrentFarmaciaId();
  
  // Data for real pharmacies
  const farmaciasData: Record<string, FarmaciaInfo> = {
    '550e8400-e29b-41d4-a716-446655440001': {
      id: farmaciaId,
      nome: 'Farmácia Saúde Total',
      cnpj: '12.345.678/0001-10',
      telefone: '11987654321',
      whatsapp: '5511987654321',
      ativo: true
    },
    '550e8400-e29b-41d4-a716-446655440002': {
      id: farmaciaId,
      nome: 'Farmácia Bem Estar',
      cnpj: '98.765.432/0001-20',
      telefone: '21976543210',
      whatsapp: '5521976543210',
      ativo: true
    }
  };
  
  return farmaciasData[farmaciaId] || farmaciasData['550e8400-e29b-41d4-a716-446655440001'];
}

export function getAllFarmacias() {
  return [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      nome: 'Farmácia Saúde Total',
      cidade: 'São Paulo',
      estado: 'SP'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002', 
      nome: 'Farmácia Bem Estar',
      cidade: 'Rio de Janeiro',
      estado: 'RJ'
    }
  ]
}

// Hook for React components (future implementation)
// export function useFarmacia() {
//   return {
//     farmacia: getFarmaciaInfo(),
//     isLoading: false,
//     error: null
//   };
// }