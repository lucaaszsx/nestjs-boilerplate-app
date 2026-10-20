import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class FindUsersQueryDTO {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    cursor?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(25)
    limit: number = 20;
}
