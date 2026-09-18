import type { DataSource, EntityManager } from 'typeorm';
import type { EnvConfig } from '#/config/env.js';
import type { CreateUserInput } from '../users/user.service.js';
import type {
    JwtTokenPayload,
    JwtTokenPayloadWithRefresh
} from './types/jwt-payload.type.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import ms from 'ms';
import { UserService } from '../users/user.service.js';
import { RefreshTokenEntity } from './entities/refresh-token.entity.js';
import { SessionEntity } from './entities/session.entity.js';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception.js';
import { RefreshTokenInvalidException } from './exceptions/refresh-token-invalid.js';
import { createHash } from 'node:crypto';

export interface LoginInput {
    username: string;
    password: string;
    ipAddress: string;
    userAgent: string;
}

@Injectable()
export class AuthService {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly configService: ConfigService<EnvConfig>,
        private readonly userService: UserService,
        private readonly jwtService: JwtService
    ) {}

    public async register(data: CreateUserInput) {
        return this.userService.createUser(data);
    }

    public async login(data: LoginInput) {
        const user = await this.userService.findWithPassword({
            username: data.username,
            throwErrorOnNull: false
        });
        if (!user || !(await bcrypt.compare(data.password, user.password)))
            throw new InvalidCredentialsException();

        return this.dataSource.transaction(async (manager) => {
            const dbSession = manager.create(SessionEntity, {
                userId: user.id,
                userAgent: data.userAgent,
                ipAddress: data.ipAddress
            });
            await manager.save(SessionEntity, dbSession);

            return this.createRefreshToken(manager, user.id, dbSession.id);
        });
    }

    public async refresh(payload: JwtTokenPayloadWithRefresh) {
        if (!(await this.userService.exists({ id: payload.uid })))
            throw new RefreshTokenInvalidException();

        return this.dataSource.transaction(async (manager) => {
            const { affected } = await manager.update(
                RefreshTokenEntity,
                {
                    sessionId: payload.sid,
                    token: this.sha256(payload.refreshToken),
                    revoked: false
                },
                { revoked: true }
            );
            if (affected === 0) {
                await manager.update(
                    RefreshTokenEntity,
                    { sessionId: payload.sid },
                    { revoked: true }
                );
                throw new RefreshTokenInvalidException();
            }

            return this.createRefreshToken(manager, payload.uid, payload.sid);
        });
    }

    public getRefreshTokenTtlMs() {
        return ms(
            this.configService.getOrThrow('jwt.refreshTokenExpiresIn', {
                infer: true
            })
        );
    }

    private async createRefreshToken(
        manager: EntityManager,
        userId: string,
        sessionId: string
    ) {
        const { hashedRefreshToken, refreshToken, accessToken } =
            await this.issueTokenPair(userId, sessionId);
        const dbRefreshToken = manager.create(RefreshTokenEntity, {
            sessionId,
            expiresAt: new Date(Date.now() + this.getRefreshTokenTtlMs()),
            token: hashedRefreshToken
        });
        await manager.save(RefreshTokenEntity, dbRefreshToken);

        return { refreshToken, accessToken };
    }

    private async issueTokenPair(userId: string, sessionId: string) {
        const payload: JwtTokenPayload = { uid: userId, sid: sessionId };
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow('jwt.accessTokenSecret', {
                infer: true
            }),
            expiresIn: this.configService.getOrThrow('jwt.accessTokenExpiresIn', {
                infer: true
            })
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow('jwt.refreshTokenSecret', {
                infer: true
            }),
            expiresIn: this.getRefreshTokenTtlMs()
        });

        return {
            hashedRefreshToken: this.sha256(refreshToken),
            refreshToken,
            accessToken
        };
    }

    private sha256(str: string) {
        return createHash('sha256').update(str).digest('hex');
    }
}
