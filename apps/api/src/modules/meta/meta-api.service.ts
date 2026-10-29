import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MetaApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiVersion = this.configService.get<string>('META_API_VERSION', 'v21.0');
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  getApiVersion(): string {
    return this.apiVersion;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
    const timeoutMs = 15000;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers as Record<string, string>),
        },
      });

      const responseBody = await response.json();

      if (!response.ok) {
        const metaError = responseBody as any;
        const errorUserTitle = metaError?.error?.error_user_title;
        const errorUserMsg = metaError?.error?.error_user_msg;
        const rawMessage = metaError?.error?.message;
        const errorCode = metaError?.error?.code || response.status;
        const errorSubcode = metaError?.error?.error_subcode;

        let errorMessage =
          [errorUserTitle, errorUserMsg, rawMessage].filter(Boolean).join(': ') ||
          `Meta API request failed with status ${response.status}`;

        if (errorCode === 190 || errorSubcode === 463) {
          errorMessage =
            'Your Meta Access Token has expired (Session expired). Please generate a fresh token from your Meta Developer Portal (WhatsApp -> API Setup -> Generate access token) and paste it into WhatsApp Connection.';
        }

        this.logger.error(`Meta API Error [${errorCode}]: ${errorMessage} (trace: ${metaError?.error?.fbtrace_id})`);
        throw new HttpException(
          {
            statusCode: response.status,
            message: `Meta API Error: ${errorMessage}`,
            errorCode,
            errorSubcode,
            providerTraceId: metaError?.error?.fbtrace_id,
          },
          response.status >= 500 ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST,
        );
      }

      return responseBody as T;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.name === 'AbortError') {
        throw new HttpException('Meta API connection timed out', HttpStatus.GATEWAY_TIMEOUT);
      }
      this.logger.error(`Meta API network exception: ${error.message}`);
      throw new HttpException(`Failed to connect to Meta Cloud API: ${error.message}`, HttpStatus.BAD_GATEWAY);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Exchanges OAuth authorization code for System User / Access Token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{ access_token: string; expires_in?: number }> {
    const appId = this.configService.get<string>('META_APP_ID', 'test_app_id');
    const appSecret = this.configService.get<string>('META_APP_SECRET', 'test_app_secret');

    // In local development or mock mode if credentials are placeholders
    if (!appId || appId === 'test_app_id' || !appSecret || appSecret === 'test_app_secret') {
      this.logger.warn('META_APP_ID/SECRET not configured with live credentials. Generating development authorization token.');
      return {
        access_token: `EAAB_${Date.now()}_mock_access_token_secure`,
        expires_in: 5184000, // 60 days
      };
    }

    const endpoint = `oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return this.request<{ access_token: string; expires_in?: number }>(endpoint);
  }

  /**
   * Fetches phone numbers under a WhatsApp Business Account
   */
  async getWabaPhoneNumbers(wabaId: string, accessToken: string) {
    if (accessToken.includes('mock')) {
      return {
        data: [
          {
            id: 'phone_mock_10928',
            display_phone_number: '+1 (555) 234-5678',
            verified_name: 'Verified Business Support',
            quality_rating: 'GREEN',
            messaging_limit_tier: 'TIER_10K',
            code_verification_status: 'VERIFIED',
          },
        ],
      };
    }

    const endpoint = `${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status`;
    return this.request<{ data: any[] }>(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  /**
   * Fetches approved templates from WABA
   */
  async getWabaTemplates(wabaId: string, accessToken: string) {
    if (accessToken.includes('mock')) {
      return {
        data: [
          {
            id: 'meta_tpl_welcome_mock',
            name: 'welcome_customer',
            language: 'en_US',
            category: 'UTILITY',
            status: 'APPROVED',
            components: [
              { type: 'HEADER', format: 'TEXT', text: 'Welcome!' },
              { type: 'BODY', text: 'Hello {{1}}, welcome to our platform.' },
            ],
          },
        ],
      };
    }

    const endpoint = `${wabaId}/message_templates?fields=id,name,language,category,status,components&limit=100`;
    return this.request<{ data: any[] }>(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  /**
   * Creates a message template in Meta WABA
   */
  async createWabaTemplate(
    wabaId: string,
    accessToken: string,
    data: { name: string; category: string; components: any[]; language: string },
  ) {
    if (accessToken.includes('mock')) {
      return { id: `meta_tpl_${data.name}_${Date.now()}`, status: 'APPROVED' };
    }
    const endpoint = `${wabaId}/message_templates`;
    return this.request<{ id: string; status: string }>(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  /**
   * Uploads sample media to Meta Resumable Upload API to obtain a valid header_handle.
   * Required by Meta Cloud API when creating templates with IMAGE, VIDEO, or DOCUMENT headers.
   */
  async uploadTemplateSampleMedia(
    accessToken: string,
    fileBuffer: Buffer,
    mimeType: string = 'image/png',
  ): Promise<string> {
    if (accessToken.includes('mock')) {
      return `4::mock_handle_${Date.now()}`;
    }

    try {
      // 1. Resolve Meta App ID dynamically from access token
      let appId = this.configService.get<string>('META_APP_ID');
      try {
        const debugRes = await fetch(
          `${this.baseUrl}/debug_token?input_token=${accessToken}&access_token=${accessToken}`,
        );
        const debugData: any = await debugRes.json();
        if (debugData?.data?.app_id) {
          appId = debugData.data.app_id;
        }
      } catch (err: any) {
        this.logger.warn(`Could not query debug_token: ${err.message}`);
      }

      if (!appId) {
        throw new Error('Meta App ID is required to initiate media upload session');
      }

      // 2. Initiate Resumable Upload Session
      const sessionUrl = `${this.baseUrl}/${appId}/uploads?file_length=${fileBuffer.length}&file_type=${encodeURIComponent(
        mimeType,
      )}&access_token=${accessToken}`;
      const sessionRes = await fetch(sessionUrl, { method: 'POST' });
      const sessionData: any = await sessionRes.json();

      if (!sessionData?.id) {
        if (sessionData?.error?.code === 190 || sessionData?.error?.error_subcode === 463) {
          throw new BadRequestException(
            'Your Meta Access Token has expired. Please click "Generate access token" in Meta Developers (WhatsApp -> API Setup) and paste it into WhatsApp Connection -> Permanent Access Token.',
          );
        }
        const errorMsg = sessionData?.error?.error_user_msg || sessionData?.error?.message || JSON.stringify(sessionData);
        throw new Error(`Failed to create Meta upload session: ${errorMsg}`);
      }

      // 3. Upload raw file bytes to session endpoint
      const uploadUrl = `${this.baseUrl}/${sessionData.id}`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${accessToken}`,
          file_offset: '0',
          'Content-Type': mimeType,
        },
        body: fileBuffer as any,
      });

      const uploadData: any = await uploadRes.json();
      if (!uploadData?.h) {
        if (uploadData?.error?.code === 190 || uploadData?.error?.error_subcode === 463) {
          throw new BadRequestException(
            'Your Meta Access Token has expired. Please click "Generate access token" in Meta Developers (WhatsApp -> API Setup) and paste it into WhatsApp Connection -> Permanent Access Token.',
          );
        }
        const errorMsg = uploadData?.error?.error_user_msg || uploadData?.error?.message || JSON.stringify(uploadData);
        throw new Error(`Meta upload completed without handle: ${errorMsg}`);
      }

      this.logger.log(`Successfully obtained Meta header_handle: ${uploadData.h.slice(0, 24)}...`);
      return uploadData.h;
    } catch (err: any) {
      this.logger.error(`Failed to upload template sample media to Meta: ${err.message}`);
      throw new BadRequestException(`Meta Sample Media Upload Error: ${err.message}`);
    }
  }

  /**
   * Uploads media file directly to Meta WhatsApp Cloud API to obtain a media ID.
   * Endpoint: POST /{phone_number_id}/media
   */
  async uploadMedia(
    phoneNumberId: string,
    accessToken: string,
    fileBuffer: Buffer,
    mimeType: string,
    filename: string = 'media_file',
  ): Promise<{ id: string }> {
    if (accessToken.includes('mock')) {
      return { id: `mock_media_${Date.now()}` };
    }

    try {
      const form = new FormData();
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
      form.append('file', blob, filename);
      form.append('type', mimeType);
      form.append('messaging_product', 'whatsapp');

      const res = await fetch(`${this.baseUrl}/${phoneNumberId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });

      const data: any = await res.json();
      if (!data?.id) {
        if (data?.error?.code === 190 || data?.error?.error_subcode === 463) {
          throw new BadRequestException(
            'Your Meta Access Token has expired. Please refresh your access token in WhatsApp Connection.',
          );
        }
        const errorMsg = data?.error?.error_user_msg || data?.error?.message || JSON.stringify(data);
        throw new BadRequestException(`Meta Media Upload Failed: ${errorMsg}`);
      }

      this.logger.log(`Successfully uploaded media to Meta WhatsApp: ${data.id}`);
      return { id: data.id };
    } catch (err: any) {
      this.logger.error(`Failed to upload media to Meta WhatsApp: ${err.message}`);
      throw new BadRequestException(err.message);
    }
  }

  /**
   * Sends an approved template message to recipient phone
   */
  async sendTemplateMessage(
    phoneNumberId: string,
    accessToken: string,
    toPhone: string,
    templateName: string,
    languageCode: string,
    components: any[] = [],
  ): Promise<{ messages: { id: string }[] }> {
    if (accessToken.includes('mock')) {
      return {
        messages: [{ id: `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(7)}` }],
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone.replace(/[^0-9]/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    return this.request<{ messages: { id: string }[] }>(`${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Sends a freeform text message (valid within 24-hour customer care window)
   */
  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    toPhone: string,
    messageText: string,
  ): Promise<{ messages: { id: string }[] }> {
    if (accessToken.includes('mock')) {
      return {
        messages: [{ id: `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(7)}` }],
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone.replace(/[^0-9]/g, ''),
      type: 'text',
      text: { body: messageText },
    };

    return this.request<{ messages: { id: string }[] }>(`${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Subscribes application to Meta Webhooks for WABA
   */
  async subscribeAppToWaba(wabaId: string, accessToken: string): Promise<{ success: boolean }> {
    if (accessToken.includes('mock')) {
      return { success: true };
    }

    return this.request<{ success: boolean }>(`${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  /**
   * Marks an incoming WhatsApp message as READ (turns double checkmarks BLUE on sender's WhatsApp)
   */
  async markMessageAsRead(
    phoneNumberId: string,
    accessToken: string,
    messageId: string,
  ): Promise<{ success: boolean }> {
    if (accessToken.includes('mock')) {
      return { success: true };
    }

    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    return this.request<{ success: boolean }>(`${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
  }
}
