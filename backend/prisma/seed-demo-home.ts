import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/** Données de démo pour l'Accueil adhérent (abonnement actif, prochains cours,
 * réservation, actualités) pour le compte member-phase2@muscleup.dev :
 *   npx tsx prisma/seed-demo-home.ts
 * Idempotent : relancer ne crée pas de doublons. Crée aussi un coach et un admin de démo
 * (coach-demo@ / admin-demo@muscleup.dev, mot de passe Muscle123!).
 */
const PASSWORD = 'Muscle123!';

async function upsertUser(email: string, firstName: string, lastName: string, role: 'COACH' | 'ADMIN') {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      passwordHash: await argon2.hash(PASSWORD),
      roles: { create: [{ role }] },
    },
  });
}

async function main() {
  const member = await prisma.user.findUnique({ where: { email: 'member-phase2@muscleup.dev' } });
  if (!member) throw new Error('Compte member-phase2@muscleup.dev introuvable — créez-le via /v1/auth/register.');

  const coachUser = await upsertUser('coach-demo@muscleup.dev', 'Sarah', 'Benali', 'COACH');
  const admin = await upsertUser('admin-demo@muscleup.dev', 'Karim', 'Admin', 'ADMIN');
  await prisma.coachProfile.upsert({
    where: { userId: coachUser.id },
    update: {},
    create: { userId: coachUser.id, bio: 'Coach cardio et cours collectifs.', specialties: ['HIIT', 'Cycling'], yearsExperience: 6 },
  });

  // Abonnement « Gym + cours » : 180 jours, expire dans 28 jours
  let plan = await prisma.membershipPlan.findFirst({ where: { name: 'Gym + cours' } });
  if (!plan) {
    plan = await prisma.membershipPlan.create({
      data: { name: 'Gym + cours', description: 'Accès salle et cours collectifs', durationDays: 180, price: 540, isPopular: true, includesLabel: 'Accès libre + cours collectifs' },
    });
  }
  // Autres formules proposées dans l'écran Abonnement de l'app
  const otherPlans = [
    { name: 'Gym', description: 'Accès libre à la salle de musculation et de cardio.', durationDays: 30, price: 70, includesLabel: 'Accès libre à la salle', displayOrder: 1 },
    { name: 'Gym + cours trimestre', description: 'Salle et tous les cours collectifs pendant 3 mois.', durationDays: 90, price: 270, includesLabel: 'Accès libre + cours collectifs', displayOrder: 2 },
    { name: 'Premium annuel', description: 'Toute l’offre de la salle pendant un an, avec 2 invitations par mois.', durationDays: 365, price: 900, isPopular: true, includesLabel: 'Accès libre + cours + 2 invitations / mois', displayOrder: 3 },
    { name: 'Étudiant', description: 'Tarif réduit sur présentation de la carte étudiante.', durationDays: 30, price: 50, includesLabel: 'Accès libre en journée', displayOrder: 4 },
  ];
  for (const p of otherPlans) {
    const exists = await prisma.membershipPlan.findFirst({ where: { name: p.name } });
    if (!exists) await prisma.membershipPlan.create({ data: p });
  }

  const day = 86_400_000;
  const dates = { startDate: new Date(Date.now() - 152 * day), endDate: new Date(Date.now() + 28 * day) };
  const active = await prisma.membership.findFirst({ where: { userId: member.id, status: 'ACTIVE' } });
  if (active) {
    await prisma.membership.update({ where: { id: active.id }, data: { planId: plan.id, ...dates } });
  } else {
    await prisma.membership.create({ data: { userId: member.id, planId: plan.id, status: 'ACTIVE', ...dates } });
  }

  // Salles et types de cours
  const rooms = new Map<string, string>();
  for (const [name, capacity] of [['Studio 1', 20], ['Studio 2', 14], ['Salle de force', 16]] as const) {
    const room = (await prisma.room.findFirst({ where: { name } })) ?? (await prisma.room.create({ data: { name, capacity } }));
    rooms.set(name, room.id);
  }
  const types = new Map<string, string>();
  const typeDefs = [
    { name: 'HIIT Express', icon: 'local_fire_department', tone: 'danger', level: 'Intermédiaire', description: 'Intervalles courts et intenses alternant cardio, gainage et poids du corps. Un format efficace pour brûler un maximum de calories en peu de temps. Prévoyez une serviette et une gourde.' },
    { name: 'Cycling', icon: 'directions_bike', tone: 'info', level: 'Tous niveaux', description: 'Cours de vélo en salle rythmé par la musique : côtes, sprints et récupérations. Idéal pour progresser en endurance, chacun règle sa résistance à son niveau.' },
    { name: 'Yoga Flow', icon: 'self_improvement', tone: 'success', level: 'Tous niveaux', description: 'Enchaînements fluides synchronisés avec la respiration pour gagner en souplesse, en équilibre et en calme. Tapis fournis, tenue confortable recommandée.' },
    { name: 'Boxe', icon: 'sports_mma', tone: 'warning', level: 'Avancé', description: 'Travail technique des frappes et de la garde, puis circuits cardio sur sacs. Gants fournis, bandes de protection conseillées.' },
  ];
  for (const d of typeDefs) {
    const existing = await prisma.classType.findFirst({ where: { name: d.name } });
    const ct = existing
      ? await prisma.classType.update({ where: { id: existing.id }, data: { description: d.description, level: d.level } })
      : await prisma.classType.create({ data: d });
    types.set(d.name, ct.id);
  }

  // Prochains cours : dans 2 h, ce soir/demain et les jours suivants (relatifs à maintenant)
  const slots = [
    { inHours: 2, type: 'HIIT Express', room: 'Salle de force', min: 45, capacity: 16 },
    { inHours: 5, type: 'Yoga Flow', room: 'Studio 2', min: 60, capacity: 14 },
    { inHours: 24, type: 'Cycling', room: 'Studio 1', min: 45, capacity: 20 },
    { inHours: 30, type: 'Boxe', room: 'Salle de force', min: 60, capacity: 12 },
    { inHours: 48, type: 'HIIT Express', room: 'Studio 1', min: 30, capacity: 16 },
    { inHours: 72, type: 'Yoga Flow', room: 'Studio 2', min: 60, capacity: 14 },
  ];
  const created: { id: string; startsAt: Date }[] = [];
  for (const s of slots) {
    const startsAt = new Date(Date.now() + s.inHours * 3_600_000);
    startsAt.setMinutes(0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + s.min * 60_000);
    const classTypeId = types.get(s.type)!;
    const existing = await prisma.classSession.findFirst({ where: { classTypeId, startsAt } });
    const session =
      existing ??
      (await prisma.classSession.create({
        data: { classTypeId, roomId: rooms.get(s.room)!, coachId: coachUser.id, startsAt, endsAt, capacity: s.capacity, status: 'SCHEDULED' },
      }));
    created.push({ id: session.id, startsAt: session.startsAt });
  }

  // Réservation du membre sur le tout prochain cours
  const next = created.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  const booked = await prisma.booking.findFirst({ where: { userId: member.id, sessionId: next.id, status: 'CONFIRMED' } });
  if (!booked) {
    await prisma.booking.create({
      data: { sessionId: next.id, userId: member.id, status: 'CONFIRMED', bookingCode: Math.random().toString(36).slice(2, 8).toUpperCase() },
    });
  }

  // Actualités
  const news = [
    { title: 'Nouveau cours de Boxe le jeudi', body: 'Rejoignez Karim chaque jeudi à 18h30 en Salle de force. Gants fournis.', tone: 'accent' },
    { title: 'Horaires d’été', body: 'La salle ouvre dès 6h30 du lundi au vendredi jusqu’au 30 septembre.', tone: 'info' },
    { title: 'Fermeture exceptionnelle samedi', body: 'Maintenance du Studio 1 samedi matin. Les cours sont déplacés en Studio 2.', tone: 'danger' },
  ];
  for (const n of news) {
    const exists = await prisma.announcement.findFirst({ where: { title: n.title } });
    if (!exists) await prisma.announcement.create({ data: { ...n, createdById: admin.id, sentAt: new Date() } });
  }

  console.log(`Accueil démo : abonnement « ${plan.name} », ${created.length} cours, réservation sur le prochain, ${news.length} actualités.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
