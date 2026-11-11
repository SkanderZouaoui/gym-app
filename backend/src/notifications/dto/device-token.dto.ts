import { IsIn, IsString, Matches } from 'class-validator';

export class RegisterDeviceTokenDto {
  /** Jeton Expo (ExponentPushToken[...]). */
  @IsString()
  @Matches(/^(Exponent|Expo)PushToken\[[^\]]+\]$/)
  token!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';
}

export class RemoveDeviceTokenDto {
  @IsString()
  token!: string;
}
