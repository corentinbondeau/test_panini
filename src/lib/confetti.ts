import confetti from 'canvas-confetti';

export function fireConfetti(rarity: string) {
  if (rarity === 'LEGENDAIRE') {
    // Big golden/purple burst
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.4 },
      colors: ['#a855f7', '#f3c623', '#ffd447', '#ffffff'],
      shapes: ['star', 'circle'],
      scalar: 1.5,
    });
    // Second burst
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.3, x: 0.3 },
        colors: ['#a855f7', '#f3c623'],
        shapes: ['star'],
        scalar: 1.2,
      });
    }, 200);
  } else if (rarity === 'RARE') {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#f3c623'],
      shapes: ['circle'],
      scalar: 1,
    });
  }
}
