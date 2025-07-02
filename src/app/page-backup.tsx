'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  Brain,
  AlertTriangle,
  Calendar,
  Tag,
  Percent,
  Calculator
} from 'lucide-react';
import { PriceAnalyzer } from '@/components/price-analyzer-component';

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [expiringProducts, setExpiringProducts] = useState<any[]>([]);
  const [loadingExpiringProducts, setLoadingExpiringProducts] = useState(true);
  const [errorExpiringProducts, setErrorExpiringProducts] = useState<string | null>(null);
  
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const metrics = [
    { 
      label: 'Vendas Hoje', 
      value: 'R$ 847', 
      icon: ShoppingCart,
      color: 'from-green-500 to-emerald-500'
    },
    { 
      label: 'Produtos', 
      value: '247', 
      icon: Package,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      label: 'Clientes', 
      value: '89', 
      icon: Users,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      label: 'Próx. Vencimento', 
      value: loadingExpiringProducts ? '...' : errorExpiringProducts ? 'Erro' : expiringProducts.length.toString(), 
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-500'
    }
  ];

  // Placeholder for farmaciaId - replace with actual logic to get the current pharmacy ID
  const farmaciaId = "550e8400-e29b-41d4-a716-446655440000"; // Example ID from your schema.sql

  useEffect(() => {
    const fetchExpiringProducts = async () => {
      try {
        setLoadingExpiringProducts(true);
        setErrorExpiringProducts(null);
        
        // Mock data for now - replace with actual API call
        setTimeout(() => {
          setExpiringProducts([
            { id: 1, name: 'Produto A', expiry: new Date('2024-07-15') },
            { id: 2, name: 'Produto B', expiry: new Date('2024-07-20') }
          ]);
          setLoadingExpiringProducts(false);
        }, 1000);
        
      } catch (error) {
        console.error('Erro ao buscar produtos vencendo:', error);
        setErrorExpiringProducts('Falha ao carregar produtos');
        setLoadingExpiringProducts(false);
      }
    };

    fetchExpiringProducts();
  }, [farmaciaId]);

  const todaysOrders = [
    { id: 1, customer: 'Maria Silva', total: 'R$ 89,90', status: 'Entregue', time: '14:30' },
    { id: 2, customer: 'João Santos', total: 'R$ 156,40', status: 'Preparando', time: '15:15' },
    { id: 3, customer: 'Ana Costa', total: 'R$ 67,80', status: 'Pendente', time: '15:45' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="text-blue-600" size={32} />
              FarmacIA Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Bem-vindo ao seu assistente inteligente para farmácia
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
            </div>
            <div className="text-sm text-gray-600">
              {currentTime ? format(currentTime, 'dd/MM/yyyy') : '--/--/----'}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden rounded-lg bg-white p-6 shadow-md border"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${metric.color} opacity-5`}></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
                <div className={`rounded-full p-2 bg-gradient-to-r ${metric.color}`}>
                  <metric.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Price Analyzer */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-md border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="text-green-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Análise de Preços</h2>
          </div>
          <PriceAnalyzer />
        </motion.div>

        {/* Today's Orders */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-md border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Pedidos de Hoje</h2>
          </div>
          <div className="space-y-3">
            {todaysOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{order.customer}</p>
                  <p className="text-sm text-gray-600">{order.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{order.total}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'Entregue' ? 'bg-green-100 text-green-800' :
                    order.status === 'Preparando' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Expiring Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-md border p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-red-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Produtos Próximos ao Vencimento</h2>
        </div>
        
        {loadingExpiringProducts ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <p className="mt-2 text-gray-600">Carregando produtos...</p>
          </div>
        ) : errorExpiringProducts ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{errorExpiringProducts}</p>
          </div>
        ) : expiringProducts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Nenhum produto próximo ao vencimento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expiringProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">
                    Vence em: {differenceInDays(product.expiry, new Date())} dias
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    differenceInDays(product.expiry, new Date()) <= 7 ? 'bg-red-100 text-red-800' :
                    differenceInDays(product.expiry, new Date()) <= 30 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {format(product.expiry, 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}