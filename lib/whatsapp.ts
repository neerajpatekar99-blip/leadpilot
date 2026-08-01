const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export function formatPhoneNumber(phone: string): string {
  let clean = phone.replace(/[\s\-+()]/g, '');
  
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  
  return clean;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error('WhatsApp API credentials not found in env vars');
    return false;
  }

  const to = formatPhoneNumber(phone);
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

    if (!res.ok) {
      const errorData = await res.json();
      console.error('WhatsApp API Error:', JSON.stringify(errorData));
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
}
