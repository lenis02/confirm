import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { GoogleCalendarService } from './google-calendar.service';

@Module({
  imports: [CryptoModule],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
