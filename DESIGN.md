---
name: Assistente de Candidaturas
description: Interface editorial local para preparar candidaturas
colors:
  paper: "#f5efe6"
  ink: "#2a211c"
  brown: "#39281f"
  action: "#714a35"
  muted: "#725e50"
  line: "#d5c7b8"
  white: "#fffcf8"
  button-text: "#ffffff"
  action-hover: "#563723"
  field-border: "#b7a797"
  focus: "#a26931"
  nav-text: "#e5d6c8"
  nav-hover: "#523c2e"
  notice-bg: "#e9ddcf"
  notice-text: "#594332"
  disabled-bg: "#e0d5c9"
  disabled-text: "#68584b"
  disabled-border: "#c5b5a4"
  secondary-border: "#b7a391"
  secondary-hover: "#eadfd1"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(36px, 4vw, 60px)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "23px"
    fontWeight: 400
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"DM Sans", sans-serif'
    lineHeight: 1.65
  label:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "13px"
rounded:
  field: "4px"
  button: "5px"
spacing:
  popup-action-gap: "10px"
  field: "12px"
  grid: "22px"
  section: "30px"
  intro: "42px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.button}"
    padding: "11px 22px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px"
  navigation-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.brown}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
---

# Design System: Assistente de Candidaturas

## Overview

**Creative North Star: "Mesa editorial de candidaturas"**

Uma mesa de trabalho editorial para preparar candidaturas. O papel bege acolhe formulários extensos, enquanto a navegação marrom delimita a operação. Títulos com serifa dão caráter humano; controles discretos mantêm a leitura e o preenchimento como prioridade.

A implementação é code-first: HTML, CSS e TypeScript são a fonte visual, sem biblioteca de componentes. Este documento registra o CSS existente, sem ampliar capacidades do produto.

**Key Characteristics:**
- Marrom e bege com texto escuro nas superfícies claras e claro nas escuras.
- Newsreader nos títulos e DM Sans na interface, servidas por arquivos locais.
- Seções separadas por linhas, com espaço para descrições longas.
- Navegação de operação consistente entre configurações e popup.

## Colors

### Primary

Marrom profundo delimita a navegação e o feedback. Marrom de ação destaca botões principais. As variantes de hover e desabilitado são as registradas no frontmatter.

### Neutral

Bege papel sustenta a área de trabalho. Branco quente marca campos. Tinta escura mantém a leitura; texto secundário marrom suaviza descrições sem trocar o papel dos títulos. Divisores discretos organizam as seções. Texto branco aparece nos botões principais; a navegação usa tons claros quentes.

**The Papel Rule.** Preserve o contraste entre a navegação escura e a área de trabalho clara.

## Typography

Newsreader, com fallback Georgia e serif, compõe títulos e marca. DM Sans, com fallback sans-serif, compõe controles e texto. Os arquivos locais são `fonts/newsreader.woff2` e `fonts/dm-sans.woff2`, declarados com peso 400 e `font-display: swap`; `font-synthesis: none` evita pesos artificiais.

A hierarquia principal está no frontmatter. A marca usa 28px; no popup, 24px. O título do popup usa 38px. Parágrafos têm largura máxima de 68ch. O subtítulo da marca usa 11px, caixa alta e espaçamento de 0.09em. Valores numéricos de campos e contagens usam algarismos tabulares. Não há tamanho global explícito para o corpo.

## Layout

As configurações usam grade com navegação de 252px e área flexível. A navegação é sticky e ocupa a altura da janela. O conteúdo tem máximo de 1100px e padding de 50px 6% 80px. Seções combinam introdução de 210px e formulário flexível, separados por 32px. Formulários usam duas colunas com intervalo de 22px; campos extensos ocupam toda a largura.

Até 900px, a navegação passa a 200px e as seções ficam em uma coluna. Até 600px, a estrutura vira bloco; a navegação passa ao topo, com rolagem horizontal, e os campos ficam em uma coluna. O popup usa largura de 370px, mínimo de 320px e limite de 100vw em telas pequenas. Essas regras são observadas no CSS; não constituem certificação de todos os tamanhos ou navegadores.

## Elevation & Depth

A estrutura é plana, delimitada por cor e linhas. Somente o feedback flutuante usa sombra (`0 8px 24px #39281f26`). Ele fica fixo a 24px da base e da direita, com largura limitada à janela e z-index 5.

## Shapes

Campos, avisos e itens de navegação têm cantos de 4px. Botões e feedback usam 5px. Bordas de campos e divisores têm 1px. A forma é contida, sem cartões decorativos recorrentes.

## Components

### Buttons

Botões principais usam marrom de ação e texto branco, altura mínima de 44px e padding de 11px 22px. Hover escurece o fundo. A variante secundária usa fundo transparente, borda marrom clara e hover bege. Desabilitados usam tons próprios e cursor `not-allowed`.

### Inputs / Fields

Campos usam branco quente, tinta escura, borda marrom clara e altura mínima de 46px. Textareas começam com 180px, permitem redimensionamento vertical e usam entrelinha 1.6. Rótulos explícitos aparecem acima. Checkbox usa 20px dentro de uma linha com mínimo de 44px. O foco global usa contorno de 3px e afastamento de 4px. Não há variante visual específica de erro de campo no CSS atual.

### Navigation

A operação oferece Meus dados, Experiências, Minhas respostas, Perfis, Preferências e Privacidade. Itens são botões alinhados à esquerda. `aria-current="page"` recebe fundo papel e texto marrom. Hover usa marrom intermediário. Em telas pequenas, os mesmos itens permanecem acessíveis na faixa horizontal.

### Avisos, registros e feedback

Avisos usam fundo bege mais denso e padding de 18px. Registros são separados por linhas, com cabeçalho flexível e texto preservando quebras de linha. Estados vazios usam texto explicativo, sem contagens inventadas. O popup mostra o preenchimento em preparação e mantém o botão correspondente desabilitado.

### Análise no popup

“Analisar página” é a ação principal. “Preencher página” permanece secundária e desabilitada, separada da ação anterior por 10px. A análise não altera campos. Durante a leitura, a ação fica desabilitada com o texto “Analisando…”, as contagens voltam ao travessão e o status textual informa o progresso. Ao terminar ou falhar, a ação é habilitada novamente.

Contagens de campos encontrados e campos editáveis aparecem somente a partir de resposta validada da extensão. Antes da análise e em falhas, permanecem indisponíveis. O status usa `role="status"`; não há spinner ou novos estilos de carregamento. A nota informa que a análise cobre campos nativos visíveis da página principal; componentes customizados não são identificados. Havendo frames ou anexos, acrescenta limites de leitura dos frames e seleção manual de arquivos. Na prévia web, a análise fica desabilitada com explicação de que requer a extensão instalada.

Movimento é discreto: hover da navegação dura 0.16s; feedback entra em 0.2s, com deslocamento de 8px e desfoque inicial de 2px. Ambos são ativados apenas quando `prefers-reduced-motion: no-preference` corresponde.

## Do's and Don'ts

### Do:
- Do preservar rótulos explícitos e foco visível.
- Do manter estados vazios honestos e contagens indisponíveis como travessão.
- Do usar campos amplos para respostas e experiências.
- Do manter as fontes locais e a identidade compartilhada pelo popup.

### Don't:
- Don't apresentar análise básica como detecção de componentes customizados, leitura de frames ou preenchimento disponível.
- Don't inserir métricas fictícias ou dados pessoais no repositório.
- Don't substituir divisores e superfícies por uma coleção de cartões com sombra.
- Don't adicionar animação quando a preferência de movimento reduzido estiver ativa.
