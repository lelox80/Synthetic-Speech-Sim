let seaAudioEnergy = null;

function analyseSeemannAudio(buffer, lyricLines) {
  const hop = Math.max(1,Math.round(buffer.sampleRate*.02));
  const step = hop/buffer.sampleRate;
  const count = Math.ceil(buffer.length/hop);
  const channels = Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  const previous = new Float64Array(channels.length);
  const filtered = new Float64Array(channels.length);
  const pole = Math.exp(-TAU*180/buffer.sampleRate);
  const energy = new Float32Array(count);

  // Weight the upper spectrum so the bass arpeggio leaves room for the band swells.
  for (let frame=0;frame<count;frame++) {
    const begin = frame*hop, end = Math.min(buffer.length,begin+hop);
    let broad = 0, upper = 0;
    for (let channel=0;channel<channels.length;channel++) {
      const pcm = channels[channel];
      let last = previous[channel], high = filtered[channel];
      for (let sample=begin;sample<end;sample++) {
        const value = pcm[sample];
        high = pole*(high+value-last);
        last = value;
        broad += value*value;
        upper += high*high;
      }
      previous[channel]=last;
      filtered[channel]=high;
    }
    const samples = Math.max(1,(end-begin)*channels.length);
    energy[frame]=.25*Math.sqrt(broad/samples)+.75*Math.sqrt(upper/samples);
  }

  const audible = Array.from(energy).filter(value=>value>.00001).sort((a,b)=>a-b);
  const floor = audible[Math.floor(audible.length*.35)] ?? 0;
  const ceiling = audible[Math.floor(audible.length*.92)] ?? 0;
  const span = Math.max(.0001,ceiling-floor);
  const vocals = [];
  for (const words of lyricLines) {
    const start = words[0][1], end = words.at(-1)[2];
    const previous = vocals.at(-1);
    if (previous && start-previous.end<3) previous.end=end;
    else vocals.push({start,end});
  }

  const attacks = new Float32Array(count);
  const fracture = new Float32Array(count);
  const hands = new Float32Array(count);
  let fast = 0, slow = 0, grip = 0, heldGrip = 0, releasedAt = -Infinity;
  let overloadedUntil = -Infinity;
  let vocal = 0;
  for (let frame=0;frame<count;frame++) {
    const time = frame*step, value = energy[frame];
    fast = mix(fast,value,1-Math.exp(-step/(value > fast ? .025 : .16)));
    slow = mix(slow,value,1-Math.exp(-step/.32));
    const level = wardEase((fast-floor)/span);
    const attack = clamp((fast-slow)/span,0,1);
    const pressure = wardEase((slow-floor*.85)/Math.max(.0001,span*.65));
    attacks[frame]=attack;
    while (vocal<vocals.length && time>vocals[vocal].end+.10) vocal++;
    const singing = vocal<vocals.length && time>=vocals[vocal].start-.10;
    const measured = clamp(level*(.88+attack*.40)*pressure,0,1);
    const damage = measured*(singing ? .5 : 1);
    fracture[frame]=damage<.06?0:damage;

    // Singing releases the hands while the visual distortion keeps following the band.
    if (damage>.58 && !singing) overloadedUntil=time+.65;
    if (!singing && time<=overloadedUntil) {
      grip = mix(grip,1,1-Math.exp(-step/.24));
      heldGrip=grip;
      releasedAt=time;
    } else grip=heldGrip*(1-wardEase((time-releasedAt)/4.2));
    hands[frame]=grip<.005?0:grip;
  }
  return {step,duration:buffer.duration,attacks,fracture,hands};
}

function seemannMusicAt(time) {
  const data = seaAudioEnergy;
  if (!data || time<0 || time>=data.duration) return {attack:0,fracture:0,grip:0};
  const position = time/data.step;
  const first = Math.floor(position), last = Math.min(first+1,data.fracture.length-1);
  const fraction = position-first;
  return {
    attack:mix(data.attacks[first],data.attacks[last],fraction),
    fracture:mix(data.fracture[first],data.fracture[last],fraction),
    grip:mix(data.hands[first],data.hands[last],fraction)
  };
}
