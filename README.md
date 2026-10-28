# Assistente de Candidaturas

Extensão local Manifest V3. Parte 3: popup e configurações editoriais em marrom e bege. Preenchimento de páginas ainda não disponível.

## Ambiente

Node.js 24 e npm. Execute npm ci e npm run check.

## Instalação local

Execute npm run build. No Chrome ou Brave, abra a página de extensões, ative modo de desenvolvedor e carregue a pasta dist. Após atualizar o código, compile e recarregue a extensão. Clique no ícone para abrir o popup e em Abrir configurações para editar seus dados.

## Interface disponível

Dados pessoais, contato, formação principal, experiências com descrições amplas em português e inglês, respostas tipadas básicas, perfis e preferências de confiança. Registros podem ser criados, editados e excluídos. Ainda faltam importação/exportação, demais tipos de respostas, associação avançada de perfis e detector de formulários.

O popup permite selecionar um perfil e abrir configurações. Preencher página permanece desabilitado até implementação do motor. Contagens não analisadas aparecem como traço.

## Prévia

Execute npm run preview e abra http://127.0.0.1:4173. Fora da extensão, alterações ficam somente na memória da página e desaparecem ao recarregar. A prévia informa essa limitação explicitamente.

## Verificação

npm run check verifica TypeScript, testes do motor e build. npm run test:ui verifica interface e larguras 320, 375 e 430px. npm run test:extension carrega extensão em perfil de teste isolado no Edge e verifica persistência real. Os dois últimos comandos exigem Microsoft Edge instalado; não utilizam seu perfil pessoal. Chrome e Brave ainda precisam de validação direta.

## Privacidade

Sem backend, telemetria ou chamadas externas. Fontes distribuídas localmente com licenças. Dados reais não incluídos no repositório. Dados ficam em chrome.storage.local; armazenamento não é cofre criptografado. Nunca envia candidaturas.

## Publicação futura

Build separado em dist. Publicação ainda exigirá ícones, política de privacidade, capturas, revisão de permissões e validação nas lojas.
