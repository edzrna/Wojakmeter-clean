(() => {
  let stage=null,frame=null,observer=null,visible=false,ready=false,shown=false,token=0,key='',snapshot=null;
  function send(){if(!frame)return;const data=window.WM_BAG_PREVIEW||{score:50,mood:'neutral',style:'classic'};
    if(data.mood!==key){key=data.mood;token++;}
    const enabled=data.style==='classic';
    stage.classList.toggle('bag-3d-ready',shown&&enabled);
    frame.tabIndex=shown&&enabled?0:-1;frame.setAttribute("aria-hidden",String(!(shown&&enabled)));
    const axes={frustration:[.8,.9,.65,-.9],concern:[.65,.72,.35,-.45],doubt:[.4,.5,.25,-.2],neutral:[.2,.12,.15,0],optimism:[.45,.2,.12,.3],content:[.5,.16,.1,.55],euphoria:[.9,.48,.08,.9]}[data.mood]||[.2,.12,.15,0];
    frame.contentWindow?.postMessage({type:'wm-market',payload:{arousal:axes[0],tension:axes[1],fatigue:axes[2],valence:axes[3]},entranceToken:ready&&!shown?token:null},location.origin);
    frame.contentWindow?.postMessage({type:'wm-active',active:enabled&&visible&&!document.hidden},location.origin);
  }
  function start(){if(frame||!visible||(window.WM_BAG_PREVIEW?.style||'classic')!=='classic')return;
    frame=document.createElement('iframe');frame.title='Your bag emotion in 3D';frame.className='bag-3d-frame';frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.tabIndex=-1;
    frame.src='/wojak-3d/viewer.html?v=studio-awaken25';frame.onload=send;stage.append(frame);send();
  }
  function mount(){const img=document.getElementById('bagMoodHeroImg');if(!img)return;
    if(stage===img.parentElement)return;
    observer?.disconnect();frame?.remove();frame=null;ready=false;shown=false;key='';stage=img.parentElement;stage.classList.add('bag-3d-stage');
    if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;start();send();},{rootMargin:'100px'});observer.observe(stage);}else{visible=true;start();}
  }
  addEventListener('message',event=>{if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin)return;
    if(event.data?.type==='wm-ready'){ready=true;send();}
    if(event.data?.type==='wm-pose-ready'&&event.data.token===token){shown=true;frame.tabIndex=0;send();}
    if(event.data?.type==='wm-error'){shown=false;stage.classList.remove('bag-3d-ready');}
  });
  addEventListener('wm-bag-update',()=>{mount();start();send();});document.addEventListener('visibilitychange',send);
  setInterval(()=>{if(stage&&!stage.isConnected){observer?.disconnect();frame?.remove();stage=frame=null;ready=shown=false;}mount();send();},1500);mount();
})();
