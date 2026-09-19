import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from './auth.ts'

export const authClient = createAuthClient({ plugins: [inferAdditionalFields<typeof auth>()] })
