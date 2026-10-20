import { LessThan, type FindOptionsWhere, type Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity.js';
import { UserAlreadyExistsException } from './exceptions/user-already-exists.exception.js';
import { UserNotFoundException } from './exceptions/user-not-found.exception.js';
import { ValidationFailedException } from '#/common/exceptions/validation-failed.exception.js';
import { isValidDate, safeJsonParse } from '#/common/utils/util.js';

export interface CreateUserInput {
    username: string;
    password: string;
}

export type FindOneUserInput = { throwErrorOnNull: boolean } & (
    { id: string; username?: never } | { id?: never; username: string }
);

export type FindManyInput = { limit: number; cursor?: string; username?: string; };

export type ParsedPaginationCursor = { created_at: string; id: string; } | null;

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>
    ) {}

    public async createUser(data: CreateUserInput) {
        if (await this.exists({ username: data.username }))
            throw new UserAlreadyExistsException();

        const user = this.userRepository.create(data);
        return this.userRepository.save(user);
    }

    public async findOne(options: FindOneUserInput) {
        const where: FindOptionsWhere<UserEntity>[] = [];
        if (options.id) where.push({ id: options.id });
        if (options.username) where.push({ username: options.username });

        const user =
            where.length > 0 ? await this.userRepository.findOne({ where }) : null;
        if (!user && options.throwErrorOnNull) throw new UserNotFoundException();

        return user;
    }

    public async findWithPassword(options: FindOneUserInput) {
        const query = this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password');

        if (options.id) query.orWhere('user.id = :id', { id: options.id });
        if (options.username)
            query.orWhere('user.username = :username', { username: options.username });

        const user = query.expressionMap.wheres.length > 0 ? await query.getOne() : null;
        if (!user && options.throwErrorOnNull) throw new UserNotFoundException();

        return user;
    }

    public async findMany(options: FindManyInput) {
        const base: FindOptionsWhere<UserEntity> = {};
        if (options.username) base.username = options.username;

        let where: FindOptionsWhere<UserEntity>[] = [base];
        if (options.cursor) {
            const cursor = safeJsonParse<ParsedPaginationCursor>(Buffer.from(options.cursor, 'base64').toString('utf-8'));
            if (
                !cursor ||
                typeof cursor.created_at !== 'string' ||
                typeof cursor.id !== 'string' ||
                !isValidDate(new Date(cursor.created_at))
            ) throw new ValidationFailedException(['Cursor provided cannot be parsed']);

            const createdAt = new Date(cursor.created_at);
            where = [
                { ...base, createdAt: LessThan(createdAt) },
                { ...base, createdAt, id: LessThan(cursor.id) }
            ];
        }

        const data = await this.userRepository.find({
            order: { createdAt: 'DESC', id: 'DESC' },
            take: options.limit,
            where
        });
        const lastUser = data.at(-1);

        return {
            data,
            cursor: lastUser
                ? Buffer.from(JSON.stringify({ created_at: lastUser.createdAt.toISOString(), id: lastUser.id })).toString('base64')
                : null
        };
    }

    public async exists(options: Omit<FindOneUserInput, 'throwErrorOnNull'>) {
        const where: FindOptionsWhere<UserEntity>[] = [];
        if (options.id) where.push({ id: options.id });
        if (options.username) where.push({ username: options.username });

        return where.length > 0 ? await this.userRepository.exists({ where }) : false;
    }
}
