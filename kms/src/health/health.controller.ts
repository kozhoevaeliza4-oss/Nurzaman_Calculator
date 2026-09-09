import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// Unauthenticated on purpose — this is what a load balancer/orchestrator
// polls to decide whether the container is ready to receive traffic.
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database is not reachable');
    }
    return { status: 'ok', db: 'ok', timestamp: new Date().toISOString() };
  }
}
