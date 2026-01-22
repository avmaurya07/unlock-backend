const SibApiV3Sdk = require("@sendinblue/client");

const brevo = new SibApiV3Sdk.TransactionalEmailsApi();

brevo.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

module.exports = brevo;
