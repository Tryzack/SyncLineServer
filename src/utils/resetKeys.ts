const resetKeys: any = {};

function getResetKeys() {
	return resetKeys;
}

function setResetKey(newKey: string, data: any) {
	resetKeys[newKey] = data;
}

function deleteResetKey(key: string) {
	delete resetKeys[key];
}

export { getResetKeys, setResetKey, deleteResetKey };
