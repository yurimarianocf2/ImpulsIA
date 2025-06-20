'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingDown,
  Brain,
  AlertTriangle,
  Calendar,
  DollarSign,
  Calculator,
  Tag,
  Percent
} from 'lucide-react';

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [priceAnalysis, setPriceAnalysis] = useState({
    productName: '',
    myPrice: '',
    competitorPrice: '',
    purchasePrice: ''
  });

  useEffect(() => {
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

  const calculatePriceAnalysis = () => {
    const myPriceNum = parseFloat(priceAnalysis.myPrice.replace(',', '.'));
    const marketAverage = 8.78; // Preço médio do mercado
    const purchasePriceNum = parseFloat(priceAnalysis.purchasePrice.replace(',', '.'));

    if (isNaN(myPriceNum) || isNaN(purchasePriceNum)) {
      return null;
    }

    const profit = myPriceNum - purchasePriceNum;
    const profitMargin = (profit / myPriceNum) * 100;
    const competitorDiff = ((myPriceNum - marketAverage) / marketAverage) * 100;

    return {
      profit: profit.toFixed(2),
      profitMargin: profitMargin.toFixed(1),
      competitorDiff: competitorDiff.toFixed(1),
      recommendation: competitorDiff > 10 ? 'Preço acima do mercado' : 
                     competitorDiff < -10 ? 'Preço muito baixo' : 'Preço competitivo'
    };
  };

  const analysis = calculatePriceAnalysis();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header Simples */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">
              Farmac<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">IA</span>
            </h1>
          </div>
          <div className="text-sm text-gray-400">
            {currentTime.toLocaleString('pt-BR')}
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
              className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                  <metric.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{metric.label}</p>
                  <p className="text-xl font-bold">{metric.value}</p>
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
            className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 text-orange-500 mr-2" />
              Produtos Próximos da Validade
            </h3>
            <div className="space-y-3">
              {expiringProducts.map((product, index) => (
                <div key={index} className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span>Validade: {product.expiryDate}</span>
                        <span className={`font-semibold ${
                          product.daysLeft < 45 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {product.daysLeft} dias
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-gray-400">Qtd: {product.quantity}</span>
                        <span className="text-gray-400">Preço: {product.currentPrice}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                        <Tag className="w-3 h-3" />
                        <span>{product.suggestedDiscount}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">desconto sugerido</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400">
                💡 Dica: Produtos com menos de 60 dias para vencer devem entrar em promoção progressiva
              </p>
            </div>
          </motion.div>

          {/* Analisador de Preços */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calculator className="w-5 h-5 text-blue-500 mr-2" />
              Analisador de Preços
            </h3>
            
            {/* Pesquisa de Produto */}
            <div className="mb-6">
              <label className="text-xs text-gray-400 block mb-1">Pesquisar Produto</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 pr-10"
                  placeholder="Digite o nome do produto..."
                  value={priceAnalysis.productName}
                  onChange={(e) => setPriceAnalysis({...priceAnalysis, productName: e.target.value})}
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preços dos Concorrentes */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-3 text-gray-300">Preços no Mercado</h4>
              <div className="space-y-2">
                {[
                  { name: 'Farmácia Popular', price: 'R$ 8,50', distance: '0.5km', status: 'online' },
                  { name: 'Drogaria São Paulo', price: 'R$ 9,20', distance: '1.2km', status: 'online' },
                  { name: 'Farmácia do Trabalhador', price: 'R$ 7,90', distance: '2.0km', status: 'offline' },
                  { name: 'Drogasil', price: 'R$ 9,50', distance: '1.8km', status: 'online' }
                ].map((competitor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-all">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${competitor.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium">{competitor.name}</p>
                        <p className="text-xs text-gray-500">{competitor.distance}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-blue-400">{competitor.price}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-400 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Preço médio do mercado: <span className="font-bold ml-1">R$ 8,78</span>
                </p>
              </div>
            </div>

            {/* Calculadora de Preços */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-300">Calcular Meu Preço</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Meu Preço</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="R$ 0,00"
                    value={priceAnalysis.myPrice}
                    onChange={(e) => setPriceAnalysis({...priceAnalysis, myPrice: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Preço Médio</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                    placeholder="R$ 8,78"
                    value="R$ 8,78"
                    disabled
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Custo</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="R$ 0,00"
                    value={priceAnalysis.purchasePrice}
                    onChange={(e) => setPriceAnalysis({...priceAnalysis, purchasePrice: e.target.value})}
                  />
                </div>
              </div>

              {analysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-gray-800/50 rounded-lg"
                >
                  <h4 className="text-sm font-semibold mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Análise Competitiva
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Lucro por unidade:</span>
                      <span className="text-green-400 font-medium">R$ {analysis.profit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Margem de lucro:</span>
                      <span className="text-blue-400 font-medium">{analysis.profitMargin}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vs. Média do Mercado:</span>
                      <span className={`font-medium ${
                        parseFloat(analysis.competitorDiff) > 10 ? 'text-red-400' :
                        parseFloat(analysis.competitorDiff) < -10 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {parseFloat(analysis.competitorDiff) > 0 ? '+' : ''}{analysis.competitorDiff}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Gráfico Visual de Comparação */}
                  <div className="mt-4 space-y-2">
                    <div className="text-xs text-gray-400">Posição no Mercado</div>
                    <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-1/4 bg-red-500/20 border-r border-red-500"></div>
                      <div className="absolute inset-y-0 left-1/4 w-1/2 bg-green-500/20 border-r border-green-500"></div>
                      <div className="absolute inset-y-0 right-0 w-1/4 bg-yellow-500/20"></div>
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white"
                        style={{ left: '45%' }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Muito Barato</span>
                      <span className="text-green-400">Ideal</span>
                      <span>Muito Caro</span>
                    </div>
                  </div>

                  <div className={`mt-3 p-2 rounded text-xs text-center font-medium ${
                    analysis.recommendation === 'Preço competitivo' ? 'bg-green-500/20 text-green-400' :
                    analysis.recommendation === 'Preço acima do mercado' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {analysis.recommendation}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Top Produtos com Melhor Margem */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
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
              <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">{product.name}</h4>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Margem:</span>
                  <span className="text-green-400 font-bold text-sm">{product.margin}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
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