import {createRoot} from 'react-dom/client'
import {useMemo,useState} from 'react'
import {Strip,type Rpc} from './client/Strip'
import {zh,type ToonsKey} from './client/locales'
import {activityFrom,type ActivityEvent} from './activity'
import {sceneFromPlan,parseScenePlan} from './scene-plan'
import {previewBuiltinArchive} from './preview-pack-assets'
import {DEFAULT_CHARACTER_ID} from './character-names'
const t=(key:ToonsKey)=>zh[key]
const tools=[['idle','待机',''],['thinking','思考',''],['reading','阅读','read'],['editing','敲键盘','edit'],['walk-left','向左走',''],['walk-right','向右走',''],['searching','搜索','grep'],['testing','测试','bash'],['building','构建','bash'],['git','Git','bash'],['web','资料检索','web'],['agents','协作','subagent'],['success','任务完成',''],['failed','遇到问题','read']] as const
function Preview(){
  const [phase,setPhase]=useState(()=>{const action=new URLSearchParams(location.search).get('action');return tools.some(t=>t[0]===action)?action!:'reading'}),[running,setRunning]=useState(true),[revision,setRevision]=useState(1)
  const events=useMemo(()=>{
    if(phase==='idle')return []
    const name=tools.find(x=>x[0]===phase)?.[2]||'read'
    const command=phase==='testing'?'npm test':phase==='building'?'npm run build':phase==='git'?'git status':''
    const list:ActivityEvent[]=[{type:'turn/start',seq:0,data:{turn:revision}}]
    if(phase!=='thinking'&&!phase.startsWith('walk-'))list.push({type:'tool/call',seq:1,data:{name,arguments:JSON.stringify({file_path:'README.md',command})}})
    if(phase==='failed')list.push({type:'tool/result',seq:2,data:{message:{isError:true}}})
    if(phase==='success')list.push({type:'turn/end',seq:2,data:{reason:{kind:'completed'}}})
    return list
  },[phase,revision])
  const call=useMemo<Rpc>(()=>async(endpoint,payload)=>{
    if(endpoint==='toons/config')return {ok:true,value:{enabled:true,fps:20,intervalMs:60000}}
    if(endpoint==='toons/cancel')return {ok:true,value:{status:'canceled'}}
    if(endpoint==='toons/builtin-pack'){
      try{return {ok:true,value:previewBuiltinArchive((payload as {id?:unknown})?.id)}}
      catch{return {ok:false,error:{message:'Builtin character unavailable'}}}
    }
    const activity=activityFrom(events,true),action=activity.phase==='reading'?'read':activity.phase==='editing'?'type':activity.phase==='testing'?'check':'think'
    const plan=parseScenePlan({concept:'离线导演编排预览',theme:action==='read'?'library':'workshop',mood:revision%2?'day':'dusk',action,props:[{kind:'rice-bowl',slot:'left'},{kind:action==='read'?'book':'terminal',slot:'right'}],effects:action==='read'?['fireflies']:['steam','scan'],say:'离线预览：饭碗先替本鲸保管。'})
    return {ok:true,value:{status:'ready',scene:sceneFromPlan(plan,activity.phase)}}
  },[events,revision])
  return <main><header><div className="eyebrow">DSH TOOL / 角色与动作预览</div><h1>让等待，有一点陪伴。</h1><p>鲸鱼娘可手动切换高清与像素形态。在「本地资源」里选择角色，切换下方动作进行预览。</p></header>
    <div className="demo-actions">{tools.map(([id,label])=><button key={id} aria-pressed={phase===id} onClick={()=>{setPhase(id);setRevision(x=>x+1)}}>{label}</button>)}<button onClick={()=>setRunning(x=>!x)}>{running?'暂停播放':'继续播放'}</button></div>
    <Strip stationaryPreview={!phase.startsWith('walk-')} pausedPreview={!running} sessionId="preview" running={phase!=='success'&&phase!=='idle'} events={events} call={call} t={t} walkPreview={phase==='walk-left'?-1:phase==='walk-right'?1:undefined}/>
    <footer>离线动作预览；动态混合使用模拟导演编排，展示精细背景、道具、特效和气泡，不调用模型。插件实际安装后读取 Harness 会话事件。</footer>
  </main>
}
const params=new URLSearchParams(location.search),form=params.get('form'),character=params.get('character')
const selected=character===DEFAULT_CHARACTER_ID?DEFAULT_CHARACTER_ID:form==='hd'||form==='pixel'?'builtin-whale-dual-'+form:undefined
if(selected)try{const previous=JSON.parse(localStorage.getItem('dsh-toons:v1')||'{}');localStorage.setItem('dsh-toons:v1',JSON.stringify({...previous,characterPackId:selected}))}catch{/* Preview can run with storage disabled. */}
createRoot(document.getElementById('root')!).render(<Preview/> )
