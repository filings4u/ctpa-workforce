(()=>{'use strict';
const C=window.PORTAL_CONFIG;
const sb=window.supabase.createClient(C.workforceUrl,C.workforceKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().replaceAll('-','_');
const pretty=v=>String(v??'—').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d)};
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0));
const statusClass=v=>/active|complete|completed|paid|eligible|final|negative|acknowledged|available|enabled/i.test(String(v))?'good':/cancel|inactive|terminated|positive|suspended|overdue|failed|closed/i.test(String(v))?'bad':'warn';
const badge=v=>`<span class="badge ${statusClass(v)}">${esc(pretty(v))}</span>`;
const page=()=>norm(document.body?.dataset?.portalPage||location.pathname.split('/').pop()?.replace('.html','')||'dashboard');
const storageKey=()=>`s4u_${C.portalCode}_${C.storageVersion||'v1'}`;
const SUPPORT_CTX_KEY='s4u_support_context';
function supportCtxRead(){try{return JSON.parse(sessionStorage.getItem(SUPPORT_CTX_KEY)||'{}')||{}}catch{return{}}}
function supportCtxWrite(patch={}){try{sessionStorage.setItem(SUPPORT_CTX_KEY,JSON.stringify({...supportCtxRead(),...patch}))}catch{}}
function rememberSupportPage(){if(page()==='support')return;supportCtxWrite({page_url:location.href,page_title:document.title,page_id:page(),captured_at:new Date().toISOString()})}
function rememberSupportError(message,source='page'){const m=String(message||'').trim();if(!m||m.length<2)return;supportCtxWrite({error_message:m.slice(0,12000),error_source:source,error_at:new Date().toISOString(),page_url:location.href,page_title:document.title,page_id:page()})}
function installSupportDiagnostics(){
  window.addEventListener('error',e=>rememberSupportError(e?.message||e?.error?.message||'JavaScript error','window.error'),true);
  window.addEventListener('unhandledrejection',e=>rememberSupportError(e?.reason?.message||e?.reason||'Unhandled promise rejection','unhandledrejection'));
  const scan=()=>{if(page()==='support')return;const sels=['#error','[data-error]','.testing-modal-error','.documents-error','.selection-error','.employer-modal-error','[role="alert"]'];for(const el of document.querySelectorAll(sels.join(','))){const t=String(el.textContent||'').trim();if(t&&!el.hidden&&t.length>1){rememberSupportError(t,'page-message');break}}};
  const start=()=>{rememberSupportPage();scan();const mo=new MutationObserver(scan);mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
installSupportDiagnostics();
const storedObj=()=>{try{return JSON.parse(localStorage.getItem(storageKey())||'{}')||{}}catch{return{}}};
const stored=()=>storedObj().membership_id||'';
const storedSub=()=>storedObj().subscription_id||'';
const saveCtx=(m,s)=>{if(m)localStorage.setItem(storageKey(),JSON.stringify({membership_id:m,subscription_id:s||''}))};
const FULL_NAV=[
{id:'dashboard',label:'Dashboard',icon:'▦',href:'/dashboard.html'},
{id:'employers',label:'Employers',icon:'▣',href:'/employers.html'},
{id:'owner-operators',label:'NON-DOT Drivers',icon:'◉',href:'/owner-operators.html'},
{id:'people',label:'Employees / NON-DOT Drivers',icon:'●',href:'/people.html'},
{id:'programs',label:'NON-DOT Programs',icon:'◆',href:'/programs.html'},
{id:'pools',label:'NON-DOT Pools',icon:'◎',href:'/pools.html'},
{id:'selections',label:'Random Selections',icon:'⌁',href:'/selections.html'},
{id:'testing',label:'NON-DOT Testing',icon:'✓',href:'/testing.html'},
{id:'results',label:'NON-DOT Results',icon:'◈',href:'/results.html'},
{id:'compliance',label:'NON-DOT Compliance',icon:'⚑',href:'/compliance.html'},
{id:'documents',label:'Documents',icon:'▤',href:'/documents.html'},
{id:'reports',label:'Reports',icon:'▥',href:'/reports.html'},
{id:'notifications',label:'Notifications',icon:'◌',href:'/notifications.html'},
{id:'employer-billing',label:'Employer Billing',icon:'$',href:'/employer-billing.html'},
{id:'billing',label:'Account Billing',icon:'$',href:'/billing.html'},
{id:'order-services',label:'Order Services',icon:'＋',href:'/order-services.html'},
{id:'order-history',label:'Order History',icon:'≡',href:'/order-history.html'},
{id:'subscription',label:'Subscription',icon:'◇',href:'/subscription.html'},
{id:'users-roles',label:'Users & Roles',icon:'♟',href:'/users-roles.html'},
{id:'locations',label:'Locations',icon:'⌖',href:'/locations.html'},
{id:'branding',label:'Branding',icon:'✦',href:'/branding.html'},
{id:'integrations',label:'Integrations',icon:'↔',href:'/integrations.html'},
{id:'audit-history',label:'Audit History',icon:'≣',href:'/audit-history.html'},
{id:'support',label:'Support',icon:'?',href:'/support.html'},
{id:'status',label:'System Status',icon:'●',href:'/status.html'}
];
let NAV=[...FULL_NAV];
const cfgPage=id=>NAV.find(x=>norm(x.id)===norm(id))||{id,label:pretty(id),icon:'•',href:`/${id}.html`};

async function getSession(){const {data:{session},error}=await sb.auth.getSession();if(error)throw error;return session}
function ctpaPayload(body={}){const o={membership_id:stored(),subscription_id:storedSub(),...body};if(!o.membership_id)delete o.membership_id;if(!o.subscription_id)delete o.subscription_id;return o}
async function invoke(name,body={}){
  const s=await getSession();if(!s)throw Object.assign(new Error('AUTH_REQUIRED'),{status:401});
  const r=await fetch(`${C.workforceUrl}/functions/v1/${name}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`,'apikey':C.workforceKey},body:JSON.stringify(ctpaPayload(body))});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.error)throw Object.assign(new Error(d.error||`Request failed (${r.status}).`),{status:r.status,payload:d});
  return d;
}
async function access(){const b={action:'session_context',requested_portal_code:C.portalCode};if(stored())b.membership_id=stored();if(storedSub())b.subscription_id=storedSub();return invoke(C.api,b)}

function shell(ctx){
  const current=page();
  NAV=[...FULL_NAV];
  const planLabel=ctx?.subscription?.plan_name||C.label;
  const links=NAV.map(x=>`<a href="${esc(x.href||('/'+x.id+'.html'))}" class="${current===norm(x.id)?'active':''}"><span class="ico">${esc(x.icon||'•')}</span><span>${esc(x.label||pretty(x.id))}</span></a>`).join('');
  document.title=`${cfgPage(current).label} | ${planLabel}`;
  if(current!=='support')supportCtxWrite({page_url:location.href,page_title:document.title,page_id:current,captured_at:new Date().toISOString()});
  document.body.className='';
  document.body.innerHTML=`<div class="app"><aside class="side" id="side"><div class="brand"><img src="/images/logo.png" alt="${esc(C.label)}"></div><nav class="nav"><div class="nav-title">${esc(planLabel)}</div>${links}</nav><div class="side-foot"><div style="font-size:9px;color:#9fb3c7">Portal</div><div style="font-size:11px;font-weight:800;color:#fff;margin-top:3px">${esc(C.domain)}</div></div></aside><main class="main"><header class="top"><div class="top-left"><button class="menu" id="menu" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="mobileNav"><span class="menu-bars" aria-hidden="true"><span></span><span></span><span></span></span></button><span class="crumb">${esc(planLabel)} / ${esc(cfgPage(current).label)}</span></div><div class="top-right"><span class="pill">${esc(C.kind==='self'?'Self Service':'Management')}</span>${C.agency?`<span class="pill">${esc(C.agency)}</span>`:''}<button class="top-support${current==='support'?' active':''}" id="supportShortcut" type="button"${current==='support'?' aria-current="page"':''}>Support</button><button class="signout" id="logout">Sign out</button></div></header><section class="mobile-nav" id="mobileNav" aria-hidden="true" aria-label="Portal navigation"><div class="mobile-nav-inner"><div class="mobile-nav-head"><div><span>Portal navigation</span><strong>${esc(planLabel)}</strong></div><span class="mobile-nav-current">${esc(cfgPage(current).label)}</span></div><nav class="mobile-nav-links">${links}</nav><div class="mobile-nav-foot"><span>${esc(C.domain)}</span><small>Select a page to close this menu.</small></div></div></section><div class="content"><div id="error"></div><section class="hero"><span class="hero-kicker">${esc(planLabel)}</span><h1>${esc(cfgPage(current).label)}</h1><p id="subtitle">Loading portal workspace.</p><div class="hero-actions" id="actions"></div></section><section class="section" id="content"><div class="panel"><div class="loading-msg">Loading…</div></div></section></div></main></div>`;
  const menuBtn=$('#menu'),mobileNav=$('#mobileNav');
  const setMobileNav=open=>{
    const isMobile=window.matchMedia('(max-width: 820px)').matches;
    const next=!!open&&isMobile;
    mobileNav?.classList.toggle('open',next);
    document.body.classList.toggle('mobile-nav-open',next);
    menuBtn?.classList.toggle('open',next);
    menuBtn?.setAttribute('aria-expanded',String(next));
    menuBtn?.setAttribute('aria-label',next?'Close navigation':'Open navigation');
    mobileNav?.setAttribute('aria-hidden',String(!next));
  };
  if(menuBtn&&mobileNav){
    menuBtn.onclick=()=>setMobileNav(!mobileNav.classList.contains('open'));
    mobileNav.addEventListener('click',e=>{if(e.target.closest('a'))setMobileNav(false)});
    window.addEventListener('resize',()=>{if(window.innerWidth>820)setMobileNav(false)},{passive:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setMobileNav(false)});
  }
  const supportShortcut=$('#supportShortcut');
  if(supportShortcut)supportShortcut.onclick=()=>{
    if(current!=='support')supportCtxWrite({page_url:location.href,page_title:document.title,page_id:current,captured_at:new Date().toISOString(),opened_from:'top_support'});
    if(current!=='support')location.href='/support.html';
  };
  $('#logout').onclick=async()=>{await sb.auth.signOut();location.replace('/login.html')};
}
function metric(label,value,note=''){return `<div class="metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note)}</span></div>`}
function read(o,keys){for(const k of keys){let v=o;for(const p of k.split('.'))v=v?.[p];if(v!==undefined&&v!==null&&v!=='')return v}return'—'}
const dateCell=v=>fmt(v),moneyCell=v=>money(v),badgeCell=v=>badge(v);
const COLS={
  employers:[['Employer',['legal_name','workforce_display_name']],['Status',['status'],badgeCell],['Classification',['workforce_classification']],['Contact',['primary_contact_email']],['State',['state']]],
  employees:[['Name',['display_name','first_name']],['Employee #',['employee_number']],['Position',['job_title']],['Worker Type',['workforce_worker_type']],['Status',['employment_status'],badgeCell]],
  programs:[['Program',['name']],['Type',['program_type'],badgeCell],['Method',['testing_method']],['Category',['regulatory_category']],['Status',['status'],badgeCell]],
  pools:[['Pool',['name']],['Type',['pool_type']],['Program',['program_id']],['Drug Rate',['drug_testing_rate']],['Status',['status'],badgeCell]],
  selections:[['Date',['selection_date','selected_at'],dateCell],['Type',['selection_type']],['Population',['population_size']],['Drug',['drug_selection_count','drug_selected']],['Status',['status'],badgeCell]],
  testing:[['Order',['order_number']],['Reason',['reason']],['Type',['test_type']],['Program',['programs.name','program_type']],['Status',['status'],badgeCell]],
  results:[['Order',['testing_orders.order_number','order_number']],['Result',['final_status','verified_result'],badgeCell],['Date',['result_date','finalized_at'],dateCell],['MRO',['mro_status'],badgeCell],['Status',['notification_status'],badgeCell]],
  compliance:[['Case',['case_number']],['Event',['event_type']],['Priority',['priority'],badgeCell],['Opened',['opened_at','created_at'],dateCell],['Status',['status'],badgeCell]],
  documents:[['File',['file_name','title']],['Type',['document_type']],['Uploaded',['uploaded_at','created_at'],dateCell],['Expires',['expires_at'],dateCell],['Access',['access_level'],badgeCell]],
  notifications:[['Subject',['subject','event_type']],['Channel',['channel']],['Status',['status'],badgeCell],['Queued',['queued_at'],dateCell]],
  invoices:[['Invoice',['invoice_number']],['Status',['status'],badgeCell],['Total',['total'],moneyCell],['Paid',['amount_paid'],moneyCell],['Due',['amount_due'],moneyCell]],
  credentials:[['Credential',['credential_type']],['Number',['credential_number']],['State',['issuing_state']],['Expires',['expires_at'],dateCell],['Status',['status'],badgeCell]],
  training:[['Training',['training_title','title']],['Provider',['provider']],['Status',['status'],badgeCell],['Completed',['completed_at'],dateCell],['Expires',['expires_at'],dateCell]],
  policies:[['Policy',['policy_name','ctpa_policy_documents.title']],['Status',['status'],badgeCell],['Distributed',['distributed_at'],dateCell],['Acknowledged',['acknowledged_at'],dateCell]],
  accidents:[['Occurred',['occurred_at'],dateCell],['Type',['accident_type']],['Required',['testing_required'],v=>badge(v===true?'required':v===false?'not required':'pending')],['Drug',['drug_test_required'],v=>badge(v===true?'required':'—')],['Alcohol',['alcohol_test_required'],v=>badge(v===true?'required':'—')]],
  members:[['User',['profiles.display_name','profiles.first_name','user_id']],['Role',['roles.name','roles.code']],['Status',['status'],badgeCell],['Primary',['is_primary'],v=>badge(v===true?'yes':'no')]]
};
function table(title,rows,cols){
  const body=rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td>${c[2]?c[2](read(r,c[1])):esc(read(r,c[1]))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}"><div class="empty">No records available.</div></td></tr>`;
  return `<div class="panel"><div class="panel-head"><div><h2>${esc(title)}</h2></div><span class="badge">${rows.length} record${rows.length===1?'':'s'}</span></div><div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></div>`;
}
function modal(title,fields,onSave){
  const b=document.createElement('div');b.className='modal-backdrop';
  const fieldHtml=fields.map(f=>{const input=f.type==='select'?`<select name="${esc(f.name)}" ${f.required?'required':''}>${(f.options||[]).map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(f.value??'')?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`:`<input type="${esc(f.type||'text')}" name="${esc(f.name)}" value="${esc(f.value||'')}" ${f.required?'required':''}>`;return `<div class="field ${f.full?'full':''}"><label>${esc(f.label)}</label>${input}</div>`}).join('');
  b.innerHTML=`<form class="modal"><h2>${esc(title)}</h2><div class="modal-grid">${fieldHtml}</div><div class="modal-actions"><button type="button" class="btn ghost" data-cancel>Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
  document.body.appendChild(b);b.querySelector('[data-cancel]').onclick=()=>b.remove();
  b.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const v=Object.fromEntries(new FormData(e.currentTarget).entries());await onSave(v);b.remove();await render(window.portalCtx)}catch(err){alert(err.message||String(err))}};
}
function setSubtitle(v){$('#subtitle').textContent=v}
function addAction(label,fn,secondary=false){const b=document.createElement('button');b.className=`btn ${secondary?'secondary':'primary'}`;b.textContent=label;b.onclick=fn;$('#actions').appendChild(b)}

function isUtilityPage(p){return ['integrations','audit-history','locations','users-roles'].includes(norm(p).replaceAll('_','-'))}
async function utilityData(p){const x=norm(p).replaceAll('_','-');return invoke(C.api,{action:'workspace',page:x==='users-roles'?'team':x})}
function utilityPersonName(m){const p=m?.profile||m?.profiles||m?.actor_profile||{};return p.full_name||p.display_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||m?.user_id||m?.actor_user_id||'Portal user'}
function utilityIntegrationsView(d){
  if(d?.not_enabled)return `<div class="notice"><strong>Integrations</strong><br>${esc(d.message||'Integrations are not enabled for this account yet.')}</div>`;
  const catalog=d.catalog||[],enable=d.enablements||[],legacy=d.integrations||[];
  const em=new Map(enable.map(x=>[String(x.integration_catalog_id),x]));
  const cards=catalog.map(x=>{const e=em.get(String(x.id)),on=e?.enabled===true||['active','enabled','connected'].includes(norm(e?.status));return `<article class="card utility-card"><div class="panel-head"><div><h3>${esc(x.name||x.code)}</h3><p>${esc(x.provider||x.category||'Integration')}</p></div>${badge(on?'enabled':(e?.status||'available'))}</div><p>${esc(x.description||'Connect this service to your NON-DOT Workforce workspace.')}</p><small>${esc(x.category||'Integration')}</small></article>`}).join('');
  const rows=legacy.map(x=>`<tr><td><strong>${esc(x.name||x.provider||'Integration')}</strong><small>${esc(x.provider||x.integration_type||'')}</small></td><td>${badge(x.status||'unknown')}</td><td>${fmt(x.last_sync_at)}</td><td>${fmt(x.updated_at)}</td>${d.can_manage?`<td><button class="mini-btn" data-integration-id="${esc(x.id)}">Manage</button></td>`:''}</tr>`).join('');
  return `${cards?`<div class="cards utility-grid">${cards}</div>`:'<div class="panel"><div class="empty">No integration catalog entries are available.</div></div>'}${legacy.length?`<div class="section panel"><div class="panel-head"><div><h2>Connected Integrations</h2><p>Current tenant-level integration connections.</p></div></div><div class="table-wrap"><table><thead><tr><th>Integration</th><th>Status</th><th>Last Sync</th><th>Updated</th>${d.can_manage?'<th></th>':''}</tr></thead><tbody>${rows}</tbody></table></div></div>`:''}`;
}
function utilityAuditView(d){
  const rows=d.audit_events||d.events||[];
  const body=rows.map(x=>`<tr><td>${fmt(x.event_at)}</td><td><strong>${esc(pretty(x.action||'activity'))}</strong></td><td>${esc(pretty(x.resource_type||'record'))}<small>${esc(x.resource_id||'')}</small></td><td>${esc(utilityPersonName(x))}</td></tr>`).join('');
  return `<div class="panel"><div class="panel-head"><div><h2>Audit History</h2><p>Recorded portal activity for this workspace.</p></div><span class="badge">${rows.length} event${rows.length===1?'':'s'}</span></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Action</th><th>Resource</th><th>Actor</th></tr></thead><tbody>${body||'<tr><td colspan="4"><div class="empty">No audit events are available for this workspace.</div></td></tr>'}</tbody></table></div></div>`;
}
function utilityLocationsView(d){
  const rows=d.locations||[];
  const body=rows.map(x=>{const employer=x.employer?.legal_name||x.employer?.dba_name||'';const addr=[x.address_line1,x.address_line2,x.city,x.state,x.postal_code].filter(Boolean).join(', ');return `<tr><td><strong>${esc(x.name||'Location')}</strong><small>${esc(employer||pretty(x.location_type||'work site'))}</small></td><td>${esc(addr||'—')}</td><td>${esc(x.phone||'—')}</td><td>${badge(x.status||'active')}</td><td>${x.is_primary?'<span class="badge good">Primary</span>':'—'}</td>${d.access_mode==='manage'&&C.kind!=='ctpa'&&C.kind!=='self'?`<td><button class="mini-btn" data-location-id="${esc(x.id)}">Edit</button></td>`:''}</tr>`}).join('');
  const note=d.assigned_only?'<div class="notice">This page shows the location currently assigned to your employee record.</div>':'';
  return `${note}<div class="panel"><div class="panel-head"><div><h2>Locations</h2><p>${C.kind==='ctpa'?'Work sites for Employers managed by this C/TPA.':'Company work sites and operating locations.'}</p></div><span class="badge">${rows.length} location${rows.length===1?'':'s'}</span></div><div class="table-wrap"><table><thead><tr><th>Location</th><th>Address</th><th>Phone</th><th>Status</th><th>Primary</th>${d.access_mode==='manage'&&C.kind!=='ctpa'&&C.kind!=='self'?'<th></th>':''}</tr></thead><tbody>${body||'<tr><td colspan="6"><div class="empty">No locations are configured yet.</div></td></tr>'}</tbody></table></div></div>`;
}
function utilityUsersRolesView(d){
  if(d?.not_enabled)return `<div class="notice"><strong>Users & Roles</strong><br>${esc(d.message||'User management is not enabled for this account yet.')}</div>`;
  const rows=d.members||[],manage=d.access_mode==='manage'||d.can_manage===true;
  const body=rows.map(m=>`<tr><td><strong>${esc(utilityPersonName(m))}</strong><small>${esc((m.profile||m.profiles||{}).email||'')}</small></td><td>${esc(m.roles?.name||pretty(m.roles?.code||'user'))}</td><td>${badge(m.status||'active')}</td><td>${m.is_primary?'<span class="badge good">Primary</span>':'—'}</td><td>${m.accepted_at?fmt(m.accepted_at):(m.invited_at?'Invite pending':'—')}</td>${manage&&String(m.user_id)!==String(d.current_user_id||'')?`<td><button class="mini-btn" data-user-role="${esc(m.id)}">Manage</button></td>`:(manage?'<td>—</td>':'')}</tr>`).join('');
  return `<div class="panel"><div class="panel-head"><div><h2>Users & Roles</h2><p>Portal access, assigned roles, and membership status for this workspace.</p></div><span class="badge">${rows.length} user${rows.length===1?'':'s'}</span></div><div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Primary</th><th>Access</th>${manage?'<th></th>':''}</tr></thead><tbody>${body||'<tr><td colspan="6"><div class="empty">No portal users are available.</div></td></tr>'}</tbody></table></div></div>`;
}
function renderUtilityPage(p,d){
  p=norm(p).replaceAll('_','-');
  if(p==='integrations')return utilityIntegrationsView(d);
  if(p==='audit_history')return utilityAuditView(d);
  if(p==='locations')return utilityLocationsView(d);
  if(p==='users-roles')return utilityUsersRolesView(d);
  return '<div class="panel"><div class="empty">No utility data available.</div></div>';
}
function bindUtilityPage(p,d,ctx){
  p=norm(p).replaceAll('_','-');
  if(p==='locations'&&d.access_mode==='manage'&&C.kind!=='ctpa'&&C.kind!=='self'){
    const openLocation=(x={})=>modal(x.id?'Edit Location':'Add Location',[
      {name:'name',label:'Location name',value:x.name||'',required:true},{name:'location_type',label:'Location type',value:x.location_type||'work_site'},
      {name:'address_line1',label:'Address line 1',value:x.address_line1||'',full:true},{name:'address_line2',label:'Address line 2',value:x.address_line2||'',full:true},
      {name:'city',label:'City',value:x.city||''},{name:'state',label:'State',value:x.state||''},{name:'postal_code',label:'ZIP / postal code',value:x.postal_code||''},
      {name:'phone',label:'Phone',type:'tel',value:x.phone||''},{name:'timezone',label:'Timezone',value:x.timezone||''},
      {name:'status',label:'Status',type:'select',value:x.status||'active',options:[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]},
      {name:'is_primary',label:'Primary location',type:'select',value:x.is_primary?'true':'false',options:[{value:'false',label:'No'},{value:'true',label:'Yes'}]}
    ],async v=>invoke(C.api,{action:'save_location',location:{...v,id:x.id||undefined,is_primary:String(v.is_primary)==='true'}}));
    addAction('Add Location',()=>openLocation({}));
    document.querySelectorAll('[data-location-id]').forEach(b=>b.onclick=()=>{const x=(d.locations||[]).find(y=>String(y.id)===String(b.dataset.locationId));if(x)openLocation(x)});
  }
  if(p==='users-roles'){
    const manage=d.access_mode==='manage'||d.can_manage===true;
    if(manage&&C.kind==='ctpa')addAction('Invite User',()=>modal('Invite C/TPA User',[{name:'first_name',label:'First name',required:true},{name:'last_name',label:'Last name',required:true},{name:'email',label:'Email',type:'email',required:true},{name:'role_code',label:'Role',type:'select',value:'ctpa_staff',options:[{value:'ctpa_staff',label:'C/TPA Staff'},{value:'ctpa_admin',label:'C/TPA Administrator'}]}],async v=>invoke(C.api,{action:'invite_staff',member:v})));
    document.querySelectorAll('[data-user-role]').forEach(b=>b.onclick=()=>{const m=(d.members||[]).find(x=>String(x.id)===String(b.dataset.userRole));if(!m)return;const opts=(d.roles||[]).map(r=>({value:r.id,label:r.name||pretty(r.code)}));modal('Manage User Role',[{name:'role_id',label:'Role',type:'select',value:m.role_id,options:opts},{name:'status',label:'Status',type:'select',value:m.status||'active',options:[{value:'active',label:'Active'},{value:'suspended',label:'Suspended'},{value:'revoked',label:'Revoked'}]}],async v=>{if(C.kind==='ctpa')return invoke(C.api,{action:'save_staff',member:{id:m.id,...v}});return invoke(C.api,{action:'save_member_role',member:{id:m.id,...v}})})});
  }
  if(p==='integrations'&&d.can_manage&&C.kind==='ctpa'){
    document.querySelectorAll('[data-integration-id]').forEach(b=>b.onclick=()=>{const x=(d.integrations||[]).find(y=>String(y.id)===String(b.dataset.integrationId));if(!x)return;modal('Manage Integration',[{name:'status',label:'Status',type:'select',value:x.status||'inactive',options:[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'disabled',label:'Disabled'}]}],async v=>invoke(C.api,{action:'save_integration_status',integration:{id:x.id,status:v.status}}))});
  }
}

async function ctpaData(p){const map={owner_operators:'people',users_roles:'team'};return invoke(C.api,{action:'workspace',page:(map[p]||p).replaceAll('_','-')})}
async function employerData(p){
  if(C.kind==='agency')return invoke(C.api,{action:'agency_workspace',agency_code:C.agency});
  if(p==='testing')return invoke(C.api,{action:'list'}).catch(()=>invoke(C.api,{action:'overview'}));
  if(p==='pools')return invoke(C.api,{action:'workspace'});
  if(p==='selections')return invoke(C.api,{action:'selection_history'}).catch(()=>invoke(C.api,{action:'selection_history'}));
  if(p==='documents')return invoke(C.api,{action:'workspace'});
  if(p==='results')return invoke(C.api,{action:'workspace'}).catch(()=>invoke(C.api,{action:'results'}));
  if(p==='notifications')return invoke(C.api,{action:'workspace'}).catch(()=>invoke(C.api,{action:'notifications'}));
  const map={dashboard:'overview',company:'settings',people:'overview',programs:'overview',pools:'overview',selections:'selection_history',compliance:'compliance_detail',reports:'reports',billing:'subscription',team:'members','post-accident':'overview'};
  return invoke(C.api,{action:map[p]||'overview'});
}
async function selfData(){return invoke(C.api,{action:'workspace',membership_id:stored()})}
async function serviceCatalog(){return {seller:{checkout_base:'https://workforce.screenings4u.com/'},services:[{name:'NON-DOT Drug Testing',description:'Workplace drug-testing services for non-regulated programs.',category:'NON-DOT Testing',amount:null,order_url:''},{name:'NON-DOT Alcohol Testing',description:'Workplace alcohol-testing services for company-policy programs.',category:'NON-DOT Testing',amount:null,order_url:''},{name:'Background Screening',description:'Employment screening services available to Workforce customers.',category:'Workforce Screening',amount:null,order_url:''}]}}

function dashboard(ctx,d){
  if(C.kind==='self'){
    const m=[['Testing',(d.testing_orders||[]).length,'My testing orders'],['Results',(d.results||d.result_reports||[]).length,'My available results'],['Documents',(d.documents||[]).length,'My documents'],['Training',(d.training||[]).length,'My training records']];
    return `<div class="metrics">${m.map(x=>metric(...x)).join('')}</div>`;
  }
  if(C.kind!=='ctpa'){
    const m=[['People',(d.employees||[]).length,'Company roster'],['Programs',(d.programs||[]).length,'Programs'],['Testing',(d.testing_orders||d.orders||[]).length,'Orders'],['Compliance',(d.compliance_cases||d.cases||[]).filter(x=>!['closed','resolved'].includes(norm(x.status))).length,'Open cases']];
    return `<div class="metrics">${m.map(x=>metric(...x)).join('')}</div>`;
  }

  const employers=d.employers||[],employees=d.employees||[],programs=d.programs||[],pools=d.pools||[],selections=d.selection_events||[],tests=d.testing_orders||[],results=d.results||[],cases=d.compliance_cases||[],notes=d.notifications||[],invoices=d.client_invoices||[];
  const activePrograms=programs.filter(x=>['active','enabled'].includes(norm(x.status))).length;
  const activePools=pools.filter(x=>!['inactive','archived','closed'].includes(norm(x.status))).length;
  const openTests=tests.filter(x=>!['complete','completed','cancelled','canceled','final','closed'].includes(norm(x.status))).length;
  const pendingSelections=selections.filter(x=>!['complete','completed','closed','cancelled','canceled'].includes(norm(x.status))).length;
  const openCases=cases.filter(x=>!['closed','resolved','complete','completed'].includes(norm(x.status))).length;
  const criticalCases=cases.filter(x=>!['closed','resolved','complete','completed'].includes(norm(x.status))&&['critical','high','urgent'].includes(norm(x.priority))).length;
  const unreadNotes=notes.filter(x=>!['read','acknowledged','completed','sent'].includes(norm(x.status))).length;
  const outstanding=invoices.reduce((n,x)=>n+Number(x.amount_due||0),0);
  const overdueInvoices=invoices.filter(x=>Number(x.amount_due||0)>0&&x.due_at&&new Date(x.due_at)<new Date()).length;
  const entitlement=d.entitlements||{};

  const metrics=[
    ['Employers',employers.length,'Managed client companies'],
    ['Covered People',employees.length,'Employees and NON-DOT drivers'],
    ['Active Programs',activePrograms,'NON-DOT programs'],
    ['Active Pools',activePools,'Random pools'],
    ['Open Testing',openTests,'Orders still in progress'],
    ['Pending Randoms',pendingSelections,'Selection events requiring action'],
    ['Open Compliance',openCases,criticalCases?`${criticalCases} high priority`:'No high-priority cases'],
    ['Outstanding Invoices',money(outstanding),overdueInvoices?`${overdueInvoices} overdue`:'No overdue invoices']
  ];

  const byEmployer=employers.map(e=>{
    const eid=e.id,workerCount=employees.filter(x=>x.employer_id===eid).length,programCount=programs.filter(x=>x.employer_id===eid).length,testOpen=tests.filter(x=>x.employer_id===eid&&!['complete','completed','cancelled','canceled','final','closed'].includes(norm(x.status))).length,caseOpen=cases.filter(x=>x.employer_id===eid&&!['closed','resolved','complete','completed'].includes(norm(x.status))).length;
    const health=caseOpen?`${caseOpen} open compliance`:(testOpen?`${testOpen} tests in progress`:'Good standing');
    const healthClass=caseOpen?'bad':testOpen?'warn':'good';
    return `<tr><td><strong>${esc(e.legal_name||e.dba_name||'Employer')}</strong><small>${esc(e.state?`State ${e.state}`:'NON-DOT Workforce')}</small></td><td>${workerCount}</td><td>${programCount}</td><td>${testOpen}</td><td><span class="badge ${healthClass}">${esc(health)}</span></td><td><a class="snapshot-link" href="/employers.html">Open</a></td></tr>`;
  }).join('')||`<tr><td colspan="6"><div class="empty">No employers have been added yet.</div></td></tr>`;

  const attention=[];
  if(criticalCases)attention.push([`${criticalCases} high-priority compliance case${criticalCases===1?'':'s'}`,'/compliance.html','Review compliance']);
  if(openTests)attention.push([`${openTests} testing order${openTests===1?'':'s'} still in progress`,'/testing.html','Review testing']);
  if(pendingSelections)attention.push([`${pendingSelections} random selection event${pendingSelections===1?'':'s'} requiring action`,'/selections.html','Review selections']);
  if(overdueInvoices)attention.push([`${overdueInvoices} overdue client invoice${overdueInvoices===1?'':'s'}`,'/employer-billing.html','Review Employer billing']);
  if(entitlement.notifications&&unreadNotes)attention.push([`${unreadNotes} notification${unreadNotes===1?'':'s'} requiring attention`,'/notifications.html','Open notifications']);
  if(!attention.length)attention.push(['No urgent items need attention right now.','#','Company is current']);

  const recentTests=tests.slice(0,6).map(x=>`<tr><td>${esc(x.order_number||'—')}</td><td>${esc((employers.find(e=>e.id===x.employer_id)||{}).legal_name||'—')}</td><td>${esc(pretty(x.reason||'—'))}</td><td>${badge(x.status)}</td></tr>`).join('')||`<tr><td colspan="4"><div class="empty">No recent testing activity.</div></td></tr>`;
  const recentResults=results.slice(0,6).map(x=>`<tr><td>${esc(x.testing_order_id||x.id||'—')}</td><td>${badge(x.final_status||x.verified_result||x.status||'available')}</td><td>${fmt(x.result_date||x.finalized_at||x.created_at)}</td></tr>`).join('')||`<tr><td colspan="3"><div class="empty">No recent results.</div></td></tr>`;
  const recentActivity=[...tests.map(x=>({type:'Testing',label:x.order_number||pretty(x.reason),date:x.updated_at||x.created_at,status:x.status})),...cases.map(x=>({type:'Compliance',label:x.case_number||pretty(x.event_type),date:x.updated_at||x.created_at,status:x.status})),...selections.map(x=>({type:'Random',label:pretty(x.selection_type||'Selection event'),date:x.updated_at||x.selection_date||x.created_at,status:x.status}))].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,8);

  return `<div class="metrics snapshot-metrics">${metrics.map(x=>metric(...x)).join('')}</div>
  <div class="section snapshot-grid">
    <div class="panel"><div class="panel-head"><div><h2>Attention Required</h2><p>Items that may need action today.</p></div></div><div class="snapshot-attention">${attention.map(([label,href,action])=>href==='#'?`<div class="attention-row good"><div><strong>${esc(label)}</strong><span>${esc(action)}</span></div></div>`:`<a class="attention-row" href="${href}"><div><strong>${esc(label)}</strong><span>${esc(action)}</span></div><span>→</span></a>`).join('')}</div></div>
    <div class="panel"><div class="panel-head"><div><h2>Plan Snapshot</h2><p>Current subscription and enabled premium services.</p></div></div><div class="snapshot-plan"><strong>${esc(d.subscription?.plans?.name||'NON-DOT Workforce C/TPA Plan')}</strong><span>${esc(d.subscription?.status?pretty(d.subscription.status):'Active')}</span><div class="plan-chips">${[['Advanced Reports','advanced_reports'],['Employer Portal Delivery','customer_portal_delivery'],['White Label','white_label'],['Branded Email','branded_email'],['Payment Processing','client_payments']].filter(([,k])=>entitlement[k]).map(([l])=>`<span>${esc(l)}</span>`).join('')||'<span>Core C/TPA Management</span>'}</div></div></div>
  </div>
  <div class="section"><div class="panel"><div class="panel-head"><div><h2>Employer Health</h2><p>Operational snapshot across every managed client.</p></div><a class="snapshot-link" href="/employers.html">Manage Employers</a></div><div class="table-wrap"><table><thead><tr><th>Employer</th><th>People</th><th>Programs</th><th>Open Tests</th><th>Health</th><th></th></tr></thead><tbody>${byEmployer}</tbody></table></div></div></div>
  <div class="section snapshot-grid">
    <div class="panel"><div class="panel-head"><div><h2>Recent Testing</h2><p>Latest testing activity across client employers.</p></div><a class="snapshot-link" href="/testing.html">View Testing</a></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Employer</th><th>Reason</th><th>Status</th></tr></thead><tbody>${recentTests}</tbody></table></div></div>
    ${entitlement.results_summary?`<div class="panel"><div class="panel-head"><div><h2>Recent Results</h2><p>Most recently posted result records.</p></div><a class="snapshot-link" href="/results.html">View Results</a></div><div class="table-wrap"><table><thead><tr><th>Order / Result</th><th>Result</th><th>Date</th></tr></thead><tbody>${recentResults}</tbody></table></div></div>`:''}
  </div>
  <div class="section"><div class="panel"><div class="panel-head"><div><h2>Recent Activity</h2><p>Latest testing, compliance, and random-selection changes.</p></div></div><div class="activity-list">${recentActivity.length?recentActivity.map(x=>`<div class="activity-row"><span class="activity-type">${esc(x.type)}</span><div><strong>${esc(x.label||'Activity')}</strong><small>${fmt(x.date)}</small></div>${badge(x.status||'updated')}</div>`).join(''):'<div class="empty">No recent activity yet.</div>'}</div></div></div>`;
}
function profileView(d){const x=d.employee||d.employer||{};return `<div class="metrics">${metric('Name',x.legal_name||[x.first_name,x.last_name].filter(Boolean).join(' ')||'—')}${metric('Email',x.email||x.primary_contact_email||'—')}${metric('Phone',x.mobile||x.phone||'—')}${metric('Status',pretty(x.employment_status||x.status||'—'))}</div>`}
function pickManagementRows(p,d){
  if(C.kind==='ctpa'){
    if(p==='employers')return[d.employers||[],'employers'];
    if(p==='people')return[d.employees||[],'employees'];
    if(p==='programs')return[d.programs||[],'programs'];
    if(p==='pools')return[d.pools||[],'pools'];
    if(p==='selections')return[d.selection_members||d.selection_events||[],'selections'];
    if(p==='testing')return[d.orders||d.testing_orders||[],'testing'];
    if(p==='results')return[d.results||[],'results'];
    if(p==='compliance')return[d.compliance_cases||d.cases||[],'compliance'];
    if(p==='documents')return[d.documents||[],'documents'];
    if(p==='notifications')return[d.notifications||[],'notifications'];
    if(p==='billing')return[d.invoices||[],'invoices'];
  }
  if(C.kind==='agency'){
    if(['drivers','covered-workers','mariners'].includes(p))return[d.employees||[],'employees'];
    if(p==='programs')return[d.programs||[],'programs'];
    if(p==='randoms')return[d.selections||[],'selections'];
    if(p==='testing')return[d.testing_orders||[],'testing'];
    if(['post-accident','serious-marine-incident','toxicology'].includes(p))return[d.post_accident_events||[],'accidents'];
    if(p==='compliance')return[d.compliance_cases||[],'compliance'];
    if(p==='documents')return[d.documents||[],'documents'];
  }
  if(p==='people')return[d.employees||[],'employees'];
  if(p==='programs')return[d.programs||[],'programs'];
  if(p==='pools')return[d.pools||[],'pools'];
  if(p==='selections')return[d.selection_members||[],'selections'];
  if(p==='testing')return[d.orders||d.testing_orders||[],'testing'];
  if(p==='results')return[d.results||[],'results'];
  if(p==='compliance')return[d.cases||d.compliance_cases||[],'compliance'];
  if(p==='documents')return[d.documents||[],'documents'];
  if(p==='notifications')return[d.notifications||[],'notifications'];
  if(p==='billing')return[d.invoices||[],'invoices'];
  if(p==='team')return[d.members||[],'members'];
  return[[],null];
}

function wireSelfActions(p,d,ctx){
  if(p==='consents'){
    const pending=(d.policies||[]).find(x=>!x.acknowledged_at);
    if(pending)addAction('Acknowledge Required Policy',()=>modal('Acknowledge Policy',[{name:'acknowledged_name',label:'Type your full name',required:true}],async v=>invoke(C.api,{action:'acknowledge_policy',membership_id:stored(),acknowledgment_id:pending.id,acknowledged_name:v.acknowledged_name})));
  }
  if(p==='credentials')addAction('Submit Credential',()=>modal('Submit Credential',[{name:'credential_type',label:'Credential type',required:true},{name:'credential_number',label:'Credential number'},{name:'issuing_state',label:'Issuing state'},{name:'expires_at',label:'Expiration date',type:'date'}],async v=>invoke(C.api,{action:'save_credential',membership_id:stored(),credential:v})));
}
function wireManagementActions(p,d,ctx){
  if(C.kind==='agency'){
    if(p==='agency-configuration'||['authorizations','contractors','random-plan','policy','anti-drug-plan','alcohol-misuse-plan','periodic-testing'].includes(p)){
      const r=(d.registrations||[])[0]||{},cfg=r.configuration||{};
      addAction('Edit Agency Configuration',()=>modal(`${C.agency} Configuration`,[{name:'account_identifier',label:'Agency account / identifier',value:r.account_identifier||''},{name:'employee_category',label:'Regulated category',value:r.employee_category||'general'},{name:'effective_date',label:'Effective date',type:'date',value:r.effective_date||new Date().toISOString().slice(0,10)}],async v=>invoke(C.api,{action:'save_agency_registration',agency_code:C.agency,registration:{agency_code:C.agency,...v,configuration:cfg,status:'active'}})));
    }
    if(p==='programs')addAction('Add Program',()=>modal(`Add ${C.agency} Program`,[{name:'name',label:'Program name',required:true},{name:'regulatory_category',label:'Regulatory category'},{name:'testing_method',label:'Testing method',value:'Urine / Breath'},{name:'effective_date',label:'Effective date',type:'date',value:new Date().toISOString().slice(0,10)}],async v=>invoke(C.api,{action:'save_agency_program',agency_code:C.agency,program:{regulatory_category:'workplace_testing',...v,status:'active'}})));
    if(['drivers','covered-workers','mariners'].includes(p))addAction('Add Covered Worker',()=>modal('Add Covered Worker',[{name:'first_name',label:'First name',required:true},{name:'last_name',label:'Last name',required:true},{name:'employee_number',label:'Employee number'},{name:'email',label:'Email',type:'email'},{name:'job_title',label:'Safety-sensitive position'}],async v=>invoke(C.api,{action:'save_employee',employee:{...v,safety_sensitive:true,workforce_worker_type:'employee',employment_status:'active'}})));
    return;
  }
  if(p==='people')addAction('Add Employee / NON-DOT Driver',()=>{
    const fields=[];
    if(C.kind==='ctpa')fields.push({name:'employer_id',label:'Client Employer',type:'select',required:true,options:(d.employers||[]).map(x=>({value:x.id,label:x.legal_name||x.dba_name||x.id}))});
    fields.push({name:'first_name',label:'First name',required:true},{name:'last_name',label:'Last name',required:true},{name:'employee_number',label:'Employee number'},{name:'email',label:'Email',type:'email'});
    fields.push({name:'job_title',label:'Job title'},{name:'workforce_worker_type',label:'Worker type',type:'select',value:'employee',options:[{value:'employee',label:'Employee'},{value:'driver',label:'NON-DOT Driver'}]},{name:'safety_sensitive',label:'Safety-sensitive',type:'select',value:'false',options:[{value:'false',label:'No'},{value:'true',label:'Yes'}]});
    modal('Add Covered Worker',fields,async v=>{
      if(C.kind==='ctpa')return invoke(C.api,{action:'save_employee',employee:{...v,employment_status:'active',safety_sensitive:String(v.safety_sensitive)==='true',workforce_worker_type:v.workforce_worker_type||'employee'}});
      return invoke(C.api,{action:'save_employee',employee:{...v,employment_status:'active',safety_sensitive:String(v.safety_sensitive)==='true',workforce_worker_type:v.workforce_worker_type||'employee'}});
    });
  });
  if(p==='programs')addAction('Add Program',()=>{
    const fields=[];
    if(C.kind==='ctpa')fields.push({name:'employer_id',label:'Client Employer',type:'select',required:true,options:(d.employers||[]).map(x=>({value:x.id,label:x.legal_name||x.dba_name||x.id}))});
    fields.push({name:'name',label:'Program name',required:true},{name:'testing_method',label:'Testing method'},{name:'effective_date',label:'Effective date',type:'date',value:new Date().toISOString().slice(0,10)});
    fields.push({name:'regulatory_category',label:'Program category',type:'select',value:'workplace_testing',options:[{value:'workplace_testing',label:'Workplace Testing'},{value:'drug_free_workplace',label:'Drug-Free Workplace'},{value:'safety_program',label:'Safety Program'},{value:'company_policy',label:'Company Policy'}]},{name:'testing_panel',label:'Testing panel'});
    modal('Add Program',fields,async v=>{
      const program={...v,program_type:'NON_DOT',status:'active'};
      if(C.kind==='ctpa')return invoke(C.api,{action:'save_program',program});
      return invoke(C.api,{action:'save_program',program});
    });
  });
  if(p==='pools'&&!window.PortalPools)addAction('Add Pool',()=>{
    const fields=[];
    if(C.kind==='ctpa')fields.push({name:'employer_id',label:'Client Employer',type:'select',options:(d.employers||[]).map(x=>({value:x.id,label:x.legal_name||x.id}))});
    fields.push({name:'name',label:'Pool name',required:true},{name:'pool_type',label:'Pool type',type:'select',value:C.kind==='ctpa'?'consortium':'employer',options:[{value:'employer',label:'Employer Pool'},{value:'consortium',label:'Consortium'}]},{name:'program_type',label:'Program type',type:'select',value:'NON_DOT',options:[{value:'NON_DOT',label:'NON-DOT'}]});
    fields.push({name:'regulatory_category',label:'Program category',type:'select',value:'workplace_testing',options:[{value:'workplace_testing',label:'Workplace Testing'},{value:'drug_free_workplace',label:'Drug-Free Workplace'},{value:'safety_program',label:'Safety Program'},{value:'company_policy',label:'Company Policy'}]},{name:'testing_panel',label:'Testing panel'});
    modal('Add Pool',fields,async v=>{
      if(C.kind==='ctpa')return invoke(C.api,{action:'save_pool',pool:v});
      return invoke(C.api,{action:'save_pool',pool:v});
    });
  });
}

async function render(ctx){
  $('#actions').innerHTML='';const p=page();
  let d;
  if(C.kind==='self')d=await selfData();else if(C.kind==='ctpa')d=await ctpaData(p);else d=await employerData(p);
  if(isUtilityPage(p))d=await utilityData(p);
  if(C.kind==='self')setSubtitle('View your own records and complete only the actions assigned to you.');
  else if(C.kind==='agency')setSubtitle(`${C.agency} company management workspace. Changes apply only to your company.`);
  else setSubtitle(p==='dashboard'?'Company-wide snapshot of employers, testing, randoms, compliance, billing, and recent activity.':'Manage your company records, people, programs, testing and compliance.');
  let html='';
  if(isUtilityPage(p))html=renderUtilityPage(p,d);
  else if(p==='dashboard')html=dashboard(ctx,d);
  else if(p==='order_services'){
    const cat=await serviceCatalog();
    const cards=(cat.services||[]).map(s=>{const href=(cat.seller?.checkout_base||'https://screenings4u.com/')+String(s.order_url||'');return `<article class="service"><h3>${esc(s.name)}</h3><p>${esc(s.description||s.category||'NON-DOT service')}</p><div class="price">${s.amount==null?'Request quote':money(s.amount)}</div><div class="seller">Seller: ${esc(s.seller_legal_name||'screenings4u, LLC')}</div><a class="btn primary" href="${esc(href)}" target="_blank" rel="noopener">Order from screenings4u</a></article>`}).join('');
    html=`<div class="notice">Services on this page are sold by <strong>screenings4u, LLC</strong>. This portal remains the compliance-management system.</div><div class="section service-grid">${cards}</div>`;
  }
  else if(C.kind==='ctpa'&&p==='order_history'&&window.AccountOrderHistory){setSubtitle('View and download receipts for your screenings4u NON-DOT Workforce C/TPA account.');html=window.AccountOrderHistory.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='subscription'&&window.AccountSubscription){setSubtitle('Review your current screenings4u NON-DOT Workforce C/TPA software subscription.');html=window.AccountSubscription.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='billing'&&window.AccountBilling){setSubtitle('View, download, and pay invoices issued to your C/TPA account by screenings4u.');html=window.AccountBilling.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='employer_billing'&&window.CtpaBilling){setSubtitle('Create, manage, download, and send invoices to your client Employers.');html=window.CtpaBilling.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='employers'&&window.CtpaEmployers){setSubtitle('Manage every client Employer, its NON-DOT company record, and who can access its Employer Portal.');html=window.CtpaEmployers.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='owner_operators'&&window.CtpaOwnerOperators){setSubtitle('Manage NON-DOT Driver customers sponsored by this C/TPA.');html=window.CtpaOwnerOperators.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='selections'&&window.CtpaSelections){setSubtitle('Run auditable random selections by consortium pool, create testing orders, export records, and deliver selections to Employer portals.');html=window.CtpaSelections.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='testing'&&window.CtpaTesting){setSubtitle('Create and monitor NON-DOT testing orders and their screenings4u fulfillment handoffs.');html=window.CtpaTesting.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='results'&&window.CtpaResults){setSubtitle('Review finalized screenings4u results, download reports, and release them to Employer portals.');html=window.CtpaResults.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='compliance'&&window.CtpaCompliance){setSubtitle('Monitor Employer compliance health, cases, documents, events, and communicate with client Employers.');html=window.CtpaCompliance.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='documents'&&window.CtpaDocuments){setSubtitle('Manage private C/TPA documents and securely view Employer-uploaded documents.');html=window.CtpaDocuments.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='reports'&&window.CtpaReports){setSubtitle('Analyze each client Employer across testing, random selections, compliance, documents, results, and operational activity.');html=window.CtpaReports.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='notifications'&&window.CtpaNotifications){setSubtitle('Review inbox conversations, action-center items, and notification delivery history.');html=window.CtpaNotifications.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='support'&&window.CtpaSupport){setSubtitle('Get help, create support requests, track ticket status, and find answers for common portal issues.');html=window.CtpaSupport.render(d,ctx);}
  else if(p==='pools'&&window.PortalPools){setSubtitle(C.kind==='ctpa'?'Create consortium pools and manage eligible pool membership.':'Manage random pools and pool participation for this Employer.');html=window.PortalPools.render(d,ctx);}
  else if(C.kind==='ctpa'&&p==='branding'&&window.CtpaBranding){setSubtitle('Control the logo and colors your sponsored Employers see in the NON-DOT Employer portal.');html=window.CtpaBranding.render(d,ctx);}
  else if(C.kind==='self'){
    if(p==='profile')html=profileView(d);
    else if(p==='my-testing')html=table('My Testing',d.testing_orders||[],COLS.testing);
    else if(p==='my-results')html=table('My Results',d.results||d.result_reports||[],COLS.results);
    else if(p==='documents')html=table('My Documents',d.documents||[],COLS.documents);
    else if(p==='credentials')html=table('My Credentials',d.credentials||[],COLS.credentials);
    else if(p==='training')html=table('Training Records',d.training||[],COLS.training)+`<div class="section"><a class="btn primary" href="https://training.screenings4u.com/" target="_blank" rel="noopener">Open Training Portal</a></div>`;
    else if(p==='consents')html=table('Consents & Acknowledgments',d.policies||[],COLS.policies);
    else if(p==='medical')html=`<div class="notice">Medical records are view-only here. Use Order Services to purchase a workplace screening from screenings4u, LLC.</div><div class="section">${table('Credentials',d.credentials||[],COLS.credentials)}</div>`;
    else html=dashboard(ctx,d);
    wireSelfActions(p,d,ctx);
  }
  else if(C.kind==='agency'){
    if(p==='company')html=profileView(d);
    else if(p==='agency-configuration'||['authorizations','contractors','random-plan','policy','anti-drug-plan','alcohol-misuse-plan','periodic-testing'].includes(p)){
      const r=(d.registrations||[])[0]||{};
      html=`<div class="panel"><div class="panel-head"><div><h2>${esc(C.agency)} Configuration</h2><p>${esc(d.agency?.primary_regulation||'Program configuration')}</p></div></div><div style="padding:16px"><div class="metrics">${metric('Account',r.account_identifier||'—')}${metric('Category',pretty(r.employee_category||'—'))}${metric('Status',pretty(r.status||'Not configured'))}${metric('Effective',fmt(r.effective_date))}</div><div class="section notice">${esc(d.agency?.metadata?.covered_workforce||'Agency-specific employer configuration.')}</div></div></div>`;
    }
    else if(p==='mis-reports'||p==='reports')html=`<div class="metrics">${metric('Testing',(d.testing_orders||[]).length)}${metric('Programs',(d.programs||[]).length)}${metric('Random Events',(d.selections||[]).length)}${metric('Compliance',(d.compliance_cases||[]).length)}</div>`;
    else {const [rows,key]=pickManagementRows(p,d);html=key?table(cfgPage(p).label,rows,COLS[key]):`<div class="panel"><div class="empty">No records available.</div></div>`}
    wireManagementActions(p,d,ctx);
  }
  else {
    if(p==='company')html=profileView(d);
    else if(p==='reports')html=`<div class="metrics">${metric('Testing',(d.testing||d.testing_orders||[]).length)}${metric('Programs',(d.program_enrollment||d.programs||[]).length)}${metric('Pools',(d.pool_membership||d.pools||[]).length)}${metric('Compliance',(d.compliance||d.cases||[]).length)}</div>`;
    else if(p==='post-accident')html=`<div class="notice">Post-accident activity is managed through Testing and Compliance. NON-DOT service purchases are available from Order Services.</div><div class="section">${table('Post-Accident Testing',(d.testing_orders||[]).filter(x=>norm(x.reason)==='post_accident'),COLS.testing)}</div>`;
    else {const [rows,key]=pickManagementRows(p,d);html=key?table(cfgPage(p).label,rows,COLS[key]):`<div class="panel"><div class="empty">No records available.</div></div>`}
    wireManagementActions(p,d,ctx);
  }
  $('#content').innerHTML=html||`<div class="panel"><div class="empty">No data available.</div></div>`;
  if(isUtilityPage(p))bindUtilityPage(p,d,ctx);
  if(p==='order_history'&&window.AccountOrderHistory)window.AccountOrderHistory.bind(d,ctx);
  if(p==='subscription'&&window.AccountSubscription)window.AccountSubscription.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='billing'&&window.AccountBilling)window.AccountBilling.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='employer_billing'&&window.CtpaBilling)window.CtpaBilling.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='employers'&&window.CtpaEmployers)window.CtpaEmployers.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='owner_operators'&&window.CtpaOwnerOperators)window.CtpaOwnerOperators.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='selections'&&window.CtpaSelections)window.CtpaSelections.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='testing'&&window.CtpaTesting)window.CtpaTesting.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='results'&&window.CtpaResults)window.CtpaResults.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='compliance'&&window.CtpaCompliance)window.CtpaCompliance.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='documents'&&window.CtpaDocuments)window.CtpaDocuments.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='reports'&&window.CtpaReports)window.CtpaReports.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='notifications'&&window.CtpaNotifications)window.CtpaNotifications.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='support'&&window.CtpaSupport)window.CtpaSupport.bind(d,ctx);
  if(p==='pools'&&window.PortalPools)window.PortalPools.bind(d,ctx);
  if(C.kind==='ctpa'&&p==='branding'&&window.CtpaBranding)window.CtpaBranding.bind(d,ctx);
}

async function init(){
  try{const s=await getSession();if(!s){location.replace('/login.html');return}const ctx=await access();if(ctx.requires_workspace_selection){location.replace('/workspace.html');return}if(!ctx.has_access)throw new Error(ctx.reason||'Portal access denied.');saveCtx(ctx.membership?.id,ctx.subscription?.id||'');window.portalCtx=ctx;shell(ctx);await render(ctx)}
  catch(e){if(e.status===401||e.message==='AUTH_REQUIRED'){await sb.auth.signOut();location.replace('/login.html');return}document.body.className='login-page';document.body.innerHTML=`<main class="login-card"><img class="login-logo" src="/images/logo.png"><h1>Portal unavailable</h1><p>${esc(e.message||String(e))}</p><a class="btn primary" href="/login.html">Return to login</a></main>`}
}
window.Portal={invoke,sb,refresh:()=>render(window.portalCtx)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
