import type { JwtTokenPayloadWithRefresh } from '../types/jwt-payload.type.js';
import { Injectable } from '@nestjs/common';
import { TokenExpiredError } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { RefreshTokenExpiredException } from '../exceptions/refresh-token-expired.exception.js';
import { RefreshTokenInvalidException } from '../exceptions/refresh-token-invalid.js';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
    override handleRequest<TUser = JwtTokenPayloadWithRefresh>(
        err: any,
        user: TUser,
        info: any
    ): TUser {
        if (info instanceof TokenExpiredError) throw new RefreshTokenExpiredException();
        if (err && !user) throw new RefreshTokenInvalidException();
        return user;
    }
}
