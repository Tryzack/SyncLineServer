/**
 * Function to validate an array of strings
 * @param strArray {Array<string>} - array of strings to validate
 * @returns {boolean} - true if all strings are valid, false otherwise
 */
export function validateStrings(strArray: Array<any>): boolean {
	for (const str of strArray) {
		if (typeof str !== 'string' || str.trim().length === 0) {
			return false;
		}
	}
	return true;
}
