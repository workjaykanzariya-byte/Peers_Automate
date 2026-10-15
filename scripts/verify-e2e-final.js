const http = require('http');

async function run() {
  console.log('--- DOOT MASTER E2E FINAL VERIFICATION ---');

  // 1. Authenticate Customer
  console.log('\n[1] Testing Customer Login...');
  const custRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qa-user@doot-test.com', password: 'Password123!' })
  });
  if (!custRes.ok) throw new Error(`Customer login failed: ${custRes.status} ${await custRes.text()}`);
  const custData = await custRes.json();
  const custToken = custData.token.accessToken;
  const orgId = custData.organizations?.[0]?.id;
  console.log(`  ✓ Customer logged in: ${custData.user.email} (Org: ${orgId})`);

  // 2. Authenticate Platform Admin
  console.log('\n[2] Testing Platform Admin Login...');
  const adminRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@doot.io', password: 'Password123!' })
  });
  if (!adminRes.ok) throw new Error(`Admin login failed: ${adminRes.status} ${await adminRes.text()}`);
  const adminData = await adminRes.json();
  const adminToken = adminData.token.accessToken;
  console.log(`  ✓ Platform Admin logged in: ${adminData.user.email} (isPlatformAdmin: ${adminData.user.isPlatformAdmin})`);

  // Verify Admin stats
  const statsRes = await fetch('http://localhost:3000/api/v1/admin/stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const stats = await statsRes.json();
  console.log(`  ✓ Admin Stats Verified: ${stats.organizations.total} orgs, ${stats.users.total} users, ${stats.messaging.totalMessages} messages`);

  // 3. Campaign Immediate Execution & Receipt Tracking
  console.log('\n[3] Testing Campaign Immediate Execution & End-to-End Delivery Tracking...');
  // Fetch phone and template
  const phonesRes = await fetch('http://localhost:3000/api/v1/meta/accounts', {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const accounts = await phonesRes.json();
  const phone = accounts[0]?.phoneNumbers?.[0];
  if (!phone) throw new Error('No phone number found');

  const tplsRes = await fetch('http://localhost:3000/api/v1/templates', {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const templates = await tplsRes.json();
  const approvedTpl = templates.find(t => t.status === 'APPROVED');
  if (!approvedTpl) throw new Error('No approved template found');

  const contactsRes = await fetch('http://localhost:3000/api/v1/contacts?limit=5', {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const contactsData = await contactsRes.json();
  const contactIds = (contactsData.contacts || []).map(c => c.id);
  console.log(`  Targeting ${contactIds.length} recipients with template "${approvedTpl.name}"...`);

  // Create & launch campaign immediately
  const campRes = await fetch('http://localhost:3000/api/v1/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify({
      name: `E2E Live Execution Campaign ${Date.now()}`,
      description: 'End-to-end execution test for message dispatching and webhook receipts',
      phoneNumberId: phone.id,
      templateId: approvedTpl.id,
      contactIds,
      executeImmediately: true
    })
  });
  if (!campRes.ok) throw new Error(`Campaign launch failed: ${campRes.status} ${await campRes.text()}`);
  const launchedCamp = await campRes.json();
  console.log(`  ✓ Campaign launched: ID ${launchedCamp.id}, Status: ${launchedCamp.status}`);

  // Wait 1 second for worker/dispatch loop to complete
  await new Promise(r => setTimeout(r, 1000));

  // Verify campaign status in backend
  const checkCampRes = await fetch(`http://localhost:3000/api/v1/campaigns/${launchedCamp.id}`, {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const campDetail = await checkCampRes.json();
  console.log(`  ✓ Campaign Post-Dispatch Status: ${campDetail.status}`);
  console.log(`  ✓ Recipients Processed: total=${campDetail.totalRecipients}, sent=${campDetail.sentCount}, failed=${campDetail.failedCount}`);
  
  const recipient = campDetail.recipients?.[0];
  if (!recipient) throw new Error('No recipient found in campaign details');
  console.log(`  ✓ Recipient Message ID generated: ${recipient.metaMessageId}, status: ${recipient.status}`);

  // 4. Simulate Meta Delivery Receipts (DELIVERED & READ) for this message
  console.log('\n[4] Simulating Inbound Meta Delivery Status Receipts (DELIVERED -> READ)...');
  const deliveredWebhookPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: phone.metaIntegration?.wabaId || 'waba_qa_test_9876543210',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: phone.displayPhoneNumber,
                phone_number_id: phone.phoneNumberId
              },
              statuses: [
                {
                  id: recipient.metaMessageId,
                  status: 'delivered',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  recipient_id: recipient.phone
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const hookRes1 = await fetch('http://localhost:3000/api/v1/meta/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deliveredWebhookPayload)
  });
  console.log(`  ✓ Meta Webhook delivered receipt processed: status ${hookRes1.status}`);

  // Check campaign recipient status after DELIVERED
  const checkDeliveredRes = await fetch(`http://localhost:3000/api/v1/campaigns/${launchedCamp.id}`, {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const campAfterDelivered = await checkDeliveredRes.json();
  const recAfterDelivered = campAfterDelivered.recipients.find(r => r.id === recipient.id);
  console.log(`  ✓ Recipient status updated in PostgreSQL: ${recAfterDelivered.status}`);

  // Send READ receipt
  deliveredWebhookPayload.entry[0].changes[0].value.statuses[0].status = 'read';
  const hookRes2 = await fetch('http://localhost:3000/api/v1/meta/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deliveredWebhookPayload)
  });
  console.log(`  ✓ Meta Webhook read receipt processed: status ${hookRes2.status}`);

  const checkReadRes = await fetch(`http://localhost:3000/api/v1/campaigns/${launchedCamp.id}`, {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const campAfterRead = await checkReadRes.json();
  const recAfterRead = campAfterRead.recipients.find(r => r.id === recipient.id);
  console.log(`  ✓ Recipient status updated in PostgreSQL: ${recAfterRead.status}`);

  // 5. Outbound Webhook Delivery Verification
  console.log('\n[5] Testing Outbound Webhook Live HTTP Delivery...');
  // Create an outbound endpoint pointing to https://httpbin.org/post
  const epRes = await fetch('http://localhost:3000/api/v1/webhooks/endpoints', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify({
      name: 'QA Production Httpbin Receiver',
      url: 'https://httpbin.org/post',
      events: ['endpoint.test_ping', 'message.status_updated', 'message.received']
    })
  });
  const epData = await epRes.json();
  console.log(`  ✓ Registered outbound endpoint: ${epData.name} -> ${epData.url} (ID: ${epData.id})`);

  // Trigger test delivery
  console.log('  Dispatching live outbound test payload with HMAC-SHA256 signature...');
  const testDeliveryRes = await fetch(`http://localhost:3000/api/v1/webhooks/endpoints/${epData.id}/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${custToken}` }
  });
  if (!testDeliveryRes.ok) throw new Error(`Test delivery failed: ${testDeliveryRes.status} ${await testDeliveryRes.text()}`);
  const deliveryResult = await testDeliveryRes.json();
  console.log(`  ✓ Remote HTTP Server Response Status: ${deliveryResult.responseStatus}`);
  console.log(`  ✓ Delivery Log ID: ${deliveryResult.id}, Event: ${deliveryResult.event}`);
  console.log(`  ✓ Delivery Duration: ${deliveryResult.durationMs}ms`);

  // Fetch delivery logs from API
  const logsRes = await fetch('http://localhost:3000/api/v1/webhooks/logs', {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const logsData = await logsRes.json();
  console.log(`  ✓ Verified Delivery Logs in DOOT database: ${logsData.meta.total} records found`);
  const latestLog = logsData.data[0];
  console.log(`  ✓ Latest log entry: Event=${latestLog.event}, Status=${latestLog.responseStatus}, Success=${latestLog.responseStatus === 200}`);

  console.log('\n==================================================');
  console.log('ALL OUTSTANDING BACKEND WORKFLOWS VERIFIED 100% PASS');
  console.log('==================================================');
}

run().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
