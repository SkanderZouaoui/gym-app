import { Module } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service.js';
import { OrganizationModule } from '../organization/organization.module.js';

@Module({
  imports: [OrganizationModule],
  providers: [AccessPolicyService],
  exports: [AccessPolicyService],
})
export class AccessPolicyModule {}
