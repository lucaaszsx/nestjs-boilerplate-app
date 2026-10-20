import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '#/common/decorators/current-user-decorator.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { UserResponseDTO } from './dto/responses/user.dto.js';
import { UserService } from './user.service.js';
import { FindUsersQueryDTO } from './dto/requests/find-users-query.dto.js';

@Controller('/users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @UseGuards(AccessTokenGuard)
    @Get('/@me')
    public async getMe(@CurrentUser('uid') id: string) {
        const user = await this.userService.findOne({ id, throwErrorOnNull: true });
        return UserResponseDTO.from(user!);
    }

    @Get('/:id')
    public async findOne(@Param('id') id: string) {
        const user = await this.userService.findOne({ id, throwErrorOnNull: true });
        return UserResponseDTO.from(user!);
    }

    @Get('/')
    public async findMany(@Query() options: FindUsersQueryDTO) {
        const { data, cursor } = await this.userService.findMany(options);
        return {
            data: data.map((user) => UserResponseDTO.from(user)),
            total: data.length,
            cursor
        };
    }
}
