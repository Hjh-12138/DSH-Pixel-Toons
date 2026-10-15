import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

await mkdir('work/browser-tests',{recursive:true});
const server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,TOONS_PREVIEW_PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,page;const errors=[],report={};
try{
 const url=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Preview startup timed out')),30000);let log='';
  server.stdout.on('data',data=>{log+=data;const match=log.match(/http:\/\/127\.0\.0\.1:\d+\//);if(match){clearTimeout(timer);resolve(match[0]);}});
  server.on('error',reject);server.on('exit',code=>{if(code)reject(Error('Preview exited '+code));});
 });
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1280,height:1000}});
 page.on('pageerror',error=>errors.push(String(error)));
 await page.addInitScript(()=>{
  window.__imageLoads=[];const Original=window.Image;
  function CountingImage(...args){const image=new Original(...args);image.addEventListener('load',()=>window.__imageLoads.push([image.naturalWidth,image.naturalHeight]));return image;}
  CountingImage.prototype=Original.prototype;window.Image=CountingImage;
 });
 const canvas=page.locator('.toons-stage canvas'),waitCharacter=id=>page.waitForFunction(id=>document.querySelector('.toons-stage canvas')?.dataset.characterPack===id,id);
 const imageCount=()=>page.evaluate(()=>window.__imageLoads.length);
 await page.goto(url+'?form=pixel&action=idle');await waitCharacter('builtin-whale-dual-pixel');
 await page.waitForTimeout(300);assert.ok(!(await page.evaluate(()=>window.__imageLoads)).some(([w,h])=>w>=1024||h>=1024),'pixel startup decoded native/HD artwork');
 const first=await imageCount();await page.getByRole('button',{name:'高清',exact:true}).click();await waitCharacter('builtin-whale-dual-hd');await page.waitForTimeout(800);
 const hd=await imageCount();assert.ok(hd>first);
 await page.getByRole('button',{name:'像素',exact:true}).click();await waitCharacter('builtin-whale-dual-pixel');await page.waitForTimeout(800);
 assert.equal(await imageCount(),hd,'returning to the pixel form decoded it again');
 await page.getByRole('button',{name:'高清',exact:true}).click();await waitCharacter('builtin-whale-dual-hd');await page.waitForTimeout(800);
 assert.equal(await imageCount(),hd,'returning to the HD form decoded it again');
 report.decodedCache={pixel:first,hd:hd-first,repeatDecodes:0};
 const before=Number(await canvas.getAttribute('data-draw-count'));await page.waitForTimeout(1000);const draws=Number(await canvas.getAttribute('data-draw-count'))-before;
 assert.ok(draws>=6&&draws<=12,`stationary idle painted ${draws} times in one second`);report.idleDrawsPerSecond=draws;
 await page.getByRole('button',{name:'本地资源',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'选择角色 鲸鱼娘',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:/^选择角色 /}).count(),8);
 await page.locator('input[type=file]').setInputFiles('examples/mint-robot.toons.zip');
 await waitCharacter('mint-robot-garden');
 await page.getByRole('button',{name:'选择角色 鲸鱼娘',exact:true}).click();await waitCharacter('builtin-whale-dual-pixel');
 const sceneCount=await imageCount();await page.getByRole('combobox',{name:'本地场景',exact:true}).selectOption('');
 await page.waitForTimeout(150);assert.equal(await imageCount(),sceneCount,'changing the background decoded the character again');report.sceneKeepsCharacter=true;
 await page.getByRole('button',{name:'本地资源',exact:true}).click();
 const actions=[['待机','idle'],['思考','think'],['阅读','read'],['敲键盘','type'],['搜索','search'],['测试','check'],['构建','build'],['Git','git'],['协作','agents'],['向左走','walk-left'],['向右走','walk-right'],['任务完成','success'],['遇到问题','failed']];
 report.forms={};
 for(const [form,label]of [['pixel','像素'],['hd','高清']]){
  await page.getByRole('button',{name:label,exact:true}).click();await waitCharacter('builtin-whale-dual-'+form);report.forms[form]={};
  for(const [name,id]of actions){
   await page.emulateMedia({reducedMotion:id.startsWith('walk-')?'no-preference':'reduce'});
   await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(id=>document.querySelector('.toons-stage canvas').dataset.clip===id,id);
   await page.emulateMedia({reducedMotion:'no-preference'});
   const frames=await canvas.evaluate(async el=>{const seen=new Set();for(let i=0;i<45;i++){seen.add(Number(el.dataset.frame));await new Promise(resolve=>setTimeout(resolve,25));}return [...seen].sort();});
   assert.deepEqual(frames,[0,1,2,3,4,5,6,7],form+'/'+id);report.forms[form][id]=frames;
  }
 }
 await page.getByRole('button',{name:'协作',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.toons-stage canvas').dataset.clip==='agents');
 for(const [form,label]of [['pixel','像素'],['hd','高清']]){
  await page.getByRole('button',{name:label,exact:true}).click();await waitCharacter('builtin-whale-dual-'+form);
  await page.waitForFunction(()=>{const d=document.querySelector('.toons-stage canvas').dataset;return d.clip==='agents'&&d.transition==='none';});
 }
 report.pairedCollaboration=true;
 await page.getByRole('button',{name:'暂停播放',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.toons-stage canvas').dataset.playing==='false');
 const pausedTime=await canvas.getAttribute('data-motion-time');await page.waitForTimeout(200);assert.equal(await canvas.getAttribute('data-motion-time'),pausedTime);
 await page.getByRole('button',{name:'继续播放',exact:true}).click();report.pauseFreezesFrame=true;
 await page.getByRole('button',{name:'本地资源',exact:true}).click();await page.getByRole('button',{name:'选择角色 Deep seek',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.toons-stage canvas').dataset.nativeSprites==='true');
 for(const [label,id]of [['待机','idle'],['向左走','walk-left'],['向右走','walk-right']]){
  await page.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(id=>document.querySelector('.toons-stage canvas').dataset.action===id,id);
 }
 await page.evaluate(()=>history.replaceState(null,'',location.pathname));await page.reload();await page.waitForFunction(()=>document.querySelector('.toons-stage canvas')?.dataset.nativeSprites==='true');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dsh-toons:v1')).characterPackId),'default-deepseek');report.nativeReload=true;
 await page.getByRole('button',{name:'本地资源',exact:true}).click();await page.screenshot({path:'work/browser-tests/character-picker.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'work/browser-tests/mobile.png'});report.mobile=true;report.errors=errors;assert.deepEqual(errors,[]);
 await page.setViewportSize({width:1280,height:1000});await page.goto(url+'?form=hd&action=reading&timing=live');await waitCharacter('builtin-whale-dual-hd');
 await page.getByRole('button',{name:'思考',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.toons-stage canvas').dataset.clip==='think');
 await page.evaluate(()=>{window.__clips=[];new MutationObserver(()=>window.__clips.push(document.querySelector('.toons-stage canvas').dataset.clip)).observe(document.querySelector('.toons-stage canvas'),{attributes:true,attributeFilter:['data-clip']});});
 await page.getByRole('button',{name:'测试',exact:true}).click();await page.getByRole('button',{name:'构建',exact:true}).click();await page.getByRole('button',{name:'Git',exact:true}).click();
 assert.equal(await canvas.getAttribute('data-clip'),'think','rapid tools interrupted a newly started visual pose');
 await page.waitForFunction(()=>document.querySelector('.toons-stage canvas').dataset.clip==='git');
 assert.ok(!(await page.evaluate(()=>window.__clips)).some(id=>id==='check'||id==='build'),'obsolete queued poses were replayed');
 await page.getByRole('button',{name:'任务完成',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.toons-stage canvas').dataset.clip==='success',undefined,{timeout:500});
 report.liveActionCoalescing=true;
 await writeFile('work/browser-tests/validation.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({forms:2,actionsEach:13,decodedCache:report.decodedCache,idleDrawsPerSecond:draws,nativeReload:true,mobile:true,errors}));
}catch(error){
 report.error=String(error);report.errors=errors;
 if(page){await page.screenshot({path:'work/browser-tests/failure.png'}).catch(()=>{});report.canvas=await page.locator('.toons-stage canvas').evaluate(el=>({...el.dataset})).catch(()=>({}));}
 await writeFile('work/browser-tests/validation.json',JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser?.close();server.kill();}
