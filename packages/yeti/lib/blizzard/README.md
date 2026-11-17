# Blizzard Protocol

Blizzard is a simple RPC protocol built for [Yeti](https://github.com/yui/yeti).

 - All requests are asynchronous.
 - Allows for bi-directional requests, ideal for the reverse-server implementation of Yeti's client.
 - Uses JSON for non-binary requests and responses.
 - Allows for streaming binary responses.

## Disclaimer

Blizzard is a simple but young protocol designed specifically for Yeti.

As Yeti's needs change during development, Blizzard will change with it.

## Definitions

Blizzard is a bi-directional protocol: requests may be made to either side of the connection. However, he protocol does define each side as either a Client or a Server.

 - **Server**: The party that listened for a Blizzard connection.
 - **Client**: The party that connected to the listening Server.

Blizzard is transport-agnostic, but is always used in Yeti after an HTTP Upgrade. See the **HTTP Upgrade** section for details.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](http://www.ietf.org/rfc/rfc2119.txt).

## Blizzard Packets

Communication in Blizzard MUST take the form of Blizzard Packets.

Blizzard Packets are binary data prepended by a header describing the data.

### Header

All header integers are unsigned big-endian.  (The highest order bit is first in network order.)

The header is 10 bytes, containing:

 - `magic` - 1-byte integer
 - `type` - 1-byte integer
 - `id` - 4-byte integer
 - `length` - 4-byte integer

#### Magic

The magic integer MUST be `89`, which specifies this protocol version.

#### Type

Types describe the data that follow the header. Types are an 8-bit integer.

Valid types are:

    0 - Handshake
    1 - JSON
    2 - Reserved for future use
    3 - Buffer Response (Raw Binary)

#### ID

The ID is a 4-byte integer identifying a request-response pair.

The ID MAY be 0. If the ID is 0, the Packet is a Notification, a one-way request. Notifications MUST NOT be replied to, even if the request could not be completed.

Each party generates a new ID for every request that expects a response. The Client MUST generate even IDs. The Server MUST generate odd IDs. The RECOMMENDED starting number is 0, with both sides incrementing as they make requests.

The ID is retained until the request is responded to, then the ID is freed for use again.

The maximum number of open requests is ((2^32) / 2) = 2,147,483,648 requests.

When the maximum number is reached, the ID sequence starts over at 0.

#### Length

The length is a 4-byte integer representing how many bytes of data follow the header.

The length MUST be greater than 0 for JSON messages. The length MUST be 0 for the Handshake type. The length MAY be 0 for Buffer Reply types, which signals the end of the reply stream.

The maximum data size that may be transferred is 2^32 bytes = 4 GiB.

### Data

#### Handshake type

No data is sent for the Handshake type. The packet ALWAYS has a zero length.

This packet type is used during an HTTP Upgrade.

#### JSON type

The packet data is a UTF-8 JSON string represented as binary data.

The received JSON is considered a complete Message.

#### Buffer Response type

If the type was Buffer Response, the packet data is a binary stream of data. The Buffer Reply header MUST have an ID because it is ALWAYS sent in response to another message.

The reply is not considered complete until a Buffer Response Packet with the same ID and length 0 is sent.

NOTE: Although this protocol supports streaming responses, the current implementation as of 2012 January 25 will buffer the Buffer Response packets until the response is complete. This may change in the future.

NOTE: This protocol version does not support "Buffer Request" messages. This may change in the future.

## Blizzard RPC

All RPC requests are asynchronous. RPC messages are inspired by JSON-RPC v2.0, with the biggest exception being that the request ID is a part of the Packet instead of the message body.

### Asynchronous request or Notification

An asynchronous request is represented by sending a JSON Packet with these JSON object properties:

 - `method` - String of the remote method to be invoked. This property is REQUIRED.
 - `params` - Array or Object to be used during invocation of the method. This property is OPTIONAL.

If a response is desired, an request ID MUST be provided in the JSON Packet header.

If no response is desired, the request ID SHOULD be zero. This is considered a Notification.

#### Example

JSON Packet header:

    <<89,1,2,55>>

The binary header is represented with the 3 elements separated by a comma and decoded as integers. In this case, the message type is 1 (JSON), the request ID is 2, and the length of the body is 55 bytes.

This header would be represented in binary like this:

    | Magic |  Type  |              Request ID           |             Body Length          |
    01011001 00000001 00000000 00000000 00000000 00000010 00000000 00000000 00000000 00110111

The header is followed by this JSON Packet body:

    {"method":"get_files","params":["foo.html","bar.html"]}

### Asynchronous response

An asynchronous response is REQUIRED for requests with a request ID.

 - If the request was successful, the response can be represented as JSON or a Buffer Reply.
 - If the request failed for any reason, the response MUST be an Error response.

#### JSON response

The JSON response is represented by sending a JSON Packet with the JSON property `result` set to a String, Array or Object representing the response.

The JSON Packet MUST contain the request ID in the header.

#### Buffer response

The Buffer response is represented by sending Buffer response packets with the request ID in the header. Any number of Buffer response Packets may be sent. When the response is complete, a final Buffer Response Packet is sent with length 0.

#### Error response

When any kind of error occurs, a JSON Packet with the request ID is sent with these properties:

 - `error` - Object with these properties:
   - `code` - Integer representing the type of error. This property is REQUIRED.
   - `message` - String representing error in a concise sentence. This property is REQUIRED.
   - `data` - String, Object or Array representing additional information. This property is OPTIONAL.

#### Reserved error codes

Error codes -32768 to -32000 are reserved for the Blizzard implementation. All other valid JSON numbers MAY be used for application errors.

These protocol-level errors are currently defined:

 - `-32700` - Parse error: invalid JSON.
 - `-32600` - Invalid request: the Asynchronous Request object was not valid.
 - `-32601` - Method not found
 - `-32602` - Invalid method parameters.
 - `-32603` - Internal error in the Blizzard implementation.

#### Example: Successful Buffer response

We will respond to the previous "get_files" request with binary data.

Buffer Response Packet header:

    <<89,2,2,1730>>

The binary header is represented with the 3 elements separated by a comma and decoded as integers. In this case, the message type is 2 (Buffer Response), the request ID is 2, and the length of the body is 1730 bytes.

We may send any number of these headers with data.

When the response is complete, this Buffer Response Packet header is sent:

    <<89,2,2,0>>

The message is considered complete.

#### Example: Successful JSON response

JSON Packet header:

    <<89,1,2,66>>

The binary header is represented with the 3 elements separated by a comma and represented as integers. In this case, the message type is 1 (JSON), the request ID is 2, and the length of the body is 66 bytes.

JSON Packet body:

    {"result":"<meta charset=\"utf-8\">Foursquare and seven years ago."}

The message is considered complete. The callback function for the request is called with this data.

#### Example: Error response

JSON Packet header:

    <<89,1,2,65>>

The binary header is represented with the 3 elements separated by a comma and decoded as integers. In this case, the message type is 1 (JSON), the request ID is 2, and the length of the body is 65 bytes.

JSON Packet body:

    {"error":{"code":-32601,"message":"Method get_files not found."}}

In this example, the method "get_files" did not exist on the other side.

The message is considered complete. The callback function for the request is called with these error details.

## HTTP Upgrade

In Yeti, Blizzard is started after an HTTP/1.1 Upgrade for the protocol `Blizzard-Yeti`. The header `Sec-Blizzard-Version` MUST be sent in the Upgrade request with a value of `1`.

After the HTTP handshake, the party that sent the Upgrade request (the HTTP client) sends Packet of zero length with type Handshake. When this Packet is received, the connection is ready for use.

The `Sec-` prefix is used to [prevent Upgrade requests from XMLHttpRequest][sec-header].

[sec-header]: http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader-method
