import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LessonAttendanceStatus } from '../lesson-attendance.entity';

class AttendanceRecordDto {
  @IsUUID()
  studentId: string;

  @IsEnum(LessonAttendanceStatus)
  status: LessonAttendanceStatus;
}

export class MarkAttendanceDto {
  @IsDateString()
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
