import type { Page } from "@playwright/test";
import { createSession } from "feather-testing-core/playwright";

export function session(page: Page) {
  return createSession(page);
}
