const { API_GATEWAY, TABLES_NAMES, DYNAMODBCLIENT } = require('../utils/const');

const isConnectionNotExistError = (e) =>
  (e).statusCode === 410;

const postToConnection = async (connectionId, messageBody) => {
  try {
    await API_GATEWAY.postToConnection({
      ConnectionId: connectionId,
      Data: messageBody,
    });

    return true;
  } catch (e) {
    if (isConnectionNotExistError(e)) {
      await DYNAMODBCLIENT
        .delete({
          TableName: TABLES_NAMES.CONNECTION,
          Key: {
            connId: connectionId,
          },
        })

      return false;
    } else {
      throw e;
    }
  }
};

const getConnectionIdByUsername = async (username) => {
  const output = await DYNAMODBCLIENT
    .query({
      TableName: TABLES_NAMES.CONNECTION,
      IndexName: "UsernameIndex",
      KeyConditionExpression: "#username = :username",
      ExpressionAttributeNames: {
        "#username": "username",
      },
      ExpressionAttributeValues: {
        ":username": username,
      },
    });
  
  return output.Items && output.Items.length > 0
    ? output.Items[0].connId
    : undefined;
};

const notifyContactChange = async (excludedConnectionId) => {
  const contacts = await getAllContacts();

  await Promise.all(
    contacts.map(async (c) => {
      if (excludedConnectionId === c.connId) {
        return;
      }

      await postToConnection(
        c.connId,
        JSON.stringify({ type: "contacts", value: contacts }),
      );
    }),
  );
};

const parseGetMessageBody = (body) => {
  const getMessagesBody = JSON.parse(body || "{}");

  if (
    !getMessagesBody ||
    !getMessagesBody.targetName ||
    !getMessagesBody.limit
  ) {
    throw new Error("invalid GetMessageBody");
  }

  return getMessagesBody;
};

const getContact = async (connectionId) => {

  const output = await DYNAMODBCLIENT
    .get({
      TableName: TABLES_NAMES.CONNECTION,
      Key: {
        connId: connectionId
      },
    })

  if (!output.Item) {
    throw new Error("client does not exist");
  }

  return output.Item;
};

const parseSendMessageBody = (body) => {
  const sendMsgBody = JSON.parse(body || "{}");

  if (!sendMsgBody || !sendMsgBody.recipientUsername || !sendMsgBody.message) {
    throw new Error("invalid SendMessageBody");
  }

  return sendMsgBody;
};

const getUsernameToUsername = (names) =>
  names.sort().join("#");


const getAllContacts = async () => {
  const output = await DYNAMODBCLIENT
    .scan({
      TableName: TABLES_NAMES.CONNECTION,
    });

  const contacts = output.Items || [];

  return contacts;
};

module.exports = {
  postToConnection,
  notifyContactChange,
  getConnectionIdByUsername,
  parseGetMessageBody,
  getAllContacts,
  parseGetMessageBody,
  getUsernameToUsername,
  parseSendMessageBody,
  getContact
}