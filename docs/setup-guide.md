# 🚀 Guia de Configuração - FarmaBot Pro

## Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Conta WhatsApp Business
- Conta Supabase (ou PostgreSQL self-hosted)
- Conta OpenAI (para recursos de IA)

## 1. Configuração WhatsApp Business API

### 1.1 Criar App no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um novo app tipo "Business"
3. Adicione o produto "WhatsApp"
4. Configure webhook URL: `https://seu-dominio.com/webhook/whatsapp`

### 1.2 Obter Credenciais

```bash
WHATSAPP_TOKEN=seu_token_aqui
WHATSAPP_PHONE_ID=seu_phone_id
WHATSAPP_BUSINESS_ID=seu_business_id
WEBHOOK_VERIFY_TOKEN=token_secreto_webhook
```

## 2. Instalação n8n

### 2.1 Via Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: farmabot-n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=senha_segura
      - N8N_ENCRYPTION_KEY=sua_chave_encriptacao
      - WEBHOOK_URL=https://seu-dominio.com
      - GENERIC_TIMEZONE=America/Sao_Paulo
      - TZ=America/Sao_Paulo
    volumes:
      - n8n_data:/home/node/.n8n
      - ./n8n-workflows:/workflows
    networks:
      - farmabot

  postgres:
    image: postgres:15-alpine
    container_name: farmabot-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=farmabot
      - POSTGRES_PASSWORD=senha_segura_db
      - POSTGRES_DB=farmabot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - farmabot

volumes:
  n8n_data:
  postgres_data:

networks:
  farmabot:
    driver: bridge
```

### 2.2 Iniciar Serviços

```bash
docker-compose up -d
```

## 3. Configuração Supabase

### 3.1 Criar Projeto

1. Acesse [supabase.com](https://supabase.com)
2. Crie novo projeto
3. Copie as credenciais:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_KEY=sua_service_key
```

### 3.2 Executar Schema

1. Acesse SQL Editor no Supabase
2. Execute o conteúdo de `supabase/schema.sql`

## 4. Importar Workflows n8n

### 4.1 Acessar n8n

1. Acesse `http://localhost:5678`
2. Faça login com credenciais configuradas

### 4.2 Importar Workflows

1. Vá em Settings > Import
2. Importe cada arquivo JSON da pasta `n8n-workflows/`

### 4.3 Configurar Credenciais

#### WhatsApp Business Cloud
- Name: `WhatsApp Business`
- Access Token: `seu_whatsapp_token`
- Phone Number ID: `seu_phone_id`

#### Supabase
- Name: `Supabase DB`
- Host: `db.xxxxx.supabase.co`
- Database: `postgres`
- User: `postgres`
- Password: `sua_senha`
- SSL: `Enabled`

#### OpenAI
- Name: `OpenAI`
- API Key: `sk-sua_api_key`

## 5. Integração com ERPs

### 5.1 Conectores Disponíveis

O FarmaBot Pro já vem com conectores para:

- **Vetor Farma**: API REST
- **Digifarma**: Web Service SOAP
- **TekFarma**: API REST
- **InovaFarma**: API GraphQL

### 5.2 Configurar Integração

```javascript
// config/erp-config.js
module.exports = {
  vetor: {
    baseUrl: process.env.VETOR_API_URL,
    apiKey: process.env.VETOR_API_KEY,
    timeout: 10000
  },
  digifarma: {
    wsdlUrl: process.env.DIGIFARMA_WSDL,
    username: process.env.DIGIFARMA_USER,
    password: process.env.DIGIFARMA_PASS
  }
}
```

## 6. Configuração de Ambiente

### 6.1 Variáveis de Ambiente

Crie arquivo `.env`:

```bash
# WhatsApp
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_BUSINESS_ID=
WEBHOOK_VERIFY_TOKEN=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# OpenAI
OPENAI_API_KEY=

# ERP (configure conforme necessário)
ERP_TYPE=vetor
VETOR_API_URL=
VETOR_API_KEY=

# Configurações Gerais
NODE_ENV=production
LOG_LEVEL=info
TIMEZONE=America/Sao_Paulo
```

## 7. Testes e Validação

### 7.1 Testar Webhook WhatsApp

```bash
curl -X POST https://seu-dominio.com/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "5511999999999",
            "type": "text",
            "text": { "body": "Qual o preço do paracetamol?" }
          }]
        }
      }]
    }]
  }'
```

### 7.2 Verificar Logs

```bash
docker logs farmabot-n8n -f
```

## 8. Segurança

### 8.1 HTTPS com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d seu-dominio.com
```

### 8.2 Firewall

```bash
# Permitir apenas portas necessárias
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 9. Monitoramento

### 9.1 Configurar Alertas

No n8n, configure workflow de erro:
1. Criar workflow "Error Handler"
2. Adicionar trigger de erro
3. Enviar notificação (email/WhatsApp)

### 9.2 Métricas

Acompanhe no Supabase Dashboard:
- Queries por segundo
- Latência média
- Taxa de erro

## 10. Próximos Passos

1. ✅ Personalizar mensagens de boas-vindas
2. ✅ Treinar respostas específicas
3. ✅ Configurar horário de atendimento
4. ✅ Implementar menu interativo
5. ✅ Adicionar mais integrações

## Suporte

- Documentação: [docs.example.com](https://docs.example.com)
- GitHub: [github.com/example](https://github.com/example)
- Email: support@example.com

---

**Dica**: Comece com um fluxo simples e vá adicionando complexidade gradualmente! 