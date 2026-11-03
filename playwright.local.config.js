const { defineConfig } = require('@playwright/test');

const port = Number(process.env.AAC_TEST_PORT) || 3017;

module.exports = defineConfig({
  testDir: './tests-local',
  timeout: 120000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    actionTimeout: 10000,
    channel: process.env.AAC_CHROME_PATH ? undefined : 'chrome',
    launchOptions: {
      ...(process.env.AAC_CHROME_PATH
        ? { executablePath: process.env.AAC_CHROME_PATH }
        : {}),
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    },
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/serve-local.cjs',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false
  }
});
