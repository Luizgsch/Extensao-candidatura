# Arquitetura — parte 2

## Módulos

background coordena mensagens e armazenamento; content acessará DOM; core contém funções puras; adapters enriquecem campos; shared define contratos; storage persiste dados; ui será criada na parte 3.

## Implementado

Tipos para respostas, dados pessoais, formação, experiências com descrição ampla, perfis, mapeamentos, campos, logs, confiança e resultados. Estado inicial vazio. Normalização preserva negação. Política de confiança bloqueia empates. Mensagem GET_STATUS e inicialização de armazenamento confiável.

## Ainda não implementado

Detector, classificador, preenchimento, geração de pontuação, perfis editáveis, interface, importação, desfazer e adapters específicos. O adapter genérico define apenas contrato; não detecta campos. Content script não é injetado. Nenhum suporte a plataformas está comprovado.

## Fluxo futuro

Clique no popup, leitura da aba, contexto por campo, classificação de assunto e intenção, restrições antes da confiança, preenchimento, verificação e revisão. Envio final fora do sistema. Campos existentes preservados. Desfazer em memória da aba, respeitando alterações posteriores do usuário.

## Dados

Dados reais serão importados localmente na etapa de cadastro, nunca incorporados ao código ou pacote. Logs sem valores das respostas. Datas em YYYY-MM-DD e meses em YYYY-MM. Versão do estado explícita; importação exigirá validação integral e migrações antes de gravar. Não há API de importação nesta fase.

## Permissões

storage, activeTab e scripting. Sem acesso permanente a todos os sites. Frames externos, shadow DOM fechado e páginas protegidas exigem tratamento ou podem impedir suporte.

## Etapas seguintes

Parte 3: fluxos e frontend com impeccable. Parte 4: execução e comunicação com a aba. Parte 5: cadastro, validação e importação/exportação. Parte 6: primeiro preenchimento utilizável.

## Atualização — parte 3

Popup e configurações em aba implementados. Cadastro local de identificação, contato, formação principal, experiências com descrições amplas, respostas básicas, perfis e preferências. Preenchimento permanece indisponível. A prévia HTTP usa memória efêmera e informa isso; a extensão usa chrome.storage.local. Fontes locais com licenças no pacote. Revisão de interface inclui telas de 320, 375 e 430px; persistência validada numa extensão real em perfil isolado do Edge. Validação direta em Chrome e Brave continua pendente.

## Atualização — parte 4

Popup solicita ANALYZE_ACTIVE_TAB ao service worker. Somente mensagens de páginas da própria extensão são aceitas. O worker injeta content.js no frame principal sob ação do usuário; listener idempotente responde INSPECT_PAGE. Inventário diagnóstico conta controles nativos visíveis, controles editáveis, anexos e frames. Senhas e ações de envio são excluídas. Nenhum valor é lido ou modificado. Não há classificação semântica, preenchimento ou observador dinâmico nesta fase. Nenhum resultado é persistido; nova análise lê o estado atual.

Testes reais em perfil isolado do Edge validam resultados e ponte, com permissão de host restrita à fixture no manifesto de teste. O manifesto de produção permanece sem host_permissions. A permissão temporária activeTab depende de invocação da extensão pelo usuário na aba pretendida.

## Atualização — parte 5

schema.ts valida todo AppState com limites, datas, tipos, identificadores e integridade de referências. Estado versão 1; versões futuras recusadas sem apagar dados. answers.ts preserva metadados e idiomas ao editar respostas. import-export.ts usa envelope versionado e exportação compacta; exportação de preferências não inclui dados, regras ou perfis. Logs excluídos do backup completo.

Interface oferece revisão da importação antes de aplicar; preferências mescladas sem substituir dados pessoais e backup completo substituído somente após confirmação. Erros preservam estado anterior. Dados incompatíveis na abertura oferecem cópia bruta de recuperação. Gravações usam Web Locks e snapshot canônico para evitar sobrescrever edição de outra aba; ordenação de chaves do Chrome Storage é normalizada.

Cadastro ampliado inclui profissional, diversidade opcional e formação técnica. Respostas suportam todos os tipos do contrato e expressões excludentes. Sinônimos editáveis em português e inglês. Dados reais continuam fora de código e fixtures. Testes de integração usam exclusivamente perfil temporário do Edge.

## Atualização — parte 6

Mensagens FILL_ACTIVE_TAB, UNDO_ACTIVE_TAB e GET_ACTIVE_SESSION coordenadas no service worker. Planejamento lê identificadores no content script; background entrega somente chaves pessoais reconhecidas presentes no estado validado. Candidatos completos, experiências e respostas não são enviados ao DOM. Ponte idempotente e fila por documento evitam execução concorrente no formulário. Resultados e histórico permanecem em memória do documento.

Módulo personal-fields.ts combina rótulo, aria-label/labelledby, identificadores, placeholder e autocomplete com aliases exatos normalizados. Não usa ainda matching fuzzy ou regras cadastradas. Sinais conflitantes e rótulos explícitos desconhecidos bloqueiam preenchimento. Subcampos tel-*, campos financeiros e autenticação não são tratados como dados pessoais comuns. Seções de referências e histórico recebem revisão manual.

Setter nativo do protótipo e eventos input/change atualizam controles. Verificação confirma manutenção do valor e validity; rejeição nativa retorna ao anterior quando possível. Transformação pelo site é marcada como falha, mantendo valor observado no histórico para permitir desfazer. Animação temporária não altera estilo inline. Histórico guarda valores anterior/aplicado da última operação com alterações; undo verifica conexão, editabilidade e igualdade antes de restaurar. Não há clique em envio, avanço de etapa ou consentimento.

Fixture local inclui inputs nativos e React controlado real. Testes isolados no Edge validam fluxo e limites; Chrome/Brave ainda pendentes. React é apenas dependência de desenvolvimento e não é incluído no build da extensão.

## Atualização — parte 7

core/classification separa intenção e tipo esperado; core/matching/rules normaliza assuntos, palavras-chave e sinônimos, aplica exclusões e escopo, verifica compatibilidade e classifica candidatos. Prioridade desempata ordenação, sem alterar score; decideMatch mantém bloqueio de pontuações próximas. Perguntas negativas, requisitos numéricos e compostas exigem regra explícita em vez de inferir respostas. Idioma, moeda, período e intenção são barreiras adicionais.

Content script envia RuleField (identificador por documento, pergunta, tipo, idioma e fingerprint) ao background. Regras e perfis completos ficam no background. Só a resposta selecionada necessária a cada campo ou sugestão é devolvida. Dados gerais presentes têm precedência; regra pode atender campo conhecido sem dado cadastrado. Nenhuma regra arbitrária altera campo protegido ou seleção customizada.

Sugestões são guardadas por documento. Popup mostra prévia até 500 caracteres e score/100. Inserção explícita solicita novo plano, reavalia regra com estado atual e compara conteúdo salvo na proposta; verifica campo, tipo, edição posterior e visibilidade. Textarea usa setter nativo próprio e eventos input/change. Desfazer trata input e textarea e protege alterações posteriores. Novo preenchimento, undo ou navegação invalida sugestões anteriores. Não há persistência de respostas de página ou histórico no armazenamento.

controls/visibility é compartilhado pelo inventário e escrita; bloqueia opacity zero no elemento ou ancestral, além de estados ocultos. isSimpleControl exclui combobox/listbox e controles previstos para fase seguinte. Testes isolados no Edge cobrem fluxo de regras, UI de cadastro, escopos, revalidação, escrita manual, textarea, transparência, tipos e ausência de envio. Publicação e validação direta em Chrome/Brave continuam pendentes.
