# 🚀 **Executar Schema no Supabase - Instruções Detalhadas**

Como o MCP não consegue executar SQL diretamente, você precisa executar manualmente no dashboard do Supabase. É bem simples!

## 📋 **Passo a Passo:**

### 1. **Acesse seu projeto Supabase**
🔗 https://fcdfunvzoxhobfskwsag.supabase.co

### 2. **Vá para o SQL Editor**
- No menu lateral, clique em **SQL Editor**
- Clique em **"New query"**

### 3. **Execute os 3 arquivos em ordem:**

#### 🔹 **1º - Schema Principal (OBRIGATÓRIO)**
- Abra o arquivo: `database/schema.sql`
- **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
- **Cole no SQL Editor** e clique **"Run"**
- ✅ Aguarde executar (pode demorar 30-60 segundos)

#### 🔹 **2º - Configurações de Segurança**
- **Nova query** no SQL Editor
- Abra o arquivo: `database/security.sql` 
- **Copie TODO o conteúdo** e cole
- Clique **"Run"**

#### 🔹 **3º - Dados de Teste**
- **Nova query** no SQL Editor
- Abra o arquivo: `database/seeds.sql`
- **Copie TODO o conteúdo** e cole  
- Clique **"Run"**

## ✅ **Verificar se funcionou:**

Após executar tudo, rode esta query para verificar:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar se há produtos
SELECT COUNT(*) as total_produtos FROM produtos;

-- Verificar farmácia
SELECT nome, telefone FROM farmacias LIMIT 1;
```

Se aparecer:
- ✅ **10+ tabelas** (farmacias, produtos, clientes, etc.)
- ✅ **15+ produtos** 
- ✅ **Farmácia São João**

**Banco configurado com sucesso!** 🎉

---

## 🆘 **Se der erro:**

**Erro comum**: "relation already exists"
- ✅ **Ignore** - significa que já foi executado antes

**Erro**: "permission denied" 
- ✅ Verifique se está usando a **service_role key**

**Outros erros**:
- ✅ Me mande o erro que te ajudo a resolver!

---

## 🎯 **Depois de executar tudo:**

Me confirme que executou os 3 arquivos e vou te ajudar com os próximos passos:
1. ✅ Configurar n8n
2. ✅ Configurar WhatsApp Business API  
3. ✅ Testar o sistema completo