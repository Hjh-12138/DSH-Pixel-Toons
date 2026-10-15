const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=__dirname,out=path.resolve(process.argv[2]||'work/whale-source/front'),ids=['idle','think','read','type','search','check','success','failed','build','git','agents'];
(async()=>{
 const assets={};for(const file of fs.readdirSync(path.join(root,'layers')).filter(x=>x.endsWith('.png')))assets[file.slice(0,-4)]='data:image/png;base64,'+fs.readFileSync(path.join(root,'layers',file)).toString('base64');
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();
 const result=await page.evaluate(async({assets,ids})=>{
  const images={};for(const [id,url]of Object.entries(assets)){const image=new Image();image.src=url;await image.decode();images[id]=image}
  const make=(w=512,h=512)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c},rad=x=>x*Math.PI/180;
  const arms={};
  for(const name of ['right-down','right-palm','right-point','right-hold','left-down','left-palm','left-point','left-open']){
   const im=images[name],c=make(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);const rgba=g.getImageData(0,0,c.width,c.height).data;let sx=0,sy=0,n=0,hx=0,hy=0,hn=0;
   for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const at=(y*im.width+x)*4;if(rgba[at+3]>180){if(y<im.height*.06){sx+=x;sy+=y;n++}if(y>im.height*.48&&rgba[at]>170&&rgba[at+1]>100&&rgba[at+2]>90&&rgba[at]>rgba[at+1]*1.06){hx+=x;hy+=y;hn++}}}
   arms[name]={pivot:[sx/n,sy/n],hand:[hx/hn,hy/hn],height:name.endsWith('down')?50:name.endsWith('point')?48:51};
  }
  const maskLeft=[[192,315],[225,318],[219,348],[208,366],[195,389],[164,386],[162,361],[170,346],[183,339]],bodies=[];
  for(let i=0;i<8;i++){
   const c=make(),g=c.getContext('2d');g.drawImage(images['original-'+i],0,0);
   g.save();g.beginPath();for(const points of [maskLeft,maskLeft.map(([x,y])=>[512-x,y])]){points.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.closePath()}g.clip();g.clearRect(0,0,512,512);g.drawImage(images['arm-area-fill'],0,0);g.restore();bodies.push(c);
  }
  const drawPart=(g,name,x,y,width,angle=0,opacity=1)=>{const im=images[name],h=width*im.height/im.width;g.save();g.translate(x+width/2,y+h/2);g.rotate(rad(angle));g.globalAlpha=opacity;g.drawImage(im,-width/2,-h/2,width,h);g.restore();return {x:x+width/2,y:y+h/2,width,height:h}};
  const dot=(g,x,y,r,color='#8cecff')=>{g.save();g.shadowColor=color;g.shadowBlur=7;g.strokeStyle=color;g.lineWidth=1.1;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();g.restore()};
  const arm=(g,name,which,angle,bob,mirror=false)=>{const im=images[name],a=arms[name],scale=a.height/im.height,anchor=which==='right'?[214,318+bob]:[298,318+bob];g.save();g.translate(...anchor);g.rotate(rad(angle));g.scale(mirror?-scale:scale,scale);g.drawImage(im,-a.pivot[0],-a.pivot[1]);g.restore();const dx=(a.hand[0]-a.pivot[0])*scale*(mirror?-1:1),dy=(a.hand[1]-a.pivot[1])*scale,t=rad(angle);return [anchor[0]+dx*Math.cos(t)-dy*Math.sin(t),anchor[1]+dx*Math.sin(t)+dy*Math.cos(t)]};
  const configs=(id,p)=>{const s=Math.sin(p),c=Math.cos(p);switch(id){
   case 'idle':return ['right-down','left-down',21+2*s,-21-2*s];
   case 'think':return ['right-hold','left-down',-117+3*s,-22];
   case 'read':return ['right-palm','left-palm',28+3*s,-28-3*s];
   case 'type':return ['right-point','left-point',12*s,12*c];
   case 'search':return ['right-point','left-down',45+11*s,-21];
   case 'check':return ['right-hold','left-down',-52+5*s,-21];
   case 'build':return ['right-palm','left-palm',-10+12*s,10-12*s];
   case 'git':return ['right-point','left-point',-25+10*s,25+10*c];
   case 'agents':return ['right-palm','left-palm',16+9*s,-16-9*s];
   case 'success':return ['left-open','left-open',105+20*s,-105-20*s,true];
   case 'failed':return ['right-down','left-down',9-4*s,-9+4*s];
  }};
  function actor(id,i,robot=true){
   const c=make(),g=c.getContext('2d'),p=i*Math.PI/4,bob=Math.round(Math.sin(p)*1),bodyIndex=id==='failed'?[0,3,4,4,4,3,0,0][i]:i;
   g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   const tail=images.tail,tw=208,ts=tw/tail.width,pivot=[20,145],at=[298,379],ta=rad(2.2*Math.sin(p-Math.PI/4));g.save();g.translate(at[0],at[1]);g.rotate(ta);g.drawImage(tail,-pivot[0]*ts,-pivot[1]*ts,tw,tail.height*ts);g.restore();
   // The original source supplies all visible facial, hair, dress, apron and leg pixels.
   g.drawImage(bodies[bodyIndex],46,54,420,420);
   const pose=configs(id,p),handRight={},handLeft={};
   if(id==='read')drawPart(g,'book',195,306+bob,123,2*Math.sin(p));
   if(id==='type')drawPart(g,'keyboard',200,349+bob,110);
   if(id==='search'){drawPart(g,'diamond',170+4*Math.sin(p),309+bob,30);dot(g,185,332,19+2*Math.sin(p));}
   if(id==='check')drawPart(g,'chip',273,340+bob,43,3*Math.sin(p));
   if(id==='git'){drawPart(g,'git-graph',205,302+bob,102);dot(g,256,339,6+3*(1-Math.cos(p)),'#d7faff')}
   if(id==='agents'){dot(g,211,356,11+2*Math.sin(p));dot(g,301,356,11-2*Math.sin(p))}
   const right=arm(g,pose[0],'right',pose[2],bob,!!pose[4]),left=arm(g,pose[1],'left',pose[3],bob);Object.assign(handRight,{point:right});Object.assign(handLeft,{point:left});
   if(id==='build'){
    const progress=(1-Math.cos(p))*.5,locations=[[224+8*progress,312+6*progress],[270-8*progress,312+6*progress],[235+2*progress,348-4*progress],[260-2*progress,348-4*progress]];
    for(const [a,b]of [[0,2],[1,3],[2,3]]){g.save();g.strokeStyle='#86e4f0';g.lineWidth=.75;g.globalAlpha=.6;g.beginPath();g.moveTo(locations[a][0]+12,locations[a][1]+12);g.lineTo(locations[b][0]+12,locations[b][1]+12);g.stroke();g.restore()}
    for(let k=0;k<4;k++)drawPart(g,'cube-'+k,...locations[k],25,2*Math.sin(p+k));
   }
   if(id==='check'){
    const probe=drawPart(g,'probe',right[0]-12,right[1]-38,27,5*Math.sin(p));g.save();g.strokeStyle='#84edf7';g.lineWidth=1.5;g.globalAlpha=.4+.35*(1+Math.sin(p))/2;g.beginPath();g.moveTo(probe.x+7,probe.y-11);g.lineTo(293,349+bob);g.stroke();g.restore();
    if(i===4||i===5){g.save();g.strokeStyle='#93f4da';g.lineWidth=2;g.beginPath();g.moveTo(302,328);g.lineTo(306,332);g.lineTo(313,322);g.stroke();g.restore()}
   }
   if(id==='think'){dot(g,242,298,2.8);dot(g,235,285,1.9)}
   if(id==='success')for(let k=0;k<7;k++){const a=k*Math.PI*2/7+p*.12,r=22+7*(1-Math.cos(p)),x=256+Math.cos(a)*r,y=309+Math.sin(a)*r;dot(g,x,y,1.4,k%2?'#9ee8ef':'#eec685')}
   if(id==='failed'){g.save();g.strokeStyle='#e36e81';g.lineWidth=1.2;g.beginPath();g.moveTo(248,312);g.lineTo(264,328);g.moveTo(264,312);g.lineTo(248,328);g.stroke();g.restore()}
   if(robot)drawPart(g,'robot',421+Math.round(Math.sin(p-Math.PI/4)),171+Math.round(3*Math.sin(p+Math.PI/4)),63);
   return {canvas:c,hands:[right,left],armCount:2,bodyIndex};
  }
  const frames=[],rigReport=[];
  for(const id of ids)for(let i=0;i<8;i++){
   const main=actor(id,i),w=id==='agents'?768:512,c=make(w),g=c.getContext('2d');g.drawImage(main.canvas,(w-512)/2,0);
   const clones=[];
   if(id==='agents')for(const [side,cx]of [['left',114],['right',654]]){
    const phase=(i+(side==='left'?2:6))%8,mini=actor('type',phase,false),s=.45,x=cx-256*s,y=448-448*s;
    g.drawImage(mini.canvas,x,y,512*s,512*s);drawPart(g,'terminal',cx-33,389+Math.round(Math.sin(i*Math.PI/4)*.5),66);
    clones.push({side,scale:s,anchorX:cx,anchorY:448,armCount:2});
   }
   frames.push({id,index:i+1,width:w,png:c.toDataURL('image/png')});rigReport.push({id,frame:i+1,arms:main.armCount,bodyIndex:main.bodyIndex,hands:main.hands,clones});
  }
  const bodyImages=bodies.map(c=>c.toDataURL('image/png'));
  return {frames,rigReport,arms,bodyImages};
 },{assets,ids});await browser.close();

 fs.mkdirSync(out,{recursive:true});
 for(let i=0;i<result.bodyImages.length;i++)fs.writeFileSync(path.join(out,'body-'+i+'.png'),Buffer.from(result.bodyImages[i].split(',')[1],'base64'));
 for(const frame of result.frames){const dir=path.join(out,'frames',frame.id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,String(frame.index).padStart(2,'0')+'.png'),Buffer.from(frame.png.split(',')[1],'base64'));}
 fs.writeFileSync(path.join(out,'rig.json'),JSON.stringify({originalBodyScale:420/512,originalBodyOffset:[46,54],arms:result.arms,robot:{width:63,x:421,y:171},tail:{width:208,anchor:[298,379],pivot:[20,145]},cloneScale:.45,poses:result.rigReport},null,2));
 console.log('Rendered 88 front frames from the archived layers.');
})().catch(e=>{console.error(e);process.exit(1)});
