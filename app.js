const frame=document.getElementById('app'),notice=document.getElementById('notice'),install=document.getElementById('install');
let pendingInstall=null;
const isIos=navigator.userAgent.includes('iPhone')||navigator.userAgent.includes('iPad')||navigator.userAgent.includes('iPod');
const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
function connection(){
  notice.innerHTML=navigator.onLine
    ? '<span class="connection-icon online" role="img" aria-label="Dalam talian">●</span>'
    : '<span class="connection-icon offline" role="img" aria-label="Luar talian">⊘</span>';
}
frame.addEventListener('load',connection);frame.src=GAS_URL;
window.addEventListener('online',()=>{connection();frame.src=GAS_URL;});window.addEventListener('offline',connection);
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
connection();
