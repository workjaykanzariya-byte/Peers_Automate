import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';
import { MetaApiService } from '../meta/meta-api.service';
import { MessageDirection, MessageStatus, MessageType, ConversationStatus, LeadStatus } from '@doot/shared';

export interface FlowNode {
  id: string;
  type: 'TRIGGER' | 'CONDITION' | 'DELAY' | 'SEND_MESSAGE' | 'SEND_TEMPLATE' | 'ASSIGN_LEAD' | 'ADD_TAG';
  label: string;
  config?: any;
  next?: string;
  branches?: { label: string; condition: string; next: string }[];
}

export interface CreateFlowDto {
  name: string;
  triggerType: 'MESSAGE_RECEIVED' | 'KEYWORD_MATCH' | 'NEW_LEAD';
  triggerConfig?: any;
  steps: FlowNode[];
  isActive?: boolean;
}

export const DEFAULT_COMPANY_SUMMARY = `Peers Global Pvt Ltd (Peers Automate) is an enterprise WhatsApp Business API & AI automation platform based in Gujarat, India.

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

export const PRE_TRAINED_FLOW_TEMPLATES = {
  SMART_GREETING_BOT: {
    name: 'Smart Welcome & Interactive Menu Bot',
    triggerType: 'MESSAGE_RECEIVED',
    triggerConfig: {
      description: 'Intelligent multi-branch bot: greets customers, classifies inquiries (Services, Pricing, Demo, Support), and answers questions grounded strictly in the Company Knowledge Summary with automatic human handoff.',
      companySummary: DEFAULT_COMPANY_SUMMARY,
      aiKnowledgeBaseEnabled: true,
      humanHandoffMessage: `Thank you for reaching out, {{name}}! 🤝 Our team has received your inquiry: "{{last_message}}". A member of our executive team will review your question and reply directly in this chat shortly. Please stay connected!`,
      autoKeepAliveEnabled: true,
      keepAliveMessage: `Hello {{name}}! 👋 Please stay connected with us. Our team member is reviewing your inquiry and will shortly connect with you. If you need any assistance right now, please reply here! 💬`,
    },
    steps: [
      {
        id: 'node-trig-1',
        type: 'TRIGGER',
        label: 'Inbound WhatsApp Message',
        config: { triggerEvent: 'MESSAGE_RECEIVED' },
        next: 'node-cond-2',
      },
      {
        id: 'node-cond-2',
        type: 'CONDITION',
        label: 'Classify Message Intent',
        config: { field: 'messageText' },
        branches: [
          {
            label: 'Greeting (Hello/Hi)',
            condition: 'hello, hi, hey, hiii, heyy, namaste, start, menu, greetings',
            next: 'node-msg-greeting',
          },
          {
            label: 'Services / Features',
            condition: 'service, services, features, solution, solutions, 1, what do you do',
            next: 'node-msg-services',
          },
          {
            label: 'Pricing & Plans',
            condition: 'price, pricing, cost, plan, plans, package, 2, quotation, rate, fees',
            next: 'node-msg-pricing',
          },
          {
            label: 'Demo & Walkthrough',
            condition: 'demo, meeting, schedule, appointment, call, book, 3',
            next: 'node-msg-demo',
          },
          {
            label: 'Human Support',
            condition: 'support, agent, human, help, executive, representative, talk, contact, 4',
            next: 'node-msg-support',
          },
          {
            label: 'Default Fallback & Knowledge QA',
            condition: '*',
            next: 'node-msg-fallback',
          },
        ],
      },
      {
        id: 'node-msg-greeting',
        type: 'SEND_MESSAGE',
        label: 'Send Interactive Welcome Menu',
        config: {
          text: `👋 Hello {{name}}! Welcome to *{{company}}*.\n\nHow can we help you today? Please reply with a keyword or option number:\n\n1️⃣ *Services* — Explore our WhatsApp automation solutions\n2️⃣ *Pricing* — View packages and commercial plans\n3️⃣ *Demo* — Schedule a live 1-on-1 walkthrough\n4️⃣ *Support* — Chat with our executive team\n\n_Type any question or keyword to get an instant answer!_`,
        },
      },
      {
        id: 'node-msg-services',
        type: 'SEND_MESSAGE',
        label: 'Send Services Overview',
        config: {
          text: `🚀 *{{company}} Solutions & Capabilities:*\n\n• 🤖 *Automated 24/7 Chatbots:* Smart keyword flows & AI knowledge answering\n• 📢 *Meta Broadcast Campaigns:* Reach thousands of verified contacts with rich media\n• 💬 *Unified Multi-Agent Inbox:* Team inbox with live handoff\n• 🔗 *API & Outbound Webhooks:* Connect with CRM and internal systems\n\nReply *Pricing* to view our plans, or *Demo* to book a tour!`,
        },
      },
      {
        id: 'node-msg-pricing',
        type: 'SEND_MESSAGE',
        label: 'Send Pricing Plans',
        config: {
          text: `💼 *{{company}} Commercial Plans:*\n\n• 🟢 *Starter Plan:* $29/mo — Up to 5,000 messages, 2 team seats, standard bot flows.\n• 🔵 *Growth Plan:* $79/mo — Unlimited messages, custom DAG bot flows, priority queue.\n• 🟣 *Enterprise:* Custom — Dedicated infrastructure, SLA guarantee, custom webhook integration.\n\nReply *Demo* to schedule a live demo with our team!`,
        },
      },
      {
        id: 'node-msg-demo',
        type: 'SEND_MESSAGE',
        label: 'Send Demo Invitation',
        config: {
          text: `📅 *Schedule a Live Product Demo:*\n\nWe would love to show you how Peers Automate can transform your customer communication!\n\n🔗 *Visit:* https://peersglobal.com\n📞 *Direct Contact:* +91 70411 51714\n\nOur solutions specialist will connect with you within 15 minutes!`,
        },
      },
      {
        id: 'node-msg-support',
        type: 'SEND_MESSAGE',
        label: 'Connect with Human Support',
        config: {
          text: `👨‍💼 *Customer Support & Advisory Team:*\n\nYour message has been assigned to our support engineers. A team member will reply directly in this chat shortly.\n\n🕒 *Working Hours:* Mon - Sat, 9:00 AM - 7:00 PM IST\n📧 *Email:* support@peersglobal.com`,
        },
      },
      {
        id: 'node-msg-fallback',
        type: 'SEND_MESSAGE',
        label: 'Send Knowledge QA or Human Handoff',
        config: {
          text: `Thank you for contacting *{{company}}*, {{name}}! 🤝\n\nWe received your message: "{{last_message}}".\n\nTo see quick options, reply with:\n• *Hello* — Main Menu\n• *Pricing* — Subscription Plans\n• *Demo* — Schedule a Walkthrough\n• *Support* — Speak with our Team`,
        },
      },
    ],
  },
  LEAD_QUALIFIER_BOT: {
    name: 'Lead Qualification & Quotation Bot',
    triggerType: 'KEYWORD_MATCH',
    triggerConfig: {
      description: 'Captures pricing and quotation inquiries, requests business message volume, and tags contact as Hot Lead.',
      keywords: ['quote', 'pricing', 'enquiry', 'inquiry', 'buy', 'cost'],
      companySummary: DEFAULT_COMPANY_SUMMARY,
      aiKnowledgeBaseEnabled: true,
    },
    steps: [
      {
        id: 'node-trig-lead',
        type: 'TRIGGER',
        label: 'Keyword Trigger (Quote/Price)',
        config: { triggerEvent: 'KEYWORD_MATCH' },
        next: 'node-msg-lead-ask',
      },
      {
        id: 'node-msg-lead-ask',
        type: 'SEND_MESSAGE',
        label: 'Send Lead Questionnaire',
        config: {
          text: `Hello {{name}}! 👋 Thank you for inquiring about our pricing and packages.\n\nTo provide you with the most accurate proposal, how many messages does your business send per month?\n\nA) Under 5,000 messages / month\nB) 5,000 - 50,000 messages / month\nC) 50,000+ messages / month\n\nReply with A, B, or C!`,
        },
        next: 'node-act-lead-tag',
      },
      {
        id: 'node-act-lead-tag',
        type: 'ADD_TAG',
        label: 'Tag as Hot Lead',
        config: { tag: 'Hot Lead' },
      },
    ],
  },
  SUPPORT_FAQ_BOT: {
    name: '24/7 Hours, Location & Support FAQ Bot',
    triggerType: 'KEYWORD_MATCH',
    triggerConfig: {
      description: 'Instant answers for customer inquiries regarding office address, business working hours, and hotline contacts.',
      keywords: ['hours', 'timing', 'time', 'location', 'address', 'where', 'office', 'contact'],
      companySummary: DEFAULT_COMPANY_SUMMARY,
      aiKnowledgeBaseEnabled: true,
    },
    steps: [
      {
        id: 'node-trig-faq',
        type: 'TRIGGER',
        label: 'FAQ Keywords Trigger',
        config: { triggerEvent: 'KEYWORD_MATCH' },
        next: 'node-msg-faq-info',
      },
      {
        id: 'node-msg-faq-info',
        type: 'SEND_MESSAGE',
        label: 'Send Office Location & Hours',
        config: {
          text: `🏢 *{{company}} Office Details & Hours:*\n\n📍 *Office Location:* Peers Global Pvt Ltd, Gujarat, India\n🕒 *Business Hours:* Monday to Saturday, 9:00 AM – 7:00 PM IST\n📞 *Hotline:* +91 70411 51714\n🌐 *Website:* https://peersglobal.com\n\nOur team is online and ready to assist! Reply *Hello* to return to the main menu.`,
        },
      },
    ],
  },
};

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(forwardRef(() => MetaApiService))
    private readonly metaApi: MetaApiService,
  ) {}

  async listFlows(organizationId: string) {
    return this.prisma.automationFlow.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getFlow(organizationId: string, id: string) {
    const flow = await this.prisma.automationFlow.findFirst({
      where: { id, organizationId },
    });
    if (!flow) {
      throw new NotFoundException('Automation flow not found');
    }
    return flow;
  }

  listTemplates() {
    return Object.entries(PRE_TRAINED_FLOW_TEMPLATES).map(([key, tpl]) => ({
      key,
      name: tpl.name,
      triggerType: tpl.triggerType,
      description: (tpl.triggerConfig as any)?.description || '',
      stepsCount: tpl.steps.length,
      steps: tpl.steps,
      companySummary: (tpl.triggerConfig as any)?.companySummary || DEFAULT_COMPANY_SUMMARY,
    }));
  }

  async installTemplate(organizationId: string, templateKey: string) {
    const tpl = (PRE_TRAINED_FLOW_TEMPLATES as any)[templateKey];
    if (!tpl) {
      throw new BadRequestException(`Template "${templateKey}" not found`);
    }

    const existing = await this.prisma.automationFlow.findFirst({
      where: { organizationId, name: tpl.name },
    });

    if (existing) {
      return this.prisma.automationFlow.update({
        where: { id: existing.id },
        data: {
          triggerType: tpl.triggerType,
          triggerConfig: tpl.triggerConfig,
          steps: tpl.steps as any,
          isActive: true,
        },
      });
    }

    return this.prisma.automationFlow.create({
      data: {
        organizationId,
        name: tpl.name,
        triggerType: tpl.triggerType,
        triggerConfig: tpl.triggerConfig || {},
        steps: tpl.steps as any,
        isActive: true,
      },
    });
  }

  async createFlow(organizationId: string, dto: CreateFlowDto) {
    this.validateFlowGraph(dto.steps);

    return this.prisma.automationFlow.create({
      data: {
        organizationId,
        name: dto.name,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig || {},
        steps: dto.steps as any,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateFlow(organizationId: string, id: string, dto: Partial<CreateFlowDto>) {
    await this.getFlow(organizationId, id);

    if (dto.steps) {
      this.validateFlowGraph(dto.steps);
    }

    return this.prisma.automationFlow.update({
      where: { id },
      data: {
        name: dto.name,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig,
        steps: dto.steps ? (dto.steps as any) : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });
  }

  async deleteFlow(organizationId: string, id: string) {
    await this.getFlow(organizationId, id);
    return this.prisma.automationFlow.delete({
      where: { id },
    });
  }

  async toggleActive(organizationId: string, id: string, isActive: boolean) {
    const flow = await this.getFlow(organizationId, id);

    if (isActive) {
      this.validateFlowGraph(flow.steps as unknown as FlowNode[]);
    }

    return this.prisma.automationFlow.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Graph Safety Validation:
   * 1. Max 25 nodes per flow
   * 2. Exactly one TRIGGER node as root
   * 3. All outgoing edge targets exist in the graph
   * 4. Acyclic check (detects and prevents infinite loops)
   */
  validateFlowGraph(nodes: FlowNode[]) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new BadRequestException('Flow must contain at least one trigger node');
    }

    if (nodes.length > 25) {
      throw new BadRequestException('Flow exceeds maximum allowed node limit (25 nodes)');
    }

    const nodeMap = new Map<string, FlowNode>();
    for (const node of nodes) {
      if (!node.id || !node.type) {
        throw new BadRequestException('Every node must have a unique id and type');
      }
      if (nodeMap.has(node.id)) {
        throw new BadRequestException(`Duplicate node ID detected: ${node.id}`);
      }
      nodeMap.set(node.id, node);
    }

    const triggers = nodes.filter((n) => n.type === 'TRIGGER');
    if (triggers.length !== 1) {
      throw new BadRequestException('Flow must contain exactly one root TRIGGER node');
    }

    // Verify edge targets exist
    for (const node of nodes) {
      if (node.next && !nodeMap.has(node.next)) {
        throw new BadRequestException(`Node "${node.id}" references non-existent target node "${node.next}"`);
      }
      if (node.branches) {
        for (const branch of node.branches) {
          if (branch.next && !nodeMap.has(branch.next)) {
            throw new BadRequestException(
              `Branch in node "${node.id}" references non-existent target node "${branch.next}"`,
            );
          }
        }
      }
    }

    // Detect Cycles (DFS traversal)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (node) {
        const neighbors: string[] = [];
        if (node.next) neighbors.push(node.next);
        if (node.branches) {
          for (const b of node.branches) {
            if (b.next) neighbors.push(b.next);
          }
        }

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) return true;
          } else if (recursionStack.has(neighbor)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    if (hasCycle(triggers[0].id)) {
      throw new BadRequestException(
        'Invalid flow graph: detected an infinite cycle/loop. Bot flows must be directed acyclic graphs (DAG).',
      );
    }
  }

  /**
   * Helper: Match condition string against input text with strict word-boundary awareness
   */
  matchesCondition(text: string, conditionStr: string): boolean {
    if (!conditionStr || !text) return false;
    const trimmedCondition = conditionStr.trim().toLowerCase();
    if (trimmedCondition === '*' || trimmedCondition === 'default' || trimmedCondition === 'else') {
      return true;
    }

    const rawText = text.trim().toLowerCase();
    const keywords = trimmedCondition
      .split(/[,|;]/)
      .map((k) => k.trim())
      .filter(Boolean);

    for (const kw of keywords) {
      if (kw === '*' || kw === 'default' || kw === 'else') {
        return true;
      }
      // Exact match
      if (rawText === kw) {
        return true;
      }
      // Escape regex special chars
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Enforce strict word boundaries (prevents "integrate" false-matching "rate", or "starter" matching "start")
      const wordRegex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}($|[^a-zA-Z0-9])`, 'i');
      if (wordRegex.test(rawText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Replace dynamic variables in message text
   */
  interpolateVariables(
    text: string,
    context: { name?: string; phone?: string; company?: string; last_message?: string },
  ): string {
    if (!text) return '';
    const now = new Date();
    const hours = now.getHours();
    const timeGreeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';

    return text
      .replace(/\{\{\s*name\s*\}\}/gi, context.name || 'there')
      .replace(/\{\{\s*contact_name\s*\}\}/gi, context.name || 'there')
      .replace(/\{\{\s*phone\s*\}\}/gi, context.phone || '')
      .replace(/\{\{\s*company\s*\}\}/gi, context.company || 'Peers Automate')
      .replace(/\{\{\s*organization\s*\}\}/gi, context.company || 'Peers Automate')
      .replace(/\{\{\s*greeting\s*\}\}/gi, timeGreeting)
      .replace(/\{\{\s*last_message\s*\}\}/gi, context.last_message || '')
      .replace(/\{\{\s*question\s*\}\}/gi, context.last_message || '')
      .replace(/\{\{\s*text\s*\}\}/gi, context.last_message || '');
  }

  /**
   * AI Knowledge Base Question-Answering Engine
   * Evaluates customer query against the company & project summary.
   * If answerable: returns formatted WhatsApp reply.
   * If NOT answerable: returns canAnswer = false to trigger human handoff message!
   */
  async evaluateKnowledgeSummary(params: {
    question: string;
    companySummary: string;
    companyName: string;
    contactName?: string;
  }): Promise<{ canAnswer: boolean; answer: string }> {
    const { question, companySummary, companyName, contactName } = params;
    if (!companySummary || !companySummary.trim()) {
      return { canAnswer: false, answer: '' };
    }

    const rawQ = question.trim().toLowerCase();
    const summary = companySummary.trim();

    // 1. Check if user selected numeric or keyword options (1: services, 2: pricing, 3: demo, 4: support)
    if (
      rawQ === '1' ||
      rawQ === 'services' ||
      rawQ === 'service' ||
      rawQ === 'features' ||
      rawQ.includes('what do you do') ||
      rawQ.includes('what service')
    ) {
      const match = summary.match(
        /(?:capabilities & services|services|capabilities|solutions|what we do)[\s\S]*?(?=(?:commercial pricing|pricing|plans|demo|appointments|business operating|$))/i,
      );
      const content = match ? match[0].trim() : summary.slice(0, 350);
      return {
        canAnswer: true,
        answer: `🚀 *${companyName} Services & Capabilities:*\n\n${content}\n\n_Reply *Pricing* to check plans or *Demo* to book a tour!_`,
      };
    }

    if (
      rawQ === '2' ||
      rawQ === 'pricing' ||
      rawQ === 'price' ||
      rawQ === 'cost' ||
      rawQ === 'plans' ||
      rawQ === 'package' ||
      rawQ === 'rate' ||
      rawQ === 'quotation'
    ) {
      const match = summary.match(
        /(?:commercial pricing|pricing|plans|cost|packages|rates)[\s\S]*?(?=(?:capabilities & services|demo|appointments|contact details|business operating|$))/i,
      );
      const content = match ? match[0].trim() : summary.slice(0, 350);
      return {
        canAnswer: true,
        answer: `💼 *${companyName} Commercial Pricing:*\n\n${content}\n\n_Reply *Demo* to schedule a live walkthrough with our team!_`,
      };
    }

    if (
      rawQ === '3' ||
      rawQ === 'demo' ||
      rawQ === 'book' ||
      rawQ === 'meeting' ||
      rawQ === 'schedule' ||
      rawQ === 'appointment'
    ) {
      const match = summary.match(
        /(?:demo, appointments & contact details|demo|appointments|contact details|hotline|website)[\s\S]*?(?=(?:commercial pricing|capabilities & services|business operating|$))/i,
      );
      const content = match ? match[0].trim() : summary.slice(0, 350);
      return {
        canAnswer: true,
        answer: `📅 *Schedule a Walkthrough / Connect with ${companyName}:*\n\n${content}\n\n_Our specialist will connect with you within 15 minutes!_`,
      };
    }

    if (
      rawQ === '4' ||
      rawQ === 'support' ||
      rawQ === 'agent' ||
      rawQ === 'human' ||
      rawQ === 'help' ||
      rawQ === 'representative'
    ) {
      return {
        canAnswer: true,
        answer: `👨‍💼 *Customer Support & Human Advisory:*\n\nYour chat is now routed to our active support agents. An executive will join this conversation shortly.\n\n🕒 *Hours:* Mon - Sat, 9:00 AM - 7:00 PM IST\n📧 *Email:* support@peersglobal.com\n📞 *Hotline:* +91 70411 51714`,
      };
    }

    // 2. Multi-keyword semantic extraction from the summary
    const lines = summary.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'what', 'how', 'when', 'where', 'who', 'which',
      'can', 'you', 'your', 'are', 'is', 'a', 'an', 'in', 'on', 'at', 'to', 'do',
      'does', 'we', 'i', 'me', 'my', 'please', 'tell', 'about', 'some', 'give',
    ]);
    const queryTokens = rawQ
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    if (queryTokens.length === 0) {
      return { canAnswer: false, answer: '' };
    }

    // Score lines in the summary based on query tokens
    const matchingLines: { line: string; score: number }[] = [];
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      let score = 0;
      for (const token of queryTokens) {
        if (lowerLine.includes(token)) {
          score += token.length >= 5 ? 2 : 1;
        }
      }
      if (score > 0) {
        matchingLines.push({ line, score });
      }
    }

    matchingLines.sort((a, b) => b.score - a.score);

    // If match found with confidence score >= 2
    if (matchingLines.length > 0 && matchingLines[0].score >= 2) {
      const bestPassage = matchingLines.slice(0, 3).map((m) => m.line).join('\n\n');
      return {
        canAnswer: true,
        answer: `👋 Hello ${contactName || 'there'}!\n\nHere is what our knowledge base says regarding your inquiry:\n\n${bestPassage}\n\n_Reply *Menu* to see all options or *Support* to speak with our team!_`,
      };
    }

    // 3. No match found in the summary: Question cannot be answered!
    return {
      canAnswer: false,
      answer: '',
    };
  }

  /**
   * LIVE EXECUTION ENGINE:
   * Triggered on every inbound WhatsApp message from Meta Webhook.
   * Matches condition branches, executes actions, and sends real WhatsApp responses!
   */
  async handleInboundMessage(params: {
    organizationId: string;
    conversationId: string;
    contactId: string;
    contactPhone: string;
    contactName: string;
    messageBody: string;
    phoneNumberRecordId: string;
    isNewLead?: boolean;
  }): Promise<{ executed: boolean; flowName?: string; replyText?: string }> {
    const {
      organizationId,
      conversationId,
      contactId,
      contactPhone,
      contactName,
      messageBody,
      phoneNumberRecordId,
      isNewLead,
    } = params;

    // 1. Fetch active flows
    const flows = await this.prisma.automationFlow.findMany({
      where: { organizationId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!flows || flows.length === 0) {
      this.logger.debug(`No active automation flows configured for org ${organizationId}`);
      return { executed: false };
    }

    // 2. Select matching flow
    let matchedFlow = flows.find((f) => {
      if (f.triggerType === 'NEW_LEAD' && isNewLead) return true;
      if (f.triggerType === 'KEYWORD_MATCH') {
        const keywords = (f.triggerConfig as any)?.keywords || [];
        const text = messageBody.toLowerCase();
        if (Array.isArray(keywords) && keywords.length > 0) {
          return keywords.some((k: string) => text.includes(k.toLowerCase()));
        }
        return false;
      }
      if (f.triggerType === 'MESSAGE_RECEIVED') return true;
      return false;
    });

    // Fallback to first MESSAGE_RECEIVED flow
    if (!matchedFlow) {
      matchedFlow = flows.find((f) => f.triggerType === 'MESSAGE_RECEIVED');
    }

    if (!matchedFlow) {
      return { executed: false };
    }

    // 3. Resolve Phone Credentials
    const phone = await this.prisma.phoneNumber.findUnique({
      where: { id: phoneNumberRecordId },
      include: { metaIntegration: true, organization: true },
    });

    if (!phone || !phone.metaIntegration?.encryptedAccessToken) {
      this.logger.warn(`Cannot execute bot flow: Phone or Meta access token missing for phone ${phoneNumberRecordId}`);
      return { executed: false };
    }

    let accessToken = '';
    const encryptedToken = phone.metaIntegration.encryptedAccessToken;
    if (encryptedToken.startsWith('v1:')) {
      try {
        accessToken = this.encryption.decrypt(encryptedToken);
      } catch {
        accessToken = encryptedToken;
      }
    } else {
      accessToken = encryptedToken;
    }

    const triggerCfg = (matchedFlow.triggerConfig as any) || {};
    const companySummary = triggerCfg.companySummary || DEFAULT_COMPANY_SUMMARY;
    const aiKnowledgeBaseEnabled = triggerCfg.aiKnowledgeBaseEnabled !== false;

    const nodes = matchedFlow.steps as unknown as FlowNode[];
    const nodeMap = new Map<string, FlowNode>(nodes.map((n) => [n.id, n]));
    const root = nodes.find((n) => n.type === 'TRIGGER');
    if (!root) {
      return { executed: false };
    }

    // 4. Traverse DAG
    let current: FlowNode | undefined = root;
    let stepsCount = 0;
    let lastReplyText = '';

    const context = {
      name: contactName,
      phone: contactPhone,
      company: phone.organization?.name || 'Peers Automate',
      last_message: messageBody,
    };

    while (current && stepsCount < 25) {
      stepsCount++;

      if (current.type === 'TRIGGER') {
        current = current.next ? nodeMap.get(current.next) : undefined;
        continue;
      }

      if (current.type === 'CONDITION') {
        const branches = current.branches || [];
        let matchedBranch: { label: string; condition: string; next: string } | undefined;

        // Try specific keyword branches first
        for (const branch of branches) {
          const cond = branch.condition?.toLowerCase()?.trim();
          if (cond !== '*' && cond !== 'default' && cond !== 'else') {
            if (this.matchesCondition(messageBody, branch.condition)) {
              matchedBranch = branch;
              break;
            }
          }
        }

        // If no keyword match, try fallback branch
        if (!matchedBranch) {
          matchedBranch = branches.find((b) => {
            const cond = b.condition?.toLowerCase()?.trim();
            return cond === '*' || cond === 'default' || cond === 'else';
          });
        }

        if (matchedBranch && matchedBranch.next) {
          current = nodeMap.get(matchedBranch.next);
        } else {
          current = current.next ? nodeMap.get(current.next) : undefined;
        }
        continue;
      }

      if (current.type === 'SEND_MESSAGE') {
        let rawText = current.config?.text || '';

        // If this is the fallback node or AI knowledge base is enabled, evaluate question against company summary
        const isFallbackNode =
          current.id.includes('fallback') ||
          current.id.includes('default') ||
          (current.label && current.label.toLowerCase().includes('fallback'));

        if (aiKnowledgeBaseEnabled && isFallbackNode) {
          const kbResult = await this.evaluateKnowledgeSummary({
            question: messageBody,
            companySummary,
            companyName: phone.organization?.name || 'Peers Automate',
            contactName,
          });

          if (kbResult.canAnswer && kbResult.answer.trim()) {
            rawText = kbResult.answer;
          } else {
            // Cannot answer from knowledge base: Send human handoff message!
            rawText =
              triggerCfg.humanHandoffMessage ||
              `Thank you for reaching out, {{name}}! 🤝 Our team has received your inquiry: "{{last_message}}". A member of our executive team will review your question and reply directly in this chat shortly. Please stay connected!`;

            // Tag contact as Needs Agent Reply & flag conversation OPEN for human continuation
            try {
              let tag = await this.prisma.tag.findFirst({
                where: { organizationId, name: 'Needs Agent Reply' },
              });
              if (!tag) {
                tag = await this.prisma.tag.create({
                  data: { organizationId, name: 'Needs Agent Reply', color: '#f59e0b' },
                });
              }
              await this.prisma.contactTag.upsert({
                where: { contactId_tagId: { contactId, tagId: tag.id } },
                update: {},
                create: { contactId, tagId: tag.id },
              });

              await this.prisma.conversation.update({
                where: { id: conversationId },
                data: { status: ConversationStatus.OPEN },
              });
            } catch (err: any) {
              this.logger.warn(`Could not tag contact for human handoff: ${err.message}`);
            }
          }
        }

        const renderedText = this.interpolateVariables(rawText, context);

        if (renderedText.trim()) {
          try {
            const metaRes = await this.metaApi.sendTextMessage(
              phone.phoneNumberId,
              accessToken,
              contactPhone,
              renderedText,
            );

            const metaMessageId = metaRes?.messages?.[0]?.id || `wamid.bot_${Date.now()}`;

            // Create outbound Message record in DB so it shows in Live Inbox
            await this.prisma.message.create({
              data: {
                organizationId,
                conversationId,
                metaMessageId,
                direction: MessageDirection.OUTBOUND,
                type: MessageType.TEXT,
                body: renderedText,
                status: MessageStatus.SENT,
                sentAt: new Date(),
              },
            });

            // Update conversation timestamp & 24h window
            await this.prisma.conversation.update({
              where: { id: conversationId },
              data: {
                lastMessageAt: new Date(),
                windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });

            lastReplyText = renderedText;
            this.logger.log(
              `Bot flow "${matchedFlow.name}" dispatched reply to ${contactPhone}: "${renderedText.slice(0, 50)}..."`,
            );
          } catch (sendErr: any) {
            this.logger.error(`Failed to send bot reply via Meta API: ${sendErr.message}`);
          }
        }

        current = current.next ? nodeMap.get(current.next) : undefined;
        continue;
      }

      if (current.type === 'ADD_TAG') {
        const tagText = current.config?.tag;
        if (tagText) {
          try {
            let tag = await this.prisma.tag.findFirst({
              where: { organizationId, name: tagText },
            });
            if (!tag) {
              tag = await this.prisma.tag.create({
                data: { organizationId, name: tagText, color: '#6366f1' },
              });
            }
            await this.prisma.contactTag.upsert({
              where: {
                contactId_tagId: { contactId, tagId: tag.id },
              },
              update: {},
              create: { contactId, tagId: tag.id },
            });
          } catch (tagErr: any) {
            this.logger.warn(`Could not add tag in bot flow: ${tagErr.message}`);
          }
        }
        current = current.next ? nodeMap.get(current.next) : undefined;
        continue;
      }

      if (current.type === 'ASSIGN_LEAD') {
        const leadStatus = current.config?.leadStatus || LeadStatus.QUALIFIED;
        try {
          await this.prisma.contact.update({
            where: { id: contactId },
            data: { leadStatus },
          });
        } catch (leadErr: any) {
          this.logger.warn(`Could not update contact lead status in bot flow: ${leadErr.message}`);
        }
        current = current.next ? nodeMap.get(current.next) : undefined;
        continue;
      }

      current = current.next ? nodeMap.get(current.next) : undefined;
    }

    // Increment execution counter
    await this.prisma.automationFlow.update({
      where: { id: matchedFlow.id },
      data: { executionCount: { increment: 1 } },
    });

    return {
      executed: true,
      flowName: matchedFlow.name,
      replyText: lastReplyText,
    };
  }

  /**
   * Dry-Run Simulation Mode:
   * Traverses the flow with mock input message and returns full step execution trace & rendered response.
   */
  async simulateFlow(
    organizationId: string,
    id: string,
    sampleInput: { messageText: string; contactPhone?: string; contactName?: string },
  ) {
    const flow = await this.getFlow(organizationId, id);
    const nodes = flow.steps as unknown as FlowNode[];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const trace: any[] = [];
    const root = nodes.find((n) => n.type === 'TRIGGER');
    if (!root) return { success: false, trace: [], replyText: '' };

    let current: FlowNode | undefined = root;
    let stepCount = 0;
    let finalReply = '';

    const triggerCfg = (flow.triggerConfig as any) || {};
    const companySummary = triggerCfg.companySummary || DEFAULT_COMPANY_SUMMARY;
    const aiKnowledgeBaseEnabled = triggerCfg.aiKnowledgeBaseEnabled !== false;

    const context = {
      name: sampleInput.contactName || 'Valued Customer',
      phone: sampleInput.contactPhone || '+1 555 051 1240',
      company: 'Peers Automate',
      last_message: sampleInput.messageText,
    };

    while (current && stepCount < 25) {
      stepCount++;
      const stepTrace: any = {
        nodeId: current.id,
        type: current.type,
        label: current.label,
        timestamp: new Date().toISOString(),
      };

      if (current.type === 'TRIGGER') {
        stepTrace.outcome = `Triggered on event: ${current.config?.triggerEvent || flow.triggerType}`;
        trace.push(stepTrace);
        current = current.next ? nodeMap.get(current.next) : undefined;
        continue;
      }

      if (current.type === 'CONDITION' && current.branches && current.branches.length > 0) {
        let matchedBranch: { label: string; condition: string; next: string } | undefined;

        for (const b of current.branches) {
          const cond = b.condition?.toLowerCase()?.trim();
          if (cond !== '*' && cond !== 'default' && cond !== 'else') {
            if (this.matchesCondition(sampleInput.messageText, b.condition)) {
              matchedBranch = b;
              break;
            }
          }
        }

        if (!matchedBranch) {
          matchedBranch = current.branches.find((b) => {
            const cond = b.condition?.toLowerCase()?.trim();
            return cond === '*' || cond === 'default' || cond === 'else';
          });
        }

        if (matchedBranch) {
          stepTrace.outcome = `Matched condition branch: "${matchedBranch.label}" [Rule: "${matchedBranch.condition}"]`;
          trace.push(stepTrace);
          current = nodeMap.get(matchedBranch.next);
        } else {
          stepTrace.outcome = 'No matching condition branch found; flow ended.';
          trace.push(stepTrace);
          current = undefined;
        }
        continue;
      }

      if (current.type === 'SEND_MESSAGE') {
        let raw = current.config?.text || '';

        const isFallbackNode =
          current.id.includes('fallback') ||
          current.id.includes('default') ||
          (current.label && current.label.toLowerCase().includes('fallback'));

        if (aiKnowledgeBaseEnabled && isFallbackNode) {
          const kbResult = await this.evaluateKnowledgeSummary({
            question: sampleInput.messageText,
            companySummary,
            companyName: 'Peers Automate',
            contactName: context.name,
          });

          if (kbResult.canAnswer && kbResult.answer.trim()) {
            raw = kbResult.answer;
            stepTrace.knowledgeEvaluated = true;
            stepTrace.groundedInKnowledge = true;
          } else {
            raw =
              triggerCfg.humanHandoffMessage ||
              `Thank you for reaching out, {{name}}! 🤝 Our team has received your inquiry: "{{last_message}}". A member of our executive team will review your question and reply directly in this chat shortly. Please stay connected!`;
            stepTrace.knowledgeEvaluated = true;
            stepTrace.groundedInKnowledge = false;
            stepTrace.humanHandoffTriggered = true;
          }
        }

        const rendered = this.interpolateVariables(raw, context);
        finalReply = rendered;
        stepTrace.outcome = `Dispatched message payload:\n"${rendered}"`;
        stepTrace.renderedMessage = rendered;
        trace.push(stepTrace);
        current = current.next ? nodeMap.get(current.next) : undefined;
        continue;
      }

      if (current.type === 'ADD_TAG') {
        stepTrace.outcome = `Applied contact tag: "${current.config?.tag || 'Lead'}"`;
        trace.push(stepTrace);
        current = current.next ? nodeMap.get(current.next) : undefined;
        continue;
      }

      stepTrace.outcome = 'Executed step';
      trace.push(stepTrace);
      current = current.next ? nodeMap.get(current.next) : undefined;
    }

    return {
      flowName: flow.name,
      totalStepsExecuted: trace.length,
      sampleInput,
      replyText: finalReply,
      trace,
    };
  }
}
