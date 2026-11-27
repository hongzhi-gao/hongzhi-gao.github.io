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
test('mobile identity fits and blog search matches body text',async({page})=>{
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
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,contextId:string,...args:unknown[]){
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
test('shared project transition respects reduced motion and technical notes render diagrams',async({page})=>{
  await page.goto('/projects/iotdb-tsfile/');
  await expect(page.locator('[data-stage]')).toHaveCSS('view-transition-name','atlas-iotdb-tsfile');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('[data-stage]')).toHaveCSS('view-transition-name','none');
  await page.goto('/blog/consensus-wal/');
  await expect(page.locator('.katex')).toHaveCount(2);
  await expect(page.locator('.mermaid svg')).toBeVisible({timeout:12000});
});
test('home switches IoTDB modules, scenarios and Mooncake comparisons in place', async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const apache=page.locator('#iotdb-tsfile');
  const mooncake=page.locator('#mooncake-store');
  const storage=apache.getByRole('tab',{name:'Storage Engine'});
  await expect(storage).toHaveAttribute('aria-selected','true');
  const playback=await apache.getByRole('group',{name:'Playback'}).boundingBox();
  const stage=await apache.locator('[data-stage]').boundingBox();
  expect(playback!.y+playback!.height).toBeLessThanOrEqual(stage!.y);
  await storage.focus();
  await page.keyboard.press('ArrowRight');
  await expect(apache.getByRole('tab',{name:'IoTConsensus V1'})).toBeFocused();
  await expect(apache.locator('architecture-explorer')).toHaveAttribute('data-exhibit','iotconsensus-v1');
  await apache.getByRole('tab',{name:'TsFile Format'}).click();
  await expect(apache.locator('architecture-explorer')).toHaveAttribute('data-exhibit','tsfile-layout');
  expect(new URL(page.url()).pathname).toBe('/');
  await mooncake.getByRole('link',{name:'Compare before',exact:true}).click();
  await expect(mooncake.locator('architecture-explorer')).toHaveAttribute('data-exhibit','object-replica-before');
  await mooncake.getByRole('combobox',{name:'Execution scenario'}).selectOption('object-records');
  await expect(mooncake.locator('architecture-explorer')).toHaveAttribute('data-exhibit','object-records');
  await page.reload();
  await expect(mooncake.locator('architecture-explorer')).toHaveAttribute('data-exhibit','object-records');
  await expect(mooncake.getByRole('link',{name:/#5494/}).first()).toHaveAttribute('href','https://github.com/kvcache-ai/Mooncake/pull/5494');
  expect(await page.locator('header nav a').evaluateAll(links=>links.every(link=>link.getAttribute('href')?.startsWith('#')))).toBeTruthy();
});

test('workbench releases WebGL contexts during twenty module switches', async ({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  const warnings: string[]=[];
  page.on('console',message=>{
    if(/too many active webgl contexts|oldest context will be lost|context lost/i.test(message.text()))warnings.push(message.text());
  });
  await page.goto('/');
  const apache=page.locator('#iotdb-tsfile');
  await expect(apache.locator('[data-mode]')).toHaveText('3D · Drag to orbit');
  const opened=['IoTConsensus V1','TsFile Format','Storage Engine'];
  for(let index=0;index<20;index++){
    await apache.getByRole('tab',{name:opened[index%opened.length]}).click();
    await expect(apache.locator('[data-mode]')).toHaveText('3D · Drag to orbit');
    await expect(apache.locator('canvas')).toHaveCount(1);
  }
  expect(warnings).toEqual([]);
});

test('mobile workbench shows graph, playback and source details at 390px', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const apache=page.locator('#iotdb-tsfile');
  await expect(apache.locator('[data-stage]')).toBeVisible();
  await apache.getByRole('tab',{name:'TsFile Format'}).click();
  await apache.getByRole('button',{name:'Next step'}).click();
  await expect(apache.locator('[data-event-title]')).toHaveText('Expand the device group');
  await expect(apache.locator('[data-event-sources] a')).toHaveAttribute('href',/github\.com\/apache\/tsfile\/blob/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
