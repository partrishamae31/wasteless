
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.SUPABASE_URL || '').replace(/\/$/, '');
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const EMAIL = __ENV.K6_TEST_EMAIL || '';
const PASSWORD = __ENV.K6_TEST_PASSWORD || '';

const marketplaceDuration = new Trend('marketplace_duration');
const profileDuration = new Trend('profile_duration');
const requestFailureRate = new Rate('request_failure_rate');

export const options = {
  
stages: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 300 },
    { duration: '3m', target: 500 },
    { duration: '3m', target: 750 },
    { duration: '5m', target: 1000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    request_failure_rate: ['rate<0.01'],
    marketplace_duration: ['p(95)<2000'],
    profile_duration: ['p(95)<2000'],
  },
};

export function setup() {
  if (!BASE_URL || !ANON_KEY || !EMAIL || !PASSWORD) {
    throw new Error('Missing required environment variables.');
  }

  const login = http.post(
    `${BASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    {
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const ok = check(login, {
    'login successful': (r) => r.status === 200,
    'access token received': (r) => !!r.json('access_token'),
    'user ID received': (r) => !!r.json('user.id'),
  });

  if (!ok) {
    throw new Error(`Login failed. HTTP ${login.status}`);
  }

  return {
    token: login.json('access_token'),
    userId: login.json('user.id'),
  };
}

export default function (data) {
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${data.token}`,
    Accept: 'application/json',
  };

  const marketplace = http.get(
    `${BASE_URL}/rest/v1/listings` +
    '?select=id,device_model,category,condition,asking_price,status,expires_at' +
    '&status=eq.active&order=created_at.desc&limit=20',
    { headers, tags: { name: 'marketplace_active_listings' } }
  );

  marketplaceDuration.add(marketplace.timings.duration);

  const marketplaceOk = check(marketplace, {
    'marketplace HTTP 200': (r) => r.status === 200,
    'marketplace response is array': (r) => Array.isArray(r.json()),
  });

  requestFailureRate.add(!marketplaceOk);

  const profile = http.get(
    `${BASE_URL}/rest/v1/profiles` +
    `?id=eq.${encodeURIComponent(data.userId)}&select=*&limit=1`,
    { headers, tags: { name: 'authenticated_profile' } }
  );

  profileDuration.add(profile.timings.duration);

  const profileOk = check(profile, {
    'profile HTTP 200': (r) => r.status === 200,
    'profile response is array': (r) => Array.isArray(r.json()),
  });

  requestFailureRate.add(!profileOk);

  sleep(1);
}
