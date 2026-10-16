// PRNG determinístico local; mantém árvores/pedras nas mesmas posições após recarregar.
export function createSeededRandom(seed) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
        throw new RangeError('Semente inválida');
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
