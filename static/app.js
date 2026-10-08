const $ = s => document.querySelector(s);
const form = $('#surveyForm');
let surveys = [];
const node = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
function addItem() {
  const row = document.createElement('div'); row.className = 'item';
  for (const [title, key, type] of [['ชื่ออุปกรณ์','name','text'],['ชำรุด (ชิ้น)','damaged','number'],['ใหม่ (ชิ้น)','new','number']]) {
    const label = node('label', title), input = document.createElement('input'); input.dataset.key = key; input.type = type; input.required = true;
    if (type === 'number') { input.min = 0; input.max = 1000000; input.step = 1; input.value = 0; } else input.maxLength = 200;
    label.append(input); row.append(label);
  }
  const remove = node('button','ลบ'); remove.type = 'button'; remove.className = 'secondary'; remove.onclick = () => row.remove(); row.append(remove); $('#items').append(row);
}
function filtered() { const q = $('#search').value.toLowerCase(); return surveys.filter(s => [s.location,s.meter,s.surveyor].some(v => v.toLowerCase().includes(q))); }
function render() {
  const rows = filtered(); $('#count').textContent = `${rows.length} รายการ`; $('#records').replaceChildren();
  if (!rows.length) $('#records').append(node('p','ยังไม่มีรายการที่ตรงกับการค้นหา'));
  rows.forEach(s => { const card = document.createElement('article'); card.append(node('h3',s.location),node('p',`${s.date} • มิเตอร์ ${s.meter} • ${s.surveyor}`)); const button = node('button','เปิดรายงาน'); button.onclick = () => report([s]); card.append(button); $('#records').append(card); });
}
async function load() { const r = await fetch('/api/surveys'); if (!r.ok) throw Error('โหลดข้อมูลไม่สำเร็จ'); surveys = await r.json(); render(); }
function report(rows) {
  const target = $('#reportContent'); target.replaceChildren(node('h1','รายงานการสำรวจมิเตอร์'),node('p',`จำนวนงานสำรวจ ${rows.length} รายการ`));
  let damaged = 0, fresh = 0;
  rows.forEach(s => {
    const section = document.createElement('article'); section.append(node('h2',`งานสำรวจ #${s.id} — ${s.location}`));
    for (const [label,value] of [['วันที่',s.date],['ผู้สำรวจ',s.surveyor],['เลขมิเตอร์',s.meter],['ประเภท',s.type],['เลขอ่าน',s.reading || 'ไม่ได้ระบุ']]) section.append(node('p',`${label}: ${value}`));
    const table = document.createElement('table'), head = document.createElement('tr'); ['อุปกรณ์ประกอบ','ชำรุด (ชิ้น)','ใหม่ (ชิ้น)'].forEach(t => head.append(node('th',t))); table.append(head);
    s.items.forEach(item => { const tr = document.createElement('tr'); [item.name,item.damaged,item.new].forEach(v => tr.append(node('td',v))); table.append(tr); damaged += item.damaged; fresh += item.new; });
    section.append(table,node('p',`หมายเหตุ: ${s.notes || '—'}`)); target.append(section);
  });
  target.append(node('h2',`รวมอุปกรณ์ชำรุด ${damaged} ชิ้น • อุปกรณ์ใหม่ ${fresh} ชิ้น`)); $('#report').hidden = false; $('#report').scrollIntoView({behavior:'smooth'});
}
form.onsubmit = async e => {
  e.preventDefault(); $('#saveButton').disabled = true; $('#status').textContent = 'กำลังบันทึก…';
  const data = Object.fromEntries(new FormData(form)); data.items = [...document.querySelectorAll('.item')].map(row => Object.fromEntries([...row.querySelectorAll('input')].map(input => [input.dataset.key,input.type === 'number' ? Number(input.value) : input.value])));
  try { const r = await fetch('/api/surveys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); const result = await r.json(); if (!r.ok) throw Error(result.error); form.reset(); setDate(); $('#items').replaceChildren(); addItem(); $('#status').textContent = 'บันทึกสำเร็จ'; try { await load(); } catch { $('#status').textContent = 'บันทึกสำเร็จ แต่โหลดประวัติไม่สำเร็จ กรุณารีเฟรชหน้า'; } }
  catch (error) { $('#status').textContent = error.message; } finally { $('#saveButton').disabled = false; }
};
function setDate() { const d = new Date(); form.elements.date.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
$('#addItem').onclick = addItem; $('#search').oninput = render; $('#reportButton').onclick = () => report(filtered()); $('#closeReport').onclick = () => $('#report').hidden = true; $('#printButton').onclick = () => window.print();
setDate(); addItem(); load().catch(error => $('#count').textContent = error.message);
