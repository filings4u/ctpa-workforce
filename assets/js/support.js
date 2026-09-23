(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(d)};
const pretty=v=>String(v??'—').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
const statusClass=v=>/resolved|closed|complete/i.test(String(v))?'good':/urgent|critical|failed/i.test(String(v))?'bad':'warn';
const emailFrom=ctx=>ctx?.user?.email||ctx?.profile?.email||ctx?.membership?.email||'';
const CTX_KEY='s4u_support_context';

function storedContext(){
  let x={};try{x=JSON.parse(sessionStorage.getItem(CTX_KEY)||'{}')||{}}catch{}
  const q=new URLSearchParams(location.search),src=q.get('source')||q.get('from')||'';
  let ref='';try{ref=document.referrer||''}catch{}
  const own=location.origin+location.pathname;
  if(ref&&ref.startsWith(location.origin)&&ref.split('?')[0]!==own)x.page_url=x.page_url||ref;
  if(src)x.page_url=src;
  return x;
}
function countsFrom(tickets){
  const c={open:0,in_progress:0,waiting_customer:0,resolved:0};
  for(const t of tickets){const s=String(t.status||'open').toLowerCase();if(s==='in_progress')c.in_progress++;else if(s==='waiting_customer')c.waiting_customer++;else if(['resolved','closed','complete','completed'].includes(s))c.resolved++;else c.open++;}
  return c;
}
function ticketRows(tickets){
  if(!tickets.length)return `<tr><td colspan="6"><div class="support-empty"><div class="support-empty-icon">✓</div><strong>No support requests yet</strong><span>When you create a ticket, its status and updates will appear here.</span></div></td></tr>`;
  return tickets.map(t=>`<tr data-ticket-row data-status="${esc(String(t.status||'open').toLowerCase())}" data-search="${esc([t.ticket_number,t.subject,t.category,t.priority,t.status].join(' ').toLowerCase())}"><td><strong>${esc(t.ticket_number||'Pending')}</strong><small>${esc(t.subject||'')}</small></td><td>${esc(pretty(t.category))}</td><td><span class="badge ${statusClass(t.priority)}">${esc(pretty(t.priority))}</span></td><td><span class="badge ${statusClass(t.status)}">${esc(pretty(t.status))}</span></td><td>${fmt(t.created_at)}</td><td>${fmt(t.updated_at)}</td></tr>`).join('');
}
function customerTicketRows(tickets){
  if(!tickets.length)return `<tr><td colspan="7"><div class="support-empty"><strong>No Employer customer support requests</strong><span>Tickets submitted by your sponsored Employer customers will appear here.</span></div></td></tr>`;
  return tickets.map(t=>`<tr data-customer-ticket="${esc(t.id)}"><td><strong>${esc(t.ticket_number||'Pending')}</strong><small>${esc(t.subject||'')}</small></td><td>${esc(t.organizations?.legal_name||'Employer')}</td><td>${esc(pretty(t.category))}</td><td><span class="badge ${statusClass(t.priority)}">${esc(pretty(t.priority))}</span></td><td><span class="badge ${statusClass(t.status)}">${esc(pretty(t.status))}</span></td><td>${fmt(t.created_at)}</td><td><select data-ticket-status><option value="open" ${t.status==='open'?'selected':''}>Open</option><option value="in_progress" ${t.status==='in_progress'?'selected':''}>In progress</option><option value="waiting_customer" ${t.status==='waiting_customer'?'selected':''}>Waiting on customer</option><option value="resolved" ${t.status==='resolved'?'selected':''}>Resolved</option><option value="closed" ${t.status==='closed'?'selected':''}>Closed</option></select></td></tr>`).join('');
}
function diagnosticFields(ctx={}){
  const c=storedContext(),url=c.page_url||c.url||'',title=c.page_title||'',detected=c.error_message||c.detected_error||'';
  return `<div class="support-diagnostics full">
    <div class="support-diagnostics-head"><div><strong>Page & Error Details</strong><span>These details help support reproduce the issue faster.</span></div><span class="support-auto-badge">Auto captured</span></div>
    <div class="support-form-grid support-diagnostics-grid">
      <div class="field full"><label for="supportPageUrl">Page URL</label><input id="supportPageUrl" name="page_url" value="${esc(url)}" placeholder="${esc(location.href)}"><small class="support-field-help">Automatically filled from the portal page you were viewing before Support.</small></div>
      <div class="field full"><label for="supportDetectedError">Detected page error</label><textarea id="supportDetectedError" name="detected_error" rows="3" placeholder="If the portal detected an error message, it will appear here automatically.">${esc(detected)}</textarea></div>
      <div class="field full"><label class="support-label-with-tip" for="supportConsoleError">Console / F12 error message <span class="support-tooltip" tabindex="0" aria-label="Console error instructions">?<span role="tooltip">Click F12, go to the console, and copy and paste the entire message.</span></span></label><textarea id="supportConsoleError" name="console_error" rows="5" placeholder="Paste the entire console error here, including the first error line and stack trace if shown."></textarea></div>
      <input type="hidden" name="page_title" value="${esc(title)}">
    </div>
  </div>`;
}

function render(d={},ctx={}){
  const tickets=Array.isArray(d.tickets)?d.tickets:[];
  const counts=d.counts||countsFrom(tickets);
  const customerTickets=Array.isArray(d.customer_tickets)?d.customer_tickets:[];
  const customerCounts=d.customer_counts||countsFrom(customerTickets);
  const email=emailFrom(ctx);
  return `
  <div class="support-shell">
    <div class="metrics support-metrics">
      <div class="metric"><small>Open</small><strong>${Number(counts.open||0)}</strong><span>New requests awaiting review</span></div>
      <div class="metric"><small>In Progress</small><strong>${Number(counts.in_progress||0)}</strong><span>Currently being worked</span></div>
      <div class="metric"><small>Waiting on You</small><strong>${Number(counts.waiting_customer||0)}</strong><span>Support needs your response</span></div>
      <div class="metric"><small>Resolved</small><strong>${Number(counts.resolved||0)}</strong><span>Completed support requests</span></div>
    </div>

    <div class="support-grid section">
      <section class="panel support-request-card">
        <div class="panel-head support-card-head">
          <div><h2>Create a Support Request</h2><p>Tell us what is happening and what you were trying to do.</p></div>
          <span class="support-tag">Customer Support</span>
        </div>
        <form class="support-form" id="supportRequestForm">
          <div class="support-form-grid">
            <div class="field"><label for="supportCategory">Issue type</label><select id="supportCategory" name="category" required><option value="">Choose an issue type</option><option value="portal_access">Portal access / login</option><option value="employer_management">Employer management</option><option value="employee_driver">Drivers / employees</option><option value="random_programs">Random programs / pools</option><option value="selections_testing">Selections / testing</option><option value="results_compliance">Results / compliance</option><option value="documents_reports">Documents / reports</option><option value="billing">Billing / subscription</option><option value="technical">Technical error</option><option value="other">Other</option></select></div>
            <div class="field"><label for="supportPriority">Priority</label><select id="supportPriority" name="priority" required><option value="normal">Normal</option><option value="high">High — blocking work</option><option value="urgent">Urgent — business critical</option><option value="low">Low — question / request</option></select></div>
            <div class="field full"><label for="supportSubject">Subject</label><input id="supportSubject" name="subject" maxlength="140" placeholder="Briefly describe the issue" required></div>
            <div class="field full"><label for="supportDescription">What happened?</label><textarea id="supportDescription" name="message" rows="6" maxlength="10000" placeholder="Describe what you were doing, what you expected to happen, and what actually happened." required></textarea><small class="support-field-help">Include the steps we can use to reproduce the issue.</small></div>
            <div class="field"><label for="supportEmail">Reply-to email</label><input id="supportEmail" name="email" type="email" value="${esc(email)}" placeholder="name@company.com" required></div>
            <div class="field"><label for="supportContact">Preferred contact</label><select id="supportContact" name="preferred_contact"><option value="email">Email</option><option value="phone">Phone</option><option value="portal">Portal update</option></select></div>
            ${diagnosticFields(ctx)}
          </div>
          <div class="support-form-foot">
            <div class="support-form-note"><strong>Before submitting:</strong> Do not include passwords, full SSNs, medical details, or other unnecessary sensitive information.</div>
            <button type="submit" class="btn primary" id="supportSubmit">Submit Support Request</button>
          </div>
          <div class="support-stage-message" id="supportStageMessage" hidden></div>
        </form>
      </section>

      <aside class="support-side-stack">
        <section class="panel support-help-card">
          <div class="panel-head"><div><h2>Quick Help</h2><p>Try these first for common portal issues.</p></div></div>
          <div class="support-help-list">
            <a href="/login.html"><span class="support-help-icon">↻</span><span><strong>Sign-in or session issue</strong><small>Return to login and start a fresh session.</small></span><b>→</b></a>
            <a href="/employers.html"><span class="support-help-icon">▦</span><span><strong>Employer access</strong><small>Review Employer users and portal access.</small></span><b>→</b></a>
            <a href="/testing.html"><span class="support-help-icon">◆</span><span><strong>Testing workflow</strong><small>Review testing orders and current statuses.</small></span><b>→</b></a>
            <a href="/billing.html"><span class="support-help-icon">$</span><span><strong>Account billing</strong><small>View and pay screenings4u invoices for your C/TPA account.</small></span><b>→</b></a><a href="/employer-billing.html"><span class="support-help-icon">$</span><span><strong>Employer billing</strong><small>Create and manage invoices for your Employer customers.</small></span><b>→</b></a>
          </div>
        </section>
        <section class="panel support-expect-card">
          <div class="panel-head"><div><h2>What Happens Next</h2><p>Every request follows the same support workflow.</p></div></div>
          <ol class="support-steps">
            <li><span>1</span><div><strong>Ticket created</strong><small>Your request receives a ticket number.</small></div></li>
            <li><span>2</span><div><strong>Support review</strong><small>Our team reviews the issue and account context.</small></div></li>
            <li><span>3</span><div><strong>Status updates</strong><small>You can follow progress from this page.</small></div></li>
            <li><span>4</span><div><strong>Resolution</strong><small>The ticket is closed after the issue is addressed.</small></div></li>
          </ol>
        </section>
        <section class="panel support-status-card">
          <a class="support-status-link" href="/status.html" target="_blank" rel="noopener">
            <span class="support-status-copy">
              <span class="support-status-kicker"><span class="support-status-dot" aria-hidden="true"></span>System Status</span>
              <span class="support-status-title">View system health & outages</span>
              <small>See current service status, active incidents, maintenance, and recent resolutions.</small>
            </span>
            <span class="support-status-arrow" aria-hidden="true">→</span>
          </a>
        </section>
      </aside>
    </div>

    <section class="panel section support-ticket-panel">
      <div class="panel-head support-ticket-head">
        <div><h2>Your Support Requests</h2><p>Track tickets submitted from this C/TPA workspace.</p></div>
        <div class="support-ticket-tools"><input type="search" id="supportTicketSearch" placeholder="Search tickets"><select id="supportTicketStatus"><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_customer">Waiting on you</option><option value="resolved">Resolved</option></select></div>
      </div>
      <div class="table-wrap"><table class="support-ticket-table"><thead><tr><th>Ticket</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th><th>Updated</th></tr></thead><tbody id="supportTicketRows">${ticketRows(tickets)}</tbody></table></div>
    </section>

    <section class="panel section support-ticket-panel">
      <div class="panel-head support-ticket-head"><div><h2>Employer Customer Support</h2><p>Support requests from Employers sponsored by your C/TPA. These requests are routed to your team and are not placed in the screenings4u Admin support queue.</p></div><div><span class="badge warn">${Number(customerCounts.open||0)+Number(customerCounts.in_progress||0)} active</span></div></div>
      <div class="table-wrap"><table class="support-ticket-table"><thead><tr><th>Ticket</th><th>Employer</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th><th>Update Status</th></tr></thead><tbody>${customerTicketRows(customerTickets)}</tbody></table></div>
    </section>

    <div class="support-lower-grid section">
      <section class="panel support-faq-card">
        <div class="panel-head"><div><h2>Frequently Asked Questions</h2><p>Common questions about your NON-DOT Workforce C/TPA workspace.</p></div></div>
        <div class="support-faqs">
          <details><summary>Why can’t an Employer user sign in?</summary><p>Confirm the Employer is active, the user has an Employer Portal role, and access has not been suspended or revoked.</p></details>
          <details><summary>Why is a testing result not showing yet?</summary><p>Only finalized results are available in the Results workspace. Employer delivery is a separate step after the C/TPA reviews the finalized result.</p></details>
          <details><summary>Where do I manage random pools?</summary><p>Use the Pools page to manage consortium pools and eligible membership, then use Selections to run and review random selection events.</p></details>
          <details><summary>Where can I find compliance issues?</summary><p>The Compliance page summarizes Employer health, open cases, overdue work, pending testing, and expiring compliance documents.</p></details>
        </div>
      </section>
      <section class="panel support-contact-card">
        <div class="panel-head"><div><h2>Support Coverage</h2><p>Send the request to the right team the first time.</p></div></div>
        <div class="support-contact-list">
          <div><span>Technical</span><strong>Portal errors, page behavior, login, access</strong></div>
          <div><span>Operations</span><strong>Testing, selections, pools, compliance workflow</strong></div>
          <div><span>Account</span><strong>Billing, subscription, account administration</strong></div>
        </div>
        <div class="support-security-note"><strong>Security reminder</strong><span>Support will never ask you to send a password. Avoid placing sensitive employee data in a ticket unless it is necessary to resolve the issue.</span></div>
      </section>
    </div>
  </div>`;
}

function bind(d={},ctx={}){
  const form=document.getElementById('supportRequestForm'),msg=document.getElementById('supportStageMessage'),btn=document.getElementById('supportSubmit');
  form?.addEventListener('submit',async e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const v=Object.fromEntries(new FormData(form).entries());
    if(btn){btn.disabled=true;btn.textContent='Submitting…'}
    if(msg){msg.hidden=false;msg.className='support-stage-message';msg.textContent='Creating your support ticket…'}
    try{
      const r=await window.Portal.invoke(window.PORTAL_CONFIG.api,{action:'create',...v,page_title:v.page_title||document.title,portal_page:storedContext().page_id||null});
      const ticket=r.ticket?.ticket_number||'created';
      const customerOk=r.email_delivery?.customer!==false,adminOk=r.email_delivery?.admin!==false;
      if(msg){msg.className='support-stage-message success';msg.innerHTML=`<strong>Support request ${esc(ticket)} created.</strong><span>${customerOk?'A confirmation email was sent to you.':'Your ticket was saved, but the confirmation email could not be sent.'} ${adminOk?'The screenings4u support team was notified.':'The ticket is in the support queue; admin email delivery needs attention.'}</span>`;msg.scrollIntoView({block:'nearest',behavior:'smooth'});}
      form.querySelector('#supportSubject').value='';form.querySelector('#supportDescription').value='';form.querySelector('#supportConsoleError').value='';
      await window.Portal.refresh();
    }catch(err){if(msg){msg.className='support-stage-message error';msg.textContent=err.message||String(err);msg.scrollIntoView({block:'nearest',behavior:'smooth'});}}
    finally{if(btn){btn.disabled=false;btn.textContent='Submit Support Request'}}
  });
  const search=document.getElementById('supportTicketSearch'),status=document.getElementById('supportTicketStatus');
  const filter=()=>{const q=String(search?.value||'').trim().toLowerCase(),s=String(status?.value||'all').toLowerCase();document.querySelectorAll('[data-ticket-row]').forEach(row=>{const hay=String(row.dataset.search||''),rs=String(row.dataset.status||'');row.hidden=!((!q||hay.includes(q))&&(s==='all'||rs===s));});};
  search?.addEventListener('input',filter);status?.addEventListener('change',filter);
  document.querySelectorAll('[data-customer-ticket] [data-ticket-status]').forEach(sel=>sel.addEventListener('change',async()=>{const row=sel.closest('[data-customer-ticket]');sel.disabled=true;try{await window.Portal.invoke(window.PORTAL_CONFIG.api,{action:'update_customer_ticket',ticket_id:row.dataset.customerTicket,status:sel.value});await window.Portal.refresh()}catch(err){alert(err.message||String(err));sel.disabled=false}}));
}
window.CtpaSupport={render,bind};
})();
