import {readFile} from 'node:fs/promises'
import {BUILTIN_CHARACTER_NAMES} from './character-names'

const packIds=[...Object.keys(BUILTIN_CHARACTER_NAMES),'whale-dual-pixel','whale-dual-hd']
const files=new Map(packIds.map(id=>[`builtin-${id}`,new URL(`../examples/character-packs/${id}.toons.zip`,import.meta.url)]))
/** Fixed local package files only; callers cannot supply a path or URL. */
export async function readBuiltinPackArchive(id:unknown):Promise<{id:string;archive:string}>{
  if(typeof id!=='string'||!files.has(id))throw new Error('Builtin character unavailable')
  const bytes=await readFile(files.get(id)!)
  if(!bytes.length||bytes.length>20*1024*1024)throw new Error('Builtin character unavailable')
  return {id,archive:bytes.toString('base64')}
}
