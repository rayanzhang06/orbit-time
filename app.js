import {partsAt,pad,timeAt,localValue,offsetAt,utcLabel,dayDifference,differenceLabel,fromLocal} from './time.js';
import {solarDay,isDaylight,hourAt} from './solar.js';
const $=id=>document.getElementById(id);
const curated=[
 ['Asia/Shanghai','北京','Beijing','中国'],['Asia/Hong_Kong','香港','Hong Kong','中国'],['Asia/Taipei','台北','Taipei','中国'],['Asia/Tokyo','东京','Tokyo','日本'],['Asia/Seoul','首尔','Seoul','韩国'],['Asia/Singapore','新加坡','Singapore','新加坡'],['Asia/Bangkok','曼谷','Bangkok','泰国'],['Asia/Kolkata','新德里','New Delhi India Kolkata','印度'],['Asia/Kathmandu','加德满都','Kathmandu','尼泊尔'],['Asia/Dubai','迪拜','Dubai','阿联酋'],['Asia/Riyadh','利雅得','Riyadh','沙特阿拉伯'],['Africa/Johannesburg','约翰内斯堡','Johannesburg','南非'],['Africa/Cairo','开罗','Cairo','埃及'],['Africa/Nairobi','内罗毕','Nairobi','肯尼亚'],['Europe/London','伦敦','London','英国'],['Europe/Paris','巴黎','Paris','法国'],['Europe/Berlin','柏林','Berlin','德国'],['Europe/Rome','罗马','Rome','意大利'],['Europe/Madrid','马德里','Madrid','西班牙'],['Europe/Moscow','莫斯科','Moscow','俄罗斯'],['Europe/Istanbul','伊斯坦布尔','Istanbul','土耳其'],['America/New_York','纽约','New York','美国'],['America/Chicago','芝加哥','Chicago','美国'],['America/Denver','丹佛','Denver','美国'],['America/Los_Angeles','洛杉矶','Los Angeles','美国'],['America/Phoenix','凤凰城','Phoenix','美国'],['America/Toronto','多伦多','Toronto','加拿大'],['America/Vancouver','温哥华','Vancouver','加拿大'],['America/Mexico_City','墨西哥城','Mexico City','墨西哥'],['America/Sao_Paulo','圣保罗','Sao Paulo','巴西'],['America/Argentina/Buenos_Aires','布宜诺斯艾利斯','Buenos Aires','阿根廷'],['Pacific/Honolulu','檀香山','Honolulu Hawaii','美国'],['Australia/Sydney','悉尼','Sydney','澳大利亚'],['Australia/Melbourne','墨尔本','Melbourne','澳大利亚'],['Australia/Adelaide','阿德莱德','Adelaide','澳大利亚'],['Australia/Perth','珀斯','Perth','澳大利亚'],['Pacific/Auckland','奥克兰','Auckland','新西兰'],['UTC','协调世界时','UTC','全球']
].map(([zone,name,en,country])=>({zone,name,en,country}));
const known=new Map(curated.map(c=>[c.zone,c]));
const supported=Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):[];
const allCities=[...curated,...supported.filter(z=>!known.has(z)).map(zone=>({zone,name:zone.split('/').pop().replaceAll('_',' '),en:zone.replaceAll('_',' '),country:zone.split('/')[0]}))];
function validZone(z){try{new Intl.DateTimeFormat('en',{timeZone:z});return typeof z==='string';}catch{return false;}}
function cityFor(zone){return known.get(zone)||allCities.find(c=>c.zone===zone)||{zone,name:zone.split('/').pop().replaceAll('_',' '),country:zone.split('/')[0],en:zone};}
function stored(key){try{return localStorage.getItem(key);}catch{return null;}}
function save(key,value){try{localStorage.setItem(key,value);}catch{/* Usable in private browsing too. */}}
let localZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Shanghai';
let zones=[localZone,'Africa/Johannesburg','America/Mexico_City'];
try{const s=JSON.parse(stored('orbit-cities'));if(Array.isArray(s)&&s.length===3&&s.every(validZone))zones=s;}catch{}
let selected=zones.map(cityFor), frozen=null,sliderAnchor=null,editing=0,lastMinute='',lastFrameKey='';
const colors=['#d18a62','#8497a7','#aaa18f'];
const radii=[143,207,271];
let theme=stored('orbit-theme')||'light';
function applyTheme(){document.body.classList.toggle('dark',theme==='dark');$('theme').textContent=theme==='dark'?'☼':'☾';$('theme').setAttribute('aria-label',theme==='dark'?'切换浅色模式':'切换深色模式');$('theme').title=$('theme').getAttribute('aria-label');}
applyTheme();$('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';save('orbit-theme',theme);applyTheme();};
const NS='http://www.w3.org/2000/svg';
function svg(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function pos(r,degrees){const a=degrees*Math.PI/180;return [320+r*Math.sin(a),320-r*Math.cos(a)];}
function arc(r,start,end){const a=pos(r,start),b=pos(r,end);return `M${a.join(',')} A${r},${r} 0 ${end-start>180?1:0} 1 ${b.join(',')}`;}
function now(){return frozen?new Date(frozen):new Date();}
function buildRings(date){
 const root=$('rings');root.replaceChildren();
 selected.forEach((c,i)=>{
  const r=radii[i],p=partsAt(date,c.zone),hours=p.hour+p.minute/60;
  const g=svg('g');
  // Actual sunrise/sunset for this city's local date determine the light bands.
  const solar=solarDay(date,c.zone);
  for(const {start,end,period} of solar.segments){
   const a=(start-hours)*15,b=(end-hours)*15;
   g.append(svg('path',{d:end-start===24?arc(r,a,a+180)+arc(r,a+180,b).replace(/^M[^A]+/,''):arc(r,a,b),class:`period-band ${period}-band`,'pointer-events':'none'}));
   g.append(svg('path',{d:arc(r+25,a,b-.01),class:`period-edge ${period}-edge`,'pointer-events':'none'}));
  }
  // The whole annulus is a keyboard accessible city selector.
  const hit=svg('path',{d:arc(r+31,0,180)+arc(r+31,180,360).replace(/^M[^A]+/,'')+' '+arc(r-31,0,180)+arc(r-31,180,360).replace(/^M[^A]+/,''),'fill-rule':'evenodd',class:'ring-hit',role:'button',tabindex:0,'aria-label':`更换${i===0?'基准':'第'+i+'个对比'}城市：${c.name}，${solar.kind==='unknown'?'无地理位置':isDaylight(date,c.zone,solar)?'日间':'夜间'}`});
  hit.onclick=()=>openCity(i);hit.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCity(i);}};g.append(hit);
  g.append(svg('circle',{cx:320,cy:320,r:r+32,class:'ring-border','pointer-events':'none'}));
  for(const period of ['day','night']){
   const segment=solar.segments.filter(s=>s.period===period).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
   if(!segment)continue;
   const h=(segment.start+segment.end)/2;
   const [x,y]=pos(r+21,(h-hours)*15);
   const icon=svg('g',{transform:`translate(${x} ${y})`,class:`period-icon ${period}-icon`,'pointer-events':'none','aria-hidden':'true'});
   if(period==='day'){
    icon.append(svg('circle',{r:3}));
    for(let ray=0;ray<8;ray++){const a=ray*Math.PI/4;icon.append(svg('line',{x1:Math.sin(a)*5,y1:Math.cos(a)*5,x2:Math.sin(a)*7,y2:Math.cos(a)*7}));}
   }else icon.append(svg('path',{d:'M3.5 -5.5 A6 6 0 1 0 3.5 5.5 A4.7 4.7 0 0 1 3.5 -5.5Z'}));
   g.append(icon);
  }
  for(let tick=0;tick<96;tick++){const a=(tick/4-hours)*15;const [x1,y1]=pos(r-22,a),[x2,y2]=pos(r-(tick%4===0?15:18),a);g.append(svg('line',{x1,y1,x2,y2,class:`ring-tick ${tick%4===0?'major':''}`,'pointer-events':'none'}));}
  for(let h=0;h<24;h+=2){const [x,y]=pos(r,(h-hours)*15);g.append(svg('text',{x,y,class:`hour-number ${solar.segments.some(s=>s.period==='night'&&h>=s.start&&h<s.end)?'night-hour':''}`},pad(h)));}
  // Place the city label in the lower divider, away from hour numerals.
  const chip=svg('g',{class:'ring-city-chip','aria-hidden':'true'}),w=Math.max(76,c.name.length*12+30),y=320+r+30;
  chip.append(svg('rect',{x:320-w/2,y:y-12,width:w,height:24,rx:12,class:'ring-city-bg'}),svg('text',{x:320,y:y+1,class:'ring-city-label'},c.name+' ⌄'));chip.onclick=()=>openCity(i);g.append(chip);root.append(g);
 });
}
function render(force=false){
 const date=now(),key=date.toISOString().slice(0,16)+selected.map(c=>c.zone).join();
 if(!force&&key===lastFrameKey)return;lastFrameKey=key;
 const base=selected[0],p=partsAt(date,base.zone);
 $('center-time').textContent=timeAt(date,base.zone);$('center-date').textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:base.zone,month:'long',day:'numeric',weekday:'short'}).format(date);$('center-city').textContent=base.name+' · '+utcLabel(date,base.zone);
 $('center-caption').textContent=frozen?'所选时刻':'本地时间';$('input-city').textContent=base.name;
 if(document.activeElement!==$('exact-time'))$('exact-time').value=localValue(date,base.zone);
 $('mode-badge').classList.toggle('preview',!!frozen);$('mode-badge').lastElementChild.textContent=frozen?'正在预览时间':'与此刻同步';
 $('city-cards').replaceChildren();
 selected.forEach((c,i)=>{
  const card=document.createElement('button');card.className='city-card'+(i===0?' primary':'');card.style.setProperty('--ring-color',colors[i]);card.setAttribute('aria-label',`更换${c.name}，当前时间 ${timeAt(date,c.zone)}`);
  const solar=solarDay(date,c.zone),daylight=isDaylight(date,c.zone,solar);
  const diff=offsetAt(date,c.zone)-offsetAt(date,base.zone),dd=dayDifference(date,c.zone,base.zone),h=partsAt(date,c.zone).hour;
  // Text comes only from our curated list or built-in IANA identifiers.
  card.innerHTML=`<div class="card-top"><span class="city-name"><i class="card-dot"></i><span class="card-name"></span>${i===0?'<span class="card-tag">基准城市</span>':''}</span><span class="edit-city">⌄</span></div><p class="city-country"></p><div class="card-bottom"><span class="city-time"></span><div class="time-detail"><strong></strong><br><span class="card-date"></span></div></div><p class="solar-detail"></p>`;
  card.querySelector('.card-name').textContent=c.name;card.querySelector('.city-country').textContent=`${c.country} · ${utcLabel(date,c.zone)}`;card.querySelector('.city-time').textContent=timeAt(date,c.zone);card.querySelector('strong').textContent=(daylight===null?'':daylight?'☀ 日间':'☾ 夜间')+(i===0?'':' · '+differenceLabel(diff));
  card.querySelector('.card-date').textContent=`${new Intl.DateTimeFormat('zh-CN',{timeZone:c.zone,month:'numeric',day:'numeric',weekday:'short'}).format(date)}${dd?' · '+(dd>0?'次日':'前一天'):''}`;
  const detail=card.querySelector('.solar-detail');
  detail.textContent=solar.kind==='unknown'?'此时区无地理位置，无法计算日出日落':solar.kind==='polar-day'?'☀ 极昼 · 太阳全天不落':solar.kind==='polar-night'?'☾ 极夜 · 太阳全天不升':`日出 ${solar.sunrise?timeAt(solar.sunrise,c.zone):'当日无'}   ·   日落 ${solar.sunset?timeAt(solar.sunset,c.zone):'当日无'}`;
  detail.title='按城市参考坐标及当地日期计算的日出日落，采用标准大气折射与地平线条件。';
  card.onclick=()=>openCity(i);$('city-cards').append(card);
 });
 const awake=selected.filter(c=>{const h=partsAt(date,c.zone).hour;return h>=9&&h<18;}).length;
 $('insight-title').textContent=awake===3?'此刻，三个城市都在工作时间':awake===0?'此刻，适合把节奏放慢':`此刻，${awake} 个城市在工作时间`;
 $('insight-text').textContent='时间盘上的每一条径向线，都连接着同一个时刻。';
 buildRings(date);
}
function previewFromSlider(){if(!sliderAnchor)sliderAnchor=Date.now();const value=Number($('timeline').value);frozen=sliderAnchor+value*60000;$('offset-label').textContent=value===0?'所选基准时刻':`${value>0?'+':'−'}${Math.floor(Math.abs(value)/60)} 小时${Math.abs(value)%60?' '+Math.abs(value)%60+' 分钟':''}`;render(true);}
$('timeline').addEventListener('input',previewFromSlider);
for(const [id,step]of [['back',-15],['forward',15]])$(id).onclick=()=>{const value=Math.max(-720,Math.min(720,Number($('timeline').value)+step));$('timeline').value=value;previewFromSlider();};
$('reset').onclick=()=>{frozen=null;sliderAnchor=null;$('timeline').value=0;$('offset-label').textContent='此刻';$('time-error').textContent='';render(true);};
$('exact-time').addEventListener('change',()=>{const date=fromLocal($('exact-time').value,selected[0].zone);if(!date){$('time-error').textContent='该时间无效，或因夏令时跳转而不存在。';return;}$('time-error').textContent='';frozen=date.getTime();sliderAnchor=frozen;$('timeline').value=0;$('offset-label').textContent='所选基准时刻';render(true);});
function openCity(index){editing=index;$('dialog-eyebrow').textContent=index===0?'更换基准城市':`更换第 ${index} 个对比城市`;$('city-search').value='';renderResults();$('city-dialog').showModal();$('city-search').focus();}
function renderResults(){const q=$('city-search').value.trim().toLowerCase();const cities=q?allCities.filter(c=>`${c.name} ${c.en} ${c.country} ${c.zone}`.toLowerCase().includes(q)):curated;$('search-label').textContent=q?`${cities.length} 个匹配城市 / 时区`:'常用城市';const root=$('city-results');root.replaceChildren();const date=now();for(const c of cities){const b=document.createElement('button');b.className='city-option';const left=document.createElement('span'),name=document.createElement('span'),sub=document.createElement('span'),right=document.createElement('span');name.className='option-name';name.textContent=c.name+(selected[editing].zone===c.zone?' ✓':'');sub.className='option-sub';sub.textContent=`${c.country} · ${c.zone}`;right.className='option-time';right.textContent=timeAt(date,c.zone);left.append(name,sub);b.append(left,right);b.onclick=()=>{selected[editing]=c;save('orbit-cities',JSON.stringify(selected.map(c=>c.zone)));$('time-error').textContent='';$('city-dialog').close();render(true);};root.append(b);}if(!cities.length){const p=document.createElement('p');p.className='empty';p.textContent='暂未找到。试试中文城市名、英文名或 IANA 时区（如 Europe/London）。';root.append(p);}root.scrollTop=0;}
$('city-search').addEventListener('input',renderResults);$('close-dialog').onclick=()=>$('city-dialog').close();$('city-dialog').addEventListener('click',e=>{if(e.target===$('city-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
let toastTimer;function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
$('copy').onclick=async()=>{const date=now();const text=selected.map(c=>`${c.name}  ${localValue(date,c.zone).replace('T',' ')} (${utcLabel(date,c.zone)})`).join('\n');try{await navigator.clipboard.writeText(text);toast('已复制三个城市的时间');}catch{const ta=document.createElement('textarea');ta.value=text;document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();toast(ok?'已复制三个城市的时间':'复制不可用，请在 HTTPS 页面重试');}};
render(true);setInterval(()=>{if(!document.hidden&&!frozen)render();},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render(true);});
