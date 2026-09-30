import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./fogd-nine-coupon-core.js',import.meta.url),'utf8');
const context={};
vm.createContext(context);
vm.runInContext(source,context);
const core=context.ATFogdNineCouponCoreV1;

function snapshot(scores,key='T',winnerRank=1,extra={}){
  return{
    key:Math.random().toString(36),date:'2026-01-01',city:'TEST',raceNo:1,
    rows:scores.map((score,index)=>({
      no:index+1,name:`AT ${index+1}`,[key]:score,
      actualFinish:index+1===winnerRank?1:index+2,
      connectionMeta:{verified:3},
      ...extra
    }))
  };
}

test('historical profile chooses the smallest width reaching 85 percent capture',()=>{
  const samples=[];
  for(let i=0;i<10;i++)samples.push(snapshot([90,80,70,60],'T',1));
  for(let i=0;i<7;i++)samples.push(snapshot([90,80,70,60],'T',2));
  for(let i=0;i<3;i++)samples.push(snapshot([90,80,70,60],'T',3));
  const p=core.profileFromSnapshots(samples,'dna-t');
  assert.equal(p.sample,20);
  assert.equal(p.rates[2],.85);
  assert.equal(p.recommendedWidth,2);
});

test('team score requires at least two verified J/S/A connections',()=>{
  const s=snapshot([70,60],'E',1);
  s.rows[0].connectionMeta.verified=1;
  const ranked=core.rankSnapshot(s,'dna-e');
  assert.equal(ranked.scored,1);
  assert.equal(ranked.usable,false);
});

test('current score cliff shortens the learned band and close scores widen it',()=>{
  const cliff=core.recommendWidth([{score:90},{score:88},{score:86},{score:70},{score:69}],{sample:40,recommendedWidth:4,singleGap:12,singleCases:12,singleRate:.5},{coverage:1});
  assert.equal(cliff.width,3);
  assert.match(cliff.reason,/kırılması/);
  const close=core.recommendWidth([{score:90},{score:88},{score:87}],{sample:40,recommendedWidth:2,singleGap:12,singleCases:12,singleRate:.5},{coverage:1});
  assert.equal(close.width,3);
});

test('large unlearned leader gap can qualify as a single candidate',()=>{
  const cut=core.recommendWidth([{score:90},{score:70},{score:68}],{sample:0,recommendedWidth:3},{coverage:1});
  assert.equal(cut.singleQualified,true);
});

test('ticket stops at its score cut instead of filling unused budget',()=>{
  const plan={ok:true,startRace:1,legs:[{no:1},{no:2}],desc:{type:"6'lı Ganyan"}};
  const map=new Map([
    ['1',snapshot([90,87,84,70],'T',1)],
    ['2',{...snapshot([91,88,85,69],'T',1),raceNo:2}]
  ]);
  const profile=core.profileFromSnapshots([],'dna-t');
  const ticket=core.buildModelTicket({plan,modelId:'dna-t',snapshotsByRace:map,profiles:{'dna-t':profile},budget:1000,unitPrice:1,maxSingles:0});
  assert.equal(ticket.available,true);
  assert.deepEqual(ticket.legs.map(x=>x.selections.length),[3,3]);
  assert.equal(ticket.cost,9);
});

test('budget can reduce normal legs to two but never forces them to one',()=>{
  const plan={ok:true,startRace:1,legs:[{no:1},{no:2}],desc:{type:"6'lı Ganyan"}};
  const map=new Map([
    ['1',snapshot([90,87,84,70],'T',1)],
    ['2',{...snapshot([91,88,85,69],'T',1),raceNo:2}]
  ]);
  const profile=core.profileFromSnapshots([],'dna-t');
  const ticket=core.buildModelTicket({plan,modelId:'dna-t',snapshotsByRace:map,profiles:{'dna-t':profile},budget:4,unitPrice:1,maxSingles:0});
  assert.deepEqual(ticket.legs.map(x=>x.selections.length),[2,2]);
  assert.equal(ticket.cost,4);
});

test('a model is unavailable when its score coverage is below the declared threshold',()=>{
  const s=snapshot([70,60,50,40],'O',1);
  s.rows[2].O=null;s.rows[3].O=null;
  const plan={ok:true,startRace:1,legs:[{no:1}],desc:{type:'Ganyan'}};
  const ticket=core.buildModelTicket({plan,modelId:'dna-o',snapshotsByRace:new Map([['1',s]]),profiles:{'dna-o':core.profileFromSnapshots([],'dna-o')},budget:100,unitPrice:1,maxSingles:0});
  assert.equal(ticket.available,false);
  assert.match(ticket.error,/kapsamı/);
});

test('all-races template keeps every program race and exposes missing data inline',()=>{
  const races=[{no:1,horses:[{no:1},{no:2},{no:3}]},{no:2,horses:[{no:1},{no:2},{no:3}]},{no:3,horses:[{no:1},{no:2},{no:3}]}];
  const map=new Map([
    ['1',snapshot([90,87,84],'F',1)],
    ['2',{...snapshot([88,75,63],'F',1),raceNo:2}]
  ]);
  const template=core.buildAllRacesTemplate({modelId:'dna-f',races,snapshotsByRace:map,profiles:{'dna-f':core.profileFromSnapshots([],'dna-f')}});
  assert.equal(template.legs.length,3);
  assert.equal(template.readyRaces,2);
  assert.equal(template.complete,false);
  assert.equal(template.legs[2].raceNo,3);
  assert.equal(template.legs[2].available,false);
  assert.match(template.legs[2].error,/Yarış DNA kaydı yok/);
});

test('each all-races template ranks only its own score column',()=>{
  const s={
    date:'2026-01-01',city:'TEST',raceNo:1,
    rows:[
      {no:1,name:'F LİDERİ',F:92,A:55,connectionMeta:{verified:3}},
      {no:2,name:'A LİDERİ',F:60,A:94,connectionMeta:{verified:3}},
      {no:3,name:'DİĞER',F:50,A:50,connectionMeta:{verified:3}}
    ]
  };
  const args={races:[{no:1,horses:[{no:1},{no:2},{no:3}]}],snapshotsByRace:new Map([['1',s]]),profiles:{}};
  const f=core.buildAllRacesTemplate({...args,modelId:'dna-f'});
  const a=core.buildAllRacesTemplate({...args,modelId:'dna-a'});
  assert.equal(f.legs[0].ranking[0].no,1);
  assert.equal(a.legs[0].ranking[0].no,2);
});

test('all-races critical cut can make a safe single without an official bet plan',()=>{
  const s=snapshot([90,70,68],'T',1);
  const template=core.buildAllRacesTemplate({
    modelId:'dna-t',races:[{no:1,horses:[{no:1},{no:2},{no:3}]}],
    snapshotsByRace:new Map([['1',s]]),profiles:{'dna-t':core.profileFromSnapshots([],'dna-t')}
  });
  assert.equal(template.available,true);
  assert.equal(template.legs[0].single,true);
  assert.equal(template.legs[0].selections.length,1);
  assert.match(template.legs[0].cut.reason,/güvenli tek/);
});

test('browser runtime preserves nine templates and adds a separate tenth method',async()=>{
  const runtimeSource=fs.readFileSync(new URL('./fogd-nine-coupon-v173.js',import.meta.url),'utf8');
  assert.match(runtimeSource,/FOGD-COUPON-V17\.4/);
  assert.match(runtimeSource,/fogdAllRacesBuildV173/);
  assert.match(runtimeSource,/9 BAĞIMSIZ TÜM-KOŞU ŞABLONU/);
  assert.match(runtimeSource,/F · O · G · D · J · S · E · A · T/);
  assert.match(runtimeSource,/YARIŞ DNA · KUPON ŞABLONLARI/);
  assert.match(runtimeSource,/#090b0d/);
  assert.match(runtimeSource,/#a70e15/);
  assert.match(runtimeSource,/replaceWith\(fresh\)/);
  assert.doesNotMatch(runtimeSource,/alert\s*\(/);
  assert.doesNotMatch(runtimeSource,/buildAllBtn/);
  assert.doesNotMatch(runtimeSource,/Kariyer|Hazırlık/);

  class ClassList{
    constructor(){this.values=new Set()}
    add(...values){values.forEach(value=>this.values.add(value))}
    remove(...values){values.forEach(value=>this.values.delete(value))}
    contains(value){return this.values.has(value)}
  }
  class Element{
    constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.dataset={};this.classList=new ClassList();this.listeners={};this.attributes={};this.children=[];this.open=false;this.textContent='';this._id='';this._innerHTML=''}
    set id(value){if(this._id)this.doc.elements.delete(this._id);this._id=value;if(value)this.doc.elements.set(value,this)}
    get id(){return this._id}
    set className(value){this.classList=new ClassList();String(value).split(/\s+/).filter(Boolean).forEach(x=>this.classList.add(x))}
    get className(){return[...this.classList.values].join(' ')}
    set innerHTML(value){
      this.children.forEach(child=>child.unregister());this.children=[];this._innerHTML=String(value);
      for(const match of this._innerHTML.matchAll(/<([a-z0-9-]+)([^>]*?)\sid="([^"]+)"([^>]*)>/gi)){
        const child=new Element(match[1],this.doc),attrs=`${match[2]} ${match[4]}`,classMatch=attrs.match(/class="([^"]+)"/i);
        child.id=match[3];if(classMatch)child.className=classMatch[1];child.parent=this;this.children.push(child);
      }
    }
    get innerHTML(){return this._innerHTML}
    unregister(){this.children.forEach(child=>child.unregister());if(this.id)this.doc.elements.delete(this.id)}
    appendChild(child){child.parent=this;this.children.push(child);if(child.id)this.doc.elements.set(child.id,child);return child}
    replaceWith(next){this.unregister();if(this.id)this.doc.elements.delete(this.id);this.doc.elements.set(next.id,next)}
    cloneNode(){const next=new Element(this.tagName,this.doc);next.id=this.id;next.textContent=this.textContent;next.className=this.className;next.dataset={...this.dataset};next.attributes={...this.attributes};return next}
    setAttribute(name,value){this.attributes[name]=String(value);if(name==='id')this.id=String(value)}
    removeAttribute(name){delete this.attributes[name]}
    addEventListener(type,handler){(this.listeners[type]||=[]).push(handler)}
    dispatch(type){for(const handler of this.listeners[type]||[])handler({target:this,preventDefault(){},stopPropagation(){}})}
    querySelector(selector){if(selector.startsWith('.'))return this.children.find(child=>child.classList.contains(selector.slice(1)))||null;return null}
    querySelectorAll(){return[]}
    showModal(){this.open=true}
    close(){this.open=false;(this.listeners.close||[]).forEach(handler=>handler())}
    scrollTo(){}
  }
  const document={
    elements:new Map(),
    getElementById(id){return this.elements.get(id)||null},
    createElement(tag){return new Element(tag,this)},
    addEventListener(){},
    documentElement:{classList:new ClassList()}
  };
  document.head=new Element('head',document);document.body=new Element('body',document);
  const oldDialog=new Element('dialog',document);oldDialog.id='couponCenterDialog';oldDialog.innerHTML='<button id="buildAllBtn">Eski Kupon</button>';
  const oldMenu=new Element('button',document);oldMenu.id='couponMenuBtn';oldMenu.textContent='6. Kupon Oluştur';
  const rows=(shift=0)=>[
    {no:1,name:'BİR',F:90-shift,O:80,G:84,D:88,J:77,S:72,E:76,A:79,T:87,connectionMeta:{verified:3}},
    {no:2,name:'İKİ',F:82,O:91-shift,G:78,D:81,J:88,S:83,E:85,A:90,T:84,connectionMeta:{verified:3}},
    {no:3,name:'ÜÇ',F:70,O:72,G:90-shift,D:75,J:70,S:91,E:80,A:74,T:79,connectionMeta:{verified:3}}
  ];
  const stored=[
    {key:'2026-09-29|ISTANBUL|1',date:'2026-09-29',city:'İstanbul',raceNo:1,rows:rows()},
    {key:'2026-09-29|ISTANBUL|2',date:'2026-09-29',city:'İstanbul',raceNo:2,rows:rows(2)}
  ];
  const fakeDb={
    objectStoreNames:{contains(){return true}},
    transaction(){return{objectStore(){return{
      getAll(){const q={};queueMicrotask(()=>{q.result=stored;q.onsuccess?.()});return q},
      get(key){const q={};queueMicrotask(()=>{q.result=stored.find(x=>x.key===key)||null;q.onsuccess?.()});return q}
    }}}}
  };
  const indexedDB={open(){const q={result:fakeDb};queueMicrotask(()=>q.onsuccess?.());return q}};
  const listeners={};let alertCount=0;
  const runtime={document,console,indexedDB,setTimeout,clearTimeout,alert(){alertCount++},state:{date:'2026-09-29',city:'34',cities:[{id:'34',name:'İstanbul'}],races:[{no:1,time:'14:00',class:'ŞARTLI',distance:1400,track:'Kum',horses:[{no:1},{no:2},{no:3}]},{no:2,time:'14:30',class:'HANDİKAP',distance:1600,track:'Çim',horses:[{no:1},{no:2},{no:3}]}],analyses:{}},getCityName:()=> 'İstanbul'};
  runtime.window=runtime;runtime.addEventListener=(type,handler)=>{(listeners[type]||=[]).push(handler)};
  vm.createContext(runtime);vm.runInContext(source,runtime);
  for(const name of['fogd-condition-core.js','fogd-condition-coupon-v174.js'])vm.runInContext(fs.readFileSync(new URL(`./${name}`,import.meta.url),'utf8'),runtime);
  vm.runInContext(runtimeSource,runtime);
  assert.equal(runtime.ATFogdNineCouponCoreV1.MODELS.length,9);
  assert.equal(runtime.ATFogdNineCouponV173.models.length,10);
  assert.equal(document.getElementById('buildAllBtn'),null);
  assert.ok(document.getElementById('fogdAllRacesBuildV173'));
  assert.match(document.getElementById('couponCenterDialog').innerHTML,/YARIŞ DNA · KUPON ŞABLONLARI/);
  document.getElementById('couponMenuBtn').dispatch('click');
  assert.equal(document.getElementById('couponCenterDialog').open,true);
  assert.equal(document.documentElement.classList.contains('fogd-coupon-full-open'),true);
  const templates=await runtime.ATFogdNineCouponV173.build();
  assert.equal(templates.length,10);
  assert.deepEqual(Array.from(templates,x=>x.modelKey),['F','O','G','D','J','S','E','A','T','C']);
  for(const model of runtime.ATFogdNineCouponCoreV1.MODELS){
    const expected=core.buildAllRacesTemplate({modelId:model.id,races:runtime.state.races,snapshotsByRace:new Map(stored.map(s=>[String(s.raceNo),s])),profiles:{}});
    const actual=templates.find(t=>t.modelId===model.id);
    assert.deepEqual(JSON.parse(JSON.stringify(actual.legs)),JSON.parse(JSON.stringify(expected.legs)));
  }
  assert.equal(templates.every(x=>x.legs.length===2),true);
  assert.match(document.getElementById('fogdCouponStatusV173').textContent,/9\/9 bağımsız sütun şablonu/);
  assert.match(document.getElementById('fogdCouponTabsV173').innerHTML,/10 · KOŞUL/);
  assert.equal(runtime.state.analyses.fogdCouponV173.models.length,10);
  assert.match(document.getElementById('fogdCouponTabsV173').innerHTML,/data-fogd-tab-v173="dna-f"/);
  assert.match(document.getElementById('fogdCouponTemplatesV173').innerHTML,/1\. Koşu/);
  assert.match(document.getElementById('fogdCouponTemplatesV173').innerHTML,/2\. Koşu/);
  assert.equal(alertCount,0);
  runtime.ATFogdNineCouponV173.close();
  assert.equal(document.getElementById('couponCenterDialog').open,false);
});
