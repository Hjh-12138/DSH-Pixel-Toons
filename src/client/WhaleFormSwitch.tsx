import {whaleForm,WHALE_FORM_IDS,type WhaleForm} from './whale-forms'

export function WhaleFormSwitch({id,busy,onChange}:{id?:string;busy:boolean;onChange:(id:string)=>void}){
  const selected=whaleForm(id)
  if(!selected)return null
  return <div className="toons-form-switch" role="group" aria-label="鲸鱼娘形态">
    <span>鲸鱼娘</span>{(['pixel','hd'] as WhaleForm[]).map(form=><button key={form} aria-pressed={selected===form} disabled={busy} onClick={()=>onChange(WHALE_FORM_IDS[form])}>{form==='hd'?'高清':'像素'}</button>)}
  </div>
}
