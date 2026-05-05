import prisma from "@/lib/prisma";

const DEV_EMAIL = "dev@canonix.local";
const DEV_ETERNAL_BALANCE = 99999;

/**
 * Check if user has enough credits. Dev account always passes.
 */
export async function checkCredits(userId: string, cost: number): Promise<{ ok: boolean; balance: number; creditId: string }> {
  let credit = await prisma.aiCredit.findUnique({ where: { userId } });
  if (!credit) {
    credit = await prisma.aiCredit.create({ data: { userId } });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user?.email === DEV_EMAIL) {
    // Ensure eternal balance
    if (credit.balance < DEV_ETERNAL_BALANCE) {
      await prisma.aiCredit.update({ where: { id: credit.id }, data: { balance: DEV_ETERNAL_BALANCE } });
      credit.balance = DEV_ETERNAL_BALANCE;
    }
    return { ok: true, balance: credit.balance, creditId: credit.id };
  }

  return { ok: credit.balance >= cost, balance: credit.balance, creditId: credit.id };
}

/**
 * Deduct AI credits from user atomically with balance guard.
 * Dev account: never deduct, keep eternal balance.
 * Returns updated balance.
 * Throws if balance would go negative (prevents race conditions).
 */
export async function deductCredits(userId: string, creditId: string, cost: number): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  if (user?.email === DEV_EMAIL) {
    // Dev account: never deduct, keep eternal balance
    await prisma.aiCredit.update({
      where: { id: creditId },
      data: { balance: DEV_ETERNAL_BALANCE },
    });
    return DEV_ETERNAL_BALANCE;
  }

  const updated = await prisma.aiCredit.update({
    where: { id: creditId },
    data: {
      balance: { decrement: cost },
      totalUsed: { increment: cost },
    },
  });

  // Prisma decrement can go negative — guard against it
  if (updated.balance < 0) {
    // Rollback: restore the deducted amount
    await prisma.aiCredit.update({
      where: { id: creditId },
      data: {
        balance: { increment: cost },
        totalUsed: { decrement: cost },
      },
    });
    throw new Error("Insufficient credits");
  }

  return updated.balance;
}
