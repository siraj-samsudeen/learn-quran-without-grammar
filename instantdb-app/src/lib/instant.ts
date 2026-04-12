import { init } from "@instantdb/react";

// Learn Quran Without Grammar — Teacher Dashboard
// App ID from InstantDB dashboard
const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";

// Schema-less init — InstantDB infers schema from usage
// Entities: lessons, verses, selections
const db = init({ appId: APP_ID });

export default db;
