# Script: `scripts/tests/publish-release.integration.sh`

## 1. Objetivo

Executar testes de integracao ponta a ponta dos scripts de release em repositorios temporarios.

Este teste valida comportamento real de CLI e Git sem depender do repositorio principal.

## 2. Como e acionado

Via script da raiz:

```bash
npm run test:scripts
```

Comando atual em `package.json`:

```bash
node --test scripts/tests/release-utils.test.mjs && bash scripts/tests/publish-release.integration.sh
```

## 3. Estrutura do script

### 3.1 Preparacao

- define `PROJECT_ROOT` e `SCRIPTS_SOURCE`
- configura `cleanup` com `trap EXIT` para remover temporarios

### 3.2 Helpers

- `create_temp_repo(version)`:
  - cria repo temporario em `/tmp`
  - copia pasta `scripts/`
  - gera `package.json` e `package-lock.json` minimos
  - inicializa Git e cria commit inicial
- `assert_contains(file, pattern)`:
  - garante que saida contenha regex
- `assert_eq(actual, expected, message)`:
  - comparacao direta com erro amigavel
- `run_capture(output_file, cmd...)`:
  - executa comando e captura status + logs
- `new_log_file()`:
  - cria log temporario em `/tmp`

## 4. Cenarios cobertos

1. `publish` sem args abre wizard e conclui `dry-run`
   - usa `DS_ALLOW_NON_TTY_PROMPTS=1`
   - injeta entrada pipada (`printf '1\n'`)
   - valida que `package.json` nao mudou
2. `--non-interactive` sem argumentos falha com mensagem clara.
3. `--dry-run` com args completos:
   - nao altera arquivos
   - nao cria commit
   - nao cria tag
   - mantem `git status` limpo
4. Tag manual invalida por canal incompativel falha.
5. Repositorio sujo bloqueia release.

## 5. O que o teste garante

- contrato CLI do `publish.mjs`;
- seguranca do `release.mjs` contra estado sujo;
- previsibilidade de `--dry-run`;
- qualidade das mensagens de erro.

## 6. Efeitos colaterais

- cria repositorios temporarios em `/tmp` e remove ao final.
- nao altera o repositorio principal do projeto.

## 7. Pontos de atencao

- depende de Git instalado.
- depende de permissao para criar arquivos em `/tmp`.
- foi escolhido em Bash para evitar limitacoes de subprocesso encontradas no ambiente de teste com `node:test`.

