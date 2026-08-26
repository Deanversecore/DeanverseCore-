import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const api = join(root, "src/app/api");
const stash = join(root, ".cf-api-stash");

function restore() {
  if (existsSync(stash) && !existsSync(api)) {
    renameSync(stash, api);
  }
}

process.on("exit", restore);
process.on("SIGINT", () => {
  restore();
  process.exit(1);
});

rmSync(join(root, ".next"), { recursive: true, force: true });

if (existsSync(api)) {
  renameSync(api, stash);
}

try {
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, CF_STATIC: "1" },
  });
} finally {
  restore();
}
