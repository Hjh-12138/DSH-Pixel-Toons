const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=__dirname,out=path.resolve(process.argv[2]||'work/whale-source/walk'),rig=JSON.parse(fs.readFileSync(path.join(root,'rig.json'),'utf8')),extraction=JSON.parse(fs.readFileSync(path.join(root,'extraction.json'),'utf8'));
(async()=>{
 const names=['body-main','lower-hair','tail','robot','arm','arm-far','leg','leg-far','shoe','shoe-far'],assets={};for(const n of names)assets[n]='data:image/png;base64,'+fs.readFileSync(path.join(root,'layers',n+'.png')).toString('base64');
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();
 const result=await page.evaluate(async({rig,assets,extraction})=>{
  const images={};for(const [n,url]of Object.entries(assets)){const image=new Image();image.src=url;await image.decode();images[n]=image;}
  const [W,H]=rig.canvas,make=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c},rad=d=>d*Math.PI/180;
  const draw=(g,image,anchor,pivot,angle,scale=1)=>{g.save();g.translate(...anchor);g.rotate(rad(angle));g.scale(scale,scale);g.drawImage(image,-pivot[0],-pivot[1]);g.restore()};
  const smooth=(a,b,y)=>{const t=Math.max(0,Math.min(1,(y-a)/(b-a)));return t*t*(3-2*t)};
  const skinSource=document.createElement('canvas');skinSource.width=images.arm.width;skinSource.height=images.arm.height;const sg=skinSource.getContext('2d');sg.drawImage(images.arm,0,0);const pix=sg.getImageData(0,0,skinSource.width,skinSource.height).data;let sx=0,sy=0,n=0;
  for(let y=70;y<skinSource.height;y++)for(let x=0;x<skinSource.width;x++){const i=(y*skinSource.width+x)*4;if(pix[i+3]>200&&pix[i]>170&&pix[i]>pix[i+1]+10&&pix[i+1]>100){sx+=x;sy+=y;n++;}}
  const armHand=[sx/n,sy/n],armPivot=extraction.arm.pivot,armRest=Math.atan2(-(armHand[0]-armPivot[0]),armHand[1]-armPivot[1])*180/Math.PI;
  const shoePivot=extraction.shoe.pivot,shoeCanvas=document.createElement('canvas');shoeCanvas.width=images.shoe.width;shoeCanvas.height=images.shoe.height;const sh=shoeCanvas.getContext('2d');sh.drawImage(images.shoe,0,0);const shoePixels=sh.getImageData(0,0,shoeCanvas.width,shoeCanvas.height).data;
  const shoeBottom=angle=>{const t=rad(angle);let bottom=-Infinity;for(let y=0;y<shoeCanvas.height;y++)for(let x=0;x<shoeCanvas.width;x++)if(shoePixels[(y*shoeCanvas.width+x)*4+3]>200)bottom=Math.max(bottom,(x-shoePivot[0])*Math.sin(t)+(y-shoePivot[1])*Math.cos(t));return bottom;};
  function ik(hip,ankle){const A=rig.legs.thighLength,B=rig.legs.shinLength,dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],d=Math.hypot(dx,dy);if(d>A+B+.5)throw new Error('Unreachable leg '+d);const a=(A*A-B*B+d*d)/(2*d),h=Math.sqrt(Math.max(0,A*A-a*a));return [hip[0]+dx/d*a-dy/d*h,hip[1]+dy/d*a+dx/d*h]}
  const pixelCache=new Map();
  // Continuous skinning of the ORIGINAL single skin+sock texture, no knee parts.
  function skinLeg(g,image,hip,knee,ankle){
   const rp=extraction.leg.pivot,restAnkle=rig.legs.restAnkle,restH=rig.legs.restLength,k=rig.legs.restKneeY;
   const transform=(x,y)=>{const yy=y-rp[1],xx=x-rp[0],u=(knee[0]-hip[0])/rig.legs.thighLength,uv=(knee[1]-hip[1])/rig.legs.thighLength,v=(ankle[0]-knee[0])/rig.legs.shinLength,vv=(ankle[1]-knee[1])/rig.legs.shinLength;
    const a=[hip[0]+xx*uv+yy*u,hip[1]-xx*u+yy*uv],b=[knee[0]+xx*vv+(yy-k)*v,knee[1]-xx*v+(yy-k)*vv],w=smooth(k-9,k+9,yy);return [a[0]*(1-w)+b[0]*w,a[1]*(1-w)+b[1]*w];};
   let texture=pixelCache.get(image);if(!texture){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const t=c.getContext('2d');t.drawImage(image,0,0);texture=t.getImageData(0,0,c.width,c.height).data;pixelCache.set(image,texture)}
   const raster=g.createImageData(W,H),dst=raster.data;
   // Inverse texture mapping assigns opaque interior pixels directly. Canvas
   // triangle clip antialiasing would otherwise create a visible grid of cracks.
   const sample=(x,y)=>{x=Math.max(0,Math.min(image.width-1,x));y=Math.max(0,Math.min(image.height-1,y));const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(image.width-1,x0+1),y1=Math.min(image.height-1,y0+1),fx=x-x0,fy=y-y0,v=[0,0,0,0];for(const [xx,yy,w]of[[x0,y0,(1-fx)*(1-fy)],[x1,y0,fx*(1-fy)],[x0,y1,(1-fx)*fy],[x1,y1,fx*fy]]){const i=(yy*image.width+xx)*4;for(let k=0;k<4;k++)v[k]+=texture[i+k]*w}return v;};
   const triangle=(s,d)=>{const [A,B,C]=d,den=(B[1]-C[1])*(A[0]-C[0])+(C[0]-B[0])*(A[1]-C[1]);if(Math.abs(den)<1e-8)return;
    const l=Math.max(0,Math.floor(Math.min(A[0],B[0],C[0]))),r=Math.min(W-1,Math.ceil(Math.max(A[0],B[0],C[0]))),t=Math.max(0,Math.floor(Math.min(A[1],B[1],C[1]))),b=Math.min(H-1,Math.ceil(Math.max(A[1],B[1],C[1])));
    for(let y=t;y<=b;y++)for(let x=l;x<=r;x++){const xx=x+.5,yy=y+.5,u=((B[1]-C[1])*(xx-C[0])+(C[0]-B[0])*(yy-C[1]))/den,v=((C[1]-A[1])*(xx-C[0])+(A[0]-C[0])*(yy-C[1]))/den,w=1-u-v;if(u<-1e-6||v<-1e-6||w<-1e-6)continue;const rgba=sample(s[0][0]*u+s[1][0]*v+s[2][0]*w-.5,s[0][1]*u+s[1][1]*v+s[2][1]*w-.5),i=(y*W+x)*4;if(rgba[3]<1)continue;
     if(rgba[3]>=250||dst[i+3]===0){for(let k=0;k<4;k++)dst[i+k]=rgba[k]}else{const a=rgba[3]/255,z=dst[i+3]/255,alpha=a+z*(1-a);for(let k=0;k<3;k++)dst[i+k]=(rgba[k]*a+dst[i+k]*z*(1-a))/alpha;dst[i+3]=alpha*255}
    }
   };
   const step=4;for(let y=0;y<image.height;y+=step)for(let x=0;x<image.width;x+=step){const x2=Math.min(image.width,x+step),y2=Math.min(image.height,y+step),p=[[x,y],[x2,y],[x2,y2],[x,y2]],d=p.map(q=>transform(...q));triangle([p[0],p[1],p[2]],[d[0],d[1],d[2]]);triangle([p[0],p[2],p[3]],[d[0],d[2],d[3]]);}g.putImageData(raster,0,0);
  }
  const outputs=[];
  for(let p=0;p<rig.poses.length;p++){
   const pose=rig.poses[p],phase=pose.phase,bob=pose.bodyBob??-rig.secondary.bodyBobPixels*(1-Math.cos(2*phase))/2,tailAngle=rig.tail.amplitudeDegrees*Math.sin(phase-rig.tail.phaseDelay),hairX=rig.secondary.hairShiftX*Math.sin(phase-Math.PI/2),hairY=rig.secondary.hairShiftY*Math.sin(phase),robotY=rig.robot.y+rig.robot.amplitude*Math.sin(phase),layers=[],landmarks={bodyBob:bob,tailAngle,hairShift:[hairX,hairY],robot:[rig.robot.x,robotY,images.robot.width],armDrawCounts:{near:0,far:0}};
   const layer=(name,drawFn)=>{const c=make(),g=c.getContext('2d');drawFn(g);layers.push({name,png:c.toDataURL('image/png')});return c};
   layer('01 长发下半段',g=>{const im=images['lower-hair'];for(let y=0;y<im.height;y++){const w=smooth(280,375,y);g.drawImage(im,0,y,im.width,1,rig.body.x+hairX*w,rig.body.y+bob+y+hairY*w,im.width,1.1)}});
   layer('02 鲸鱼尾巴',g=>{draw(g,images.tail,[rig.tail.sourceOrigin[0]+rig.tail.pivot[0],rig.tail.sourceOrigin[1]+rig.tail.pivot[1]+bob],rig.tail.pivot,tailAngle)});
   for(const which of ['far','near']){const f=pose[which+'Foot'],ankle=[f.x,f.floor-shoeBottom(f.angle)],hip=[rig.legs.hipX+(which==='near'?-1:1),rig.legs.baseHipY+bob+(f.angle<0?-6:0)],knee=ik(hip,ankle),suffix=which==='far'?'-far':'';
    layer(which==='far'?'03 远侧右腿（原图减亮度16%）':'04 近侧左腿（原图连续蒙皮）',g=>{skinLeg(g,images['leg'+suffix],hip,knee,ankle);draw(g,images['shoe'+suffix],ankle,shoePivot,f.angle)});landmarks[which+'Leg']={hip,knee,ankle,floor:f.floor,footAngle:f.angle};}
   const arm=(g,which)=>{landmarks.armDrawCounts[which]++;const shoulder=rig.arms[which==='near'?'nearShoulder':'farShoulder'].map((v,i)=>i===1?v+bob:v),angle=pose[which+'Arm']-armRest,im=images[which==='near'?'arm':'arm-far'];draw(g,im,shoulder,armPivot,angle,rig.arms.scale);
    const v=[(armHand[0]-armPivot[0])*rig.arms.scale,(armHand[1]-armPivot[1])*rig.arms.scale],t=rad(angle);landmarks[which+'Hand']=[shoulder[0]+v[0]*Math.cos(t)-v[1]*Math.sin(t),shoulder[1]+v[0]*Math.sin(t)+v[1]*Math.cos(t)];};
   layer('05 远侧整臂（肩膀轴，身体后方）',g=>arm(g,'far'));
   layer('06 本体与裙摆',g=>{const im=images['body-main'];g.drawImage(im,0,0,im.width,460,rig.body.x,rig.body.y+bob,im.width,460);for(let x=0;x<im.width;x++){const shift=rig.secondary.hemWarpPixels*Math.sin(x/330*Math.PI+phase);g.drawImage(im,x,460,1,im.height-460,rig.body.x+x,rig.body.y+bob+460,1,im.height-460+shift)}});
   // Each arm is drawn once. The far arm remains behind the torso instead of
   // painting an additional distal-hand copy over the dress.
   layer('07 近侧整臂（肩膀轴）',g=>arm(g,'near'));
   layer('08 浮游机器人（恢复原大小）',g=>g.drawImage(images.robot,rig.robot.x,robotY));
   const merged=make(),g=merged.getContext('2d'),transparent=make(),tg=transparent.getContext('2d');g.fillStyle='#e6e6e6';g.fillRect(0,0,W,H);for(const l of layers){const im=new Image();im.src=l.png;await im.decode();g.drawImage(im,0,0);tg.drawImage(im,0,0)}outputs.push({pose:p+1,name:pose.name,png:merged.toDataURL('image/png'),transparentPng:transparent.toDataURL('image/png'),layers,landmarks});
  }
  return {outputs,armRest,armHand};
 },{rig,assets,extraction});await browser.close();

 const decode=s=>Buffer.from(s.split(',')[1],'base64');fs.mkdirSync(out,{recursive:true});
 for(const pose of result.outputs){
  const id=String(pose.pose).padStart(2,'0'),dir=path.join(out,'layers',id);fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(out,id+'.png'),decode(pose.transparentPng));
  for(let i=0;i<pose.layers.length;i++)fs.writeFileSync(path.join(dir,String(i+1).padStart(2,'0')+'.png'),decode(pose.layers[i].png));
 }
 fs.writeFileSync(path.join(out,'landmarks.json'),JSON.stringify({armRest:result.armRest,armHand:result.armHand,poses:result.outputs.map(p=>({pose:p.pose,name:p.name,landmarks:p.landmarks}))},null,2));
 console.log('Rendered eight walking poses, with eight independently editable layers per pose.');
})().catch(e=>{console.error(e);process.exit(1)});
