
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import pg from 'pg'

const PgSession = connectPgSimple(session)

export function createSessionMiddleware() {
  const databaseUrl = process.env.DATABASE_URL
  const sessionSecret = process.env.SESSION_SECRET

  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurada.')
  }

  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error(
      'SESSION_SECRET debe tener al menos 32 caracteres.',
    )
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
  })

  return session({
    name: 'viviendas_leon.sid',
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
      path: '/',
    },
  })
}
