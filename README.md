# Assistente de Candidaturas

Extensão local Manifest V3. Parte 9: aprendizado manual de campos, seleções e observação dinâmica em caráter experimental. Validação funcional completa adiada para a parte 13 por decisão do usuário.

## Ambiente

Node.js 24 e npm. Execute npm ci e npm run check.

## Instalação local

Execute npm run build. No Chrome ou Brave, abra a página de extensões, ative modo de desenvolvedor e carregue a pasta dist. Após atualizar o código, compile e recarregue a extensão. Clique no ícone para abrir o popup e em Abrir configurações para editar seus dados.

## Interface disponível

Dados pessoais, contato, perfil profissional, diversidade opcional, formação principal e técnica, experiências com descrições amplas, respostas de todos os tipos previstos, perfis, sinônimos e preferências. Registros podem ser criados, editados e excluídos. Associação avançada de perfis, seleção de opções e adaptações por plataforma continuam nas próximas etapas.

O popup permite selecionar um perfil, abrir configurações e analisar campos nativos visíveis da aba principal após comando. Preencher página aplica dados gerais conhecidos em inputs text/email/tel/url/number/date, após validar rótulo, tipo e limite de confiança. Contagens não analisadas aparecem como traço. Campos em frames e componentes customizados ainda não são analisados. A análise não lê valores nem altera o formulário.

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

## MVP de preenchimento — parte 6

Recarregue a extensão e a página da candidatura após atualizar. Cadastre seus dados em Configurações, abra o formulário HTTP/HTTPS e clique no ícone da extensão. Preencher página faz análise e preenchimento em uma ação. Analisar página continua sem alterar valores. Revisar campos mostra o resultado de cada campo, sem reproduzir respostas pessoais.

Valores já preenchidos são preservados por padrão. Conflitos de identificação, campos de terceiros, perguntas desconhecidas, tipos incompatíveis e dados ausentes ficam para revisão. Selects, radios, checkboxes, textarea, componentes customizados e frames ainda não são preenchidos. Regras e sinônimos cadastrados estão conectados ao motor a partir da parte 7. Perfis indicam currículo recomendado e filtram regras com escopo de perfil; personalização avançada dos perfis continua em etapa posterior. Nenhum upload ou envio é acionado.

Desfazer último preenchimento restaura apenas a última operação que alterou campos. Repetir uma operação sem alterações mantém o histórico anterior. Edições posteriores e campos desconectados são preservados e informados como conflitos. Recarregar ou navegar encerra o histórico em memória. Eventos input/change atualizam campos controlados; compatibilidade validada com React real em fixture, sem alegar suporte universal a todos os frameworks ou sites.

Execute npm run fixture para abrir formulário local fictício em http://127.0.0.1:4175. Instale a extensão no navegador de teste, abra essa página e use o popup. React é dependência apenas dos testes e não integra o pacote da extensão.

Execute npm run test:fill para testes reais no Edge: PT/EN, React controlado, eventos, campos preservados, ambiguidade, autenticação, terceiros, restrições nativas, máscaras rejeitadas, novos campos após comando, desfazer, conflitos manuais e ausência de envio. Acesso ao servidor é autorizado apenas no manifesto copiado de teste; pacote real mantém activeTab sem acesso permanente a todos os sites. Validação direta no Chrome e Brave permanece pendente.

## Respostas configuráveis — parte 7

Em Minhas respostas, defina assunto (ex.: Java), palavras-chave, tipo e resposta. Perguntas sobre existência de experiência usam sim/não; duração usa anos de experiência. Configure as duas respostas separadamente. Variações normalizadas e sinônimos são aceitos, com verificação de intenção e palavras relevantes. Experiência não implica disponibilidade, autorização ou certificação.

Regras desativadas e fora do domínio/perfil são ignoradas. Onde usar limita domínios exatos, sem herdar automaticamente subdomínios. Inserção permite preenchimento automático confiável ou somente sugestão. Prioridade ordena candidatos com pontuação igual, sem aumentar confiança ou mascarar ambiguidades. Correspondências próximas não preenchem. Palavras excludentes são verificadas antes da seleção.

Sinônimos são editados em Preferências. Use a mesma chave de assunto nos dois idiomas para conectar traduções: por exemplo, relocation = mudança, mudar de cidade em português; relocation = relocate em inglês. A pontuação é indicador determinístico das regras, não probabilidade de acerto. Limiares e preenchimento intermediário seguem Preferências. Campos ambíguos, tipos incompatíveis e perguntas compostas sem regra explícita continuam manuais.

Respostas longas e textarea aparecem em Revisar campos com prévia de até 500 caracteres. Inserir sugestão exige clique e insere a resposta completa salva. Antes disso, campo, edição posterior, visibilidade, regra, perfil, domínio e conteúdo são revalidados. Regra alterada/desativada ou campo modificado exige nova análise. Cada inserção manual é operação separada para Desfazer.

Dados gerais têm precedência quando cadastrados. Regras podem suprir dados gerais ausentes. Respostas em texto precisam de tradução para o idioma do campo; sim/não é apresentado em português ou inglês. Salários não são convertidos entre moedas ou períodos. Selects, radios, checkboxes, comboboxes e frames continuam para próximas etapas. Campos transparentes ou em ancestral transparente são excluídos, inclusive quando ocultados depois da sugestão.

Execute npm run test:rules para os testes reais no Edge. Execute npm run fixture:rules e abra http://127.0.0.1:4177/rules.html para formulário fictício, usando a extensão instalada. Testes usam dados fictícios e permissões de host somente no pacote isolado de teste.

## Seleções experimentais — parte 8

Implementação de select simples/múltiplo, grupos de radio/checkbox e controles ARIA explícitos. Opções são comparadas por texto/valor normalizado, sinônimos configurados e equivalências curtas PT/EN; opções ambíguas ou ausentes ficam manuais. Nenhum salário é encaixado em faixas por aproximação. Respostas múltiplas exigem todas as opções identificáveis.

Valores existentes continuam preservados por padrão. Consentimentos e declarações exigem regra explícita correspondente à pergunta completa. Nenhum botão de envio, avanço de etapa ou link de navegação é acionado.

Comboboxes exigem aria-controls/aria-owns único apontando para listbox e opção anterior restaurável. Componente sem vínculo, sem estado verificável, sem restauração ou ARIA múltiplo permanece manual. Grupos de radio ARIA inicialmente vazios ficam manuais. Adapters específicos poderão ampliar essa cobertura. Desfazer reúne inputs e seleções da mesma operação e protege alterações posteriores.

Um MutationObserver regional, somente de mudanças estruturais, marca adições/remoções de campos e alterações de opções. Não preenche espontaneamente. Ao reabrir popup, pode indicar novas perguntas; clique Preencher novamente para analisar o estado atual. Uma nova varredura sempre ocorre sob comando.

Verificações desta entrega: TypeScript e build. Nenhum teste unitário, visual ou de navegador foi executado na parte 8. Compatibilidade com bibliotecas, restauração de radio controlado e widgets ARIA permanecem provisórios até a parte 13. Relatórios contam grupos de seleção como uma pergunta; consistência com a contagem bruta da análise será avaliada na validação final.

## Ensinar este campo — parte 9

Na candidatura, abra popup e clique Ensinar um campo. Clique no campo da página principal, escolha uma resposta ativa e salve a associação. O modo bloqueia cliques fora do painel para evitar ações acidentais; Esc ou Cancelar encerra a seleção. Nenhuma resposta é inserida ao ensinar. Após salvar, use Preencher página.

Por padrão, associação limita-se ao domínio e caminho da página, sem parâmetros ou fragmentos. Desmarcar essa opção permite reutilização naquele domínio com identificação suficientemente estável. São salvos label, name, id, seção e tipo de controle; valores dos campos, HTML e seletores de posição não são armazenados. A sessão temporária de seleção fica apenas na memória da sessão do navegador para sobreviver à suspensão do service worker; associações finais ficam em chrome.storage.local.

Campos ensinados nas configurações permite mudar resposta/caminho, autorizar aceites explicitamente, ativar, desativar e excluir associações. Desativar associação não desativa as regras gerais. Respostas inativas ou fora do domínio/perfil não são aplicadas. Mapeamentos conflitantes, pergunta/seção alterada ou alvo ambíguo ficam manuais. Campos protegidos, terceiros e frames não podem ser ensinados por esse modo.

O mapeamento apenas identifica a resposta: compatibilidade de tipos, exclusões, confidence, sugestões discursivas, preservação e limites de seleção continuam ativos. Perguntas negativas, compostas e requisitos numéricos precisam de regra específica. Aceites exigem autorização explícita; ensinar não habilita envio ou upload.

Parte 9 recebeu somente verificação TypeScript e build. A seleção visual, persistência por site, conflitos e experiência em navegadores serão validados na parte 13. Recarregue extensão e página para atualizar o content script.
