import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {repo,actions} from './whale-art.mjs';
import {inspectWhaleArt,writeReview} from './check-whale-art.mjs';

const result=await inspectWhaleArt();await writeReview(result);
const root=join(repo,'work/character-review'),port=Number(process.env.TOONS_REVIEW_PORT||3096);
const allowed=new Set(['index.html','overview.png','validation.json',...['idle','check','build','git','agents'].map(id=>id+'-pixel-sheet.png')]);
for(const id of actions)for(const form of ['hd','pixel'])for(let i=0;i<8;i++)allowed.add(`frames/${id}-${form}-${i}.png`);
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!allowed.has(path)){res.writeHead(404);res.end();return;}
  const data=await readFile(join(root,path));res.writeHead(200,{'Content-Type':path.endsWith('.png')?'image/png':path.endsWith('.json')?'application/json':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(500);res.end('Review file unavailable');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Whale character review: http://127.0.0.1:${port}/`));
