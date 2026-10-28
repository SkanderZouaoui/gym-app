var ic=(n,s,c,x)=>`<span style="font-family:'Material Symbols Rounded';font-size:${s||22}px;color:${c||'currentColor'};line-height:1;${x||''}">${n}</span>`;
var HD="font-family:Sora,sans-serif;letter-spacing:-.025em;";
var CARD="background:var(--sf);border:1px solid var(--bd);border-radius:20px;";
var title=(t,s)=>`<div style="padding:10px 0 16px"><div style="${HD}font-size:28px;font-weight:700;line-height:1.1">${t}</div>${s?`<div style="font-size:14px;color:var(--mu);margin-top:4px">${s}</div>`:''}</div>`;
var sec=(t,r)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;margin:24px 0 10px"><div style="${HD}font-size:17px;font-weight:700">${t}</div>${r||''}</div>`;
var btn=(label,h,o)=>`<button onClick="{{ ${h} }}" style="height:50px;width:100%;border:0;border-radius:15px;background:var(--pr);color:#fff;font-weight:700;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;${o||''}" style-active="transform:scale(.98)">${label}</button>`;
var btn2=(label,h,o)=>btn(label,h,'background:var(--sf);color:var(--tx);border:1px solid var(--bd);'+(o||''));
var inp=(ph,o)=>`<input placeholder="${ph}" style="height:52px;width:100%;box-sizing:border-box;border:1px solid var(--bd);background:var(--sf);border-radius:14px;padding:0 16px;font-size:15px;outline:none;${o||''}">`;
var inpB=(ph,val,h,o)=>`<input placeholder="${ph}" value="{{ ${val} }}" onInput="{{ ${h} }}" style="height:52px;width:100%;box-sizing:border-box;border:1px solid var(--bd);background:var(--sf);border-radius:14px;padding:0 16px;font-size:15px;outline:none;${o||''}">`;
var chips=(list,as,wrap)=>`<div style="display:flex;gap:8px;${wrap?'flex-wrap:wrap':'overflow-x:auto;padding-bottom:4px'}"><sc-for list="{{ ${list} }}" as="${as}" hint-placeholder-count="3"><button onClick="{{ ${as}.on }}" style="{{ ${as}.st }}">{{ ${as}.l }}</button></sc-for></div>`;
var lbl=t=>`<div style="font-size:13px;font-weight:600;color:var(--mu);margin:14px 0 6px">${t}</div>`;
var back=(h,t)=>`<button onClick="{{ ${h} }}" style="border:0;background:none;display:flex;align-items:center;gap:4px;color:var(--pri);font-weight:700;font-size:14px;cursor:pointer;padding:6px 0">${ic('arrow_back',20)}${t||'Retour'}</button>`;
var avatar=(t,s)=>`<div style="width:${s||44}px;height:${s||44}px;border-radius:50%;background:var(--prs);color:var(--pri);display:grid;place-items:center;font-weight:700;font-size:${(s||44)*.34}px;flex:none">${t}</div>`;
var login=(role,sub)=>`<sc-if value="{{ v.login }}"><div style="display:flex;flex-direction:column;padding-top:28px;min-height:100%;box-sizing:border-box">
<div style="width:64px;height:64px;border-radius:20px;background:var(--pr);color:#fff;display:grid;place-items:center;${HD}font-weight:800;font-size:24px">MU</div>
<div style="${HD}font-size:36px;font-weight:800;margin-top:22px;line-height:1">Muscle UP</div>
<div style="font-size:15px;color:var(--mu);margin-top:8px">Espace ${role}${sub?' · '+sub:''}</div>
<div style="margin-top:32px;display:flex;flex-direction:column;gap:12px">${inp('Email ou téléphone')}${inp('Mot de passe').replace('<input','<input type="password"')}</div>
<button onClick="{{ act.forgot }}" style="align-self:flex-start;border:0;background:none;color:var(--pri);font-weight:600;font-size:14px;padding:12px 0;cursor:pointer">Mot de passe oublié ?</button>
<sc-if value="{{ forgot }}"><div style="background:var(--prs);color:var(--pri);border-radius:14px;padding:12px 14px;font-size:13px;margin-bottom:12px;display:flex;gap:10px;align-items:center">${ic('mark_email_read',20)}<span>Un lien de réinitialisation vient d’être envoyé.</span></div></sc-if>
${btn('Se connecter','act.login')}
<div style="font-size:13px;color:var(--mu);text-align:center;margin-top:18px;text-wrap:pretty">Pas d’auto-inscription : votre compte est créé par l’admin ou l’accueil.</div></div></sc-if>`;
var page=(role,body)=>`<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&amp;family=DM+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&amp;display=block" rel="stylesheet">
<style>body{margin:0;-webkit-font-smoothing:antialiased}a{color:#6D28D9;text-decoration:none}a:hover{color:#5B21B6;text-decoration:underline}input,button{font:inherit;color:inherit}input::placeholder{color:var(--mu)}@keyframes mubar{from{width:100%}to{width:0}}@keyframes mupulse{0%,100%{opacity:1}50%{opacity:.4}}</style>
</helmet>
<div style="min-height:100vh;background:#E8E5F1;padding:36px 24px 56px;display:flex;flex-direction:column;align-items:center;gap:24px;font-family:'DM Sans',sans-serif;color:#17141F">
<div style="text-align:center"><div style="${HD}font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#5B21B6;font-weight:700">Muscle UP · Application mobile</div><h1 style="${HD}margin:6px 0 0;font-size:42px;font-weight:800">${role}</h1></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:860px"><sc-for list="{{ nav }}" as="n" hint-placeholder-count="6"><button onClick="{{ n.on }}" style="{{ n.st }}">{{ n.l }}</button></sc-for></div>
<div style="display:flex;gap:48px;flex-wrap:wrap;justify-content:center">
<sc-for list="{{ themes }}" as="th" hint-placeholder-count="2"><div style="display:flex;flex-direction:column;align-items:center;gap:12px">
<div style="{{ th.frame }}">
<div style="position:absolute;top:0;left:0;right:0;height:50px;display:flex;justify-content:space-between;align-items:center;padding:6px 30px 0;font-weight:700;font-size:15px;z-index:3;background:var(--bg)"><span>9:41</span><span style="display:flex;gap:5px">${ic('signal_cellular_alt',17)}${ic('wifi',17)}${ic('battery_full',17)}</span></div>
<div style="{{ area }}">${body}</div>
<sc-if value="{{ showTabs }}"><div style="position:absolute;left:0;right:0;bottom:0;height:84px;background:var(--sf);border-top:1px solid var(--bd);display:flex;padding:8px 6px 0;z-index:3"><sc-for list="{{ tabs }}" as="tb" hint-placeholder-count="4"><button onClick="{{ tb.on }}" style="{{ tb.st }}"><span style="{{ tb.pill }}">${'<span style="font-family:\'Material Symbols Rounded\';font-size:24px;line-height:1">{{ tb.i }}</span>'}</span><span style="font-size:11px;font-weight:700">{{ tb.l }}</span></button></sc-for></div></sc-if>
<sc-if value="{{ hasToast }}"><div style="position:absolute;left:20px;right:20px;bottom:96px;z-index:5;background:var(--tx);color:var(--bg);border-radius:14px;padding:13px 16px;font-size:14px;font-weight:600;display:flex;gap:10px;align-items:center">${ic('check_circle',20)}<span>{{ toast }}</span></div></sc-if>
<div style="position:absolute;bottom:8px;left:50%;margin-left:-67px;width:134px;height:5px;border-radius:3px;background:var(--tx);opacity:.8;z-index:4"></div>
</div>
<div style="font-size:13px;font-weight:700;color:#5B21B6;letter-spacing:.06em;text-transform:uppercase">{{ th.label }}</div></div></sc-for>
</div></div>`;
var file=(tpl,logic,props)=>`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./support.js"></script>
</head>
<body>
<x-dc>
${tpl}
</x-dc>
<script type="text/x-dc" data-dc-script${props?' data-props="'+props.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"':''}>
${logic}
</script>
</body>
</html>
`;
var LPRE=`const L={'--bg':'#F6F5FA','--sf':'#FFFFFF','--sf2':'#EFEDF6','--tx':'#17141F','--mu':'#5F5A70','--bd':'#E3E0EC','--pr':'#7C3AED','--prs':'#EEE7FD','--pri':'#5B21B6','--oks':'#E3F6EA','--oki':'#11793A','--was':'#FEF3DC','--wai':'#8A5600','--ers':'#FCE8E8','--eri':'#B91C1C'};
const D={'--bg':'#0E0C14','--sf':'#181521','--sf2':'#231F31','--tx':'#F3F1F8','--mu':'#A9A3BC','--bd':'#2E2942','--pr':'#7C3AED','--prs':'#2B2149','--pri':'#C9BBFE','--oks':'#12301F','--oki':'#6EE7A0','--was':'#3A2A0C','--wai':'#FBBF4D','--ers':'#3A1517','--eri':'#FCA5A5'};
const TH=[{l:'Mode clair',v:L},{l:'Mode sombre',v:D}];
const fr=v=>Object.assign({position:'relative',width:390,height:800,borderRadius:48,border:'8px solid #15121C',overflow:'hidden',background:'var(--bg)',color:'var(--tx)',fontFamily:"'DM Sans',sans-serif",boxShadow:'0 30px 60px rgba(40,20,90,.28)',boxSizing:'content-box'},v);
const chipSt=a=>({height:36,padding:'0 15px',borderRadius:18,border:a?'1px solid var(--pr)':'1px solid var(--bd)',background:a?'var(--pr)':'var(--sf)',color:a?'#fff':'var(--tx)',fontWeight:600,fontSize:13,cursor:'pointer',whiteSpace:'nowrap',flex:'none'});
const navSt=a=>({height:34,padding:'0 14px',borderRadius:17,border:'1px solid '+(a?'#5B21B6':'#CFC9E2'),background:a?'#5B21B6':'#fff',color:a?'#fff':'#17141F',fontWeight:600,fontSize:13,cursor:'pointer'});
const TG={ok:['var(--oks)','var(--oki)'],wa:['var(--was)','var(--wai)'],er:['var(--ers)','var(--eri)'],pr:['var(--prs)','var(--pri)'],mu:['var(--sf2)','var(--mu)']};
const tag=k=>({fontSize:12,fontWeight:700,padding:'4px 10px',borderRadius:10,background:TG[k][0],color:TG[k][1],whiteSpace:'nowrap',display:'inline-block',alignSelf:'flex-start'});
const btnSt=k=>k==='pr'?{height:38,padding:'0 16px',borderRadius:12,border:0,background:'var(--pr)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}:k==='er'?{height:38,padding:'0 16px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--ers)',color:'var(--eri)',fontWeight:700,fontSize:13,cursor:'pointer'}:{height:38,padding:'0 16px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--sf)',color:'var(--tx)',fontWeight:700,fontSize:13,cursor:'pointer'};
const sw=on=>({width:46,height:28,borderRadius:14,background:on?'var(--pr)':'var(--sf2)',border:'1px solid var(--bd)',position:'relative',cursor:'pointer',padding:0,flex:'none'});
const swk=on=>({position:'absolute',top:2,left:on?20:2,width:22,height:22,borderRadius:11,background:'#fff',transition:'left .15s'});`;
var LBASE=`
 go(s){return ()=>this.setState({screen:s,toast:''})}
 say(m){this.setState({toast:m});clearTimeout(this.tt);this.tt=setTimeout(()=>this.setState({toast:''}),2200)}
 base(screens,tabDefs,noTab){
  const s=this.state.screen,v={};screens.forEach(a=>v[a[0]]=s===a[0]);
  const showTabs=noTab.indexOf(s)<0;
  return {themes:TH.map(t=>({label:t.l,frame:fr(t.v)})),
   nav:screens.map(a=>({l:a[1],on:this.go(a[0]),st:navSt(s===a[0])})),v,showTabs,
   area:{position:'absolute',top:50,bottom:showTabs?84:0,left:0,right:0,overflowY:'auto',padding:'4px 20px 28px'},
   tabs:tabDefs.map(t=>{const a=t[2].indexOf(s)>=0;return {l:t[0],i:t[1],on:this.go(t[3]),st:{flex:1,border:0,background:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',padding:0,color:a?'var(--pri)':'var(--mu)'},pill:{width:56,height:32,borderRadius:16,display:'grid',placeItems:'center',background:a?'var(--prs)':'transparent'}}}),
   toast:this.state.toast,hasToast:!!this.state.toast,forgot:this.state.forgot,
   act:{login:this.go(this.HOME),forgot:()=>this.setState(x=>({forgot:!x.forgot})),logout:this.go('login')}};
 }`;
