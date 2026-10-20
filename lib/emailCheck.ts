const KNOWN_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'hotmail.com.br',
  'outlook.com',
  'outlook.com.br',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.br',
  'icloud.com',
  'me.com',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'ig.com.br',
  'globo.com',
  'protonmail.com',
];

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

export function checkEmail(raw: string): { error: string | null; suggestion: string | null } {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_FORMAT.test(email)) {
    return { error: 'Digite um e-mail válido.', suggestion: null };
  }
  const [user, domain] = email.split('@');
  if (KNOWN_DOMAINS.includes(domain)) return { error: null, suggestion: null };

  let best: string | null = null;
  let bestDist = Infinity;
  for (const known of KNOWN_DOMAINS) {
    const d = distance(domain, known);
    if (d < bestDist) { bestDist = d; best = known; }
  }
  const maxDist = best && best.length < 9 ? 1 : 2;
  if (best && bestDist <= maxDist) {
    const suggestion = `${user}@${best}`;
    return { error: `Esse e-mail parece ter um erro de digitação. Você quis dizer ${suggestion}?`, suggestion };
  }
  return { error: null, suggestion: null };
}
