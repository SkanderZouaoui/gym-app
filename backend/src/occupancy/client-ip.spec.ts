import { describe, it, expect } from 'vitest';
import { buildVenueNetwork, clientIp, isOnVenueNetwork, isValidPublicIpEntry, normalizeIp } from './client-ip.js';

describe('client-ip', () => {
  it('normalise les IPv4 mappées en IPv6', () => {
    expect(normalizeIp('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(normalizeIp(' 2001:db8::1 ')).toBe('2001:db8::1');
  });

  it("lit req.ip (déjà résolu par Express selon trust proxy), jamais X-Forwarded-For directement", () => {
    expect(clientIp({ ip: '::ffff:198.51.100.2', socket: {} as any })).toBe('198.51.100.2');
    expect(clientIp({ ip: undefined, socket: { remoteAddress: '10.0.0.5' } as any })).toBe('10.0.0.5');
  });

  it('IPv4 : correspondance exacte', () => {
    const net = buildVenueNetwork('203.0.113.7');
    expect(isOnVenueNetwork(net, '203.0.113.7')).toBe(true);
    expect(isOnVenueNetwork(net, '203.0.113.8')).toBe(false);
  });

  it('IPv6 : même préfixe /64 que la box', () => {
    const net = buildVenueNetwork('2001:db8:aa:bb::1');
    expect(isOnVenueNetwork(net, '2001:db8:aa:bb:1234:5678:9abc:def0')).toBe(true);
    expect(isOnVenueNetwork(net, '2001:db8:aa:cc::1')).toBe(false);
  });

  it('plusieurs entrées et CIDR', () => {
    const net = buildVenueNetwork('203.0.113.7, 198.51.100.0/30');
    expect(isOnVenueNetwork(net, '198.51.100.3')).toBe(true);
    expect(isOnVenueNetwork(net, '198.51.100.4')).toBe(false);
  });

  it('sans IP configurée : jamais sur le réseau de la salle', () => {
    expect(buildVenueNetwork(null)).toBeNull();
    expect(isOnVenueNetwork(buildVenueNetwork(''), '203.0.113.7')).toBe(false);
  });

  it('valide les entrées', () => {
    expect(isValidPublicIpEntry('203.0.113.7')).toBe(true);
    expect(isValidPublicIpEntry('203.0.113.0/24')).toBe(true);
    expect(isValidPublicIpEntry('203.0.113.0/40')).toBe(false);
    expect(isValidPublicIpEntry('salle.duckdns.org')).toBe(false);
  });
});
