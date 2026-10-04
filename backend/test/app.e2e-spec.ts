import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('refuse une route protégée sans token', () => {
    return request(app.getHttpServer()).get('/v1/branches').expect(401);
  });

  it('accepte une inscription sur une route publique', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'inexistant@muscleup.dev', password: 'wrongpassword' })
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
