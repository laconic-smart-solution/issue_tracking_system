import { Request, Response } from 'express';
import { lineService } from '../services/line.service';
import { ticketService } from '../services/ticket.service';
import { storageService } from '../services/storage.service';
import { query } from '../database/db';

export class WebhookController {
  static async handleLineWebhook(req: Request, res: Response) {
    try {
      const events = req.body.events;
      console.log(`[Webhook] Incoming events count: ${events ? events.length : 0}`);

      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(200).send('OK');
      }

      for (const event of events) {
        console.log('[Webhook Event]', JSON.stringify(event));

        if (event.type !== 'message') continue;

        const chatSourceId = event.source.groupId || event.source.roomId || event.source.userId;
        const replyToken = event.replyToken;

        if (chatSourceId) {
          await WebhookController.processChatMessage(chatSourceId, event, replyToken);
        }
      }

      return res.status(200).send('OK');
    } catch (error) {
      console.error('[Webhook] Error handling LINE webhook:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  private static async processChatMessage(chatSourceId: string, event: any, replyToken: string) {
    const message = event.message;

    // 1. Text Message Processing
    if (message.type === 'text') {
      const text = message.text.trim();

      // Check for manual binding command: @bot bind <COMPANY_CODE>
      if (text.toLowerCase().startsWith('@bot bind')) {
        const parts = text.split(/\s+/);
        const companyCode = parts[2];
        if (!companyCode) {
          await lineService.replyMessage(replyToken, '❌ Format မမှန်ပါ။ ဥပမာ - @bot bind CHZ');
          return;
        }

        const bindRes = await ticketService.bindGroupToCompany(chatSourceId, companyCode);
        if (bindRes.success) {
          await lineService.replyMessage(
            replyToken,
            `✅ အောင်မြင်ပါသည်! ဤ LINE Chat ကို "${bindRes.companyName}" နှင့် ချိတ်ဆက်ပြီးပါပြီ။ Issue တင်လိုပါက "#ticket [အကြောင်းအရာ]" ဟု ရိုက်ပို့နိုင်ပါသည်။`
          );
        } else {
          await lineService.replyMessage(replyToken, `❌ ${bindRes.message}`);
        }
        return;
      }

      // Check Company Mapping (Auto-bind to default active company if not yet mapped)
      let companyInfo = await ticketService.getCompanyByLineGroup(chatSourceId);
      if (!companyInfo) {
        const defaultCompRes = await query('SELECT id, name, code FROM companies WHERE is_active = 1 ORDER BY created_at ASC');
        if (defaultCompRes.rows.length > 0) {
          const def = defaultCompRes.rows[0];
          await ticketService.bindGroupToCompany(chatSourceId, def.code, 'LINE Customer Chat');
          companyInfo = await ticketService.getCompanyByLineGroup(chatSourceId);
        }
      }

      if (!companyInfo) {
        console.warn(`[Webhook] No active company available to bind chatSourceId ${chatSourceId}`);
        return;
      }

      // Check if this is a new Ticket trigger (#ticket or in 1-on-1 chat)
      const isTicketExplicit = text.toLowerCase().startsWith('#ticket');
      const is1on1Chat = event.source.type === 'user';
      const activeTicket = await ticketService.getActiveTicketForGroup(companyInfo.line_group_pk);

      // Create new ticket if explicit trigger OR if in 1-on-1 chat without an open ticket
      if (isTicketExplicit || (is1on1Chat && !activeTicket)) {
        let issueDescription = text;
        if (isTicketExplicit) {
          issueDescription = text.replace(/#ticket/i, '').trim();
        }

        if (!issueDescription) {
          await lineService.replyMessage(replyToken, '⚠️ ကျေးဇူးပြု၍ Issue အကြောင်းအရာကို #ticket ၏ နောက်တွင် ရေးသားပေးပါခင်ဗျာ။');
          return;
        }

        // Detect priority from text
        let priority = 'MEDIUM';
        const lowerDesc = issueDescription.toLowerCase();
        if (lowerDesc.includes('urgent') || lowerDesc.includes('critical') || lowerDesc.includes('server down') || lowerDesc.includes('အရေးကြီး')) {
          priority = 'CRITICAL';
        } else if (lowerDesc.includes('error') || lowerDesc.includes('fail') || lowerDesc.includes('မရပါ')) {
          priority = 'HIGH';
        }

        const { ticket } = await ticketService.createTicket({
          companyId: companyInfo.company_id,
          lineGroupPk: companyInfo.line_group_pk,
          title: issueDescription.slice(0, 80),
          description: issueDescription,
          priority,
          senderLineUserId: event.source.userId,
        });

        console.log(`[Webhook] Created new Ticket #${ticket.ticket_no} for ${companyInfo.company_name}`);

        await lineService.replyMessage(
          replyToken,
          `✅ Ticket #${ticket.ticket_no} ဖွင့်ပြီးပါပြီ။\n📌 Priority: ${priority}\n🏢 Company: ${companyInfo.company_name}\n🔍 အခြေအနေ: စစ်ဆေးနေပါသည်...\nကျွန်ုပ်တို့ IT Support Team မှ မကြာမီ ပြန်လည်ဖြေကြားပေးပါမည်။`
        );
        return;
      }

      // If active ticket already exists, append this follow-up message to the ticket conversation
      if (activeTicket) {
        await ticketService.addMessage({
          ticketId: activeTicket.id,
          senderType: 'CUSTOMER',
          messageText: text,
          lineMessageId: message.id,
        });
        console.log(`[Webhook] Appended follow-up message to Ticket #${activeTicket.ticket_no}`);
      }
    }

    // 2. Image Message (Screenshots) Processing
    else if (message.type === 'image') {
      let companyInfo = await ticketService.getCompanyByLineGroup(chatSourceId);
      if (!companyInfo) {
        const defaultCompRes = await query('SELECT id, name, code FROM companies WHERE is_active = 1 ORDER BY created_at ASC');
        if (defaultCompRes.rows.length > 0) {
          const def = defaultCompRes.rows[0];
          await ticketService.bindGroupToCompany(chatSourceId, def.code, 'LINE Customer Chat');
          companyInfo = await ticketService.getCompanyByLineGroup(chatSourceId);
        }
      }

      if (!companyInfo) return;

      let activeTicket = await ticketService.getActiveTicketForGroup(companyInfo.line_group_pk);
      // If no active ticket, create one for this screenshot
      if (!activeTicket) {
        const created = await ticketService.createTicket({
          companyId: companyInfo.company_id,
          lineGroupPk: companyInfo.line_group_pk,
          title: 'Error Screenshot submitted from LINE',
          description: 'Customer submitted an error screenshot via LINE chat.',
          priority: 'HIGH',
          senderLineUserId: event.source.userId,
        });
        activeTicket = created.ticket as any;
      }

      // Download binary stream from LINE Content API
      const stream = await lineService.getMessageContent(message.id);
      if (stream && activeTicket) {
        const fileData = await storageService.saveFileStream(stream, activeTicket.id, '.jpg', 'image/jpeg');

        const msg = await ticketService.addMessage({
          ticketId: activeTicket.id,
          senderType: 'CUSTOMER',
          messageText: '[Screenshot ပေးပို့ခဲ့သည်]',
          lineMessageId: message.id,
        });

        await ticketService.addAttachment({
          messageId: msg.id,
          fileName: fileData.fileName,
          filePath: fileData.filePath,
          fileType: 'image/jpeg',
          fileSize: fileData.fileSize,
        });

        console.log(`[Webhook] Attached screenshot to Ticket #${activeTicket.ticket_no}`);
      }
    }
  }
}
