const ROWS = 6, COLS = 8;
const svg = document.getElementById('lattice');
const NS = 'http://www.w3.org/2000/svg';
let errors = new Set(), correction = new Set(), decoded = false;

const h = (r,c) => `h:${mod(r,ROWS)}:${mod(c,COLS)}`;
const v = (r,c) => `v:${mod(r,ROWS)}:${mod(c,COLS)}`;
const mod = (n,m) => ((n%m)+m)%m;
const parse = id => { const [o,r,c] = id.split(':'); return {o,r:+r,c:+c}; };

function incident(r,c){ return [h(r,c),h(r,c-1),v(r,c),v(r-1,c)]; }
function syndromeFor(edgeSet){
  const active=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const parity=incident(r,c).reduce((n,id)=>n+(edgeSet.has(id)?1:0),0)%2;
    if(parity) active.push(`${r}:${c}`);
  }
  return active;
}
function xorSets(a,b){ const out=new Set(a); for(const x of b) out.has(x)?out.delete(x):out.add(x); return out; }

function shortestPath(a,b){
  let [r,c]=a, [tr,tc]=b; const out=[];
  const down=mod(tr-r,ROWS), up=mod(r-tr,ROWS);
  if(down<=up){ for(let i=0;i<down;i++){out.push(v(r,c));r=mod(r+1,ROWS);} }
  else { for(let i=0;i<up;i++){r=mod(r-1,ROWS);out.push(v(r,c));} }
  const right=mod(tc-c,COLS), left=mod(c-tc,COLS);
  if(right<=left){ for(let i=0;i<right;i++){out.push(h(r,c));c=mod(c+1,COLS);} }
  else { for(let i=0;i<left;i++){c=mod(c-1,COLS);out.push(h(r,c));} }
  return out;
}
function toricDistance(a,b){
  return Math.min(mod(a[0]-b[0],ROWS),mod(b[0]-a[0],ROWS)) + Math.min(mod(a[1]-b[1],COLS),mod(b[1]-a[1],COLS));
}
function greedyDecode(active){
  const points=active.map(x=>x.split(':').map(Number)), chosen=[];
  while(points.length>1){
    const a=points.shift(); let best=0, dist=Infinity;
    points.forEach((p,i)=>{const d=toricDistance(a,p);if(d<dist){dist=d;best=i;}});
    const b=points.splice(best,1)[0]; chosen.push(...shortestPath(a,b));
  }
  return new Set(chosen);
}
function winding(edgeSet){
  let horizontal=0, vertical=0;
  for(let r=0;r<ROWS;r++) if(edgeSet.has(h(r,COLS-1))) horizontal^=1;
  for(let c=0;c<COLS;c++) if(edgeSet.has(v(ROWS-1,c))) vertical^=1;
  return {horizontal,vertical};
}

function edgeLine(id, x, y, gapX, gapY){
  const {o,r,c}=parse(id); const group=document.createElementNS(NS,'g');
  const line=document.createElementNS(NS,'line'); line.dataset.edge=id; line.classList.add('edge');
  if(o==='h'){
    if(c===COLS-1){ line.setAttribute('x1',x(c));line.setAttribute('y1',y(r));line.setAttribute('x2',x(c)+gapX*.63);line.setAttribute('y2',y(r));line.classList.add('wrap'); }
    else {line.setAttribute('x1',x(c));line.setAttribute('y1',y(r));line.setAttribute('x2',x(c+1));line.setAttribute('y2',y(r));}
  } else {
    if(r===ROWS-1){ line.setAttribute('x1',x(c));line.setAttribute('y1',y(r));line.setAttribute('x2',x(c));line.setAttribute('y2',y(r)+gapY*.63);line.classList.add('wrap'); }
    else {line.setAttribute('x1',x(c));line.setAttribute('y1',y(r));line.setAttribute('x2',x(c));line.setAttribute('y2',y(r+1));}
  }
  line.addEventListener('click',()=>{ errors.has(id)?errors.delete(id):errors.add(id); correction.clear();decoded=false;render(); });
  group.appendChild(line); return group;
}
function render(){
  const active=syndromeFor(errors), activeSet=new Set(active), residual=decoded?xorSets(errors,correction):new Set();
  svg.innerHTML=''; const marginX=82, marginY=62, gapX=92, gapY=78;
  const x=c=>marginX+c*gapX, y=r=>marginY+r*gapY;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) svg.appendChild(edgeLine(h(r,c),x,y,gapX,gapY));
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) svg.appendChild(edgeLine(v(r,c),x,y,gapX,gapY));
  svg.querySelectorAll('.edge').forEach(el=>{
    const id=el.dataset.edge;
    if(decoded && residual.has(id)) el.classList.add('residual');
    else if(correction.has(id)) el.classList.add('correction');
    else if(errors.has(id)) el.classList.add('error');
  });
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const circle=document.createElementNS(NS,'circle');circle.setAttribute('cx',x(c));circle.setAttribute('cy',y(r));circle.setAttribute('r',activeSet.has(`${r}:${c}`)?11:7);circle.classList.add('vertex');
    if(activeSet.has(`${r}:${c}`)) circle.classList.add('active');svg.appendChild(circle);
    const label=document.createElementNS(NS,'text');label.setAttribute('x',x(c));label.setAttribute('y',y(r)-16);label.classList.add('vertex-label');label.textContent=`S${r*COLS+c}`;svg.appendChild(label);
  }
  updateVector(activeSet); updateStatus(active,residual);
}
function updateVector(activeSet){
  const box=document.getElementById('syndromeVector');box.innerHTML='';
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const bit=document.createElement('i');const on=activeSet.has(`${r}:${c}`);bit.textContent=on?'1':'0';if(on)bit.classList.add('active');box.appendChild(bit);}
  document.getElementById('vectorSummary').textContent=`${activeSet.size} active / 48 checks`;
}
function updateStatus(active,residual){
  document.getElementById('errorCount').textContent=errors.size;
  document.getElementById('checkCount').textContent=active.length;
  document.getElementById('correctionCount').textContent=decoded?correction.size:'—';
  const outcome=document.getElementById('outcomeMetric'), text=document.getElementById('outcomeText'), icon=document.getElementById('resultIcon');
  outcome.className='outcome neutral';icon.className='result-icon';
  const kicker=document.getElementById('resultKicker'), title=document.getElementById('resultTitle'), body=document.getElementById('resultBody');
  if(!errors.size){text.textContent='READY';kicker.textContent='NO EXPERIMENT RUNNING';title.textContent='Select a scenario or draw an error chain.';body.textContent='SyndromeScope will calculate which stabilizers detect the chain and show whether the decoder restores the logical state.';icon.textContent='◎';return;}
  if(!decoded){text.textContent=active.length?'DETECTED':'HIDDEN';outcome.classList.add(active.length?'detected':'fail');icon.classList.add(active.length?'detected':'fail');icon.textContent=active.length?'!':'∿';kicker.textContent=active.length?'SYNDROME GENERATED':'ZERO SYNDROME';title.textContent=active.length?`${active.length} stabilizers detect chain endpoints.`:'This chain is invisible to local checks.';body.textContent=active.length?'Run the decoder to connect the detection events with a likely correction path.':'A closed chain has no endpoints. If it wraps around the surface, it acts on the logical qubit.';return;}
  const residualSyndrome=syndromeFor(residual), wind=winding(residual), logical=wind.horizontal||wind.vertical;
  if(logical){text.textContent='LOGICAL FAIL';outcome.classList.add('fail');icon.classList.add('fail');icon.textContent='×';kicker.textContent='UNDETECTABLE LOGICAL OPERATOR';title.textContent='The syndrome is clear, but the logical state changed.';body.textContent=`Error + correction leaves a ${wind.horizontal?'horizontal':'vertical'} loop around the periodic surface. Local checks cannot distinguish it from a logical operation.`;}
  else if(!residualSyndrome.length){text.textContent='CORRECTED';outcome.classList.add('success');icon.classList.add('success');icon.textContent='✓';kicker.textContent='LOGICAL STATE PRESERVED';title.textContent='The correction returns the code to its valid subspace.';body.textContent=residual.size?'The remaining closed chain is topologically trivial: it may be a stabilizer loop, but it does not cross a logical boundary.':'The decoder exactly canceled the physical error chain.';}
  else {text.textContent='RETRY';outcome.classList.add('detected');icon.classList.add('detected');icon.textContent='!';kicker.textContent='RESIDUAL SYNDROME';title.textContent='The proposed correction did not clear every check.';body.textContent='A stronger decoder should reconsider the pairing of detection events.';}
}

const presets={
  single:()=>[h(2,3)],
  chain:()=>[h(2,2),h(2,3),h(2,4)],
  logical:()=>Array.from({length:COLS},(_,c)=>h(3,c)),
  random:()=>{const all=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){all.push(h(r,c),v(r,c));}return all.filter(()=>Math.random()<.045);}
};
document.getElementById('loadPreset').addEventListener('click',()=>{errors=new Set(presets[document.getElementById('presetSelect').value]());correction.clear();decoded=false;render();});
document.getElementById('decodeButton').addEventListener('click',()=>{correction=greedyDecode(syndromeFor(errors));decoded=true;render();});
document.getElementById('resetButton').addEventListener('click',()=>{errors.clear();correction.clear();decoded=false;render();});
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='d'){correction=greedyDecode(syndromeFor(errors));decoded=true;render();}});
document.querySelectorAll('.view-tabs button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.view-tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const matrix=btn.dataset.view==='matrix';document.getElementById('latticeView').hidden=matrix;document.getElementById('matrixView').hidden=!matrix;}));
const dialog=document.getElementById('helpDialog');document.getElementById('helpButton').onclick=()=>dialog.showModal();document.getElementById('walkthroughButton').onclick=()=>dialog.showModal();document.getElementById('closeHelp').onclick=()=>dialog.close();
render();
