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
