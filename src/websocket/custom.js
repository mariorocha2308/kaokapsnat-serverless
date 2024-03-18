const { v4 } = require("uuid");
const { RESPONSE_OK, TABLES_NAMES, DYNAMODBCLIENT, API_GATEWAY } = require("../utils/const");
const { postToConnection, getConnectionIdByUsername, getUsernameToUsername, getAllContacts } = require("./helpers");

// //* CUSTOM ROUTE: "getContacts"
const handleGetContacts = async (connectionId) => {
  await postToConnection(
    connectionId,
    JSON.stringify({
      type: "contacts",
      value: await getAllContacts(),
    }),
  );

  return RESPONSE_OK;
};

// //* CUSTOM ROUTE: "sendMessage"
const handleSendMessages = async (client, body) => {
  const usernameTousername = getUsernameToUsername([
    client.username,
    body.recipientUsername,
  ]);

  await DYNAMODBCLIENT
    .put({
      TableName: TABLES_NAMES.MESSAGE,
      Item: {
        messageId: v4(),
        usernameToUsername: usernameTousername,
        message: body.message,
        sender: client.username,
        createdAt: new Date().toISOString(),
      },
    })

  const recipientConnectionId = await getConnectionIdByUsername(
    body.recipientUsername,
  );

  if (recipientConnectionId) {
    await API_GATEWAY
      .postToConnection({
        ConnectionId: recipientConnectionId,
        Data: JSON.stringify({
          type: "message",
          value: {
            sender: client.username,
            message: body.message,
          },
        }),
      })
  }

  return RESPONSE_OK;
};

// //* CUSTOM ROUTE: "getMessages"
const handleGetMessages = async (client, body) => {
  const output = await DYNAMODBCLIENT
    .query({
      TableName: TABLES_NAMES.MESSAGE,
      IndexName: "UsernameToUsernameIndex",
      KeyConditionExpression: "#usernameToUsername = :usernameToUsername",
      ExpressionAttributeNames: {
        "#usernameToUsername": "usernameToUsername",
      },
      ExpressionAttributeValues: {
        ":usernameToUsername": getUsernameToUsername([
          client.username,
          body.targetName,
        ]),
      },
      Limit: body.limit,
      ExclusiveStartKey: body.startKey,
      ScanIndexForward: false,
    })

  await postToConnection(
    client.id,
    JSON.stringify({
      type: "messages",
      value: {
        messages: output.Items && output.Items.length > 0 ? output.Items : [],
        lastEvaluatedKey: output.LastEvaluatedKey,
      },
    }),
  );

  return RESPONSE_OK;
};


module.exports = {
  handleGetContacts,
  handleSendMessages,
  handleGetMessages
}