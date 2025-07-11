'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  RefreshCw
} from 'lucide-react'
import Papa from 'papaparse'

interface CsvUploaderProps {
  farmaciaId: string
  onUploadComplete?: (result: any) => void
}

interface ParsedData {
  data: any[]
  errors: any[]
  meta: any
}

interface UploadResult {
  success: boolean
  data?: any
  errors?: any[]
}

export function CsvUploader({ farmaciaId, onUploadComplete }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0]
    if (csvFile) {
      setFile(csvFile)
      setUploadResult(null)
      setValidationResult(null)
      parseCSV(csvFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        setParsedData(results)
        console.log('CSV parsed:', results)
      },
      error: (error) => {
        console.error('Error parsing CSV:', error)
        setUploadResult({
          success: false,
          errors: [{ message: `Erro ao ler CSV: ${error.message}` }]
        })
      }
    })
  }

  const validateData = async () => {
    if (!parsedData || !parsedData.data) return

    setUploading(true)
    setUploadProgress(25)

    try {
      const response = await fetch('/api/mcp-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: 'process_upload',
            arguments: {
              farmacia_id: farmaciaId,
              csv_data: parsedData.data,
              validate_only: true
            }
          }
        })
      })

      const result = await response.json()
      setUploadProgress(50)

      if (result.content?.[0]?.text) {
        const mcpResult = JSON.parse(result.content[0].text)
        setValidationResult(mcpResult.data)
        setUploadProgress(100)
      } else {
        throw new Error('Resposta inválida da validação')
      }
    } catch (error) {
      console.error('Erro na validação:', error)
      setUploadResult({
        success: false,
        errors: [{ message: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }]
      })
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const uploadData = async () => {
    if (!parsedData || !parsedData.data) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/mcp-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: 'process_upload',
            arguments: {
              farmacia_id: farmaciaId,
              csv_data: parsedData.data,
              operation: 'upsert',
              validate_only: false
            }
          }
        })
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.content?.[0]?.text) {
        const mcpResult = JSON.parse(result.content[0].text)
        setUploadResult(mcpResult)
        onUploadComplete?.(mcpResult)
      } else {
        throw new Error('Resposta inválida do upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      setUploadResult({
        success: false,
        errors: [{ message: `Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }]
      })
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `codigo_barras,nome,descricao,marca,categoria,subcategoria,tipo,fabricante,preco_custo,preco_venda,estoque_atual,estoque_minimo,unidade,lote,validade,observacoes
1234567890123,Produto A,Produto exemplo categoria A,Marca X,Eletrônicos,Smartphones,Celular,Fabricante A,150.00,299.00,50,10,UN,L001,2025-12-31,Produto exemplo
1234567890124,Produto B,Produto exemplo categoria B,Marca Y,Casa,Cozinha,Utensílio,Fabricante B,25.00,59.00,30,5,UN,L002,2026-06-30,Produto exemplo
1234567890125,Produto C,Produto exemplo categoria C,Marca Z,Vestuário,Camisetas,Roupa,Fabricante C,20.00,45.00,100,15,UN,L003,2025-08-15,Produto exemplo`

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'template-produtos.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetUpload = () => {
    setFile(null)
    setParsedData(null)
    setUploadResult(null)
    setValidationResult(null)
    setUploadProgress(0)
    setShowPreview(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Upload de Produtos</h2>
          <p className="text-gray-400">Importe sua planilha de produtos em formato CSV</p>
        </div>
        <Button onClick={downloadTemplate} variant="secondary" className="bg-gray-700 hover:bg-gray-600 text-white">
          <Download className="w-4 h-4 mr-2" />
          Baixar Template
        </Button>
      </div>

      {/* Instruções */}
      <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">📋 Instruções de Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-400 mb-2">✅ Campos Obrigatórios</h4>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• <strong>codigo_barras</strong>: 13 dígitos únicos</li>
                <li>• <strong>nome</strong>: Nome completo do medicamento</li>
                <li>• <strong>validade</strong>: Data de validade (AAAA-MM-DD)</li>
                <li>• <strong>preco_custo</strong>: Preço de compra (ex: 10.50)</li>
                <li>• <strong>preco_venda</strong>: Preço de venda (ex: 25.90)</li>
                <li>• <strong>estoque_atual</strong>: Quantidade em estoque</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">ℹ️ Campos Opcionais</h4>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• <strong>principio_ativo</strong>: Substância ativa</li>
                <li>• <strong>categoria/subcategoria</strong>: Classificação</li>
                <li>• <strong>fabricante/laboratorio</strong>: Empresa</li>
                <li>• <strong>concentracao</strong>: Dosagem (ex: 500mg)</li>
                <li>• <strong>forma_farmaceutica</strong>: comprimido/xarope</li>
                <li>• <strong>requer_receita</strong>: true/false</li>
                <li>• <strong>tipo_receita</strong>: branca/azul/amarela</li>
                <li>• <strong>lote</strong>: Número do lote</li>
              </ul>
            </div>
          </div>
          
          <Alert className="bg-yellow-950/20 border-yellow-800/30">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-200">
              <strong>Validações importantes:</strong> Preço de custo deve ser menor que preço de venda. 
              Medicamentos controlados devem ter tipo de receita. Margem mínima recomendada: 5%.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700">
        <CardContent className="p-6">
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-950/20' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              {isDragActive ? (
                <p className="text-blue-400">Solte o arquivo CSV aqui...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2 text-white">Arraste seu arquivo CSV aqui</p>
                  <p className="text-gray-400 mb-4">ou clique para selecionar</p>
                  <Button variant="secondary" className="bg-gray-700 hover:bg-gray-600 text-white">
                    Selecionar Arquivo
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-sm text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                      {parsedData && ` • ${parsedData.data.length} produtos`}
                    </p>
                  </div>
                </div>
                <Button onClick={resetUpload} variant="secondary" size="sm" className="bg-gray-700 hover:bg-gray-600 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Trocar Arquivo
                </Button>
              </div>

              {/* Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Processando...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="bg-gray-700" />
                </div>
              )}

              {/* Actions */}
              {parsedData && !uploading && (
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setShowPreview(!showPreview)} 
                    variant="secondary"
                    className="bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Ocultar' : 'Visualizar'} Dados
                  </Button>
                  
                  {!validationResult && (
                    <Button onClick={validateData} variant="secondary" className="bg-gray-700 hover:bg-gray-600 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Validar Dados
                    </Button>
                  )}
                  
                  {validationResult && validationResult.validation_result?.valid_count > 0 && (
                    <Button onClick={uploadData} className="bg-green-600 hover:bg-green-700 text-white">
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar ({validationResult.validation_result.valid_count} produtos)
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && parsedData && (
        <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Prévia dos Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    {Object.keys(parsedData.data[0] || {}).map(key => (
                      <th key={key} className="text-left p-2 font-medium text-gray-300">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.data.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      {Object.values(row).map((value: any, i) => (
                        <td key={i} className="p-2 text-gray-400">
                          {String(value).substring(0, 30)}
                          {String(value).length > 30 && '...'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.data.length > 5 && (
                <p className="text-center text-gray-500 mt-2">
                  ... e mais {parsedData.data.length - 5} linhas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResult && (
        <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              {validationResult.validation_result?.error_count === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
              <span>Resultado da Validação</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {validationResult.total_rows}
                </p>
                <p className="text-sm text-gray-400">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">
                  {validationResult.validation_result?.valid_count || 0}
                </p>
                <p className="text-sm text-gray-400">Válidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">
                  {validationResult.validation_result?.error_count || 0}
                </p>
                <p className="text-sm text-gray-400">Erros</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">
                  {Math.round((validationResult.validation_result?.valid_count || 0) / (validationResult.total_rows || 1) * 100)}%
                </p>
                <p className="text-sm text-gray-400">Taxa Sucesso</p>
              </div>
            </div>

            {validationResult.validation_result?.errors?.length > 0 && (
              <div>
                <h4 className="font-medium text-red-400 mb-2">Erros Encontrados:</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {validationResult.validation_result.errors.slice(0, 10).map((error: any, index: number) => (
                    <div key={index} className="text-sm p-2 bg-red-950/20 rounded border-l-4 border-red-500">
                      <strong className="text-red-300">Linha {error.row}:</strong> <span className="text-red-200">{error.message}</span>
                      {error.field && <span className="text-gray-500"> (Campo: {error.field})</span>}
                    </div>
                  ))}
                  {validationResult.validation_result.errors.length > 10 && (
                    <p className="text-sm text-gray-500 text-center">
                      ... e mais {validationResult.validation_result.errors.length - 10} erros
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              {uploadResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span>Resultado do Upload</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadResult.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-950/20 rounded-lg border border-green-800/30">
                    <p className="text-2xl font-bold text-green-400">
                      {uploadResult.data?.summary?.created || 0}
                    </p>
                    <p className="text-sm text-gray-400">Criados</p>
                  </div>
                  <div className="text-center p-4 bg-blue-950/20 rounded-lg border border-blue-800/30">
                    <p className="text-2xl font-bold text-blue-400">
                      {uploadResult.data?.summary?.updated || 0}
                    </p>
                    <p className="text-sm text-gray-400">Atualizados</p>
                  </div>
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <p className="text-2xl font-bold text-gray-300">
                      {uploadResult.data?.summary?.failed || 0}
                    </p>
                    <p className="text-sm text-gray-400">Falhas</p>
                  </div>
                </div>
                <Alert className="bg-green-950/20 border-green-800/30">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-200">
                    Upload concluído com sucesso! {uploadResult.data?.summary?.successful || 0} produtos processados.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert variant="destructive" className="bg-red-950/20 border-red-800/30">
                <XCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">
                  {uploadResult.errors?.[0]?.message || 'Erro no upload'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}