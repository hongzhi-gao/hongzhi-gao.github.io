import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',
  fullyParallel:false,workers:1,timeout:45000,
  use:{
    ...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:4173',
    launchOptions:{executablePath:process.env.CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},
    trace:'retain-on-failure'
  },
  webServer:{command:'npm run preview -- --ignore-lock --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI}
});
