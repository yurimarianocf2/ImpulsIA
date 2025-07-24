# Deploy da Landing Page ImpulsIA para GitHub

## Situação Atual
- ✅ Repositório local configurado corretamente
- ✅ Commit feito com todos os arquivos necessários
- ❌ Push pendente (precisa de autenticação)

## Arquivos que DEVEM estar no GitHub

### Arquivos Principais
- `index.html` - Página principal
- `package.json` - Configuração do projeto
- `.gitignore` - Exclusões do git
- `CNAME` - Configuração de domínio personalizado

### Pasta CSS
- `css/style.css` - Estilos da página

### Imagens (todas as .png, .jpg, .jpeg)
- `impulsia-logo.jpg`
- `background.png`
- `5ec2d187-c171-4824-adbf-e7ed7d23e1c7.png`
- `972b06ab-5e12-4f13-93ba-290e11b20de1.png`
- `97316AF1-79D7-499E-96BF-849794AA45F5.jpeg`
- `c940622d-625c-4ae7-b471-8934e63f662c.png`

### Arquivos que NÃO devem ir para o GitHub
- `node_modules/` (excluído pelo .gitignore)
- `dist/` (pasta de build, excluída pelo .gitignore)
- `.claude/` (configurações locais)

## Comandos para Executar

### 1. Verificar status atual
```bash
git status
git log --oneline -1
```

### 2. Fazer o push (COMANDO PRINCIPAL)
```bash
git push -u origin main
```

### 3. Verificar se funcionou
```bash
git status
```

## Configuração do package.json
```json
{
  "name": "impulsia",
  "version": "1.0.0",
  "description": "Landing page para ImpulsIA",
  "scripts": {
    "dev": "live-server --open=index.html",
    "build": "rm -rf dist && mkdir -p dist && cp *.html dist/ && cp -r css dist/ && cp *.jpg *.png *.jpeg dist/ 2>/dev/null || true && cp CNAME dist/ 2>/dev/null || true",
    "serve": "live-server dist --port=3001"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yurimarianocf2/ImpulsIA.git"
  }
}
```

## Para Testar o Build Localmente
```bash
npm run build
npm run serve
```

## Última Mensagem de Commit
```
Setup inicial da landing page ImpulsIA

- Adiciona .gitignore para excluir node_modules e arquivos desnecessários
- Atualiza package.json com informações corretas do repositório
- Inclui todos os arquivos necessários para funcionamento da página
- Configura build script para gerar dist/ corretamente
- Landing page pronta para deployment
```

## URL do Repositório
https://github.com/yurimarianocf2/ImpulsIA

## Instruções para IA
1. Execute: `git push -u origin main`
2. Se der erro de autenticação, peça para o usuário configurar credenciais
3. Verifique se todos os arquivos listados acima estão no repositório
4. A página deve funcionar corretamente após o push