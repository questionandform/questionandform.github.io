import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {manualCandidateSlate,preferredFirstLookProposal,reviewFirstLookOutcome} from "../private-matching.mjs";
import {professionalFixtures,privateRuleFixtures,matchingLeadFixture,threadFixtures} from "./refined-fixtures.mjs";
const admin={verified:true,role:"admin",actor_id:"fixture-admin",capabilities:["triage_leads"]},checks=[];
function check(name,fn){fn();checks.push(name);}
check("matching and first-look plans require server-trusted admin capabilities",()=>{
 for(const auth of [{},{role:"admin",verified:false},{...admin,capabilities:[]}]){assert.throws(()=>manualCandidateSlate(matchingLeadFixture,privateRuleFixtures,auth),/authorization/);assert.throws(()=>preferredFirstLookProposal(matchingLeadFixture,privateRuleFixtures,auth),/authorization/);}
});
check("matching filters type, area, size, expertise and availability",()=>{
 for(const changed of [{type:"repair"},{broad_location:"Different region"},{project_size:"large"},{topic:"another topic"}])assert.equal(manualCandidateSlate({...matchingLeadFixture,...changed},privateRuleFixtures,admin).length,0);
 assert.equal(manualCandidateSlate(matchingLeadFixture,privateRuleFixtures.map(r=>({...r,available:false})),admin).length,0);
});
check("matching proposes a plural bounded slate without a public score or assignment",()=>{
 const slate=manualCandidateSlate(matchingLeadFixture,privateRuleFixtures,admin);assert.equal(slate.length,4);
 assert(slate.every(x=>x.state==="manual_review_required"&&!Object.hasOwn(x,"score")&&!Object.hasOwn(x,"assigned")));
});
check("newcomer opportunity survives rotation among more than five suitable candidates",()=>{
 const rules=Array.from({length:8},(_,i)=>({...privateRuleFixtures[0],provider_key:"fixture-"+i,newcomer:i===7,last_considered_at:"2026-10-"+String(10+i).padStart(2,"0")}));
 const slate=manualCandidateSlate(matchingLeadFixture,rules,admin);assert.equal(slate.length,5);assert(slate.some(x=>x.provider_key==="fixture-7"&&x.considerations.includes("newcomer_opportunity")));
});
check("star and review-count changes cannot determine the private slate",()=>{
 const original=manualCandidateSlate(matchingLeadFixture,privateRuleFixtures,admin);
 const changed=manualCandidateSlate(matchingLeadFixture,privateRuleFixtures.map((r,i)=>({...r,stars:i,review_count:10000-i})),admin);assert.deepEqual(changed,original);
});
check("preferred first-look is a private proposal with no running deadline or contact",()=>{
 const p=preferredFirstLookProposal(matchingLeadFixture,privateRuleFixtures,admin);assert.equal(p.state,"awaiting_admin_review");assert.equal(p.preferred_provider_key,"fixture-provider-2");assert.equal(p.accept_decline_window_hours,24);assert.equal(p.window_opened_at,null);assert(p.requires_admin_approval&&!p.notification_sent&&!p.assigned);assert.equal(p.fallback_provider_keys.length,3);
});
check("unavailable preferred provider is excluded and fallback still needs approval",()=>{
 const p=preferredFirstLookProposal(matchingLeadFixture,privateRuleFixtures.map(r=>r.preferred_first_look?{...r,available:false}:r),admin);assert.equal(p.preferred_provider_key,null);assert.equal(p.fallback_provider_keys.length,3);assert(!p.assigned&&!p.notification_sent);
});
check("eligible private first-look is retained outside the rotated five-candidate display slate",()=>{
 const rules=Array.from({length:8},(_,i)=>({...privateRuleFixtures[0],provider_key:"fixture-"+i,newcomer:false,preferred_first_look:i===7,last_considered_at:"2026-10-"+String(10+i).padStart(2,"0")}));
 const proposal=preferredFirstLookProposal(matchingLeadFixture,rules,admin);assert.equal(proposal.preferred_provider_key,"fixture-7");assert(proposal.requires_admin_approval&&!proposal.notification_sent);
});
check("acceptance, decline, unavailability and expiry never contact or assign",()=>{
 const p=preferredFirstLookProposal(matchingLeadFixture,privateRuleFixtures,admin);
 for(const outcome of ["accepted","declined","unavailable","window_expired"]){const r=reviewFirstLookOutcome(p,outcome,admin);assert(r.requires_admin_approval&&!r.notification_sent&&!r.assigned);assert.equal(r.next_candidates.length,outcome==="accepted"?0:3);}
 assert.throws(()=>reviewFirstLookOutcome(p,"send_now",admin),/invalid_manual_outcome/);
});
check("professional fixture identities are generic, fictional and contact-free",()=>{
 for(const p of professionalFixtures){assert.match(p.display_name,/^Fixture professional [A-D]$/);assert.match(p.portfolio_url,/^https:\/\/example\.invalid\//);assert(!/email|phone|whatsapp|preferred_first_look|provider_key/.test(JSON.stringify(p)));assert(!Object.hasOwn(p.reputation,"stars"));}
});
check("canonical fixture threads belong to each vertical, never the hub",()=>{
 const origins={THINK:"learnwithlev.com",SHAPE:"3dddesign.com",MAKE:"themakerhome.com"};
 for(const t of threadFixtures){assert.equal(t.canonical_url,"https://"+origins[t.agent]+"/community/"+t.slug+"/");assert(!JSON.stringify(t).includes("preferred_first_look"));}
});
const config=await readFile(new URL("../provider-rules.example.json",import.meta.url),"utf8");
check("committed provider example is generic and unavailable",()=>{
 const d=JSON.parse(config);assert(d.example_only&&d.manual_review_required);assert(d.providers.every(p=>!p.available&&!p.preferred_first_look));assert(!/email|phone|whatsapp/.test(config));
});
const publicSource=await readFile(new URL("../../community/community.mjs",import.meta.url),"utf8");
check("production community loader imports no professional or thread fixture",()=>{assert(!/refined-fixtures|review-fixtures|private-matching|provider-rules/.test(publicSource));assert(!/method\s*:\s*["']POST/.test(publicSource));});
console.log(JSON.stringify({passed:checks.length,checks},null,2));
