import { describe, expect, it, vi } from 'vitest';
import { Role } from '@muscleup/shared';
import { OrganizationService } from './organization.service.js';

function make(config: unknown, logoKey: string | null = null) {
  const settings = { id: 's1', name: 'MuscleUP', config, galleryKeys: [], galleryMeta: {}, logoKey };
  const prisma = { organizationSettings: { findFirst: vi.fn(async () => settings) } };
  const storage = { getReadUrl: vi.fn(async (k: string) => `https://cdn/${k}`) };
  const gallery = { withUrls: vi.fn(async (g: object) => ({ ...g, galleryUrls: [] })) };
  return new OrganizationService(prisma as never, storage as never, gallery as never);
}

const contact = { name: '', address: '12 rue du Sport', phone: '71 000 000', email: 'contact@salle.tn', visibleToMembers: false };

describe('OrganizationService.getVenue', () => {
  it('adhérent : coordonnées masquées quand la case n’est pas cochée, horaires toujours visibles', async () => {
    const venue = await make({ contact }).getVenue(Role.MEMBER);
    expect(venue.contact).toBeNull();
    expect(venue.hours).toHaveLength(7);
  });
  it('adhérent : coordonnées visibles quand la case est cochée', async () => {
    const venue = await make({ contact: { ...contact, visibleToMembers: true } }).getVenue(Role.MEMBER);
    expect(venue.contact).toEqual({ address: '12 rue du Sport', phone: '71 000 000', email: 'contact@salle.tn', latitude: null, longitude: null });
  });
  it('position GPS transmise avec les coordonnées', async () => {
    const venue = await make({ contact: { ...contact, visibleToMembers: true, latitude: 37.27, longitude: 9.87 } }).getVenue(Role.MEMBER);
    expect(venue.contact).toMatchObject({ latitude: 37.27, longitude: 9.87 });
  });
  it.each([Role.STAFF, Role.COACH, Role.ADMIN])('%s : coordonnées toujours visibles', async (role) => {
    expect((await make({ contact }).getVenue(role)).contact).not.toBeNull();
  });
  it('nom : celui des coordonnées, à défaut le nom par défaut', async () => {
    expect((await make({ contact }).getVenue(Role.STAFF)).name).toBe('MuscleUP');
    expect((await make({ contact: { ...contact, name: '  Iron Gym ' } }).getVenue(Role.STAFF)).name).toBe('Iron Gym');
  });
  it('logo : URL signée, ou null', async () => {
    expect((await make({ contact }, 'organization/logo/x.webp').getVenue(Role.STAFF)).logoUrl).toBe('https://cdn/organization/logo/x.webp');
    expect((await make({ contact }).getVenue(Role.STAFF)).logoUrl).toBeNull();
  });
});
