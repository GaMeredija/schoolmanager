import { seedTestData } from "./seed-test-data";

console.log("🚀 Iniciando seed forçado...");

seedTestData()
  .then(() => {
    console.log("🎉 Seed concluído com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha no seed:", error);
    process.exit(1);
  });

