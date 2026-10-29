const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_COMPANY_SUMMARY = `Peers Global Pvt Ltd (Peers Automate) is an enterprise WhatsApp Business API & AI automation platform based in Gujarat, India.

1. Capabilities & Services:
• Official WhatsApp Cloud API Integration with Verified Green Tick support.
• 24/7 Intelligent Automated Chatbots with keyword flows, knowledge base QA, and instant lead capture.
• Meta Broadcast Campaigns reaching 100,000+ verified customer contacts with media & interactive CTA buttons.
• Unified Multi-Agent Team Inbox with real-time human chat handoff and conversation assignment.
• CRM & Webhook Integrations connecting WhatsApp with Shopify, WooCommerce, HubSpot, Salesforce, and custom web portals.

2. Commercial Pricing & Subscription Plans:
• Starter Plan: $29/month — Up to 5,000 messages, 2 team seats, standard bot flows, and basic reporting.
• Growth Plan: $79/month — Unlimited bot flows, 5 team seats, priority queues, and webhook relays.
• Enterprise Plan: Custom pricing — Dedicated cloud infrastructure, custom SLA guarantee, and custom CRM integration.

3. Demo, Appointments & Contact Details:
• Website: https://peersglobal.com
• Direct Hotline & WhatsApp: +91 70411 51714
• Official Support Email: support@peersglobal.com
• Turnaround Time: Standard setup is completed within 24 to 48 hours. Live 1-on-1 walkthroughs can be scheduled directly with our engineering team.

4. Business Operating Hours & Office Location:
• Office Location: Peers Global Pvt Ltd, Gujarat, India.
• Working Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST. Support tickets outside hours are addressed on the next business morning.`;

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: { contains: 'Peers Global' } } });
  const flow = await prisma.automationFlow.findFirst({ where: { organizationId: org.id } });
  if (!flow) {
    console.log('No flow found');
    return;
  }

  const updated = await prisma.automationFlow.update({
    where: { id: flow.id },
    data: {
      triggerConfig: {
        description:
          'Intelligent multi-branch bot: greets customers, classifies inquiries, and answers questions grounded strictly in the Company Knowledge Summary with automatic human handoff.',
        companySummary: DEFAULT_COMPANY_SUMMARY,
        aiKnowledgeBaseEnabled: true,
        humanHandoffMessage:
          'Thank you for reaching out, {{name}}! 🤝 Our team has received your inquiry: "{{last_message}}". A member of our executive team will review your question and reply directly in this chat shortly. Please stay connected!',
        autoKeepAliveEnabled: true,
        keepAliveMessage:
          'Hello {{name}}! 👋 Please stay connected with us. Our team member is reviewing your inquiry and will shortly connect with you. If you need any assistance right now, please reply here! 💬',
      },
      isActive: true,
    },
  });

  console.log('UPDATED FLOW WITH KNOWLEDGE BASE:', updated.name, 'Summary length:', updated.triggerConfig.companySummary.length);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

