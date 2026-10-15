/* Public display gates contain no credentials or runtime provider rules. */
(() => {
 "use strict";
 const keys=["communityUiEnabled", "communitySubmissionEnabled", "communityCommentsEnabled", "humanHelpUiEnabled", "contactCollectionEnabled", "professionalProfilesEnabled", "professionalMatchingEnabled", "facebookLinksEnabled", "discordLinksEnabled"];
 const config=window.QF_ASK_CONFIG||window.QF_SITE_CONFIG||{};
 const local=["127.0.0.1","localhost","[::1]"].includes(location.hostname);
 const review=local&&window.QF_LOCAL_REVIEW===true;
 const flags=Object.freeze(Object.fromEntries(keys.map(key=>[key,review?true:config[key]===true])));
 Object.defineProperty(window,"QF_REVIEW_MODE",{value:review,writable:false,configurable:false});
 Object.defineProperty(window,"QF_FLAGS",{value:flags,writable:false,configurable:false});
 // Inert templates prevent inactive controls from entering the form or accessibility tree.
 for(const template of document.querySelectorAll("template[data-qf-mount]")){
  const fragment=template.content.cloneNode(true);
  for(const node of fragment.querySelectorAll("[data-qf-feature]"))if(!flags[node.dataset.qfFeature])node.remove();
  for(const node of fragment.querySelectorAll("[data-qf-any]"))if(!node.dataset.qfAny.split(" ").some(key=>flags[key]))node.remove();
  template.replaceWith(fragment);
 }
 for(const node of document.querySelectorAll("[data-qf-feature]"))node.hidden=!flags[node.dataset.qfFeature];
 for(const node of document.querySelectorAll("[data-qf-production]"))node.hidden=review;
})();
