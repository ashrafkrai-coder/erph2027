const frame=document.getElementById('app'),notice=document.getElementById('notice'),install=document.getElementById('install');
document.getElementById('direct').href=GAS_URL;
let pendingInstall=null;
function connection(){notice.textContent=navigator.onLine?'Jika paparan kosong atau Google meminta log masuk, tekan Buka terus.':'Tiada internet. Sambung semula untuk menjana dan menyimpan RPH.';}
frame.addEventListener('load',connection);frame.src=GAS_URL;
window.addEventListener('online',()=>{connection();frame.src=GAS_URL;});window.addEventListener('offline',connection);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pendingInstall=e;install.hidden=false;});
install.addEventListener('click',async()=>{if(!pendingInstall)return;await pendingInstall.prompt();await pendingInstall.userChoice;pendingInstall=null;install.hidden=true;});
window.addEventListener('appinstalled',()=>{install.hidden=true;pendingInstall=null;});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{notice.textContent='Aplikasi boleh dibuka, tetapi pemasangan/offline belum tersedia. Gunakan hosting HTTPS.';});
connection();
