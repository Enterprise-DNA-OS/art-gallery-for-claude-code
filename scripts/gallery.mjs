#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';

export const reads={
  artworks:'select * from inventory order by stock',
  stocktake:'select stock,title,artist,status,location,condition_date from inventory order by location,stock',
  artists:'select id,name,country,biography from artists order by name',
  contacts:'select id,external_id,name,email,interests,marketing_consent,last_contact from contacts order by name',
  consignments:'select * from consignment_due order by days_left,stock',
  settlements:'select * from settlements order by artist,currency,ref',
  sales:'select * from settlements order by sold_on desc,ref',
  offers:'select * from collector_followups order by followup_on,collector',
  followups:'select * from collector_followups where days_overdue>=0 order by days_overdue desc,collector',
  exhibitions:`select e.id,e.name,e.venue,e.opens_on,e.closes_on,count(x.id)::int as works from exhibitions e left join exhibition_artworks x on x.exhibition_id=e.id group by e.id order by e.opens_on`,
  movements:'select m.id,w.external_id as stock,w.title,m.moved_on,m.from_location,m.to_location,m.note from movements m join artworks w on w.id=m.artwork_id order by m.created_at desc',
  attention:'select * from attention order by kind,reference',
  royalties:'select * from royalty_checks order by sold_on,ref',
};
export const questions=[
 ['Which expiring consignments have an overdue collector follow-up?',`select c.stock,c.title,c.days_left,f.collector,f.days_overdue from consignment_due c join artworks w on w.external_id=c.stock join collector_followups f on f.artwork_id=w.id where c.days_left<=14 and f.days_overdue>0 order by c.stock`],
 ['How much is ready for each artist, and how much are collectors still paying?',`select artist,currency,sum(artist_balance_cents) filter(where settlement_status='ready') as ready_cents,sum(collector_balance_cents) as collector_balance_cents from settlements group by artist,currency order by artist,currency`],
 ['Which works on exhibition have an old or missing condition check?',`select e.name as exhibition,i.stock,i.title,i.condition_date from exhibition_artworks x join exhibitions e on e.id=x.exhibition_id join inventory i on i.id=x.artwork_id where e.closes_on>=current_date and (i.condition_date is null or i.condition_date<current_date-90) order by i.stock`],
 ['Which unsold works are missing the consignment agreement reference?',`select stock,title,consignor,days_left from consignment_due where agreement_ref='' order by stock`],
 ['Which available works have not had a collector offer in the last month?',`select i.stock,i.title,i.artist from inventory i where status='available' and not exists(select 1 from offers o where o.artwork_id=i.id and o.offered_on>=current_date-30) order by stock`],
 ['Which Australian resales still need reporting review?',`select ref,title,currency,total_cents,review from royalty_checks where market='AU' and royalty_status='unreviewed' order by ref`],
 ['Which collectors need follow-up but have no marketing permission?',`select collector,title,followup_on from collector_followups where days_overdue>=0 and not marketing_consent order by collector,title`],
 ['Which artists have the most unsold value at each location?',`select artist,location,currency,count(*)::int as works,sum(price_cents) as value_cents from inventory where status in ('available','reserved') group by artist,location,currency order by value_cents desc,artist`],
 ['Which reserved works have an overdue viewing follow-up?',`select collector,title,followup_on,days_overdue from collector_followups where status='reserved' and days_overdue>0 order by days_overdue desc`],
 ['What collector balances and artist liabilities remain by currency?',`select currency,sum(collector_balance_cents) as collector_balance_cents,sum(artist_balance_cents) as artist_balance_cents from settlements group by currency order by currency`],
];
const specs={
 artist:{table:'artists',fields:['name','country','biography'],required:['name']},
 contact:{table:'contacts',fields:['external_id','name','email','interests','marketing_consent','last_contact','notes'],required:['name']},
 artwork:{table:'artworks',fields:['external_id','title','artist_id','medium','dimensions','year','currency','price_cents','location','provenance','image_files'],required:['external_id','title','artist_id']},
 consignment:{table:'consignments',fields:['artwork_id','consignor','starts_on','ends_on','commission_pct','agreement_ref'],required:['artwork_id','consignor','starts_on','ends_on','commission_pct','agreement_ref']},
 exhibition:{table:'exhibitions',fields:['name','opens_on','closes_on','venue'],required:['name','opens_on','closes_on','venue']},
};
const names={artists:'name',contacts:'name',artworks:'title',sales:'ref',exhibitions:'name'};
const allTables=['artists','contacts','artworks','consignments','sales','offers','exhibitions','exhibition_artworks','movements','notes'];
const today=()=>new Date().toISOString().slice(0,10);
function options(args){const pos=[],flags={};for(const x of args){if(x.startsWith('--')){const i=x.indexOf('=');flags[x.slice(2,i<0?undefined:i)]=i<0?true:x.slice(i+1);}else pos.push(x);}return {pos,flags};}
function required(v,name){if(typeof v!=='string'||!v.trim())throw Error(`${name} is required`);return v.trim();}
function cents(v,name='amount'){if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||Number(v)<=0)throw Error(`${name} must be a positive integer in cents`);return Number(v);}
function date(v,name){required(v,name);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`${name} must be YYYY-MM-DD`);return v;}
export async function resolve(db,table,term){
 required(term,table);const col=names[table];if(!col)throw Error('Unsupported record type');
 const extra=table==='artworks'?' or lower(external_id)=lower($1)':'';
 let rows=await db.query(`select * from ${table} where id::text=$1 or lower(${col})=lower($1)${extra} order by id`,[term]);
 if(!rows.length)rows=await db.query(`select * from ${table} where starts_with(id::text,lower($1)) or strpos(lower(${col}),lower($1))>0 order by ${col},id`,[term]);
 if(rows.length!==1)throw Error(`${rows.length?'Ambiguous':'No match'} ${table}: ${term}. Candidates: ${rows.map(r=>`${r.id} ${r[col]}`).join('; ')||'none'}`);
 return rows[0];
}
async function transaction(db,fn){await db.exec('BEGIN');try{const out=await fn();await db.exec('COMMIT');return out;}catch(e){await db.exec('ROLLBACK');throw e;}}
export async function compliance(db){
 const findings=[];
 for(const r of await db.query("select * from consignment_due where agreement_ref='' or days_left<0"))findings.push({rule:'CONSIGNMENT',record:r.stock,reason:r.agreement_ref?'Agreed sale period expired':'Written agreement reference missing',source:'https://code.visualarts.net.au/selling-and-marketing/commercial-galleries-and-representation/summary-of-good-practice-recommendations',basis:'Good practice and recorded contract dates'});
 for(const r of await db.query("select * from royalty_checks where royalty_status='unreviewed'"))findings.push({rule:r.market==='AU'?'AU-RESALE':'JURISDICTION-REVIEW',record:r.ref,reason:r.review,source:r.market==='AU'?'https://www.arts.gov.au/funding-and-support/resale-royalty-scheme':'https://www.mch.govt.nz/our-work/arts-sector/artist-resale-royalty-scheme',basis:'Review required, eligibility is not determined by this software'});
 return findings;
}
export async function importArtlogic(db,flags){
 if(!flags.artworks&&!flags.contacts)throw Error('Provide --artworks=file.csv and/or --contacts=file.csv');
 const rows={};for(const type of ['artworks','contacts'])if(flags[type])rows[type]=parseCsv(fs.readFileSync(path.resolve(flags[type]),'utf8'));
 const seen={artworks:new Set(),contacts:new Set()},normal={artworks:[],contacts:[]};
 for(const [type,items] of Object.entries(rows))for(const [i,r] of items.entries()){
  const id=required(pick(r,...(type==='artworks'?['Stock number','Stock no','Stock Number','Artwork ID','ID']:['Contact ID','ID'])) ,`${type} row ${i+2} stable ID`);
  if(seen[type].has(id))throw Error(`${type} row ${i+2}: duplicate ID ${id}`);seen[type].add(id);
  if(type==='contacts')normal.contacts.push({id,name:required(pick(r,'Name','Full name')||[pick(r,'First name'),pick(r,'Last name')].filter(Boolean).join(' '),`contacts row ${i+2} name`),email:pick(r,'Email','Email address'),raw:r});
  else {
   const amount=pick(r,'Retail price','Price','Selling price').replace(/,/g,'');
   if(amount&&!/^\d+(\.\d{1,2})?$/.test(amount))throw Error(`artworks row ${i+2}: price must be a decimal without currency symbols`);
   const value=amount?Math.round(Number(amount)*100):0;if(!Number.isSafeInteger(value))throw Error('Price exceeds safe integer range');
   const currency=pick(r,'Currency','Price currency');if(!/^[A-Z]{3}$/.test(currency))throw Error(`artworks row ${i+2}: explicit ISO Currency required`);
   const rawStatus=pick(r,'Status','Availability').toLowerCase()||'available';
   const status=({'available':'available','for sale':'available','reserved':'reserved','on reserve':'reserved','sold':'sold','returned':'returned','not for sale':'reserved'})[rawStatus];if(!status)throw Error(`artworks row ${i+2}: unmapped status ${rawStatus}`);
   normal.artworks.push({id,title:required(pick(r,'Title','Artwork title'),`artworks row ${i+2} title`),artist:required(pick(r,'Artist','Artist name'),`artworks row ${i+2} artist`),medium:pick(r,'Medium'),dimensions:pick(r,'Dimensions'),year:pick(r,'Year','Date'),currency,value,status,location:pick(r,'Location')||'Unverified',provenance:pick(r,'Provenance'),images:pick(r,'Images','Image filenames'),raw:r});
  }
 }
 const summary={artworks:normal.artworks.length,contacts:normal.contacts.length,dry_run:!!flags['dry-run'],notes:'Artwork/contact records only. Financial history, agreements, offers and image binaries require separate reconciliation. Existing local status and location are preserved on reimport.'};
 if(flags['dry-run'])return summary;
 return transaction(db,async()=>{
  for(const r of normal.contacts)await db.query(`insert into contacts(external_id,name,email) values($1,$2,$3) on conflict(external_id) do update set name=excluded.name,email=excluded.email`,[r.id,r.name,r.email]);
  for(const r of normal.artworks){
   let a=await db.query('select id from artists where lower(name)=lower($1)',[r.artist]);if(a.length>1)throw Error(`Ambiguous artist ${r.artist}`);
   if(!a.length)a=await db.query("insert into artists(name,country) values($1,'Unknown') returning id",[r.artist]);
   await db.query(`insert into artworks(external_id,title,artist_id,medium,dimensions,year,currency,price_cents,status,location,provenance,image_files,raw_import) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
   on conflict(external_id) do update set title=excluded.title,artist_id=excluded.artist_id,medium=excluded.medium,dimensions=excluded.dimensions,year=excluded.year,currency=excluded.currency,price_cents=excluded.price_cents,provenance=excluded.provenance,image_files=excluded.image_files,raw_import=excluded.raw_import`,[r.id,r.title,a[0].id,r.medium,r.dimensions,r.year,r.currency,r.value,r.status,r.location,r.provenance,r.images,JSON.stringify(r.raw)]);
  }return summary;
 });
}
export async function execute(db,args){
 const {pos,flags:f}=options(args),[cmd,arg]=pos;
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='compliance')return compliance(db);
 if(cmd==='questions'){
  const selected=f.question?[[questions[Number(f.question)-1],Number(f.question)]]:questions.map((q,i)=>[q,i+1]);
  if(selected.some(([q])=>!q))throw Error('--question must be 1 to 10');
  const out=[];for(const [[ask,sql],number] of selected)out.push({number,ask,rows:await db.query(sql)});return out;
 }
 if(cmd==='artist'||cmd==='artwork'||cmd==='contact'){
  const t={artist:'artists',artwork:'artworks',contact:'contacts'}[cmd],record=await resolve(db,t,arg);
  if(cmd==='artist')return {record,works:await db.query('select * from inventory where artist=$1 order by stock',[record.name]),settlements:await db.query('select * from settlements where artist=$1 order by ref',[record.name])};
  if(cmd==='contact')return {record,notes:await db.query('select noted_on,body from notes where contact_id=$1 order by created_at desc',[record.id]),offers:await db.query('select * from offers where contact_id=$1',[record.id])};
  return {record,consignment:await db.query('select * from consignments where artwork_id=$1',[record.id]),movements:await db.query('select * from movements where artwork_id=$1 order by created_at',[record.id])};
 }
 if(cmd==='add'){
  const s=specs[arg];if(!s)throw Error('add artist|contact|artwork|consignment|exhibition --field=value');
  const data={};for(const k of s.fields)if(f[k]!==undefined)data[k]=f[k];for(const k of s.required)required(data[k],k);
  for(const k of Object.keys(data)){if(k.endsWith('_on')||k==='last_contact')date(data[k],k);if(k==='marketing_consent'&&!['true','false'].includes(data[k]))throw Error('marketing_consent must be true or false');}
  if(data.artist_id)data.artist_id=(await resolve(db,'artists',data.artist_id)).id;
  if(data.artwork_id)data.artwork_id=(await resolve(db,'artworks',data.artwork_id)).id;
  const cols=Object.keys(data);return db.query(`insert into ${s.table}(${cols.join(',')}) values(${cols.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data));
 }
 if(cmd==='offer'){
  const w=await resolve(db,'artworks',arg),c=await resolve(db,'contacts',f.collector);if(!['available','reserved'].includes(w.status))throw Error('Artwork is not available');
  return db.query('insert into offers(artwork_id,contact_id,followup_on,notes) values($1,$2,$3,$4) returning *',[w.id,c.id,date(f.followup,'followup'),f.note||'']);
 }
 if(cmd==='sale')return transaction(db,async()=>{
  const w=await resolve(db,'artworks',arg);await db.query('select id from artworks where id=$1 for update',[w.id]);
  const [fresh]=await db.query('select * from artworks where id=$1',[w.id]);if(!['available','reserved'].includes(fresh.status))throw Error('Artwork is not available');
  const c=await resolve(db,'contacts',f.collector),[agreement]=await db.query('select * from consignments where artwork_id=$1',[w.id]);
  const sold=date(f.date||today(),'date');
  if(!agreement||!agreement.agreement_ref||agreement.returned_on||String(agreement.starts_on)>sold||String(agreement.ends_on)<sold)throw Error('A written, current consignment agreement is required');
  const total=cents(f.cents),share=Math.round(total*(100-Number(agreement.commission_pct))/100);
  if(f.resale!==undefined&&!['true','false'].includes(f.resale))throw Error('resale must be true or false');
  const result=await db.query('insert into sales(ref,artwork_id,contact_id,sold_on,due_on,currency,total_cents,artist_due_cents,market,resale) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *',[required(f.ref,'ref'),w.id,c.id,sold,date(f.due,'due'),w.currency,total,share,required(f.market,'market'),f.resale==='true']);
  await db.query("update artworks set status='sold' where id=$1",[w.id]);await db.query("update offers set state=case when contact_id=$2 then 'won' else 'lost' end where artwork_id=$1 and state='open'",[w.id,c.id]);return result;
 });
 if(cmd==='receive'||cmd==='settle')return transaction(db,async()=>{
  const s=await resolve(db,'sales',arg),amount=cents(f.cents);await db.query('select id from sales where id=$1 for update',[s.id]);
  const [fresh]=await db.query('select * from sales where id=$1',[s.id]);
  if(cmd==='settle'&&Number(fresh.paid_cents)!==Number(fresh.total_cents))throw Error('Collector balance must be paid before recording settlement (house rule)');
  const column=cmd==='receive'?'paid_cents':'artist_paid_cents';return db.query(`update sales set ${column}=${column}+$1 where id=$2 returning *`,[amount,s.id]);
 });
 if(cmd==='move')return transaction(db,async()=>{
  const w=await resolve(db,'artworks',arg);await db.query('select id from artworks where id=$1 for update',[w.id]);const [fresh]=await db.query('select location from artworks where id=$1',[w.id]);
  const to=required(f.to,'to');await db.query('insert into movements(artwork_id,from_location,to_location,note) values($1,$2,$3,$4)',[w.id,fresh.location,to,f.note||'']);return db.query('update artworks set location=$1 where id=$2 returning id,title,location',[to,w.id]);
 });
 if(cmd==='condition'){const w=await resolve(db,'artworks',arg);return db.query('update artworks set condition_date=$1,condition_note=$2 where id=$3 returning id,title,condition_date,condition_note',[date(f.date||today(),'date'),required(f.note,'note'),w.id]);}
 if(cmd==='log')return transaction(db,async()=>{const c=await resolve(db,'contacts',arg);const result=await db.query('insert into notes(contact_id,body) values($1,$2) returning *',[c.id,required(f.note,'note')]);await db.query('update contacts set last_contact=current_date where id=$1',[c.id]);return result;});
 if(cmd==='hang'){const e=await resolve(db,'exhibitions',arg),w=await resolve(db,'artworks',f.artwork);return db.query('insert into exhibition_artworks(exhibition_id,artwork_id) values($1,$2) on conflict do nothing returning *',[e.id,w.id]);}
 if(cmd==='royalty-review'){const s=await resolve(db,'sales',arg);if(!s.resale)throw Error('Not a resale');if(!['reported','not-applicable'].includes(f.status))throw Error('status must be reported or not-applicable');return db.query('update sales set royalty_status=$1,royalty_evidence=$2 where id=$3 returning ref,royalty_status,royalty_evidence',[f.status,required(f.evidence,'evidence'),s.id]);}
 if(cmd==='import'){if(arg!=='artlogic')throw Error('Supported import: artlogic');return importArtlogic(db,f);}
 if(cmd==='export'){
  const out={format:'gallery-export-v1',exported_at:new Date().toISOString(),records:{}};
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of allTables)out.records[t]=await db.query(`select * from ${t} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  if(f.out){fs.writeFileSync(path.resolve(f.out),JSON.stringify(out,null,2)+'\n',{flag:'wx'});return {file:path.resolve(f.out),counts:Object.fromEntries(Object.entries(out.records).map(([k,v])=>[k,v.length]))};}return out;
 }
 if(cmd==='draft-followups'){
  const rows=await db.query(`select c.name,c.email,w.title,o.followup_on from offers o join contacts c on c.id=o.contact_id join artworks w on w.id=o.artwork_id where o.state='open' and o.followup_on<=current_date and c.marketing_consent order by c.name,w.title`);
  const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`collector-followups-${Date.now()}.md`);
  fs.writeFileSync(file,'# Drafts for human review\n\n'+rows.map(r=>`To: ${r.name} <${r.email}>\nSubject: Your interest in ${r.title}\n\nHello ${r.name},\nYou asked about ${r.title}. Would you like us to arrange a viewing?\n\n`).join('\n'));return {file,drafts:rows.length,sent:false};
 }
 throw Error(`Unknown command ${cmd||''}. Use --help`);
}
export function format(value){
 if(!Array.isArray(value))return JSON.stringify(value,null,2);
 if(!value.length)return 'Nothing here.';
 if(value.some(r=>r.rows))return value.map(r=>`${r.number}. ${r.ask}\n${format(r.rows)}`).join('\n\n');
 const cols=Object.keys(value[0]).filter(k=>!['id','created_at','updated_at'].includes(k)&&!k.endsWith('_id'));
 const cell=(v,k,r)=>v==null?'':k.endsWith('_cents')?`${r.currency||''} ${(Number(v)/100).toFixed(2)}`.trim():typeof v==='object'?JSON.stringify(v):String(v).replace(/\n/g,' ');
 const matrix=[cols.map(k=>k.replace(/_cents$/,'').replaceAll('_',' ')),...value.map(r=>cols.map(k=>cell(r[k],k,r)))];
 const widths=cols.map((_,i)=>Math.min(64,Math.max(...matrix.map(r=>r[i].length))));
 const line=r=>r.map((v,i)=>v.slice(0,widths[i]).padEnd(widths[i])).join('  ').trimEnd();
 return [line(matrix[0]),widths.map(w=>'-'.repeat(w)).join('  '),...matrix.slice(1).map(line)].join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(!args.length||args.includes('--help')){console.log(`Art Gallery for Claude Code\nRead: ${Object.keys(reads).join(', ')}, artist <name>, artwork <stock>, contact <name>, compliance, questions [--question=1..10]\nWrite: add artist|contact|artwork|consignment|exhibition --field=value; offer <stock> --collector=name --followup=YYYY-MM-DD; sale <stock> --collector=name --ref=INV --cents=N --due=YYYY-MM-DD --market=AU|NZ|OTHER [--resale=true]; receive|settle <ref> --cents=N; move <stock> --to=location; condition <stock> --note=text; log <collector> --note=text; hang <exhibition> --artwork=stock; royalty-review <ref> --status=reported|not-applicable --evidence=text\nFiles: import artlogic --artworks=file.csv --contacts=file.csv [--dry-run]; export [--out=new-file.json]; draft-followups\nAll results support --json. No command sends or transfers money.`);}
 else {let db;try{db=await getDb();const out=await execute(db,args);console.log(args.includes('--json')?JSON.stringify(out,null,2):format(out));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
}
