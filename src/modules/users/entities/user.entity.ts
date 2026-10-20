import type { Relation } from 'typeorm';
import bcrypt from 'bcrypt';
import { BeforeInsert, Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '#/common/database/base.entity.js';
import { SessionEntity } from '../../auth/entities/session.entity.js';

const BCRYPT_SALT = 12;

@Entity('users')
export class UserEntity extends BaseEntity {
    @Column({ type: 'varchar', length: 64 })
    public username: string;

    @Column({
        type: 'varchar',
        length: 255,
        select: false,
        comment: 'hashed password'
    })
    public password: string;

    @OneToMany(() => SessionEntity, (session) => session.user)
    public sessions: Relation<SessionEntity[]>;

    @BeforeInsert()
    // @ts-expect-error
    private async hashPassowrd() {
        this.password = await bcrypt.hash(this.password, BCRYPT_SALT);
    }
}
