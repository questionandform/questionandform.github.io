const AGENTS = Object.freeze({ THINK:"https://learnwithlev.com/ask/", SHAPE:"https://3dddesign.com/ask/", MAKE:"https://themakerhome.com/ask/" });
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validPublicThread(t){
 const allowed=["public_id","slug","agent","title","question","answer","summary","broad_region","published_at","contribution_count"];
 return !!t&&typeof t==="object"&&Object.keys(t).every(k=>allowed.includes(k))&&ID.test(t.public_id||"")&&t.slug==="question-"+t.public_id&&Object.hasOwn(AGENTS,t.agent)&&["title","question","answer","summary"].every(k=>typeof t[k]==="string"&&t[k].length>0&&t[k].length<=16000)&&typeof t.published_at==="string"&&Number.isFinite(Date.parse(t.published_at))&&Number.isInteger(t.contribution_count)&&t.contribution_count>=0;
}
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
export function publicThreadUrl(thread,origin="https://questionandform.github.io"){
 if(!validPublicThread(thread))throw new Error("Invalid public thread");
 const url=new URL("/community/"+thread.slug+"/",origin);url.search="";url.hash="";return url.href;
}
export function renderThread(container,thread,{allowShare=false}={}){
 if(!validPublicThread(thread))throw new Error("Invalid public thread");
 container.replaceChildren();
 container.append(el("p",thread.agent+" / Community question","eyebrow"),el("h1",thread.title));
 const meta=el("p","Published "+new Date(thread.published_at).toLocaleDateString("en-GB")+" · Shared anonymously","thread-meta");
 container.append(meta);
 for(const [title,key] of [["The question","question"],["The agent answer","answer"]]){
  const section=el("section");section.append(el("h2",title),el("p",thread[key],"thread-text"));container.append(section);
 }
 const discussion=el("section");discussion.append(el("h2","Community contributions"),el("p",thread.contribution_count===0?"No contributions yet. Open comments are not enabled.":"Moderated contributions will appear here. Open comments are not enabled."));
 discussion.append(el("p","There are no accounts, private messages, or direct contact between community members.","small-note"));container.append(discussion);
 const help=el("section");help.append(el("h2","Need human help?"),el("p","You can separately choose human help on the specialist tool. Any request stays private and needs manual review."));
 const link=el("a","Explore human help ↗","community-link");link.href=AGENTS[thread.agent]+"#human-help-consent";help.append(link);container.append(help);
 if(allowShare){const button=el("button","Copy public thread link","action action-secondary");button.type="button";button.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(publicThreadUrl(thread));button.textContent="Public link copied";}catch{button.textContent="Copy unavailable on this browser";}});container.append(button);}
}
export function renderCards(container,threads){
 container.replaceChildren();
 for(const thread of threads){
  if(!validPublicThread(thread))continue;
  const article=el("article",undefined,"community-card");article.append(el("p",thread.agent,"eyebrow"));
  const heading=el("h2");const link=el("a",thread.title);link.href=publicThreadUrl(thread);heading.append(link);article.append(heading,el("p",thread.summary),el("small",thread.contribution_count+" contributions · "+new Date(thread.published_at).toLocaleDateString("en-GB")));container.append(article);
 }
}
