/* Ghazal illustration engine: Wadi Rum scenes drawn on canvas.
   Everything is deterministic (seeded) so renders are identical every time. */
(function(){
const TAU=Math.PI*2;
function rng(seed){let s=(seed*9301+49297)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function lerp(a,b,t){return a+(b-a)*t}

/* ---------- sky ---------- */
function sky(c,w,h,stops){const g=c.createLinearGradient(0,0,0,h);stops.forEach(([o,col])=>g.addColorStop(o,col));c.fillStyle=g;c.fillRect(0,0,w,h)}
function glow(c,x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col.replace('A',a));g.addColorStop(1,col.replace('A',0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
function stars(c,w,h,n,seed,maxY){const r=rng(seed);for(let i=0;i<n;i++){const x=r()*w,y=Math.pow(r(),1.3)*h*maxY,s=r();c.globalAlpha=(0.25+s*0.75)*(1-y/(h*maxY)*0.7);c.fillStyle=s>0.93?'#ffe9c4':'#ffffff';c.beginPath();c.arc(x,y,s>0.97?1.6:0.35+s*0.9,0,TAU);c.fill();if(s>0.985){c.globalAlpha=.35;c.strokeStyle='#fff';c.lineWidth=.6;c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-5);c.lineTo(x,y+5);c.stroke()}}c.globalAlpha=1}
function milkyWay(c,w,h,seed){c.save();c.translate(w*0.5,h*0.28);c.rotate(-0.55);const r=rng(seed);
  const g=c.createLinearGradient(0,-h*0.12,0,h*0.12);g.addColorStop(0,'rgba(170,160,255,0)');g.addColorStop(.5,'rgba(215,200,255,.16)');g.addColorStop(1,'rgba(170,160,255,0)');c.fillStyle=g;c.fillRect(-w,-h*0.12,w*2,h*0.24);
  for(let i=0;i<w*1.2;i++){const x=(r()-0.5)*w*1.8,y=(r()+r()+r()-1.5)*h*0.06;c.globalAlpha=r()*0.7;c.fillStyle='#fff';c.fillRect(x,y,r()<.9?.7:1.3,r()<.9?.7:1.3)}
  c.globalAlpha=.35;for(let i=0;i<14;i++){const x=(r()-0.5)*w*1.5,y=(r()-0.5)*h*0.05;c.fillStyle='rgba(20,15,45,.55)';c.beginPath();c.ellipse(x,y,20+r()*50,3+r()*6,0,0,TAU);c.fill()}
  c.restore();c.globalAlpha=1}
function moon(c,x,y,r,bg){c.fillStyle='#fbf1d8';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.fillStyle=bg;c.beginPath();c.arc(x+r*0.42,y-r*0.18,r*0.9,0,TAU);c.fill();glow(c,x,y,r*5,'rgba(255,236,200,A)',.12)}
function sun(c,x,y,r,col,halo){glow(c,x,y,r*7,halo,.35);glow(c,x,y,r*2.4,halo,.5);c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,TAU);c.fill()}

/* ---------- Wadi Rum jebels: flat-topped massifs with sheer, striated walls ---------- */
function jebelPath(w,h,base,height,seed,unit){const r=rng(seed);const p=new Path2D();p.moveTo(-10,h+10);let x=-10;p.lineTo(x,base-height*0.2);
  while(x<w+20){const wall=unit*(0.12+r()*0.1),top=unit*(0.5+r()*1.6),topY=base-height*(0.35+r()*0.65);
    // rounded shoulder going up (sandstone domes)
    p.bezierCurveTo(x+wall*0.2,base-height*0.1,x+wall*0.1,topY+height*0.08,x+wall,topY);
    const seg=5+Math.floor(r()*4);for(let i=1;i<=seg;i++){const xx=x+wall+top*i/seg;p.lineTo(xx,topY+(r()-0.5)*height*0.07+(i===seg?height*0.03:0))}
    x+=wall+top;const dip=base-height*(r()*0.25);p.bezierCurveTo(x+wall*0.8,topY+height*0.1,x+wall*0.7,dip,x+wall*1.2,dip);x+=wall*1.2+r()*unit*0.5;p.lineTo(x,dip+(r()-0.5)*6)}
  p.lineTo(w+20,h+10);p.closePath();return p}
function jebels(c,w,h,o){const p=jebelPath(w,h,o.base,o.height,o.seed,o.unit);
  const g=c.createLinearGradient(0,o.base-o.height,0,o.base+20);g.addColorStop(0,o.top);g.addColorStop(1,o.bottom);c.fillStyle=g;c.fill(p);
  if(o.striate!==false){c.save();c.clip(p);const r=rng(o.seed+5);c.globalCompositeOperation='source-atop';
    for(let i=0;i<w/2.2;i++){const x=r()*w,y=o.base-o.height*(0.2+r()*0.9),len=o.height*(0.15+r()*0.6);c.strokeStyle=r()<0.55?(o.hi||'rgba(255,220,180,.10)'):'rgba(20,5,0,.13)';c.lineWidth=0.6+r()*1.8;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+r()*3-1.5,y+len*0.3,x+r()*4-2,y+len*0.7,x+r()*3-1.5,y+len);c.stroke()}
    // horizontal bedding lines
    for(let i=0;i<4;i++){c.strokeStyle='rgba(0,0,0,.035)';c.lineWidth=1;const yy=o.base-o.height*r();c.beginPath();c.moveTo(0,yy);c.lineTo(w,yy+r()*6);c.stroke()}
    // light from one side
    if(o.light){const lg=c.createLinearGradient(0,0,w,0);lg.addColorStop(0,o.light[0]);lg.addColorStop(1,o.light[1]);c.fillStyle=lg;c.fillRect(0,0,w,h)}
    c.restore()}
  if(o.haze){const hg=c.createLinearGradient(0,o.base-o.height*0.4,0,o.base);hg.addColorStop(0,'rgba(0,0,0,0)');hg.addColorStop(1,o.haze);c.save();c.clip(p);c.fillStyle=hg;c.fillRect(0,0,w,h);c.restore()}
  return p}

/* ---------- dunes ---------- */
function dunes(c,w,h,y,amp,seed,cols,ripples){const r=rng(seed);const p=new Path2D();p.moveTo(-10,h+10);p.lineTo(-10,y);let x=-10;
  while(x<w+10){const nx=x+w*(0.18+r()*0.25),cy=y-amp*(0.3+r()*0.9);p.bezierCurveTo(x+(nx-x)*0.3,cy,x+(nx-x)*0.55,cy,nx,y+(r()-0.5)*amp*0.4);x=nx}
  p.lineTo(w+10,h+10);p.closePath();const g=c.createLinearGradient(0,y-amp,0,h);g.addColorStop(0,cols[0]);g.addColorStop(1,cols[1]);c.fillStyle=g;c.fill(p);
  if(ripples){c.save();c.clip(p);c.strokeStyle=ripples;c.lineWidth=1;for(let i=0;i<22;i++){const yy=y+(h-y)*(i/22)+4;c.beginPath();for(let xx=-10;xx<w+10;xx+=8){c.lineTo(xx,yy+Math.sin(xx/(26+i*2)+i)*2.2)}c.globalAlpha=.5*(1-i/26);c.stroke()}c.restore();c.globalAlpha=1}
  return p}

/* ---------- silhouettes ---------- */
function jeep(c,x,y,s,col,dust){ // y = ground line
  if(dust){for(let i=0;i<9;i++){glow(c,x-s*(1.2+i*0.55),y-s*(0.25+i*0.05),s*(0.45+i*0.12),dust,.18-i*0.015)}}
  c.fillStyle=col;c.beginPath();
  c.moveTo(x-s*1.25,y-s*0.28);c.lineTo(x-s*1.25,y-s*0.55);c.lineTo(x-s*0.1,y-s*0.55);c.lineTo(x+s*0.05,y-s*0.95);c.lineTo(x+s*0.72,y-s*0.95);c.lineTo(x+s*0.95,y-s*0.58);c.lineTo(x+s*1.25,y-s*0.52);c.lineTo(x+s*1.28,y-s*0.28);c.closePath();c.fill();
  // rails & passengers in the back
  c.fillRect(x-s*1.2,y-s*0.85,s*0.05,s*0.3);c.fillRect(x-s*0.5,y-s*0.85,s*0.05,s*0.3);c.fillRect(x-s*1.2,y-s*0.87,s*0.75,s*0.04);
  c.beginPath();c.arc(x-s*0.95,y-s*0.72,s*0.1,0,TAU);c.arc(x-s*0.7,y-s*0.74,s*0.1,0,TAU);c.fill();
  // windows
  c.fillStyle='rgba(255,230,200,.25)';c.beginPath();c.moveTo(x+s*0.1,y-s*0.6);c.lineTo(x+s*0.16,y-s*0.88);c.lineTo(x+s*0.4,y-s*0.88);c.lineTo(x+s*0.4,y-s*0.6);c.closePath();c.fill();
  c.fillStyle=col;[x-s*0.78,x+s*0.78].forEach(wx=>{c.beginPath();c.arc(wx,y-s*0.2,s*0.22,0,TAU);c.fill()})}
function camel(c,x,y,s,col,rider,facing){const f=facing||1;c.save();c.translate(x,y);c.scale(f,1);c.fillStyle=col;c.strokeStyle=col;c.lineCap='round';
  c.lineWidth=s*0.09;[[-0.35,-0.05],[-0.2,0.05],[0.3,-0.02],[0.45,0.06]].forEach(([lx,sw])=>{c.beginPath();c.moveTo(s*lx,-s*0.95);c.quadraticCurveTo(s*(lx+sw),-s*0.5,s*(lx+sw*1.6),0);c.stroke()});
  c.beginPath();c.moveTo(-s*0.55,-s*0.95);c.bezierCurveTo(-s*0.6,-s*1.25,-s*0.25,-s*1.25,-s*0.1,-s*1.45);c.bezierCurveTo(s*0.05,-s*1.6,s*0.25,-s*1.5,s*0.35,-s*1.25);c.bezierCurveTo(s*0.5,-s*1.2,s*0.6,-s*1.05,s*0.55,-s*0.9);c.lineTo(-s*0.5,-s*0.85);c.closePath();c.fill();
  // neck & head
  c.lineWidth=s*0.16;c.beginPath();c.moveTo(s*0.5,-s*1.0);c.quadraticCurveTo(s*0.85,-s*1.05,s*0.9,-s*1.55);c.stroke();
  c.beginPath();c.ellipse(s*0.98,-s*1.6,s*0.17,s*0.09,0.25,0,TAU);c.fill();
  c.lineWidth=s*0.05;c.beginPath();c.moveTo(-s*0.55,-s*1.0);c.quadraticCurveTo(-s*0.72,-s*0.8,-s*0.66,-s*0.6);c.stroke();
  if(rider){c.beginPath();c.moveTo(-s*0.2,-s*1.5);c.lineTo(s*0.15,-s*1.5);c.lineTo(s*0.06,-s*2.02);c.lineTo(-s*0.1,-s*2.02);c.closePath();c.fill();c.beginPath();c.arc(-s*0.02,-s*2.13,s*0.12,0,TAU);c.fill();
    c.beginPath();c.moveTo(-s*0.12,-s*2.14);c.lineTo(-s*0.3,-s*1.8);c.lineTo(-s*0.04,-s*2.0);c.fill()}
  c.restore()}
function person(c,x,y,s,col,pack,pose){c.fillStyle=col;c.strokeStyle=col;c.lineCap='round';c.lineWidth=s*0.13;
  if(pose==='sit'){c.beginPath();c.arc(x,y-s*0.95,s*0.16,0,TAU);c.fill();c.beginPath();c.moveTo(x-s*0.2,y-s*0.78);c.lineTo(x+s*0.2,y-s*0.78);c.lineTo(x+s*0.32,y-s*0.1);c.lineTo(x-s*0.4,y);c.closePath();c.fill();return}
  c.beginPath();c.arc(x,y-s*1.62,s*0.15,0,TAU);c.fill();c.beginPath();c.moveTo(x-s*0.17,y-s*1.45);c.lineTo(x+s*0.17,y-s*1.45);c.lineTo(x+s*0.13,y-s*0.8);c.lineTo(x-s*0.13,y-s*0.8);c.closePath();c.fill();
  c.beginPath();c.moveTo(x-s*0.07,y-s*0.85);c.lineTo(x-s*0.2,y);c.moveTo(x+s*0.07,y-s*0.85);c.lineTo(x+s*0.22,y-s*0.02);c.stroke();
  if(pack){c.fillRect(x-s*0.36,y-s*1.4,s*0.22,s*0.45)}
  if(pose==='wave'){c.beginPath();c.moveTo(x+s*0.15,y-s*1.4);c.lineTo(x+s*0.45,y-s*1.95);c.stroke()}
  if(pose==='robe'){c.clearRect;c.beginPath();c.moveTo(x-s*0.24,y-s*1.42);c.quadraticCurveTo(x,y-s*1.5,x+s*0.24,y-s*1.42);c.lineTo(x+s*0.34,y);c.lineTo(x-s*0.34,y);c.closePath();c.fill();
    c.beginPath();c.moveTo(x-s*0.2,y-s*1.78);c.quadraticCurveTo(x,y-s*1.9,x+s*0.2,y-s*1.78);c.lineTo(x+s*0.28,y-s*1.3);c.quadraticCurveTo(x+s*0.1,y-s*1.4,x-s*0.02,y-s*1.36);c.lineTo(x-s*0.3,y-s*1.2);c.closePath();c.fill();
    c.lineWidth=s*0.05;c.beginPath();c.moveTo(x+s*0.42,y+s*0.02);c.lineTo(x+s*0.52,y-s*1.5);c.stroke();c.lineWidth=s*0.1;c.beginPath();c.moveTo(x+s*0.2,y-s*1.2);c.lineTo(x+s*0.48,y-s*1.05);c.stroke()}}
function tent(c,x,y,s,col,lit){ // Bedouin goat-hair tent (beit al-sha'ar)
  c.fillStyle=col;c.beginPath();c.moveTo(x-s*1.6,y);c.lineTo(x-s*1.45,y-s*0.42);c.quadraticCurveTo(x-s*1.1,y-s*0.5,x-s*0.8,y-s*0.62);c.quadraticCurveTo(x-s*0.4,y-s*0.52,x,y-s*0.66);c.quadraticCurveTo(x+s*0.4,y-s*0.52,x+s*0.8,y-s*0.62);c.quadraticCurveTo(x+s*1.1,y-s*0.5,x+s*1.45,y-s*0.42);c.lineTo(x+s*1.6,y);c.closePath();c.fill();
  // Sadu curtain stripe
  c.fillStyle='rgba(170,45,35,.85)';c.fillRect(x-s*1.44,y-s*0.36,s*2.88,s*0.05);c.fillStyle='rgba(240,225,200,.55)';for(let i=0;i<14;i++)c.fillRect(x-s*1.4+i*s*0.205,y-s*0.35,s*0.06,s*0.03);
  if(lit){c.fillStyle='rgba(255,190,110,.9)';c.fillRect(x-s*0.6,y-s*0.3,s*0.5,s*0.3);c.fillRect(x+s*0.25,y-s*0.3,s*0.4,s*0.3);glow(c,x,y-s*0.1,s*1.6,'rgba(255,170,90,A)',.28)}
  c.strokeStyle=col;c.lineWidth=1;c.beginPath();c.moveTo(x-s*1.6,y);c.lineTo(x-s*2.0,y+s*0.02);c.moveTo(x+s*1.6,y);c.lineTo(x+s*2.0,y+s*0.02);c.stroke()}
function fire(c,x,y,s,seed){glow(c,x,y-s*0.3,s*6,'rgba(255,160,80,A)',.4);glow(c,x,y-s*0.3,s*2,'rgba(255,210,140,A)',.7);
  c.fillStyle='#ffcf7a';c.beginPath();c.moveTo(x-s*0.4,y);c.quadraticCurveTo(x-s*0.5,y-s*0.6,x,y-s*1.3);c.quadraticCurveTo(x+s*0.5,y-s*0.6,x+s*0.4,y);c.closePath();c.fill();
  c.fillStyle='#fff3cf';c.beginPath();c.moveTo(x-s*0.18,y);c.quadraticCurveTo(x-s*0.2,y-s*0.4,x,y-s*0.75);c.quadraticCurveTo(x+s*0.2,y-s*0.4,x+s*0.18,y);c.fill();
  const r=rng(seed||3);c.fillStyle='#ffd08a';for(let i=0;i<10;i++){c.globalAlpha=r()*0.8;c.fillRect(x+(r()-0.5)*s*2,y-s*(1.2+r()*3),1.2,1.2)}c.globalAlpha=1}
function balloon(c,x,y,s,cols){c.save();for(let i=0;i<6;i++){c.fillStyle=cols[i%cols.length];c.beginPath();const a0=-Math.PI/2-0.9+i*0.3,a1=a0+0.3;
    c.moveTo(x,y+s*0.95);c.bezierCurveTo(x+Math.cos(a0)*s*1.6,y+s*0.3,x+Math.cos(a0)*s*1.25,y-s*1.1,x,y-s*1.05);c.bezierCurveTo(x+Math.cos(a1)*s*1.25,y-s*1.1,x+Math.cos(a1)*s*1.6,y+s*0.3,x,y+s*0.95);c.fill()}
  // envelope outline via ellipse overlay shading
  const g=c.createLinearGradient(x-s,0,x+s,0);g.addColorStop(0,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(0,0,0,.25)');c.fillStyle=g;c.beginPath();c.moveTo(x,y+s*0.95);c.bezierCurveTo(x-s*1.35,y+s*0.3,x-s*1.1,y-s*1.1,x,y-s*1.05);c.bezierCurveTo(x+s*1.1,y-s*1.1,x+s*1.35,y+s*0.3,x,y+s*0.95);c.fill();
  c.strokeStyle='rgba(40,20,10,.8)';c.lineWidth=Math.max(.6,s*0.03);c.beginPath();c.moveTo(x-s*0.2,y+s*0.9);c.lineTo(x-s*0.14,y+s*1.25);c.moveTo(x+s*0.2,y+s*0.9);c.lineTo(x+s*0.14,y+s*1.25);c.stroke();
  c.fillStyle='#3a2014';c.fillRect(x-s*0.16,y+s*1.23,s*0.32,s*0.2);c.restore()}
function hoodoo(c,x,y,s,col,seed){const r=rng(seed);c.fillStyle=col;c.beginPath();c.moveTo(x-s*0.35,y);c.bezierCurveTo(x-s*0.2,y-s*0.5,x-s*0.35,y-s*0.9,x-s*0.15,y-s*1.1);c.bezierCurveTo(x-s*0.8,y-s*1.25,x-s*0.6,y-s*1.6,x,y-s*1.62);c.bezierCurveTo(x+s*0.7,y-s*1.6,x+s*0.85,y-s*1.25,x+s*0.18,y-s*1.1);c.bezierCurveTo(x+s*0.35,y-s*0.9,x+s*0.2,y-s*0.5,x+s*0.4,y);c.closePath();c.fill();
  c.fillStyle='rgba(0,0,0,.12)';c.beginPath();c.moveTo(x+s*0.05,y);c.bezierCurveTo(x+s*0.2,y-s*0.5,x+s*0.1,y-s*0.9,x+s*0.18,y-s*1.1);c.bezierCurveTo(x+s*0.85,y-s*1.25,x+s*0.7,y-s*1.6,x,y-s*1.62);c.bezierCurveTo(x+s*0.5,y-s*1.4,x+s*0.4,y-s*1.2,x+s*0.4,y);c.fill()}
function acacia(c,x,y,s,col,seed){ // umbrella acacia, the "desert tree"
  const r=rng(seed||5);c.fillStyle=col;c.strokeStyle=col;c.lineCap='round';
  c.lineWidth=s*0.07;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-s*0.02,y-s*0.3,x+s*0.05,y-s*0.5,x-s*0.02,y-s*0.72);c.stroke();
  c.lineWidth=s*0.035;[[-0.5,-0.8],[-0.25,-0.86],[0.3,-0.84],[0.55,-0.78]].forEach(([bx,by])=>{c.beginPath();c.moveTo(x-s*0.01,y-s*0.55);c.quadraticCurveTo(x+s*bx*0.4,y-s*0.72,x+s*bx,y+s*by);c.stroke()});
  for(let i=0;i<9;i++){const cx=x+(r()-0.5)*s*1.3,cy=y-s*(0.86+r()*0.08);c.beginPath();c.ellipse(cx,cy,s*(0.18+r()*0.14),s*(0.05+r()*0.03),0,0,TAU);c.fill()}
  c.beginPath();c.ellipse(x,y-s*0.9,s*0.62,s*0.07,0,0,TAU);c.fill()}
function grain(c,w,h,seed,a){const r=rng(seed);const n=Math.floor(w*h/28);for(let i=0;i<n;i++){c.fillStyle=r()<.5?`rgba(255,255,255,${a*r()})`:`rgba(0,0,0,${a*r()})`;c.fillRect(r()*w,r()*h,1,1)}}
function vignette(c,w,h,a){const g=c.createRadialGradient(w/2,h*0.55,Math.min(w,h)*0.3,w/2,h*0.55,Math.max(w,h)*0.8);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(10,5,20,${a})`);c.fillStyle=g;c.fillRect(0,0,w,h)}

/* ---------- scenes ---------- */
const S={
  night(c,w,h){const top='#070a1f';sky(c,w,h,[[0,top],[.45,'#131a47'],[.75,'#3d2758'],[.9,'#8a3f45'],[1,'#c46a45']]);milkyWay(c,w,h,4);stars(c,w,h,Math.floor(w*h/900),7,.85);moon(c,w*0.78,h*0.16,Math.min(w,h)*0.045,'#0c1030');
    jebels(c,w,h,{base:h*0.72,height:h*0.3,seed:11,unit:w/3.2,top:'#2f1c3c',bottom:'#241631',hi:'rgba(200,170,255,.06)',haze:'rgba(120,60,90,.35)'});
    jebels(c,w,h,{base:h*0.82,height:h*0.22,seed:23,unit:w/2.6,top:'#4a2330',bottom:'#2d1520',hi:'rgba(255,170,120,.08)'});
    dunes(c,w,h,h*0.86,h*0.05,5,['#6e2e20','#2b120d'],'rgba(255,190,140,.12)');
    acacia(c,w*0.2,h*0.895,w*0.2,'#120806',3);tent(c,w*0.44,h*0.885,w*0.09,'#140a08',true);fire(c,w*0.62,h*0.9,w*0.012,9);
    person(c,w*0.58,h*0.905,w*0.022,'#140a08',false,'sit');person(c,w*0.665,h*0.905,w*0.022,'#140a08',false,'sit');
    camel(c,w*0.84,h*0.92,w*0.035,'#150a08',false,-1);
    grain(c,w,h,2,.05);vignette(c,w,h,.45)},
  day(c,w,h){sky(c,w,h,[[0,'#6fa3cf'],[.55,'#c7dbe6'],[.8,'#f1d9b8'],[1,'#f3c794']]);sun(c,w*0.82,h*0.2,h*0.05,'#fff7e6','rgba(255,240,210,A)');
    jebels(c,w,h,{base:h*0.62,height:h*0.28,seed:31,unit:w/2.4,top:'#c98a6a',bottom:'#b77252',hi:'rgba(255,230,200,.12)',haze:'rgba(220,190,180,.5)',light:['rgba(255,255,255,.08)','rgba(0,0,0,.05)']});
    jebels(c,w,h,{base:h*0.74,height:h*0.3,seed:37,unit:w/2,top:'#b5532c',bottom:'#8d3a1f',light:['rgba(255,210,160,.14)','rgba(0,0,0,.12)']});
    dunes(c,w,h,h*0.8,h*0.06,8,['#e18a4f','#b85a2d'],'rgba(120,40,10,.18)');
    jeep(c,w*0.55,h*0.9,w*0.06,'#2a140c','rgba(240,190,140,A)');grain(c,w,h,3,.05)},
  sunset(c,w,h){sky(c,w,h,[[0,'#3b3a78'],[.35,'#a24d6a'],[.62,'#f08a54'],[.78,'#ffc27a'],[1,'#ffd9a0']]);sun(c,w*0.3,h*0.66,h*0.06,'#fff0c9','rgba(255,190,110,A)');stars(c,w,h,40,3,.25);
    jebels(c,w,h,{base:h*0.7,height:h*0.24,seed:41,unit:w/2.2,top:'#7a3346',bottom:'#5a2436',hi:'rgba(255,190,150,.08)',haze:'rgba(255,150,110,.35)'});
    jebels(c,w,h,{base:h*0.8,height:h*0.22,seed:43,unit:w/1.8,top:'#4d1d27',bottom:'#2b0f16'});
    dunes(c,w,h,h*0.85,h*0.05,9,['#6a2618','#2a0e09']);
    tent(c,w*0.7,h*0.9,w*0.08,'#1a0806',true);jeep(c,w*0.3,h*0.93,w*0.05,'#1a0806',null);grain(c,w,h,4,.05)},
  canyon(c,w,h){sky(c,w,h,[[0,'#f6c98c'],[1,'#f09a5c']]);sun(c,w*0.5,h*0.28,h*0.05,'#fff4de','rgba(255,220,160,A)');
    jebels(c,w,h,{base:h*0.72,height:h*0.2,seed:51,unit:w/2,top:'#c9764b',bottom:'#a85832',haze:'rgba(250,190,140,.5)'});
    // canyon walls
    [[0,1],[w,-1]].forEach(([x0,d],k)=>{const p=new Path2D();p.moveTo(x0,0);p.lineTo(x0+d*w*0.26,0);p.bezierCurveTo(x0+d*w*0.2,h*0.3,x0+d*w*0.34,h*0.55,x0+d*w*0.3,h);p.lineTo(x0,h);p.closePath();
      const g=c.createLinearGradient(x0,0,x0+d*w*0.3,0);g.addColorStop(0,k?'#5a2312':'#6d2a14');g.addColorStop(1,k?'#9a4523':'#b4552b');c.fillStyle=g;c.fill(p);c.save();c.clip(p);const r=rng(60+k);for(let i=0;i<180;i++){const x=x0+d*r()*w*0.3,y=r()*h;c.strokeStyle=r()<.5?'rgba(255,200,150,.12)':'rgba(40,10,0,.18)';c.lineWidth=.8+r()*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+r()*3,y+h*0.1+r()*h*0.2);c.stroke()}c.restore()});
    dunes(c,w,h,h*0.86,h*0.04,12,['#e79a5d','#c06a36'],'rgba(120,40,10,.18)');jeep(c,w*0.5,h*0.95,w*0.055,'#2b1208','rgba(250,200,150,A)');grain(c,w,h,5,.05)},
  white(c,w,h){sky(c,w,h,[[0,'#8fb4d4'],[.6,'#dfe8ec'],[1,'#f3ede4']]);sun(c,w*0.2,h*0.18,h*0.04,'#ffffff','rgba(255,255,255,A)');
    jebels(c,w,h,{base:h*0.66,height:h*0.2,seed:71,unit:w/2.2,top:'#d8b8a2',bottom:'#c49c85',haze:'rgba(235,225,220,.6)'});
    dunes(c,w,h,h*0.76,h*0.05,13,['#f2eadf','#d9ccbb'],'rgba(140,110,80,.18)');
    hoodoo(c,w*0.3,h*0.84,h*0.28,'#e8dccb',3);hoodoo(c,w*0.62,h*0.86,h*0.2,'#ddcfbd',4);hoodoo(c,w*0.8,h*0.82,h*0.13,'#e3d7c5',5);
    person(c,w*0.44,h*0.86,h*0.06,'#5a4636',true);grain(c,w,h,6,.04)},
  arch(c,w,h){sky(c,w,h,[[0,'#5c8fc3'],[.6,'#b9d0de'],[1,'#f0d6b2']]);
    jebels(c,w,h,{base:h*0.7,height:h*0.2,seed:81,unit:w/2.4,top:'#c48a70',bottom:'#ad7058',haze:'rgba(220,200,195,.5)'});
    // massif with the rock bridge
    const p=new Path2D();p.moveTo(w*0.04,h);p.bezierCurveTo(w*0.1,h*0.6,w*0.18,h*0.36,w*0.3,h*0.3);p.bezierCurveTo(w*0.33,h*0.2,w*0.4,h*0.19,w*0.45,h*0.2);p.bezierCurveTo(w*0.5,h*0.19,w*0.56,h*0.19,w*0.6,h*0.21);p.bezierCurveTo(w*0.66,h*0.2,w*0.72,h*0.26,w*0.74,h*0.33);p.bezierCurveTo(w*0.86,h*0.42,w*0.9,h*0.65,w*0.97,h);p.closePath();
    const hole=new Path2D();hole.moveTo(w*0.36,h*0.46);hole.bezierCurveTo(w*0.36,h*0.3,w*0.42,h*0.235,w*0.5,h*0.235);hole.bezierCurveTo(w*0.58,h*0.235,w*0.64,h*0.3,w*0.64,h*0.46);hole.bezierCurveTo(w*0.58,h*0.42,w*0.42,h*0.42,w*0.36,h*0.46);hole.closePath();
    const g=c.createLinearGradient(w*0.1,0,w*0.9,0);g.addColorStop(0,'#c8633a');g.addColorStop(.6,'#9a4424');g.addColorStop(1,'#6e2d17');c.save();c.beginPath();c.addPath?0:0;
    const both=new Path2D();both.addPath(p);both.addPath(hole);c.fillStyle=g;c.fill(both,'evenodd');c.clip(both,'evenodd');const r=rng(85);for(let i=0;i<260;i++){const x=w*0.1+r()*w*0.8,y=h*0.15+r()*h*0.85;c.strokeStyle=r()<.5?'rgba(255,210,170,.13)':'rgba(40,10,0,.16)';c.lineWidth=.6+r()*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+r()*2,y+h*0.05+r()*h*0.12);c.stroke()}c.restore();
    dunes(c,w,h,h*0.9,h*0.03,14,['#e39a62','#c46c3a']);
    [0,1,2].forEach(i=>person(c,w*(0.45+i*0.04),h*0.205,h*0.04,'#2b140b',true));grain(c,w,h,7,.05)},
  peak(c,w,h){sky(c,w,h,[[0,'#4a5d9a'],[.4,'#c27f8a'],[.7,'#f4b88a'],[1,'#fbe0b8']]);sun(c,w*0.18,h*0.62,h*0.05,'#fff2d8','rgba(255,200,140,A)');
    jebels(c,w,h,{base:h*0.78,height:h*0.14,seed:91,unit:w/3,top:'#a86a78',bottom:'#8d5566',striate:false,haze:'rgba(250,200,170,.5)'});
    jebels(c,w,h,{base:h*0.86,height:h*0.14,seed:93,unit:w/2.6,top:'#7b3d45',bottom:'#5c2a31',striate:false});
    const p=new Path2D();p.moveTo(w*0.3,h);p.bezierCurveTo(w*0.42,h*0.6,w*0.5,h*0.3,w*0.6,h*0.22);p.bezierCurveTo(w*0.64,h*0.19,w*0.72,h*0.18,w*0.76,h*0.21);p.bezierCurveTo(w*0.82,h*0.35,w*0.9,h*0.6,w*1.02,h*0.72);p.lineTo(w*1.02,h);p.closePath();
    const g=c.createLinearGradient(w*0.3,0,w,0);g.addColorStop(0,'#c46a42');g.addColorStop(.45,'#8f3d23');g.addColorStop(1,'#4d1f14');c.fillStyle=g;c.fill(p);c.save();c.clip(p);const r=rng(97);for(let i=0;i<220;i++){const x=w*0.3+r()*w*0.72,y=h*0.2+r()*h*0.8;c.strokeStyle=r()<.5?'rgba(255,210,170,.12)':'rgba(30,5,0,.18)';c.lineWidth=.6+r()*1.8;c.beginPath();c.moveTo(x,y);c.lineTo(x-r()*6,y+h*0.06+r()*h*0.1);c.stroke()}c.restore();
    person(c,w*0.68,h*0.19,h*0.06,'#2a120b',true,'wave');grain(c,w,h,8,.05)},
  ridge(c,w,h){sky(c,w,h,[[0,'#1c2150'],[.45,'#5a3a6c'],[.75,'#d27a5e'],[1,'#f4b27a']]);stars(c,w,h,120,12,.45);moon(c,w*0.8,h*0.14,h*0.03,'#1d2250');
    jebels(c,w,h,{base:h*0.66,height:h*0.2,seed:101,unit:w/2.5,top:'#6b3548',bottom:'#51273a',haze:'rgba(240,140,110,.4)'});
    const p=new Path2D();p.moveTo(-5,h);p.lineTo(-5,h*0.62);p.bezierCurveTo(w*0.25,h*0.55,w*0.45,h*0.5,w*0.65,h*0.6);p.bezierCurveTo(w*0.8,h*0.68,w*0.95,h*0.66,w+5,h*0.7);p.lineTo(w+5,h);p.closePath();c.fillStyle='#2e1219';c.fill(p);
    [0.38,0.45,0.52].forEach((f,i)=>person(c,w*f,h*(0.535+i*0.01),h*0.07,'#140608',true));
    tent(c,w*0.8,h*0.88,w*0.07,'#120506',true);grain(c,w,h,9,.05)},
  camel(c,w,h){sky(c,w,h,[[0,'#5a6aa8'],[.35,'#e58f78'],[.6,'#ffc98c'],[1,'#ffe3b0']]);sun(c,w*0.66,h*0.6,h*0.09,'#fff3d2','rgba(255,210,140,A)');
    jebels(c,w,h,{base:h*0.66,height:h*0.18,seed:111,unit:w/2.4,top:'#b56a62',bottom:'#9a5250',haze:'rgba(255,190,150,.5)',striate:false});
    dunes(c,w,h,h*0.72,h*0.08,17,['#d77f48','#8a3c1e'],'rgba(90,25,5,.2)');
    [0.28,0.44,0.6].forEach((f,i)=>camel(c,w*f,h*(0.705-i*0.012),h*0.085,'#2a100a',i!==1,1));person(c,w*0.76,h*0.69,h*0.1,'#2a100a',false,'robe');grain(c,w,h,10,.05)},
  stars(c,w,h){sky(c,w,h,[[0,'#050818'],[.6,'#161c4a'],[.85,'#3e2c66'],[1,'#6a3a62']]);milkyWay(c,w,h,19);stars(c,w,h,Math.floor(w*h/500),13,.9);
    // star trails
    c.save();c.strokeStyle='rgba(220,220,255,.22)';c.lineWidth=.8;const r=rng(21);for(let i=0;i<30;i++){const rad=20+i*9;c.beginPath();const a=r()*TAU;c.arc(w*0.18,h*0.12,rad,a,a+0.4+r()*0.5);c.stroke()}c.restore();
    jebels(c,w,h,{base:h*0.8,height:h*0.18,seed:121,unit:w/2,top:'#241a3a',bottom:'#1a1330',striate:false});
    const rk=new Path2D();rk.moveTo(-5,h);rk.lineTo(-5,h*0.86);rk.bezierCurveTo(w*0.3,h*0.8,w*0.6,h*0.82,w+5,h*0.88);rk.lineTo(w+5,h);rk.closePath();c.fillStyle='#07050d';c.fill(rk);
    person(c,w*0.5,h*0.83,h*0.09,'#07050d',false,'sit');person(c,w*0.57,h*0.832,h*0.09,'#07050d',false,'sit');c.strokeStyle='rgba(140,255,160,.55)';c.lineWidth=1.2;c.beginPath();c.moveTo(w*0.52,h*0.765);c.lineTo(w*0.72,h*0.3);c.stroke();grain(c,w,h,11,.05)},
  balloon(c,w,h){sky(c,w,h,[[0,'#7fa6d6'],[.5,'#f2c6b0'],[1,'#ffe0b5']]);sun(c,w*0.15,h*0.7,h*0.05,'#fff5e0','rgba(255,220,170,A)');
    balloon(c,w*0.62,h*0.3,h*0.13,['#a4282a','#e0a33f','#f3e6d0','#1f2a5c']);balloon(c,w*0.3,h*0.44,h*0.07,['#1f2a5c','#e0a33f']);balloon(c,w*0.85,h*0.52,h*0.045,['#a4282a','#f3e6d0']);
    jebels(c,w,h,{base:h*0.8,height:h*0.2,seed:131,unit:w/2.4,top:'#c7866a',bottom:'#a86448',haze:'rgba(250,210,190,.55)'});
    dunes(c,w,h,h*0.88,h*0.04,21,['#e59c63','#c5703c']);grain(c,w,h,12,.04)},
  custom(c,w,h){sky(c,w,h,[[0,'#27305f'],[.4,'#8e4d6a'],[.7,'#f29a62'],[1,'#ffcf8e']]);sun(c,w*0.5,h*0.72,h*0.1,'#fff1cc','rgba(255,200,130,A)');stars(c,w,h,60,17,.3);
    jebels(c,w,h,{base:h*0.72,height:h*0.34,seed:141,unit:w/4,top:'#7d3a47',bottom:'#5c2735',haze:'rgba(255,160,110,.35)'});
    dunes(c,w,h,h*0.82,h*0.1,23,['#8a3a22','#3a140b']);
    jeep(c,w*0.18,h*0.93,h*0.1,'#1c0906','rgba(255,190,140,A)');[0.72,0.8].forEach((f,i)=>camel(c,w*f,h*0.9,h*0.08,'#1c0906',true,-1));person(c,w*0.45,h*0.745,h*0.1,'#1c0906',true,'wave');grain(c,w,h,13,.05)},
  deluxe(c,w,h){sky(c,w,h,[[0,'#0d1233'],[.55,'#2b2a63'],[.85,'#8a4a5a'],[1,'#d98a5c']]);stars(c,w,h,Math.floor(w*h/700),31,.7);moon(c,w*0.8,h*0.2,h*0.05,'#141a45');
    jebels(c,w,h,{base:h*0.7,height:h*0.28,seed:161,unit:w/2.2,top:'#3a2140',bottom:'#2a1630',haze:'rgba(200,110,90,.3)'});dunes(c,w,h,h*0.82,h*0.04,31,['#5e2a1f','#26100b']);
    // deluxe tent: pitched canvas with lit doorway
    const x=w*0.5,y=h*0.9,s=w*0.2;c.fillStyle='#e9dcc6';c.beginPath();c.moveTo(x-s,y);c.lineTo(x-s*0.8,y-s*0.55);c.lineTo(x+s*0.8,y-s*0.55);c.lineTo(x+s,y);c.closePath();c.fill();
    c.fillStyle='#c9b79a';c.beginPath();c.moveTo(x-s*0.8,y-s*0.55);c.lineTo(x,y-s*0.85);c.lineTo(x+s*0.8,y-s*0.55);c.closePath();c.fill();
    c.fillStyle='#ffc676';c.fillRect(x-s*0.2,y-s*0.42,s*0.4,s*0.42);glow(c,x,y-s*0.2,s*1.2,'rgba(255,190,110,A)',.35);
    acacia(c,w*0.14,h*0.92,w*0.22,'#150a08',7);grain(c,w,h,15,.05)},
  tentstay(c,w,h){sky(c,w,h,[[0,'#101540'],[.5,'#3a2a5c'],[.8,'#b35e4c'],[1,'#f19a60']]);stars(c,w,h,120,33,.5);
    jebels(c,w,h,{base:h*0.72,height:h*0.3,seed:171,unit:w/2,top:'#4f2635',bottom:'#35182a',haze:'rgba(240,140,100,.35)'});dunes(c,w,h,h*0.84,h*0.04,33,['#6a2e1f','#2a100a']);
    tent(c,w*0.56,h*0.9,w*0.17,'#140807',true);acacia(c,w*0.18,h*0.92,w*0.2,'#140807',9);fire(c,w*0.84,h*0.92,w*0.018,5);grain(c,w,h,16,.05)},
  host(c,w,h){sky(c,w,h,[[0,'#2b2f66'],[.45,'#9b5470'],[.72,'#f0935f'],[1,'#ffc98a']]);sun(c,w*0.5,h*0.58,w*0.1,'#fff0cc','rgba(255,200,130,A)');stars(c,w,h,80,21,.3);
    jebels(c,w,h,{base:h*0.66,height:h*0.2,seed:151,unit:w/1.8,top:'#7a3a4c',bottom:'#5d2b3b',haze:'rgba(255,150,110,.4)'});
    const p=new Path2D();p.moveTo(-5,h);p.lineTo(-5,h*0.74);p.bezierCurveTo(w*0.2,h*0.7,w*0.35,h*0.68,w*0.55,h*0.72);p.bezierCurveTo(w*0.75,h*0.76,w*0.9,h*0.8,w+5,h*0.82);p.lineTo(w+5,h);p.closePath();c.fillStyle='#2a0f14';c.fill(p);
    person(c,w*0.42,h*0.7,h*0.14,'#12060a',false,'robe');camel(c,w*0.7,h*0.765,h*0.07,'#12060a',false,-1);grain(c,w,h,14,.05);vignette(c,w,h,.3)}
};
window.drawScene=function(cv,name){const dpr=2,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;cv.width=w*dpr;cv.height=h*dpr;const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);(S[name]||S.day)(c,w,h)};
window.drawAll=function(){document.querySelectorAll('canvas[data-scene]').forEach(cv=>drawScene(cv,cv.dataset.scene))};
})();
