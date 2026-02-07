# Manual — Script de Release (alpha / beta / stable) + PRs (GitHub CLI)

Este documento explica como usar o script `scripts/release.mjs` para criar **tags de release** (`alpha`, `beta`, `stable`) e, quando possível, **abrir PRs automaticamente** usando o GitHub CLI (`gh`).

> O objetivo do script é: **padronizar releases**, reduzir erros manuais e garantir que o **GitHub Actions publique no Docker Hub** sempre que uma **tag** for criada.

---

## 1) O que o script faz (visão geral)

Quando você roda o script, ele:

1. Verifica se o repositório está com **working tree limpa** (sem arquivos modificados/pendentes).
2. Faz `git fetch --all --tags` para garantir que tags e branches estão atualizados.
3. Cria uma **tag anotada** no Git:
   - `vX.Y.Z-alpha.N` (alpha)
   - `vX.Y.Z-beta.N` (beta)
   - `vX.Y.Z` (stable)
4. Faz `git push origin <tag>` (isso dispara o workflow do GitHub Actions que publica no Docker Hub).
5. (Opcional) Tenta criar PRs automaticamente via `gh pr create`:
   - Se você estiver numa branch diferente de `develop` e `main`, ele abre PR dessa branch → `develop`
   - Se o canal for `beta`, ele tenta abrir PR de `develop` → `main` (promoção)

---

## 2) Pré-requisitos

### 2.1 Git instalado e configurado
Você precisa do Git funcionando normalmente no projeto.

### 2.2 Node.js
Você precisa de Node.js instalado (recomendado Node 18+).

Verifique:
`bash
node -v`

### 2.3 GitHub CLI (`gh`)

O script usa `gh` para criar PRs automaticamente.

Instale o GitHub CLI:

-   Documentação oficial: <https://cli.github.com/>

Depois faça login:

`gh auth login`

Verifique se está logado:

`gh auth status`

> Se você não tiver o `gh`, o script ainda consegue **criar e enviar a tag**. A parte dos PRs pode falhar (e ele vai avisar).

* * * * *

3) Onde o script deve ficar no projeto
--------------------------------------

Estrutura recomendada:

`your-repo/
  scripts/
    release.mjs`

Opcional: deixe o arquivo executável:

`chmod +x scripts/release.mjs`

* * * * *

4) Convenção de tags (padrão adotado)
-------------------------------------

O script cria tags no formato **SemVer** com prefixo `v`:

### Stable (release final)

-   `v1.2.0`

### Alpha (pré-release inicial / instável)

-   `v1.2.0-alpha.1`

-   `v1.2.0-alpha.2`

### Beta (pré-release mais estável)

-   `v1.2.0-beta.1`

-   `v1.2.0-beta.2`

Essas tags são essenciais porque:

-   Elas acionam o GitHub Actions **(publish docker tags only)**.

-   Elas geram tags no Docker Hub no formato esperado (ex.: `1.2.0`, `1.2.0-alpha.1`, etc).

-   `vX.Y.Z` (stable) também marca `latest` automaticamente no workflow (se configurado).

* * * * *

5) Como usar
------------

> Sempre rode o script **a partir da raiz do repositório**.

### 5.1 Alpha

Uso:

`node scripts/release.mjs alpha 1.2.0 1`

Isso cria e envia a tag:

-   `v1.2.0-alpha.1`

Quando usar:

-   Você quer publicar uma versão **para testes iniciais**.

-   Pode conter features incompletas/instáveis.

Boas práticas:

-   Incrementar o `N` sempre que publicar outro alpha da mesma versão base:

    -   `alpha 1.2.0 2` → `v1.2.0-alpha.2`

* * * * *

### 5.2 Beta

Uso:

`node scripts/release.mjs beta 1.2.0 1`

Isso cria e envia a tag:

-   `v1.2.0-beta.1`

Quando usar:

-   Você acredita que a versão está **quase pronta**, mas quer validação final.

-   Ideal para testes mais amplos e correções finais.

* * * * *

### 5.3 Stable (final)

Uso:

`node scripts/release.mjs stable 1.2.0`

Isso cria e envia a tag:

-   `v1.2.0`

Quando usar:

-   Versão final pronta para produção.

-   O workflow pode marcar `latest` quando detectar uma tag estável.

* * * * *

6) Regras e validações do script
--------------------------------

### 6.1 Repositório precisa estar "limpo"

Se você tiver arquivos modificados sem commit, o script **vai parar**.

Verificar status:

`git status`

Resolver:

-   Faça commit:

    `git add .
    git commit -m "..."`

-   Ou guarde com stash:

    `git stash`

* * * * *

7) PRs automáticos (como funciona)
----------------------------------

O script tenta criar PRs automaticamente com `gh`:

### Cenário 1 --- você está numa branch de feature/fix

Ex.: `feat/login`

-   Ele abre PR: `feat/login` → `develop`

### Cenário 2 --- canal beta

Além do PR acima, ele tenta abrir PR:

-   `develop` → `main`

> Se já existir PR aberto, ou se faltar permissão/configuração, o script pode falhar nessa etapa.\
> Mesmo assim, a tag já terá sido criada e enviada.

* * * * *

8) Exemplo de fluxo recomendado (simples e seguro)
--------------------------------------------------

### Fluxo Alpha

1.  Trabalha numa branch (`feat/x`)

2.  Merge para `develop` via PR

3.  Cria tag alpha apontando para o commit testado

    `node scripts/release.mjs alpha 1.2.0 1`

### Fluxo Beta

1.  `develop` já está estável

2.  Cria tag beta

    `node scripts/release.mjs beta 1.2.0 1`

3.  Promove `develop` → `main` (PR automático ou manual)

### Fluxo Stable

1.  `main` está pronto

2.  Cria tag final

    `node scripts/release.mjs stable 1.2.0`

* * * * *

9) O que acontece após enviar a tag (CI/CD)
-------------------------------------------

Quando a tag é enviada:

-   O GitHub Actions roda o workflow de publish.

-   Ele builda imagem multi-arch:

    -   `linux/amd64`

    -   `linux/arm64`

-   E publica no Docker Hub com tags compatíveis.

Tags típicas resultantes:

-   Stable `v1.2.0`:

    -   `1.2.0`, `1.2`, `1`, `latest`

-   Alpha `v1.2.0-alpha.1`:

    -   `1.2.0-alpha.1`, `alpha`

-   Beta `v1.2.0-beta.1`:

    -   `1.2.0-beta.1`, `beta`

> A lista exata depende de como seu `docker/metadata-action` está configurado.

* * * * *

10) Problemas comuns e soluções
-------------------------------

### "Seu git não está limpo"

-   Rode:

    `git status`

-   Faça commit/stash.

### "gh: command not found"

-   Instale GitHub CLI e faça login:

    `gh auth login`

### Falha ao criar PR

-   Verifique se você tem permissão no repo.

-   Cheque se já existe PR aberto igual.

-   Crie manualmente:

    `gh pr create --base develop --head <sua-branch> --title "..." --body "..."`

### Tag já existe

Se você tentar criar uma tag que já existe, o Git vai bloquear.

Veja tags:

`git tag --list`

Use outro número (`alpha.2`, `beta.2`) ou outra versão base.

* * * * *

11) Dicas de maintainer (para não virar bagunça)
------------------------------------------------

-   Sempre use SemVer com prefixo `v` nas tags.

-   Publique alpha/beta com incrementos (`alpha.1`, `alpha.2`, etc).

-   Tenha regras de branch protection em `main` e `develop`:

    -   merge só via PR

    -   checks obrigatórios

    -   bloquear force-push