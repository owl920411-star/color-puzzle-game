/* CRAYON BLOOM RC — observes real controller results; owns no board input. */
(function (global) {
  'use strict';
  const STEPS = Object.freeze([
    {title:'왼쪽을 톡!', hint:'게임판 왼쪽을 짧게 눌러요.'},
    {title:'이번엔 오른쪽을 톡!', hint:'게임판 오른쪽을 짧게 눌러요.'},
    {title:'이번엔 꾹 눌러볼까요?', hint:'길게 누르면 휘리릭!'},
    {title:'옆으로 슥!', hint:'오른쪽으로 밀면 블록이 돌아가요.'},
    {title:'위로 슥!', hint:'블록을 잠깐 보관해요.', target:'hold'},
    {title:'아래로 슥!', hint:'한 번에 쏙! 바로 내려가요.'},
    {title:'버튼으로도 쏙!', hint:'오른쪽의 쏙! 버튼을 눌러요.', target:'drop'},
    {title:'빈칸을 채워요!', hint:'오른쪽을 톡, 그다음 아래로 슥!'},
    {title:'연속으로 지우면 콤보!', hint:'콤보가 이어지면 친구들도 신나요!'},
    {title:'준비됐어요!', hint:'우리 같이 시작해볼까?'}
  ]);
  function create(options) {
    if (!options || !options.host || !options.host.ownerDocument) throw new TypeError('BloomTutorial requires a host');
    const host=options.host, doc=host.ownerDocument;
    const root=doc.createElement('section');root.className='bloom-tutorial';root.hidden=true;
    root.setAttribute('aria-label','크레용블룸 조작 연습');
    const note=doc.createElement('div');note.className='bloom-tutorial-note';
    const progress=doc.createElement('span');progress.className='bloom-tutorial-progress';
    const title=doc.createElement('h2'),hint=doc.createElement('p');
    const feedback=doc.createElement('span');feedback.className='bloom-tutorial-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
    const chick=doc.createElement('img');chick.className='bloom-tutorial-chick';chick.src='assets/bloom-chick.webp?v=cb-rc2';chick.alt='';chick.width=38;chick.height=38;chick.draggable=false;
    const hero=doc.createElement('img');hero.className='bloom-tutorial-hero';hero.src='assets/bloom-home-hero.webp?v=cb-rc2';hero.alt='크레용을 든 아기와 노란 병아리';hero.width=160;hero.height=120;hero.draggable=false;
    const startButton=doc.createElement('button');startButton.type='button';startButton.className='bloom-tutorial-start';startButton.textContent='게임 시작';
    const skipButton=doc.createElement('button');skipButton.type='button';skipButton.className='bloom-tutorial-skip';skipButton.textContent='건너뛰기';
    note.appendChild(progress);note.appendChild(title);note.appendChild(hint);note.appendChild(feedback);note.appendChild(chick);note.appendChild(hero);note.appendChild(startButton);
    root.appendChild(note);root.appendChild(skipButton);host.appendChild(root);
    let active=false,paused=false,destroyed=false,step=0,success=false,transition=null,timer=null;
    let repeatMoves=0,lastRepeatAt=-Infinity,lastRepeatDX=0,lineMoved=false,wrong=0,completed=0;
    const now=()=>global.performance && global.performance.now ? global.performance.now() : Date.now();
    function resetInput(){if(options.resetInput)options.resetInput();}
    function clearTask(){if(timer!==null)global.clearTimeout(timer);timer=null;transition=null;}
    function armTask(){if(!transition||paused||!active)return;transition.deadline=now()+transition.remaining;timer=global.setTimeout(()=>{timer=null;const task=transition;transition=null;if(active&&!paused&&task)task.fn();},transition.remaining);}
    function schedule(fn,delay,kind){clearTask();transition={fn,remaining:delay,deadline:now()+delay,kind};armTask();}
    function render(){
      const info=STEPS[step];root.dataset.step=String(step);root.classList.toggle('is-success',success);
      progress.textContent='';progress.setAttribute('aria-label','놀이 연습 '+(step+1)+' / '+STEPS.length);
      title.textContent=info.title;hint.textContent=info.hint;
      hero.hidden=step!==9;startButton.hidden=step!==9;skipButton.hidden=step===9;
      chick.hidden=!success;host.dataset.bloomTutorialTarget=info.target||'';
      root.hidden=!active||paused;
    }
    function prepare(){
      repeatMoves=0;lastRepeatAt=-Infinity;lastRepeatDX=0;lineMoved=false;
      resetInput();if(options.prepareStep)options.prepareStep(step);
    }
    function enter(index){
      clearTask();step=index;success=false;feedback.textContent='';prepare();render();
      if(step===8){if(options.celebrate)options.celebrate({combo:4,lines:0});schedule(()=>enter(9),1600,'combo-example');}
    }
    function succeed(){
      if(!active||paused||success)return;
      success=true;completed+=1;resetInput();feedback.textContent=step===7?'✓ 활짝!':'✓ 잘했어요!';
      if(options.successSound)options.successSound();
      if(step===7&&options.celebrate)options.celebrate({combo:3,lines:1});
      render();schedule(()=>enter(step+1),350,'success');
    }
    function retry(){
      if(!active||paused||success)return;
      wrong+=1;feedback.textContent='다시 한번 해볼까요?';repeatMoves=0;lastRepeatAt=-Infinity;
      // Do not reset a board from inside the engine method currently returning.
      // One deferred callback retires old input and restores the safe fixture.
      if(transition?.kind!=='retry')schedule(()=>{prepare();render();},0,'retry');
    }
    function observe(event){
      if(!active||paused||success||step>=8||!event)return false;
      const action=event.action,ok=event.success===true,board=event.source==='board';
      if(!ok){retry();return false;}
      if(step===0||step===1){
        const target=step===0?-1:1;
        if(board&&action==='move'&&event.dx===target&&event.inputState==='PENDING'){succeed();return true;}
        retry();return false;
      }
      if(step===2){
        if(board&&action==='move'&&event.inputState==='REPEATING'){
          const at=now();repeatMoves=at-lastRepeatAt<=160&&event.dx===lastRepeatDX?repeatMoves+1:1;lastRepeatAt=at;lastRepeatDX=event.dx;
          if(repeatMoves>=2){succeed();return true;}return false;
        }
        retry();return false;
      }
      if(step===3){if(board&&action==='rotate'){succeed();return true;}retry();return false;}
      if(step===4){if(board&&action==='hold'&&event.gesture==='hold'){succeed();return true;}retry();return false;}
      if(step===5){if(board&&action==='drop'&&event.gesture==='drop'){succeed();return true;}retry();return false;}
      if(step===6){if(action==='drop'&&event.source==='dropButton'){succeed();return true;}retry();return false;}
      if(step===7){
        if((action==='move'||action==='rotate')&&board){lineMoved=true;return false;}
        if(action==='clear'&&Number(event.lines)>0&&lineMoved){succeed();return true;}
        if(action==='drop'&&(board||event.source==='dropButton')){if(Number(event.lines)===0)retry();else if(event.lines===undefined)schedule(retry,650,'await-clear');return false;}
        retry();
      }
      return false;
    }
    function stop(){clearTask();active=false;paused=false;success=false;root.hidden=true;host.dataset.bloomTutorialTarget='';resetInput();}
    function finish(skipped){
      if(!active||paused||(!skipped&&step!==9))return;
      stop();if(options.saveCompleted)options.saveCompleted();if(options.finish)options.finish({skipped:Boolean(skipped)});
    }
    function start(){if(destroyed)return false;stop();active=true;paused=false;completed=0;wrong=0;enter(0);return true;}
    function setPaused(value){
      if(!active||paused===Boolean(value))return;
      paused=Boolean(value);resetInput();
      if(paused){if(transition)transition.remaining=Math.max(0,transition.deadline-now());if(timer!==null)global.clearTimeout(timer);timer=null;}
      else armTask();
      render();
    }
    function stats(){return{active,paused,step,success,completed,wrong,timers:Number(timer!==null),pending:transition?.kind||null,repeatMoves,destroyed};}
    const onSkip=()=>finish(true),onStart=()=>finish(false);
    skipButton.addEventListener('click',onSkip);startButton.addEventListener('click',onStart);
    function destroy(){if(destroyed)return;stop();destroyed=true;skipButton.removeEventListener('click',onSkip);startButton.removeEventListener('click',onStart);if(root.parentNode)root.parentNode.removeChild(root);}
    return {start,observe,stop,setPaused,stats,destroy};
  }
  global.BloomTutorial=Object.freeze({create,steps:STEPS});
})(typeof window==='undefined'?globalThis:window);
