function insertAtIndex(arr:Array<any>, item:any, index:number) {
  arr.splice(index, 0, item);
}

function removeAtIndex(arr:Array<any>, index:number): any {
  return arr.splice(index, 1)[0];
}

function removeElement(arr: Array<any>, element: any): any {
  let index = arr.indexOf(element);
  if (index !== -1) {
    return arr.splice(index, 1)[0];
  }
  return null;
}

function addElementIfMissing(arr: Array<any>, element: any) {
  for (var elt of arr) {
    if (element === elt) {
      return;
    }
  }
  arr.push(element);
}