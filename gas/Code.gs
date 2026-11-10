/** Penjana untuk eRPH_RPT_2027_Kemaskini. Pasang sebagai skrip terikat. */
// ===== TETAPAN GURU =====
// Tampal ID Google Sheet anda di antara tanda petik. ID ialah teks antara /d/ dan /edit pada URL.
// Contoh URL: https://docs.google.com/spreadsheets/d/<ID>/edit
const RPH_ID = '1jh6CuDDk5wRPMvZKrviCMa8jjw-VSYEqFYKUwjJY_14';
const RPH_DAYS = ['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT'];
const RPH_NAMES = {ISNIN:'Isnin', SELASA:'Selasa', RABU:'Rabu', KHAMIS:'Khamis', JUMAAT:'Jumaat'};
const RPH_JAWI = {ISNIN:'اثنين', SELASA:'سلاسا', RABU:'رابو', KHAMIS:'خميس', JUMAAT:'جمعة'};
const RPH_OFFSETS = {ISNIN:[0,69,138,207], SELASA:[0,69,138,207], RABU:[0,69,138,207], KHAMIS:[0,69,138,207], JUMAAT:[0,69,138,207]};

function onOpen() { rphOnOpen(); }
function rphOnOpen() {
  SpreadsheetApp.getUi().createMenu('RPH').addItem('Buka Penjana RPH', 'rphOpenSidebar').addToUi();
  rphOpenSidebar();
}
function rphOpenSidebar() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Jana RPH'));
}
function rphIdFromInput_(value) {
  const v = String(value || '').trim()
  const m = v.match(/\/d\/([A-Za-z0-9_-]{20,})/)
  return m ? m[1] : v
}
function rphGetSettings() {
  let active = ''
  try { active = SpreadsheetApp.getActiveSpreadsheet().getId() } catch (e) {}
  const stored = PropertiesService.getDocumentProperties().getProperty('RPH_ID') || ''
  return { id: stored || String(RPH_ID || '').trim() || active }
}
function rphSaveSettings(input) {
  const id = rphIdFromInput_(input)
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error('Format ID tidak sah. Tampal ID sahaja atau pautan penuh Google Sheet.')
  let name
  try { name = SpreadsheetApp.openById(id).getName() } catch (e) { throw new Error('Tidak dapat membuka Google Sheet itu. Semak ID dan pastikan anda mempunyai akses.') }
  PropertiesService.getDocumentProperties().setProperty('RPH_ID', id)
  return { id: id, message: 'ID disimpan. Sheet: ' + name }
}
function rphSpreadsheetId_() {
  const id = String(PropertiesService.getDocumentProperties().getProperty('RPH_ID') || RPH_ID || '').trim();
  if (!id) throw new Error('ID Google Sheet belum diisi. Buka bahagian Tetapan di bawah panel ini, tampal ID atau pautan Google Sheet, kemudian tekan Simpan.');
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error('Format RPH_ID tidak sah. Tampal ID sahaja (teks antara /d/ dan /edit), bukan URL penuh.');
  return id;
}
function rphSpreadsheet_() {
  const id = rphSpreadsheetId_();
  try { return SpreadsheetApp.openById(id); }
  catch (e) { throw new Error('Tidak dapat membuka Google Sheet dengan RPH_ID itu. Semak ID dan pastikan anda mempunyai akses.'); }
}
function rphRead_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Tab tidak ditemui: '+name);
  return sh.getDataRange().getDisplayValues();
}
function rphWeek_(s) {
  const m = String(s).match(/^(?:Minggu\s*|M\s*)?(\d+)$/i);
  return m ? Number(m[1]) : null;
}
function rphCalendar_(rows) {
  const weeks = rows.slice(2).filter(r=>rphWeek_(r[0]) && r[1]).map(r=>({week:rphWeek_(r[0]), date:String(r[1])}));
  if (!weeks.length) throw new Error('KALENDAR_2027 belum mempunyai minggu dan tarikh.');
  if (new Set(weeks.map(w=>w.week)).size !== weeks.length) throw new Error('KALENDAR_2027 mempunyai minggu berulang.');
  weeks.forEach(w=>rphDate_(w.date,0));
  return weeks.sort((a,b)=>a.week-b.week);
}
function rphGetOptions() {
  const ss = rphSpreadsheet_();
  const schedule=rphSchedule_(rphRead_(ss,'TETAPAN_JADUAL'),RPH_DAYS);
  const last=PropertiesService.getScriptProperties().getProperty('RPH_LAST_GENERATION');
  return {weeks:rphCalendar_(rphRead_(ss,'KALENDAR_2027')), days:RPH_DAYS.map(d=>({key:d,label:RPH_NAMES[d],slots:schedule.filter(s=>s.day===d).length})), calendarNote:'Tarikh mengikut KALENDAR_2027 (takwim anggaran). Maksimum 4 slot setiap hari.',lastGeneration:last?JSON.parse(last):null};
}
function rphDate_(text, offset) {
  const m=String(text).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error('Tarikh kalendar mesti dd/MM/yyyy: '+text);
  const base=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
  if(base.getUTCDate()!==+m[1] || base.getUTCMonth()!==+m[2]-1) throw new Error('Tarikh kalendar tidak sah: '+text);
  if(base.getUTCDay()!==1) throw new Error('Tarikh mula minggu mesti Isnin: '+text);
  base.setUTCDate(base.getUTCDate()+offset);
  return [String(base.getUTCDate()).padStart(2,'0'),String(base.getUTCMonth()+1).padStart(2,'0'),base.getUTCFullYear()].join('/');
}
function rphKey_(v) { return String(v||'').trim().replace(/[–—]/g,'-').replace(/\s+/g,''); }
function rphBank_(rows, ting, code, label) {
  const k=rphKey_(ting+'-'+code);
  const matches=rows.slice(2).filter(r=>rphKey_(r[0])===k);
  if(matches.length>1) throw new Error(label+': kunci berulang '+k);
  return matches[0] || null;
}
function rphHasJawi_(s) { return /[؀-ۿ]/.test(String(s||'')); }
function rphTerms_(text) {
  // Istilah pedagogi sahaja; ayat Rumi tidak ditransliterasi secara tekaan.
  const pairs=[
    ['Three Stray One Stay','تيڬ برڬرق ساتو ککل'],['Rally Table','رالي تيبل'],['scaffolding','بيمبيڠن برڤريڠکت'],['chunking','ڤمچهن کڤد ڤوتوڠن ڤنديق'],['SPM','ايس ڤي ايم'],
    ['Think-Pair-Share','فيکير-ڤاسڠ-کوڠسي'],['Gallery Walk','ڬالري واک'],['Round Robin','راون رابن'],
    ['Rally Coach','رالي کوچ'],['Rally Robin','رالي رابن'],['Hot Seat','هوت سيت'],['Jigsaw','جيڬسو'],
    ['Role Play','لاکونن'],['Quiz-Quiz-Trade','کويز-کويز-تريد'],['Traffic Light','لامڤو ايشارت'],
    ['Exit Ticket','تيکيت کلوار'],['Think-Pair-Square','فيکير-ڤاسڠ-کومڤولن'],['Think-Pair','فيکير-ڤاسڠ'],
    ['Multi-Flow Map','ڤتا ڤلباڬاي اليرن'],['Double Bubble Map','ڤتا بويه ڬندا'],
    ['Circle Map','ڤتا بولاتن'],['Bubble Map','ڤتا بويه'],['Tree Map','ڤتا ڤوکوق'],
    ['Flow Map','ڤتا اليرن'],['Brace Map','ڤتا داکڤ'],['Bridge Map','ڤتا تيتي'],
    ['Verbal-Linguistik','ۏيربل-ليڠڬويستيک'],['Verbal-Linguistic','ۏيربل-ليڠڬويستيک'],
    ['Interpersonal','اينترڤرسونل'],['Intrapersonal','اينتراڤرسونل'],['Visual-Spatial','ۏيسوال-روڠ'],
    ['Logik-Matematik','لوڬيک-ماتماتيک'],['Logik','لوڬيک'],['Kinestetik','کينيستيتيک'],['Naturalis','ناتوراليس'],
    ['i-Think','اي-تهينک'],['i-THINK','اي-تهينک'],['KBAT','کبت'],['TMK','تي ايم کي'],
    ['PAK21','ڤاک٢١'],['KSSM','کوريکولوم ستندرد سکوله منڠه'],['KKQ','ککق'],['PAI','ڤاي']
  ];
  let s=String(text||'').trim();
  pairs.forEach(p=>{s=s.split(p[0]).join(p[1]);});
  return s;
}
function rphText_(value, label) {
  const s=rphTerms_(value).replace(/(^|[\s:])(iii|ii|iv|i|v)\.(?=\s)/g,(m,p,r)=>p+({i:'أ',ii:'ب',iii:'ج',iv:'د',v:'ه'})[r]+'.');
  if (/[A-Za-z]/.test(s)) throw new Error(label+': teks Rumi masih ada. Lengkapkan nilai Jawi dalam tab sumber: '+s.slice(0,85));
  return s;
}
function rphPrefer_(rpt, bank, label) {
  const source=rphHasJawi_(rpt) ? rpt : (bank || rpt);
  if(!String(source||'').trim()) throw new Error('Data kosong: '+label);
  return rphText_(source,label);
}
function rphLoad_(ss, schedule) {
  const data={};
  const names=new Set(['KALENDAR_2027','TETAPAN_JADUAL','RUJUKAN_BUKUTEKS','BANK_REFLEKSI']);
  schedule.forEach(s=>{
    names.add(s.subject==='KKQ'?'RPT_KKQ':(s.ting===5?'RPT_PAI T5':'RPT_PAI_T'+s.ting));

  });
  names.forEach(n=>data[n]=rphRead_(ss,n));
  return data;
}
function rphSchedule_(rows, days) {
  return rows.slice(1).filter(r=>r.some(v=>String(v).trim())).map((r,i)=>{
    const day=String(r[0]||'').trim().toUpperCase();
    if(!days.includes(day)) return null;
    if(!String(r[1]||'').trim() && !String(r[2]||'').trim() && !String(r[3]||'').trim() && !String(r[4]||'').trim() && !String(r[5]||'').trim()) return null;
    const subject=String(r[1]||'').trim().toUpperCase();
    const ting=Number(r[2]);
    if(!['KKQ','PAI'].includes(subject) || !Number.isInteger(ting) || ting<1 || ting>5 || (subject==='KKQ'&&ting>3)) throw new Error('TETAPAN_JADUAL baris '+(i+2)+': subjek/tingkatan tidak sah.');
    if(!r[3] || !r[4] || !r[5]) throw new Error('TETAPAN_JADUAL baris '+(i+2)+': kelas atau masa kosong.');
    return {day,subject,ting,kelas:r[3],start:r[4],end:r[5]};
  }).filter(Boolean);
}
function rphNoLesson_(data, s, week) {
  // Minggu tanpa PdP (Ulang Kaji, Peperiksaan, atau di luar RPT): slot dikosongkan, penjanaan diteruskan.
  const rptName=s.subject==='KKQ'?'RPT_KKQ':(s.ting===5?'RPT_PAI T5':'RPT_PAI_T'+s.ting);
  const rows=data[rptName].slice(3).filter(r=>rphWeek_(r[0])===week && Number(r[3])===s.ting);
  if(!rows.length) return 'tiada rekod RPT';
  if(rows.length===1 && !String(rows[0][10]||'').trim()) { const t=String(rows[0][6]||'').trim(); if(!/^\d+$/.test(t)) return t||'tiada Kod SK'; }
  return '';
}
function rphLesson_(data, s, week) {
  const rptName=s.subject==='KKQ'?'RPT_KKQ':(s.ting===5?'RPT_PAI T5':'RPT_PAI_T'+s.ting);
  const matches=data[rptName].slice(3).filter(r=>rphWeek_(r[0])===week && Number(r[3])===s.ting);
  if(matches.length!==1) throw new Error(rptName+': perlu satu rekod Minggu '+week+', Tingkatan '+s.ting+'; ditemui '+matches.length+'.');
  const row=matches[0], code=String(row[10]||'').trim();
  if(!code) throw new Error(rptName+': Kod SK kosong bagi Minggu '+week);
  const a=null,o=null,d=null; // Semua teks Jawi kini dibaca terus daripada lajur RPT.
  const key=s.subject+' T'+s.ting+' SK '+code;
  const value=(i,bi)=>rphPrefer_(row[i],a&&a[bi],key+' '+data[rptName][2][i]);
  const refs=data.RUJUKAN_BUKUTEKS.slice(2).filter(r=>rphKey_(r[0])===rphKey_(s.ting+'-'+code));
  // Kod sama boleh wujud bagi KKQ dan PAI. Padankan nama buku juga.
  const ref=refs.filter(r=>s.subject==='KKQ'?/(ککق|ككق|KKQ|کلس کماهيرن|کلس کمهيرن)/i.test(r[4]):/(ڤنديديقن|Pendidikan|PI)/i.test(r[4]));
  if(ref.length>1) throw new Error('Rujukan buku berulang: '+key);
  let reference='';
  if(rphHasJawi_(row[37])) reference=rphText_(row[37],key+' Rujukan');
  else if(ref.length) reference=rphText_([ref[0][4],ref[0][5]?'م.س. '+ref[0][5]:'',ref[0][6]].filter(Boolean).join('؛ '),key+' Rujukan');
  else throw new Error('Rujukan buku Jawi tidak ditemui: '+key);
  const diffs=['Pemulihan','Pengukuhan','Pengayaan'].map((label,i)=>rphPrefer_(row[34+i],d&&d[4+i],key+' '+label));
  return {code,theme:rphText_(row[7],key+' Bidang'),title:rphText_(row[8],key+' Tajuk'),sk:rphText_(row[11],key+' SK'),sp:rphText_(row[12],key+' SP'),
    skills:value(14,3),objectives:rphPrefer_(row[13],o&&o[3],key+' Objektif'),success:rphPrefer_(row[33],o&&o[4],key+' Kriteria'),
    intro:value(15,5),activities:value(16,6),explanation:value(17,7),closure:value(18,8),assessment:value(19,9),
    strategy:value(20,10),method:value(21,11),bbm:value(22,12),pak:value(23,13),kbkk:value(24,14),map:value(25,15),values:value(26,16),
    thinking:value(27,17),intelligence:value(28,18),kbat:value(29,19),cocurr:value(30,20),emk:value(31,21),tests:value(32,22),reference,diffs};
}
function rphLines_(text,count) {
  const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length>count) return lines.slice(0,count-1).concat([lines.slice(count-1).join('\n')]);
  return Array.from({length:count},(_,i)=>lines[i]||'');
}
function rphCell_(requests,sheetId,row,col,value,format) {
  const cell={userEnteredValue:typeof value==='number'?{numberValue:value}:typeof value==='boolean'?{boolValue:value}:{stringValue:String(value??'')}};
  let fields='userEnteredValue';
  if(format) { cell.userEnteredFormat=format; fields+=',userEnteredFormat('+Object.keys(format).join(',')+')'; }
  requests.push({updateCells:{start:{sheetId,rowIndex:row-1,columnIndex:col-1},rows:[{values:[cell]}],fields}});
}
function rphReflection_(data,subject,title) {
  const rows=data.BANK_REFLEKSI;
  if(!rows) throw new Error('Tab BANK_REFLEKSI tidak ditemui.');
  const matches=rows.slice(2).filter(r=>String(r[0]).trim()==='UMUM-BELUM_DINILAI' && String(r[1]).split('/').map(v=>v.trim()).includes(subject));
  if(matches.length!==1) throw new Error('BANK_REFLEKSI: perlu satu rekod UMUM-BELUM_DINILAI untuk '+subject+'.');
  const fill=value=>{
    const text=String(value||'').split('{{TAJUK}}').join(title);
    if(!text.trim()) throw new Error('BANK_REFLEKSI: refleksi atau tindakan susulan kosong.');
    if(/\{\{[^}]+\}\}/.test(text)) throw new Error('Refleksi umum hanya menyokong pemegang tempat {{TAJUK}}.');
    return rphText_(text,'BANK_REFLEKSI');
  };
  return {reflection:fill(matches[0][4]),followup:fill(matches[0][5])};
}
function rphBlock_(requests,sheetId,offset,s,l,reflection) {
  const put=(r,c,v)=>rphCell_(requests,sheetId,r+offset,c,v,{textDirection:'RIGHT_TO_LEFT',wrapStrategy:'WRAP'});
  const lines=(r,text,n)=>rphLines_(text,n).forEach((v,i)=>put(r+i,4,v));
  put(15,5,rphText_(s.start,'Masa mula')); put(15,9,rphText_(s.end,'Masa akhir'));
  put(16,4,s.ting); put(16,5,rphText_(s.kelas,'Kelas'));
  put(17,4,s.subject==='KKQ'?'کلس کمهيرن القرءان (ککق)':'ڤنديديقن اسلام (ڤاي)');
  put(18,4,l.theme); put(19,4,l.title); put(20,4,l.skills); lines(21,l.sk,2); lines(23,l.sp,5);
  rphNums_(requests,sheetId,offset); lines(30,l.objectives,3); lines(33,l.success,3);
  [[36,'ڤمولا'],[40,'اکتيۏيتي'],[44,'ڤنرڠن'],[48,'ڤنوتوڤن'],[52,'ڤنيلاين']].forEach(x=>put(x[0],4,x[1]));
  lines(37,l.intro,3);lines(41,l.activities,3);lines(45,l.explanation,3);lines(49,l.closure,3);lines(53,l.assessment,3);
  lines(56,l.reference,5);
  // Draf umum daripada bank; guru boleh edit terus selepas PdP.
  // Penjanaan semula menggantikan catatan manual pada hari dipilih.
  lines(61,reflection.reflection,5);lines(66,reflection.followup,5);
  lines(71,'ڤموليهن: '+l.diffs[0]+'\nڤڠوکوهن: '+l.diffs[1]+'\nڤڠاياءن: '+l.diffs[2],5);
  // Ruang sebelah M disediakan sehingga tajuk seksyen berikutnya, tidak dipotong pada satu sel.
  const side=(r,text,n)=>rphLines_(text,n).forEach((v,i)=>put(r+i,13,v));
  side(16,l.strategy,2);side(19,l.method,2);side(22,l.bbm,2);side(30,l.pak,3);
  side(34,l.kbkk,1);side(36,l.map,2);side(39,l.values,2);side(42,l.thinking,2);side(45,l.intelligence,3);
  side(50,l.kbat,1);side(52,l.cocurr,2);side(55,l.emk,2);
  const checks=[/عملي|اکسڤريمن/,/ڤروجيک/,/ڤمبنتڠن/,/اوجين/,/ڤڤريقساءن/,/لاتيهن|کرجا رومه/,/لمبرن|لمبارن/,/ڤمرهاتين/,/کويز/,/ليسن|تسميع/,/توڬسن|توݢسن/];
  checks.forEach((re,i)=>put(58+i,16,re.test(l.tests)));
}
function rphPlan_(data,templates,week,days) {
  if(!Number.isInteger(week) || !Array.isArray(days) || !days.length || days.some(d=>!RPH_DAYS.includes(d)) || new Set(days).size!==days.length) throw new Error('Pilih minggu dan sekurang-kurangnya satu hari yang sah.');
  const calendar=rphCalendar_(data.KALENDAR_2027).find(w=>w.week===week);
  if(!calendar) throw new Error('Minggu '+week+' tiada dalam KALENDAR_2027.');
  const schedule=rphSchedule_(data.TETAPAN_JADUAL,days);
  const requests=[],summaries=[];
  days.forEach(day=>{
    const slots=schedule.filter(s=>s.day===day), offsets=RPH_OFFSETS[day], template=templates[day];
    if(!template || slots.length>offsets.length) throw new Error(day+': maksimum '+offsets.length+' slot; jadual mempunyai '+slots.length+'.');
    const sid=template.sheetId;
    rphCell_(requests,sid,7,4,week);
    rphCell_(requests,sid,9,4,RPH_JAWI[day],{textDirection:'RIGHT_TO_LEFT'});
    // Simpan sebagai tarikh serial, bukan teks; tiada penukaran zon masa.
    const date=rphDate_(calendar.date,RPH_DAYS.indexOf(day)), parts=date.split('/');
    const serial=Date.UTC(+parts[2],+parts[1]-1,+parts[0])/86400000+25569;
    rphCell_(requests,sid,11,4,serial,{numberFormat:{type:'DATE',pattern:'dd/MM/yyyy'}});
    requests.push({updateSheetProperties:{properties:{sheetId:sid,rightToLeft:true},fields:'rightToLeft'}});
    offsets.forEach((off,i)=>{
      if(template.labels[13+off] !== 'تاريخ') throw new Error(day+': struktur slot '+(i+1)+' berubah. Sila semak baris '+(14+off)+'.');
      rphSlotHeaders_(requests,sid,off);
      const s=slots[i];
      if(!s){rphClearSlot_(requests,sid,off);return;}
      // Pastikan slot memang template tarikh, bukan rekod lain selepas perubahan struktur.
      if(template.labels[13+off] !== 'تاريخ') throw new Error(day+': struktur slot '+(i+1)+' berubah. Sila semak baris '+(14+off)+'.');
      const skip=rphNoLesson_(data,s,week);
      if(skip){ rphClearSlot_(requests,sid,off); summaries.push({day:RPH_NAMES[day],slot:i+1,subject:s.subject,ting:s.ting,title:'Tiada PdP ('+skip+')',date}); return; }
      const lesson=rphLesson_(data,s,week);
      rphBlock_(requests,sid,off,s,lesson,rphReflection_(data,s.subject,lesson.title));
      summaries.push({day:RPH_NAMES[day],slot:i+1,subject:s.subject,ting:s.ting,title:lesson.title,date});
    });
  });
  return {requests,summaries};
}
function rphSlotHeaders_(requests,sid,off) {
  [[14,4,'=IF(D'+(17+off)+'="","",$D$11)'],[14,9,'=IF(D'+(17+off)+'="","",$D$9)'],[16,9,'=IF(D'+(17+off)+'="","",$D$7)']].forEach(x=>{
    requests.push({updateCells:{start:{sheetId:sid,rowIndex:x[0]+off-1,columnIndex:x[1]-1},rows:[{values:[{userEnteredValue:{formulaValue:x[2]}}]}],fields:'userEnteredValue'}});
  });
}
function rphClearSlot_(requests,sid,off) {
  // Hanya sel isian: kekalkan label, format, formula dan struktur merged cells.
  const clear=(r,c)=>rphCell_(requests,sid,r+off,c,'');
  rphNums_(requests,sid,off); [[15,5],[15,9],[16,4],[16,5]].forEach(x=>clear(x[0],x[1]));
  [17,18,19,20,21,22,23,24,25,26,27,30,31,32,33,34,35].forEach(r=>clear(r,4));
  for(let r=37;r<=75;r++)if(![40,44,48,52].includes(r))clear(r,4);
  [16,17,19,20,22,23,30,31,32,34,36,37,39,40,42,43,45,46,47,50,52,53,55,56].forEach(r=>clear(r,13));
  for(let r=58;r<=68;r++)rphCell_(requests,sid,r+off,16,false);
  // Buang butiran relief lama pada slot tidak digunakan.
  [[72,14],[73,15],[74,14],[75,14]].forEach(x=>clear(x[0],x[1]));
}
function rphGenerate(payload) {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) throw new Error('Penjana sedang digunakan. Cuba semula sebentar lagi.');
  try {
    const ss=rphSpreadsheet_(), week=Number(payload&&payload.week), days=payload&&payload.days;
    if(!Array.isArray(days)||!days.length||days.some(d=>!RPH_DAYS.includes(d))) throw new Error('Pilih sekurang-kurangnya satu hari.');
    const schedule=rphSchedule_(rphRead_(ss,'TETAPAN_JADUAL'),days), data=rphLoad_(ss,schedule), templates={};
    days.forEach(day=>{
      const sh=ss.getSheetByName(day);
      if(!sh) throw new Error('Template '+day+' tidak ditemui.');
      templates[day]={sheetId:sh.getSheetId(),labels:sh.getRange(1,2,Math.max.apply(null,RPH_OFFSETS[day])+14,1).getDisplayValues().map(r=>r[0])};
    });
    // Semua slot disahkan sebelum satu batch atomik dihantar. Jika ada data kurang, tiada template diubah.
    const plan=rphPlan_(data,templates,week,days);
    if(typeof Sheets==='undefined') throw new Error('Tambahkan Google Sheets API dalam Services Apps Script dahulu.');
    Sheets.Spreadsheets.batchUpdate({requests:plan.requests},rphSpreadsheetId_());
    // Tarikh pengesahan semakan (F7) = hari Sabtu selepas Jumaat minggu yang dijana.
    const calW=rphCalendar_(data.KALENDAR_2027).find(w=>w.week===week), fri=rphDate_(calW.date,4).split('/');
    const pg=ss.getSheetByName('PENGESAHAN SEMAKAN');
    if(pg) pg.getRange('F7').setValue(Date.UTC(+fri[2],+fri[1]-1,+fri[0]+1)/86400000+25569).setNumberFormat('dd/MM/yyyy');
    try { rphFitRows_(ss,days); } catch(e) { Logger.log('rphFitRows_: '+(e.message||e)); }
    PropertiesService.getScriptProperties().setProperty('RPH_LAST_GENERATION',JSON.stringify({week,days,generatedAt:new Date().toISOString()}));
    // Simpan automatik semasa kunci penjana masih dipegang.
    let saved=null, saveError='';
    try { saved=rphSaveWeekUnlocked_(); }
    catch(e) { saveError=e.message||String(e); }
    // toast/setActiveSheet hanya bermakna dalam sidebar; abaikan ralat apabila dipanggil dari Web App (PWA).
    try {
      ss.setActiveSheet(ss.getSheetByName(days[0]));
      ss.toast(plan.summaries.length+' RPH dijana — Minggu '+week,'Selesai',5);
    } catch(e) { Logger.log('toast: '+(e.message||e)); }
    return {week,count:plan.summaries.length,days:days.map(d=>RPH_NAMES[d]),archiveUrl:saved?saved.url:null,saveError:saveError||null,message:plan.summaries.length+' RPH berjaya dijana untuk Minggu '+week+'. Refleksi umum dan tindakan susulan telah diisi. Boleh edit terus dalam template selepas PdP.'+(saved?'\n\nSalinan disimpan: '+saved.name:'\n\nRPH telah dijana, tetapi simpanan automatik belum berjaya: '+saveError+'\nJalankan rphSaveWeek dari editor untuk cuba simpan semula tanpa menjana semula.')};
  } finally {lock.releaseLock();}
}

/** Simpan salinan minggu terakhir dijana, termasuk suntingan manual semasa. */
function rphSaveWeek() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) throw new Error('Penjana/simpanan sedang digunakan. Cuba semula sebentar lagi.');
  try { return rphSaveWeekUnlocked_(); }
  finally {lock.releaseLock();}
}

/** Dalaman: pemanggil mesti memegang kunci dokumen. */
function rphSaveWeekUnlocked_() {
  let archive=null;
  try {
    const ss=rphSpreadsheet_();
    const raw=PropertiesService.getScriptProperties().getProperty('RPH_LAST_GENERATION');
    if(!raw) throw new Error('Jana RPH dahulu menggunakan kod baharu, kemudian tekan Simpan Minggu.');
    const state=JSON.parse(raw);
    if(!Number.isInteger(state.week)||!Array.isArray(state.days)||!state.days.length||state.days.some(d=>!RPH_DAYS.includes(d))) throw new Error('Rekod minggu terakhir tidak sah. Jana RPH semula.');
    SpreadsheetApp.flush();
    // Baca semua tab sebelum mencipta fail supaya ralat sumber tidak menghasilkan fail kosong.
    const snapshots=state.days.map(day=>{
      const sh=ss.getSheetByName(day);
      if(!sh || Number(sh.getRange('D7').getValue())!==state.week) throw new Error('Minggu pada tab '+day+' berbeza daripada rekod penjana. Jana semula hari yang diperlukan.');
      const range=sh.getDataRange();
      const values=range.getValues().map(row=>row.map(v=>typeof v==='string'&&v.startsWith('=')?"'"+v:v));
      // Kekalkan checkbox; dropdown rujukan bank tidak diperlukan dalam salinan arkib.
      const validations=range.getDataValidations().map(row=>row.map(rule=>rule&&rule.getCriteriaType()===SpreadsheetApp.DataValidationCriteria.CHECKBOX?rule:null));
      return {day,source:sh,values,validations};
    });
    const first=ss.getSheetByName(state.days[0]).getRange('D11').getDisplayValue().replace(/\//g,'-');
    const name='eRPH Minggu ke-'+state.week+' ('+first+')';
    archive=SpreadsheetApp.create(name);
    archive.setSpreadsheetTimeZone(ss.getSpreadsheetTimeZone());
    archive.setSpreadsheetLocale(ss.getSpreadsheetLocale());
    const blank=archive.getSheets()[0];
    snapshots.forEach(s=>{
      const copy=s.source.copyTo(archive).setName(s.day);
      const target=copy.getRange(1,1,s.values.length,s.values[0].length);
      target.clearDataValidations();
      target.setValues(s.values); // Bekukan nilai minggu ini: tiada pergantungan pada RPT/bank asal.
      target.setDataValidations(s.validations);
      copy.setRightToLeft(true);
    });
    archive.deleteSheet(blank);
    archive.setActiveSheet(archive.getSheets()[0]);
    SpreadsheetApp.flush();
    try { const fd = rphArchiveFolder_(); if (fd) DriveApp.getFileById(archive.getId()).moveTo(fd); } catch (e) { Logger.log('Folder salinan: ' + (e.message || e)); }
    return {name,url:archive.getUrl(),days:state.days.map(d=>RPH_NAMES[d]),message:name+' telah disimpan dalam fail Google Sheets baharu.'};
  } catch(e) {
    if(archive) throw new Error('Simpanan belum lengkap. Fail separa: '+archive.getUrl()+'. '+e.message);
    throw e;
  }
}

/** Semakan sahaja: tiada penulisan. Boleh dijalankan dari editor Apps Script. */
function rphSemakMinggu1() {
  const ss=rphSpreadsheet_(),days=RPH_DAYS.slice(), schedule=rphSchedule_(rphRead_(ss,'TETAPAN_JADUAL'),days),data=rphLoad_(ss,schedule),templates={};
  days.forEach(day=>{const sh=ss.getSheetByName(day);templates[day]={sheetId:sh.getSheetId(),labels:sh.getRange(1,2,Math.max.apply(null,RPH_OFFSETS[day])+14,1).getDisplayValues().map(r=>r[0])};});
  const plan=rphPlan_(data,templates,1,days);
  console.log(JSON.stringify(plan.summaries));
  return plan.summaries;
}

// ===== PINTU MASUK WEB APP =====
/**
 * PWA (GitHub Pages) memanggil:  GET  <exec>?action=options
 *                                POST <exec>  {action:'generate', week, days}
 * Tanpa parameter action, halaman Sidebar lama dipaparkan (mod iframe sandaran).
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) return rphApi_(e);
  return HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Smart RPH')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function doPost(e) { return rphApi_(e); }

function rphApi_(e) {
  let out;
  try {
    let action, payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
      action = payload.action;
    } else {
      action = e.parameter && e.parameter.action;
    }
    let data;
    if (action === 'options') data = rphGetOptions();
    else if (action === 'generate') data = rphGenerate({week: payload.week, days: payload.days});
    else throw new Error('Tindakan tidak sah: ' + action);
    out = {ok: true, data: data};
  } catch (err) {
    out = {ok: false, error: String((err && err.message) || err)};
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// Nombor 1–3 di lajur C (dipulihkan setiap kali jana kerana limpahan teks boleh mengosongkannya).
function rphNums_(requests,sid,off) {
  [30,33,37,41,45,49,53].forEach(r=>[1,2,3].forEach((n,i)=>rphCell_(requests,sid,r+i+off,3,n)));
}
// Teks panjang: sambungan masuk ke row bawah jika row itu kosong; jika tidak, row dibesarkan.
function rphFitRows_(ss, days) {
  const id=ss.getId(), CPX=0.64, requests=[];
  PropertiesService.getScriptProperties().deleteProperty('RPH_BASE_H');
  const cap=(f,w)=>Math.max(1,Math.floor(Math.max(20,w-8)/(f*CPX)));
  const count=(t,f,w)=>{let n=0; String(t).split('\n').forEach(p=>{n+=Math.max(1,Math.ceil(p.length/cap(f,w)));}); return n;};
  const split=(t,f,w)=>{
    const paras=String(t).split('\n'), words=paras.shift().split(' '), k=cap(f,w);
    let line='';
    while(words.length){ const nx=line?line+' '+words[0]:words[0]; if(nx.length>k&&line) break; line=nx; words.shift(); }
    return [line,[words.join(' ')].concat(paras).filter(s=>s.trim()).join('\n')];
  };
  days.forEach(function(day) {
    const sh=ss.getSheetByName(day), sid=sh.getSheetId(), offs=RPH_OFFSETS[day];
    const lastRow=Math.max.apply(null,offs)+76, NC=sh.getMaxColumns();
    const meta=Sheets.Spreadsheets.get(id,{ranges:[day],fields:'sheets(data(rowMetadata(pixelSize),columnMetadata(pixelSize)),merges)'}).sheets[0];
    const rowsMeta=meta.data[0].rowMetadata||[], colsMeta=meta.data[0].columnMetadata||[];
    const colW=[]; for(let c=0;c<NC;c++) colW.push((colsMeta[c]&&colsMeta[c].pixelSize)||100);
    const R=sh.getRange(1,1,lastRow,NC), vals=R.getValues(), fx=R.getFormulas(), fs=R.getFontSizes(), ws=R.getWrapStrategies();
    const mg={}, covered={};
    (meta.merges||[]).forEach(function(g){
      mg[g.startRowIndex+'_'+g.startColumnIndex]=g;
      for(let r=g.startRowIndex;r<g.endRowIndex;r++) for(let c=g.startColumnIndex;c<g.endColumnIndex;c++)
        if(r!==g.startRowIndex||c!==g.startColumnIndex) covered[r+'_'+c]=1;
    });
    const cur=[]; for(let r=0;r<lastRow;r++) cur.push((rowsMeta[r]&&rowsMeta[r].pixelSize)||21);
    const blockOf=r=>offs.find(o=>r>=o+13&&r<=o+75);
    // Tinggi asas seragam: baris 1–13 kekal, dalam blok 32px, pemisah 21px.
    const base=cur.map((h,r)=>r<13?h:(blockOf(r)!==undefined?32:21));
    const empty=(r,c)=>vals[r][c]===''&&!fx[r][c];
    const span=(r,c)=>{const g=mg[r+'_'+c]; return g?[g.endRowIndex,g.endColumnIndex]:[r+1,c+1];};
    const width=(c,c2)=>{let w=0; for(let k=c;k<c2;k++) w+=colW[k]; return w;};
    // 1) Limpahkan teks ke row bawah yang kosong.
    for(let r=0;r<lastRow;r++) for(let c=0;c<NC;c++) {
      if(covered[r+'_'+c]) continue;
      const v=vals[r][c]; if(typeof v!=='string'||!v.trim()||fx[r][c]||String(ws[r][c])!=='WRAP') continue;
      const sp=span(r,c); if(sp[0]!==r+1) continue;
      const w=width(c,sp[1]), f=fs[r][c]||11;
      if(count(v,f,w)<2) continue;
      const n=r+1, o=blockOf(r); if(o===undefined||n>o+75||covered[n+'_'+c]) continue;
      const sp2=span(n,c); if(sp2[0]!==n+1||sp2[1]!==sp[1]||!empty(n,c)) continue;
      if(c===3) { // lajur D: jangan masuk ke seksyen baharu (label di B); nombor di C dibenarkan
        if(!empty(n,1)) continue;
        if(!empty(n,2)&&!/^\d+$/.test(String(vals[n][2]).trim())) continue;
      }
      const parts=split(v,f,w); if(!parts[1]) continue;
      vals[r][c]=parts[0]; vals[n][c]=parts[1];
      rphCell_(requests,sid,r+1,c+1,parts[0]); rphCell_(requests,sid,n+1,c+1,parts[1]);
      if(c===3&&!empty(n,2)) { vals[n][2]=''; rphCell_(requests,sid,n+1,3,''); }
    }
    // 2) Besarkan row yang masih perlu lebih satu baris.
    const need=cur.slice();
    for(let r=0;r<lastRow;r++) for(let c=0;c<NC;c++) {
      if(covered[r+'_'+c]) continue;
      const t=vals[r][c]; if(typeof t!=='string'||!t.trim()||String(ws[r][c])!=='WRAP') continue;
      const sp=span(r,c), w=width(c,sp[1]), f=fs[r][c]||11;
      let h=0; for(let k=r;k<sp[0];k++) h+=base[k];
      const nh=Math.min(count(t,f,w)*f*1.6+8,600);
      if(false&&nh>h) need[sp[0]-1]=Math.max(need[sp[0]-1],base[sp[0]-1]+(nh-h));
    }
    for(let r=0;r<lastRow;r++) { const px=Math.ceil(need[r]); if(px!==cur[r]) requests.push({updateDimensionProperties:{range:{sheetId:sid,dimension:'ROWS',startIndex:r,endIndex:r+1},properties:{pixelSize:px},fields:'pixelSize'}}); }
  });
  if(requests.length) Sheets.Spreadsheets.batchUpdate({requests:requests},id);
}

// Folder salinan = folder tempat template ini berada (guru lain cuma perlu letak template dalam folder sendiri).
function rphArchiveFolder_() {
  let id = RPH_ID;
  try { const a = SpreadsheetApp.getActiveSpreadsheet(); if (a) id = a.getId(); } catch (e) {}
  const parents = DriveApp.getFileById(id).getParents();
  return parents.hasNext() ? parents.next() : null;
}
