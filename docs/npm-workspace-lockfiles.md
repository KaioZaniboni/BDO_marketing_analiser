# NPM workspace lock files

O monorepo usa `npm workspaces` e mantem o lock file principal em `package-lock.json` na raiz.

## Excecao para `packages/db`

O pacote `packages/db` tambem versiona um `package-lock.json` local porque algumas ferramentas de analise de dependencias, como o RHDA, avaliam `package.json` de forma isolada e exigem um lock file no mesmo diretorio.

Esse arquivo deve ser atualizado a partir de `packages/db` com o comando abaixo, sempre em modo isolado do workspace:

```bash
npm install --package-lock-only --workspaces=false --ignore-scripts --no-audit --no-fund
```

Esse processo nao substitui o lock file da raiz. Ele existe apenas para compatibilidade com a analise do pacote `@bdo/db`.
