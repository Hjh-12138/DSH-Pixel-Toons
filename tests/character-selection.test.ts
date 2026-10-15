import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DEFAULT_CHARACTER_ID} from '../src/character-names'
import {characterSelectionId,resolveCharacterSelection} from '../src/client/character-selection'
import {decodePreferences} from '../src/client/preferences'
import {WHALE_FORM_IDS} from '../src/client/whale-forms'
import type {LocalPack} from '../src/client/resource-pack'

const pixel={id:WHALE_FORM_IDS.pixel,manifest:{character:{}}} as LocalPack
const hd={id:WHALE_FORM_IDS.hd,manifest:{character:{}}} as LocalPack
const scene={id:'local-garden',manifest:{scene:{}}} as LocalPack
const packs=[pixel,hd,scene]

test('explicit Deep seek selection survives storage and resolves to the native sprite',()=>{
  const preferences=decodePreferences(JSON.stringify({characterPackId:DEFAULT_CHARACTER_ID,scenePackId:scene.id,compact:true}))
  const selected=resolveCharacterSelection(packs,preferences.characterPackId)
  assert.equal(preferences.characterPackId,DEFAULT_CHARACTER_ID)
  assert.equal(characterSelectionId(preferences.characterPackId),DEFAULT_CHARACTER_ID)
  assert.equal(selected.pack,undefined)
  assert.equal(selected.missing,false)
  assert.equal(preferences.scenePackId,scene.id)
  assert.equal(preferences.compact,true)
})

test('unset or reset character choices keep the pixel default and visible selection agrees',()=>{
  const preferences=decodePreferences(null)
  assert.equal(preferences.characterPackId,undefined)
  assert.equal(characterSelectionId(preferences.characterPackId),WHALE_FORM_IDS.pixel)
  const selected=resolveCharacterSelection(packs,preferences.characterPackId)
  assert.equal(selected.pack,pixel)
  assert.equal(selected.missing,false)
})

test('only removed character packs count as missing; native and other packs stay distinct',()=>{
  assert.equal(resolveCharacterSelection(packs,hd.id).pack,hd)
  assert.equal(resolveCharacterSelection(packs,'removed-character').missing,true)
  assert.equal(resolveCharacterSelection(packs,scene.id).missing,true)
  assert.equal(resolveCharacterSelection([],DEFAULT_CHARACTER_ID).missing,false)
  assert.equal(resolveCharacterSelection([],DEFAULT_CHARACTER_ID).pack,undefined)
})
