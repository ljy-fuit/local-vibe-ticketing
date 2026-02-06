import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // userId
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;
  userId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    // Main API에서 발급한 JWT를 검증만 함
    // DB 조회 없이 userId만 반환
    return {
      id: payload.sub,
      userId: payload.sub,
    };
  }
}
