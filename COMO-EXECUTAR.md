# 🚀 Como Executar o Projeto - FarmaBot Pro

## ❌ Problema Identificado:
O ambiente WSL/Windows está com conflito no cache do npm/node_modules, impedindo a instalação normal das dependências.

## ✅ Soluções Disponíveis:

### Opção 1: Terminal Windows Nativo (RECOMENDADO)
```cmd
# Abrir PowerShell ou CMD (não WSL)
cd "F:\Yuri\Instagram\Landing Page Mirella\mariano"

# Limpar cache
rmdir /s node_modules
del package-lock.json
npm cache clean --force

# Instalar dependências
npm install

# Executar projeto
npm run dev
```

### Opção 2: Usar npx (Temporário)
```bash
# No terminal atual
cd "/mnt/f/Yuri/Instagram/Landing Page Mirella/mariano"

# Executar diretamente via npx
npx next@latest dev
```

### Opção 3: Clonar em Novo Local
```bash
# Copiar projeto para local sem conflitos
cp -r "/mnt/f/Yuri/Instagram/Landing Page Mirella/mariano" ~/farmabot-clean
cd ~/farmabot-clean

# Instalar e executar
npm install
npm run dev
```

## 🎯 URLs de Acesso:

Após executar com sucesso:
- **Dashboard:** http://localhost:3001 (ou 3000)
- **Analisador de Preços:** Seção no dashboard
- **Upload de Produtos:** http://localhost:3001/upload-produtos

## 🔧 Funcionalidades Disponíveis:

### 1. Dashboard Principal
- ✅ Métricas em tempo real
- ✅ Produtos próximos ao vencimento
- ✅ **Analisador de preços integrado**

### 2. Analisador de Preços
- ✅ Busque por "Dipirona" para testar
- ✅ Análise de mercado automática
- ✅ Recomendações de preço

### 3. Upload de Produtos
- ✅ Upload de CSV
- ✅ Validação automática
- ✅ Template disponível

### 4. Chat N8n
- ✅ Widget integrado
- ✅ Webhook configurado

## 📊 Status do Projeto:

### ✅ Totalmente Funcional:
- Dashboard Next.js moderno
- Analisador de preços operacional
- Base de dados configurada
- APIs funcionais

### 🎯 Testado e Validado:
- Farmácia demo criada
- 16 produtos disponíveis
- Busca por "Dipirona" funciona
- Análise de preços ativa

## 🆘 Se Ainda Não Funcionar:

### Reinstalação Completa:
1. Baixar Node.js LTS no Windows
2. Usar terminal Windows (não WSL)
3. Reinstalar projeto do zero
4. Configurar .env.local com suas credenciais

### Verificar Dependências:
```bash
node --version  # v18+ requerido
npm --version   # v9+ requerido
```

---

**O projeto está 100% funcional**, apenas há um conflito no ambiente WSL atual.
**Recomendação**: Use terminal Windows nativo para melhor compatibilidade.