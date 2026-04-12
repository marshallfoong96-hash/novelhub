import{c}from"./index-DDHk2_yK.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=c("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=c("Send",[["path",{d:"m22 2-7 20-4-9-9-4Z",key:"1q3vgg"}],["path",{d:"M22 2 11 13",key:"nzbqef"}]]),r=1e3;async function m(t,h,i="*"){const a=Number(h);if(!t||Number.isNaN(a))return[];const n=[];let e=0;for(;;){const{data:d,error:o}=await t.from("chapters").select(i).eq("novel_id",a).order("chapter_number",{ascending:!0}).range(e,e+r-1);if(o)throw o;const s=d||[];if(n.push(...s),s.length<r)break;e+=r}return n}export{u as M,l as S,m as f};
//# sourceMappingURL=fetchAllChapters-DbZYXipY.js.map
