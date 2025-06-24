'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, TrendingUp, TrendingDown, Minus, RefreshCw, Database, Globe } from 'lucide-react'

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
  const [useMockData, setUseMockData] = useState(process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true')

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
          estado,
          useMockData
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

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/price-analysis/clear-cache', {
        method: 'POST'
      })
      if (response.ok) {
        alert('Cache limpo com sucesso!')
      }
    } catch (err) {
      console.error('Erro ao limpar cache:', err)
    }
  }

  const toggleMockData = () => {
    setUseMockData(!useMockData)
  }

  const getSourceIcon = (fonte: string) => {
    switch (fonte) {
      case 'exa_search':
        return <Globe className="h-4 w-4 text-purple-600" />
      case 'consultaremedios':
      case 'cliquefarma':
        return <Globe className="h-4 w-4 text-blue-600" />
      default:
        return <Database className="h-4 w-4 text-gray-600" />
    }
  }

  const getSourceBadge = (fonte: string) => {
    switch (fonte) {
      case 'exa_search':
        return <Badge variant="outline" className="text-xs">EXA Search</Badge>
      case 'consultaremedios':
        return <Badge variant="outline" className="text-xs">API Real</Badge>
      case 'cliquefarma':
        return <Badge variant="outline" className="text-xs">API Real</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">Dados Demo</Badge>
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

          {/* Controles adicionais */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Limpar Cache
            </Button>
            <Button variant="outline" size="sm" onClick={toggleMockData}>
              {useMockData ? <Globe className="h-4 w-4 mr-1" /> : <Database className="h-4 w-4 mr-1" />}
              {useMockData ? 'Usar APIs Reais' : 'Usar Dados Demo'}
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-600">Fonte atual:</span>
              {useMockData ? (
                <Badge variant="secondary" className="text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  Dados Demo
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  APIs Reais
                </Badge>
              )}
            </div>
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{preco.farmacia}</p>
                        {getSourceIcon(preco.fonte)}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">Fonte: {preco.fonte}</p>
                        {getSourceBadge(preco.fonte)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">R$ {preco.preco.toFixed(2)}</p>
                      <div className="flex gap-1 justify-end">
                        <Badge variant={preco.disponivel ? 'default' : 'secondary'} className="text-xs">
                          {preco.disponivel ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      </div>
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