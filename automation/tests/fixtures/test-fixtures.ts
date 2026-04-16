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
    // Best-effort mock reset. This endpoint is MSW-handled in the browser but
    // `page.request` hits the origin Node-side and bypasses the SW, so against
    // the Pages deploy it 404s. Each Playwright context starts with a fresh SW
    // registration, so isolation is preserved either way.
    await page.request.post('/_mocks/reset').catch(() => undefined);
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
