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
  Calculator
} from 'lucide-react';
import { PriceAnalyzer } from '@/components/price-analyzer-component';

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
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
      value: '12', 
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-500'
    }
  ];

  const expiringProducts = [
    { 
      name: 'Dipirona 500mg', 
      expiryDate: '15/01/2024', 
      daysLeft: 30, 
      quantity: 45,
      currentPrice: 'R$ 8,90',
      suggestedDiscount: '30%'
    },
    { 
      name: 'Paracetamol 750mg', 
      expiryDate: '28/01/2024', 
      daysLeft: 43, 
      quantity: 67,
      currentPrice: 'R$ 12,50',
      suggestedDiscount: '20%'
    },
    { 
      name: 'Vitamina C', 
      expiryDate: '05/02/2024', 
      daysLeft: 51, 
      quantity: 23,
      currentPrice: 'R$ 15,00',
      suggestedDiscount: '15%'
    },
    { 
      name: 'Xarope Expectorante', 
      expiryDate: '20/02/2024', 
      daysLeft: 66, 
      quantity: 12,
      currentPrice: 'R$ 22,00',
      suggestedDiscount: '10%'
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
              {expiringProducts.map((product, index) => (
                <div key={index} className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-all border border-gray-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-white">{product.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-300">
                        <span>Validade: {product.expiryDate}</span>
                        <span className={`font-semibold ${
                          product.daysLeft < 45 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {product.daysLeft} dias
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-gray-300">Qtd: {product.quantity}</span>
                        <span className="text-gray-300">Preço: {product.currentPrice}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs border border-green-500/30">
                        <Tag className="w-3 h-3" />
                        <span>{product.suggestedDiscount}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">desconto sugerido</p>
                    </div>
                  </div>
                </div>
              ))}
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
            {[
              { name: 'Vitamina D', margin: '68%', price: 'R$ 35,00', sales: '42/mês' },
              { name: 'Ômega 3', margin: '62%', price: 'R$ 45,00', sales: '38/mês' },
              { name: 'Protetor Solar FPS60', margin: '58%', price: 'R$ 55,00', sales: '25/mês' },
              { name: 'Colágeno Hidrolisado', margin: '55%', price: 'R$ 65,00', sales: '30/mês' }
            ].map((product, index) => (
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
    </div>
  );
}