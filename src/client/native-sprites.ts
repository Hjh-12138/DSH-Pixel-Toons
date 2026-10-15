import {DEFAULT_CHARACTER_ID} from '../character-names'
import {unpackArchive,imageType} from './resource-pack'
import {actionSheets,type AnimationSprites} from './sprite'
import type {Action} from './animation'
import type {BuiltinArchiveReader} from './builtin-packs'
import {decodedCache,imageBytes} from './decoded-cache'

export const NATIVE_SPRITES=['idle','think','read','type','search','check','success','failed','walk'] as const
export function nativeSpriteEntries(bytes:Uint8Array):Record<string,Uint8Array>{
 const entries=unpackArchive(bytes),expected=NATIVE_SPRITES.map(id=>id+'.webp')
 if(Object.keys(entries).length!==expected.length||expected.some(file=>!entries[file]||imageType(entries[file]!)!=='image/webp'))throw new Error('原生角色素材不完整')
 return entries
}
export function loadNativeSprites(read:BuiltinArchiveReader):Promise<AnimationSprites>{
 return decodedCache.load('native:default-deepseek',async()=>{
  const archive=await read(DEFAULT_CHARACTER_ID),entries=nativeSpriteEntries(new Uint8Array(await archive.arrayBuffer())),images:Record<string,HTMLImageElement>={}
  await Promise.all(NATIVE_SPRITES.map(async id=>{
   const data=entries[id+'.webp']!,url=URL.createObjectURL(new Blob([new Uint8Array(data)],{type:'image/webp'}))
   try{
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('原生角色图片无法加载'));image.src=url})
    if(image.naturalWidth>4096||image.naturalHeight>4096||!image.naturalWidth||!image.naturalHeight)throw new Error('原生角色图片尺寸无效')
    images[id]=image
   }finally{URL.revokeObjectURL(url)}
  }))
  const {walk,...poses}=images
  return actionSheets({...poses,'walk-left':walk!,'walk-right':walk!} as Record<Action,HTMLImageElement>)
 },value=>imageBytes(Object.values(value).map(sheet=>sheet.image)))
}
