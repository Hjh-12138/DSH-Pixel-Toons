// Preview only. The production client gets the selected ZIP from the local Host.
import silverUrl from '../examples/character-packs/silver-music.toons.zip'
import nativeUrl from '../assets/runtime/native-sprites.zip'
import purpleUrl from '../examples/character-packs/purple-star-cat.toons.zip'
import orangeUrl from '../examples/character-packs/orange-flower.toons.zip'
import blueUrl from '../examples/character-packs/blue-fan.toons.zip'
import blondeUrl from '../examples/character-packs/blonde-goth.toons.zip'
import blackUrl from '../examples/character-packs/black-beast.toons.zip'
import whalePixelUrl from '../examples/character-packs/whale-dual-pixel.toons.zip'
import whaleHdUrl from '../examples/character-packs/whale-dual-hd.toons.zip'
const archives=new Map([
  ['default-deepseek',nativeUrl],
  ['builtin-silver-music',silverUrl],['builtin-purple-star-cat',purpleUrl],['builtin-orange-flower',orangeUrl],
  ['builtin-blue-fan',blueUrl],['builtin-blonde-goth',blondeUrl],['builtin-black-beast',blackUrl],
  ['builtin-whale-dual-pixel',whalePixelUrl],['builtin-whale-dual-hd',whaleHdUrl],
])
export function previewBuiltinArchive(id:unknown){
  if(typeof id!=='string'||!archives.has(id))throw new Error('Builtin character unavailable')
  return {id,archive:archives.get(id)!.split(',')[1]!}
}
