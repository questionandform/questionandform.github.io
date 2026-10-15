(() => {
 const flags=window.QF_FLAGS||{},settings=window.QF_SITE_CONFIG||{},nav=document.querySelector("#social-links");if(!nav)return;
 for(const [flag,key,label]of [["facebookLinksEnabled","facebookPageUrl","Facebook Page"],["facebookLinksEnabled","facebookGroupUrl","Facebook Group"],["discordLinksEnabled","discordInviteUrl","Discord"]]){
  if(!flags[flag])continue;
  try{const u=new URL(settings[key]);if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash)continue;
   if(key==="discordInviteUrl"){if(!(u.hostname==="discord.gg"&&/^\/[A-Za-z0-9_-]+$/.test(u.pathname))&&!(u.hostname==="discord.com"&&/^\/invite\/[A-Za-z0-9_-]+$/.test(u.pathname)))continue;}
   else if(!["facebook.com","www.facebook.com"].includes(u.hostname)||(key==="facebookGroupUrl"&&!u.pathname.startsWith("/groups/")))continue;
   const a=document.createElement("a");a.href=u.href;a.textContent=label;a.rel="noopener";nav.append(a);
  }catch{}
 }nav.hidden=!nav.children.length;
})();
