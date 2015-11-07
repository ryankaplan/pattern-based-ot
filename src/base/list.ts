function insertAtIndex(arr: Array<any>, item: any, index: number) {
	arr.splice(index, 0, item);
}

function removeAtIndex(arr: Array<any>, index: number) {
	arr.splice(index, 1);
}
