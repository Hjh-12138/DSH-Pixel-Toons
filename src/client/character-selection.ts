import {DEFAULT_CHARACTER_ID} from '../character-names'
import {WHALE_FORM_IDS} from './whale-forms'
import type {LocalPack} from './resource-pack'

/** An explicit native selection must survive the fallback for an unset choice. */
export function characterSelectionId(savedId:string|undefined):string {
  return savedId??WHALE_FORM_IDS.pixel
}
export function resolveCharacterSelection(packs:readonly LocalPack[],savedId:string|undefined){
  const id=characterSelectionId(savedId)
  const native=id===DEFAULT_CHARACTER_ID
  const pack=native?undefined:packs.find(p=>p.id===id&&p.manifest.character)
  return {id,pack,missing:!!savedId&&!native&&!pack}
}
