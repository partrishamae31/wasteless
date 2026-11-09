
import http from 'k6/http';
import { check, sleep, fail } from 'k6';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const TEST_EMAIL = __ENV.K6_TEST_EMAIL;
const TEST_PASSWORD = __ENV.K6_TEST_PASSWORD;

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '30s', target: 2 },
    { duration: '30s', target: 3 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export function setup() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
      !TEST_EMAIL || !TEST_PASSWORD) {
    fail('Missing required environment variables.');
  }

  // Authenticate once before the load test starts.
  const loginResponse = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      tags: { name: 'marketplace_test_login' },
    }
  );

  const loginPassed = check(loginResponse, {
    'test account login succeeds': (r) => r.status === 200,
  });

  if (!loginPassed) {
    console.error('Login response:', loginResponse.body);
    fail(`Authentication failed. HTTP status: ${loginResponse.status}`);
  }

  const authData = loginResponse.json();

  if (!authData.access_token) {
    fail('No access token returned by Supabase.');
  }

  return {
    accessToken: authData.access_token,
  };
}

export default function (data) {
  // Matches the marketplace listing query in HarvesterDashboard.jsx.
  const selectFields = `
    *,
    bids(
      amount,
      bidder_id,
      status,
      created_at,
      profiles:bidder_id(full_name)
    ),
    profiles:seller_id(
      id,
      full_name,
      barangay,
      average_rating
    )
  `.replace(/\s+/g, '');

  const query =
    `select=${encodeURIComponent(selectFields)}` +
    `&status=eq.active` +
    `&or=${encodeURIComponent(
      `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`
    )}` +
    `&order=created_at.desc`;

  const response = http.get(
    `${SUPABASE_URL}/rest/v1/listings?${query}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${data.accessToken}`,
        Accept: 'application/json',
      },
      tags: { name: 'marketplace_listings_read' },
    }
  );

  check(response, {
    'marketplace request succeeds': (r) => r.status === 200,
    'response is JSON': (r) =>
      r.headers['Content-Type']?.includes('application/json'),
    'listings response is an array': (r) => {
      try {
        return Array.isArray(r.json());
      } catch {
        return false;
      }
    },
  });

  if (response.status !== 200) {
    console.error(`Marketplace request failed: ${response.status}`);
  }

  sleep(1);
}
