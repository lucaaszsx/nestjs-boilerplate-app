import type { Response } from 'express';
import type { EnvConfig } from '#/config/env.js';
import type { JwtTokenPayloadWithRefresh } from './types/jwt-payload.type.js';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Ip,
    Post,
    Res,
    UseGuards
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { COOKIE_REFRESH_TOKEN_NAME } from '#/common/constants.js';
import { CurrentUser } from '#/common/decorators/current-user-decorator.js';
import { UserAgent } from '#/common/decorators/user-agent.decorator.js';
import { AuthService } from './auth.service.js';
import { CreateUserDTO, LoginDTO } from './dto/index.js';
import { RefreshTokenInvalidException } from './exceptions/refresh-token-invalid.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly configService: ConfigService<EnvConfig>,
        private readonly authService: AuthService
    ) {}

    @Post('/register')
    @HttpCode(HttpStatus.CREATED)
    public async register(@Body() data: CreateUserDTO): Promise<void> {
        await this.authService.register({
            username: data.username,
            password: data.password
        });
    }

    @Post('/login')
    public async login(
        @Body() data: LoginDTO,
        @Ip() ipAddress: string,
        @UserAgent() userAgent: string,
        @Res({ passthrough: true }) response: Response
    ) {
        const { refreshToken, accessToken } = await this.authService.login({
            username: data.username,
            password: data.password,
            ipAddress,
            userAgent
        });
        this.setRefreshCookie(response, refreshToken);

        return { accessToken };
    }

    @UseGuards(RefreshTokenGuard)
    @Post('/refresh')
    public async refresh(
        @CurrentUser() payload: JwtTokenPayloadWithRefresh,
        @Res({ passthrough: true }) response: Response
    ) {
        try {
            const { refreshToken, accessToken } = await this.authService.refresh(payload);
            this.setRefreshCookie(response, refreshToken);

            return { accessToken };
        } catch (error) {
            if (error instanceof RefreshTokenInvalidException)
                response.clearCookie(COOKIE_REFRESH_TOKEN_NAME);
            throw error;
        }
    }

    private setRefreshCookie(response: Response, refreshToken: string) {
        response.cookie(COOKIE_REFRESH_TOKEN_NAME, refreshToken, {
            httpOnly: true,
            secure: this.configService.getOrThrow('env') === 'production',
            maxAge: this.authService.getRefreshTokenTtlMs(),
            sameSite: 'lax',
            path: '/'
        });
    }
}
