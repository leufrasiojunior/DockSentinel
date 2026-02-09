#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.join(process.cwd(), "package.json");

if (!fs.existsSync(pkgPath)) {
  console.error("package.json não encontrado na raiz do projeto.");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const v = pkg.version;

if (!v) {
  console.error("package.json não possui o campo 'version'.");
  process.exit(1);
}

console.log(v);
