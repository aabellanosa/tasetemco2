const { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } = require("node:fs");
const { join } = require("node:path");

const sourceDir = join(__dirname, "..", "site");
const outputDir = join(__dirname, "..", "dist-docs");

function copyDirectory(source, destination) {
  mkdirSync(destination, { recursive: true });

  for (const entry of readdirSync(source)) {
    const sourcePath = join(source, entry);
    const destinationPath = join(destination, entry);

    if (statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

rmSync(outputDir, { recursive: true, force: true });
copyDirectory(sourceDir, outputDir);

console.log(`Built static documentation site into ${outputDir}`);
