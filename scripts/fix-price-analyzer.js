#!/usr/bin/env node

/**
 * Script para corrigir o Price Analyzer e usar o esquema consolidado
 * Remove dependência de dados mock e conecta às tabelas reais
 */

const fs = require('fs').promises;
const path = require('path');

console.log('🔧 CORRIGINDO PRICE ANALYZER PARA ESQUEMA CONSOLIDADO\n');

async function updatePriceAnalyzer() {
  const filePath = path.join(__dirname, '../src/lib/price-analyzer.ts');
  
  try {
    console.log('📝 Lendo price-analyzer.ts...');
    let content = await fs.readFile(filePath, 'utf8');
    
    // Backup do arquivo original
    const backupPath = filePath + '.backup';
    await fs.writeFile(backupPath, content);
    console.log('💾 Backup criado em price-analyzer.ts.backup');
    
    // Correção 1: Atualizar tabela de produtos para medicamentos
    content = content.replace(
      /\.from\('produtos'\)/g,
      ".from('medicamentos')"
    );
    
    // Correção 2: Atualizar tabela de análises
    content = content.replace(
      /\.from\('analises_preco'\)/g,
      ".from('analises_preco_consolidada')"
    );
    
    // Correção 3: Atualizar campo produto_id para medicamento_id
    content = content.replace(
      /produto_id: analise\.produto_local\?\.id/g,
      "medicamento_id: analise.produto_local?.id"
    );
    
    // Correção 4: Adicionar flag isMockData na interface
    const interfacePattern = /interface PriceAnalysis \{[^}]+\}/;
    const newInterface = `interface PriceAnalysis {
  produto_local: Product | null
  precos_externos: ExternalPrice[]
  preco_medio_mercado: number
  posicao_competitiva: 'abaixo' | 'medio' | 'acima'
  recomendacao: string
  margem_atual: number
  isMockData: boolean
  dataSource: 'database' | 'mock' | 'fallback'
}`;
    
    content = content.replace(interfacePattern, newInterface);
    
    // Correção 5: Atualizar método buscarProdutoLocal para incluir flags
    const buscarProdutoPattern = /async buscarProdutoLocal\(termo: string\): Promise<Product \| null> \{[\s\S]*?return data[\s\S]*?\}/;
    const newBuscarProduto = `async buscarProdutoLocal(termo: string): Promise<{product: Product | null, isMockData: boolean, dataSource: string}> {
    // Se modo mock estiver ativo ou Supabase indisponível, usar dados mock
    if (this.useMockData) {
      const mockProduct = this.getMockProduct(termo)
      return {
        product: mockProduct,
        isMockData: true,
        dataSource: 'mock'
      }
    }

    try {
      const { data, error } = await supabase
        .from('medicamentos')
        .select('*')
        .eq('farmacia_id', this.farmaciaId)
        .eq('ativo', true)
        .or(\`nome.ilike.%\${termo}%,principio_ativo.ilike.%\${termo}%,codigo_barras.eq.\${termo}\`)
        .limit(1)
        .single()

      if (error) {
        console.error('Erro ao buscar produto:', error)
        // Fallback para dados mock se Supabase falhar
        const mockProduct = this.getMockProduct(termo)
        return {
          product: mockProduct,
          isMockData: true,
          dataSource: 'fallback'
        }
      }

      return {
        product: data,
        isMockData: false,
        dataSource: 'database'
      }
    } catch (error) {
      console.error('Erro na busca local:', error)
      // Fallback para dados mock se Supabase falhar
      const mockProduct = this.getMockProduct(termo)
      return {
        product: mockProduct,
        isMockData: true,
        dataSource: 'fallback'
      }
    }
  }`;
    
    content = content.replace(buscarProdutoPattern, newBuscarProduto);
    
    // Correção 6: Atualizar método analisarPrecos para usar nova estrutura
    const analisarPrecosPattern = /const produtoLocal = await this\.buscarProdutoLocal\(termo\)[\s\S]*?if \(!produtoLocal\) \{[\s\S]*?\}/;
    const newAnalisarPrecos = `const produtoResult = await this.buscarProdutoLocal(termo)
    const produtoLocal = produtoResult.product
    
    if (!produtoLocal) {
      throw new Error('Produto não encontrado no estoque local')
    }`;
    
    content = content.replace(analisarPrecosPattern, newAnalisarPrecos);
    
    // Correção 7: Atualizar retorno do analisarPrecos para incluir flags
    const returnPattern = /return \{[\s\S]*?margem_atual: margemAtual[\s\S]*?\}/;
    const newReturn = `return {
      produto_local: produtoLocal,
      precos_externos: precosExternos,
      preco_medio_mercado: precoMedioMercado,
      posicao_competitiva: posicaoCompetitiva,
      recomendacao,
      margem_atual: margemAtual,
      isMockData: produtoResult.isMockData,
      dataSource: produtoResult.dataSource
    }`;
    
    content = content.replace(returnPattern, newReturn);
    
    // Salvar arquivo corrigido
    await fs.writeFile(filePath, content);
    console.log('✅ price-analyzer.ts atualizado com sucesso!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar price-analyzer.ts:', error.message);
    return false;
  }
}

async function updatePriceAnalyzerComponent() {
  const filePath = path.join(__dirname, '../src/components/price-analyzer-component.tsx');
  
  try {
    console.log('📝 Atualizando componente de análise de preços...');
    let content = await fs.readFile(filePath, 'utf8');
    
    // Backup do arquivo
    const backupPath = filePath + '.backup';
    await fs.writeFile(backupPath, content);
    console.log('💾 Backup criado em price-analyzer-component.tsx.backup');
    
    // Adicionar alerta para dados mock após o resultado
    const alertPattern = /{result && \([\s\S]*?<\/motion\.div>\s*\)\}/;
    const newAlert = `{result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {result.isMockData && (
              <Alert className="bg-yellow-950/20 border-yellow-800/30">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  ⚠️ <strong>Dados de Demonstração</strong>: Este produto não foi encontrado 
                  no seu estoque real. Os dados mostrados são fictícios para demonstração.
                  Fonte: {result.dataSource}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Produto Local */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white flex items-center">
                    <Package className="w-5 h-5 text-blue-400 mr-2" />
                    Produto Local {result.isMockData && <span className="ml-2 text-xs bg-yellow-600 px-2 py-1 rounded">DEMO</span>}
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm"><span className="text-gray-400">Nome:</span> <span className="text-white">{result.produto_local.nome}</span></p>
                    <p className="text-sm"><span className="text-gray-400">Preço:</span> <span className="text-green-400 font-semibold">R$ {result.produto_local.preco_venda.toFixed(2)}</span></p>
                    <p className="text-sm"><span className="text-gray-400">Estoque:</span> <span className="text-white">{result.produto_local.estoque_atual} un</span></p>
                    <p className="text-sm"><span className="text-gray-400">Margem:</span> <span className="text-blue-400">{result.margem_atual.toFixed(1)}%</span></p>
                  </div>
                </div>

                {/* Análise de Mercado */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white flex items-center">
                    <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
                    Análise de Mercado
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm"><span className="text-gray-400">Preço Médio:</span> <span className="text-white">R$ {result.preco_medio_mercado.toFixed(2)}</span></p>
                    <p className="text-sm">
                      <span className="text-gray-400">Posição:</span> 
                      <span className={\`ml-2 px-2 py-1 rounded-full text-xs font-medium \${
                        result.posicao_competitiva === 'abaixo' ? 'bg-green-500/20 text-green-400' :
                        result.posicao_competitiva === 'acima' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }\`}>
                        {result.posicao_competitiva === 'abaixo' ? 'Abaixo do Mercado' :
                         result.posicao_competitiva === 'acima' ? 'Acima do Mercado' : 'Médio'}
                      </span>
                    </p>
                    <p className="text-sm"><span className="text-gray-400">Fontes:</span> <span className="text-white">{result.precos_externos.length} farmácias</span></p>
                  </div>
                </div>
              </div>

              {/* Recomendação */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Recomendação
                </h4>
                <p className="text-blue-200 text-sm">{result.recomendacao}</p>
              </div>

              {/* Preços Externos */}
              {result.precos_externos.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <BarChart3 className="w-4 h-4 text-purple-400 mr-2" />
                    Preços no Mercado
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.precos_externos.slice(0, 6).map((preco, index) => (
                      <div key={index} className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                        <p className="text-xs text-gray-400">{preco.farmacia}</p>
                        <p className="text-sm font-semibold text-white">R$ {preco.preco.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{preco.estado}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}`;
    
    content = content.replace(alertPattern, newAlert);
    
    // Adicionar imports necessários
    if (!content.includes('AlertTriangle')) {
      content = content.replace(
        /from 'lucide-react'/,
        "from 'lucide-react'"
      );
      content = content.replace(
        /} from 'lucide-react'/,
        ", AlertTriangle } from 'lucide-react'"
      );
    }
    
    if (!content.includes('@/components/ui/alert')) {
      content = content.replace(
        /import.*from '@\/components\/ui\/card'/,
        "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';\nimport { Alert, AlertDescription } from '@/components/ui/alert';"
      );
    }
    
    // Salvar arquivo corrigido
    await fs.writeFile(filePath, content);
    console.log('✅ Componente price-analyzer atualizado com sucesso!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar componente:', error.message);
    return false;
  }
}

async function checkSupabaseSchema() {
  console.log('🔍 Verificando esquema do Supabase...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config({ path: '.env.local' });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('⚠️  Variáveis do Supabase não configuradas, pulando verificação');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar se tabela medicamentos existe
    const { data: medicamentos, error: medicamentosError } = await supabase
      .from('medicamentos')
      .select('count')
      .limit(1);
    
    // Verificar se view existe
    const { data: view, error: viewError } = await supabase
      .from('v_medicamentos_vencendo')
      .select('count')
      .limit(1);
    
    if (medicamentosError?.code === '42P01') {
      console.log('❌ Tabela "medicamentos" não existe no Supabase');
      console.log('   Execute o schema consolidado primeiro!');
      return false;
    }
    
    if (viewError?.code === '42P01') {
      console.log('❌ View "v_medicamentos_vencendo" não existe no Supabase');
      console.log('   Execute o schema consolidado primeiro!');
      return false;
    }
    
    console.log('✅ Schema consolidado está aplicado no Supabase');
    return true;
    
  } catch (error) {
    console.log('⚠️  Erro ao verificar Supabase:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando correções do Price Analyzer...\n');
  
  // Verificar schema do Supabase
  const schemaOk = await checkSupabaseSchema();
  if (!schemaOk) {
    console.log('\n🔴 ATENÇÃO: Schema consolidado não está aplicado no Supabase!');
    console.log('📋 Para aplicar:');
    console.log('   1. Abra o Supabase Dashboard');
    console.log('   2. Vá para SQL Editor');
    console.log('   3. Execute database/schema-consolidado.sql');
    console.log('   4. Execute database/aplicar-esquema-consolidado.sql');
    console.log('');
  }
  
  // Aplicar correções no código
  const results = [];
  
  results.push(await updatePriceAnalyzer());
  results.push(await updatePriceAnalyzerComponent());
  
  const successful = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 RESULTADO DAS CORREÇÕES:');
  console.log('============================');
  console.log(`✅ Arquivos corrigidos: ${successful}/${total}`);
  
  if (successful === total) {
    console.log('🎉 TODAS AS CORREÇÕES APLICADAS COM SUCESSO!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Aplicar schema consolidado no Supabase (se ainda não foi feito)');
    console.log('2. Testar o dashboard: npm run dev');
    console.log('3. Buscar por "Dipirona" no analisador de preços');
    console.log('4. Verificar se não aparecem mais dados mock');
  } else {
    console.log('⚠️  Algumas correções falharam. Verifique os logs acima.');
  }
  
  return successful === total;
}

// Executar correções
main()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erro crítico:', error);
    process.exit(1);
  });