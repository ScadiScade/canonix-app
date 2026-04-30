// Blocked email domains: disposable/temporary + corporate alias domains
const BLOCKED_DOMAINS = new Set([
  // Disposable/temporary email services
  "duck.com", "duckdns.org", "guerrillamail.com", "guerrillamailblock.com",
  "grr.la", "guerrillamail.info", "guerrillamail.net", "guerrillamail.org",
  "sharklasers.com", "spam4.me", "gishpuppy.com", "guerrillamail.de",
  "mailinator.com", "mailinator.net", "mailinator2.com", "getmailinator.com",
  "yopmail.com", "yopmail.fr", "yopmail.net", "yopmail.org",
  "tempmail.com", "tempmail.net", "temp-mail.org", "temp-mail.com",
  "throwaway.email", "trashmail.com", "trashmail.net", "trashmail.org",
  "dispostable.com", "maildrop.cc", "mailnesia.com", "tempail.com",
  "10minutemail.com", "10minutemail.net", "20minutemail.com",
  "mailcatch.com", "mailexpire.com", "mohmal.com", "mytemp.email",
  "tempinbox.com", "tempmailaddress.com", "tempmailo.com",
  "burnermail.io", "firemail.cloud", "incognitomail.org",
  "mailsac.com", "meltmail.com", "mintemail.com", "mt2015.com",
  "nada.email", "nada.ltd", "sharklasers.com", "spamgourmet.com",
  "trashymail.com", "wegwerfmail.de", "wegwerfmail.net",
  "emailondeck.com", "emailisvalid.com", "fakeinbox.com",
  "mailsifu.com", "mohmal.com", "tempmail.ninja", "tmpmail.net",
  "tmpmail.org", "disposableemailaddresses.emailmiser.com",
  "mailnull.com", "s0ny.net", "safetymail.info",
  // Corporate/alias domains (not personal emails)
  "gmail.co", "googlemail.co", "outlook.co", "hotmail.co",
  // Known alias/forwarding services
  "simplelogin.com", "simplelogin.ninja", "anonaddy.com", "anonaddy.me",
  "addy.io", "relay.firefox.com", "pm.me", "protonmail.blue",
  "33mail.com", "putthisinyourspam.com", "spamgourmet.net",
  "spamgourmet.org", "thespambox.com", "trashymail.net",
]);

// Well-known trusted domains
const TRUSTED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.fr",
  "hotmail.de", "hotmail.es", "hotmail.it", "hotmail.co.uk",
  "live.com", "live.ru", "live.fr", "live.de", "live.es", "live.it",
  "msn.com", "yahoo.com", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it",
  "yahoo.co.uk", "yahoo.co.jp", "yahoo.ru",
  "yandex.com", "yandex.ru", "yandex.ua", "yandex.by", "yandex.kz",
  "mail.ru", "inbox.ru", "list.ru", "bk.ru", "rambler.ru", "ro.ru",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "protonmail.ch", "proton.me",
  "aol.com", "zoho.com", "tutanota.com", "tutamail.com", "tuta.io",
  "fastmail.com", "fastmail.fm", "gmx.com", "gmx.net", "gmx.de",
  "web.de", "mail.com", "email.com", "posteo.de", "posteo.net",
]);

export function isEmailAllowed(email: string): { allowed: boolean; reason?: string } {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return { allowed: false, reason: "Некорректный email" };

  // Block known bad domains
  if (BLOCKED_DOMAINS.has(domain)) {
    return { allowed: false, reason: "Временные и одноразовые email не разрешены" };
  }

  // Check for patterns common in disposable emails
  const disposablePatterns = [
    /temp/i, /throw/i, /trash/i, /spam/i, /fake/i, /burn/i,
    /dispos/i, /guerril/i, /maildrop/i, /mailnull/i,
    /10min/i, /20min/i, /30min/i, /minute/i,
  ];
  if (disposablePatterns.some(p => p.test(domain))) {
    return { allowed: false, reason: "Временные и одноразовые email не разрешены" };
  }

  // If domain is in trusted list, allow immediately
  if (TRUSTED_DOMAINS.has(domain)) {
    return { allowed: true };
  }

  // For unknown domains, check that they look like real email providers
  // Must have a dot in domain and at least 2 chars after last dot
  if (!/\.[a-z]{2,}$/.test(domain)) {
    return { allowed: false, reason: "Некорректный домен email" };
  }

  return { allowed: true };
}
