import { test as base, expect, type Page } from "@playwright/test";
import type { CurrentTimerResponseDto } from "@/lib/api/generated/models";

type CleanupFixtures = {
  trackSessionId: (id: string) => void;
  trackTimerTitle: (title: string) => void;
};

async function cleanupSessionIds(page: Page, ids: Set<string>) {
  for (const id of ids) {
    const deleteResponse = await page.request.delete(
      `/api/backend/immersion-session/${id}`,
    );
    expect(
      [200, 204, 404],
      `Could not delete test session ${id} during cleanup`,
    ).toContain(deleteResponse.status());
  }
}

export const test = base.extend<CleanupFixtures>({
  trackSessionId: async ({ page }, fixtureUse) => {
    const ids = new Set<string>();
    await fixtureUse((id) => ids.add(id));
    // This will run when the test is finished (because of the await fixtureUse above)
    await cleanupSessionIds(page, ids);
  },

  trackTimerTitle: async ({ page }, fixtureUse) => {
    let timerTitle: string | undefined;
    const sessionIds = new Set<string>();
    await fixtureUse((title) => {
      timerTitle = title;
    });

    if (timerTitle) {
      const timerResponse = await page.request.get("/api/backend/timer");
      if (timerResponse.ok()) {
        const timerBody = await timerResponse.text();
        const activeTimer = timerBody
          ? (JSON.parse(timerBody) as CurrentTimerResponseDto | null)
          : null;
        if (activeTimer?.title === timerTitle) {
          const stopResponse = await page.request.post(
            "/api/backend/timer/stop",
          );
          expect(
            stopResponse,
            "Could not stop the test timer during cleanup",
          ).toBeOK();
          const stoppedSession = (await stopResponse.json()) as { _id: string };
          sessionIds.add(stoppedSession._id);
        }
      } else {
        expect(timerResponse.status()).toBe(404);
      }
    }

    await cleanupSessionIds(page, sessionIds);
  },
});

export { expect };
