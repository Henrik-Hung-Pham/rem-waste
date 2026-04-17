import { test as base, expect, type Page } from '@playwright/test';
import { PostcodePage } from '../../pages/postcode.page';
import { WastePage } from '../../pages/waste.page';
import { SkipPage } from '../../pages/skip.page';
import { ReviewPage } from '../../pages/review.page';

type Fixtures = {
  /** Page already navigated to the app with MSW state reset. */
  freshPage: Page;
  postcodePage: PostcodePage;
  wastePage: WastePage;
  skipPage: SkipPage;
  reviewPage: ReviewPage;
};

export const test = base.extend<Fixtures>({
  freshPage: async ({ page }, use) => {
    // './' resolves to baseURL for both local ('http://localhost:5173/') and
    // the Pages deploy ('https://jason-pham.github.io/rem-waste/'). Plain '/'
    // would escape the /rem-waste/ sub-path on Pages.
    await page.goto('./');
    await page.waitForFunction(
      () => navigator.serviceWorker?.controller !== null,
      undefined,
      { timeout: 10_000 },
    );
    // Reset MSW counters through the browser's fetch so the service worker
    // intercepts it. `page.request` bypasses the SW and 404s against the Pages
    // deploy; `page.evaluate(() => fetch(...))` goes through the SW in both
    // dev and deployed environments.
    await page
      .evaluate(() =>
        fetch('/_mocks/reset', { method: 'POST' })
          .then((r) => r.ok)
          .catch(() => false),
      )
      .catch(() => undefined);
    await use(page);
  },
  postcodePage: async ({ freshPage }, use) => {
    await use(new PostcodePage(freshPage));
  },
  wastePage: async ({ freshPage }, use) => {
    await use(new WastePage(freshPage));
  },
  skipPage: async ({ freshPage }, use) => {
    await use(new SkipPage(freshPage));
  },
  reviewPage: async ({ freshPage }, use) => {
    await use(new ReviewPage(freshPage));
  },
});

export { expect };
