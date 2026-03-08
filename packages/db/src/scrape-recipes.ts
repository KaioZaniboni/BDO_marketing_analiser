import { buildRemoteCatalogArtifacts, formatCatalogReport, writeCatalogArtifacts } from './recipe-catalog';

async function main() {
    console.log('Regenerando catálogo oficial de receitas (snapshot bruto + seed-data)...');
    const artifacts = await buildRemoteCatalogArtifacts();

    writeCatalogArtifacts(artifacts);

    console.log(formatCatalogReport(artifacts.report));
    console.log('Arquivos atualizados: bdo_recipes.json, seed-data/items.json e seed-data/recipes.json');
}

main().catch((error) => {
    console.error('Failed to regenerate official recipe catalog:', error);
    process.exit(1);
});
