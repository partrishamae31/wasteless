import http from 'k6/http';
import { check, sleep } from 'k6';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '30s', target: 3 },
    { duration: '30s', target: 5 },
    { duration: '15s', target: 0 },
  ],

  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const response = http.get(
    `${SUPABASE_URL}/rest/v1/listings?select=id&limit=20`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
      tags: {
        name: 'supabase_listings_read',
      },
    }
  );

  check(response, {
    'Supabase responds successfully': (r) => r.status === 200,
    'Supabase returns JSON': (r) =>
      r.headers['Content-Type']?.includes('application/json'),
    'Response contains an array': (r) => {
      try {
        return Array.isArray(r.json());
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}