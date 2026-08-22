const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const AISENSY_API_KEY = process.env.AISENSY_API_KEY;

export function formatPhoneNumber(phone: string): string {
  let clean = phone.replace(/[\s\-+()]/g, '');
  
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  
  return clean;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const to = formatPhoneNumber(phone);

  // 1. Try Meta Cloud API if configured
  if (WHATSAPP_API_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
    const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        }),
      });

      if (res.ok) {
        return true;
      }
      const errorData = await res.json();
      console.warn('Meta WhatsApp API Warning:', JSON.stringify(errorData));
    } catch (error) {
      console.warn('Failed to send via Meta Cloud API:', error);
    }
  }

  // 2. Try AiSensy API if configured
  if (AISENSY_API_KEY) {
    try {
      const res = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: AISENSY_API_KEY,
          campaignName: 'direct_chat',
          destination: to,
          userName: 'Lead',
          templateParams: [message],
          source: 'leadpilot_ai',
        }),
      });

      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.warn('Failed to send via AiSensy:', err);
    }
  }

  return false;
}
