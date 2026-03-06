import * as fs from 'fs';
import * as path from 'path';

async function run() {
    let all = [];
    for (let page = 1; page <= 50; page++) {
        console.log('Fetching page', page);
        const res = await fetch(`https://apiv2.bdolytics.com/pt/SA/db/recipes?page=${page}&main_category=cooking`);
        const d = await res.json();
        if (!d.data || d.data.length === 0) break;
        all.push(...d.data);
    }
    fs.writeFileSync('bdo_recipes.json', JSON.stringify(all, null, 2));
    console.log('Total recipes saved:', all.length);

    // Find Cerveja
    const beer = all.find(r => r.results && r.results.some(res => res.id === 9213));
    if (beer) {
        fs.writeFileSync('bdo_beer.json', JSON.stringify(beer, null, 2));
        console.log('Saved beer exact recipe to bdo_beer.json');
    }
}
run().catch(console.error);
