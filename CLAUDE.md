# CLAUDE.md - FarmaBot Pro Evolution

Este arquivo fornece orientação completa para Claude Code ao trabalhar neste repositório.

## 🎯 Visão de Negócio

### O Problema
- **70% das pequenas farmácias** ainda usam controle manual de estoque
- **92% dos idosos** (principal cliente) usam WhatsApp diariamente  
- **Perda de 15-30% em vendas** por falta de atendimento 24/7
- **Competição desleal** com grandes redes em preços

### Nossa Solução
Sistema integrado de atendente virtual que transforma pequenas farmácias em negócios digitais competitivos, oferecendo:
- 🤖 Atendimento 24/7 via WhatsApp
- 💰 Comparação de preços em tempo real
- 📊 Analytics e insights de vendas
- 🔄 Integração com ERPs existentes

## 🏗️ Arquitetura do Sistema

```mermaid
graph TB
    subgraph "Cliente"
        WA[WhatsApp]
    end
    
    subgraph "Camada de Comunicação"
        WAPI[WhatsApp Business API]
        WH[Webhooks]
    end
    
    subgraph "Aplicação Next.js"
        UI[Dashboard Interface]
        API[API Routes]
        PA[Price Analyzer]
        CU[CSV Uploader]
    end
    
    subgraph "Orquestração"
        N8N[n8n Workflows]
    end
    
    subgraph "Data Layer"
        SB[(Supabase)]
        RD[(Redis - via Docker)]
    end
    
    subgraph "External Services"
        EXA[Exa API]
        ERP[ERP Connectors]
    end
    
    WA <--> WAPI
    WAPI --> WH
    WH --> N8N
    N8N <--> API
    UI <--> API
    API <--> SB
    PA --> EXA
    ERP --> SB
    N8N <--> RD
```

## 📁 Estrutura do Projeto

```
farmabot-pro/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── price-analysis/ # Price analysis endpoints
│   │   │   └── mcp-proxy/     # MCP proxy endpoints
│   │   ├── upload-produtos/   # Product upload page
│   │   └── test/              # Test pages
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── upload/            # CSV upload components
│   │   └── price-analyzer-component.tsx
│   ├── lib/
│   │   ├── external-price-apis.ts
│   │   ├── price-analyzer.ts
│   │   └── utils.ts
│   └── hooks/                 # Custom React hooks
├── docs/
│   ├── agents/                # Agent documentation
│   │   ├── agent-backend.md
│   │   ├── agent-frontend.md
│   │   ├── agent-n8n.md
│   │   ├── agent-ux-ui.md
│   │   ├── agent-devops.md
│   │   └── agent-security.md
│   └── archive/               # Archived documentation
├── integrations/
│   └── erp-connectors/        # ERP integration connectors
├── n8n-workflows/             # n8n workflow JSON files
├── database/                  # Database scripts and schemas
├── config/                    # Configuration files
├── ai-prompts/               # AI prompt templates
└── scripts/                  # Utility scripts
```

## 🤖 Sistema de Agentes Especializados

### Hierarquia de Agentes
1. **Master Agent** - Coordena todos os outros agentes
2. **Domain Agents** - Especialistas em áreas específicas
   - `agent-backend.md` - Desenvolvimento backend (API routes, integrações)
   - `agent-frontend.md` - Desenvolvimento frontend (Next.js, React)
   - `agent-n8n.md` - Automações e workflows
   - `agent-ux-ui.md` - Design e experiência do usuário
   - `agent-devops.md` - Docker, deploy e infraestrutura
   - `agent-security.md` - Segurança e compliance LGPD

### Como Usar os Agentes
```bash
# Para tarefas de backend
@agent-backend criar endpoint para consulta de preços

# Para tarefas de frontend
@agent-frontend implementar dashboard de vendas

# Para automações
@agent-n8n criar workflow de alerta de estoque

# Para melhorias de UX
@agent-ux-ui otimizar fluxo de checkout
```

## 🛠️ Stack Tecnológica Completa

### Backend
- **Runtime**: Node.js 20 LTS + TypeScript 5
- **Framework**: Next.js 14 API Routes
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis 7 (via Docker)
- **API**: REST only
- **Auth**: Supabase Auth

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod
- **File Upload**: React Dropzone + Papa Parse
- **Icons**: Lucide React

### DevOps
- **Containers**: Docker + Docker Compose
- **Environment**: .env files
- **Development**: Local Docker services
- **Deployment**: Vercel (frontend) + Docker (services)

### Integrações
- **WhatsApp**: Official Business API (planned)
- **n8n**: Self-hosted automation (Docker)
- **ERPs**: Vetor connector (TypeScript)
- **APIs**: Exa API (price analysis), Supabase

## 📋 Padrões de Código

### TypeScript
```typescript
// Use interfaces para tipos
interface Product {
  id: string;
  name: string;
  price: Money;
  stock: StockInfo;
}

// Use enums para constantes
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered'
}

// Use generics para reusabilidade
class Repository<T extends BaseEntity> {
  async findById(id: string): Promise<T> {
    // implementation
  }
}
```

### Naming Conventions
- **Files**: kebab-case (`product-service.ts`)
- **Classes**: PascalCase (`ProductService`)
- **Functions**: camelCase (`getProductById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces**: PascalCase com prefixo I (`IProductRepository`)

### Git Workflow
```bash
# Branch naming
feature/add-price-comparison
bugfix/fix-whatsapp-webhook
hotfix/critical-auth-issue

# Commit messages (Conventional Commits)
feat: add price comparison endpoint
fix: resolve WhatsApp message parsing error
docs: update API documentation
refactor: optimize database queries
test: add unit tests for product service
```

## 🔐 Segurança e Compliance

### Requisitos Legais
- **LGPD**: Proteção de dados pessoais
- **ANVISA**: Regulamentação de medicamentos
- **SNGPC**: Sistema Nacional de Gerenciamento de Produtos Controlados
- **CRF**: Conselho Regional de Farmácia

### Práticas de Segurança
- Criptografia AES-256 para dados sensíveis
- TLS 1.3 para todas as comunicações
- Rate limiting e DDoS protection
- Audit logs para todas as operações
- Princípio do menor privilégio
- Autenticação multifator para admins

## 🎯 Funcionalidades Implementadas

### Dashboard Principal
- Interface administrativa em Next.js 14
- Upload de produtos via CSV
- Análise de preços em tempo real
- Integração com Supabase

### Analisador de Preços
- Comparação automática via Exa API
- Análise de posição competitiva
- Recomendações de preços
- Monitoramento de margem de lucro

### Conectores ERP
- Conector Vetor Farma (TypeScript)
- Sincronização de produtos e estoque
- Base para outros ERPs

### Automação n8n
- Workflows de automação
- Integração com WhatsApp (planejado)
- Processamento de dados

## 🚀 Quick Start

```bash
# Clone o repositório
git clone [repository-url]

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Inicie os serviços Docker
docker-compose up -d

# Inicie o desenvolvimento
npm run dev

# Acesse o dashboard
open http://localhost:3000

# Acesse o n8n
open http://localhost:5678
```

## 📝 Guias de Contribuição

### Antes de Começar
1. Leia a documentação do agente relevante
2. Entenda o contexto de negócio
3. Verifique issues existentes
4. Discuta grandes mudanças antes

### Processo de Desenvolvimento
1. Crie uma branch feature
2. Desenvolva com TDD
3. Garanta 80%+ de cobertura
4. Execute linters e testes
5. Faça commit com mensagens descritivas
6. Abra PR com descrição detalhada

### Code Review Checklist
- [ ] Código segue os padrões estabelecidos
- [ ] Testes adequados foram adicionados
- [ ] Documentação foi atualizada
- [ ] Não há credenciais hardcoded
- [ ] Performance foi considerada
- [ ] Segurança foi validada

## 🆘 Troubleshooting

### Problemas Comuns
```bash
# Dashboard não carrega
- Verifique variáveis de ambiente (.env.local)
- Confirme conexão com Supabase
- Verifique se Docker services estão rodando

# Analisador de preços falha
- Verifique EXA_API_KEY
- Confirme conectividade com API externa
- Verificar logs no console do navegador

# n8n não inicia
- Verificar se PostgreSQL está rodando
- Confirmar portas disponíveis (5678)
- Verificar logs: docker-compose logs n8n

# Erro de upload CSV
- Verificar formato do arquivo
- Confirmar colunas obrigatórias
- Verificar permissões Supabase
```

## 📚 Recursos Adicionais

### Documentação
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Supabase Docs](https://supabase.com/docs)
- [n8n Documentation](https://docs.n8n.io)

### Comunidade
- Discord: [link]
- Forum: [link]
- Blog técnico: [link]

### Suporte
- Email: suporte@farmabot.pro
- WhatsApp: +55 11 99999-9999
- Horário: Seg-Sex 9h-18h

---

**Última atualização**: ${new Date().toISOString()}
**Versão**: 2.0.0
**Maintainer**: Equipe FarmaBot Pro