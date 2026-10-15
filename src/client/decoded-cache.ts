import type {PackResources} from './resource-pack'

/** A failed load is retryable. Eviction drops cache ownership, never an image
 * currently held by a renderer or a transition. Pending loads are deduplicated. */
export class DecodedCache {
 private entries=new Map<string,{promise:Promise<unknown>;bytes:number;ready:boolean}>()
 constructor(readonly budget=128*1024*1024){}
 load<T>(key:string,read:()=>Promise<T>,size:(value:T)=>number):Promise<T>{
  const old=this.entries.get(key)
  if(old){this.entries.delete(key);this.entries.set(key,old);return old.promise as Promise<T>}
  const entry={promise:undefined as unknown as Promise<T>,bytes:0,ready:false}
  entry.promise=Promise.resolve().then(read).then(value=>{
   if(this.entries.get(key)===entry){entry.bytes=Math.max(0,Number(size(value))||0);entry.ready=true;this.trim()}
   return value
  }).catch(error=>{if(this.entries.get(key)===entry)this.entries.delete(key);throw error})
  this.entries.set(key,entry);return entry.promise
 }
 private trim(){
  let total=[...this.entries.values()].reduce((sum,e)=>sum+e.bytes,0)
  for(const [key,e]of this.entries){if(total<=this.budget)break;if(e.ready){total-=e.bytes;this.entries.delete(key)}}
 }
 invalidate(prefix:string){for(const key of this.entries.keys())if(key.startsWith(prefix))this.entries.delete(key)}
 get bytes(){return [...this.entries.values()].reduce((sum,e)=>sum+e.bytes,0)}
}
export const decodedCache=new DecodedCache()
export function imageBytes(images:Iterable<HTMLImageElement>):number{
 return [...new Set(images)].reduce((sum,image)=>sum+(image.naturalWidth||image.width||0)*(image.naturalHeight||image.height||0)*4,0)
}
export function packResourceBytes(value:PackResources):number{
 return imageBytes([...Object.values(value.character?.images??{}),...[value.scene?.background,value.scene?.foreground].filter((v):v is HTMLImageElement=>!!v)])
}
