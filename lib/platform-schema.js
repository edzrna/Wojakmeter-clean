// Shared allowlists. No free-text inputs, wallet values or account data are collected.
export const FEATURES = {
 news: {label:'Noticias', selector:'#newsBanner'},
 bubbleMaps: {label:'Bubble Maps', selector:'#heroViewBubbleBtn,#bubbleMapsView'},
 bagMood: {label:'Bag Mood', selector:'#bagMoodSection,a[href="#bagMoodSection"]'},
 radar: {label:'Emotion Radar', selector:'#emotionRadarSection,a[href="#emotionRadarSection"]'},
 tokenExplorer: {label:'Token Explorer', selector:'#moodSection,a[href="#moodSection"]'},
 studio: {label:'Studio de contenido', selector:'#wojak-studio,a[href="#wojak-studio"]'},
 game: {label:'Emotion Rush', selector:'#emotionRush,a[href="#emotionRush"]'},
 pulse: {label:'Emotion Pulse', selector:'#pulseToggle,#pulsePanel'}
};
export const DEFAULTS = {analyticsEnabled:true, announcement:'', features:Object.fromEntries(Object.keys(FEATURES).map(k=>[k,true]))};
export const PAGES = ['/', '/dashboard', '/about', '/privacy', '/terms', '/play'];
export const SECTIONS = {hero:'#heroStage',market:'#top-coins',bagMood:'#bagMoodSection',radar:'#emotionRadarSection',tokenExplorer:'#moodSection',studio:'#wojak-studio',game:'#emotionRush',scale:'#emotionScale'};
export const CLICKS = {rushOpen:'game_open',rushRestart:'game_restart',rushShare:'game_share',bagSearchBtn:'bag_search',bagResetBtn:'bag_reset_request',bagShareBtn:'bag_share',shareMoodBtn:'market_share',heroViewBubbleBtn:'bubble_open',heroViewMoodBtn:'hero_open',bubbleExpandBtn:'bubble_expand',tokenSearchBtn:'token_search',pulseToggle:'pulse_open',styleSelector:'character_style'};
export const EVENTS = ['page_view','heartbeat','section_view','click','scroll','web_vital'];
export const ACTIONS = [...Object.values(CLICKS),'bag_suggestion','bag_edit','bag_add_purchase','coin_open','timeframe_change','market_tab','studio_action','welcome_explore','dashboard_open'];
export function validateConfig(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['analyticsEnabled','announcement','features'].includes(k)))throw Error('Configuración inválida');
 if(typeof input.analyticsEnabled!=='boolean'||typeof input.announcement!=='string'||input.announcement.length>180)throw Error('Configuración inválida');
 if(!input.features||Object.keys(input.features).length!==Object.keys(FEATURES).length||Object.keys(FEATURES).some(k=>typeof input.features[k]!=='boolean'))throw Error('Funciones inválidas');
 return {analyticsEnabled:input.analyticsEnabled,announcement:input.announcement.trim(),features:Object.fromEntries(Object.keys(FEATURES).map(k=>[k,input.features[k]]))};
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeBatch(body){
 if(!body||!uuid.test(body.session||'')||!Array.isArray(body.events)||body.events.length<1||body.events.length>20)throw Error('Invalid batch');
 return body.events.map(e=>{
  if(!e||!uuid.test(e.id||'')||!EVENTS.includes(e.type)||!PAGES.includes(e.path))throw Error('Invalid event');
  let label='',value=0;
  if(e.type==='section_view'){if(!Object.hasOwn(SECTIONS,e.label))throw Error('Invalid section'); label=e.label;}
  if(e.type==='click'){if(!ACTIONS.includes(e.label))throw Error('Invalid action');label=e.label;}
  if(e.type==='scroll'){if(![25,50,75,100].includes(e.value))throw Error('Invalid scroll');value=e.value;}
  if(e.type==='heartbeat'){if(!Number.isFinite(e.value)||e.value<0||e.value>30)throw Error('Invalid duration');value=e.value;}
  if(e.type==='web_vital'){if(!['LCP','CLS'].includes(e.label)||!Number.isFinite(e.value)||e.value<0||e.value>60000)throw Error('Invalid vital');label=e.label;value=e.value;}
  return {id:e.id,type:e.type,path:e.path,label,value};
 });
}
export function sourceHost(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.hostname.slice(0,120):'direct';}catch{return 'direct';}}
export function deviceType(ua=''){return /ipad|tablet/i.test(ua)?'tablet':/mobi|android/i.test(ua)?'mobile':'desktop';}
export function browserType(ua=''){return /edg/i.test(ua)?'Edge':/firefox/i.test(ua)?'Firefox':/chrome|crios/i.test(ua)?'Chrome':/safari/i.test(ua)?'Safari':'Other';}
