
import http from 'k6/http';
import { check, fail } from 'k6';
import { Trend } from 'k6/metrics';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const TEST_EMAIL = __ENV.K6_TEST_EMAIL;
const TEST_PASSWORD = __ENV.K6_TEST_PASSWORD;

const LISTING_ID = __ENV.K6_LISTING_ID;
const BIDDER_ID = __ENV.K6_BIDDER_ID;

const bidSubmissionDuration = new Trend(
  'bid_submission_duration'
);

export const options = {
  vus: 1,
  iterations: 1,

  thresholds: {
    http_req_failed: ['rate<0.01'],
    bid_submission_duration: ['p(95)<2000'],
  },
};

export function setup() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !TEST_EMAIL ||
    !TEST_PASSWORD ||
    !LISTING_ID ||
    !BIDDER_ID
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
      tags: { name: 'bid_write_test_login' },
    }
  );

  const loginPassed = check(loginResponse, {
    'test bidder login succeeds': (r) => r.status === 200,
  });

  if (!loginPassed) {
    fail('Test bidder authentication failed.');
  }

  const authData = loginResponse.json();

  if (!authData.access_token) {
    fail('Supabase did not return an access token.');
  }

  if (authData.user?.id !== BIDDER_ID) {
    fail('Logged-in account does not match the configured bidder ID.');
  }

  return {
    accessToken: authData.access_token,
  };
}

export default function (data) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${data.accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Retrieve and validate the listing before inserting.

  const listingSelect =
    'id,status,condition,seller_id,asking_price,expires_at,bids(amount,status)';

  const listingUrl =
    `${SUPABASE_URL}/rest/v1/listings` +
    `?select=${encodeURIComponent(listingSelect)}` +
    `&id=eq.${encodeURIComponent(LISTING_ID)}`;

  const listingResponse = http.get(listingUrl, {
    headers: {
      ...headers,
      Accept: 'application/vnd.pgrst.object+json',
    },
    tags: { name: 'bid_write_listing_preflight' },
  });

  const listingPassed = check(listingResponse, {
    'listing preflight succeeds': (r) => r.status === 200,
    'listing response is valid JSON': (r) => {
      try {
        r.json();
        return true;
      } catch {
        return false;
      }
    },
  });

  if (!listingPassed) {
    fail('Could not retrieve the test listing.');
  }

  const listing = listingResponse.json();

  const eligible =
    listing.status === 'active' &&
    listing.condition?.toLowerCase() === 'working' &&
    listing.seller_id !== BIDDER_ID &&
    Number(listing.asking_price) > 1 &&
    (!listing.expires_at ||
      new Date(listing.expires_at).getTime() > Date.now()) &&
    Array.isArray(listing.bids) &&
    listing.bids.length === 0;

  if (!eligible) {
    fail(
      'Listing is no longer eligible or already has bids. No bid was inserted.'
    );
  }

  // 2. Calculate a bid one peso below the asking price.

  const bidAmount = Number(listing.asking_price) - 1;

  // 3. Submit the actual bid.

  const bidPayload = {
    listing_id: LISTING_ID,
    bidder_id: BIDDER_ID,
    amount: bidAmount,
  };

  const bidResponse = http.post(
    `${SUPABASE_URL}/rest/v1/bids`,
    JSON.stringify(bidPayload),
    {
      headers: {
        ...headers,
        Prefer: 'return=representation',
      },
      tags: { name: 'bid_write_submission' },
    }
  );

  bidSubmissionDuration.add(bidResponse.timings.duration);

  const insertPassed = check(bidResponse, {
    'bid insertion succeeds': (r) =>
      r.status === 201 || r.status === 200,

    'bid insertion returns valid JSON': (r) => {
      try {
        r.json();
        return true;
      } catch {
        return false;
      }
    },

    'inserted bid has pending status': (r) => {
      try {
        const rows = r.json();
        return Array.isArray(rows) &&
          rows.length === 1 &&
          rows[0].status === 'pending';
      } catch {
        return false;
      }
    },

    'inserted bid has correct amount': (r) => {
      try {
        const rows = r.json();
        return rows[0]?.amount !== undefined &&
          Number(rows[0].amount) === bidAmount;
      } catch {
        return false;
      }
    },

    'inserted bid belongs to test bidder': (r) => {
      try {
        const rows = r.json();
        return rows[0]?.bidder_id === BIDDER_ID;
      } catch {
        return false;
      }
    },
  });

  if (!insertPassed) {
    console.error(
      `Bid insertion failed: HTTP ${bidResponse.status} - ${bidResponse.body}`
    );
    fail('The bid was not successfully validated.');
  }

  const insertedBid = bidResponse.json()[0];

  // 4. Verify the inserted record from the database.

  const verifyUrl =
    `${SUPABASE_URL}/rest/v1/bids` +
    `?select=id,listing_id,bidder_id,amount,status` +
    `&id=eq.${encodeURIComponent(insertedBid.id)}`;

  const verifyResponse = http.get(verifyUrl, {
    headers: {
      ...headers,
      Accept: 'application/vnd.pgrst.object+json',
    },
    tags: { name: 'bid_write_database_verification' },
  });

  check(verifyResponse, {
    'inserted bid can be retrieved': (r) => r.status === 200,

    'database record has pending status': (r) => {
      try {
        return r.json().status === 'pending';
      } catch {
        return false;
      }
    },

    'database record has correct listing ID': (r) => {
      try {
        return r.json().listing_id === LISTING_ID;
      } catch {
        return false;
      }
    },
  });
}
