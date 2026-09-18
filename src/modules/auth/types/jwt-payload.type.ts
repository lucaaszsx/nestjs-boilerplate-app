export interface JwtTokenPayload {
    uid: string;
    sid: string;
}

export interface JwtTokenPayloadWithRefresh extends JwtTokenPayload {
    refreshToken: string;
}
