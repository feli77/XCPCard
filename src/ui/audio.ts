let context: AudioContext | undefined;
export function sound(kind: 'flip' | 'rare' | 'AC' | 'WA') {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  const notes = kind === 'AC' ? [523, 659, 784, 1047] : kind === 'WA' ? [220, 164] : kind === 'rare' ? [659, 880, 1319] : [440];
  notes.forEach((frequency, i) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    const at = context!.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0.025, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.13);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(at); oscillator.stop(at + 0.14);
  });
}
