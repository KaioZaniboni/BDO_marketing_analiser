## Plano completo — importação de inventário/armazém por screenshot

### Objetivo
- permitir capturar itens e quantidades do jogo via screenshot
- usar OCR em português
- revisar antes de persistir
- salvar com `inventory.bulkUpsert`

### Escopo da V1
- upload de uma ou mais screenshots
- OCR client-side com `tesseract.js`
- parser simples para linhas `nome + quantidade`
- preview com status: `matched`, `ambiguous`, `unmatched`
- seleção manual entre candidatos sugeridos
- importação apenas dos itens resolvidos

### Fluxo funcional
1. usuário seleciona screenshots do inventário e/ou armazém
2. frontend executa OCR em português
3. parser extrai linhas úteis e consolida duplicados
4. backend gera preview com heurística de matching por nome
5. usuário revisa candidatos sugeridos
6. frontend envia itens confirmados via `inventory.bulkUpsert`
7. tela invalida `inventory.list` e `inventory.summary`

### Arquitetura
- **web**
  - painel de upload e progresso do OCR
  - utilitários puros para parse/merge do texto OCR
  - tabela de revisão e confirmação
- **api**
  - `inventory.previewImport`
  - serviço puro `inventory-import.ts` para normalização e scoring
- **db**
  - reutiliza `UserInventory` sem alterar schema

### Decisões da V1
- manter OCR no frontend para reduzir acoplamento com infraestrutura extra
- exigir revisão antes de persistir
- permitir importação parcial dos itens já resolvidos
- reaproveitar o formulário manual existente para itens sem sugestão automática

### Limitações conhecidas da V1
- depende da qualidade da screenshot
- OCR pode errar nomes com fonte pequena ou ruído visual
- itens sem candidato ainda exigem intervenção manual
- heurística atual é textual; não usa posição na imagem nem embeddings

### Melhorias planejadas
1. busca manual por nome durante a revisão usando `market.searchItems`
2. presets por área da interface do jogo (inventário vs armazém)
3. múltiplos perfis de OCR e recorte automático da região útil
4. suporte a fila/background para lotes maiores
5. telemetria de acerto por item para melhorar heurística

### Testes e validação
- testes unitários do parser OCR no `web`
- testes unitários do matching no `api`
- teste da página autenticada exibindo o painel
- validação manual com screenshots reais em português

### Critérios de aceite
- usuário consegue enviar screenshot(s)
- o sistema extrai pelo menos parte dos itens com quantidade
- preview mostra quais linhas foram resolvidas ou precisam revisão
- itens confirmados são persistidos corretamente no inventário
- lista e resumo do inventário refletem a importação após sucesso