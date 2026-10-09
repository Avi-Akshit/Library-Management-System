import { rmSync } from "node:fs";
import { resolve } from "node:path";

rmSync(resolve(".next", "dev", "types"), { recursive: true, force: true });
