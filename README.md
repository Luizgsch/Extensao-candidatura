# Assistente de Candidaturas

Extensão local Manifest V3. Parte 5: gerenciamento local de dados, validação e backups. Preenchimento de páginas ainda não disponível.

## Ambiente

Node.js 24 e npm. Execute npm ci e npm run check.

## Instalação local

Execute npm run build. No Chrome ou Brave, abra a página de extensões, ative modo de desenvolvedor e carregue a pasta dist. Após atualizar o código, compile e recarregue a extensão. Clique no ícone para abrir o popup e em Abrir configurações para editar seus dados.

## Interface disponível

Dados pessoais, contato, perfil profissional, diversidade opcional, formação principal e técnica, experiências com descrições amplas, respostas de todos os tipos previstos, perfis, sinônimos e preferências. Registros podem ser criados, editados e excluídos. Associação avançada de perfis e preenchimento de formulários continuam nas próximas etapas.

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

## Backups e integridade

Em Privacidade, exporte preferências sem dados pessoais ou backup completo sem logs. Backup completo contém informações pessoais em texto sem criptografia e exige confirmação. Importação aceita JSON de até 5 MB, valida versão, tipos, datas, referências e limites antes de gravar. Arquivo inválido não altera dados. Importar preferências mantém dados e respostas; importar backup completo substitui os registros após revisão e confirmação. Estado persistido limitado a 4 MB; exportação compacta reserva espaço para o envelope do backup.

Restaurar preferências volta limites e sinônimos aos padrões, mantendo cadastro e respostas. Apagar todos os dados limpa armazenamento da extensão, incluindo seleção de perfil e logs, após confirmação. Dados incompatíveis oferecem download de recuperação e reinicialização explícita. Cópia de recuperação é formato bruto para diagnóstico, não substitui backup validado.

Gravações em abas simultâneas usam trava e comparação de estado. Ao detectar outra edição, a gravação é recusada e os campos permanecem disponíveis. Reabra as configurações para carregar a versão atual.

Execute npm run test:data para verificar exportação, importação, cancelamento, preservação de tipos e traduções, conflitos entre abas, recuperação e exclusão em perfil isolado do Edge. Nenhum teste usa seu perfil pessoal ou dados reais.
