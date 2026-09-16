// A single viewer survives all seven emotion selections.
export function createWelcomeBridge({ frame, origin, onReady, onError }) {
  let loaded=false, revealed=false, token=0, payload={}, active=true, stopped=false;
  const post=data=>{if(!stopped)frame.contentWindow?.postMessage(data,origin);};
  const send=()=>{post({type:'wm-market',payload,entranceToken:loaded&&!revealed?token:null});post({type:'wm-active',active});};
  return {
    update(value){payload=value;token++;send();},
    active(value){active=value;post({type:'wm-active',active});},
    sync:send,
    receive(event){
      if(stopped||event.origin!==origin||event.source!==frame.contentWindow)return;
      if(event.data?.type==='wm-ready'){loaded=true;send();}
      if(event.data?.type==='wm-pose-ready'&&loaded&&!revealed&&event.data.token===token){revealed=true;post({type:'wm-awaken'});onReady();}
      if(event.data?.type==='wm-error'){onError();}
    },
    destroy(){post({type:'wm-active',active:false});stopped=true;}
  };
}
