/**
 *  Message interface
 * @param message {string} - message content
 * @param timestamp {string} - message timestamp
 * @param sender {string} - user who sent the message
 * @param receiver {string} - username or group Id of the receiver
 * @param user {boolean} - true if it is a user message, false if it is a group message
 */
export interface Message {
	message: string;
	type: string;
	timestamp: string;
	sender: string;
}

/**
 * Response interface for database operations
 * @param error {boolean} - true if there was an error, false otherwise
 * @param message {string} - message to display
 * @param result {any | null} - result of the operation
 */
export interface Response {
	error: boolean;
	message: string;
	result: any | null;
}
