(async()=>{
  const C=window.PORTAL_CONFIG,sb=window.supabase.createClient(C.workforceUrl,C.workforceKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await sb.auth.getSession();if(!session){location.replace('/login.html');return}
  const q=new URLSearchParams(location.search),membership_id=q.get('membership_id')||q.get('id')||'',subscription_id=q.get('subscription_id')||'';
  const r=await fetch(`${C.workforceUrl}/functions/v1/${C.api}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':C.workforceKey},body:JSON.stringify({action:'session_context',requested_portal_code:C.portalCode,membership_id,subscription_id})});
  const d=await r.json().catch(()=>({}));if(!r.ok){document.getElementById('msg').textContent=d.error||d.reason||'Unable to load NON-DOT Workforce workspace.';return}
  const key=`s4u_${C.portalCode}_${C.storageVersion}`;
  if(d.requires_workspace_selection){document.getElementById('choices').innerHTML=(d.workspaces||[]).map(w=>`<a class="card" style="display:block;margin:8px 0" href="/workspace.html?membership_id=${encodeURIComponent(w.membership_id||'')}&subscription_id=${encodeURIComponent(w.subscription_id||'')}"><strong>${w.plan_name||'NON-DOT Workforce subscription'}</strong><span style="display:block;margin-top:4px;color:#6d7f92">${w.organization_name||''}</span></a>`).join('');return}
  if(d.membership?.id)localStorage.setItem(key,JSON.stringify({membership_id:d.membership.id,subscription_id:d.subscription?.id||subscription_id||''}));location.replace('/dashboard.html');
})();
