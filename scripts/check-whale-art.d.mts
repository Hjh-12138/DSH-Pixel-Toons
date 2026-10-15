import type {Buffer} from 'node:buffer';
import type {PackManifest} from '../src/client/resource-pack';

type Form='hd'|'pixel';
type ArtFrame={data:Buffer;width:number;height:number};
type Frames=Record<string,ArtFrame[]>;
type Identity={protectedRegions:Record<Form,Record<string,[number,number,number,number]>>;failedBodyFrames:number[];frameMs:number;cloneScale:number;reviewChecklist:string[]};
type Audit={
 packs:Record<Form,{manifest:PackManifest;frames:Frames}>;
 identity:Identity;
 report:{actionsPerForm:number;frames:number;sourceLayersVerified:number;[key:string]:unknown};
};
export function inspectWhaleArt():Promise<Audit>;
export function verifySharedFrame(form:Form,id:string,index:number,frames:Frames,identity:Identity):void;
export function verifyPixelWalkingFeet(frame:ArtFrame):void;
export function writeReview(result:Audit,out?:string):Promise<string>;
