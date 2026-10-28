# Assistente de Candidaturas

Extensão local Manifest V3. Parte 4: popup conectado à aba e inventário diagnóstico de campos. Preenchimento de páginas ainda não disponível.

## Ambiente

Node.js 24 e npm. Execute npm ci e npm run check.

## Instalação local

Execute npm run build. No Chrome ou Brave, abra a página de extensões, ative modo de desenvolvedor e carregue a pasta dist. Após atualizar o código, compile e recarregue a extensão. Clique no ícone para abrir o popup e em Abrir configurações para editar seus dados.

## Interface disponível

Dados pessoais, contato, formação principal, experiências com descrições amplas em português e inglês, respostas tipadas básicas, perfis e preferências de confiança. Registros podem ser criados, editados e excluídos. Ainda faltam importação/exportação, demais tipos de respostas, associação avançada de perfis e detector de formulários.

O popup permite selecionar um perfil, abrir configurações e analisar campos nativos visíveis da aba principal após comando. Preencher página permanece desabilitado até implementação do motor. Contagens não analisadas aparecem como traço. Campos em frames e componentes customizados ainda não são analisados. A análise não lê valores nem altera o formulário.

## Prévia

Execute npm run preview e abra http://127.0.0.1:4173. Fora da extensão, alterações ficam somente na memória da página e desaparecem ao recarregar. A prévia informa essa limitação explicitamente.

## Verificação

npm run check verifica TypeScript, testes do motor e build. npm run test:ui verifica interface e larguras 320, 375 e 430px. npm run test:extension carrega extensão em perfil de teste isolado no Edge e verifica persistência real. Os dois últimos comandos exigem Microsoft Edge instalado; não utilizam seu perfil pessoal. Chrome e Brave ainda precisam de validação direta.

## Privacidade

Sem backend, telemetria ou chamadas externas. Fontes distribuídas localmente com licenças. Dados reais não incluídos no repositório. Dados ficam em chrome.storage.local; armazenamento não é cofre criptografado. Nunca envia candidaturas.

## Publicação futura

Build separado em dist. Publicação ainda exigirá ícones, política de privacidade, capturas, revisão de permissões e validação nas lojas.

## Teste da comunicação

npm run test:analysis executa uma extensão real no Edge em perfil novo, testa contagens, análises repetidas, popup e recusa de página protegida. O teste concede acesso apenas ao servidor de formulário local no manifesto copiado para work; essa permissão não entra no pacote real. O pacote usa activeTab: o usuário deve clicar no ícone da extensão na aba desejada para autorizar acesso temporário. Ainda falta validação manual desse fluxo no Chrome e Brave.
