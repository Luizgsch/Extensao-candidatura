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
