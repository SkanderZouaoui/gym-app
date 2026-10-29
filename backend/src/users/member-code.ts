import type { PrismaService } from '../prisma/prisma.service.js';

/** Code de pointage à 6 chiffres, unique (vérifié en base ; l'index unique reste le garde-fou final). */
export async function generateMemberCode(prisma: Pick<PrismaService, 'user'>): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    const taken = await prisma.user.findUnique({ where: { memberCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error('MEMBER_CODE_GENERATION_FAILED');
}
