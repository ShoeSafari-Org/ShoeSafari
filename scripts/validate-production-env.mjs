import { validateProductionEnvironment } from "../lib/productionEnvValidation.mjs";

const errors = validateProductionEnvironment();
if (errors.length > 0) {
  console.error(`Production configuration is incomplete:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}

console.info("Production public configuration validated; values were not displayed.");
