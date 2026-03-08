import assert from 'node:assert/strict';

import { formatCatalogReport, readLocalCatalogArtifacts } from './recipe-catalog';

function main() {
    const artifacts = readLocalCatalogArtifacts();
    const { report } = artifacts;

    assert(report.snapshotTotal > 0, 'O snapshot local precisa conter ao menos uma receita suportada.');
    assert(report.seedRecipeTotal > 0, 'O seed local precisa conter ao menos uma receita materializável.');
    assert(report.snapshotTotal === report.seedRecipeTotal + report.skippedRecipeIds.length, 'Snapshot suportado e seed materializável estão inconsistentes.');
    assert(report.duplicateSnapshotIds.length === 0, `Snapshot local contém IDs duplicados: ${report.duplicateSnapshotIds.join(', ')}`);
    assert(report.missingItemIds.length === 0, `Seed local referencia itens ausentes: ${report.missingItemIds.join(', ')}`);

    console.log(formatCatalogReport(report));
    console.log('Validação do catálogo local concluída com sucesso.');
}

main();