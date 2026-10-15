import { renderCards, renderThread } from "./view.mjs";
const settings=window.QF_SITE_CONFIG||{};
const page=document.querySelector("[data-page]");
async function load(){
 if(settings.communityReadEnabled!==true||!settings.communityApiOrigin)return;
 let url;try{url=new URL(settings.communityApiOrigin);if(url.protocol!=="https:"||url.pathname!=="/"||url.username||url.password)return;}catch{return;}
 const response=await fetch(url.origin+"/v1/community",{credentials:"omit",cache:"no-store"});
 if(!response.ok)return;
 const data=await response.json();
 if(!Array.isArray(data.threads)||!data.threads.length)return;
 if(page.dataset.page==="index"){renderCards(document.querySelector("#community-cards"),data.threads);document.querySelector("#community-empty").hidden=true;}
 // A future generated slug route must provide its exact approved public ID. No raw queue or receipt lookup.
 if(page.dataset.page==="thread"){const slug=page.dataset.publicSlug;const thread=data.threads.find(t=>t.slug===slug);if(thread)renderThread(document.querySelector("#thread-container"),thread,{allowShare:true});}
}
load().catch(()=>{ /* Preserve the useful empty state during service failures. */ });
