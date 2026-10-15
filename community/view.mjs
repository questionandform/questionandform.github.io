export const SOURCES=Object.freeze({
 THINK:{name:"LearnWithLev",origin:"https://learnwithlev.com",topics:["mathematics","logic","probability","puzzles","tutoring"]},
 SHAPE:{name:"3D Design",origin:"https://3dddesign.com",topics:["rooms","layouts","3D visualization","spatial design","decorative work"]},
 MAKE:{name:"The Maker Home",origin:"https://themakerhome.com",topics:["DIY","repairs","practical projects","materials","making"]}
});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const safeText=(s,max)=>typeof s==="string"&&s.length>0&&s.length<=max;
const count=n=>Number.isInteger(n)&&n>=0;
export function publicThreadUrl(thread){
 if(!SOURCES[thread?.agent]||!UUID.test(thread.public_id||"")||thread.slug!=="question-"+thread.public_id)throw Error("Invalid public thread");
 return SOURCES[thread.agent].origin+"/community/"+thread.slug+"/";
}
export function validPublicThread(t){
 const allowed=["public_id","slug","agent","title","question","answer","summary","broad_region","published_at","contribution_count","canonical_url","source_site","topic","professional_contribution_count","professional_contributions"];
 try{return !!t&&typeof t==="object"&&Object.keys(t).every(k=>allowed.includes(k))&&["title","question","answer","summary"].every(k=>safeText(t[k],16000))&&Number.isFinite(Date.parse(t.published_at))&&count(t.contribution_count)&&(t.broad_region===null||t.broad_region===undefined||typeof t.broad_region==="string")&&(!t.canonical_url||t.canonical_url===publicThreadUrl(t))&&(!t.source_site||t.source_site===new URL(SOURCES[t.agent].origin).hostname)&&(!t.topic||SOURCES[t.agent].topics.includes(t.topic))&&(t.professional_contribution_count===undefined||count(t.professional_contribution_count))&&(!t.professional_contributions||(Array.isArray(t.professional_contributions)&&t.professional_contributions.every(c=>Object.keys(c).every(k=>["display_name","specialty","text"].includes(k))&&safeText(c.display_name,100)&&safeText(c.specialty,150)&&safeText(c.text,4000))))&&!!publicThreadUrl(t);}catch{return false;}
}
export function renderCards(container,threads){
 container.replaceChildren();
 for(const t of threads.filter(validPublicThread)){
  const a=el("article",undefined,"community-card");a.dataset.agent=t.agent;a.dataset.topic=t.topic||"";
  a.append(el("p",t.agent+" / "+SOURCES[t.agent].name,"eyebrow"));const h=el("h2",t.title);a.append(h,el("p",t.summary));
  a.append(el("p",(t.topic||"Selected question")+" · "+t.contribution_count+" community contributions · "+(t.professional_contribution_count||0)+" professional contributions","thread-meta"));
  const link=el("a","View full discussion ↗","community-link");link.href=publicThreadUrl(t);a.append(link);container.append(a);
 }
}
export function renderDiscovery(container,threads,{hub=true,agent=null}={}){
 container.replaceChildren();const valid=threads.filter(t=>validPublicThread(t)&&(!agent||t.agent===agent));
 const filters=el("div",undefined,"discovery-filters");
 const makeSelect=(label,values)=>{const wrap=el("label",label),select=el("select");select.append(new Option("All "+label.toLowerCase(),""));values.forEach(v=>select.append(new Option(v,v)));wrap.append(select);filters.append(wrap);return select;};
 const agentSelect=hub?makeSelect("Agents",Object.keys(SOURCES)):null;
 const topicSelect=makeSelect("Topics",[...new Set(valid.map(t=>t.topic).filter(Boolean))]);
 const result=el("p","", "small-note");result.setAttribute("aria-live","polite");const cards=el("div",undefined,"community-grid");
 const refresh=()=>{const selected=valid.filter(t=>(!agentSelect?.value||t.agent===agentSelect.value)&&(!topicSelect.value||t.topic===topicSelect.value));renderCards(cards,selected);result.textContent=selected.length+" selected questions";};
 agentSelect?.addEventListener("change",refresh);topicSelect.addEventListener("change",refresh);
 container.append(el("p","Latest questions","eyebrow"),filters,result,cards);refresh();
}
export function renderThread(container,thread,{allowShare=false}={}){
 if(!validPublicThread(thread))throw Error("Invalid public thread");container.replaceChildren();
 container.append(el("p",thread.agent+" / "+SOURCES[thread.agent].name,"eyebrow"),el("h1",thread.title),el("p",(thread.topic||"Community question")+" · Shared anonymously","thread-meta"));
 for(const [heading,key]of [["The question","question"],["The agent answer","answer"]]){const section=el("section");section.append(el("h2",heading),el("p",thread[key],"thread-text"));container.append(section);}
 const community=el("section");community.append(el("h2","Community contributions"),el("p","Approved perspectives can add context to the answer. Open comments are not enabled."));container.append(community);
 const professional=el("section");professional.append(el("h2","Professional contributions"));
 const contributions=thread.professional_contributions||[];
 if(!contributions.length)professional.append(el("p","No professional contributions published."));
 for(const c of contributions){const item=el("article",undefined,"professional-contribution");item.append(el("h3",c.display_name),el("p",c.specialty,"small-note"),el("p",c.text,"thread-text"));professional.append(item);}container.append(professional);
 if(window.QF_FLAGS?.humanHelpUiEnabled){const help=el("section");help.append(el("h2","Need human help?"),el("p","A separate private request can be reviewed by a person. Availability and routing need manual confirmation."));const link=el("a","Request human help ↗","community-link");link.href=SOURCES[thread.agent].origin+"/ask/#human-help-consent";help.append(link);container.append(help);}
 if(allowShare&&!window.QF_REVIEW_MODE){const button=el("button","Copy public thread link","action action-secondary");button.type="button";button.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(publicThreadUrl(thread));button.textContent="Public link copied";}catch{button.textContent="Copy unavailable";}});container.append(button);}
}
const profileKeys=["public_id","display_name","specialty","service_area","languages","portfolio_url","availability","project_sizes","badges","reputation","experience"];
const badgeNames=["New professional","Helpful contributor","Verified project","Experienced in this topic"];
export function validProfessional(p){
 try{const url=new URL(p.portfolio_url);return Object.keys(p).every(k=>profileKeys.includes(k))&&UUID.test(p.public_id)&&safeText(p.display_name,100)&&safeText(p.specialty,150)&&safeText(p.service_area,100)&&Array.isArray(p.languages)&&p.languages.every(x=>safeText(x,60))&&url.protocol==="https:"&&!url.username&&!url.password&&safeText(p.availability,150)&&Array.isArray(p.project_sizes)&&p.project_sizes.every(x=>safeText(x,50))&&Array.isArray(p.badges)&&p.badges.every(x=>badgeNames.includes(x))&&safeText(p.experience,500)&&p.reputation&&Object.keys(p.reputation).every(k=>["helpful_answers","completed_projects","verified_feedback","moderation_history","responsiveness"].includes(k))&&count(p.reputation.helpful_answers)&&count(p.reputation.completed_projects)&&safeText(p.reputation.verified_feedback,400)&&safeText(p.reputation.moderation_history,300)&&safeText(p.reputation.responsiveness,150);}catch{return false;}
}
function badges(p){const n=el("div",undefined,"badges");for(const b of p.badges)n.append(el("span",b,"badge"));return n;}
export function renderProfessional(container,p){
 if(!window.QF_FLAGS?.professionalProfilesEnabled||!validProfessional(p))throw Error("Professional display unavailable");container.replaceChildren();
 container.append(el("p","Professional profile / illustrative only","eyebrow"),el("h1",p.display_name),el("p",p.specialty,"intro-text"),badges(p),el("p","Fixture badges illustrate future evidence types. No real verification or vetting is claimed.","small-note"));
 const details=el("dl",undefined,"profile-details");for(const [label,value]of [["Broad service area",p.service_area],["Languages",p.languages.join(", ")],["Availability",p.availability],["Project sizes",p.project_sizes.join(", ")],["Relevant experience",p.experience],["Portfolio",p.portfolio_url]])details.append(el("dt",label),el("dd",value));container.append(details);
 const r=p.reputation,section=el("section");section.append(el("h2","Evidence of useful participation"),el("p",r.helpful_answers+" helpful answers · "+r.completed_projects+" completed projects (synthetic counts)"));for(const [label,key]of [["Client feedback","verified_feedback"],["Moderation history","moderation_history"],["Responsiveness","responsiveness"]])section.append(el("h3",label),el("p",r[key]));container.append(section,el("p","Visibility can grow through useful answers before paid work. These signals inform review alongside project fit; there is no star-only ranking or leaderboard.","small-note"));
}
export function renderMatches(container,matches){
 if(!window.QF_FLAGS?.professionalMatchingEnabled||!Array.isArray(matches)||matches.length<3||matches.length>5||matches.some(m=>!validProfessional(m.profile)||!Array.isArray(m.fit)||m.fit.some(x=>!safeText(x,200))))throw Error("Suggested matches unavailable");
 container.replaceChildren();container.append(el("p","Human help / private request preview","eyebrow"),el("h1","Suggested matches"),el("p","Professionals who may fit this request. A person must review suitability and confirm availability. This is not a booking or an assignment.","intro-text"));
 const grid=el("div",undefined,"match-grid");for(const m of matches){const card=el("article",undefined,"match-card");card.append(el("h2",m.profile.display_name),el("p",m.profile.specialty),badges(m.profile));for(const text of m.fit)card.append(el("p",text,"small-note"));card.append(el("p",m.profile.availability,"small-note"));grid.append(card);}container.append(grid,el("p","The review considers project fit, area, availability, size, expertise, participation evidence, rotation and newcomer opportunity. No universal winner is selected; popularity cannot override fit.","small-note"));
}
export function renderSocialReview(container,thread){
 if(!window.QF_REVIEW_MODE||!validPublicThread(thread))return;const section=el("section");section.append(el("h2","Share an approved discussion"),el("p","Preview only. All actions below prepare local text or a link; nothing is posted, connected or sent.","small-note"));
 const url=publicThreadUrl(thread),pack=thread.title+"\n"+thread.summary+"\nFull discussion: "+url;
 if(window.QF_FLAGS.facebookLinksEnabled){const share=el("button","Share approved thread to Facebook","action action-secondary");share.type="button";const output=el("p","","thread-text");share.addEventListener("click",()=>{output.textContent="Review share link: https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(url);});const group=el("button","Copy Facebook Group post package","action action-secondary");group.type="button";group.addEventListener("click",async()=>{output.textContent=pack;try{await navigator.clipboard.writeText(pack);}catch{}});section.append(share,group,output);}
 if(window.QF_FLAGS.discordLinksEnabled){const link=el("button","Open Discord discussion link","action action-secondary");link.type="button";link.addEventListener("click",()=>{link.textContent="Preview only — no Discord discussion is connected";});section.append(link);}
 const og=el("aside",undefined,"og-preview");og.append(el("p","SOCIAL OPEN GRAPH PREVIEW","eyebrow"),el("h3",thread.title),el("p",thread.summary),el("small",SOURCES[thread.agent].name+" · "+url));section.append(og);container.append(section);
}
