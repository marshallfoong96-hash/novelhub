const i=t=>t?t>=1e6?(t/1e6).toFixed(1)+"M":t>=1e3?(t/1e3).toFixed(1)+"K":t.toString():"0",s=t=>{if(!t)return"";const e=new Date(t),r=new Date-e,o=Math.floor(r/6e4),n=Math.floor(r/36e5),f=Math.floor(r/864e5);return o<1?"Vừa xong":o<60?`${o} phút trước`:n<24?`${n} giờ trước`:f<7?`${f} ngày trước`:e.toLocaleDateString("vi-VN")};export{s as a,i as f};
//# sourceMappingURL=helpers-CySnRceS.js.map
