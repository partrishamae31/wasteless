
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const fs = require("fs");

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD_SEED = process.env.K6_PASSWORD_SEED;

const REPAIR_ROLE = "repair_shop";
const PREFIX = "wasteless-k6";
const DOMAIN = "example.com";

const TOTAL_PER_ROLE = 500;
const CONCURRENCY = 3;

if (!URL || !SERVICE_KEY || !PASSWORD_SEED) {
  throw new Error("Missing required .env configuration.");
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function makeEmail(number) {
  return `${PREFIX}-${String(number).padStart(4, "0")}@${DOMAIN}`;
}

function makePassword(email) {
  const hash = crypto
    .createHmac("sha256", PASSWORD_SEED)
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 32);

  return `${hash}Aa1!`;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function getExistingUsers() {
  const users = new Map();
  let page = 1;

  while (true) {
    const { data, error } =
      await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) throw error;

    for (const user of data.users) {
      if (user.email) {
        users.set(user.email.toLowerCase(), user);
      }
    }

    if (data.users.length < 1000) break;
    page++;
  }

  return users;
}

async function main() {
  const existing = await getExistingUsers();
  const jobs = [];

  let number = 1;

  for (const role of ["harvester", REPAIR_ROLE]) {
    for (let i = 1; i <= TOTAL_PER_ROLE; i++) {
      jobs.push({
        number,
        role,
        name: `${role} Load Test ${String(i).padStart(3, "0")}`,
        email: makeEmail(number),
      });

      number++;
    }
  }

  console.log(`Preparing ${jobs.length} accounts...`);

  const results = new Array(jobs.length);
  let next = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= jobs.length) return;

      const job = jobs[index];
      const email = job.email.toLowerCase();
      const password = makePassword(email);

      try {
        const previous = existing.get(email);

        if (previous) {
          if (previous.user_metadata?.role !== job.role) {
            throw new Error("Existing account has a different role.");
          }

          results[index] = {
            email,
            password,
            role: job.role,
            user_id: previous.id,
            status: "existing",
          };

          skipped++;
          continue;
        }

        const { data, error } =
          await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: job.name,
              role: job.role,
            },
          });

        if (error) throw error;

        results[index] = {
          email,
          password,
          role: job.role,
          user_id: data.user.id,
          status: "created",
        };

        created++;

        if (created % 25 === 0) {
          console.log(`Created ${created} accounts...`);
        }
      } catch (error) {
        failed++;

        results[index] = {
          email,
          role: job.role,
          status: "failed",
          error: error.message,
        };

        console.error(`Failed ${email}: ${error.message}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker())
  );

  const successful = results.filter(
    (item) => item && item.status !== "failed"
  );

  const header = [
    "email",
    "password",
    "role",
    "user_id",
    "status",
  ];

  const rows = successful.map((item) =>
    [
      item.email,
      item.password,
      item.role,
      item.user_id,
      item.status,
    ].map(csvEscape).join(",")
  );

  fs.writeFileSync(
    "test-accounts.csv",
    [header.join(","), ...rows].join("\n"),
    "utf8"
  );

  console.log("\n========== RESULTS ==========");
  console.log(`Created: ${created}`);
  console.log(`Already existed: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Credentials exported: ${successful.length}`);
  console.log("CSV: test-accounts.csv");

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Setup stopped:", error.message);
  process.exitCode = 1;
});
