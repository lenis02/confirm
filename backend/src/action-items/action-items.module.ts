import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { ActionItemsController, ProjectActionItemsController } from './action-items.controller';
import { ActionItemsService } from './action-items.service';
import { ActionItem } from './entities/action-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActionItem]), AuthModule, ProjectsModule],
  controllers: [ActionItemsController, ProjectActionItemsController],
  providers: [ActionItemsService],
  exports: [ActionItemsService],
})
export class ActionItemsModule {}
