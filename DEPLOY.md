# 🚀 Guia de Deploy no GitHub

Este guia mostra como fazer deploy do projeto Snaps no GitHub.

## 📋 Pré-requisitos

- Conta no GitHub
- Git instalado localmente
- Projeto já configurado (veja README.md)

## 🔧 Passo a Passo

### 1. Criar Repositório no GitHub

1. Acesse [github.com](https://github.com)
2. Clique em **"New repository"** (ou `+` no canto superior direito)
3. Configure o repositório:
   - **Repository name**: `snaps` (ou nome de sua preferência)
   - **Description**: "AI Knowledge Management System with Glassmorphism UI"
   - **Visibility**: Public ou Private
   - ⚠️ **NÃO** marque "Initialize this repository with a README"
4. Clique em **"Create repository"**

### 2. Configurar Git Localmente

No terminal, na pasta raiz do projeto, execute:

```bash
# Inicializar repositório Git (se ainda não foi feito)
git init

# Adicionar todos os arquivos
git add .

# Fazer o primeiro commit
git commit -m "🎉 Initial commit: Snaps AI Knowledge Management System"

# Adicionar o remote do GitHub (substitua SEU-USUARIO e SEU-REPO)
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git

# Verificar se o remote foi adicionado
git remote -v

# Fazer push para o GitHub
git branch -M main
git push -u origin main
```

### 3. Verificar no GitHub

Acesse seu repositório no GitHub e verifique se todos os arquivos foram enviados corretamente.

## 🌐 Deploy com GitHub Pages

### Opção 1: Usando Vite + GitHub Pages

1. Instale a extensão do GitHub Pages:
```bash
pnpm add -D gh-pages
```

2. Edite o `package.json` e adicione:
```json
{
  "homepage": "https://SEU-USUARIO.github.io/SEU-REPO",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Execute o deploy:
```bash
pnpm run deploy
```

4. Configure o GitHub Pages:
   - Vá em **Settings** > **Pages**
   - Em **Source**, selecione `gh-pages` branch
   - Clique em **Save**

5. Aguarde alguns minutos e acesse: `https://SEU-USUARIO.github.io/SEU-REPO`

### Opção 2: Usando Vercel (Recomendado)

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta GitHub
3. Clique em **"Import Project"**
4. Selecione o repositório do Snaps
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Clique em **"Deploy"**
7. ✅ Pronto! Seu app estará no ar em poucos segundos

URL: `https://seu-projeto.vercel.app`

### Opção 3: Usando Netlify

1. Acesse [netlify.com](https://netlify.com)
2. Faça login com sua conta GitHub
3. Clique em **"Add new site"** > **"Import an existing project"**
4. Selecione o repositório do Snaps
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Clique em **"Deploy site"**
7. ✅ Pronto!

URL: `https://seu-projeto.netlify.app`

## 🔄 Atualizações Futuras

Sempre que fizer alterações no código:

```bash
# Adicionar alterações
git add .

# Commit com mensagem descritiva
git commit -m "✨ Add new feature"

# Enviar para o GitHub
git push origin main

# Se estiver usando GitHub Pages
pnpm run deploy
```

**Nota**: Vercel e Netlify fazem deploy automático a cada push!

## 🛠️ Comandos Úteis

```bash
# Ver status dos arquivos
git status

# Ver histórico de commits
git log --oneline

# Criar nova branch
git checkout -b feature/nova-feature

# Voltar para main
git checkout main

# Merge de branch
git merge feature/nova-feature

# Ver diferenças
git diff
```

## 📝 Dicas

- ✅ Faça commits frequentes com mensagens descritivas
- ✅ Use [Conventional Commits](https://www.conventionalcommits.org/)
- ✅ Crie branches para novas features
- ✅ Faça Pull Requests para revisar código
- ✅ Configure GitHub Actions para CI/CD automático

## 🐛 Troubleshooting

### Erro: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
```

### Erro: "refusing to merge unrelated histories"
```bash
git pull origin main --allow-unrelated-histories
```

### Build falha no deploy
- Verifique se todas as dependências estão em `package.json`
- Rode `pnpm build` localmente para testar
- Verifique os logs de build no dashboard da plataforma

## 📞 Suporte

Se tiver problemas:
1. Verifique a documentação oficial do [GitHub](https://docs.github.com)
2. Consulte a documentação do [Vite](https://vitejs.dev)
3. Abra uma issue no repositório

---

✨ Bom deploy! Se tiver dúvidas, consulte a documentação oficial das plataformas.
