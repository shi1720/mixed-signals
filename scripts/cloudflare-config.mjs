import { readFileSync, writeFileSync } from 'node:fs';
const [name, databaseId] = process.argv.slice(2);
if (
  !name ||
  !/^[a-z][a-z0-9-]{2,50}$/.test(name) ||
  !databaseId ||
  !/^[a-f0-9-]{36}$/i.test(databaseId)
) {
  console.error(
    'Usage: node scripts/cloudflare-config.mjs <worker-name> <D1-database-UUID>',
  );
  process.exit(1);
}
const config = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
config.name = name;
delete config.topLevelName;
config.d1_databases = [
  {
    binding: 'DB',
    database_name: name,
    database_id: databaseId,
    migrations_dir: '../../drizzle',
  },
];
config.observability = { enabled: false };
writeFileSync(
  'dist/server/wrangler.deploy.json',
  JSON.stringify(config, null, 2) + '\n',
);
console.log(
  'Created dist/server/wrangler.deploy.json. Review it, apply remote migrations, then deploy. No resources were changed.',
);
