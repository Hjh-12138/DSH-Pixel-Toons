export type WhaleForm='pixel'|'hd'
export const WHALE_FORM_IDS={pixel:'builtin-whale-dual-pixel',hd:'builtin-whale-dual-hd'} as const
export function whaleForm(id:string|undefined):WhaleForm|undefined{
  if(id===WHALE_FORM_IDS.hd||id==='whale-dual-hd')return 'hd'
  if(!id||id===WHALE_FORM_IDS.pixel||id==='whale-dual-pixel'||id==='whale-framework-scifi-v2')return 'pixel'
  return undefined
}
