import type { Request } from 'express';
import type { EnvConfig } from '#/config/env.js';
import type {
    JwtTokenPayload,
    JwtTokenPayloadWithRefresh
} from '../types/jwt-payload.type.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { COOKIE_REFRESH_TOKEN_NAME } from '#/common/constants.js';

const refreshTokenfromCookie = (req: Request) =>
    req?.cookies?.[COOKIE_REFRESH_TOKEN_NAME];

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        // @ts-expect-error
        private readonly configService: ConfigService<EnvConfig>
    ) {
        super({
            jwtFromRequest: refreshTokenfromCookie,
            secretOrKey: configService.getOrThrow('jwt.refreshTokenSecret', {
                infer: true
            }),
            passReqToCallback: true,
            ignoreExpiration: false
        });
    }

    override validate(
        req: Request,
        payload: JwtTokenPayload
    ): JwtTokenPayloadWithRefresh {
        const refreshToken = refreshTokenfromCookie(req) as string;
        return { ...payload, refreshToken };
    }
}
