import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = readdirSync(__dirname)
  .filter((f) => f.endsWith(".test.js"))
  .sort();

let totalPassed = 0;
let totalFailed = 0;
const failures = [];

console.log(`Found ${testFiles.length} test file(s): ${testFiles.join(", ")}\n`);

for (const file of testFiles) {
  const filePath = join(__dirname, file);
  const fileUrl = pathToFileURL(filePath).href;
  console.log(`Running ${file}...`);

  try {
    await import(fileUrl);
    totalPassed++;
    console.log(`  OK ${file} executed successfully`);
  } catch (error) {
    totalFailed++;
    console.error(`  ERROR importing ${file}: ${error.message}`);
    failures.push({ file, name: "import", error: error.message });
  }
}

console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);

if (failures.length > 0) {
  console.log("\nFailures:");
  for (const failure of failures) {
    console.log(`  - ${failure.file}: ${failure.name}`);
    console.log(`    ${failure.error}`);
  }
  process.exitCode = 1;
} else {
  console.log("\nAll tests passed!");
}
