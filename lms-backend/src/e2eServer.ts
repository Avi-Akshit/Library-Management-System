import { createApp } from "./app";
import { seedTestData, setupTestDb } from "../tests/integration/helpers";

async function main() {
  await setupTestDb();
  await seedTestData();
  const port = Number(process.env.PORT ?? 4000);
  createApp().listen(port, () => {
    console.log(`LMS E2E API listening on http://localhost:${port}`);
    console.log("Seeded: member@test.com / librarian@test.com (password123)");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
