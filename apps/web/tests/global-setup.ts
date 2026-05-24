import { chromium, FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL);

  // Inject Zustand auth store state into localStorage
  await page.evaluate(() => {
    const authState = {
      state: {
        user: {
          id: 'test-user-id',
          email: 'demo@cortexgrid.io',
          firstName: 'Demo',
          lastName: 'User',
          organizationId: 'test-org-id',
          role: 'ADMIN',
        },
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        isAuthenticated: true,
      },
      version: 0,
    };
    localStorage.setItem('cortexgrid-auth', JSON.stringify(authState));
  });

  // Set the auth cookie middleware checks
  await context.addCookies([
    {
      name: 'cortexgrid_access_token',
      value: 'test-access-token',
      domain: 'localhost',
      path: '/',
    },
  ]);

  const authDir = path.join('playwright', '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  await context.storageState({ path: path.join(authDir, 'user.json') });
  await browser.close();
}

export default globalSetup;
