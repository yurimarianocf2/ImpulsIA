'use client'

import { useState } from 'react'
import { CsvUploader } from '@/components/upload/csv-uploader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, FileText, CheckCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

import { getCurrentFarmaciaId } from '@/lib/farmacia-context'

export default function UploadProdutosPage() {
  const [uploadStats, setUploadStats] = useState<any>(null)
  
  // O ID da farmácia agora vem do contexto centralizado
  const farmaciaId = getCurrentFarmaciaId()

  const handleUploadComplete = (result: any) => {
    setUploadStats(result.data?.summary)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header - Glassmorphism effect similar to main page */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="secondary" size="sm" className="bg-gray-700 hover:bg-gray-600 text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center text-white">
                  <Upload className="w-6 h-6 mr-2 text-emerald-400" />
                  Upload de Produtos
                </h1>
                <p className="text-gray-400 text-sm">Importe sua planilha de produtos em lote</p>
              </div>
            </div>
            {uploadStats && (
              <div className="flex space-x-2">
                <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-800/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {uploadStats.created || 0} criados
                </Badge>
                <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-800/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {uploadStats.updated || 0} atualizados
                </Badge>
                {(uploadStats.failed || 0) > 0 && (
                  <Badge variant="outline" className="bg-red-950/20 text-red-400 border-red-800/30">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {uploadStats.failed} falhas
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Upload Area */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl flex items-center text-white">
                  <Upload className="w-5 h-5 mr-2 text-emerald-400" />
                  Área de Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CsvUploader 
                  farmaciaId={farmaciaId}
                  onUploadComplete={handleUploadComplete}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            {/* Quick Stats */}
            <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700 shadow-md overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center text-white">
                  <Info className="w-4 h-4 mr-2 text-emerald-400" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <Separator className="bg-gray-700/50" />
              <CardContent className="space-y-3 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Produtos ativos:</span>
                  <span className="font-semibold text-white">247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Categorias:</span>
                  <span className="font-semibold text-white">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Último upload:</span>
                  <span className="font-semibold text-sm text-white">Nunca</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa de sucesso:</span>
                  <span className="font-semibold text-emerald-400">-</span>
                </div>
              </CardContent>
            </Card>

            {/* Best Practices */}
            <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700 shadow-md overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center text-white">
                  <HelpCircle className="w-4 h-4 mr-2 text-emerald-400" />
                  Dicas
                </CardTitle>
              </CardHeader>
              <Separator className="bg-gray-700/50" />
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-emerald-400">✅ Boas Práticas</h4>
                  <ul className="text-sm space-y-1 text-gray-300">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Sempre baixe o template</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Valide antes de enviar</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Use UTF-8 para acentos</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Máximo 5.000 produtos</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-red-400">❌ Evite</h4>
                  <ul className="text-sm space-y-1 text-gray-300">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Códigos de barras duplicados</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Preços de custo venda</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Campos obrigatórios vazios</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Caracteres especiais</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700 shadow-md overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center text-white">
                  <HelpCircle className="w-4 h-4 mr-2 text-emerald-400" />
                  Suporte
                </CardTitle>
              </CardHeader>
              <Separator className="bg-gray-700/50" />
              <CardContent className="space-y-3 pt-4">
                <p className="text-sm text-gray-300">
                  Precisa de ajuda com o upload? Nossa equipe está aqui para ajudar!
                </p>
                <div className="space-y-2">
                  <Button variant="secondary" size="sm" className="w-full bg-gray-700 hover:bg-gray-600 text-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Documentação
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full bg-gray-700 hover:bg-gray-600 text-white">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Chat de Suporte
                  </Button>
                </div>
                <div className="text-xs text-gray-400 space-y-1 mt-2 border-t border-gray-700/50 pt-2">
                  <p>📧 suporte@farmabot.pro</p>
                  <p>📱 (11) 99999-9999</p>
                  <p>🕐 Seg-Sex 9h-18h</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700 shadow-md overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center text-white">
                  <FileText className="w-4 h-4 mr-2 text-emerald-400" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <Separator className="bg-gray-700/50" />
              <CardContent className="pt-4">
                <div className="space-y-3 text-sm">
                  {uploadStats ? (
                    <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-800/30">
                      <p className="font-medium text-emerald-400">Upload concluído</p>
                      <p className="text-emerald-300/80">
                        {uploadStats.created} criados, {uploadStats.updated} atualizados
                      </p>
                      <p className="text-xs text-emerald-400/60 mt-1">Agora mesmo</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-4">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <p>Nenhuma atividade ainda</p>
                      <p className="text-xs mt-1">Faça seu primeiro upload!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}