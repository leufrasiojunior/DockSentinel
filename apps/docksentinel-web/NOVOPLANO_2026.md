# Plano de Ação - Reorganização DockSentinel Web (2026)

Este plano visa melhorar a manutenibilidade, escalabilidade e legibilidade do projeto, adotando padrões de arquitetura moderna (inspirado em Feature-Sliced Design - FSD, mas simplificado) e separando responsabilidades de forma clara.

## 1. Arquitetura de Pastas Proposta

### `src/shared` (Global & Reutilizável)
- `src/shared/components/ui`: Componentes base (Botões, Inputs, Cards, Badges) - Atualmente em `src/layouts/ui`.
- `src/shared/api`: Cliente HTTP base (axios/fetch), interceptores e tipos globais.
- `src/shared/hooks`: Hooks de uso geral (`usePageVisibility`, etc).
- `src/shared/utils`: Funções utilitárias puras e helpers globais.

### `src/features` (Lógica de Negócio por Domínio)
Cada feature deve ser auto-contida:
- `src/features/[feature]/api`: Chamadas de API específicas da feature.
- `src/features/[feature]/components`: Componentes internos da feature (ex: `ContainerList`, `SettingsForm`).
- `src/features/[feature]/hooks`: Lógica de estado e chamadas de API encapsuladas (ex: `useContainers`).
- `src/features/[feature]/utils`: Helpers específicos do domínio.
- `src/features/[feature]/types.ts`: Interfaces e tipos da feature.

### `src/pages` (Páginas de Roteamento)
- Devem ser "thin" (finas), servindo apenas para compor componentes das features e layouts.
- Evitar lógica de negócio pesada ou chamadas de API diretas.

---

## 2. Etapas de Execução

### Fase 1: Padronização de Componentes UI (Design System)
- [ ] Mover `src/layouts/ui/*` para `src/shared/components/ui`.
- [ ] Refatorar componentes para garantir que são agnósticos ao contexto (puros).
- [ ] Atualizar imports em todo o projeto.

### Fase 2: Migração de APIs
- [ ] Mover `src/api/http.ts` para `src/shared/api/http.ts`.
- [ ] Distribuir as APIs de `src/api/*` para suas respectivas pastas em `src/features/[feature]/api`.
- [ ] Criar tipos específicos dentro de cada feature.

### Fase 3: Refatoração da Dashboard (Docker Feature)
A `DashboardPage.tsx` está muito grande.
- [ ] Criar `src/features/docker`.
- [ ] Extrair `SimpleIconsLogo` e helpers de imagem para `src/features/docker/components/ContainerIcon`.
- [ ] Extrair a tabela de containers para `src/features/docker/components/ContainerTable`.
- [ ] Extrair o modal de detalhes para `src/features/docker/components/ContainerDetailsModal`.
- [ ] Criar hook `useContainers` em `src/features/docker/hooks` para gerenciar o estado e mutations.

### Fase 4: Refatoração de Configurações (Settings Feature)
- [ ] Criar `src/features/settings`.
- [ ] Separar as abas em componentes distintos: `AuthSettings` e `NotificationSettings`.
- [ ] Extrair a lógica de TOTP para `src/features/auth` ou `src/features/settings/hooks/useTotp`.
- [ ] Simplificar a `SettingsPage.tsx` para apenas gerenciar a troca de abas.

### Fase 5: Padronização de Layouts e Roteamento
- [ ] Limpar `src/layouts/AppShell.tsx`.
- [ ] Garantir que `src/pages` apenas importam componentes de `features`.

---

## 3. Diretrizes de Codificação

1. **Surgical Updates**: Evitar refatorações "porque sim" em arquivos que não fazem parte da tarefa atual.
2. **Typescript Everywhere**: Garantir que novos componentes e hooks tenham tipagem forte.
3. **Encapsulamento**: Se uma lógica ou componente é usado apenas em uma feature, ele deve morar na pasta da feature. Se for usado em 2 ou mais, move-se para `shared`.
4. **Clean Code**: Funções auxiliares em arquivos separados (`utils.ts`) para facilitar testes unitários.

---

## 4. Próximos Passos Imediatos
1. Criar a estrutura `shared/components/ui`.
2. Mover Badges, Buttons, etc.
3. Iniciar a extração da lógica da Dashboard.
