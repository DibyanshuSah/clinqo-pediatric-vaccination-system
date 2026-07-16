const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Retrieve verify token from env
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'kiddoscare_verify_token_2026';

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      console.warn('Webhook verification failed: token mismatch');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
};

const handleWebhook = (req, res) => {
  const body = req.body;

  // Log incoming webhook body
  console.log('Incoming Webhook body:', JSON.stringify(body, null, 2));

  // Check if this is an event from a whatsapp business account
  if (body.object === 'whatsapp_business_account') {
    if (body.entry && Array.isArray(body.entry)) {
      body.entry.forEach(entry => {
        const changes = entry.changes;
        if (changes && Array.isArray(changes)) {
          changes.forEach(change => {
            const value = change.value;
            const field = change.field;

            if (field === 'messages') {
              // Log received messages
              if (value.messages) {
                value.messages.forEach(message => {
                  console.log(`Received message from ${message.from}: ${message.text?.body || '[Non-text message]'}`);
                });
              }
              // Log message status updates
              if (value.statuses) {
                value.statuses.forEach(status => {
                  console.log(`Message status update for ID ${status.id}: status is ${status.status} to ${status.recipient_id}`);
                });
              }
            }
          });
        }
      });
    }

    // Return a '200 OK' response to all requests
    return res.status(200).send('EVENT_RECEIVED');
  } else {
    // Return a '404 Not Found' if event is not from a whatsapp API
    return res.sendStatus(404);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook
};
