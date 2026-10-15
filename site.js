(() => {
 const settings=window.QF_SITE_CONFIG||{},nav=document.querySelector("#social-links");
 if(!nav)return;
 for(const [key,label,group] of [["facebookPageUrl","Facebook Page",false],["facebookGroupUrl","Facebook Group",true]]){
  try{const url=new URL(settings[key]);if(url.protocol!=="https:"||!["facebook.com","www.facebook.com"].includes(url.hostname)||url.username||url.password||(group&&!url.pathname.startsWith("/groups/")))continue;const a=document.createElement("a");a.href=url.href;a.textContent=label;a.rel="noopener";nav.append(a);}catch{}
 }
 nav.hidden=!nav.children.length;
})();
