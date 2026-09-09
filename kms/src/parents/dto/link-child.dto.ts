import { IsEnum, IsUUID } from 'class-validator';
import { RelationType } from '../child-parent.entity';

export class LinkChildDto {
  @IsUUID()
  childId: string;

  @IsEnum(RelationType)
  relationType: RelationType;
}
