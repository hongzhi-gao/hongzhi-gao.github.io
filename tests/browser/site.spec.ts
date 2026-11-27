import { expect,test } from '@playwright/test';

test('core project routes have legible content and source links',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const exceptions:string[]=[];
  page.on('pageerror',error=>exceptions.push(error.message));
  for(const path of ['/', '/projects/iotdb-tsfile/','/projects/mooncake-store/','/lab/','/lab/storage-engine/','/lab/iotconsensus-v1/','/lab/tsfile-layout/','/lab/object-replica-sync/','/lab/object-replica-before/','/contributions/','/evolution/','/blog/','/blog/object-replica/']){
    expect((await page.goto(path))?.ok()).toBeTruthy();
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  }
  await expect(page.locator('[data-event-sources] a')).toHaveAttribute('href',/github\.com\/kvcache-ai\/Mooncake\/blob\/[a-f0-9]{40}\//);
  expect(exceptions).toEqual([]);
});
test('play, pause, seek, rewind and drill down',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/lab/iotdb-overview/');
  await expect(page.locator('[data-mode]')).toHaveText('2D overview');
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.getByRole('button',{name:'Next step'}).click();
  await expect(page.locator('[data-event-title]')).toHaveText('Resolve the data region');
  await page.getByRole('button',{name:'Previous step'}).click();
  await expect(page.locator('[data-event-title]')).toHaveText('Submit a measurement');
  await page.locator('[data-step="4"]').click();
  await expect(page.locator('[data-event-title]')).toHaveText('Read across files');
  await page.locator('[data-node="node"]').click();
  await page.getByRole('link',{name:'Open module'}).click();
  await expect(page).toHaveURL(/storage-engine/);
  await page.goBack();
  await expect(page).toHaveURL(/iotdb-overview/);
  await expect(page.locator('h1')).toHaveText('IoTDB system overview');
});
test('WebGL renders a distinct frame with non-overlapping labels',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/lab/tsfile-layout/');
  await expect(page.locator('[data-mode]')).toHaveText('3D · Drag to orbit',{timeout:15000});
  const scene=page.locator('[data-stage]');
  const first=await scene.screenshot();
  await page.locator('[data-step="5"]').click();
  await expect(page.locator('[data-event-title]')).toHaveText('Find the required chunks');
  const final=await scene.screenshot();
  expect(final.equals(first)).toBeFalsy();
  await expect.poll(()=>page.locator('[data-node]:visible').evaluateAll(labels=>labels.some((node,i)=>{
    const a=node.getBoundingClientRect();
    return labels.slice(i+1).some(other=>{
      const b=other.getBoundingClientRect();
      return a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
    });
  }))).toBe(false);
});
test('architecture history switches a pinned version and shows the structural delta',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/evolution/#mooncake-store');
  const comparison=page.locator('#mooncake-store [data-history]').first();
  await comparison.locator('summary').click();
  await expect(comparison.getByText('Added to the exhibit')).toBeVisible();
  await expect(comparison.locator('[data-exhibit="object-replica-sync"]')).toBeVisible();
  await comparison.getByRole('button',{name:/Before ·/}).click();
  await expect(comparison.locator('[data-exhibit="object-replica-before"]')).toBeVisible();
  await expect(comparison.locator('[data-exhibit="object-replica-sync"]')).toBeHidden();
});
test('mobile hero fits and blog search matches body text',async({page})=>{
  await page.setViewportSize({width:320,height:780});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const fits=await page.locator('h1').evaluate(heading=>{
    const range=document.createRange();range.selectNodeContents(heading);
    return [...range.getClientRects()].every(rect=>rect.right<=innerWidth&&rect.left>=0);
  });
  expect(fits).toBeTruthy();
  await page.goto('/blog/');
  await page.getByRole('searchbox').fill('retention');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.locator('#search-status')).toHaveText(/matching notes/);
  await expect(page.locator('#search-results').getByRole('link',{name:/WAL boundary/})).toBeVisible();
  const rss=await page.request.get('/rss.xml');
  expect(await rss.text()).toContain('Synchronous object replicas');
});
test('an unavailable WebGL context retains selectable components and active paths',async({page})=>{
  await page.addInitScript(()=>{
    const native=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(contextId:string,...args:unknown[]){
      if(contextId==='webgl2')return null;
      return Reflect.apply(native,this,[contextId,...args]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/lab/object-replica-sync/');
  await expect(page.locator('[data-mode]')).toHaveText(/WebGL unavailable/);
  await page.locator('[data-step="5"]').click();
  await expect(page.locator('.fallback-paths line.hot')).toHaveCount(1);
  await page.locator('[data-node="object"]').click();
  await expect(page.locator('[data-node-title]')).toHaveText('Object storage');
});
