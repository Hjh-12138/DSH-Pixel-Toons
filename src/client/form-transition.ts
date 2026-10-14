import type {LoadedCharacter,PackFrame,PackAction} from './resource-pack'
export const FORM_TRANSITION_MS=650
export type FormTransition={from:LoadedCharacter;progress:number;action?:PackAction;time?:number}
export type CharacterLayer={image:HTMLImageElement;frame:PackFrame;x:number;y:number;width:number;height:number;mirror:boolean;smooth:boolean}
function draw(g:CanvasRenderingContext2D,l:CharacterLayer){
 const f=l.frame;g.imageSmoothingEnabled=l.smooth
 if(l.smooth)g.imageSmoothingQuality='high'
 g.save()
 if(l.mirror){g.translate(l.x+l.width,l.y);g.scale(-1,1);g.drawImage(l.image,f.x,f.y,f.w,f.h,0,0,l.width,l.height)}
 else g.drawImage(l.image,f.x,f.y,f.w,f.h,l.x,l.y,l.width,l.height)
 g.restore()
}
/** Reveal the new form behind a downward scan, before foreground compositing. */
export function paintFormTransition(g:CanvasRenderingContext2D,from:CharacterLayer,to:CharacterLayer,progress:number){
 const t=Math.max(0,Math.min(1,progress))
 if(t<=0){draw(g,from);return}if(t>=1){draw(g,to);return}
 const left=Math.min(from.x,to.x),top=Math.min(from.y,to.y),width=Math.max(from.x+from.width,to.x+to.width)-left,height=Math.max(from.y+from.height,to.y+to.height)-top
 const scan=top+height*t,band=4,color=to.smooth?'75,225,255':'166,130,255'
 // Complementary clips prevent a double silhouette while the poses keep moving.
 g.save();g.beginPath();g.rect(left,scan,width,top+height-scan);g.clip();draw(g,from);g.restore()
 g.save();g.beginPath();g.rect(left,top,width,scan-top);g.clip();draw(g,to);g.restore()
 g.save();g.beginPath();g.rect(left,top,width,height);g.clip()
 const glow=g.createLinearGradient(0,scan-band,0,scan+band)
 glow.addColorStop(0,`rgba(${color},0)`);glow.addColorStop(.5,`rgba(${color},.65)`);glow.addColorStop(1,`rgba(${color},0)`)
 g.globalAlpha=Math.min(1,t*8,(1-t)*8);g.fillStyle=glow;g.fillRect(left,scan-band,width,band*2)
 g.fillStyle=to.smooth?'#d9fbff':'#efe2ff';g.fillRect(left,scan-.45,width,.9)
 // Short bright end caps distinguish the scanner from a plain wipe.
 g.fillStyle=`rgb(${color})`;g.fillRect(left,scan-2,1,4);g.fillRect(left+width-1,scan-2,1,4)
 g.restore()
}
