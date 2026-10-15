import {test} from 'node:test'
import assert from 'node:assert/strict'
import {characterOptions} from '../src/client/character-options'
import {WHALE_FORM_IDS} from '../src/client/whale-forms'
import type {LocalPack} from '../src/client/resource-pack'
const pack=(id:string,name:string)=>({id,manifest:{name,character:{}}}) as LocalPack
test('the whale is one selectable character with two forms and a stable default choice',()=>{
 const packs=[pack(WHALE_FORM_IDS.pixel,'像素'),pack(WHALE_FORM_IDS.hd,'高清'),pack('builtin-silver-music','Kimi')]
 for(const id of [undefined,WHALE_FORM_IDS.pixel,WHALE_FORM_IDS.hd]){
  const options=characterOptions(packs,id)
  assert.equal(options.length,3);assert.equal(options.filter(o=>o.whale).length,1)
  assert.equal(options[0]!.selected,true);assert.equal(options[0]!.choice,id??WHALE_FORM_IDS.pixel)
 }
 assert.equal(characterOptions(packs,'default-deepseek').find(o=>o.selected)!.name,'Deep seek')
})
