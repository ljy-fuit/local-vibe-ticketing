import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class TicketingRedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TicketingRedisService.name);
  private client: Redis;
  private scripts: Map<string, string> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis error', err);
    });

    await this.loadLuaScripts();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  private async loadLuaScripts() {
    const luaDir = path.join(__dirname, 'lua-scripts');
    const scriptNames = [
      'admission',
      'reserve-stock',
      'expire-active',
      'cancel-reservation',
    ];

    for (const name of scriptNames) {
      const filePath = path.join(luaDir, `${name}.lua`);
      try {
        const script = fs.readFileSync(filePath, 'utf-8');
        const sha = await this.client.script('LOAD', script);
        this.scripts.set(name, sha as string);
        this.logger.log(`Lua script loaded: ${name} (${String(sha)})`);
      } catch (err) {
        this.logger.warn(
          `Failed to load Lua script ${name}: ${(err as Error).message}`,
        );
      }
    }
  }

  async runScript(
    name: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<any> {
    const sha = this.scripts.get(name);
    if (!sha) {
      throw new Error(`Lua script not loaded: ${name}`);
    }
    try {
      return await this.client.evalsha(
        sha,
        keys.length,
        ...keys,
        ...args.map(String),
      );
    } catch (err) {
      if ((err as Error).message?.includes('NOSCRIPT')) {
        await this.loadLuaScripts();
        const newSha = this.scripts.get(name);
        if (!newSha) throw err;
        return await this.client.evalsha(
          newSha,
          keys.length,
          ...keys,
          ...args.map(String),
        );
      }
      throw err;
    }
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.client.del(key);
  }
}
