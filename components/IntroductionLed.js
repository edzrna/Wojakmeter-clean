import { useEffect, useRef } from 'react';
import { mountIntroductionLed } from './introduction-led';
export default function IntroductionLed(){
 const ref=useRef(null);
 useEffect(()=>{
  const host=ref.current;const state=host.closest('#wm-introduction');const portrait=host.parentElement.querySelector('.lp-art');
  return mountIntroductionLed(host,state,portrait);
 },[]);
 return <div ref={ref} className="lp-led" aria-hidden="true" />;
}
