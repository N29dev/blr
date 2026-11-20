import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import data from './announcement-data.mjs';
import {projectAnnouncements} from './announcement-projector.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const roster=kind=>readdirSync(resolve(root,kind),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name);
for(const [key,value] of Object.entries(projectAnnouncements(data,roster('styles'),roster('flows')))){
 const path=resolve(root,'wiki/records/'+key+'.json'),content=JSON.stringify(value)+'\n';
 if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==content)throw Error('Regenerate '+path);}
 else {mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content);}
}
