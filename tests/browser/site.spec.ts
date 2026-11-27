import { expect, test } from '@playwright/test';

const iotdb='/projects/iotdb-tsfile/';
const mooncake='/projects/mooncake-store/';

test('portfolio links to both source maps and draws a responsive Canvas environment',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Hongzhi Gao',exact:true})).toBeVisible();
  for(const href of [iotdb,mooncake]) await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  expect(await page.locator('.drawing-preview').count()).toBe(2);
  const canvas=page.locator('[data-holo-canvas]');
  const before=await canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL());
  await page.mouse.move(120,240);
  await page.mouse.move(865,335,{steps:14});
  await expect.poll(()=>canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).not.toBe(before);
  expect(errors).toEqual([]);
});

test('source maps render verified topology and a real nested TsFile section',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [url,count] of [[iotdb,25],[mooncake,18]] as const){
    expect((await page.goto(url))?.ok()).toBeTruthy();
    expect(await page.locator('[data-node-id]').count()).toBeGreaterThanOrEqual(count);
    expect(await page.locator('[data-edge]').count()).toBeGreaterThanOrEqual(count);
    await expect(page.locator('[data-viewport]')).toBeVisible();
    await expect(page.locator('.diagram-sources a').first()).toHaveAttribute('href',/github\.com\/[^/]+\/[^/]+\/commit\/[a-f\d]{40}$/);
    await expect(page.getByRole('button',{name:'Play',exact:true})).toHaveCount(0);
  }
  await expect(page.getByText('Pinned implementation proposal · PR #5494')).toBeVisible();
  await page.goto(iotdb);
  for(const name of ['CHUNKGROUP','CHUNK','PAGE','TAIL']) await expect(page.locator('.tsfile-section').getByText(name,{exact:true}).first()).toBeVisible();
});

test('diagram interactions link immutable source and contributions in both directions',async({page})=>{
  await page.goto(iotdb);
  const contribution=page.locator('[data-contribution]').filter({hasText:'Preserve WAL needed by reconstructed peers'});
  await contribution.hover();
  await expect(page.locator('[data-node-id=wal]')).toHaveClass(/selected/);
  await expect(page.locator('[data-edge=sync]')).toHaveClass(/related/);
  await page.locator('[data-node-id=wal]').click();
  await expect(page.locator('[data-inspector-title]')).toHaveText('WALNode');
  await expect(page.locator('[data-inspector-links] a').first()).toHaveAttribute('href',/github\.com\/apache\/iotdb\/blob\/[a-f\d]{40}\//);
  await expect(contribution).toBeVisible();
  await expect(page.locator('[data-contribution]').filter({hasText:'tier folder'})).toBeHidden();
  await page.getByRole('button',{name:'Clear selection'}).click();
  await expect(page.locator('[data-inspector]')).toBeHidden();
  await page.getByRole('button',{name:'Query path'}).click();
  await expect(page.locator('[data-edge=driver-exchange]')).toHaveClass(/flowing/);
  const panel=page.locator('#contribution-panel');
  await page.getByRole('button',{name:'Close contributions'}).click();
  await expect(panel).toBeHidden();
  await page.getByRole('button',{name:'Contributions',exact:true}).click();
  await expect(panel).toBeVisible();
});

test('wheel zoom, panning, semantic detail, fit and fullscreen are functional',async({page})=>{
  await page.goto(mooncake);
  const viewport=page.locator('[data-viewport]');
  const camera=page.locator('[data-camera]');
  const start=await camera.getAttribute('transform');
  const rect=(await viewport.boundingBox())!;
  await page.mouse.move(rect.x+rect.width*.33,rect.y+rect.height*.43);
  await page.mouse.wheel(0,-540);
  await expect(page.locator('[data-drawing]')).toHaveAttribute('data-zoom-level','detail');
  const zoomed=await camera.getAttribute('transform');
  expect(zoomed).not.toBe(start);
  await page.mouse.down();await page.mouse.move(rect.x+rect.width*.50,rect.y+rect.height*.53,{steps:10});await page.mouse.up();
  expect(await camera.getAttribute('transform')).not.toBe(zoomed);
  await page.getByRole('button',{name:'Fit',exact:true}).click();
  await expect(page.locator('[data-zoom]')).toHaveText('100%');
  await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Exit fullscreen',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Fullscreen',exact:true})).toHaveAttribute('aria-pressed','false');
});

test('390px touch pinch and the contribution drawer retain the engineering map',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(mooncake);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await expect(page.locator('#contribution-panel')).toBeHidden();
  const cdp=await context.newCDPSession(page);
  const rect=(await page.locator('[data-viewport]').boundingBox())!;
  const x=Math.round(rect.x+rect.width/2);
  const y=Math.round(rect.y+rect.height/2);
  const touches=(dx:number)=>[{x:x-dx,y,id:1},{x:x+dx,y,id:2}];
  const before=await page.locator('[data-zoom]').textContent();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(45)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(60)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(99)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('[data-zoom]')).not.toHaveText(before!);
  await page.getByRole('button',{name:'Contributions',exact:true}).tap();
  await expect(page.locator('#contribution-panel')).toBeVisible();
  await expect(page.locator('#contribution-panel a[href*="/pull/5494"]')).toBeVisible();
  await context.close();
});

test('technical notes search and RSS still work',async({page})=>{
  await page.goto('/blog/');
  await page.getByRole('searchbox').fill('retention');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.locator('#search-results').getByRole('link',{name:/WAL boundary/})).toBeVisible();
  expect(await (await page.request.get('/rss.xml')).text()).toContain('Synchronous object replicas');
});
