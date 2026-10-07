import { createApp } from "./app";
import { bootstrapLibrary } from "./bootstrap";
import { config } from "./config";
import { connectDatabase } from "./db";
import { startHoldExpiryJob } from "./jobs/holdExpiryJob";
import { startDueDateReminderJob, startOverdueJob } from "./jobs/dueDateReminderJob";

async function main() {
  if (!config.skipDb) {
    await connectDatabase();
    await bootstrapLibrary();
    startHoldExpiryJob();
    startDueDateReminderJob();
    startOverdueJob();
  }
  createApp().listen(config.port, () => {
    console.log(`LMS API listening on http://localhost:${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
