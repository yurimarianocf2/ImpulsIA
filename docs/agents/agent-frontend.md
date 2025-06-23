# AGENT FRONTEND

This file provides specialized guidance for Claude Code when working on frontend development for the Farmácia Chatbot project.

## Frontend Responsibilities
- Dashboard administrativo da farmácia
- Interface de configuração de produtos e preços
- Relatórios e analytics em tempo real
- Gestão de clientes e conversas
- Configuração de automações n8n

## Tech Stack Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Database Client**: Supabase JavaScript Client
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard pages
│   ├── produtos/          # Produto management
│   ├── clientes/          # Customer management
│   ├── conversas/         # Chat conversations
│   ├── relatorios/        # Reports and analytics
│   └── configuracoes/     # Settings
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard-specific components
│   ├── forms/            # Form components
│   └── charts/           # Chart components
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── utils.ts          # Utility functions
│   └── validations.ts    # Zod schemas
└── hooks/                # Custom React hooks
```

## Key Components

### 1. Dashboard Principal
```typescript
// components/dashboard/main-dashboard.tsx
interface DashboardStats {
  clientesAtivos: number;
  mensagensHoje: number;
  pedidosHoje: number;
  faturamentoHoje: number;
  tempoRespostaMedio: number;
}

const MainDashboard = () => {
  // Real-time stats from Supabase
  // Charts for sales, messages, popular products
  // Quick actions and notifications
};
```

### 2. Gestão de Produtos
```typescript
// app/produtos/page.tsx
interface Produto {
  id: string;
  nome: string;
  codigoBarras: string;
  precoVenda: number;
  estoque: number;
  categoria: string;
  laboratorio: string;
}

const ProdutosPage = () => {
  // CRUD operations for products
  // Bulk import from CSV/Excel
  // Price comparison with external APIs
  // Stock alerts and management
};
```

### 3. Conversas WhatsApp
```typescript
// app/conversas/page.tsx
interface Conversa {
  id: string;
  cliente: Cliente;
  status: 'ativo' | 'finalizado' | 'transferido';
  ultimaMensagem: string;
  naoLidas: number;
}

const ConversasPage = () => {
  // Real-time chat interface
  // Transfer to human agent
  // Chat history and context
  // Quick responses and templates
};
```

## Supabase Integration
```typescript
// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createClientComponentClient();

// Real-time subscriptions
export const useRealtimeMessages = (conversaId: string) => {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    const channel = supabase
      .channel(`conversa-${conversaId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `conversa_id=eq.${conversaId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversaId]);

  return messages;
};
```

## State Management
```typescript
// lib/stores/dashboard-store.ts
import { create } from 'zustand';

interface DashboardStore {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  updateStats: (stats: Partial<DashboardStats>) => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  stats: null,
  isLoading: false,
  error: null,
  
  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('dashboard_stats')
        .select('*')
        .single();
      
      if (error) throw error;
      set({ stats: data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  updateStats: (newStats) => {
    const currentStats = get().stats;
    if (currentStats) {
      set({ stats: { ...currentStats, ...newStats } });
    }
  }
}));
```

## Common UI Patterns

### 1. Data Tables
```typescript
// components/ui/data-table.tsx
import { DataTable } from '@/components/ui/data-table';

const columns = [
  { accessorKey: 'nome', header: 'Nome' },
  { accessorKey: 'preco', header: 'Preço' },
  { accessorKey: 'estoque', header: 'Estoque' }
];

<DataTable 
  columns={columns} 
  data={produtos}
  pagination
  search
  filters={['categoria', 'laboratorio']}
/>
```

### 2. Real-time Charts
```typescript
// components/charts/sales-chart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const SalesChart = () => {
  const { data } = useRealtimeSales();
  
  return (
    <LineChart width={800} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="data" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="vendas" stroke="#8884d8" />
    </LineChart>
  );
};
```

### 3. Forms with Validation
```typescript
// components/forms/produto-form.tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  codigoBarras: z.string().length(13, 'Código deve ter 13 dígitos'),
  precoVenda: z.number().positive('Preço deve ser positivo'),
  estoque: z.number().int().min(0, 'Estoque não pode ser negativo')
});

type ProdutoForm = z.infer<typeof produtoSchema>;

const ProdutoForm = ({ produto, onSubmit }: Props) => {
  const form = useForm<ProdutoForm>({
    resolver: zodResolver(produtoSchema),
    defaultValues: produto
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
      </form>
    </Form>
  );
};
```

## Performance Optimization

### 1. Image Optimization
```typescript
import Image from 'next/image';

<Image
  src="/produtos/produto-123.jpg"
  alt="Produto"
  width={200}
  height={200}
  className="rounded-md"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### 2. Code Splitting
```typescript
import dynamic from 'next/dynamic';

const ConversasPage = dynamic(() => import('./conversas-page'), {
  loading: () => <Skeleton className="w-full h-96" />
});
```

### 3. Memoization
```typescript
import { memo, useMemo } from 'react';

const ProductList = memo(({ produtos, filtro }: Props) => {
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => p.nome.includes(filtro));
  }, [produtos, filtro]);

  return (
    <div>
      {produtosFiltrados.map(produto => (
        <ProductCard key={produto.id} produto={produto} />
      ))}
    </div>
  );
});
```

## Common Commands
```bash
# Development
npm run dev                 # Run dev server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
npm run type-check         # TypeScript check

# Testing
npm run test               # Run Jest tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report

# Database
npx supabase gen types typescript --local > types/database.types.ts
```

## Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

## Deployment
- Deploy no Vercel para Next.js
- Environment variables configuradas
- Domain customizado
- Analytics integrado
- Monitoramento de performance