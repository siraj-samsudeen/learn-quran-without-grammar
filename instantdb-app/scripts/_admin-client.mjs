// Internal helper: instantiate an InstantDB admin client with env-provided
// credentials. All admin scripts must import createAdminDb() from here —
// never hardcode the admin token in source.
import { init } from "@instantdb/admin";

const APP_ID = process.env.INSTANT_APP_ID ?? "b1c9a636-2a46-4be6-a055-16d6f2ebd233";

export function createAdminDb() {
  const token = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!token) {
    console.error("Set INSTANT_APP_ADMIN_TOKEN before running admin scripts.");
    process.exit(1);
  }
  return init({ appId: APP_ID, adminToken: token });
}
