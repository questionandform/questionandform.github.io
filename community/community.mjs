import {renderCards,SOURCES} from "./view.mjs";
const flags=window.QF_FLAGS||{},config=window.QF_SITE_CONFIG||{},page=document.querySelector("[data-community]");
if(flags.communityUiEnabled&&page){
 const template=document.querySelector("#community-empty-template");if(template)page.replaceChildren(template.content.cloneNode(true));
 // Read integration remains independent from display flags. Fixtures are never imported here.
 if(config.communityReadEnabled===true&&config.communityApiOrigin){(async()=>{
  const url=new URL(config.communityApiOrigin);if(url.protocol!=="https:"||url.pathname!=="/"||url.username||url.password||url.search||url.hash)return;
  const response=await fetch(url.origin+"/v1/community",{credentials:"omit",cache:"no-store"});if(!response.ok)return;
  const data=await response.json(),agent=page.dataset.agent;const threads=(data.threads||[]).filter(t=>!agent||t.agent===agent);
  if(threads.length){const cards=document.querySelector("#community-cards");if(cards){renderCards(cards,threads);document.querySelector("#community-empty").hidden=cards.children.length>0;}}
 })().catch(()=>{});}
}
