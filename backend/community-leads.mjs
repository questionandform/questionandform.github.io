/* Private, provider-neutral Phase 2 scaffold. No publication, email or routing side effects.
   Never call admin functions with visitor-supplied authorization. */
export const CONSENT_VERSION = Object.freeze({ community:"community-v1-2026-10-15", human_help:"human-help-v1-2026-10-15", contact:"contact-v1-2026-10-15" });
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEAD_TYPES=["tutoring","design_advice","3d_visualization","small_home_project","decorative_art","repair","other"];
const STATES=["new","needs_information","reviewed","preferred_provider_candidate","other_provider_candidate","offered","accepted","declined","closed","spam"];
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
function object(value,keys) {
 if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k))) fail("invalid_phase2_fields");
 return value;
}
function pick(value,allowed,fallback) { if(value===undefined||value==="")return fallback; if(!allowed.includes(value))fail("invalid_help_option");return value; }
function text(value,max=120) {
 if(value===undefined||value==="")return "";
 if(typeof value!=="string"||value.length>max||/[\u0000-\u001f<>]/.test(value))fail("invalid_help_text");
 return value.trim();
}
function broadLocation(value) { const s=text(value,80);if(/[0-9@]|https?:|\b(street|road|avenue|apartment|postcode|zip)\b|רחוב/i.test(s))fail("broad_location_only");return s; }
function email(value) { if(typeof value!=="string"||value.length>254||/[\r\n]/.test(value)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))fail("invalid_contact_email");return value.trim(); }
export function normalizeOptions(value,agent,env={}) {
 const empty={community:false,human_help:false,contact:false,minor_related:agent==="THINK",help:{},contact_email:""};
 if(value===undefined)return empty;
 object(value,["consents","help","contact_email"]);
 const c=object(value.consents===undefined?{}:value.consents,["community","human_help","contact"]);
 const consents={};
 for(const scope of Object.keys(CONSENT_VERSION)){
  const entry=c[scope]===undefined?{granted:false,version:CONSENT_VERSION[scope]}:object(c[scope],["granted","version"]);
  if(typeof entry.granted!=="boolean"||entry.version!==CONSENT_VERSION[scope])fail("invalid_consent_version");
  consents[scope]=entry.granted;
 }
 if(consents.contact&&!consents.human_help)fail("contact_requires_human_help_consent");
 if(!consents.human_help&&(value.contact_email||Object.keys(value.help||{}).length))fail("help_requires_consent");
 let help={};
 if(consents.human_help){
  const common=["broad_location","language","timeline"];
  const specific=agent==="THINK"?["age_band","topic","help_type","format","guardian_contact"]:
   agent==="SHAPE"?["project_type","project_size","budget_band","wanted_help"]:["project_type","project_size","one_day","materials","wanted_help"];
  const h=object(value.help||{},[...common,...specific]);
  help={broad_location:broadLocation(h.broad_location),language:pick(h.language,["en","he","ar","ru","other","not_sure"],"not_sure"),timeline:pick(h.timeline,["exploring","within_week","within_month","later","not_sure"],"not_sure")};
  if(agent==="THINK"){
   help.age_band=pick(h.age_band,["under_13","13_17","adult","not_stated"],"not_stated");
   help.topic=pick(h.topic,["mathematics","logic","probability","puzzles","other"],"other");
   help.help_type=pick(h.help_type,["one_question","ongoing_practice","private_tutoring"],"one_question");
   help.format=pick(h.format,["online","in_person","either"],"online");
   if(h.guardian_contact!==undefined&&typeof h.guardian_contact!=="boolean")fail("invalid_guardian_confirmation");
   help.guardian_contact=h.guardian_contact===true;
   if(consents.contact&&help.age_band!=="adult"&&!help.guardian_contact)fail("guardian_contact_required");
   if(consents.contact&&help.format==="in_person"&&!help.broad_location)fail("city_required");
  } else if(agent==="SHAPE"){
   help.project_type=pick(h.project_type,["room","space","visualization","decorative_work","other"],"other");
   help.project_size=text(h.project_size,80);
   help.budget_band=pick(h.budget_band,["not_stated","exploring","small","medium","larger"],"not_stated");
   help.wanted_help=pick(h.wanted_help,["advice","3d_visualization","design_brief","professional_help"],"advice");
  } else {
   help.project_type=pick(h.project_type,["home_project","repair","decorative_art","other"],"other");
   help.project_size=pick(h.project_size,["very_small","small","medium","large","not_sure"],"not_sure");
   help.one_day=pick(h.one_day,["one_time","one_day","flexible"],"flexible");
   help.materials=text(h.materials,300);
   help.wanted_help=pick(h.wanted_help,["plan","materials_list","guidance","professional_help"],"plan");
  }
 }
 if(value.contact_email&&!consents.contact)fail("email_requires_contact_consent");
 let contactEmail="";
 if(consents.contact){
  if(env.CONTACT_COLLECTION_ENABLED!=="true"||env.EMAIL_COLLECTION_ENABLED!=="true")fail("contact_collection_disabled");
  contactEmail=email(value.contact_email);
 }
 return {...consents,minor_related:agent==="THINK"&&help.age_band!=="adult",help,contact_email:contactEmail};
}
async function digest(value) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,"0")).join(""); }
function stmt(db,sql,...args) { return db.prepare(sql).bind(...args); }
function leadType(agent,help) {
 if(agent==="THINK")return "tutoring";
 if(agent==="SHAPE")return help.wanted_help==="3d_visualization"?"3d_visualization":help.project_type==="decorative_work"?"decorative_art":"design_advice";
 return help.project_type==="repair"?"repair":help.project_type==="decorative_art"?"decorative_art":"small_home_project";
}
export async function persistOptions(db,row,options,now=new Date().toISOString()){
 const fingerprint=await digest(JSON.stringify(options));
 const previous=await stmt(db,"SELECT input_hash FROM request_preferences WHERE request_id = ?",row.request_id).first();
 if(previous&&previous.input_hash!==fingerprint)fail("request_conflict",409);
 await stmt(db,"INSERT OR IGNORE INTO request_preferences (request_id,input_hash,community_active,human_help_active,contact_active,minor_related,help_json,created_at) VALUES (?,?,?,?,?,?,?,?)",row.request_id,fingerprint,+options.community,+options.human_help,+options.contact,+options.minor_related,JSON.stringify(options.help),now).run();
 const accepted=await stmt(db,"SELECT input_hash,created_at FROM request_preferences WHERE request_id = ?",row.request_id).first();
 if(accepted?.input_hash!==fingerprint)fail("request_conflict",409);
 now=accepted.created_at;
 const commands=[];
 for(const scope of Object.keys(CONSENT_VERSION))commands.push(stmt(db,"INSERT OR IGNORE INTO consent_events (id,operation_id,request_id,scope,action,version,occurred_at) VALUES (?,?,?,?,?,?,?)",crypto.randomUUID(),row.request_id,row.request_id,scope,options[scope]?"grant":"decline",CONSENT_VERSION[scope],now));
 if(options.community)commands.push(stmt(db,"INSERT OR IGNORE INTO community_publication_requests (id,request_id,state,created_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM request_preferences WHERE request_id=? AND community_active=1)",crypto.randomUUID(),row.request_id,row.status==="answered"?"awaiting_moderation":"awaiting_answer",now,row.request_id));
 if(options.human_help&&options.contact){
  commands.push(stmt(db,"INSERT OR IGNORE INTO leads (id,request_id,type,status,contact_email,broad_location,language,timeline,details_json,created_at,updated_at) SELECT ?,?,?,'new',?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM request_preferences WHERE request_id=? AND human_help_active=1 AND contact_active=1)",crypto.randomUUID(),row.request_id,leadType(row.agent,options.help),options.contact_email,options.help.broad_location,options.help.language,options.help.timeline,JSON.stringify(options.help),now,now,row.request_id));
 }
 await db.batch(commands);
 const stored=await stmt(db,"SELECT input_hash FROM request_preferences WHERE request_id = ?",row.request_id).first();
 if(stored?.input_hash!==fingerprint)fail("request_conflict",409);
}
export async function recordAnswer(db,row,answer,now=new Date().toISOString(),reviewRequired=false){
 await db.batch([
  stmt(db,"INSERT OR IGNORE INTO answers (id,request_id,answer,review_state,created_at) VALUES (?,?,?,?,?)",crypto.randomUUID(),row.request_id,answer,reviewRequired?"needs_review":"unreviewed",now),
  stmt(db,"UPDATE community_publication_requests SET state = 'awaiting_moderation' WHERE request_id = ? AND state = 'awaiting_answer' AND ?=0",row.request_id,+reviewRequired)
 ]);
}
export function normalizeWithdrawal(value){
 object(value,["operation_id","withdraw"]);
 if(!UUID.test(value.operation_id||"")||!Array.isArray(value.withdraw)||!value.withdraw.length||value.withdraw.some(x=>!Object.hasOwn(CONSENT_VERSION,x)))fail("invalid_withdrawal");
 return {operation_id:value.operation_id,withdraw:[...new Set(value.withdraw)]};
}
export async function withdrawConsents(db,row,value,now=new Date().toISOString()){
 const input=normalizeWithdrawal(value),scopes=new Set(input.withdraw);
 if(scopes.has("human_help"))scopes.add("contact");
 const commands=[];
 for(const scope of scopes){
  commands.push(stmt(db,"INSERT OR IGNORE INTO consent_events (id,operation_id,request_id,scope,action,version,occurred_at) VALUES (?,?,?,?, 'withdraw',?,?)",crypto.randomUUID(),input.operation_id,row.request_id,scope,CONSENT_VERSION[scope],now));
  commands.push(stmt(db,"UPDATE request_preferences SET "+({community:"community_active",human_help:"human_help_active",contact:"contact_active"}[scope])+" = 0 WHERE request_id = ?",row.request_id));
 }
 if(scopes.has("community")){
  commands.push(stmt(db,"UPDATE community_publication_requests SET state = 'withdrawn' WHERE request_id = ?",row.request_id));
  commands.push(stmt(db,"UPDATE community_threads SET state = 'withdrawn',title = '',question = '',answer = '',summary = '' WHERE publication_request_id IN (SELECT id FROM community_publication_requests WHERE request_id = ?)",row.request_id));
 }
 if(scopes.has("contact")){
  commands.push(stmt(db,"UPDATE leads SET status = 'closed',contact_email = '',updated_at = ? WHERE request_id = ?",now,row.request_id));
  commands.push(stmt(db,"UPDATE provider_candidates SET state = 'cancelled' WHERE lead_id IN (SELECT id FROM leads WHERE request_id = ?)",row.request_id));
  commands.push(stmt(db,"UPDATE notification_deliveries SET status = 'cancelled' WHERE request_id = ? AND status IN ('disabled','pending')",row.request_id));
 }
 await db.batch(commands);
 return {request_id:row.request_id,withdrawn:[...scopes],publication:"not_automatic",routing:"manual_review_only"};
}
function admin(auth,capability){
 if(!auth||auth.verified!==true||auth.role!=="admin"||typeof auth.actor_id!=="string"||!auth.actor_id||!auth.capabilities?.includes(capability))fail("admin_authorization_required",403);
}
const looksPrivate=s=>/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){7,}|https?:\/\/|\b(?:street|apartment|postcode|zip)\b|רחוב/i.test(s);
function moderatedText(value,max){
 const s=text(value,max);
 if(!s||looksPrivate(s))fail("public_text_requires_redaction");
 return s;
}
export async function approveThread(db,input,auth){
 admin(auth,"moderate_community");
 object(input,["request_id","title","question","answer","summary","broad_region","region_granularity","minor_review_approved","personal_data_removed","approved"]);
 if(input.approved!==true||input.personal_data_removed!==true)fail("moderation_required");
 const row=await stmt(db,"SELECT r.*,p.community_active,p.minor_related,c.id AS publication_id,c.state AS publication_state FROM requests r JOIN request_preferences p ON p.request_id=r.request_id JOIN community_publication_requests c ON c.request_id=r.request_id WHERE r.request_id = ?",input.request_id).first();
 if(!row||!row.community_active||row.publication_state==="withdrawn"||row.expires_at<=new Date().toISOString())fail("community_consent_required",409);
 const grant=await stmt(db,"SELECT id FROM consent_events WHERE request_id=? AND scope='community' AND action='grant' AND version=? LIMIT 1",input.request_id,CONSENT_VERSION.community).first();
 if(!grant)fail("community_consent_required",409);
 if(row.status!=="answered"||!row.answer)fail("answer_required",409);
 if(row.minor_related&&input.minor_review_approved!==true)fail("minor_review_required",409);
 const publication={title:moderatedText(input.title,140),question:moderatedText(input.question,6000),answer:moderatedText(input.answer,16000),summary:moderatedText(input.summary,300),broad_region:broadLocation(input.broad_region),region_granularity:pick(input.region_granularity,["none","city","region"],"none")};
 if(publication.broad_region&&publication.region_granularity==="none")fail("broad_region_granularity_required");
 const existing=await stmt(db,"SELECT * FROM community_threads WHERE publication_request_id=?",row.publication_id).first();
 if(existing){
  if(["title","question","answer","summary","broad_region","region_granularity"].some(k=>(existing[k]||"")!==(publication[k]||"")))fail("publication_conflict",409);
  return {public_id:existing.public_id,slug:existing.slug,state:existing.state,published:existing.state==="published"};
 }
 const id=crypto.randomUUID(),slug="question-"+id;
 await db.batch([
  stmt(db,"INSERT INTO community_threads (public_id,publication_request_id,slug,agent,title,question,answer,summary,broad_region,region_granularity,state,pii_removed,moderation_approved,minor_review_approved,reviewed_by) VALUES (?,?,?,?,?,?,?,?,?,?,'approved',1,1,?,?)",id,row.publication_id,slug,row.agent,publication.title,publication.question,publication.answer,publication.summary,publication.broad_region,publication.region_granularity,+(input.minor_review_approved===true),auth.actor_id),
  stmt(db,"UPDATE community_publication_requests SET state = 'approved',reviewed_at = ?,reviewed_by = ? WHERE id = ?",new Date().toISOString(),auth.actor_id,row.publication_id)
 ]);
 return {public_id:id,slug,state:"approved",published:false};
}
export async function publishThread(db,id,auth,env={}){
 admin(auth,"publish_community");
 if(env.ENABLE_COMMUNITY_PUBLICATION!=="true")fail("community_publication_disabled",503);
 const row=await stmt(db,"SELECT t.*,c.request_id,p.community_active,p.minor_related,r.status AS answer_state,r.expires_at FROM community_threads t JOIN community_publication_requests c ON c.id=t.publication_request_id JOIN requests r ON r.request_id=c.request_id JOIN request_preferences p ON p.request_id=r.request_id WHERE t.public_id = ?",id).first();
 if(!row||!["approved","published"].includes(row.state)||!row.community_active||!row.pii_removed||!row.moderation_approved||row.answer_state!=="answered"||row.expires_at<=new Date().toISOString()||(row.minor_related&&!row.minor_review_approved))fail("publication_conditions_not_met",409);
 const grant=await stmt(db,"SELECT id FROM consent_events WHERE request_id=? AND scope='community' AND action='grant' AND version=? LIMIT 1",row.request_id,CONSENT_VERSION.community).first();
 if(!grant)fail("community_consent_required",409);
 if(row.state==="published")return {public_id:id,state:"published",idempotent:true};
 await stmt(db,"UPDATE community_threads SET state = 'published',published_at = ? WHERE public_id = ?",new Date().toISOString(),id).run();
 return {public_id:id,state:"published"};
}
export async function publicThreads(db,env={},slug=null){
 if(env.ENABLE_COMMUNITY_PUBLICATION!=="true"||!db)return [];
 const rows=await stmt(db,"SELECT t.public_id,t.slug,t.agent,t.title,t.question,t.answer,t.summary,t.broad_region,t.published_at,(SELECT COUNT(*) FROM community_contributions x WHERE x.thread_id=t.public_id AND x.state='approved') AS contribution_count FROM community_threads t JOIN community_publication_requests c ON c.id=t.publication_request_id JOIN requests r ON r.request_id=c.request_id JOIN request_preferences p ON p.request_id=r.request_id WHERE t.state='published' AND c.state='approved' AND p.community_active=1 AND EXISTS (SELECT 1 FROM consent_events ce WHERE ce.request_id=r.request_id AND ce.scope='community' AND ce.action='grant' AND ce.version='community-v1-2026-10-15') AND r.status='answered' AND t.pii_removed=1 AND t.moderation_approved=1 AND (p.minor_related=0 OR t.minor_review_approved=1) AND r.expires_at > ? AND (? IS NULL OR t.slug=?) ORDER BY t.published_at DESC LIMIT 50",new Date().toISOString(),slug,slug).all();
 return rows.results;
}
const transitions={
 new:["needs_information","reviewed","closed","spam"],needs_information:["reviewed","closed","spam"],
 reviewed:["preferred_provider_candidate","other_provider_candidate","closed","spam"],
 preferred_provider_candidate:["offered","other_provider_candidate","closed"],other_provider_candidate:["offered","closed"],
 offered:["accepted","declined","closed"],accepted:["closed"],declined:["other_provider_candidate","closed"],closed:[],spam:[]
};
export async function transitionLead(db,input,auth){
 admin(auth,"triage_leads");
 object(input,["lead_id","operation_id","status"]);
 if(!UUID.test(input.lead_id||"")||!UUID.test(input.operation_id||"")||!STATES.includes(input.status))fail("invalid_lead_transition");
 const previous=await stmt(db,"SELECT event FROM lead_events WHERE lead_id = ? AND operation_id = ?",input.lead_id,input.operation_id).first();
 if(previous){if(previous.event!=="status:"+input.status)fail("operation_conflict",409);return {status:input.status,idempotent:true};}
 const lead=await stmt(db,"SELECT l.*,p.contact_active,p.human_help_active,r.expires_at FROM leads l JOIN request_preferences p ON p.request_id=l.request_id JOIN requests r ON r.request_id=l.request_id WHERE l.id = ?",input.lead_id).first();
 if(!lead||(!["closed","spam"].includes(input.status)&&(!lead.contact_active||!lead.human_help_active||lead.expires_at<=new Date().toISOString())))fail("lead_consent_required",409);
 if(!transitions[lead.status]?.includes(input.status))fail("invalid_lead_transition",409);
 await db.batch([
  stmt(db,"UPDATE leads SET status = ?,updated_at = ? WHERE id = ?",input.status,new Date().toISOString(),input.lead_id),
  stmt(db,"INSERT INTO lead_events (id,operation_id,lead_id,event,actor_id,occurred_at) VALUES (?,?,?,?,?,?)",crypto.randomUUID(),input.operation_id,input.lead_id,"status:"+input.status,auth.actor_id,new Date().toISOString())
 ]);
 return {status:input.status,notification_sent:false};
}
export function candidateFlags(lead,rules){
 if(!Array.isArray(rules)||!LEAD_TYPES.includes(lead.type))fail("invalid_private_rules");
 return rules.filter(r=>r.available===true&&Array.isArray(r.lead_types)&&r.lead_types.includes(lead.type)&&(!r.service_areas?.length||r.service_areas.includes(lead.broad_location))&&(!r.project_sizes?.length||r.project_sizes.includes(lead.project_size))&&(!r.timelines?.length||r.timelines.includes(lead.timeline))).map(r=>({provider_key:text(r.provider_key,80),state:"manual_review_required",flags:["type_match","manual_approval_needed",...(r.minimum_timeline_days!==undefined||r.maximum_timeline_days!==undefined?["timeline_days_need_manual_review"]:[]),...(r.preferred_characteristics?.length?["characteristics_need_manual_review"]:[])]}));
}
export async function demandCounts(db,auth){
 admin(auth,"read_demand");
 const one=sql=>db.prepare(sql).first();
 const totals=await one("SELECT COUNT(*) AS questions,SUM(status='answered') AS answered,SUM(status='pending') AS unanswered FROM requests");
 const choices=await one("SELECT COALESCE(SUM(community_active),0) AS community_opt_ins,COALESCE(SUM(human_help_active),0) AS human_help_opt_ins FROM request_preferences");
 const leadTotals=await one("SELECT COUNT(*) AS leads,SUM(status IN ('reviewed','preferred_provider_candidate','other_provider_candidate','offered','accepted')) AS qualified,SUM(status='accepted') AS accepted,SUM(status='declined') AS declined,SUM(status='offered') AS offered,SUM(status IN ('preferred_provider_candidate','other_provider_candidate','offered','accepted','declined')) AS routed FROM leads");
 const byAgent=await db.prepare("SELECT agent,COUNT(*) AS count FROM requests GROUP BY agent").all();
 const byType=await db.prepare("SELECT type,COUNT(*) AS count FROM leads GROUP BY type").all();
 const byRegion=await db.prepare("SELECT broad_location,COUNT(*) AS count FROM leads WHERE broad_location != '' GROUP BY broad_location HAVING COUNT(*) >= 5").all();
 const topics=await db.prepare("SELECT json_extract(help_json,'$.topic') AS topic,COUNT(*) AS count FROM request_preferences WHERE json_extract(help_json,'$.topic') IS NOT NULL GROUP BY topic").all();
 return {totals,choices,leadTotals,byAgent:byAgent.results,byType:byType.results,regions:byRegion.results,topics:topics.results,conversion:totals.questions?choices.human_help_opt_ins/totals.questions:0,privacy:"Aggregate records only; regions with fewer than five leads suppressed."};
}

export async function approvePrivateAnswer(db,input,auth){
 admin(auth,"review_answers");
 object(input,["request_id","answer"]);
 if(!UUID.test(input.request_id||"")||typeof input.answer!=="string"||!input.answer.trim()||input.answer.length>16000)fail("invalid_answer");
 const row=await stmt(db,"SELECT * FROM requests WHERE request_id=?",input.request_id).first();
 if(!row||row.expires_at<=new Date().toISOString())fail("request_unavailable",409);
 const saved=await stmt(db,"SELECT * FROM answers WHERE request_id=?",input.request_id).first();
 if(!saved)fail("answer_review_required",409);
 const answer=input.answer.trim(),now=new Date().toISOString();
 await db.batch([
  stmt(db,"UPDATE answers SET answer=?,review_state='reviewed' WHERE request_id=?",answer,input.request_id),
  stmt(db,"UPDATE requests SET status='answered',answer=?,updated_at=? WHERE request_id=?",answer,now,input.request_id),
  stmt(db,"UPDATE community_publication_requests SET state='awaiting_moderation' WHERE request_id=? AND state='awaiting_answer'",input.request_id)
 ]);
 return {status:"answered",published:false,routed:false};
}
