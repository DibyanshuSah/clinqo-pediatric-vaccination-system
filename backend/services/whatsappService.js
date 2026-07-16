/**
 * WhatsApp Business API Service
 * Handles sending messages (text and templates) to patients via Meta Cloud API.
 */

/**
 * Format phone number to international format required by WhatsApp (digits only)
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it's a 10-digit number, assume Indian country code (+91)
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
};

/**
 * Send a free-form text message (Works within 24-hour customer window)
 * @param {string} to - Recipient phone number
 * @param {string} text - Message content
 * @returns {Promise<object>} API response
 */
const sendTextMessage = async (to, text) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp configuration missing in environment variables.');
  }

  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    throw new Error('Invalid recipient phone number.');
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: text
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('WhatsApp API Error Response:', data);
      throw new Error(data.error?.message || 'Failed to send WhatsApp message');
    }

    console.log(`WhatsApp text message sent successfully to ${formattedPhone}. Message ID:`, data.messages?.[0]?.id);
    return data;
  } catch (error) {
    console.error('Error sending WhatsApp text message:', error.message);
    throw error;
  }
};

/**
 * Send a template message (Required for business-initiated messages outside 24h window)
 * @param {string} to - Recipient phone number
 * @param {string} templateName - Name of the approved template in Meta Developer console
 * @param {string} languageCode - Language code, e.g., 'en', 'en_US'
 * @param {Array} components - Template components (header, body, buttons) for parameters
 * @returns {Promise<object>} API response
 */
const sendTemplateMessage = async (to, templateName, languageCode = 'en', components = []) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp configuration missing in environment variables.');
  }

  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    throw new Error('Invalid recipient phone number.');
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      }
    }
  };

  if (components && components.length > 0) {
    payload.template.components = components;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Template Error Response:', data);
      throw new Error(data.error?.message || 'Failed to send WhatsApp template message');
    }

    console.log(`WhatsApp template message (${templateName}) sent successfully to ${formattedPhone}. Message ID:`, data.messages?.[0]?.id);
    return data;
  } catch (error) {
    console.error('Error sending WhatsApp template message:', error.message);
    throw error;
  }
};

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  formatPhoneNumber
};
