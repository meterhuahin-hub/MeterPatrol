document.querySelector('#loginForm').onsubmit = async e => {
 e.preventDefault(); const button=e.target.querySelector('button'); button.disabled=true;
 try { const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json','X-MeterPatrol':'1'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}); const data=await r.json(); if(!r.ok) throw Error(data.error); window.location.replace('/'); }
 catch(error){document.querySelector('#status').textContent=error.message;} finally{button.disabled=false;}
};
