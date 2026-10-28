# Cadastro pessoal local

Este complemento é separado do cadastro genérico e não inclui dados de nenhum usuário no repositório.

- Fonte privada: private/personal-preset.local.json, ignorada pelo Git.
- npm run build:personal valida o arquivo e gera dist com botão Carregar meu cadastro e arquivo local.
- npm run build gera versão pública: remove o arquivo pessoal de dist e oculta o botão. É o comando para publicação/distribuição.
- Não distribuir dist gerado pelo modo pessoal: ele contém dados pessoais sem criptografia.

O botão aparece em Meus dados. Só lê o arquivo após clique; carrega dados, formações, experiências, perfis e respostas. Preferências, sinônimos, logs e associações são preservados. Registros pessoais usam IDs estáveis para atualizar sem duplicar a cada clique; registros com outros IDs são mantidos. Dados correspondentes existentes exigem confirmação antes de atualizar. Na prévia HTTP, alterações seguem em memória; persistência requer abrir configurações pela extensão instalada.

O arquivo é um AppState validado, mas somente as coleções pessoais são aplicadas. Não inventar informações ausentes. Critérios de candidatura guardados como referência não se tornam filtros automáticos por esse carregamento. Nomes de currículos são recomendações; PDFs não são anexados ou incluídos.

Após atualizar código nesta máquina, build:personal restaura a variante pessoal. A versão pública continua lendo dados já cadastrados no chrome.storage.local; remover o arquivo de distribuição não apaga o cadastro do navegador.

Sem testes de navegador nesta entrega: validação do arquivo, tipos e compilação. Fluxo de clique, mesclagem, confirmação, persistência e edição posterior ficam na validação consolidada da parte 13.

Apagar dados pelo aplicativo remove o cadastro do navegador, mas não apaga o arquivo privado de origem nem a cópia presente no pacote pessoal. Esse arquivo funciona como cadastro de referência para recarregar. Para eliminar a cópia do pacote, gerar build público; a fonte privada deve ser removida separadamente quando o usuário desejar descartá-la.
