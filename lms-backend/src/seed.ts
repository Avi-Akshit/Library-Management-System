import { connectDatabase, disconnectDatabase } from "./db";
import { bootstrapLibrary } from "./bootstrap";

async function main() {
  await connectDatabase();
  await bootstrapLibrary();
  console.log("Bootstrap complete: branch and loan policies are in place. No sample catalog data was inserted.");
  await disconnectDatabase();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
