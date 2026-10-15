import {useRef} from 'react'
import type {Preferences} from './preferences'
import type {useResourcePacks} from './use-resource-packs'
import exampleUrl from '../../examples/mint-robot.toons.zip'
import {isBuiltinPack} from './builtin-packs'
import {characterSelectionId} from './character-selection'
import {characterOptions} from './character-options'
import {WHALE_FORM_IDS} from './whale-forms'
import thumbnails from '../../assets/runtime/thumbnails.json'

type Props={library:ReturnType<typeof useResourcePacks>;prefs:Preferences}
export function ResourcePanel({library,prefs}:Props){
  const input=useRef<HTMLInputElement>(null)
  const cards=characterOptions(library.packs,prefs.characterPackId)
  const imported=library.packs.filter(pack=>!isBuiltinPack(pack.id))
  return <div className="toons-resources" aria-label="本地资源管理" aria-busy={library.busy}>
    <div className="toons-resource-heading"><div><strong>我的角色与场景</strong><p>鲸鱼娘支持高清与像素两种形态，也可选择其他内置角色或导入素材。全部支持离线使用。</p></div>
      <div className="toons-resource-actions"><button disabled={library.busy} onClick={()=>input.current?.click()} className="toons-import">{library.busy?'正在加载…':'导入资源包'}</button><button disabled={library.busy} onClick={()=>void library.tryExample()}>试用示例</button></div>
    </div>
    <input ref={input} type="file" accept=".zip,.json,.toons" hidden aria-label="选择本地资源包" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void library.importFile(file)}}/>
    <div className="toons-character-grid" role="group" aria-label="选择角色">{cards.map(card=>{
      const portrait=(thumbnails as Record<string,string>)[card.choice]
      return <div key={card.key} className={`toons-character-card${card.selected?' is-selected':''}`}>
        <button className="toons-character-choice" aria-label={`选择角色 ${card.name}`} aria-pressed={card.selected} disabled={library.busy||!library.loaded} onClick={()=>library.chooseCharacter(card.choice)}>
          {portrait?<img src={portrait} alt="" width="64" height="64"/>:<span className="toons-character-placeholder" aria-hidden="true">{card.name.slice(0,2)}</span>}
          <strong>{card.name}</strong><span>{card.description}</span>
        </button>
        {card.whale?<div className="toons-card-forms" role="group" aria-label="鲸鱼娘形态选择">{(['pixel','hd'] as const).map(form=><button key={form} disabled={library.busy||!library.loaded} aria-label={`鲸鱼娘切换到${form==='hd'?'高清':'像素'}`} aria-pressed={card.selected&&card.choice===WHALE_FORM_IDS[form]} onClick={()=>library.chooseCharacter(WHALE_FORM_IDS[form])}>{form==='hd'?'高清':'像素'}</button>)}</div>:<span className="toons-character-state">{card.selected?'已选中':' '}</span>}
      </div>
    })}</div>
    <div className="toons-resource-selects">
      <label>场景<select aria-label="本地场景" value={prefs.scenePackId??''} disabled={library.busy||!library.loaded} onChange={e=>library.chooseScene(e.target.value)}><option value="">内置预制主题</option>{library.packs.filter(p=>p.manifest.scene).map(p=><option key={p.id} value={p.id}>{p.manifest.name}</option>)}</select></label>
      <button disabled={library.busy} onClick={library.reset}>恢复初始设置</button>
    </div>
    {library.error&&<p className="toons-resource-error" role="alert">{library.error}</p>}
    {library.message&&!library.error&&<p className="toons-resource-message" role="status">{library.message}</p>}
    {library.loaded&&library.packs.length===0&&<p className="toons-resource-empty">还没有本地资源。先试用示例，或导入自己的 ZIP / JSON 资源包。</p>}
    {imported.length>0&&<ul className="toons-resource-list" aria-label="导入资源">{imported.map(pack=>{
      const m=pack.manifest,selected=(!m.character||characterSelectionId(prefs.characterPackId)===pack.id)&&(!m.scene||prefs.scenePackId===pack.id)
      return <li key={pack.id}><span className="toons-resource-mark" aria-hidden="true">{m.character&&m.scene?'套':m.character?'人':'景'}</span><div className="toons-resource-info"><strong>{m.name}</strong><span>{isBuiltinPack(pack.id)?'内置角色':m.character&&m.scene?'角色 + 场景':m.character?'角色包':'场景包'}{m.author?` · ${m.author}`:''}</span>{m.description&&<p>{m.description}</p>}</div><button disabled={library.busy||selected} onClick={()=>library.apply(pack)}>{selected?'已应用':m.character&&m.scene?'应用整套':'应用'}</button>{!isBuiltinPack(pack.id)&&<button className="toons-resource-delete" disabled={library.busy} aria-label={`删除资源包 ${m.name}`} onClick={()=>void library.remove(pack)}>删除</button>}</li>
    })}</ul>}
    <details className="toons-resource-help"><summary>资源包格式</summary><p>ZIP 根目录放 manifest.json 和 PNG / WebP 图片。角色至少提供待机动作，其他动作可选；场景支持背景、透明前景和人物站位。JSON 包需要内嵌图片。同 ID 的有效资源包会更新已有版本。</p><p>单包最多 20 MB。<a href={exampleUrl} download="mint-robot.toons.zip">下载示例模板</a>，解压后替换图片并修改配置即可制作自己的资源包。</p></details>
  </div>
}
