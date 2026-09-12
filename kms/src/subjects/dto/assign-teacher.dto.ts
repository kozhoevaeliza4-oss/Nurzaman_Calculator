import { IsUUID } from 'class-validator';

export class AssignTeacherDto {
  @IsUUID()
  teacherId: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  groupId: string;
}
