# AGENT UX/UI

This file provides specialized guidance for Claude Code when working on user experience and interface design for the Farmácia Chatbot project.

## UX/UI Responsibilities
- Design de fluxos conversacionais otimizados para WhatsApp
- Interface intuitiva para dashboard administrativo
- Experiência do usuário end-to-end (cliente + farmacêutico)
- Design system e componentes reutilizáveis
- Responsividade e acessibilidade
- Micro-interações e feedback visual

## Design Principles

### 1. Conversational UX (WhatsApp)
- **Clareza**: Mensagens simples e diretas
- **Rapidez**: Respostas em menos de 2 segundos
- **Personalização**: Adaptar tom conforme perfil do cliente
- **Contextualização**: Manter histórico da conversa
- **Recuperação de Erro**: Fluxos alternativos quando bot não entende

### 2. Dashboard UX (Farmácia)
- **Eficiência**: Informações críticas sempre visíveis
- **Simplicidade**: Interface limpa e fácil navegação
- **Tempo Real**: Updates instantâneos sem refresh
- **Mobilidade**: Funcional em tablets e celulares
- **Insights**: Dados apresentados de forma acionável

## WhatsApp Conversation Flows

### 1. Fluxo de Boas-vindas
```
🤖 Olá! Sou o assistente virtual da Farmácia [Nome] 💊

Estou aqui para ajudar você a:
🔍 Consultar preços de medicamentos
💊 Obter informações sobre produtos
🛒 Fazer pedidos
📞 Falar com nosso farmacêutico
📍 Ver localização e horários

Digite o número da opção ou me conte o que precisa!
```

**Design Considerations:**
- Emoji para humanizar interação
- Opções numeradas para facilitar seleção
- Texto alternativo livre para flexibilidade
- Nome da farmácia para personalizar

### 2. Fluxo de Consulta de Preços
```
🔍 Qual medicamento você está procurando?

Você pode me dizer:
• Nome do medicamento: "Dipirona"
• Nome + dosagem: "Omeprazol 20mg"
• Princípio ativo: "Paracetamol"

💡 Dica: Se tiver a receita, pode enviar uma foto!
```

**Design Patterns:**
- Ícone de busca para contexto visual
- Exemplos práticos para orientar usuário
- Opção de foto para praticidade
- Linguagem amigável e não técnica

### 3. Apresentação de Resultados
```
🔍 Resultados para: Dipirona 500mg

📍 NOSSA FARMÁCIA:
• Dipirona EMS 500mg - R$ 8,50
  ✅ Disponível (15 unidades)
• Dipirona Genérico - R$ 5,20
  ✅ Disponível (8 unidades)

🏪 COMPARAÇÃO DE PREÇOS:
• Drogasil: R$ 9,20 (+R$ 0,70)
• Raia: R$ 8,90 (+R$ 0,40)

💰 Você economiza até R$ 0,70 conosco!

📱 O que deseja fazer?
1️⃣ Reservar produto
2️⃣ Ver mais informações
3️⃣ Buscar outro medicamento
4️⃣ Falar com farmacêutico
```

**UX Elements:**
- Hierarquia visual clara (nossa farmácia em destaque)
- Comparação direta com concorrentes
- Destaque da economia (psychological pricing)
- Call-to-action claro com próximos passos
- Numeração para facilitar resposta

### 4. Processamento de Pedidos
```
🛒 Seu carrinho:
• Dipirona EMS 500mg - 2 unidades - R$ 17,00

Subtotal: R$ 17,00
Desconto fidelidade (5%): -R$ 0,85
💰 Total: R$ 16,15

🚚 Como prefere receber?
1️⃣ Retirar na farmácia (grátis)
2️⃣ Delivery (R$ 3,00 - 30min)

💳 Formas de pagamento:
• PIX (5% desconto adicional)
• Cartão de débito/crédito
• Dinheiro na entrega
```

**Design Strategy:**
- Resumo claro do pedido
- Transparência total de preços
- Destaque de benefícios (desconto fidelidade)
- Opções de entrega com tempo estimado
- Incentivo para pagamento PIX

## Dashboard UX Design

### 1. Main Dashboard Layout
```
┌─────────────────────────────────────────────┐
│ 📊 Dashboard - Farmácia São João            │
├─────────────────────────────────────────────┤
│ KPIs Principais                             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │  47  │ │ 156  │ │  12  │ │1.847 │        │
│ │Clients│ │ Msgs │ │Orders│ │ R$  │        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────────────┤
│ ⏱️ Atividade em Tempo Real                   │
│ • João Silva perguntou sobre Dipirona       │
│ • Maria Santos finalizou pedido R$ 45,30    │
│ • Estoque baixo: Omeprazol 20mg (3 un.)    │
├─────────────────────────────────────────────┤
│ 📈 Gráficos   │ 🔥 Top Produtos             │
│ [Vendas Dia]  │ 1. Dipirona 500mg (23x)    │
│ [Msgs/Hora]   │ 2. Paracetamol (18x)       │
│               │ 3. Omeprazol 20mg (15x)    │
└─────────────────────────────────────────────┘
```

**Design Principles:**
- Informações críticas above the fold
- Cards com métricas principais
- Atividade em tempo real para engajamento
- Layout em grid responsivo
- Cores consistentes (verde para positivo, vermelho para alertas)

### 2. Conversas Interface
```
┌─────────────────────────────────────────────┐
│ 💬 Conversas Ativas                         │
├─────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┤
│ │ 🟢 João Silva (+55 11 99999-9999)        │
│ │ "Quanto custa Dipirona?"                  │
│ │ 2 min atrás • 1 não lida                 │
│ └───────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┤
│ │ 🟡 Maria Santos (+55 11 88888-8888)      │
│ │ "Preciso falar com farmacêutico"         │
│ │ 5 min atrás • Aguardando transferência   │
│ └───────────────────────────────────────────┤
│                                             │
│ [Chat Interface]                            │
│ ┌─────────────────────────────────────────┐ │
│ │ Cliente: Quanto custa Dipirona?         │ │
│ │ Bot: 🔍 Resultados para Dipirona...     │ │
│ │ Cliente: Quero reservar                 │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ Digite sua resposta... [Enviar]     │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**UX Features:**
- Status visual com cores (verde=ativo, amarelo=aguardando)
- Preview da última mensagem
- Indicador de mensagens não lidas
- Interface de chat familiar (WhatsApp-like)
- Transferência suave para atendimento humano

### 3. Produtos Management
```
┌─────────────────────────────────────────────┐
│ 💊 Gestão de Produtos                       │
├─────────────────────────────────────────────┤
│ [🔍 Buscar] [+ Adicionar] [📊 Relatório]    │
├─────────────────────────────────────────────┤
│ ┌─────┬─────────────────┬───────┬─────────┐ │
│ │ Img │ Nome            │ Preço │ Estoque │ │
│ ├─────┼─────────────────┼───────┼─────────┤ │
│ │ 💊  │ Dipirona 500mg  │ 8,50  │ 15 ✅  │ │
│ │     │ EMS             │       │         │ │
│ ├─────┼─────────────────┼───────┼─────────┤ │
│ │ 💊  │ Omeprazol 20mg  │ 12,90 │ 3 ⚠️   │ │
│ │     │ EMS             │       │         │ │
│ ├─────┼─────────────────┼───────┼─────────┤ │
│ │ 💊  │ Paracetamol     │ 6,30  │ 0 ❌   │ │
│ │     │ Genérico        │       │         │ │
│ └─────┴─────────────────┴───────┴─────────┘ │
└─────────────────────────────────────────────┘
```

**Design Elements:**
- Tabela limpa e escaneável
- Indicadores visuais para status de estoque
- Ações rápidas sempre visíveis
- Filtros e busca acessíveis
- Imagens para reconhecimento rápido

## Visual Design System

### 1. Color Palette
```scss
$primary: #25D366;      // WhatsApp Green
$secondary: #075E54;    // WhatsApp Dark Green
$success: #10B981;      // Success Green
$warning: #F59E0B;      // Warning Orange
$error: #EF4444;        // Error Red
$info: #3B82F6;         // Info Blue
$neutral-100: #F3F4F6;  // Light Background
$neutral-900: #111827;  // Dark Text
```

### 2. Typography Scale
```scss
$font-xs: 0.75rem;      // 12px - Small labels
$font-sm: 0.875rem;     // 14px - Body small
$font-base: 1rem;       // 16px - Body
$font-lg: 1.125rem;     // 18px - Subheading
$font-xl: 1.25rem;      // 20px - Heading
$font-2xl: 1.5rem;      // 24px - Page title
$font-3xl: 1.875rem;    // 30px - Hero
```

### 3. Spacing System
```scss
$space-1: 0.25rem;      // 4px
$space-2: 0.5rem;       // 8px
$space-3: 0.75rem;      // 12px
$space-4: 1rem;         // 16px
$space-6: 1.5rem;       // 24px
$space-8: 2rem;         // 32px
$space-12: 3rem;        // 48px
$space-16: 4rem;        // 64px
```

## Component Library

### 1. Button Variants
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  icon?: ReactElement;
  loading?: boolean;
  disabled?: boolean;
}

// Usage Examples:
<Button variant="primary" size="md" icon={<Plus />}>
  Adicionar Produto
</Button>

<Button variant="outline" size="sm" loading>
  Salvando...
</Button>
```

### 2. Status Indicators
```typescript
interface StatusBadgeProps {
  status: 'available' | 'low' | 'out' | 'expired';
  count?: number;
}

// Visual Examples:
✅ Disponível (15)
⚠️ Estoque Baixo (3)
❌ Sem Estoque
🕐 Vencendo (5 dias)
```

### 3. Input Components
```typescript
interface InputProps {
  label: string;
  placeholder?: string;
  error?: string;
  icon?: ReactElement;
  mask?: 'phone' | 'currency' | 'barcode';
}

// Examples:
<Input 
  label="Preço de Venda"
  mask="currency"
  placeholder="R$ 0,00"
  icon={<DollarSign />}
/>

<Input 
  label="Código de Barras"
  mask="barcode"
  placeholder="0000000000000"
  error="Código deve ter 13 dígitos"
/>
```

## Responsive Design

### 1. Breakpoints
```scss
$mobile: 480px;         // Mobile phones
$tablet: 768px;         // Tablets
$desktop: 1024px;       // Desktop
$wide: 1280px;          // Wide screens

// Usage:
@media (min-width: $tablet) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: $desktop) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### 2. Mobile-First Approach
- WhatsApp interface otimizada para mobile
- Dashboard responsivo (mobile → tablet → desktop)
- Touch-friendly buttons (min 44px)
- Simplified navigation on mobile
- Fast loading with progressive enhancement

## Accessibility (WCAG 2.1)

### 1. Semantic HTML
```html
<main role="main">
  <section aria-labelledby="dashboard-title">
    <h1 id="dashboard-title">Dashboard Principal</h1>
    <nav aria-label="Navegação principal">
      <ul role="menubar">
        <li role="menuitem">
          <a href="/produtos" aria-current="page">Produtos</a>
        </li>
      </ul>
    </nav>
  </section>
</main>
```

### 2. Keyboard Navigation
- Tab order lógico
- Focus indicators visíveis
- Escape key para fechar modais
- Enter/Space para ativar botões
- Arrow keys para navegar listas

### 3. Screen Reader Support
```html
<button aria-label="Adicionar produto ao estoque">
  <Plus aria-hidden="true" />
  <span class="sr-only">Adicionar produto</span>
</button>

<div role="alert" aria-live="polite">
  Produto adicionado com sucesso!
</div>
```

## Micro-interactions

### 1. Loading States
```typescript
// Button loading
<Button loading>
  <Spinner size="sm" />
  Salvando...
</Button>

// Skeleton loading
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### 2. Toast Notifications
```typescript
// Success toast
toast.success('Produto adicionado com sucesso!', {
  duration: 3000,
  icon: '✅',
  position: 'top-right'
});

// Error toast
toast.error('Erro ao salvar produto', {
  duration: 5000,
  icon: '❌',
  action: {
    label: 'Tentar novamente',
    onClick: () => retryAction()
  }
});
```

### 3. Animations
```scss
// Smooth transitions
.card {
  transition: all 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

// Loading animation
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## Performance Considerations

### 1. Image Optimization
- WebP format com fallback
- Lazy loading para imagens de produtos
- Responsive images com srcset
- Placeholder blur durante carregamento

### 2. Code Splitting
```typescript
// Lazy load components
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ConversasPage = lazy(() => import('./pages/ConversasPage'));

<Suspense fallback={<PageSkeleton />}>
  <ProductsPage />
</Suspense>
```

### 3. Optimized Re-renders
```typescript
// Memoized components
const ProductCard = memo(({ produto }: Props) => {
  return (
    <div className="product-card">
      {/* Product content */}
    </div>
  );
});

// Optimized selectors
const useProductStats = () => {
  return useQuery(['product-stats'], fetchProductStats, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });
};
```

## Testing UX/UI

### 1. Visual Testing
```typescript
// Storybook stories
export default {
  title: 'Components/Button',
  component: Button,
} as Meta;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Clique aqui',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    icon: <Plus />,
    children: 'Adicionar',
  },
};
```

### 2. Accessibility Testing
```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Usage in tests
import axe from '@axe-core/react';

describe('Dashboard', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Dashboard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 3. User Testing Metrics
- **Task completion rate**: > 95%
- **Time to complete**: < 30 segundos (consulta preço)
- **Error rate**: < 5%
- **Satisfaction score**: > 4.5/5
- **Mobile usability**: > 90% success rate

## Design Tools & Workflow

### 1. Design System Management
- Figma para designs e protótipos
- Design tokens em JSON
- Storybook para documentação
- Chromatic para visual regression

### 2. Handoff Process
```typescript
// Design tokens integration
import { tokens } from '@/design-system/tokens.json';

const theme = {
  colors: tokens.colors,
  spacing: tokens.spacing,
  typography: tokens.typography,
  borders: tokens.borders,
  shadows: tokens.shadows,
};
```

### 3. Continuous Improvement
- Analytics de uso (Hotjar/Google Analytics)
- A/B testing para fluxos críticos
- User feedback collection
- Performance monitoring (Core Web Vitals)
- Regular usability audits

Este documento serve como guia completo para todas as decisões de UX/UI no projeto do chatbot para farmácias, garantindo uma experiência consistente, acessível e otimizada tanto para WhatsApp quanto para o dashboard administrativo.