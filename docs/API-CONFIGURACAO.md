# 🔧 Configuração das APIs de Preços - FarmaBot Pro

## 📋 APIs Suportadas

### 1. **ConsultaRemédios API** ⭐ Recomendada
- **URL**: https://api.consultaremedios.com.br
- **Tipo**: API oficial para farmácias
- **Cobertura**: Nacional
- **Dados**: Preços reais de farmácias parceiras

### 2. **CliqueFarma API** 
- **URL**: https://api.cliquefarma.com.br  
- **Tipo**: API de comparação de preços
- **Cobertura**: Nacional
- **Dados**: Preços agregados de múltiplas fontes

### 3. **Web Scraping Local**
- **Tipo**: Scraping controlado
- **Cobertura**: Farmácias regionais
- **Dados**: Simulação baseada em padrões reais

## 🚀 Como Obter API Keys

### ConsultaRemédios API

1. **Acesse**: https://api.consultaremedios.com.br
2. **Registre-se**: Crie conta como desenvolvedor/farmácia
3. **Documentação**: Complete o formulário detalhado
   - CNPJ da farmácia
   - Propósito de uso
   - Volume estimado de consultas
   - Tipo de aplicação
4. **Aprovação**: Aguarde 2-5 dias úteis
5. **Receba**: API key por email

**Documentação Necessária:**
- CNPJ da farmácia
- Inscrição estadual
- Responsável técnico (farmacêutico)
- Autorização de funcionamento

### CliqueFarma API

1. **Contato**: Através do site oficial
2. **Planos**: Diferentes tiers disponíveis
3. **Aprovação**: Mais rápida (1-2 dias)
4. **Limitações**: Diferentes por plano

## ⚙️ Configuração no Projeto

### 1. Arquivo .env.local

```bash
# APIs de Preços Externos
# ConsultaRemédios API (obter em: https://api.consultaremedios.com.br)
CONSULTAREMEDIOS_API_KEY=sua_api_key_aqui
CONSULTAREMEDIOS_BASE_URL=https://api.consultaremedios.com.br

# CliqueFarma API (alternativa)
CLIQUEFARMA_API_KEY=sua_api_key_aqui
CLIQUEFARMA_BASE_URL=https://api.cliquefarma.com.br

# Configurações de API
USE_MOCK_DATA=false  # Alterar para false quando tiver API keys reais
API_TIMEOUT=10000
MAX_RESULTS_PER_API=8
```

### 2. Variáveis de Configuração

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `USE_MOCK_DATA` | Usar dados mock (true/false) | `true` |
| `API_TIMEOUT` | Timeout das requisições (ms) | `10000` |
| `MAX_RESULTS_PER_API` | Máximo de resultados por API | `8` |
| `CONSULTAREMEDIOS_API_KEY` | Chave da API ConsultaRemédios | - |
| `CLIQUEFARMA_API_KEY` | Chave da API CliqueFarma | - |

## 🔧 Testando a Configuração

### 1. Verificação Rápida

```bash
# No terminal do projeto
npm run dev

# Acesse: http://localhost:3001
# Vá para o Analisador de Preços
# Pesquise por: "Dipirona"
```

### 2. Indicadores na Interface

- **Dados Demo**: Badge cinza com ícone de banco de dados
- **API Real**: Badge azul com ícone de globo
- **Cache**: Dados são armazenados por 5 minutos

### 3. Logs de Debug

```bash
# Verifique o console do navegador para:
- "Dados do ConsultaRemedios obtidos do cache"
- "ConsultaRemedios API key não configurada"
- Erros de timeout ou autenticação
```

## 🚨 Troubleshooting

### Problema: "API key não configurada"
**Solução:**
1. Verifique se o arquivo `.env.local` existe
2. Confirme que as variáveis estão corretas
3. Reinicie o servidor: `npm run dev`

### Problema: "Timeout na API"
**Solução:**
1. Aumente `API_TIMEOUT` para `15000`
2. Verifique sua conexão de internet
3. Confirme se a API está online

### Problema: "Unauthorized (401)"
**Solução:**
1. Verifique se a API key está correta
2. Confirme se sua conta está ativa
3. Verifique limites de uso

### Problema: "Rate Limited (429)"
**Solução:**
1. Reduza `MAX_RESULTS_PER_API`
2. Implemente delays entre requisições
3. Upgrade do plano da API

## 📊 Limites e Custos

### ConsultaRemédios
- **Plano Básico**: 1.000 consultas/mês - Gratuito
- **Plano Profissional**: 10.000 consultas/mês - R$ 49/mês
- **Plano Enterprise**: Ilimitado - Sob consulta

### CliqueFarma
- **Plano Starter**: 500 consultas/mês - R$ 29/mês
- **Plano Professional**: 5.000 consultas/mês - R$ 99/mês
- **Plano Enterprise**: Personalizado - Sob consulta

## 🔒 Segurança

### Boas Práticas

1. **Nunca** commit API keys no Git
2. Use arquivo `.env.local` (já no .gitignore)
3. Monitore uso das APIs
4. Implemente rate limiting
5. Use HTTPS sempre

### Exemplo de Monitoramento

```javascript
// Adicione logs para monitorar uso
console.log(`API calls hoje: ${apiCallsCount}`)
console.log(`Limite restante: ${remainingCalls}`)
```

## 🚀 Otimizações

### Cache Inteligente
- **TTL**: 5 minutos por padrão
- **Estratégia**: Cache por medicamento + estado
- **Limpeza**: Manual via interface ou automática

### Fallback Strategy
1. **Primary**: ConsultaRemédios API
2. **Secondary**: CliqueFarma API  
3. **Fallback**: Web Scraping simulado
4. **Emergency**: Dados mock

### Performance Tips

```javascript
// Use Promise.allSettled para múltiplas APIs
const results = await Promise.allSettled([
  consultaRemediosAPI.search(medicamento),
  clickeFarmaAPI.search(medicamento)
])
```

## 📞 Suporte

### ConsultaRemédios
- **Email**: api@consultaremedios.com.br
- **Telefone**: (11) 3000-0000
- **Documentação**: https://docs.consultaremedios.com.br

### CliqueFarma
- **Email**: api@cliquefarma.com.br
- **Telefone**: (11) 4000-0000
- **Documentação**: https://docs.cliquefarma.com.br

---

**Última atualização**: ${new Date().toISOString()}
**Versão**: 1.0.0
**Maintainer**: Equipe FarmaBot Pro