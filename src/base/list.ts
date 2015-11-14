function insertAtIndex(arr:Array<any>, item:any, index:number) {
  arr.splice(index, 0, item);
}

function removeAtIndex(arr:Array<any>, index:number) {
  arr.splice(index, 1);
}

function removeElement(arr: Array<any>, element: any) {
  let index = arr.indexOf(element);
  if (index !== -1) {
    arr.splice(index, 1);
  }
}
