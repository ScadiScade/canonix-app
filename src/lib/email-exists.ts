import dns from "dns";

interface EmailCheckResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check if an email domain has valid MX records.
 * SMTP verification is unreliable (most servers reject RCPT TO),
 * so we only check MX records — the verification email itself proves existence.
 */
export async function checkEmailExists(email: string): Promise<EmailCheckResult> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return { valid: false, reason: "Некорректный email" };

  try {
    const addresses = await resolveMx(domain);
    if (!addresses || addresses.length === 0) {
      return { valid: false, reason: "Домен не принимает почту. Проверьте email." };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "Домен не существует. Проверьте email." };
  }
}

function resolveMx(domain: string): Promise<Array<{ priority: number; exchange: string }>> {
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses || []);
    });
  });
}

