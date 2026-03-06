# Mapeamento BDOLytics: Cooking e Alchemy

## Referência analisada

Páginas e bundles usados como referência:

- `https://bdolytics.com/cooking`
- `https://bdolytics.com/alchemy`
- `/_nuxt/CUvlnFUU.js` (market overview)
- `/_nuxt/D09mdvg0.js` (recipe overview/detail)
- `/_nuxt/BCbYSVrP.js` (crafting calculator)
- `/_nuxt/C1a_Xy1b.js` (mastery tables)
- `/_nuxt/PmbboyGB.js` (settings defaults)
- `/_nuxt/BxJgeqqK.js` (price resolution)
- `/_nuxt/FD54LLqt.js` (byproduct exchange values)

## Funcionalidades BDOLytics

### 1. Market overview

Campos e defaults:

- Busca por texto com debounce.
- Paginação com `30` linhas por página.
- Sort persistido com múltiplas colunas.
- Sort default: `favorite desc`, depois `silverPerHour desc`.
- Filtros persistidos:
  - `silverPerHour >=`
  - `dailyVolume >=`
  - favoritos

Colunas:

- Nome da receita.
- Favorito.
- Silver/hour.
- Preço atual do mercado.
- Price change.
- Daily volume.
- Volume change.
- Experience.

Busca:

- Nome da receita.
- Nomes dos possíveis ingredientes/inputs alternativos.

Interações:

- Favoritos persistidos.
- Clique na linha abre a calculadora da receita.
- Nome da receita leva ao detalhe.
- Célula de XP leva à calculadora de XP.

### 2. Recipe detail

Controles:

- Craft quantity.
- Toggle de slow cook para cooking.
- Painel de settings.
- Preços customizados por item.
- Toggle de tax por input.
- Toggle de keep por output.
- Toggle de rare proc por nó da árvore.
- Seleção de materiais alternativos por grupo.
- Colapso/expansão por nó.

Abas:

- Input.
- Output.
- Analytics.
- Weight.

Input tab:

- Quantidade total.
- Nome e variações.
- Preço unitário/custom.
- Flag de tax.
- Custo total.
- Dados auxiliares de market/vendor.

Output tab:

- Quantidade total.
- Nome.
- Preço unitário/custom.
- Flag de keep.
- Retorno total.
- Produto normal, rare proc e byproduct.

Analytics tab:

- KPI cards:
  - crafting cost
  - crafting profit
  - profit/hour
  - crafting time
- Chart de preço.
- Barras de custo/receita/lucro.
- Dados de leftovers/gathering quando aplicável.

Weight tab:

- Peso disponível.
- Peso do lote.
- Peso por craft.
- Max crafts por peso.
- Breakdown por ingrediente.

Árvore:

- Recursiva.
- Mostra profitability/time por nó.
- Mostra toggles de rare proc/slow cook.
- Permite trocar material alternativo.
- Linka subreceitas.

### 3. Settings e defaults BDOLytics

Defaults observados:

- `valuePackActive: true`
- `merchantRingActive: false`
- `familyFameBonus: 0.005`
- `speedCookingMastery: 1000`
- `speedCookingTime: 1.2`
- `slowCookingMastery: 1500`
- `slowCookingTime: 4.1`
- `cookingByproductUsage: 9065`
- `alchemyMastery: 1500`
- `alchemyTime: 1.2`
- `alchemyByproductUsage: 5301`
- `weight: 2400`
- `usedWeight: 300`

Preço líquido de mercado:

- `net = 0.65 + 0.65 * (VP + MerchantRing + FameBonus)`
- Com os defaults: `0.84825`

### 4. Fórmulas observadas

Cooking:

- `normalProcRate = avgNormal + (maxNormal - avgNormal) * maxProcChance`
- `rareProcRate = (avgRare + (maxRare - avgRare) * maxProcChance) * (0.2 + rareAdditionalChance)`
- `massProcRate = 1 + 9 * massProduceChance`
- `time = craftQuantity / massProcRate * selectedCookTime`

Alchemy:

- `normalProcRate = avgNormal + (maxNormal - avgNormal) * maxProcChance`
- `rareProcRate = avgRare * 0.2`
- `massProcRate = 1`
- `time = craftQuantity * alchemyTime`

Byproducts:

- Cooking chance base: `0.0236`
- Alchemy chance base: `0.0236 * 3.7`
- Valor depende do item de troca configurado.

## Gap analysis do projeto antes da refatoração

List pages antigas:

- Sem busca por ingredientes.
- Sem filtros persistidos.
- Sem price change / volume change.
- Sem paginação equivalente.
- Sem cálculo recursivo.
- Sem uso de mastery defaults BDOLytics.
- Sem byproducts.
- Sem sort multi-coluna.

Detail pages antigas:

- Sem tabs.
- Sem settings completos.
- Sem custom price / tax / keep.
- Sem árvore recursiva real.
- Slow cook incorreto com multiplicador `x10`.
- Sem weight analysis.
- Sem charts.
- Sem byproducts.
- Sem rare proc per node.

## Implementação aplicada no projeto

Arquitetura:

- Nova rota API `recipe.catalog` para entregar catálogo completo com histórico.
- Novo motor compartilhado em `apps/web/src/lib/crafting/calculator.ts`.
- Tabelas e defaults BDOLytics incorporados em `apps/web/src/lib/crafting/constants.ts`.
- Estado persistido de calculadora em `apps/web/src/stores/crafting-calculator-store.ts`.
- Estado global expandido em `apps/web/src/stores/global-settings-store.ts`.
- Novos componentes shared:
  - `CraftingMarketPage`
  - `CraftingRecipePage`

Funcionalidades implementadas:

- Busca por receita e ingredientes.
- Favoritos persistidos.
- Filtros de silver/hour, volume e favoritos.
- Colunas de trend de preço e volume.
- Paginação 30 linhas.
- Overview client-side agrupando variantes e escolhendo a melhor.
- Detail com tabs de input, output, analytics e weight.
- Custom prices por item.
- Flags de tax e keep.
- Byproduct output calculado.
- Slow cook com mastery/tempo corretos.
- Rare proc habilitado por padrão e controlável por nó.
- Árvore recursiva com links de subreceita.
- Seletor de materiais alternativos por nó.
- KPIs e charts.
- Cálculo de peso e max crafts.

Correções de dados:

- `sync-market.ts` passou a gravar `totalTrades` no histórico em vez de `currentStock`.
- `seed.js` passou a popular `price_history` inicial com `total_trades`.

## Limitações conhecidas

- O dataset local guarda `resultQuantity` como média; o BDOLytics usa `min/max`. A implementação aproxima o `maxProc` a partir da média, o que melhora bastante a precisão, mas ainda depende da granularidade do seed local.
- Leftovers avançados e gathering inclusivo do BDOLytics não foram reproduzidos integralmente porque o projeto local não tem a mesma malha de dados auxiliares.
- Trends de volume ficam mais precisos após novas sincronizações, porque o histórico antigo do projeto não armazenava `totalTrades`.
