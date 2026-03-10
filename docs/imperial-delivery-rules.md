# Entrega Imperial de Culinaria e Alquimia

## Escopo desta implementacao
- O mapping imperial do sistema passa a ser mantido em codigo em `packages/api/src/services/imperial-data.ts`.
- O ranking imperial considera receitas canonicas, custos reais dos ingredientes, taxa liquida de mercado e bonus de maestria imperial.
- A pagina imperial compara tres cenarios:
  - comprar o item pronto e entregar ao NPC imperial
  - produzir o item e entregar ao NPC imperial
  - produzir o item e vender no mercado

## Regras de preco imperial
- `baseBoxNpcPrice = tier.basePrice * 2.5`
- `imperialSalePrice = floor(baseBoxNpcPrice * (1 + masteryBonusPct))`
- O bonus imperial segue a tabela de maestria oficial usada pelo projeto para cooking/alchemy.

## Regras de custo e retorno
- `expectedOutputPerCraft` usa a mesma semantica do calculator:
  - cooking:
    - resultado principal usa range `resultQuantity/resultMaxQuantity` com `maxProcChance`
    - proc raro usa range `procQuantity/procMaxQuantity` com chance base de 20% + bonus adicional de rare proc
    - tempo efetivo considera `massProduceChance`
  - alchemy:
    - resultado principal usa range `resultQuantity/resultMaxQuantity` com `maxProcChance`
    - proc raro usa chance base de 20%
- `craftsPerBox = qtyRequired / expectedOutputPerCraft`
- `costPerCraft = soma dos ingredientes por craft`
- `costPerBoxProduced = costPerCraft * craftsPerBox`
- `marketPurchaseCostPerBox = qtyRequired * marketUnitPrice`
- `marketSaleRevenuePerBox = floor(qtyRequired * marketUnitPrice * netSaleMultiplier)`
- `profitImperialBuying = imperialSalePrice - marketPurchaseCostPerBox`
- `profitImperialProducing = imperialSalePrice - costPerBoxProduced`
- `profitMarketProducing = marketSaleRevenuePerBox - costPerBoxProduced`
- `imperialRoi = profitImperialProducing / costPerBoxProduced`

## Regras de inventario
- A cobertura imperial cruza `ingredientsPerBox` com `userInventory`.
- `maxBoxesFromInventory` e calculado pelo menor ratio `owned / required` entre os ingredientes da caixa.
- `inventoryCoveragePct` mede a cobertura da proxima caixa, limitado a `0%..100%`.

## Fontes usadas para validacao
- BDOLytics cooking imperial:
  - https://bdolytics.com/pt/SA/cooking/imperial
- BDOLytics alchemy imperial:
  - https://bdolytics.com/pt/SA/alchemy/imperial
- Tabelas de maestria do projeto:
  - `apps/web/src/lib/crafting/constants.ts`

## Divergencias intencionais
- Quando nao existe preco de mercado confiavel, a comparacao de compra/venda de mercado fica `null` na API e a UI mostra `Sem mercado`.
- O tempo por caixa usa o tempo de acao configurado no cliente e considera mass cooking para cooking, porque isso reflete melhor o fluxo real do jogo do que tratar cada craft como acao isolada.
