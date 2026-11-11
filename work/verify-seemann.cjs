const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const file = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
const profile = fs.mkdtempSync(path.join(__dirname, 'chrome-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--no-first-run', '--disable-background-networking', '--enable-unsafe-swiftshader', '--no-sandbox',
  '--use-angle=swiftshader', '--mute-audio',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });

async function check() {
  const portPath = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; !fs.existsSync(portPath) && i < 90; i++) await sleep(100);
  const port = fs.readFileSync(portPath, 'utf8').split(/\r?\n/)[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  const calls = new Map();
  const errors = [];
  let id = 0;
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const { resolve, reject } = calls.get(message.id);
      calls.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      console.log('Browser exception:', errors.at(-1));
    } else if (message.method === 'Runtime.consoleAPICalled' && ['warning','error'].includes(message.params.type)) {
      console.log('Browser:', message.params.args.map(arg => arg.value || arg.description).join(' '));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    calls.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression, userGesture = false) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(__dirname, `${name}.png`), Buffer.from(shot.data, 'base64'));
  };
  const size = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: 1 });
  try {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await size(1280,850);

    await send('Page.navigate',{url:file});
    for(let i=0;i<70;i++) {
      if(await evaluate("document.readyState==='complete' && typeof seemannSong!=='undefined' && typeof projection==='function'")) break;
      await sleep(100);
    }
    const model=await evaluate('({title:score().title,lines:seemannTake.lines.length,notes:seemannTake.notes.length,duration:score().duration,events:score().events.length,projection:Boolean(projection),sections:wardCue.options.length})');
    assert.equal(model.title,'Seemann'); assert.equal(model.lines,38); assert.ok(model.events>500 && model.projection); assert.equal(model.sections,13);
    console.log('Seemann score',JSON.stringify(model));
    const frame=()=>evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const at=async time=>{
      await evaluate('stop(false); offset='+time+'; updateTransport();');
      await frame();
      return evaluate('({time:position(),caption:wardLyric.textContent,theme:stage.dataset.lighting,actor:figures[0].acting,piece:document.body.dataset.piece})');
    };
    const camera=await evaluate('[yaw,pitch,projectionZoom]');
    assert.equal((await at(21.2)).caption,'Komm in mein Boot');
    await screenshot('seemann-open-water');
    for (const time of [66,108,172,204,266]) {
      await at(time);
      const glitch=await evaluate('({amount:seaFracture,state:stage.dataset.fracture,mesh:figures[0].fracture,ghosts:seaSignalInk.getImageData(0,0,seaSignalCanvas.width,seaSignalCanvas.height).data.some((value,i)=>i%4===3 && value>0)})');
      assert.ok(glitch.amount>.8 && glitch.mesh>.8 && glitch.state==='rupture' && glitch.ghosts,JSON.stringify(glitch));
    }
    await at(108); await screenshot('seemann-rupture');
    await at(120.3);
    assert.ok(await evaluate("seaFracture>.35 && seaFracture<.75 && stage.dataset.fracture==='unstable'"));
    await sleep(550); await screenshot('seemann-partial-recovery');
    assert.ok((await at(51.9)).actor.reach>.45);
    await screenshot('seemann-hand');
    assert.equal((await at(120.3)).theme,'lantern');
    await screenshot('seemann-lantern');
    assert.equal((await at(219.4)).theme,'ember');
    await screenshot('seemann-ember');
    assert.equal((await at(259)).theme,'cold');
    assert.ok((await at(250.2)).actor.staring);
    await screenshot('seemann-alone');
    assert.deepEqual(await evaluate('[yaw,pitch,projectionZoom]'),camera);
    await evaluate("wardCue.value='5';wardCue.dispatchEvent(new Event('change'));");
    assert.ok(Math.abs(await evaluate('position()')-115.993691)<.002);
    await evaluate("$('addHead').click();$('addHead').click();");
    await at(120.4); await screenshot('seemann-choir');
    assert.equal(await evaluate('figures.length'),3);
    await evaluate('selectSong(songs.indexOf(morrowFull))');
    assert.deepEqual((await at(165.2)).actor.hands,[1,1]);
    assert.equal(await evaluate('wardCue.options.length'),11);
    assert.equal(await evaluate('document.body.dataset.piece'),'mutter');
    assert.ok(await evaluate('figures.every(figure=>figure.fracture===0)'));
    await evaluate('selectSong(songs.findIndex(song=>song!==morrowFull && song!==seemannSong))');
    assert.ok(await evaluate("wardCue.hidden && $('backingToggle').hidden && !document.body.dataset.piece"));
    await evaluate('selectSong(songs.indexOf(seemannSong))');
    await at(115.9);
    await evaluate("$('play').click()",true);
    let live;
    for(let i=0;i<70;i++) {
      live=await evaluate('({active:Boolean(active?.setBacking),time:position(),hz:figures[0].hz,error:audioError})');
      if(live.active && live.time>116.3 && live.hz>0) break;
      await sleep(70);
    }
    assert.ok(live.active && live.hz>0 && !live.error,JSON.stringify(live));
    await evaluate('stop(true)');
    console.log('Live playback and scene checks',JSON.stringify(live));
    await evaluate("$('removeHead').click();$('removeHead').click();");
    const render=await evaluate('(async()=>{'+
      'const ctx=new OfflineAudioContext(2,Math.ceil((seemannSong.duration+.4)*24000),24000);'+
      'const backing=await prepareBacking(ctx,seemannSong);'+
      'const voices=choirArrangement(seemannSong,1,"unison");'+
      'startPerformance(new VoiceEngine(ctx),voices,0,{...settings},backing,true);'+
      'const buffer=await ctx.startRendering(); const pcm=buffer.getChannelData(0);'+
      'let energy=0,peak=0; for(const value of pcm){energy+=value*value;peak=Math.max(peak,Math.abs(value));}'+
      'const wav=waveFile(buffer);const header=new Uint8Array(await wav.slice(0,12).arrayBuffer());'+
      'return {duration:buffer.duration,backing:backing.duration,peak,rms:Math.sqrt(energy/pcm.length),format:String.fromCharCode(...header.slice(8))};})()');
    assert.ok(render.duration>287 && render.peak<1 && render.rms>.015); assert.equal(render.format,'WAVE');
    console.log('Full offline WAV export',JSON.stringify(render));
    await evaluate("$('controlDrawer').open=true;$('speechTab').click();speechVoice.value='stage-de';speechRate.value='1.5';speechText.value='Guten Abend.';$('speechStart').click();",true);
    for(let i=0;i<60 && !await evaluate('Boolean(speechRun?.playback)');i++) await sleep(30);
    assert.ok(await evaluate('speechRun?.rate===1.5 && Boolean(speechRun.playback)'));
    await evaluate("$('speechStop').click()");
    await size(390,844,true); await at(120.3);
    assert.equal(await evaluate('document.documentElement.scrollWidth'),390);
    await screenshot('seemann-mobile');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await at(120.3);
    assert.equal(await evaluate('seaFracture'),0);
    assert.ok(await evaluate('figures.every(figure=>figure.fracture===0)'));
    assert.deepEqual(errors,[]);
    console.log('Speech, song switching, reduced motion, and mobile checks passed.');
  } finally { ws.close(); }
}
check().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>chrome.kill());
