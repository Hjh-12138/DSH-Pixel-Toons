import type {LocalPack} from './resource-pack'
import {DEFAULT_CHARACTER_ID} from '../character-names'
import {characterSelectionId} from './character-selection'
import {WHALE_FORM_IDS,whaleForm} from './whale-forms'

export type CharacterOption={key:string;name:string;description:string;choice:string;selected:boolean;whale?:boolean}
export function characterOptions(packs:LocalPack[],saved?:string):CharacterOption[]{
 const selected=characterSelectionId(saved),form=whaleForm(selected)
 const options:CharacterOption[]=[
  {key:'whale',name:'鲸鱼娘',description:'红眼 · 鲸尾与悬浮机器人',choice:form?selected:WHALE_FORM_IDS.pixel,selected:!!form,whale:true},
  {key:DEFAULT_CHARACTER_ID,name:'Deep seek',description:'蓝眼 · 蓝白女仆装',choice:DEFAULT_CHARACTER_ID,selected:selected===DEFAULT_CHARACTER_ID},
 ]
 for(const p of packs)if(p.manifest.character&&!whaleForm(p.id))options.push({key:p.id,name:p.manifest.name,description:p.manifest.author?`作者：${p.manifest.author}`:p.id.startsWith('builtin-')?'内置角色':'导入角色',choice:p.id,selected:p.id===selected})
 return options
}
