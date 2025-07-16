import { exec } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { Plugin } from "vite";
const execP = promisify(exec);

const PREFIX = "nix-build:";
export default function(): Plugin {
  return {
    name: "nix-plugin",
    async resolveId(id, importer) {
      if (!id.startsWith(PREFIX)) return;
      const [_, nixFile, output] = id.split(":");
      const resolved = await this.resolve(nixFile, importer);
      const { stdout } = await execP(`nix-build --no-out-link ${nixFile}`);
      const p = join(stdout.trim(), output);
      return p;
    },
  };
}
