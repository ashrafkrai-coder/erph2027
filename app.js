const notice=document.getElementById('notice'),install=document.getElementById('install');
const frame=document.getElementById('app'),ui=document.getElementById('ui');
const week=document.getElementById('week'),button=document.getElementById('generate'),all=document.getElementById('all'),status=document.getElementById('status'),daysEl=document.getElementById('days');
const CACHE_KEY='smart-rph-options-v1';
let pendingInstall=null,busy=false;
const isIos=/iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
function connection(){
  notice.innerHTML=navigator.onLine
    ? '<span class="connection-icon online" role="img" aria-label="Dalam talian">●</span>'
    : '<span class="connection-icon offline" role="img" aria-label="Luar talian">⊘</span>';
}
function show(message,type){status.textContent=message;status.className='status '+type;}
function inputs(){return Array.from(document.querySelectorAll('[name=day]'));}
function sync(){const list=inputs(),n=list.filter(c=>c.checked).length;all.checked=n===list.length&&n>0;all.indeterminate=n>0&&n<list.length;button.disabled=busy||week.disabled||n===0;}
function lock(v){busy=v;week.disabled=v;all.disabled=v;inputs().forEach(c=>c.disabled=v);button.textContent=v?'Sedang menjana…':'Jana RPH';sync();}
all.addEventListener('change',()=>{inputs().forEach(c=>c.checked=all.checked);sync();});

function render(data){
  const prevWeek=week.value,prevDays=new Set(inputs().filter(c=>c.checked).map(c=>c.value)),hadDays=inputs().length>0;
  week.textContent='';daysEl.textContent='';
  data.weeks.forEach(w=>{const o=document.createElement('option');o.value=w.week;o.textContent='Minggu '+w.week+' · '+w.date;week.appendChild(o);});
  if(prevWeek&&data.weeks.some(w=>String(w.week)===prevWeek))week.value=prevWeek;
  data.days.forEach(d=>{const label=document.createElement('label');label.className='day';const c=document.createElement('input');c.type='checkbox';c.name='day';c.value=d.key;c.checked=hadDays?prevDays.has(d.key):true;c.addEventListener('change',sync);const name=document.createElement('span');name.textContent=d.label;const slots=document.createElement('span');slots.textContent=d.slots+' RPH';label.append(c,name,slots);daysEl.append(label);});
  document.getElementById('calendar').textContent=data.calendarNote||'';
  week.disabled=false;sync();
}

// GAS dipanggil sebagai API JSON sahaja (bukan memuatkan halaman penuh).
async function api(action,body){
  const url=GAS_URL+(body?'':'?action='+action);
  const res=await fetch(url,body?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...body})}:{});
  const json=await res.json();
  if(!json||json.ok===false)throw new Error((json&&json.error)||'Ralat pelayan');
  return json.data;
}
function useLegacyIframe(){ui.hidden=true;frame.hidden=false;frame.src=GAS_URL;}

button.addEventListener('click',async()=>{
  const payload={week:Number(week.value),days:inputs().filter(c=>c.checked).map(c=>c.value)};
  if(!payload.week||!payload.days.length)return;
  const link=document.getElementById('archive');link.hidden=true;
  lock(true);show('Mengambil data dan mengisi template…','busy');
  try{
    const r=await api('generate',payload);show(r.message,'ok');
    if(r.archiveUrl&&/^https:\/\/docs\.google\.com\//.test(r.archiveUrl)){link.href=r.archiveUrl;link.hidden=false;}
  }
  catch(e){show(e.message||String(e),'error');}
  lock(false);
});

async function load(){
  let cached=null;
  try{cached=JSON.parse(localStorage.getItem(CACHE_KEY));}catch(e){}
  if(cached)render(cached); // paparan serta-merta dari cache
  try{
    const data=await api('options');
    localStorage.setItem(CACHE_KEY,JSON.stringify(data));
    if(!busy)render(data);
  }catch(e){
    if(!cached)useLegacyIframe(); // API belum dipasang di GAS -> mod lama
    else if(!navigator.onLine)show('Luar talian: menggunakan data tersimpan.','busy');
  }
}
window.addEventListener('online',()=>{connection();if(!busy&&!ui.hidden)load();});window.addEventListener('offline',connection);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pendingInstall=e;install.hidden=false;});
install.addEventListener('click',async()=>{
  if(pendingInstall){
    await pendingInstall.prompt();
    await pendingInstall.userChoice;
    pendingInstall=null;
    install.hidden=true;
    return;
  }
  notice.textContent='Untuk pasang pada iPhone/iPad: tekan Kongsi, kemudian pilih Tambah ke Skrin Utama.';
});
if(isIos&&!isStandalone){install.hidden=false;}
if(isStandalone){install.hidden=true;}
window.addEventListener('appinstalled',()=>{install.hidden=true;pendingInstall=null;});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{notice.textContent='Aplikasi boleh dibuka, tetapi pemasangan/offline belum tersedia. Gunakan hosting HTTPS.';});
connection();load();
