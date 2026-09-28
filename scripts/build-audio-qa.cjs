// Audio-only QA: isolate storage BEFORE app boot and expose real context diagnostics.
const fs=require('node:fs');
let html=fs.readFileSync('dist/qa/first-install.html','utf8');
html=html.replace('const data=new Map();let writes=0;',`const data=new Map();let writes=0;
 const choice=new URLSearchParams(location.search).get('case')||'new';
 const seeds={on:{sound:true},off:{sound:false},missing:{},bgmOff:{bgm:false},sfxOff:{sfx:false}};
 if(choice in seeds)data.set('glassfall-v1',JSON.stringify({...seeds[choice],tutorialCompleted:true,endlessV1:{normal:{best:123}},qaPreserved:'keep'}));
 window.__AUDIO_QA_RESUMES__=[];
 const Native=window.AudioContext||window.webkitAudioContext;
 if(Native)window.AudioContext=class extends Native{resume(){window.__AUDIO_QA_RESUMES__.push({active:navigator.userActivation?.isActive,scene:window.BloomAudio?.stats().scene});return super.resume();}};`);
html=html.replace('</body>','<script src="qa/audio-qa.js?v=cb-rc2-audio1"></script>\n</body>');
fs.writeFileSync('dist/qa/audio.html',html);
