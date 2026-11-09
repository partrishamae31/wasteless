
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

// Authenticate once before the load test begins.
export function setup() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
      !TEST_EMAIL || !TEST_PASSWORD) {
    fail('Missing required environment variables.');
  }

  const response = http.post(
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
      tags: { name: 'supabase_login' },
    }
  );

  const authenticated = check(response, {
    'test account login succeeds': (r) => r.status === 200,
  });

  if (!authenticated) {
  console.error('Authentication response:', response.body);
  fail(`Authentication failed. HTTP status: ${response.status}`);
}

  const authData = response.json();

  if (!authData.access_token || !authData.user?.id) {
    fail('Authentication response did not contain a valid session.');
  }

  return {
    accessToken: authData.access_token,
    userId: authData.user.id,
  };
}

// Retrieve the authenticated user's profile.
export default function (data) {
  const response = http.get(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,role&id=eq.${encodeURIComponent(data.userId)}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${data.accessToken}`,
        Accept: 'application/json',
      },
      tags: { name: 'authenticated_profile_read' },
    }
  );

  check(response, {
    'authenticated profile request succeeds': (r) => r.status === 200,
    'profile response is JSON': (r) =>
      r.headers['Content-Type']?.includes('application/json'),
    'profile response is an array': (r) => {
      try {
        return Array.isArray(r.json());
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
