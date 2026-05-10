import { buildServer } from './server.js';
import { initLibraryConfig } from './local-library.js';

const port = Number(process.env.PORT ?? 4319);
const host = process.env.HOST ?? '0.0.0.0';

async function main(): Promise<void> {
  const cfg = await initLibraryConfig();
  const app = await buildServer({ libraryConfig: cfg });
  try {
    await app.listen({ port, host });
    console.log(`[우리집 기록관] 로컬 서버 실행: http://${host}:${port}`);
    console.log(`[우리집 기록관] 라이브러리 폴더: ${cfg.rootDir}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
