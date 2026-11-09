
import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Trend } from 'k6/metrics';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const TEST_EMAIL = __ENV.K6_TEST_EMAIL;
const TEST_PASSWORD = __ENV.K6_TEST_PASSWORD;
const LISTING_ID = __ENV.K6_LISTING_ID;

const listingReadDuration = new Trend('bidding_listing_read_duration');
const sellerReadDuration = new Trend('bidding_seller_read_duration');

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '30s', target: 2 },
    { duration: '30s', target: 3 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    bidding_listing_read_duration: ['p(95)<2000'],
    bidding_seller_read_duration: ['p(95)<2000'],
  },
};

export function setup() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !TEST_EMAIL ||
    !TEST_PASSWORD ||
    !LISTING_ID
  ) {
    fail('Missing required environment variables.');
  }

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
      tags: { name: 'bidding_test_login' },
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
    fail('Supabase did not return an access token.');
  }

  return {
    accessToken: authData.access_token,
  };
}

export default function (data) {
  // Matches the listing and nested bids lookup in the bid handler.
  const listingSelect =
    'status,condition,description,seller_id,device_model,' +
    'asking_price,expires_at,bids(amount,status,created_at)';

  const listingUrl =
    `${SUPABASE_URL}/rest/v1/listings` +
    `?select=${encodeURIComponent(listingSelect)}` +
    `&id=eq.${encodeURIComponent(LISTING_ID)}`;

  const listingResponse = http.get(listingUrl, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${data.accessToken}`,
      Accept: 'application/vnd.pgrst.object+json',
    },
    tags: { name: 'bidding_listing_details_read' },
  });

  listingReadDuration.add(listingResponse.timings.duration);

  const listingPassed = check(listingResponse, {
    'listing details request succeeds': (r) => r.status === 200,
    'listing details response is JSON': (r) => {
  const contentType =
    r.headers['Content-Type'] ||
    r.headers['content-type'] ||
    '';

  return /application\/json|application\/vnd\.pgrst\.object\+json/i.test(
    contentType
  );
},
    'listing contains a seller ID': (r) => {
      try {
        return Boolean(r.json().seller_id);
      } catch {
        return false;
      }
    },
    'listing contains bids array': (r) => {
      try {
        return Array.isArray(r.json().bids);
      } catch {
        return false;
      }
    },
  });

  if (!listingPassed) {
    console.error(
      `Listing lookup failed: HTTP ${listingResponse.status} - ${listingResponse.body}`
    );
    sleep(1);
    return;
  }

  const listing = listingResponse.json();

  // Matches PlaceBidModal's seller profile lookup.
  const sellerSelect = 'full_name,business_name,role';

  const sellerUrl =
    `${SUPABASE_URL}/rest/v1/profiles` +
    `?select=${encodeURIComponent(sellerSelect)}` +
    `&id=eq.${encodeURIComponent(listing.seller_id)}`;

  const sellerResponse = http.get(sellerUrl, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${data.accessToken}`,
      Accept: 'application/vnd.pgrst.object+json',
    },
    tags: { name: 'bidding_seller_profile_read' },
  });

  sellerReadDuration.add(sellerResponse.timings.duration);

  check(sellerResponse, {
  'seller profile request succeeds': (r) => r.status === 200,

  'seller profile response is valid JSON': (r) => {
    try {
      r.json();
      return true;
    } catch {
      return false;
    }
  },

  'seller profile contains a name or business name': (r) => {
    try {
      const profile = r.json();
      return Boolean(profile.full_name || profile.business_name);
    } catch {
      return false;
    }
  },
});

  sleep(1);
}
