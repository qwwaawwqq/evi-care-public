
const BUILD_TS = "20260518104528";
const STAGES = [
  {id:'protocol',    n:1,  title:'01 Protocol',          render:renderProtocol},
  {id:'search',      n:2,  title:'02 Search',            render:renderSearch},
  {id:'screening',   n:3,  title:'03 Screening',         render:renderScreening},
  {id:'fulltext',    n:4,  title:'04 Full-text',         render:renderFulltext},
  {id:'extraction',  n:5,  title:'05 Extraction',        render:renderExtraction},
  {id:'analysis',    n:6,  title:'06 Analysis',          render:renderAnalysis},
  {id:'grade',       n:7,  title:'07 GRADE / RoB',       render:renderGrade},
  {id:'manuscript',  n:8,  title:'08 Manuscript / Supplement', render:renderManuscriptSupplement},
  {id:'qa',          n:9,  title:'09 QA',                render:renderQA},
  {id:'submission',  n:10, title:'10 Submission',        render:renderSubmission},
  {id:'prisma',      n:11, title:'11 PRISMA flow',       render:renderPrisma},
];

const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];

function esc(s){
  if(s===null||s===undefined)return '';
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function md(text){
  if(!text)return '';
  let out=[],inP=false,inCode=false;
  const lines=String(text).split(/\r?\n/);
  for(const ln of lines){
    if(ln.trim().startsWith('```')){
      if(inP){out.push('</p>');inP=false}
      if(inCode){out.push('</pre>');inCode=false}else{out.push('<pre>');inCode=true}
      continue;
    }
    if(inCode){out.push(esc(ln)+'\n');continue}
    const s=ln.replace(/\s+$/,'');
    if(!s){if(inP){out.push('</p>');inP=false}continue}
    if(s.startsWith('# ')){if(inP){out.push('</p>');inP=false}out.push('<h3>'+esc(s.slice(2))+'</h3>');continue}
    if(s.startsWith('## ')){if(inP){out.push('</p>');inP=false}out.push('<h4>'+esc(s.slice(3))+'</h4>');continue}
    if(s.startsWith('### ')){if(inP){out.push('</p>');inP=false}out.push('<h5>'+esc(s.slice(4))+'</h5>');continue}
    let body=esc(s);
    body=body.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    body=body.replace(/\*([^*]+)\*/g,'<em>$1</em>');
    if(!inP){out.push('<p>');inP=true}else{out.push(' ')}
    out.push(body);
  }
  if(inP)out.push('</p>'); if(inCode)out.push('</pre>');
  return out.join('');
}
const PDF_COL_PATTERNS=/^(pdf_filename|pdf_file|pdf_name|pdf_path|pdf|pdf link|pdf path|file_name|filename|article_pdf|source_pdf)$/i;
function pdfLinkFor(stem,pid){
  let base=String(stem||'').split(/[\\/]/).pop();
  if(!/\.pdf$/i.test(base)) base += '.pdf';
  return `projects/${pid||state.project||''}/pdfs/${base}`;
}
function pdfCell(v,pid){
  if(v===null||v===undefined||v==='')return '';
  const s=String(v).trim();
  const base=s.split(/[\\/]/).pop();
  if(!/\.pdf$/i.test(base))return esc(s);
  return `<a href="${esc(pdfLinkFor(base,pid))}" target="_blank" rel="noopener" style="color:var(--moss);font-family:var(--mono);font-size:11px">▸ ${esc(base)}</a>`;
}
function table(rows,opts={}){
  if(!rows||!rows.length)return '<p class="muted small">No rows.</p>';
  let cols=opts.cols||Object.keys(rows[0]).filter(c=>!c.startsWith('_'));
  const max=opts.max||60;
  const subset=rows.slice(0,max);
  const pid=opts.pdfPid;
  // Hide raw URL/path columns (we render a clean ▸ PDF link via Study)
  const HIDDEN_COLS = new Set(['PDF link','PDF path','pdf_link','pdf_path']);
  cols = cols.filter(c => !HIDDEN_COLS.has(c));
  // If pid + any row has a Study column, add a synthetic trailing PDF link column
  const hasStudyKey = pid && cols.includes('Study');
  const head='<thead><tr>'+cols.map(c=>`<th>${esc(c)}</th>`).join('')
            +(hasStudyKey?'<th>PDF</th>':'')+'</tr></thead>';
  const body='<tbody>'+subset.map(r=>{
    const cells=cols.map(c=>{
      const v=r[c];
      if(pid && PDF_COL_PATTERNS.test(c)) return `<td>${pdfCell(v,pid)}</td>`;
      return `<td>${esc(v)}</td>`;
    }).join('');
    let pdfTd = '';
    if(hasStudyKey && r.Study){
      pdfTd = `<td><a href="${esc(pdfLinkFor(r.Study, pid))}" target="_blank" rel="noopener" style="color:var(--moss);font-family:var(--mono);font-size:11px;font-weight:600">▸ view</a></td>`;
    }
    return '<tr>'+cells+pdfTd+'</tr>';
  }).join('')+'</tbody>';
  const cap=opts.caption?`<caption>${esc(opts.caption)} (${rows.length} rows${rows.length>max?', showing '+max:''})</caption>`:'';
  return `<div class="table-wrap"><table>${cap}${head}${body}</table></div>`;
}
function statStrip(items){
  return '<div class="stat-strip">'+items.filter(x=>x[1]!==null&&x[1]!==undefined&&x[1]!==0).map(([l,v])=>
    `<div class="stat"><span class="stat-n">${esc(v)}</span><span class="stat-l">${esc(l)}</span></div>`).join('')+'</div>';
}

// ---- per-stage renderers ----
function renderProtocol(s, meta){
  const p=s.protocol||{};
  let out='';
  if(p.topic)out+=`<div class="card"><div class="card-head"><span class="card-title">Topic / PICO</span></div><pre>${esc(p.topic)}</pre></div>`;
  if((p.files||[]).length)out+=`<div class="card"><div class="card-head"><span class="card-title">Protocol files</span></div><ul class="pdf-list">${p.files.map(f=>`<li>${esc(f.name||f.rel)}</li>`).join('')}</ul></div>`;
  return out||'<p class="muted">No protocol content.</p>';
}
function renderSearch(s){
  const sr=s.search||{};
  let out=statStrip([
    ['Harmonized records', sr.harmonized_count],
    ['Pubmed', sr.sources?.pubmed],
    ['Embase', sr.sources?.embase],
    ['Web of Science', sr.sources?.wos],
    ['CTGov', sr.sources?.ctgov],
    ['Other', sr.sources?.other],
  ]);
  if((sr.upload_log||[]).length){
    out+=`<div class="card"><div class="card-head"><span class="card-title">Upload log</span></div>`+table(sr.upload_log,{max:30})+`</div>`;
  }
  if((sr.harmonized_sample||[]).length){
    out+=`<div class="card"><div class="card-head"><span class="card-title">Harmonized sample</span></div>`+table(sr.harmonized_sample,{max:30,caption:'First 30 of '+sr.harmonized_count})+`</div>`;
  }
  return out||'<p class="muted">No search content.</p>';
}
function renderScreening(s){
  const sc=s.screening||{};
  const c=sc.counts||{};
  let out=statStrip([
    ['Pool', sc.pool_count],
    ['Screened', sc.screened_count],
    ['Included (T/A)', c.include],
    ['Excluded (T/A)', c.exclude],
    ['Maybe', c.maybe],
  ]);
  if((sc.pool_sample||[]).length)out+=`<div class="card"><div class="card-head"><span class="card-title">Pool sample</span></div>`+table(sc.pool_sample,{max:30})+`</div>`;
  return out||'<p class="muted">No screening content.</p>';
}
function renderFulltext(s, meta){
  const ft=s.fulltext||{};
  const summ=ft.summary||{};
  const queue=ft.queue||ft.queue_sample||[];
  // Compute counts the way the original EVI-CARE shell does it
  const ta_counts={}, ft_counts={};
  for(const r of queue){
    const ta=(r.ta_decision||'').toString().toLowerCase()||'unscreened';
    ta_counts[ta]=(ta_counts[ta]||0)+1;
    const fd=(r.ft_decision||'').toString().toLowerCase()||'pending';
    ft_counts[fd]=(ft_counts[fd]||0)+1;
  }
  // In-scope = TA include/maybe AND FT != exclude AND PDF on disk
  const inScope = queue.filter(r=>{
    const ta=(r.ta_decision||'').toLowerCase();
    const fd=(r.ft_decision||'').toLowerCase();
    return (ta==='include'||ta==='maybe') && fd!=='exclude' && !!r.pdf_local;
  });

  let out='';
  // Headline strip
  out+=`<div class="card" style="padding:18px;margin-bottom:14px">
    <div style="font-family:var(--serif);font-size:20px;margin-bottom:6px">
      <strong>${inScope.length}</strong> in scope
      <span class="muted small" style="margin-left:10px">· ${ft_counts.exclude||0} excluded at FT · ${queue.length} total queue</span>
    </div>
    <div class="muted small" style="margin-bottom:10px">
      <b>T/A</b> = title/abstract screening (Stage 03 outcome) ·
      <b>Full-text</b> = reviewer decision after reading the full PDF
      (<code>pending</code> = not yet decided, not "PDF missing")
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px">`+
      Object.entries(ta_counts).map(([k,v])=>`<div style="background:#f4f4f4;padding:8px 12px;border-radius:4px"><div class="muted small">T/A: ${esc(k)}</div><b>${v}</b></div>`).join('')+
      Object.entries(ft_counts).map(([k,v])=>`<div style="background:#f4f4f4;padding:8px 12px;border-radius:4px"><div class="muted small">FT decision: ${esc(k)}</div><b>${v}</b></div>`).join('')+
    `</div>
  </div>`;

  // Included-studies table — columns: Study | Title | Journal · Year | DOI | PDF
  if(inScope.length){
    const head='<thead><tr>'+
      ['#','Study','Title','Journal · Year','DOI','PDF'].map(c=>`<th>${esc(c)}</th>`).join('')+
      '</tr></thead>';
    const body='<tbody>'+inScope.map((r,i)=>{
      // Study cell: author surname + year, clickable to PDF
      const author=(r.authors||'').split(';')[0].split(',')[0].trim() || (r.manifest_key||'').split(' ')[0];
      const yr = String(r.year||'').replace(/\.0$/,'');
      const studyLabel = author?`${esc(author)} ${esc(yr)}`:esc(yr||'—');
      const studyCell = r.pdf_local
        ? `<a href="${esc(r.pdf_local)}" target="_blank">${studyLabel}</a>`
        : studyLabel;
      // Journal · Year cell
      const jy = (r.journal && yr) ? `${esc(r.journal)} · ${esc(yr)}` :
                 (r.journal ? esc(r.journal) : esc(yr||''));
      // DOI cell — hyperlink if extracted
      const doi = String(r.doi||'').trim();
      const doiCell = doi && doi.startsWith('10.')
        ? `<a href="https://doi.org/${esc(doi)}" target="_blank" style="font-family:var(--mono);font-size:11.5px">${esc(doi)}</a>`
        : '<span class="muted">—</span>';
      // PDF cell
      const pdfCell = r.pdf_local
        ? `<a href="${esc(r.pdf_local)}" target="_blank">PDF</a>`
        : '<span class="muted">—</span>';
      return `<tr>
        <td>${i+1}</td>
        <td style="white-space:nowrap;font-weight:500">${studyCell}</td>
        <td title="${esc(r.title||'')}" style="max-width:380px">${esc(r.title||'')}</td>
        <td style="white-space:nowrap">${jy}</td>
        <td style="white-space:nowrap">${doiCell}</td>
        <td>${pdfCell}</td>
      </tr>`;
    }).join('')+'</tbody>';
    out+=`<div class="card"><div class="card-head"><span class="card-title">Included full-text studies</span><span class="tag good">${inScope.length} in scope</span></div><div class="table-wrap"><table>${head}${body}</table></div></div>`;
  }

  // Original workbook tables (e.g. Glucoma.xlsb.xlsx → 4 sheets)
  const wbt = ft.workbook_tables || [];
  for(const t of wbt){
    if(!t.rows || !t.rows.length) continue;
    out+=`<div class="card"><div class="card-head"><span class="card-title">${esc(t.name)}</span><span class="muted small" style="margin-left:8px">${t.n_total||t.rows.length} rows</span></div>`+table(t.rows,{max:60,caption:t.name})+`</div>`;
  }

  // Excluded-at-FT (with reason) — for transparency
  const excluded = queue.filter(r=>(r.ft_decision||'').toLowerCase()==='exclude');
  if(excluded.length){
    const head='<thead><tr>'+['#','Author / Year','Title','FT reason'].map(c=>`<th>${esc(c)}</th>`).join('')+'</tr></thead>';
    const body='<tbody>'+excluded.map((r,i)=>{
      const author=(r.authors||'').split(';')[0].split(',')[0].trim();
      return `<tr><td>${i+1}</td><td>${esc(author)} ${esc(r.year||'')}</td><td>${esc(r.title||'')}</td><td>${esc(r.ft_reason||'')}</td></tr>`;
    }).join('')+'</tbody>';
    out+=`<details class="card"><summary class="card-title">Excluded at full-text (${excluded.length})</summary><div class="table-wrap"><table>${head}${body}</table></div></details>`;
  }
  return out||'<p class="muted">No full-text content.</p>';
}
function renderExtraction(s){
  const ex=s.extraction||{};
  let out=statStrip([
    ['Studies', ex.studies_count],
    ['Arms', ex.arms_count],
    ['Outcomes', ex.outcomes_count],
    ['In scope', ex.in_scope_pdfs_count],
    ['Extracted (in scope)', ex.studies_extracted_in_scope_count],
    ['Arms (in scope)', ex.arms_in_scope_count],
    ['Table 1 rows', ex.manuscript_table_1_count],
    ['Table 2 rows', ex.manuscript_table_2_count],
    ['Table 3 (full)', ex.table_3_network_meta_full_count],
    ['Table 4 (Bayes)', ex.table_4_network_bayes_count],
  ]);
  // Project-specific tables injected by the builder (e.g. glaucoma's
  // Table_1_Study_Characteristics, Combined_Performance, League_Table,
  // Heterogeneity, etc.). Renders before the DR-AI canonical tables.
  const pid=state.project;
  const extra = ex.extra_tables || [];
  for(const t of extra){
    if(!t.rows || !t.rows.length) continue;
    const cap = `${t.name}${t.n_total && t.n_total > t.rows.length ? ' — first '+t.rows.length+' of '+t.n_total : ''}`;
    out+=`<div class="card"><div class="card-head"><span class="card-title">${esc(t.name)}</span><span class="muted small" style="margin-left:8px">${t.n_total||t.rows.length} rows</span></div>`+table(t.rows,{max:75,caption:cap,pdfPid:pid})+`</div>`;
  }
  for(const [k,label] of [
    ['manuscript_table_1','Table 1 (manuscript)'],
    ['manuscript_table_2','Table 2 (manuscript)'],
    ['table_3_network_meta_full','Table 3 — Network meta (full)'],
    ['table_4_network_bayes','Table 4 — Network Bayes input'],
    ['studies_head','Studies sample'],
    ['arms_head','Arms sample'],
  ]){
    if(extra.length) continue;
    const rows=ex[k];
    if(Array.isArray(rows)&&rows.length){
      out+=`<div class="card"><div class="card-head"><span class="card-title">${esc(label)}</span></div>`+table(rows,{max:50,pdfPid:pid})+`</div>`;
    }
  }
  return out||'<p class="muted">No extraction content.</p>';
}
function renderAnalysis(s, meta){
  let out='';
  const bundle=s.manuscript_bundle||{};
  const allFigs=[];
  for(const arr of [bundle.figures||[],bundle.supplement||[],s.figures||[]]){
    for(const f of arr){
      if(f && f.url && /\.(png|jpe?g|svg|webp)$/i.test(f.url)){
        allFigs.push(f);
      }
    }
  }
  if(allFigs.length){
    out+=`<div class="card"><div class="card-head"><span class="card-title">Figures</span></div><div class="figures-grid">`+
      allFigs.map(f=>`<figure><img loading="lazy" src="${esc(f.url)}" alt="${esc(f.name||'')}" /><figcaption>${esc(f.name||'')}</figcaption></figure>`).join('')+`</div></div>`;
  }
  // CSV tables (rows pre-parsed)
  const csvs=[...(bundle.figures||[]),...(bundle.supplement||[])].filter(x=>x.ext==='csv'&&Array.isArray(x.rows)&&x.rows.length);
  for(const c of csvs){
    out+=`<div class="card"><div class="card-head"><span class="card-title">${esc(c.name)}</span></div>`+table(c.rows,{max:60})+`</div>`;
  }
  const an=s.analysis||{};
  for(const [k,label] of [
    ['pooled','Pooled effect'],['nma_armlevel','NMA — arm-level'],['nma_comparative','NMA — comparative'],
    ['league','League table'],['pscores','P-scores'],
    ['dta_summary','DTA summary'],['dta_relative','DTA relative'],
  ]){
    const rows=an[k];
    if(Array.isArray(rows)&&rows.length){
      out+=`<div class="card"><div class="card-head"><span class="card-title">${esc(label)}</span></div>`+table(rows,{max:50})+`</div>`;
    }
  }
  return out||'<p class="muted">No analysis output.</p>';
}
function renderGrade(s){
  // Stage 07: GRADE Summary + QUADAS-3 / RoB
  const m=s.manuscript||{};
  let out='';
  if((m.grade_summary||[]).length){
    out+=`<div class="card"><div class="card-head"><span class="card-title">GRADE Summary of Findings</span><span class="tag">${m.grade_summary.length} systems</span></div>`+table(m.grade_summary,{max:50})+`</div>`;
  }
  if(m.rob_traffic_light){
    out+=`<div class="card"><div class="card-head"><span class="card-title">QUADAS-3 / RoB traffic-light plot</span></div><img loading="lazy" style="max-width:100%" src="${esc(m.rob_traffic_light)}" alt="QUADAS-3 traffic light" /></div>`;
  }
  if((m.rob_per_study||[]).length){
    out+=`<div class="card"><div class="card-head"><span class="card-title">QUADAS-3 per-study ratings</span><span class="tag">${m.rob_per_study.length} studies</span></div>`+table(m.rob_per_study,{max:75})+`</div>`;
  }
  return out||'<p class="muted">No GRADE / RoB content.</p>';
}
function renderManuscriptSupplement(s){
  // Stage 08: Manuscript narrative + supplement figures
  const m=s.manuscript||{};
  const bundle=s.manuscript_bundle||{};
  let out='';
  if(m.abstract_md){
    out+=`<div class="card"><div class="card-head"><span class="card-title">Abstract</span></div>${md(m.abstract_md)}</div>`;
  }
  if(m.manuscript_md){
    out+=`<div class="card"><div class="card-head"><span class="card-title">Results (narrative)</span></div>${md(m.manuscript_md)}</div>`;
  }
  if(m.status_md){
    out+=`<details class="card"><summary class="card-title">Primary-study citations</summary><pre>${esc(m.status_md)}</pre></details>`;
  }
  const supFigs=(bundle.supplement||[]).filter(f=>f.url&&/\.(png|jpe?g|svg|webp)$/i.test(f.url));
  if(supFigs.length){
    out+=`<div class="card"><div class="card-head"><span class="card-title">Supplement figures</span><span class="tag">${supFigs.length}</span></div><div class="figures-grid">`+
      supFigs.map(f=>`<figure><img loading="lazy" src="${esc(f.url)}" alt="${esc(f.name||'')}" /><figcaption>${esc(f.name||'')}</figcaption></figure>`).join('')+`</div></div>`;
  }
  const supCsvs=(bundle.supplement||[]).filter(f=>f.ext==='csv'&&Array.isArray(f.rows)&&f.rows.length);
  for(const c of supCsvs){
    out+=`<div class="card"><div class="card-head"><span class="card-title">${esc(c.name)}</span></div>`+table(c.rows,{max:60})+`</div>`;
  }
  return out||'<p class="muted">No manuscript / supplement content.</p>';
}
function renderQA(s){
  const q=s.qa||{};
  const reports=q.reports||[];
  if(!reports.length)return '<p class="muted">No QA reports.</p>';
  return reports.map(r=>
    `<details class="card"><summary class="card-title">${esc(r.name)}</summary><pre>${esc(r.preview||'')}</pre></details>`
  ).join('');
}
function renderSubmission(s){
  const sub=s.submission||{};
  const files=sub.files||[];
  if(!files.length)return '<p class="muted">No submission files.</p>';
  return `<div class="card"><div class="card-head"><span class="card-title">Submission package</span></div><ul class="pdf-list">`+
    files.map(f=>`<li>${esc(f.name)} <span class="small muted">${f.size_kb||''} KB</span></li>`).join('')+
    `</ul></div>`;
}
function renderPrisma(s){
  const p=s.prisma||{};
  return statStrip([
    ['Identified', p.identified],
    ['Screened (T/A)', p.screened],
    ['Retrieved', p.retrieved],
    ['Full-text assessed', p.fulltext_assessed],
    ['Included', p.included],
  ])||'<p class="muted">No PRISMA flow.</p>';
}

// ---- shell ----
const state = {project:null,stage:'protocol',data:null,meta:null};

function navigate(stage){
  state.stage=stage;
  $$('.nav li').forEach(li=>li.classList.toggle('active', li.dataset.stage===stage));
  const def=STAGES.find(x=>x.id===stage)||STAGES[0];
  $('#stageTitle').textContent=def.title;
  $('#stageSub').textContent=state.meta?.label||'';
  const body=def.render(state.data?.stages||{}, state.meta||{});
  $('#stageBody').innerHTML=body;
  if(stage==='fulltext' && state.meta?.pdfs){
    const ul=document.getElementById('pdfList');
    if(ul){
      ul.innerHTML=state.meta.pdfs.slice(0,300).map(name=>
        `<li><a href="pdfs/${encodeURIComponent(name)}" target="_blank">${esc(name)}</a></li>`
      ).join('') + (state.meta.pdfs.length>300?`<li class="muted">… and ${state.meta.pdfs.length-300} more</li>`:'');
    }
  }
  history.replaceState(null,'','#'+state.project+'/'+stage);
}

async function loadProject(pid){
  state.project=pid;
  const meta=window.SITE_INDEX.projects.find(p=>p.pid===pid);
  state.meta=meta;
  $('#projectSelect').value=pid;
  $('#stageTitle').textContent='Loading…';
  $('#stageSub').textContent=meta?.label || '';
  $('#stageBody').innerHTML='<div class="card" style="padding:24px;text-align:center"><div class="muted">Loading '+esc(pid)+' snapshot…</div><div class="muted small" style="margin-top:8px">(some payloads can be 500 KB-1 MB; first load may take a few seconds)</div></div>';
  let data;
  try{
    const r=await fetch(`projects/${pid}/snapshot.json?v=${BUILD_TS}`, {cache: 'reload'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    data=await r.json();
  }catch(err){
    $('#stageBody').innerHTML='<div class="card" style="padding:24px;background:#fff5d9;border-color:#e6d490"><b>Could not load '+esc(pid)+'.</b><br/><div class="muted small" style="margin-top:6px">'+esc(err.message||err)+'. Try cmd+shift+R or pick another project.</div></div>';
    return;
  }
  state.data=data;
  navigate(state.stage);
}

function buildSidebar(){
  $('#stageNav').innerHTML=STAGES.map(s=>
    `<li data-stage="${s.id}"><span class="n">${s.n.toString().padStart(2,'0')}</span><span>${esc(s.title.replace(/^\d+\s+/,''))}</span></li>`
  ).join('');
  $$('.nav li').forEach(li=>li.addEventListener('click', ()=>navigate(li.dataset.stage)));
}

function buildProjectSelect(){
  const sel=$('#projectSelect');
  sel.innerHTML=window.SITE_INDEX.projects.map(p=>
    `<option value="${esc(p.pid)}">${esc(p.label)}</option>`
  ).join('');
  sel.addEventListener('change', e=>loadProject(e.target.value));
}

async function init(){
  window.SITE_INDEX = await fetch(`site_index.json?v=${BUILD_TS}`).then(r=>r.json());
  buildSidebar();
  buildProjectSelect();
  // Initial selection from hash or first project
  const hash=location.hash.replace(/^#/,'');
  let [pid,stage]=hash.split('/');
  if(!pid||!window.SITE_INDEX.projects.find(p=>p.pid===pid)) pid=window.SITE_INDEX.projects[0].pid;
  state.stage=stage&&STAGES.find(x=>x.id===stage)?stage:'protocol';
  await loadProject(pid);
}
document.addEventListener('DOMContentLoaded', init);
