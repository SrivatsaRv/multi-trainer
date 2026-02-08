import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: 'SAAS_ADMIN' | 'GYM_ADMIN' | 'TRAINER';
            accessToken: string;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        role: 'SAAS_ADMIN' | 'GYM_ADMIN' | 'TRAINER';
        accessToken: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        role: 'SAAS_ADMIN' | 'GYM_ADMIN' | 'TRAINER';
        id: string;
        accessToken: string;
    }
}
