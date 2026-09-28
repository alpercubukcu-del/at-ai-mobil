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

test('browser runtime installs the nine-model route and updates menu copy',()=>{
  const classes=()=>({add(){},remove(){},toggle(){}});
  const elements={
    tickets:{classList:classes(),textContent:'',innerHTML:'',querySelectorAll(){return[]}},
    buildAllBtn:{disabled:false,textContent:'',insertAdjacentElement(){}},
    couponMenuBtn:{addEventListener(){}},
    couponCenterDialog:{open:false}
  };
  const note={innerHTML:''},rule={textContent:''};
  const document={
    head:{appendChild(node){if(node.id)elements[node.id]=node}},
    getElementById(id){return elements[id]||null},
    querySelector(selector){if(selector.includes('five-model-note'))return note;if(selector.includes('ticket-rule'))return rule;return null},
    querySelectorAll(){return[]},
    createElement(){return{id:'',className:'',textContent:'',style:{},classList:classes()}}
  };
  const runtime={document,state:{tickets:[],races:[],analyses:{}},console,setTimeout,clearTimeout};
  runtime.window=runtime;
  runtime.addEventListener=()=>{};
  vm.createContext(runtime);
  vm.runInContext(source,runtime);
  vm.runInContext(fs.readFileSync(new URL('./fogd-nine-coupon-v172.js',import.meta.url),'utf8'),runtime);
  assert.equal(runtime.ATFogdNineCouponV172.models.length,9);
  assert.equal(runtime.ATCouponFiveModelCalibratedV631.buildAll,runtime.ATFogdNineCouponV172.build);
  assert.match(note.innerHTML,/9 BAĞIMSIZ PUAN KUPONU/);
  assert.equal(elements.buildAllBtn.textContent,'9 Puan Modelinden Kupon Oluştur');
});
