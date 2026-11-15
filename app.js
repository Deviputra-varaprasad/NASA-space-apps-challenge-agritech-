const $=id=>document.getElementById(id);
let chartLoader;
function ensureChartJS(){
  if(window.Chart) return Promise.resolve();
  if(!chartLoader) chartLoader=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/chart.js";
    script.onload=resolve;
    script.onerror=()=>reject(new Error("Could not load chart library. Check your internet connection."));
    document.head.appendChild(script);
  });
  return chartLoader;
}
const sample=[["Ragi","Poaceae",110,"Kharif","Low","Red / loamy",false],["Groundnut","Fabaceae",110,"Kharif","Moderate","Sandy loam",true],["Green gram","Fabaceae",70,"Kharif / summer","Low","Well-drained",true],["Maize","Poaceae",110,"Kharif / Rabi","Moderate","Loamy",false],["Red gram","Fabaceae",160,"Kharif","Low","Well-drained",true],["Paddy","Poaceae",135,"Kharif","High","Clayey / lowland",false],["Sunflower","Asteraceae",90,"Rabi / summer","Low","Well-drained",false]];
let crops=JSON.parse(localStorage.getItem("ts-crops")||"null")||sample.map((a,i)=>({id:i+1,name:a[0],family:a[1],days:a[2],season:a[3],water:a[4],soil:a[5],legume:a[6]}));
let farm=JSON.parse(localStorage.getItem("ts-farm")||"{}"),climate=null,rotations=[],chart=null,climateChart=null;
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function nav(id){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("show",x.id===id));document.querySelectorAll("nav [data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===id));$("title").textContent=({dashboard:"Overview",farm:"Farm profile",climate:"Climate intelligence",crops:"Crop library",simulator:"Rotation planner",advisor:"Farm advisor"})[id]||"Overview";window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=e=>{e.preventDefault();nav(b.dataset.page)});document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>nav(b.dataset.go));
function selects(){let opts=crops.map(c=>`<option>${safe(c.name)}</option>`).join("");$("current").innerHTML='<option value="">Choose crop</option>'+opts;$("previous").innerHTML='<option value="">Choose previous crop</option>'+opts}
function renderCrops(){selects();$("crop-table").innerHTML=crops.map(c=>`<tr><td>${safe(c.name)}</td><td>${safe(c.family)}</td><td>${c.days}</td><td>${safe(c.season)}</td><td>${safe(c.water)}</td><td>${c.legume?"Yes":"No"}</td><td><button data-del="${c.id}">Remove</button></td></tr>`).join("");document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{crops=crops.filter(c=>c.id!=b.dataset.del);localStorage.setItem("ts-crops",JSON.stringify(crops));renderCrops()})}
function renderFarm(){ $("fname").value=farm.name||"";$("area").value=farm.area||"";$("lat").value=farm.lat??12.759;$("lon").value=farm.lon??77.481;$("soil").value=farm.soil||"";$("irrigation").value=farm.irrigation||"Rainfed";$("water").value=farm.water||"Moderate";selects();$("current").value=farm.current||"";$("clat").value=farm.lat??12.759;$("clon").value=farm.lon??77.481;
$("d-farm").textContent=farm.name||"Not registered";$("d-soil").textContent=farm.soil||"Not entered";$("d-water").textContent=farm.water||"Not entered";$("d-climate").textContent=climate?"Fetched":"Not fetched";$("location").textContent=farm.name?farm.name+" · Karnataka":"Harohalli, Karnataka"}
$("farm-form").onsubmit=e=>{e.preventDefault();farm={name:$("fname").value,area:$("area").value,lat:+$("lat").value,lon:+$("lon").value,soil:$("soil").value,irrigation:$("irrigation").value,water:$("water").value,current:$("current").value};localStorage.setItem("ts-farm",JSON.stringify(farm));renderFarm();$("farm-msg").textContent="Farm details saved in this browser."};
$("crop-form").onsubmit=e=>{e.preventDefault();let name=$("cname").value.trim();if(crops.some(c=>c.name.toLowerCase()===name.toLowerCase())){$("crop-msg").textContent="Crop already exists.";return}crops.push({id:Date.now(),name,family:$("family").value,days:+$("days").value,season:$("season").value,water:$("cwater").value,soil:$("csoil").value,legume:$("legume").checked});localStorage.setItem("ts-crops",JSON.stringify(crops));renderCrops();e.target.reset();$("crop-msg").textContent="Crop added."};
$("reset").onclick=()=>{crops=sample.map((a,i)=>({id:i+1,name:a[0],family:a[1],days:a[2],season:a[3],water:a[4],soil:a[5],legume:a[6]}));localStorage.setItem("ts-crops",JSON.stringify(crops));renderCrops()};
function dateISO(d){return d.toISOString().slice(0,10)}let end=new Date();end.setDate(end.getDate()-2);let start=new Date(end);start.setFullYear(start.getFullYear()-1);$("start").value=dateISO(start);$("end").value=dateISO(end);
$("climate-form").onsubmit=async e=>{e.preventDefault();$("fetch").disabled=true;$("climate-msg").textContent="Requesting NASA POWER data…";try{let r=await fetch("/api/climate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude:+$("clat").value,longitude:+$("clon").value,start:$("start").value,end:$("end").value})});let d=await r.json();if(!r.ok)throw Error(d.detail||"Request failed");await ensureChartJS();climate=d;$("climate-results").hidden=false;$("temp").textContent=d.mean_temperature_c+" °C";$("rain").textContent=d.total_precipitation_mm+" mm";$("solar").textContent=d.mean_solar_radiation_kwh_m2_day+" kWh/m²/day";$("source-note").textContent=`Source: ${d.source}. Period ${d.period.start} to ${d.period.end}. ${d.note}`;if(climateChart)climateChart.destroy();climateChart=new Chart($("climate-chart"),{type:"bar",data:{labels:["Mean temperature °C","Total rainfall mm","Mean solar kWh/m²/day"],datasets:[{data:[d.mean_temperature_c,d.total_precipitation_mm,d.mean_solar_radiation_kwh_m2_day],backgroundColor:["#3d8054","#79aeca","#b6ce87"]}]},options:{plugins:{legend:{display:false}},responsive:true,maintainAspectRatio:true}});if(chart)chart.destroy();chart=new Chart($("dash-chart"),{type:"line",data:{labels:["Temperature","Precipitation","Solar radiation"],datasets:[{data:[d.mean_temperature_c,d.total_precipitation_mm,d.mean_solar_radiation_kwh_m2_day],borderColor:"#34784b",backgroundColor:"rgba(52,120,75,.12)",fill:true,tension:.35}]},options:{plugins:{legend:{display:false}},responsive:true,maintainAspectRatio:true}});$("dash-empty").textContent="Latest NASA POWER climate summary loaded. Open Climate Intelligence for the full data range.";renderFarm()}catch(err){$("climate-msg").textContent="Could not fetch data: "+err.message}finally{$("fetch").disabled=false}};
function waterScore(c){let rank={Low:1,Moderate:2,High:3},diff=rank[farm.water||"Moderate"]-rank[c.water];return diff>=0?90:diff===-1?60:30}
function score(seq,priority){let list=seq.map(n=>crops.find(c=>c.name===n)).filter(Boolean),water=list.reduce((s,c)=>s+waterScore(c),0)/list.length,soil=farm.soil?68:60,diversity=Math.min(100,45+new Set(list.map(c=>c.family)).size*13+list.filter(c=>c.legume).length*8),climateScore=65;let w=priority==="water"?[.2,.5,.15,.15]:priority==="soil"?[.5,.2,.15,.15]:priority==="diversity"?[.2,.2,.15,.45]:[.3,.3,.2,.2];return Math.round(soil*w[0]+water*w[1]+climateScore*w[2]+diversity*w[3])}
$("simulate").onclick=()=>{let prev=$("previous").value,n=+$("length").value;if(!prev){$("rotations").textContent="Choose a previous crop first.";return}let pool=crops.filter(c=>c.name!==prev),leg=pool.filter(c=>c.legume),low=pool.filter(c=>c.water==="Low"),non=pool.filter(c=>!c.legume);if(pool.length<2){$("rotations").textContent="Add more crops to the library.";return}let seqs=[[prev,...Array.from({length:n},(_,i)=>(i%2?non[i%Math.max(1,non.length)]:leg[i%Math.max(1,leg.length)]||pool[i%pool.length]).name)],[prev,...Array.from({length:n},(_,i)=>(low[i%low.length]||pool[i%pool.length]).name)],[prev,...Array.from({length:n},(_,i)=>pool[(i*2+1)%pool.length].name)]];rotations=seqs.map((s,i)=>({title:["Balanced rotation","Water-conscious option","Diversity-focused option"][i],sequence:s,score:score(s.slice(1),$("priority").value)})).sort((a,b)=>b.score-a.score);$("rotations").innerHTML=rotations.map((r,i)=>`<article class="rotation ${i===0?"best":""}"><h3>${r.title}</h3><b>${r.score}/100</b><p>Illustrative weighted score</p><ol>${r.sequence.map(x=>`<li>${safe(x)}</li>`).join("")}</ol><p>Soil health proxy, water suitability, climate placeholder and crop diversity.</p></article>`).join("");$("advice").innerHTML=`<h3>${safe(rotations[0].title)} ranks highest under your selected priority.</h3><p>Sequence: ${rotations[0].sequence.map(safe).join(" → ")}.</p><p>Scores are simple heuristics. Climate suitability is a neutral placeholder, not a climate-validated crop recommendation. Verify crop choices, local sowing dates, water needs and soil test results with a local KVK or agricultural university. No yield estimate is made.</p>`};
renderCrops();renderFarm();

// Detect farm location using browser GPS
$("detect-location").onclick = () => {
  const msg = $("location-msg");

  if (!navigator.geolocation) {
    msg.textContent = "GPS is not supported by this browser.";
    return;
  }

  msg.textContent = "Detecting your farm location...";
  const gpsButton = $("detect-location");
  gpsButton.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      $("clat").value = latitude.toFixed(6);
      $("clon").value = longitude.toFixed(6);
      $("lat").value = latitude.toFixed(6);
      $("lon").value = longitude.toFixed(6);

      msg.textContent = "Location detected successfully! 📍";
      gpsButton.disabled = false;
    },
    (error) => {
      msg.textContent = "Location error: " + error.message;
      gpsButton.disabled = false;
    },
  {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  }
  );
};
