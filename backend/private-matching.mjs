/* Private planning only. No HTTP routes, offers, messages, assignments or public rank scores. */
import {candidateFlags} from "./community-leads.mjs";
const sizes=["very_small","small","medium","large"];
function authorized(auth){if(auth?.verified!==true||auth.role!=="admin"||!auth.capabilities?.includes("triage_leads")||!auth.actor_id)throw Error("admin_authorization_required");}
export function manualCandidateSlate(lead,rules,auth){
 authorized(auth);
 const eligible=new Set(candidateFlags(lead,rules).map(x=>x.provider_key));
 const matches=rules.filter(r=>eligible.has(r.provider_key)&&(!r.maximum_project_size||(sizes.includes(lead.project_size)&&sizes.indexOf(lead.project_size)<=sizes.indexOf(r.maximum_project_size)))&&(!r.expertise?.length||!lead.topic||r.expertise.includes(lead.topic)));
 // Rotation and a newcomer opportunity are private review aids, never an automatic assignment.
 matches.sort((a,b)=>(a.last_considered_at||"").localeCompare(b.last_considered_at||"")||a.provider_key.localeCompare(b.provider_key));
 const slate=matches.slice(0,5),newcomer=matches.find(r=>r.newcomer===true);
 if(newcomer&&!slate.includes(newcomer)){slate[slate.length-1]=newcomer;}
 return slate.map(r=>({provider_key:r.provider_key,state:"manual_review_required",considerations:["project_fit","service_area","availability","project_size","relevant_expertise","participation_evidence","rotation",...(r.newcomer?["newcomer_opportunity"]:[]),...(r.preferred_characteristics?.length?["confirm_project_characteristics"]:[])]}));
}
export function preferredFirstLookProposal(lead,rules,auth){
 authorized(auth);const slate=manualCandidateSlate(lead,rules,auth);
 const preferred=rules.find(r=>r.preferred_first_look===true&&manualCandidateSlate(lead,[r],auth).length===1);
 return {state:"awaiting_admin_review",preferred_provider_key:preferred?.provider_key||null,accept_decline_window_hours:Math.max(1,Math.min(168,Number(preferred?.accept_decline_window_hours)||24)),window_opened_at:null,fallback_provider_keys:slate.filter(x=>x.provider_key!==preferred?.provider_key).map(x=>x.provider_key),requires_admin_approval:true,notification_sent:false,assigned:false};
}
export function reviewFirstLookOutcome(proposal,outcome,auth){
 authorized(auth);if(!["accepted","declined","unavailable","window_expired"].includes(outcome))throw Error("invalid_manual_outcome");
 return {state:outcome==="accepted"?"accepted_pending_admin_confirmation":"fallback_needs_admin_review",next_candidates:outcome==="accepted"?[]:[...proposal.fallback_provider_keys],notification_sent:false,assigned:false,requires_admin_approval:true};
}
