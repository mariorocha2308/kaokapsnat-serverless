'use strict'
const { postToConnection, getContact, parseSendMessageBody, parseGetMessageBody } = require('./helpers')
const { handleSendMessages, handleGetMessages, handleGetContacts } = require('./custom');
const { handleConnect } = require('./connect')
const { handleDisconnect } = require('./disconnect');
const { RESPONSE_OK } = require('../utils/const');

module.exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  try {
    switch (routeKey) {
      case "$connect":
        return handleConnect(connectionId, event.queryStringParameters);
      case "$disconnect":
        return handleDisconnect(connectionId);
      case "getContacts":
        return handleGetContacts(connectionId);
      case "sendMessage":
        return handleSendMessages(
            await getContact(connectionId),
            parseSendMessageBody(event.body),
          );
        case "getMessages":
          return handleGetMessages(
              await getContact(connectionId),
              parseGetMessageBody(event.body),
            );
      default:
        return RESPONSE_FORBIDDEN
    }
  } catch (e) {
    if (e) {
      await postToConnection(
        connectionId,
        JSON.stringify({ type: "error", message: e.message }),
      );
      return RESPONSE_OK;
    }
    throw e;
  }
};