// Web Audio: iniciado apenas após interação do jogador.
// ========== AUDIO ==========
// AudioContext só é criado com interação do jogador, evitando bloqueio de autoplay.
let audioCtx = null;
function initAudio() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx && !audioCtx) audioCtx = new Ctx();
        if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
    } catch (_) { /* Áudio é opcional: o jogo deve continuar sem ele. */ }
}
function playTone(freq, duration, type = 'sine', vol = 0.15) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}
const sfx = {
    collect: () => { playTone(880, 0.12, 'square', 0.12); playTone(1320, 0.1, 'square', 0.08); },
    hit: () => playTone(140, 0.18, 'sawtooth', 0.22),
    attack: () => playTone(380, 0.07, 'square', 0.11),
    damage: () => { playTone(90, 0.22, 'triangle', 0.28); playTone(70, 0.15, 'sawtooth', 0.1); },
    heal: () => { playTone(520, 0.15, 'sine', 0.14); playTone(780, 0.2, 'sine', 0.1); },
    boost: () => { playTone(600, 0.1, 'square', 0.12); playTone(900, 0.15, 'square', 0.1); },
    win: () => { playTone(523, 0.18); setTimeout(() => playTone(659, 0.18), 180); setTimeout(() => playTone(784, 0.35), 360); },
    warning: () => { playTone(290, 0.19, 'triangle', 0.095);playTone(220, 0.29, 'triangle', 0.07); },
    lose: () => playTone(110, 0.55, 'sawtooth', 0.22)
};
export { initAudio, sfx };
