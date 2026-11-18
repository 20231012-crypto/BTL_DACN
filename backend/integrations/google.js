import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { assert, audit, hash, randomToken, text } from '../services/shared.js';

const cookieName = 'antam_google_state';
const lifetime = 10 * 60 * 1000;

export function googleConfig(origin) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    return null;
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${origin}/api/auth/google/callback`,
  };
}

export function installGoogleAuth(app, d, { google, secureCookies }, login) {
  if (!google) return;
  const client = new OAuth2Client(google);
  const cookie = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    path: '/api/auth/google',
  };

  app.get('/api/auth/google', (req, res) => {
    const linkUserId = req.query.link === '1' ? req.user?.id : null;
    assert(
      req.query.link !== '1' || linkUserId,
      401,
      'Đăng nhập trước khi liên kết Google.',
    );
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken();
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    d.run('DELETE FROM oauth_states WHERE expires_at<=?', Date.now());
    d.insert('oauth_states', {
      state_hash: hash(state),
      nonce,
      verifier,
      user_id: linkUserId,
      expires_at: Date.now() + lifetime,
    });
    res.cookie(cookieName, state, { ...cookie, maxAge: lifetime });
    res.redirect(
      client.generateAuthUrl({
        scope: ['openid', 'email', 'profile'],
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
      }),
    );
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const stateValue = text(req.query.state, 64);
    res.clearCookie(cookieName, cookie);
    const state =
      stateValue && stateValue === req.cookies?.[cookieName]
        ? d.one(
            'SELECT * FROM oauth_states WHERE state_hash=?',
            hash(stateValue),
          )
        : null;
    if (state)
      d.run('DELETE FROM oauth_states WHERE state_hash=?', state.state_hash);
    const errorPage = state?.user_id
      ? '/account?google=error'
      : '/login?google=error';
    if (
      !state ||
      state.expires_at <= Date.now() ||
      !req.query.code ||
      (state.user_id && state.user_id !== req.user?.id)
    ) {
      return res.redirect(errorPage);
    }

    try {
      const { tokens } = await client.getToken({
        code: String(req.query.code),
        codeVerifier: state.verifier,
      });
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: google.clientId,
      });
      const identity = ticket.getPayload();
      assert(
        identity?.email_verified &&
          identity.sub &&
          identity.email &&
          identity.nonce === state.nonce,
        403,
        'Tài khoản Google chưa xác thực.',
      );
      const email = identity.email.toLowerCase();
      const linked = d.one(
        'SELECT user_id FROM google_accounts WHERE subject=?',
        identity.sub,
      );
      if (state.user_id) {
        assert(
          req.user.email === email &&
            (!linked || linked.user_id === req.user.id),
          409,
          'Tài khoản Google cần có cùng email.',
        );
        d.run(
          'INSERT OR IGNORE INTO google_accounts (subject,user_id) VALUES (?,?)',
          identity.sub,
          req.user.id,
        );
        assert(
          d.one(
            'SELECT user_id FROM google_accounts WHERE subject=?',
            identity.sub,
          )?.user_id === req.user.id,
          409,
          'Tài khoản đã có liên kết Google.',
        );
        audit(d, req.user.id, 'auth.google_link', 'user', req.user.id);
        return res.redirect('/account?google=linked');
      }

      let userId = linked?.user_id;
      if (!userId) {
        // Existing accounts must be linked while signed in with their current password.
        if (d.one('SELECT id FROM nguoi_dung WHERE lower(email)=?', email))
          return res.redirect('/login?google=link');
        userId = d.transaction(() => {
          const id = d.insert('nguoi_dung', {
            name: text(identity.name, 100) || 'Khách hàng An Tâm',
            email,
            password_hash: bcrypt.hashSync(randomToken(), 10),
            verified: 1,
            active: 1,
          });
          d.insert('khach_hang', { id });
          d.insert('nguoi_dung_vai_tro', {
            user_id: id,
            role_id: d.one("SELECT id FROM vai_tro WHERE name='customer'").id,
          });
          d.insert('gio_hang', { user_id: id });
          d.insert('google_accounts', { subject: identity.sub, user_id: id });
          return id;
        });
      }
      const user = d.one(
        'SELECT active,verified FROM nguoi_dung WHERE id=?',
        userId,
      );
      assert(
        user?.active && user.verified,
        403,
        'Tài khoản hiện không hoạt động.',
      );
      const signedIn = login(res, userId);
      audit(d, userId, 'auth.google_login', 'user', userId);
      res.redirect(signedIn.role === 'customer' ? '/' : '/admin');
    } catch {
      res.redirect(errorPage);
    }
  });
}
