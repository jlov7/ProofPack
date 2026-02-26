import { buildServer } from './server.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  const app = await buildServer();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.error(`ProofPack API listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
