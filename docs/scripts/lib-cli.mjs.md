# Script: `scripts/lib/cli.mjs`

## 1. Objetivo

Fornecer utilitarios de interacao de linha de comando para os scripts de release:

- perguntas de escolha (`promptChoice`)
- entrada textual (`promptInput`)
- confirmacao sim/nao (`confirm`)
- verificacao de suporte a prompt (`isPromptSupported`)

## 2. Quem usa

- `scripts/publish.mjs`
- `scripts/release.mjs`

## 3. Conceitos principais

### 3.1 Suporte a prompt

`isPromptSupported()` retorna `true` quando:

- o terminal e TTY (`stdin` e `stdout`), ou
- a variavel `DS_ALLOW_NON_TTY_PROMPTS=1` esta ativa.

Essa variavel existe para suportar cenarios de teste/pipeline com entrada pipada.

### 3.2 Leitura de entrada

A funcao interna `askRaw(question)` tem dois modos:

1. TTY:
   - usa `readline.createInterface`
   - pergunta e espera resposta do usuario
2. Nao TTY:
   - le todo `stdin` uma vez (`fs.readFileSync(0, "utf-8")`)
   - divide em linhas e consome respostas sequencialmente
   - permite simular interacao com pipe

Se acabar entrada no modo nao TTY, retorna `null`.

## 4. API exportada

### 4.1 `promptChoice(question, options)`

- exibe menu numerado
- aceita somente numero valido
- repete ate entrada valida
- erro se nao houver opcoes

Formato de `options`:

```js
[{ label: "alpha", value: "alpha" }]
```

### 4.2 `promptInput(question, { defaultValue, validate })`

- mostra pergunta com default opcional
- usa default quando usuario envia linha vazia
- permite validacao custom via callback
- repete ate valor valido

### 4.3 `confirm(question, { defaultYes })`

- aceita respostas:
  - positivas: `s`, `sim`, `y`, `yes`
  - negativas: `n`, `nao`, `não`, `no`
- enter vazio aplica default:
  - `[S/n]` quando `defaultYes=true`
  - `[s/N]` quando `defaultYes=false`

### 4.4 `ensurePromptsAvailableOrExit(contextMessage)`

- aborta processo com mensagem orientando uso de:
  - `--non-interactive` com argumentos completos
  - terminal interativo

## 5. Tratamento de erro e robustez

- se entrada terminar no meio do fluxo, funcoes lancam erro descritivo:
  - selecao
  - input
  - confirmacao
- evita loop infinito quando nao ha mais dados no `stdin` pipado.

## 6. Efeitos colaterais

- I/O de terminal (`stdout/stderr/stdin`) apenas.
- nao altera arquivos nem Git.

