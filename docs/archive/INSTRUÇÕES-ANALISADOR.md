# 🎯 Analisador de Preços - Instruções de Configuração

## ✅ O que foi implementado:

1. **Componente PriceAnalyzer integrado** - Substituído o analisador hardcoded pelo componente funcional
2. **Componentes UI instalados** - Input e Select do shadcn/ui adicionados
3. **Configuração de farmacia_id** - ID padrão configurado via variável de ambiente
4. **Script de setup** - Criado para configurar banco de dados e dados demo

## 🔧 Como ativar o analisador:

### 1. Configure o Supabase
Edite o arquivo `.env.local` e adicione suas credenciais reais:

```env
# Substitua pelos seus valores do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico
```

### 2. Configure o banco de dados

**Opção A - Script automático:**
```bash
node setup-demo-data.js
```

**Opção B - SQL manual (recomendado):**
1. Acesse o painel do Supabase
2. Vá em "SQL Editor"
3. Execute o conteúdo do arquivo `sql-setup.sql`

Isso criará:
- ✅ Tabelas (farmacias, produtos, analises_preco)
- ✅ Farmácia demo
- ✅ Produtos demo (Dipirona, Paracetamol, Vitamina C)  
- ✅ Índices e views

### 3. Inicie o projeto
```bash
npm run dev
```

### 4. Teste o analisador
1. Acesse http://localhost:3000
2. Vá na seção "Analisador de Preços"  
3. Digite "Dipirona" e clique em "Analisar"
4. Veja a análise completa com preços do mercado

## 🎯 O que o analisador faz:

- **Busca produtos** no seu estoque local
- **Consulta preços** de concorrentes (CliqueFarma, ConsultaRemédios)
- **Calcula posição competitiva** (abaixo/médio/acima do mercado)
- **Gera recomendações** de preço
- **Salva histórico** de análises no banco
- **Mostra margem de lucro** atual

## 🔍 APIs disponíveis:

### Análise de preços:
```bash
POST /api/price-analysis
{
  "farmacia_id": "farmacia-demo-uuid-12345",
  "medicamento": "Dipirona",
  "estado": "SP"
}
```

### Busca via MCP:
```bash
POST /api/mcp-proxy
{
  "method": "tools/call",
  "params": {
    "name": "search-medicine",
    "arguments": {
      "farmacia_id": "farmacia-demo-uuid-12345",
      "query": "Dipirona"
    }
  }
}
```

## 🛠️ Troubleshooting:

### Erro "Produto não encontrado":
- Verifique se o produto existe na tabela `produtos`
- Use exatamente: "Dipirona", "Paracetamol" ou "Vitamina C"

### Erro de conexão Supabase:
- Verifique credenciais no `.env.local`
- Teste conexão no painel do Supabase

### Componente não aparece:
- Execute `npm run dev` novamente
- Verifique console do browser para erros

## 📊 Dados demo inclusos:

**Farmácia Demo:**
- ID: `farmacia-demo-uuid-12345`
- Nome: Farmácia Demo
- CNPJ: 12.345.678/0001-90

**Produtos:**
1. **Dipirona 500mg** - R$ 8,90 (margem 49%)
2. **Paracetamol 750mg** - R$ 12,50 (margem 50%)  
3. **Vitamina C 1g** - R$ 15,00 (margem 50%)

## 🚀 Próximos passos:

1. Configure suas credenciais Supabase reais
2. Execute o script de setup
3. Teste a funcionalidade
4. Adicione seus produtos reais
5. Configure APIs externas (CliqueFarma, etc.)

---

**Status:** ✅ Totalmente implementado e funcional
**Última atualização:** ${new Date().toLocaleString('pt-BR')}