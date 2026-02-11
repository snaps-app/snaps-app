# Snaps - AI Knowledge Management System 🧠✨

Um sistema avançado de gerenciamento de conhecimento com IA, construído com **React**, **TypeScript**, **Tailwind CSS v4** e **Motion (Framer Motion)**.

![Snaps Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.1-38B2AC?logo=tailwind-css)

## 🎯 Sobre o Projeto

**Snaps** é uma aplicação de gerenciamento de conhecimento inspirada em metodologias como **Zettelkasten**, **PARA Method** e **Building a Second Brain**. Com design **glassmorphism dark mode** e estética **retro-futurística cyberpunk**, oferece uma experiência única para organizar, gerar e compartilhar conhecimento.

### ✨ Características Principais

- 🎨 **Design System Customizado** - Glassmorphism com acentos em azul elétrico (#00D4FF)
- 🤖 **Agente IA (Snapper)** - Cria snaps automaticamente baseado em conversas
- 📝 **Geração de Documentos** - Gere documentos em múltiplos formatos (.md, .docx, .pdf, .txt)
- 🗂️ **Gestão de Documentos** - Interface tipo Finder para gerenciar documentos
- 💬 **Chat Inteligente** - Conversas contextuais com memória persistente
- 📊 **Board View Kanban** - Organize snaps com drag & drop
- 🌐 **Neural Network Background** - Fundo animado com efeito de rede neural
- 🔍 **Knowledge Base** - Busca neural em toda base de conhecimento
- 🎭 **Animações Suaves** - Transições fluidas com Motion/Framer Motion

## 🚀 Tecnologias Utilizadas

### Core
- **React 18.3.1** - Biblioteca UI
- **TypeScript** - Type safety
- **Vite 6.3.5** - Build tool ultra-rápido
- **Tailwind CSS 4.1** - Utility-first CSS framework

### UI & Animações
- **Motion (Framer Motion) 12.23** - Animações avançadas
- **Lucide React** - Ícones modernos
- **Radix UI** - Componentes acessíveis e unstyled
- **Recharts** - Gráficos e visualizações

### Funcionalidades
- **React DnD** - Drag and drop no Kanban
- **React Hook Form** - Gerenciamento de formulários
- **Sonner** - Toast notifications elegantes
- **Material UI** - Componentes adicionais

## 📦 Estrutura do Projeto

```
snaps/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── active-chat.tsx          # Tela de chat ativo
│   │   │   ├── board-view.tsx           # Vista Kanban
│   │   │   ├── documents-view.tsx       # Gerenciador de documentos
│   │   │   ├── edit-project.tsx         # Edição de projeto
│   │   │   ├── generate-document.tsx    # Gerador de documentos
│   │   │   ├── home.tsx                 # Dashboard principal
│   │   │   ├── memory-view.tsx          # Knowledge Base global
│   │   │   ├── neural-background.tsx    # Background animado
│   │   │   ├── new-project.tsx          # Criação de projeto
│   │   │   ├── profile.tsx              # Perfil do usuário
│   │   │   ├── project-workspace.tsx    # Workspace principal
│   │   │   ├── snap-detail-modal.tsx    # Modal de detalhes
│   │   │   ├── snap-modal.tsx           # Modal de criação
│   │   │   └── ui/                      # Componentes Radix UI
│   │   └── App.tsx                      # Root component
│   ├── styles/
│   │   ├── theme.css                    # Tema e variáveis CSS
│   │   ├── tailwind.css                 # Config Tailwind
│   │   └── fonts.css                    # Fontes customizadas
│   └── lib/
│       └── utils.ts                     # Utilitários
├── package.json
├── vite.config.ts
└── README.md
```

## 🛠️ Instalação e Setup

### Pré-requisitos
- Node.js 18+ ou superior
- pnpm (recomendado) ou npm

### Instalação

```bash
# Clone o repositório
git clone https://github.com/SEU-USUARIO/snaps.git
cd snaps

# Instale as dependências
pnpm install
# ou
npm install

# Inicie o servidor de desenvolvimento
pnpm dev
# ou
npm run dev
```

O aplicativo estará rodando em `http://localhost:5173`

### Build para Produção

```bash
pnpm build
# ou
npm run build
```

Os arquivos otimizados estarão na pasta `dist/`

## 🎨 Design System

### Cores Principais
- **Primary Blue**: `#00D4FF` - Azul elétrico para ações principais
- **Purple**: `#A855F7` - Acentos secundários
- **Orange**: `#FF6B35` - Alertas e voltar
- **Green**: `#22C55E` - Sucesso e documentos

### Componentes Principais
- **Botões**: Primary (glow azul), Secondary (transparente), Ghost (underlines)
- **Cards**: Glassmórficos com backdrop blur
- **Tags**: Neon com 20% de opacidade
- **Modals**: Backdrop blur com animações suaves
- **Stepper**: Vertical com indicadores de progresso

## 🖥️ Telas Principais

### 1. Home Dashboard
- Background neural network animado
- Cards de projetos com estatísticas
- Botões centralizados para navegação rápida

### 2. Project Workspace
- Split layout (25% conversas + 75% snaps)
- Grid de snap cards com tags
- Filtros por tags
- FABs flutuantes para ações rápidas

### 3. Active Chat
- Split 50/50 (chat + contextual memory)
- Tabs: Contextual Memory e Snap Area
- Badges de contagem
- Confidence scores em snaps sugeridos

### 4. Board View (Kanban)
- Drag & drop entre colunas
- Cores por tipo de snap
- Contador de itens por coluna

### 5. Generate Document
- Prompt para descrever documento
- Seleção de formato (.md, .docx, .pdf, .txt)
- Multi-select de snaps para contexto
- Botão "Select All/Deselect All"

### 6. Documents View
- Tabs: Generated / Imported
- Cards tipo Finder com preview
- Ações: View, Download, Delete
- Cores específicas por formato

### 7. Knowledge Base (Global Memory)
- Sidebar com estrutura de pastas
- Neural search
- Filtros por tipo (Notes, Files, Code)
- Estatísticas de uso

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

Desenvolvido com 💙 por **[Seu Nome]**

## 🙏 Agradecimentos

- Design inspirado em sistemas de second brain (Zettelkasten, PARA, Evergreen Notes)
- UI/UX inspirado em estética cyberpunk e glassmorphism
- Comunidade React e Tailwind CSS

---

⭐ Se este projeto foi útil, considere dar uma estrela!
