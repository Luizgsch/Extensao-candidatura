# Validação consolidada — parte 13

Por decisão do usuário, partes 8–12 são implementadas com verificações de tipos e build. Nenhum recurso novo deve ser descrito como validado em navegador antes desta etapa.

## Cobertura necessária da parte 8

- Select simples/múltiplo: opções desabilitadas, placeholders, valores existentes, sinônimos, correspondências ambíguas e respostas parcialmente indisponíveis.
- Radios e checkbox: agrupamento correto, campos sem nome, checkboxes isolados, estados mistos, consentimentos exatos e ausência de envio.
- ARIA: vínculo único, lista assíncrona, seleção confirmada, controles inicialmente vazios e componente sem restauração. Customização múltipla não suportada deve continuar manual.
- Desfazer: operações combinadas, radio controlado inicialmente vazio, React/Vue/Angular, conflitos manuais, campos removidos e opções substituídas.
- Dinâmica: formularios tardios, novas perguntas, optgroups, seletores aninhados, mudanças somente por atributos, eficiência e descarte do observador.
- Interface: 320/375/430px, teclado, foco, mensagens experimentais, contagem de grupos versus controles brutos e aviso após reabrir popup.
- Regressões: partes 1–7, backups, regras, sugestões, privacidade, Chrome e Brave reais.

Até a conclusão, seleções e observação dinâmica são experimentais. Revisões específicas e adaptações necessárias pertencem a esta validação.

## Cobertura necessária da parte 9

- Seleção de inputs, textarea, grupos e componentes ARIA; clique em label, captura de valores ausente e campos sem identificador.
- Bloqueio de senhas, autenticação, dados bancários, terceiros e frames; nenhum envio por click/Enter durante seleção na página principal.
- Esc, cancelamento, conclusão, expiração, recarga, suspensão do worker e troca/fechamento da aba; painel sem bloqueios residuais.
- Persistência, deduplicação, edição de regra/caminho, consentimento, desativação, exclusão e backups.
- Unicidade de label/name/id/seção, IDs dinâmicos, perguntas alteradas, múltiplos campos semelhantes e mapeamentos conflitantes.
- Revalidação de sugestões aprendidas, regras removidas/inativas, troca de perfil/site e conflitos de edição em outra aba.
- Teclado, foco, Shadow DOM, acessibilidade e telas pequenas. Fluxo completo no Chrome e Brave reais.
