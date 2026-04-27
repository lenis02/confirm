import { IsEnum, IsString } from 'class-validator';
import { ServiceType } from '../entities/user-integration.entity';

export class CreateIntegrationDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  accessToken: string;
}
