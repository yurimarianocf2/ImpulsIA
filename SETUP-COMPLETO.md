# 🚀 **FarmaBot Pro - Setup Completo**

## ✅ **Status Atual:**
- ✅ **Banco Supabase**: Configurado (10 tabelas, 16 produtos)
- ✅ **Credenciais**: Configuradas no .env.local
- ⏳ **n8n**: Aguardando instalação
- ⏳ **WhatsApp API**: Aguardando configuração

---

## 🔧 **Próximos Passos:**

### 1️⃣ **Instalar Docker (se não tiver)**

**Windows com WSL2:**
```bash
# Instalar Docker no WSL2
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

**Ou baixe Docker Desktop:** https://docker.com/products/docker-desktop

### 2️⃣ **Iniciar n8n**
```bash
# No diretório do projeto
docker compose up -d n8n

# Verificar se subiu
docker compose ps
```

### 3️⃣ **Acessar n8n**
- 🌐 **URL**: http://localhost:5678
- 👤 **Usuário**: admin  
- 🔐 **Senha**: farmabot123

### 4️⃣ **Configurar WhatsApp Business API**

#### 4.1 Meta Business Manager
1. Acesse: https://business.facebook.com
2. Crie uma conta business
3. Adicione WhatsApp Business

#### 4.2 Criar Aplicação
1. https://developers.facebook.com
2. **Criar App** → **Business** 
3. Adicionar produto **WhatsApp**
4. Configurar número de telefone

#### 4.3 Obter Credenciais
Você vai precisar:
- 📱 **Phone Number ID**
- 🔑 **Access Token** 
- 🔐 **Webhook Verify Token** (você cria)

### 5️⃣ **Configurar Webhook**
No painel do WhatsApp:
- **Webhook URL**: `https://seu-dominio.com/webhook/whatsapp`
- **Verify Token**: `farmabot-webhook-token-123`

---

## 🎯 **Fluxo de Teste Rápido**

### Após configurar tudo:

1. **Enviar mensagem** WhatsApp: `"Quanto custa Dipirona?"`
2. **n8n recebe** via webhook
3. **Consulta Supabase** pelos produtos
4. **Retorna preços** formatados
5. **Cliente recebe** resposta automática

---

## 📱 **Estrutura de Mensagens**

### Cliente envia:
```
"Preço dipirona"
"Quanto custa paracetamol"
"Omeprazol disponível?"
```

### Bot responde:
```
🔍 Resultados para: Dipirona

📍 NOSSA FARMÁCIA:
• Dipirona EMS 500mg - R$ 8,50
  ✅ Disponível (45 unidades)

🏪 COMPARAÇÃO:
• Outras farmácias: R$ 9,20+

💰 Você economiza R$ 0,70 conosco!

O que deseja fazer?
1️⃣ Reservar produto
2️⃣ Falar com farmacêutico
```

---

## 🆘 **Se precisar de ajuda:**

**Docker não instala?**
- Use n8n.cloud (versão online)
- Configure webhook: `https://sua-instancia.n8n.cloud/webhook/`

**WhatsApp muito complexo?**
- Use simulador primeiro
- Teste com Postman/curl

**Erros no n8n?**
- Verifique logs: `docker compose logs n8n`
- Reinicie: `docker compose restart n8n`

---

## 🎉 **Quando estiver tudo funcionando:**

**Me confirme:**
- ✅ n8n acessível em localhost:5678
- ✅ WhatsApp webhook configurado  
- ✅ Primeiro teste de mensagem

**Aí configuro os workflows avançados!** 🚀

---

**Consegue executar esses passos? Em qual você quer que eu te ajude primeiro?**