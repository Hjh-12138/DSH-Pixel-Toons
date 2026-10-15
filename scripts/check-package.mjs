import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unzipSync} from 'fflate';

const out='work/package-check';await mkdir(out,{recursive:true});
if(!process.env.npm_execpath)throw new Error('Run this check with npm run package:check');
const packed=spawnSync(process.execPath,[process.env.npm_execpath,'pack','--ignore-scripts','--json','--pack-destination',out],{encoding:'utf8',windowsHide:true});
if(packed.status!==0)throw new Error(packed.stderr||'npm pack failed');
const [info]=JSON.parse(packed.stdout),archive=await readFile(join(out,info.filename)),tar=gunzipSync(archive),entries=new Map();
const text=b=>b.toString('utf8').replace(/\0.*$/s,''),hash=b=>createHash('sha256').update(b).digest('hex');
for(let at=0;at+512<=tar.length;){
 const header=tar.subarray(at,at+512),name=text(header.subarray(0,100));if(!name)break;
 const prefix=text(header.subarray(345,500)),size=parseInt(text(header.subarray(124,136)).trim(),8)||0,type=text(header.subarray(156,157));
 if(type==='0'||type==='')entries.set((prefix?prefix+'/':'')+name,tar.subarray(at+512,at+512+size));at+=512+Math.ceil(size/512)*512;
}
for(const [name,data]of entries)assert.equal(hash(data),hash(await readFile(name.slice(8))),name);
assert.ok(![...entries.keys()].some(p=>/^package\/(design\/|assets\/(characters|animations)\/|examples\/character-packs\/walk-sources\/)/.test(p)),'source artwork must stay out of the runtime archive');
for(const id of ['silver-music','purple-star-cat','orange-flower','blue-fan','blonde-goth','black-beast','whale-dual-pixel','whale-dual-hd']){
 const path=`package/examples/character-packs/${id}.toons.zip`,bytes=entries.get(path);assert.ok(bytes,path);
 const files=unzipSync(bytes),manifest=JSON.parse(Buffer.from(files['manifest.json']).toString());
 assert.equal(manifest.id,id);for(const file of Object.values(manifest.character.atlases))assert.ok(files[file],file);
}
assert.ok(entries.has('package/assets/runtime/native-sprites.zip'));
assert.ok(archive.length<64*1024*1024,'install archive exceeds the 64 MiB budget');
const clientBytes=(await stat('lib/client.js')).size;assert.ok(clientBytes<512*1024,'client exceeds the 512 KiB budget');
const graph=await build({entryPoints:['src/client/index.tsx'],bundle:true,write:false,platform:'browser',format:'esm',external:['react','react/jsx-runtime','toons:worker-source'],loader:{'.png':'dataurl','.zip':'dataurl'},metafile:true});
const inputs=Object.keys(graph.metafile.inputs);
assert.ok(!inputs.some(p=>/assets\/animations\/|assets\/characters\/.*\.(png|webp)$|native-sprites\.zip|character-packs\/.*\.zip/.test(p.replaceAll('\\','/'))),'full character artwork was embedded into the production client');
const report={version:JSON.parse(entries.get('package/package.json')).version,verifiedFiles:entries.size,archiveBytes:archive.length,archiveSha256:hash(archive),clientBytes,characterArtworkLazy:true,sourceArtworkExcluded:true};
await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
