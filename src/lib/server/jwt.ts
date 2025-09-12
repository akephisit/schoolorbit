import jwt from 'jsonwebtoken';

export interface Claims {
	sub: string; // user_id
	roles: string[]; // role codes
	perms: string[]; // permission codes
	ctx?: any; // additional context
	exp: number; // expiration timestamp
	iat: number; // issued at timestamp
}

export class JwtService {
	private secret: string;

	constructor(secret: string) {
		this.secret = secret;
	}

	createClaims(
		userId: string,
		roles: string[],
		permissions: string[],
		context?: any
	): Claims {
		const now = Math.floor(Date.now() / 1000);
		const exp = now + 15 * 60; // 15 minutes
		
		return {
			sub: userId,
			roles,
			perms: permissions,
			ctx: context,
			exp,
			iat: now
		};
	}

	createToken(claims: Claims): string {
		return jwt.sign(claims, this.secret, { algorithm: 'HS256' });
	}

	verifyToken(token: string): Claims {
		return jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as Claims;
	}
}