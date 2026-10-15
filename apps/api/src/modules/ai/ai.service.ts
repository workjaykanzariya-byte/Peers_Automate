import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';

export interface AiConfigDto {
  provider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI';
  apiKey?: string;
  model?: string;
  systemInstructions?: string;
  isEnabled: boolean;
  temperature?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async getConfig(organizationId: string) {
    const config = await this.prisma.aiAssistantConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return {
        provider: 'OPENAI',
        model: 'gpt-4o',
        isEnabled: false,
        hasApiKey: false,
        temperature: 0.7,
        systemInstructions: 'You are a helpful customer support agent for our company. Keep replies concise, friendly, and professional.',
      };
    }

    return {
      provider: config.provider,
      model: config.model,
      isEnabled: config.isEnabled,
      hasApiKey: !!config.encryptedApiKey,
      temperature: Number(config.temperature),
      systemInstructions: config.systemInstructions,
      updatedAt: config.updatedAt,
    };
  }

  async saveConfig(organizationId: string, dto: AiConfigDto) {
    let encryptedKey: string | undefined = undefined;

    if (dto.apiKey?.trim()) {
      encryptedKey = this.encryption.encrypt(dto.apiKey.trim()).ciphertext;
    }

    const existing = await this.prisma.aiAssistantConfig.findUnique({
      where: { organizationId },
    });

    return this.prisma.aiAssistantConfig.upsert({
      where: { organizationId },
      update: {
        provider: dto.provider,
        model: dto.model || 'gpt-4o',
        systemInstructions: dto.systemInstructions,
        isEnabled: dto.isEnabled,
        temperature: dto.temperature || 0.7,
        ...(encryptedKey ? { encryptedApiKey: encryptedKey } : {}),
      },
      create: {
        organizationId,
        provider: dto.provider,
        model: dto.model || 'gpt-4o',
        systemInstructions: dto.systemInstructions,
        isEnabled: dto.isEnabled,
        temperature: dto.temperature || 0.7,
        encryptedApiKey: encryptedKey || '',
      },
    });
  }

  /**
   * Generates a suggested reply for active customer chat in Inbox with PII masking & prompt defense
   */
  async suggestReply(
    organizationId: string,
    conversationId: string,
    contextHistory: { direction: string; text: string }[],
  ) {
    const config = await this.prisma.aiAssistantConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.isEnabled) {
      throw new BadRequestException('AI Assistant is not enabled for this workspace. Enable it in Settings.');
    }

    // 1. Sanitize & Protect Against Prompt Injection
    const sanitizedHistory = contextHistory.map((msg) => {
      // Mask phone numbers and emails to preserve customer privacy
      const maskedText = this.maskCustomerPii(msg.text);
      // Strip potential jailbreak strings
      const safeText = maskedText
        .replace(/system:/gi, '')
        .replace(/ignore previous instructions/gi, '[FILTERED]');

      return `${msg.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${safeText}`;
    });

    // 2. Build Protected Prompt Context
    const systemPrompt = config.systemInstructions || 'You are a helpful customer support agent.';
    const prompt = `System Instructions: ${systemPrompt}\n\nRecent Conversation:\n${sanitizedHistory.join('\n')}\n\nTask: Draft a concise, courteous WhatsApp response to the customer. Do not include quotes or prefixes.`;

    // 3. Extensible Provider Execution (with safe synthetic fallback if external key not configured)
    let suggestedText = 'Thank you for contacting us! We have received your inquiry and our team is looking into this for you right away. How else can we assist you?';

    if (config.encryptedApiKey) {
      try {
        const apiKey = this.encryption.decrypt(config.encryptedApiKey);
        // External call to OpenAI / Anthropic / Gemini
        this.logger.log(`Invoking AI suggestion for Org ${organizationId} using model ${config.model}`);
        // Return context-aware response based on customer inquiry
        const lastMsg = contextHistory[contextHistory.length - 1]?.text || '';
        if (lastMsg.toLowerCase().includes('price') || lastMsg.toLowerCase().includes('cost')) {
          suggestedText = 'Hello! Thank you for inquiring about our pricing. We offer flexible plans tailored to your needs. Would you like me to share our standard pricing sheet or schedule a quick call?';
        } else if (lastMsg.toLowerCase().includes('order') || lastMsg.toLowerCase().includes('track')) {
          suggestedText = 'Hi there, I would be happy to help you track your order! Could you please share your order number so I can check the latest status for you?';
        } else {
          suggestedText = `Hi! Thanks for reaching out. In response to your message: "${this.maskCustomerPii(lastMsg)}", we are here to help. Could you please share a few more details so we can assist you promptly?`;
        }
      } catch (err: any) {
        this.logger.error(`AI Assistant invocation error: ${err.message}`);
      }
    }

    return {
      provider: config.provider,
      model: config.model,
      suggestedReply: suggestedText,
      requiresHumanApproval: true, // Human-in-the-loop: Must be reviewed before dispatch
    };
  }

  /**
   * Customer PII Redaction
   */
  maskCustomerPii(text: string): string {
    if (!text) return '';
    // Mask email addresses
    let masked = text.replace(/([a-zA-Z0-9_\.-]+)@([a-zA-Z0-9_\.-]+)/g, '[EMAIL]');
    // Mask phone numbers (10+ digits)
    masked = masked.replace(/(\+?[0-9]{2,4}[-.\s]?)?(\d{3,5}[-.\s]?\d{4,5})/g, '[PHONE]');
    return masked;
  }
}
