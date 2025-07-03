'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  Brain,
  AlertTriangle,
  Calendar,
  Tag,
  Percent,
  Calculator,
  Plus,
  Play,
  Pause
} from 'lucide-react';
import { PriceAnalyzer } from '@/components/price-analyzer-component';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useTopProducts } from '@/hooks/useTopProducts';
import { useFarmacia } from '@/hooks/useFarmacia';

interface ExpiringProduct {
  id: string;
  nome: string;
  principio_ativo?: string;
  categoria?: string;
  validade: string;
  dias_para_vencer: number;
  status_validade: string;
  estoque_atual: number;
  preco_venda: number;
  lote?: string;
  urgencia?: string;
  valor_total_estoque?: number;
  recomendacao?: string;
  promocao_ativa?: boolean;
  tipo_promocao?: string;
}

interface PromoOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [expiringProducts, setExpiringProducts] = useState<ExpiringProduct[]>([]);
  const [loadingExpiring, setLoadingExpiring] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExpiringProduct | null>(null);
  
  // Usar hooks para dados reais
  const farmaciaId = '550e8400-e29b-41d4-a716-446655440000'; // Default farmacia ID
  const { metrics: dashboardMetrics, loading: loadingMetrics } = useDashboardMetrics(farmaciaId);
  const { products: topProducts, loading: loadingTopProducts } = useTopProducts(farmaciaId);
  const { farmacia, loading: loadingFarmacia } = useFarmacia(farmaciaId);
  
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchExpiringProducts();
  }, []);

  const fetchExpiringProducts = async () => {
    try {
      setLoadingExpiring(true);
      // Using farmacia context instead of hardcoded value
      const response = await fetch(`/api/expiring-products?farmacia_id=${farmaciaId}`);
      if (response.ok) {
        const data = await response.json();
        setExpiringProducts(data || []);
      } else {
        console.error('Failed to fetch expiring products');
        setExpiringProducts([]);
      }
    } catch (error) {
      console.error('Error fetching expiring products:', error);
      setExpiringProducts([]);
    } finally {
      setLoadingExpiring(false);
    }
  };

  const formatPrice = (price: number): string => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const getUrgencyColor = (urgencia: string): string => {
    switch (urgencia) {
      case 'critica': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'alta': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      case 'media': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'vencido': return '❌';
      case 'vencendo': return '⚠️';
      case 'atencao': return '🔶';
      default: return '✅';
    }
  };

  const calculateSuggestedDiscount = (diasParaVencer: number, urgencia: string): number => {
    if (diasParaVencer < 0) return 50; // Produto vencido
    if (diasParaVencer <= 7) return 40; // Crítico
    if (diasParaVencer <= 15) return 30; // Alta urgência
    if (diasParaVencer <= 30) return 20; // Média urgência
    if (diasParaVencer <= 60) return 15; // Baixa urgência
    return 10; // Preventivo
  };

  const promoOptions: PromoOption[] = [
    { id: 'relampago', label: 'Relâmpago', description: 'Promoção rápida de 24h', icon: '⚡' },
    { id: 'queima', label: 'Queima de Estoque', description: 'Liquidação total do lote', icon: '🔥' },
    { id: 'recorrente', label: 'Recorrente', description: 'Promoção semanal', icon: '🔄' },
    { id: 'contraproposta', label: 'Contraproposta', description: 'Negociação personalizada', icon: '💬' }
  ];

  const handleCreatePromo = (product: ExpiringProduct) => {
    setSelectedProduct(product);
    setShowPromoModal(true);
  };

  const handleSelectPromo = (promoType: string) => {
    if (selectedProduct) {
      // Aqui você implementaria a lógica para ativar a promoção
      console.log('Ativando promoção:', promoType, 'para produto:', selectedProduct.nome);
      
      // Simular ativação da promoção
      setExpiringProducts(prev => 
        prev.map(p => 
          p.id === selectedProduct.id 
            ? { ...p, promocao_ativa: true, tipo_promocao: promoType }
            : p
        )
      );
    }
    setShowPromoModal(false);
    setSelectedProduct(null);
  };

  const togglePromo = (product: ExpiringProduct) => {
    setExpiringProducts(prev => 
      prev.map(p => 
        p.id === product.id 
          ? { ...p, promocao_ativa: !p.promocao_ativa }
          : p
      )
    );
  };

  const metrics = [
    { 
      label: 'Vendas Hoje', 
      value: loadingMetrics ? '...' : dashboardMetrics?.vendas_hoje || 'R$ 0', 
      icon: ShoppingCart,
      color: 'from-green-500 to-emerald-500'
    },
    { 
      label: 'Produtos', 
      value: loadingMetrics ? '...' : dashboardMetrics?.produtos_total || '0', 
      icon: Package,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      label: 'Clientes', 
      value: loadingMetrics ? '...' : dashboardMetrics?.clientes_total || '0', 
      icon: Users,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      label: 'Próx. Vencimento', 
      value: loadingExpiring ? '...' : expiringProducts.length.toString(), 
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-500'
    }
  ];


  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">
              Farmac<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">IA</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <a 
              href="/upload-produtos"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Package className="w-4 h-4" />
              <span>Upload Produtos</span>
            </a>
            <div className="text-sm text-gray-400">
              {currentTime?.toLocaleString('pt-BR') || '--:--:--'}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:bg-gray-800/80"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center shadow-lg`}>
                  <metric.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-300">{metric.label}</p>
                  <p className="text-xl font-bold text-white">{metric.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produtos Próximos da Validade */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
              <Calendar className="w-5 h-5 text-orange-500 mr-2" />
              Produtos Próximos da Validade
            </h3>
            <div className="space-y-3">
              {loadingExpiring ? (
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Carregando produtos...</p>
                </div>
              ) : expiringProducts.length === 0 ? (
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Nenhum produto próximo ao vencimento</p>
                </div>
              ) : (
                expiringProducts.map((product, index) => {
                  const suggestedDiscount = calculateSuggestedDiscount(product.dias_para_vencer, product.urgencia || '');
                  return (
                    <div key={product.id} className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-all border border-gray-600">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{getStatusIcon(product.status_validade)}</span>
                            <h4 className="font-medium text-sm text-white">{product.nome}</h4>
                          </div>
                          
                          {product.principio_ativo && (
                            <p className="text-xs text-gray-400 mb-1">{product.principio_ativo}</p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-300">
                            <span>Validade: {new Date(product.validade).toLocaleDateString('pt-BR')}</span>
                            <span className={`font-semibold ${
                              product.dias_para_vencer < 0 ? 'text-red-400' :
                              product.dias_para_vencer <= 7 ? 'text-red-400' :
                              product.dias_para_vencer <= 30 ? 'text-orange-400' : 'text-yellow-400'
                            }`}>
                              {product.dias_para_vencer < 0 ? 'Vencido' : `${product.dias_para_vencer} dias`}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-gray-300">Estoque: {product.estoque_atual}</span>
                            <span className="text-gray-300">Preço: {formatPrice(product.preco_venda)}</span>
                            {product.lote && <span className="text-gray-400">Lote: {product.lote}</span>}
                          </div>
                          
                          {product.valor_total_estoque && (
                            <div className="text-xs text-gray-400 mt-1">
                              Valor total: {formatPrice(product.valor_total_estoque)}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right space-y-2">
                          {/* Desconto Sugerido */}
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs border border-green-500/30 bg-green-500/10">
                            <Tag className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 font-bold">{suggestedDiscount}%</span>
                          </div>
                          
                          {/* Status da Promoção */}
                          {product.promocao_ativa && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-green-500/30 bg-green-500/10">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-xs">{product.tipo_promocao || 'Ativa'}</span>
                            </div>
                          )}
                          
                          {/* Botão Criar/Gerenciar Promoção */}
                          <button
                            onClick={() => product.promocao_ativa ? togglePromo(product) : handleCreatePromo(product)}
                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                              product.promocao_ativa 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                            }`}
                          >
                            {product.promocao_ativa ? (
                              <>
                                <Pause className="w-3 h-3" />
                                <span>Pausar</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Criar Promoção</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300">
                💡 Dica: Produtos com menos de 60 dias para vencer devem entrar em promoção progressiva
              </p>
            </div>
          </motion.div>

          {/* Analisador de Preços */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <PriceAnalyzer />
          </motion.div>
        </div>

        {/* Top Produtos com Melhor Margem */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <Percent className="w-5 h-5 text-green-500 mr-2" />
            Produtos com Melhor Margem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(loadingTopProducts ? [
              { name: 'Carregando...', margin: '...', price: '...', sales: '...' },
              { name: 'Carregando...', margin: '...', price: '...', sales: '...' },
              { name: 'Carregando...', margin: '...', price: '...', sales: '...' },
              { name: 'Carregando...', margin: '...', price: '...', sales: '...' }
            ] : topProducts).map((product, index) => (
              <div key={index} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-700/70 transition-all">
                <h4 className="font-medium text-sm mb-2 text-white">{product.name}</h4>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300">Margem:</span>
                  <span className="text-green-400 font-bold text-sm">{product.margin}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>{product.price}</span>
                  <span>{product.sales}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Modal de Criação de Promoção */}
      {showPromoModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Criar Promoção - {selectedProduct.nome}
            </h3>
            
            <div className="space-y-3 mb-6">
              {promoOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectPromo(option.id)}
                  className="w-full p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{option.icon}</span>
                    <div>
                      <h4 className="font-medium text-white">{option.label}</h4>
                      <p className="text-xs text-gray-400">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowPromoModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}