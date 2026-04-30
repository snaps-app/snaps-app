# Roadmap — Nubo Conecta V1 Launch

## Sprint 1.0: Fundação, Identidade e Perfis
**Objetivo:** Estabelecer o alicerce de infraestrutura em todos os pontos, permitindo o App renderizar telas base com autenticação moderna, e preparando a base de usuários para acomodar dependentes.
### Cards
- Setup Next.js/React 19 + Tailwind 4 no App
- Implementação de Roteamento e Perfil Básico no App
- Integração Auth WhatsApp (OTP) no App
- Instanciação do layout v1 (Nova Sidebar) no Admin
- Contexto de Sessão Protegida no Admin
- Tela de Controle de Usuários (/users) no Admin
- Migrations de user_profiles e Supabase Auth

## Sprint 2.0: O Novo Catálogo e o Motor MEC
**Objetivo:** Construir o pipeline de ingestão de dados e exibir um catálogo navegável coerente e de ponta no app, onde Sisu, Prouni e Vagas Privadas coexistem visualmente.
### Cards
- Aba "Para Você" (parcial) no App
- Tela de Busca de Oportunidades no App
- Páginas Detalhe da Oportunidade (/opportunities/[id]) no App
- Pipeline RPC de Importação MEC (/institutions) no Admin
- CRUD de Parcerias (/partners) no Admin
- CRUD de Vagas Privadas (/partner-opportunities) no Admin
- CRUD App CMS (/app-cms) para highlights de home no Admin
- Modelagem de institutions e v_unified_opportunities

## Sprint 2.5: Adaptação Visual, Explorar Todas e Instituições
**Objetivo:** Polimento estrito de UI/UX pixel a pixel, inserção da diretriz de responsividade (Desktop-Adaptive) e desenvolvimento das features de interface do Explorar e Instituições.
### Cards
- Refino pixel a pixel dos componentes CardOportunidades e CardOportunidadeParceira
- Construção da aba "Explorar Todas" (Search, Category Pills, Modal de Filtros)
- Estrutura da Tela de Instituições (/institutions/[id])
- Implementação de URL Sync para filtros (searchParams)

## Sprint 3.0: O Cérebro Unificado e a Home Dashboard
**Objetivo:** Dotar o aplicativo de inteligência algorítmica de vitrine e inteligência conversacional autônoma consultiva.
### Cards
- Engine Lógica do "Gerar Match" (Consumo de preferences) no App
- FAB flutuante e Drawer do Chat responsivo no App
- Dashboard da Tela Home (raiz /) no App
- O Laboratório de Match (/match-engine) no Admin
- Console de Prompts e System Instructions (/agent-config) no Admin
- Gestão da Base de Conhecimento (/knowledge) no Admin
- Construção técnica dos três Agentes (Planning, Reasoning, Response)
- Hook automático do Schema MCP on Boot

## Sprint 4.0: A Jornada de Conversão (Candidaturas Dinâmicas)
**Objetivo:** Mover o motor de transação do bot de Chat (antigo passaporte) nativamente para o frontend na forma de um Construtor de Formulários Multi-step inteligente.
### Cards
- Engine Dinâmica PartnerFormEngine.tsx no App
- Integração LocalStorage Auto-save no App
- UI de Acompanhamento de Resumo (/candidaturas) no App
- Construtor JSON de perguntas (/forms) no Admin
- Painel B2B Sandbox no Admin
- Mesa de Aprovação (/applications) no Admin
- Schema de student_applications e partner_forms

## Sprint 4.5: QA Priority Fixes (Onboarding e Catálogo)
**Objetivo:** Resolver débitos técnicos emergenciais e bloqueadores apontados durante a Fase 4 de QA, estabilizando as integrações front/back.
### Cards
- Fixes visuais no Match Onboarding Form no App
- Lógica de state para No-Profile no HomeClient do App
- Correção de RPCs ambíguas (calculate_match) no Admin
- Estabilização do serviço MCP e adequação de tipagem
- Sincronização de UserDataSection e UserPreferencesSection

## Sprint 5.0: Qualificação da Cloudinha, Observabilidade e System Intents
**Objetivo:** Tornar o pipeline multi-agente da Cloudinha auditável, observável e controlável com rastreabilidade completa e interatividade proativa.
### Cards
- Motor JS interno ativador de Intents proativos no App
- Dashboard /agent-telemetry com drill-down por sessão no Admin
- Dashboard /agent-errors (agrupados por tipo) no Admin
- Gestor UI de System Intents e Prompts globais no Admin
- Instrumentação completa do pipeline _log_agent_turn
- Captura de usage_metadata e estimativa de custos Gemini

## Sprint 5.5: Qualificação do MCP e Tool Registry Unificado
**Objetivo:** Estruturar a arquitetura de acesso a dados (Local vs Remoto) garantindo a segurança de dados (LGPD) e o empoderamento do agente cognitivo.
### Cards
- Implementação do Tool Registry Híbrido na Cloudinha
- Mesclagem de Native Tools (Python) e Remote Tools (MCP)
- Refatoração do server.py focado em catálogo público e conhecimento
- Roteamento dinâmico de chamadas locais vs remotas em reasoning.py

## Sprint 6.0: Ciclo de Vida de Oportunidades & Action Center
**Objetivo:** Estabelecer a infraestrutura temporal para as oportunidades e construir o Action Center do Admin para gestão escalável via alertas.
### Cards
- Painel UI Action Center integrado no Admin
- Ajuste de formulário de Partner Opportunities (starts_at/ends_at)
- Evolução das métricas de Telemetria e Alertas
- Server fix no MCP incluindo novos status e colunas temporais
- Background Workers para detecção de datas expirando

## Sprint 7.0: Refinamento do Match Engine & UI do Catálogo
**Objetivo:** Revisão cirúrgica de toda a modelagem matemática e lógica de match, além da retomada e finalização dos débitos de UI do Catálogo.
### Cards
- Ordenação da Aba "Para Você" via API no App
- Conclusão dos filtros e páginas de Detalhe de Vaga no App
- Implementação de badges de "X% Compatível" nos cards do App
- Evolução do Laboratório de Match para "Shadow Testing" no Admin
- Refinamento da RPC calculate_match e materialização dinâmica

## Sprint 8.0: Dependentes, Favoritos e Workflow Misto
**Objetivo:** Polimento do ecossistema familiar, permitindo contas agregadas e a feature central de Favoritos para a gestão curada.
### Cards
- Fluxo "Adicionar Dependente" completo no App
- Acoplamento global do active_profile_id no App
- Implementação da Aba 3 (Favoritos) no perfil do estudante no App
- Dashboards analíticos puros (Reasonings Ocultos) no Admin
- Visualizador CRM de Memória Cognitiva em /students no Admin
- Worker de Condensação JSON Assíncrono para histórico de chat

## Sprint 9.0: Ecossistema de Growth & Sales B2B
**Objetivo:** Estruturar e ativar as ferramentas comerciais e analíticas profundas para o time de Marketing e Vendas do Nubo.
### Cards
- Dashboard B2B Central (/b2b-dashboard) no Admin
- Ingestão de Leads Comerciais via LPs Inbound (/solicitations)
- Programa de Influencers (/influencers) no Admin
- Painéis de Sean Ellis Fit Score (/sean-ellis) no Admin
- Views e materializações exclusivas para Growth Analytics
