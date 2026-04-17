import { init } from "@instantdb/react";
import schema from "../../instant.schema";

// Learn Quran Without Grammar — typed InstantDB client.
// Schema lives in ../../instant.schema.ts (push via `npm run schema:push`).
const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";

const db = init({ appId: APP_ID, schema });

export default db;
