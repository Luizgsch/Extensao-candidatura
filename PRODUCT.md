# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TypeScript, HTML/CSS e esbuild. Extensão Manifest V3 para Chrome e Brave.

## Users

Uso pessoal de Luiz em candidaturas a vagas, com preparação para distribuição futura.

## Product Purpose

Reduzir preenchimento repetitivo por reconhecimento genérico de campos em português e inglês. Usuário inicia pelo popup e envia candidatura manualmente.

## Operating Context

Popup para execução e configurações em aba própria da extensão, com aparência de site. Sem site hospedado ou backend nesta fase.

## Capabilities and Constraints

Dados locais em chrome.storage.local. Sem transmissão externa. Dados sensíveis podem ser preenchidos após comando sem confirmação adicional. Descrições de experiências precisam de campos amplos. Campos ambíguos exigem revisão. Respostas discursivas são sugestões. Sem senhas, tokens, códigos ou dados bancários. Parte 4 oferece inventário diagnóstico de campos nativos visíveis no frame principal, acionado pelo popup. Parte 6 preenche dados gerais reconhecidos em inputs nativos simples; classificação de respostas configuráveis e seleções pertencem às próximas etapas.

## Evidence on Hand

Requisitos e experiências fornecidos pelo usuário no chat. Não incluir dados pessoais no repositório. Há contagens reais do inventário diagnóstico. Há reconhecimento conservador de campos pessoais e preenchimento de inputs simples, validados em formulário fictício com React.

## Product Principles

- Precisão antes de cobertura.
- Usuário controla preenchimento e envio.
- Dados pessoais ficam no navegador.
- Estados reais, sem métricas fictícias.

## Accessibility & Inclusion

Navegação por teclado, foco visível, rótulos explícitos, contraste adequado e configurações utilizáveis em telas pequenas.

## Estado implementado — parte 5

Gerenciamento de dados locais com validação, backups completos ou de preferências, importação com revisão antes da substituição, restauração de preferências e exclusão explícita de dados. Cadastro inclui perfil profissional, diversidade opcional, formação técnica e sinônimos PT/EN. Tipos e traduções existentes são preservados durante edição. Parte 6 adiciona preenchimento manual e desfazer em inputs simples.

## Estado implementado — parte 6

Preenchimento sob comando em campos nativos simples PT/EN. Preserve dados existentes por padrão e ignore correspondências conflitantes, referências de terceiros e autenticação. Resultado por campo e destaque temporário sem persistir estilos. Desfazer em memória protege edições posteriores; sessão encerrada ao recarregar. Regras configuráveis, seleções e componentes customizados permanecem fora do MVP.

## Estado implementado — parte 7

Regras configuráveis e sinônimos conectados ao preenchimento, com classificação PT/EN, tipos, confiança, prioridade, exclusões e escopos. Textos longos e textarea são apenas sugestões com inserção explícita e nova validação. Perfil selecionado filtra regras com escopo e respeita overrides existentes; edição avançada de perfis permanece futura. Dados gerais cadastrados têm precedência. Campos ocultos por transparência também são protegidos. Seleções, componentes customizados e frames seguem fora desta etapa.
