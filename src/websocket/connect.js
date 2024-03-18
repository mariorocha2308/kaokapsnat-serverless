const { TABLES_NAMES, DYNAMODBCLIENT, RESPONSE_OK, RESPONSE_FORBIDDEN } = require('../utils/const');
const { notifyContactChange, getConnectionIdByUsername, postToConnection } = require('./helpers');

const handleConnect = async (connectionId, queryParameters) => {
  if (!queryParameters || !queryParameters["uid"], !queryParameters["username"]) {
    return {
      statusCode: 404,
      body: "$connect need query parameter ?uid=value and &username=value",
    };
  }

  const existingConnectionId = await getConnectionIdByUsername(
    queryParameters["username"],
  );
  if (
    existingConnectionId &&
    (await postToConnection(
      existingConnectionId,
      JSON.stringify({ type: "ping" }),
    ))
  ) {
    return RESPONSE_FORBIDDEN;
  }

  await DYNAMODBCLIENT
    .put({
      TableName: TABLES_NAMES.CONNECTION,
      Item: {
        connId: connectionId,
        userId: queryParameters["uid"],
        username: queryParameters["username"]
      }
    })

  await notifyContactChange(connectionId);

  return RESPONSE_OK;
};

module.exports = { handleConnect }