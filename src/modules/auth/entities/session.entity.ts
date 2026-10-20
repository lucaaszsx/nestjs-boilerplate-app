import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { UserEntity } from '#/modules/users/entities/user.entity.js';
import { RefreshTokenEntity } from './refresh-token.entity.js';

const IPV6_ADDR_LEN = 45;

@Entity('sessions')
export class SessionEntity extends BaseEntity {
    @Column({ name: 'user_id', type: 'uuid' })
    public userId: string;

    @ManyToOne(() => UserEntity, (user) => user.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    public user: Relation<UserEntity>;

    @Column({ name: 'ip_address', type: 'varchar', length: IPV6_ADDR_LEN })
    public ipAddress: string;

    @Column({ name: 'user_agent', type: 'text' })
    public userAgent: string;

    @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
    public revokedAt: Date | null;

    @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.session)
    public refreshTokens: Relation<RefreshTokenEntity[]>;
}
