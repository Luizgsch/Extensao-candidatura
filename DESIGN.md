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
  popup-heading:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "28px"
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

A hierarquia principal está no frontmatter. A marca usa 28px; no popup, 24px. O título do popup usa o token compacto de 28px, com margem superior de 24px. Parágrafos têm largura máxima de 68ch. O subtítulo da marca usa 11px, caixa alta e espaçamento de 0.09em. Valores numéricos de campos e contagens usam algarismos tabulares. Não há tamanho global explícito para o corpo.

## Layout

As configurações usam grade com navegação de 252px e área flexível. A navegação é sticky e ocupa a altura da janela. O conteúdo tem máximo de 1100px e padding de 50px 6% 80px. Seções combinam introdução de 210px e formulário flexível, separados por 32px. Formulários usam duas colunas com intervalo de 22px; campos extensos ocupam toda a largura.

Até 900px, a navegação passa a 200px e as seções ficam em uma coluna. Até 600px, a estrutura vira bloco; a navegação passa ao topo, com rolagem horizontal, e os campos ficam em uma coluna. O popup usa largura de 370px, mínimo de 320px e limite de 100vw em telas pequenas. No popup, analisar e preencher ficam lado a lado em duas colunas, com intervalo de 10px; desfazer ocupa a largura abaixo, também separado por 10px. As oito contagens usam duas colunas com intervalo horizontal de 20px e margem vertical de 16px. Essas regras são observadas no CSS; não constituem certificação de todos os tamanhos ou navegadores.

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

Avisos usam fundo bege mais denso e padding de 18px. Registros são separados por linhas, com cabeçalho flexível e texto preservando quebras de linha. Estados vazios usam texto explicativo, sem contagens inventadas. O popup apresenta ações de análise, preenchimento e desfazer com estados reais de disponibilidade.

### Minhas respostas

O formulário de resposta mantém os campos e componentes existentes. “Inserção” oferece “Automática quando confiável” e “Somente sugerir”. Respostas do tipo “Texto longo — sugestão” são salvas como sugestão, mesmo quando a opção automática está selecionada. O texto de apoio esclarece que perguntas discursivas nunca são preenchidas automaticamente e que prioridade ordena sugestões.

“Onde usar” oferece “Todos os sites” ou “Somente os sites abaixo”. “Sites permitidos — domínios separados por vírgula” fica desabilitado no primeiro caso; no segundo, exige domínios explícitos válidos. Palavras-chave, expressões impeditivas e escopos orientam a correspondência real, sem prometer suporte a seleções ou frames.

### Análise, preenchimento e revisão no popup

“Preencher página” é a ação principal; “Analisar página” usa a variante secundária. As duas ficam lado a lado, com intervalo de 10px. “Desfazer último preenchimento” é secundária, ocupa a largura disponível e fica 10px abaixo. O seletor de perfil e o currículo recomendado antecedem as ações; o preenchimento usa dados gerais e respostas ativas do perfil selecionado.

O preenchimento reconhece dados gerais em inputs simples com nomes em português e inglês. Regras cadastradas, palavras-chave, sinônimos e escopos de perfil e domínio participam da correspondência. Respostas confiáveis em inputs simples podem ser inseridas automaticamente conforme a regra; correspondências próximas exigem revisão. Perguntas discursivas e textareas recebem somente sugestões, inseridas por clique explícito. Seleções e frames continuam manuais. A análise permanece diagnóstica e não altera campos. O envio da candidatura é sempre manual.

As oito contagens são Encontrados, Editáveis, Reconhecidos, Preenchidos, Revisão, Preservados, Desconhecidos e Não suportados. Começam com travessão. A análise validada atualiza somente encontrados e editáveis; o relatório de preenchimento validado atualiza todas, somando falhas à contagem de revisão. Desfazer limpa as contagens e informa restaurações, alterações posteriores preservadas e falhas.

Durante uma operação, analisar, preencher e desfazer ficam desabilitados, assim como o seletor de perfil. O status usa `role="status"` e `aria-live="polite"`, com progresso textual, resultado ou erro. Desfazer só fica disponível quando a sessão permite e dura até recarregar a página; alterações posteriores são preservadas. Ao reabrir o popup, a extensão recupera o último relatório da sessão quando disponível.

“Revisar campos” usa `details` nativo, oculto enquanto não há itens. Seu `summary` oferece altura mínima de 44px. A lista tem altura máxima de 220px e rolagem; cada linha mostra rótulo, estado e motivo, sem inventar resultados. As linhas usam texto de 12px, divisores e quebra de palavras longas. Quando há regra correspondente, exibem seu nome e score no formato “Regra: nome · 97/100”. Sugestões incluem os primeiros 500 caracteres da resposta, com indicação de resposta completa quando truncadas, e o botão secundário “Inserir sugestão”. O clique insere a resposta completa; o nome acessível do botão inclui o rótulo do campo. Durante operações e na prévia HTTP, esses botões ficam desabilitados.

Na prévia HTTP, analisar, preencher e desfazer ficam desabilitados. O status explica que análise e preenchimento exigem a extensão instalada. A nota da análise informa limites da página principal, frames não lidos e anexos que exigem seleção manual.

Movimento é discreto: hover da navegação dura 0.16s; feedback entra em 0.2s, com deslocamento de 8px e desfoque inicial de 2px. Ambos são ativados apenas quando `prefers-reduced-motion: no-preference` corresponde.

## Do's and Don'ts

### Do:

- Do preservar rótulos explícitos e foco visível.
- Do manter estados vazios honestos e contagens indisponíveis como travessão.
- Do usar campos amplos para respostas e experiências.
- Do manter as fontes locais e a identidade compartilhada pelo popup.

### Don't:

- Don't apresentar sugestões discursivas como preenchimento automático, nem prometer automação de seleções ou frames.
- Don't inserir métricas fictícias ou dados pessoais no repositório.
- Don't substituir divisores e superfícies por uma coleção de cartões com sombra.
- Don't adicionar animação quando a preferência de movimento reduzido estiver ativa.

Privacidade oferece exportação, importação com revisão em linha, restauração de preferências e exclusão com confirmação explícita. Controles reutilizam a identidade e componentes existentes; a parte 7 preserva paleta, fontes locais e composição compacta do popup ao expor regras e sugestões revisáveis.

Parte 9 adiciona ação Ensinar um campo ao popup e Campos ensinados às configurações. Painel utilitário de seleção usa marrom/bege, controles de 44px e região acessível, sem nova identidade visual. Painel é isolado em Shadow DOM; confirmação de salvamento não implica preenchimento. Revisão visual consolidada fica para parte 13.
