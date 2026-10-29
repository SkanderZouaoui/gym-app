import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/** Données de démo pour l'espace Accueil (adhérents et encaissements) :
 *   npx tsx prisma/seed-demo-cash.ts   (après seed-demo-home.ts)
 * Idempotent : adhérents repérés par e-mail, paiements créés une seule fois.
 */
const MEMBERS = [
  { email: 'yasmine.benali@muscleup.dev', firstName: 'Yasmine', lastName: 'Benali', phone: '06 12 34 56 78', plan: 'Gym + cours', daysAgo: 150, method: 'CARD_AS_OTHER' },
  { email: 'omar.khelifi@muscleup.dev', firstName: 'Omar', lastName: 'Khelifi', phone: '06 22 33 44 55', plan: 'Gym', daysAgo: 12, method: 'CASH' },
  { email: 'lina.saidi@muscleup.dev', firstName: 'Lina', lastName: 'Saïdi', phone: '06 55 44 33 22', plan: 'Premium annuel', daysAgo: 40, method: 'TRANSFER' },
  { email: 'karim.mansouri@muscleup.dev', firstName: 'Karim', lastName: 'Mansouri', phone: '06 77 88 99 00', plan: 'Étudiant', daysAgo: 5, method: 'CASH' },
  { email: 'sarah.bouzid@muscleup.dev', firstName: 'Sarah', lastName: 'Bouzid', phone: '06 10 20 30 40', plan: 'Gym + cours trimestre', daysAgo: 100, method: 'CHECK' },
];

async function main() {
  const staff = await prisma.user.findUnique({ where: { email: 'staff-demo@muscleup.dev' } });
  if (!staff) throw new Error('Lancez d’abord seed-demo-home.ts (agent d’accueil de démo).');
  const day = 86_400_000;
  let created = 0;
  for (const m of MEMBERS) {
    let user = await prisma.user.findUnique({ where: { email: m.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: m.email, phone: m.phone, firstName: m.firstName, lastName: m.lastName,
          passwordHash: await argon2.hash('Muscle123!'), roles: { create: [{ role: 'MEMBER' }] },
        },
      });
    }
    const plan = await prisma.membershipPlan.findFirst({ where: { name: m.plan } });
    if (!plan) continue;
    const existing = await prisma.membership.findFirst({ where: { userId: user.id } });
    if (existing) continue;
    const start = new Date(Date.now() - m.daysAgo * day);
    const end = new Date(start.getTime() + plan.durationDays * day);
    const membership = await prisma.membership.create({
      data: { userId: user.id, planId: plan.id, startDate: start, endDate: end, status: end.getTime() > Date.now() ? 'ACTIVE' : 'EXPIRED' },
    });
    await prisma.payment.create({
      data: {
        membershipId: membership.id, amount: plan.price, method: m.method === 'CARD_AS_OTHER' ? 'OTHER' : (m.method as 'CASH' | 'TRANSFER' | 'CHECK'),
        recordedById: staff.id, recordedAt: start,
      },
    });
    created++;
  }
  console.log(`Caisse démo : ${created} adhérents et paiements créés.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
