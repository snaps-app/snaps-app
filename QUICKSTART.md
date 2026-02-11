# ⚡ Quick Start - Deploy GitHub

## 📦 Arquivos criados para você:
- ✅ `README.md` - Documentação completa do projeto
- ✅ `.gitignore` - Arquivos que não devem ir para o GitHub
- ✅ `DEPLOY.md` - Guia detalhado de deploy
- ✅ `package.json` - Atualizado com scripts necessários

## 🚀 Deploy Rápido em 3 Passos

### 1️⃣ Criar Repositório no GitHub
1. Acesse https://github.com/new
2. Nome: `snaps-ai-knowledge` (ou outro nome)
3. Descrição: "AI Knowledge Management System"
4. **NÃO** marque "Initialize with README"
5. Clique em "Create repository"

### 2️⃣ Configurar Git Local
Execute no terminal (na pasta do projeto):

```bash
# Inicializar repositório
git init

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "🎉 Initial commit: Snaps AI Knowledge System"

# Adicionar remote (SUBSTITUA com sua URL)
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git

# Enviar para GitHub
git branch -M main
git push -u origin main
```

### 3️⃣ Deploy Online (Escolha uma opção)

#### Opção A: Vercel (Recomendado - Mais Fácil)
1. Acesse https://vercel.com
2. Login com GitHub
3. "Import Project" → Selecione o repositório
4. ✅ Deploy automático!
5. URL: `https://seu-projeto.vercel.app`

#### Opção B: Netlify
1. Acesse https://netlify.com
2. Login com GitHub
3. "Add new site" → Import → Selecione repositório
4. Build: `npm run build` | Publish: `dist`
5. ✅ Deploy automático!

#### Opção C: GitHub Pages
```bash
# Instalar dependência
pnpm add -D gh-pages

# Adicionar no package.json:
# "homepage": "https://SEU-USUARIO.github.io/SEU-REPO"
# "deploy": "gh-pages -d dist"

# Deploy
pnpm run build
pnpm run deploy
```

## 🔄 Atualizações Futuras

```bash
git add .
git commit -m "✨ Nova feature"
git push origin main
```

Vercel/Netlify fazem deploy automático! 🎉

## 📝 Comandos Úteis

```bash
pnpm dev      # Rodar localmente
pnpm build    # Build para produção
pnpm preview  # Preview do build
```

## 🆘 Problemas?

Consulte o arquivo `DEPLOY.md` para guia detalhado!

---

✨ **Dica**: Recomendo usar Vercel pela facilidade e deploy automático!
