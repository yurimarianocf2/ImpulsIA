import { NextRequest, NextResponse } from 'next/server'
import { ExternalPriceManager } from '@/lib/external-price-apis'

export async function POST(request: NextRequest) {
  try {
    // Limpar cache das APIs externas
    const priceManager = new ExternalPriceManager()
    priceManager.clearCache()
    
    console.log('Cache das APIs foi limpo via endpoint')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache limpo com sucesso' 
    })
  } catch (error) {
    console.error('Erro ao limpar cache:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}