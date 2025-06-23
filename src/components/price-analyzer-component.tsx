'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PriceAnalysisResult {
  produto_local: {
    nome: string
    preco_venda: number
    preco_custo: number
    estoque_atual: number
  }
  precos_externos: Array<{
    farmacia: string
    preco: number
    disponivel: boolean
    estado: string
    fonte: string
  }>
  preco_medio_mercado: number
  posicao_competitiva: 'abaixo' | 'medio' | 'acima'
  recomendacao: string
  margem_atual: number
}

export function PriceAnalyzer() {
  const farmaciaId = process.env.NEXT_PUBLIC_FARMACIA_ID || ''
  const [medicamento, setMedicamento] = useState('')
  const [estado, setEstado] = useState('SP')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PriceAnalysisResult | null>(null)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    if (!medicamento.trim()) {
      setError('Digite o nome do medicamento')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/price-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmacia_id: farmaciaId,
          medicamento: medicamento.trim(),
          estado
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro na análise')
      }

      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'abaixo':
        return <TrendingDown className="h-4 w-4 text-green-600" />
      case 'acima':
        return <TrendingUp className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-yellow-600" />
    }
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'abaixo':
        return 'bg-green-100 text-green-800'
      case 'acima':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getPositionText = (position: string) => {
    switch (position) {
      case 'abaixo':
        return 'Abaixo do Mercado'
      case 'acima':
        return 'Acima do Mercado'
      default:
        return 'Médio de Mercado'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Analisador de Preços
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Digite o nome do medicamento ou código de barras"
                value={medicamento}
                onChange={(e) => setMedicamento(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              />
            </div>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SP">SP</SelectItem>
                <SelectItem value="RJ">RJ</SelectItem>
                <SelectItem value="MG">MG</SelectItem>
                <SelectItem value="RS">RS</SelectItem>
                <SelectItem value="PR">PR</SelectItem>
                <SelectItem value="SC">SC</SelectItem>
                <SelectItem value="BA">BA</SelectItem>
                <SelectItem value="GO">GO</SelectItem>
                <SelectItem value="PE">PE</SelectItem>
                <SelectItem value="CE">CE</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analisar
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Produto Local */}
          <Card>
            <CardHeader>
              <CardTitle>Produto no Seu Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="font-semibold">{result.produto_local.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Preço de Venda</p>
                  <p className="font-semibold text-green-600">R$ {result.produto_local.preco_venda.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Preço de Custo</p>
                  <p className="font-semibold">R$ {result.produto_local.preco_custo.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estoque</p>
                  <p className="font-semibold">{result.produto_local.estoque_atual} unidades</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Análise Competitiva */}
          <Card>
            <CardHeader>
              <CardTitle>Análise Competitiva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Seu Preço</p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {result.produto_local.preco_venda.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Preço Médio do Mercado</p>
                  <p className="text-2xl font-bold">
                    R$ {result.preco_medio_mercado.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Posição</p>
                  <Badge className={getPositionColor(result.posicao_competitiva)}>
                    {getPositionIcon(result.posicao_competitiva)}
                    <span className="ml-1">{getPositionText(result.posicao_competitiva)}</span>
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Recomendação</h4>
                <p className="text-sm">{result.recomendacao}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Margem Atual</p>
                  <p className="text-lg font-semibold">{result.margem_atual.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Diferença do Mercado</p>
                  <p className="text-lg font-semibold">
                    {result.produto_local.preco_venda > result.preco_medio_mercado ? '+' : ''}
                    R$ {(result.produto_local.preco_venda - result.preco_medio_mercado).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preços Externos */}
          <Card>
            <CardHeader>
              <CardTitle>Preços da Concorrência ({estado})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.precos_externos.map((preco, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{preco.farmacia}</p>
                      <p className="text-sm text-gray-600">Fonte: {preco.fonte}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {preco.preco.toFixed(2)}</p>
                      <Badge variant={preco.disponivel ? 'default' : 'secondary'}>
                        {preco.disponivel ? 'Disponível' : 'Indisponível'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}